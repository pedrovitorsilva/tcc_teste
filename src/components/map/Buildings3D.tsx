"use client";

// Prédios 3D: tiles vetoriais estáticos (public/tiles/predios), gerados uma vez
// por scripts/prepare-buildings.mjs a partir do Overture Maps, já com altura,
// área e códigos de bairro/setor/loteamento. Mostra todos os prédios que caem na
// tela (o MapLibre só carrega os tiles visíveis); LOD, altura e cor do mapa de
// calor são filtro e expressões — sem recorte em JavaScript.
import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";
import { useMap } from "@/components/ui/map";
import {
  BUILDINGS_ATTRIBUTION,
  BUILDINGS_LAYER_ID,
  BUILDINGS_METADATA_URL,
  BUILDINGS_MIN_ZOOM,
  BUILDINGS_SOURCE_ID,
  BUILDINGS_SOURCE_LAYER,
  BUILDINGS_TILES_MAX_ZOOM,
  BUILDINGS_TILES_URL,
  BUILDING_EXTRUSION_OPACITY,
  LOD_MIN_AREA_STEPS,
  LOD_MIN_AREA_STEPS_MOBILE,
} from "@/config/buildings";
import { corDoValor } from "@/lib/map/choropleth";
import { useClipTarget, type ClipTarget } from "@/hooks/map/useClipTarget";
import type { Choropleth } from "@/hooks/useChoropleth";
import type { IndexedFeature } from "@/hooks/useGeoIndex";
import type { ThemeTokens } from "@/hooks/useThemeTokens";
import type { HoveredBairro, Selection } from "@/types/map";

/** LOD nativo: prédio pequeno some em zoom baixo (o MapLibre avalia o filtro por zoom de tile). */
function filtroPredios(mobile: boolean, cdBairro: string | null): FilterSpecification {
  const lod = [">=", ["get", "area"], ["step", ["zoom"], ...(mobile ? LOD_MIN_AREA_STEPS_MOBILE : LOD_MIN_AREA_STEPS)]];
  if (!mobile) return lod as unknown as FilterSpecification;
  // Celular: só o bairro da seleção; sem seleção, nenhum prédio. Trocar de bairro refaz os tiles no worker.
  return ["all", lod, ["==", ["get", "cd_bairro"], cdBairro ?? ""]] as unknown as FilterSpecification;
}

/** Bairro/distrito da seleção, no código dos tiles: bairro e setor têm `cd_unidade`; loteamento, o `cd_bairro` do pai. */
function bairroDaSelecao(selection: Selection | null): string | null {
  const code = selection?.properties.cd_unidade ?? selection?.properties.cd_bairro;
  return code == null ? null : String(code);
}

interface Metadados {
  por_unidade: Record<string, number>;
  por_loteamento: Record<string, number>;
}

// Uma vez por sessão; falha zera a promise pra tentar de novo no próximo toggle.
let metadadosRequest: Promise<Metadados | null> | null = null;
function loadMetadados(): Promise<Metadados | null> {
  metadadosRequest ??= fetch(BUILDINGS_METADATA_URL)
    .then((res) => (res.ok ? (res.json() as Promise<Metadados>) : Promise.reject(new Error(`HTTP ${res.status}`))))
    .catch((err: Error) => {
      console.warn(`[Buildings3D] ${BUILDINGS_METADATA_URL} indisponível (${err.message}) — rode npm run prepare-data.`);
      metadadosRequest = null;
      return null;
    });
  return metadadosRequest;
}

/** Quantos prédios a área em foco tem, pelo `metadados.json` (a contagem da ficha, não o que está na tela). */
function contagemDoAlvo(target: ClipTarget, metadados: Metadados | null): number {
  if (!metadados) return 0;
  return target.key.startsWith("loteamento:")
    ? metadados.por_loteamento[String(target.properties.cd_loteamento)] ?? 0
    : metadados.por_unidade[String(target.properties.cd_unidade)] ?? 0;
}

/** `match` código → cor da faixa, com `fallback` para código sem valor (sigilo) ou ausente. */
function corPorCodigo(
  chave: string,
  areas: FeatureCollection | null,
  quebras: number[],
  cores: string[],
  fallback: ExpressionSpecification | string,
): ExpressionSpecification | string {
  const pares: string[] = [];
  for (const f of areas?.features ?? []) {
    const { codigo, valor } = f.properties ?? {};
    if (codigo != null && valor != null) pares.push(String(codigo), corDoValor(valor, quebras, cores));
  }
  return pares.length ? (["match", ["get", chave], ...pares, fallback] as unknown as ExpressionSpecification) : fallback;
}

interface Buildings3DProps {
  tokens: ThemeTokens;
  /**
   * Mapa de calor ativo: prédio pega a cor do setor em que está; setor sem
   * valor → a do bairro; nenhum → `tokens.building`. `null` = cor do tema.
   */
  choropleth: Choropleth | null;
  /** Liga/desliga a exibição — on por padrão; desligado, nenhum request de tile. */
  enabled: boolean;
  /** Celular: LOD mais agressivo e só os prédios do bairro selecionado (loteamento → bairro-pai). */
  mobile: boolean;
  selection: Selection | null;
  hoveredBairro: HoveredBairro | null;
  bairros: IndexedFeature[];
  loteamentos: IndexedFeature[];
  /** Informa quantas edificações o bairro/loteamento em foco tem. */
  onCountChange?: (count: number) => void;
}

/** Exibe as edificações 3D do bairro ou loteamento em foco. */
export function Buildings3D({
  tokens,
  choropleth,
  enabled,
  mobile,
  selection,
  hoveredBairro,
  bairros,
  loteamentos,
  onCountChange,
}: Buildings3DProps) {
  const { map, isLoaded } = useMap();
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;
  const [metadados, setMetadados] = useState<Metadados | null>(null);

  const target = useClipTarget(enabled, selection, hoveredBairro, bairros, loteamentos);
  // Só a seleção, nunca o hover: cada troca de bairro refaz os tiles.
  const cdBairro = mobile ? bairroDaSelecao(selection) : null;

  // Cor: setor → bairro → tema, toda numa expressão (o código de cada prédio vem no tile).
  const corPaint = useMemo((): ExpressionSpecification | string => {
    if (!choropleth) return tokens.building;
    const { data, bairros: bairrosValor, quebras, cores } = choropleth;
    // `bairros` só existe quando o nível principal é setor.
    return bairrosValor
      ? corPorCodigo("cd_setor", data, quebras, cores, corPorCodigo("cd_bairro", bairrosValor, quebras, cores, tokens.building))
      : corPorCodigo("cd_bairro", data, quebras, cores, tokens.building);
  }, [choropleth, tokens.building]);

  useEffect(() => {
    if (!enabled || metadados) return;
    let cancelled = false;
    loadMetadados().then((data) => {
      if (!cancelled) setMetadados(data);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, metadados]);

  // Lifecycle de source/layer — só existem enquanto `enabled` é true, pra não
  // baixar tiles de prédio com o toggle off.
  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;

    if (!map.getSource(BUILDINGS_SOURCE_ID)) {
      map.addSource(BUILDINGS_SOURCE_ID, {
        type: "vector",
        // Absoluta e montada à mão: `new URL()` codificaria as chaves de {z}/{x}/{y}.
        tiles: [`${window.location.origin}${BUILDINGS_TILES_URL}`],
        minzoom: BUILDINGS_MIN_ZOOM,
        maxzoom: BUILDINGS_TILES_MAX_ZOOM,
        attribution: BUILDINGS_ATTRIBUTION,
      });
    }

    if (!map.getLayer(BUILDINGS_LAYER_ID)) {
      map.addLayer({
        id: BUILDINGS_LAYER_ID,
        type: "fill-extrusion",
        source: BUILDINGS_SOURCE_ID,
        "source-layer": BUILDINGS_SOURCE_LAYER,
        minzoom: BUILDINGS_MIN_ZOOM,
        filter: filtroPredios(mobile, cdBairro),
        paint: {
          "fill-extrusion-color": corPaint,
          "fill-extrusion-base": 0,
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-opacity": BUILDING_EXTRUSION_OPACITY,
          "fill-extrusion-vertical-gradient": true,
        },
      });
    }

    return () => {
      onCountChangeRef.current?.(0);
      if (map.getLayer(BUILDINGS_LAYER_ID)) map.removeLayer(BUILDINGS_LAYER_ID);
      if (map.getSource(BUILDINGS_SOURCE_ID)) map.removeSource(BUILDINGS_SOURCE_ID);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, enabled]);

  // Só a contagem da ficha depende do alvo; o filtro da layer é fixo (selecionar
  // não faz o worker refazer nenhum tile).
  useEffect(() => {
    if (!enabled) return;
    onCountChangeRef.current?.(target ? contagemDoAlvo(target, metadados) : 0);
  }, [enabled, target, metadados]);

  // Cruzou o breakpoint (girar o celular, redimensionar) ou, no celular, mudou o bairro.
  useEffect(() => {
    if (!map || !isLoaded || !enabled || !map.getLayer(BUILDINGS_LAYER_ID)) return;
    map.setFilter(BUILDINGS_LAYER_ID, filtroPredios(mobile, cdBairro));
  }, [map, isLoaded, enabled, mobile, cdBairro]);

  // Tema ou mapa de calor mudou: só a expressão de cor (nenhum dado a reprocessar).
  useEffect(() => {
    if (!map || !isLoaded || !enabled || !map.getLayer(BUILDINGS_LAYER_ID)) return;
    map.setPaintProperty(BUILDINGS_LAYER_ID, "fill-extrusion-color", corPaint);
  }, [map, isLoaded, enabled, corPaint]);

  return null;
}
