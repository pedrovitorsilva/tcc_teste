'use client';

import { useEffect, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import { AREAS_PONDERACAO_URL, getLevel } from '@/config/levels';
import { computeBBox, type BBox } from '@/lib/map/bbox';
import { resumir, type Resumo } from '@/lib/resumo';
import type { AreaPonderacaoProperties, BlocosCenso, LevelId, UnidadeProperties } from '@/types/map';

export interface IndexedFeature {
  featureId: number;
  /** Nome exibido — `nome` no GeoJSON do ETL. */
  name: string;
  level: LevelId;
  /** Só unidades: bairro ou distrito. */
  tipo?: UnidadeProperties['tipo'];
  /** Só loteamentos: `nm_bairro` do ETL. */
  parentBairro?: string;
  isReliable?: boolean;
  properties: Record<string, unknown>;
  /** Enquadramento da geometria completa — a do GeoJSON, sem recorte por tile. */
  bbox?: BBox;
  /** Polígono inteiro: o recorte das edificações precisa dele, e o do evento do mapa vem cortado por tile. */
  geometry?: GeoJSON.Geometry;
}

interface GeoIndex {
  /** Bairros e distritos (nível `bairro`), separados por `tipo`. */
  bairros: IndexedFeature[];
  loteamentos: IndexedFeature[];
  /** Áreas de ponderação por `cd_ap` — dados da ficha do loteamento, sem camada. */
  areasPonderacao: Map<string, AreaPonderacaoProperties>;
  /** Município inteiro (soma de bairros e distritos), referência das comparações da ficha. */
  municipio: Resumo | null;
  /**
   * GeoJSON bruto, do mesmo `fetch` que monta o índice, repassado ao MapLibre
   * em vez de deixá-lo rebuscar a URL (docs/ARQUITETURA-CODIGO-E-MELHORIAS.md §4.2).
   */
  bairrosData: FeatureCollection | null;
  loteamentosData: FeatureCollection | null;
  loading: boolean;
  /** `true` se a busca falhou — índice e mapa seguem vazios, em vez de travar em "carregando" pra sempre. */
  error: boolean;
}

const INITIAL_STATE: GeoIndex = {
  bairros: [],
  loteamentos: [],
  areasPonderacao: new Map(),
  municipio: null,
  bairrosData: null,
  loteamentosData: null,
  loading: true,
  error: false,
};

function indexFeatures(
  features: GeoJSON.Feature[],
  level: LevelId,
): IndexedFeature[] {
  return features.map((feature, featureId) => {
    const props = feature.properties ?? {};
    return {
      featureId,
      name: String(props.nome ?? ''),
      level,
      properties: props,
      bbox: feature.geometry ? computeBBox(feature.geometry) : undefined,
      geometry: feature.geometry ?? undefined,
      ...(level === 'bairro' && { tipo: props.tipo as UnidadeProperties['tipo'] }),
      ...(level === 'loteamento' && {
        parentBairro: props.nm_bairro as string | undefined,
        isReliable: props.is_reliable as boolean | undefined,
      }),
    };
  });
}

const getJson = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return r.json() as Promise<FeatureCollection>;
  });

// O `generateId: true` do MapLibre numera as features na ordem do arquivo.
// Compartilhar o mesmo objeto parseado com MapLayers.tsx mantém `featureId`
// consistente por construção, não por coincidência de URL.
export function useGeoIndex(): GeoIndex {
  const [state, setState] = useState<GeoIndex>(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [bairrosData, loteamentosData, apsData] = await Promise.all([
          getJson(getLevel('bairro').url),
          getJson(getLevel('loteamento').url),
          getJson(AREAS_PONDERACAO_URL),
        ]);
        if (cancelled) return;

        const bairros = indexFeatures(bairrosData.features, 'bairro');
        const loteamentos = indexFeatures(loteamentosData.features, 'loteamento');
        const areasPonderacao = new Map(
          apsData.features.map((f) => {
            const props = f.properties as AreaPonderacaoProperties;
            return [props.cd_ap, props] as const;
          }),
        );

        // Uma vez, no carregamento: a ficha só lê o resultado.
        const municipio = resumir(bairros.map((b) => b.properties as unknown as BlocosCenso));

        setState({
          bairros,
          loteamentos,
          areasPonderacao,
          municipio,
          bairrosData,
          loteamentosData,
          loading: false,
          error: false,
        });
      } catch {
        if (!cancelled) setState({ ...INITIAL_STATE, loading: false, error: true });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
