"use client";

// Fonte das edificações 3D: Overture Maps, por HTTP range request.
import { useEffect, useMemo, useRef } from "react";
import type { FeatureCollection, Geometry } from "geojson";
import type { ExpressionSpecification, GeoJSONSource } from "maplibre-gl";
import { useMap } from "@/components/ui/map";
import {
  BUILDINGS_ATTRIBUTION,
  BUILDINGS_CLIP_LAYER_ID,
  BUILDINGS_CLIP_SOURCE_ID,
  BUILDINGS_MIN_ZOOM,
  BUILDINGS_PMTILES_URL,
  BUILDINGS_PROBE_LAYER_ID,
  BUILDINGS_SOURCE_ID,
  BUILDINGS_SOURCE_LAYER,
  BUILDING_EXTRUSION_OPACITY,
} from "@/config/buildings";
import {
  approxAreaM2,
  lodMinAreaM2,
  outerRing,
  pointInPolygon,
  ringCentroid,
  syntheticHeight,
} from "@/lib/map/buildingClip";
import { computeBBox, viewportBBox, type BBox } from "@/lib/map/bbox";
import { corDoValor } from "@/lib/map/choropleth";
import { addProbedVectorSource, removeProbedVectorSource } from "@/lib/map/layerHelpers";
import { useClipEffect } from "@/hooks/map/useClipEffect";
import { useClipTarget } from "@/hooks/map/useClipTarget";
import type { Choropleth } from "@/hooks/useChoropleth";
import type { IndexedFeature } from "@/hooks/useGeoIndex";
import type { ThemeTokens } from "@/hooks/useThemeTokens";
import type { HoveredBairro, Selection } from "@/types/map";

const EMPTY: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const SOURCE = {
  sourceId: BUILDINGS_SOURCE_ID,
  probeLayerId: BUILDINGS_PROBE_LAYER_ID,
  url: BUILDINGS_PMTILES_URL,
  sourceLayer: BUILDINGS_SOURCE_LAYER,
  minzoom: BUILDINGS_MIN_ZOOM,
  attribution: BUILDINGS_ATTRIBUTION,
};
const SOURCE_IDS = [BUILDINGS_SOURCE_ID];

type Area = { bbox: BBox; geometry: Geometry; valor: number };

/** Só as áreas com valor: área sob sigilo não tem cor a dar (cai no próximo nível). */
function areasComValor(fc: FeatureCollection | null): Area[] {
  if (!fc) return [];
  return fc.features.flatMap((f) =>
    f.properties?.valor != null && f.geometry
      ? [{ bbox: computeBBox(f.geometry), geometry: f.geometry, valor: f.properties.valor as number }]
      : [],
  );
}

// ponytail: busca linear por bbox + point-in-polygon por prédio, paga uma vez
// por prédio graças ao cache em `valorDoPredio`; índice espacial se pesar.
function valorEm(point: [number, number], areas: Area[]): number | null {
  const [lng, lat] = point;
  for (const { bbox, geometry, valor } of areas) {
    if (lng < bbox[0] || lng > bbox[2] || lat < bbox[1] || lat > bbox[3]) continue;
    if (pointInPolygon(point, geometry)) return valor;
  }
  return null;
}

interface Buildings3DProps {
  tokens: ThemeTokens;
  /**
   * Mapa de calor ativo: prédio pega a cor do setor em que está; setor sem
   * valor → a do bairro; nenhum → `tokens.building`. `null` = cor do tema.
   */
  choropleth: Choropleth | null;
  /** Liga/desliga a exibição — off por padrão, sem nenhum request de tile. */
  enabled: boolean;
  selection: Selection | null;
  hoveredBairro: HoveredBairro | null;
  bairros: IndexedFeature[];
  loteamentos: IndexedFeature[];
  /** Informa quantas edificações estão sendo exibidas. */
  onCountChange?: (count: number) => void;
}

/** Exibe as edificações 3D do bairro ou loteamento em foco.
 *
 * Fonte das edificações 3D: Overture Maps, por HTTP e range request.
 */
export function Buildings3D({
  tokens,
  choropleth,
  enabled,
  selection,
  hoveredBairro,
  bairros,
  loteamentos,
  onCountChange,
}: Buildings3DProps) {
  const { map, isLoaded } = useMap();
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  const target = useClipTarget(enabled, selection, hoveredBairro, bairros, loteamentos);

  // Valor da área de cada prédio (setor → bairro), por variável. Cacheado por
  // prédio: pan/zoom republica os mesmos prédios, e trocar de tema não muda
  // os dados — só o point-in-polygon de prédio novo é pago.
  const areasValor = choropleth?.data ?? null;
  const bairrosValor = choropleth?.bairros ?? null;
  const valorDoPredio = useMemo(() => {
    if (!areasValor) return null;
    const principal = areasComValor(areasValor);
    const fallback = areasComValor(bairrosValor);
    const cache = new Map<string, number | null>();
    return (key: string, point: [number, number]): number | null => {
      let valor = cache.get(key);
      if (valor === undefined) {
        valor = valorEm(point, principal) ?? valorEm(point, fallback);
        cache.set(key, valor);
      }
      return valor;
    };
  }, [areasValor, bairrosValor]);

  // Cor por prédio; `undefined` = cor do tema (coalesce no paint).
  const quebras = choropleth?.quebras;
  const cores = choropleth?.cores;
  const corDoPredio = useMemo(() => {
    if (!valorDoPredio || !quebras || !cores) return null;
    return (key: string, point: [number, number]): string | undefined => {
      const valor = valorDoPredio(key, point);
      return valor == null ? undefined : corDoValor(valor, quebras, cores);
    };
  }, [valorDoPredio, quebras, cores]);
  const corDoPredioRef = useRef(corDoPredio);
  corDoPredioRef.current = corDoPredio;

  /** Último recorte (sem cor): trocar de variável repinta sem refazer o recorte. */
  const lastClipRef = useRef<FeatureCollection>(EMPTY);
  const publish = (data: FeatureCollection) => {
    lastClipRef.current = data;
    const source = map?.getSource(BUILDINGS_CLIP_SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) return;
    const cor = corDoPredioRef.current;
    source.setData(
      cor
        ? {
            type: "FeatureCollection",
            features: data.features.map((f) => {
              const { id, lng, lat } = f.properties!;
              return { ...f, properties: { ...f.properties, cor: cor(id ?? `${lng},${lat}`, [lng, lat]) } };
            }),
          }
        : data,
    );
    onCountChangeRef.current?.(data.features.length);
  };

  // `cor` por feature, com a cor do tema como guarda (sem mapa de calor / sem valor).
  const corPaint: ExpressionSpecification = ["coalesce", ["get", "cor"], tokens.building];

  // Lifecycle de source/layers — só existem enquanto `enabled` é true, pra
  // não continuar baixando tiles de prédio em segundo plano com o toggle off.
  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;

    addProbedVectorSource(map, SOURCE);

    if (!map.getSource(BUILDINGS_CLIP_SOURCE_ID)) {
      map.addSource(BUILDINGS_CLIP_SOURCE_ID, {
        type: "geojson",
        data: EMPTY,
        promoteId: "id",
      });
    }

    if (!map.getLayer(BUILDINGS_CLIP_LAYER_ID)) {
      map.addLayer({
        id: BUILDINGS_CLIP_LAYER_ID,
        type: "fill-extrusion",
        source: BUILDINGS_CLIP_SOURCE_ID,
        minzoom: BUILDINGS_MIN_ZOOM,
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
      if (map.getLayer(BUILDINGS_CLIP_LAYER_ID)) map.removeLayer(BUILDINGS_CLIP_LAYER_ID);
      if (map.getSource(BUILDINGS_CLIP_SOURCE_ID)) map.removeSource(BUILDINGS_CLIP_SOURCE_ID);
      removeProbedVectorSource(map, SOURCE);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, enabled]);

  // Atualiza a cor quando o tema mudar.
  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;
    if (!map.getLayer(BUILDINGS_CLIP_LAYER_ID)) return;

    map.setPaintProperty(BUILDINGS_CLIP_LAYER_ID, "fill-extrusion-color", corPaint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, enabled, tokens.building]);

  // Mapa de calor mudou (variável, tema, ligou/desligou): repinta o último recorte.
  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;
    publish(lastClipRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, enabled, corDoPredio]);

  // Recorte por bairro/loteamento selecionado ou em hover.
  useClipEffect({
    map,
    isLoaded,
    target,
    sourceIds: SOURCE_IDS,
    minZoom: BUILDINGS_MIN_ZOOM,
    empty: EMPTY,
    publish,
    compute: (target): FeatureCollection => {
      const [west, south, east, north] = viewportBBox(map!);
      const minArea = lodMinAreaM2(map!.getZoom());
      const features = map!.querySourceFeatures(BUILDINGS_SOURCE_ID, {
        sourceLayer: BUILDINGS_SOURCE_LAYER,
      });

      const seen = new Set<string>();
      const clipped: FeatureCollection["features"] = [];
      const { bbox } = target;

      for (const feature of features) {
        const ring = outerRing(feature.geometry);
        if (!ring) continue;

        const [lng, lat] = ringCentroid(ring);

        // Frustum culling: descarta o que está fora da tela antes do teste
        // point-in-polygon (mais caro) — importa mesmo dentro de um bairro
        // grande, quando o usuário deu pan/zoom pra ver só uma parte dele.
        if (lng < west || lng > east || lat < south || lat > north) continue;
        if (bbox && (lng < bbox[0] || lng > bbox[2] || lat < bbox[1] || lat > bbox[3])) continue;
        if (!pointInPolygon([lng, lat], target.geometry)) continue;

        const area = approxAreaM2(ring);
        if (area < minArea) continue; // LOD: prédio pequeno demais pro zoom atual

        const id = feature.properties?.id;
        if (typeof id === "string") {
          if (seen.has(id)) continue;
          seen.add(id);
        }

        clipped.push({
          type: "Feature",
          geometry: feature.geometry,
          properties: {
            id: typeof id === "string" ? id : undefined,
            height: syntheticHeight(area),
            // Centroide: ponto que decide de qual setor/bairro o prédio pega a cor.
            lng,
            lat,
          },
        });
      }

      return { type: "FeatureCollection", features: clipped };
    },
  });

  return null;
}
