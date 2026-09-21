'use client';

import { useEffect, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import { computeBBox, type BBox } from '@/lib/map/bbox';
import type { LevelId } from '@/types/map';

export interface IndexedFeature {
  featureId: number;
  name: string;
  level: LevelId;
  parentBairro?: string;
  isReliable?: boolean;
  properties: Record<string, unknown>;
  /** Enquadramento da geometria completa — a do GeoJSON, sem recorte por tile. */
  bbox?: BBox;
  /** Polígono inteiro: o recorte das edificações precisa dele, e o do evento do mapa vem cortado por tile. */
  geometry?: GeoJSON.Geometry;
}

interface GeoIndex {
  bairros: IndexedFeature[];
  loteamentos: IndexedFeature[];
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
  bairrosData: null,
  loteamentosData: null,
  loading: true,
  error: false,
};

function indexFeatures(
  features: GeoJSON.Feature[],
  level: LevelId,
): IndexedFeature[] {
  return features.map((feature, featureId) => ({
    featureId,
    name: String(feature.properties?.name ?? ''),
    level,
    properties: feature.properties ?? {},
    bbox: feature.geometry ? computeBBox(feature.geometry) : undefined,
    geometry: feature.geometry ?? undefined,
    ...(level === 'loteamento' && {
      parentBairro: feature.properties?.parentBairro as string | undefined,
      isReliable: feature.properties?.is_reliable as boolean | undefined,
    }),
  }));
}

// O `generateId: true` do MapLibre numera as features na ordem do arquivo.
// Compartilhar o mesmo objeto parseado com MapLayers.tsx mantém `featureId`
// consistente por construção, não por coincidência de URL.
export function useGeoIndex(): GeoIndex {
  const [state, setState] = useState<GeoIndex>(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [bairrosData, loteamentosData]: FeatureCollection[] = await Promise.all([
          fetch('/data/bairros.geojson').then((r) => r.json()),
          fetch('/data/loteamentos.geojson').then((r) => r.json()),
        ]);
        if (cancelled) return;

        const bairros = indexFeatures(bairrosData.features, 'bairro');
        const loteamentos = indexFeatures(loteamentosData.features, 'loteamento');

        setState({ bairros, loteamentos, bairrosData, loteamentosData, loading: false, error: false });
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
