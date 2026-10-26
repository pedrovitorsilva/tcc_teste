'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import { getLevel } from '@/config/levels';
import {
  CHOROPLETH_CLASSES,
  COR_SEM_DADO,
  RAMPA_INICIO,
  getVisualizacao,
  type Visualizacao,
  type VisualizacaoId,
} from '@/config/visualizacoes';
import { quebrasQuantil, rampa } from '@/lib/map/choropleth';
import type { ThemeName } from '@/lib/color/theme';

export interface Choropleth {
  visualizacao: Visualizacao;
  /** Geometria do nível com `properties = { valor }` — o MapLibre não lê propriedade aninhada. */
  data: FeatureCollection;
  /** Bairros com `{ valor }` da mesma variável — fallback dos prédios em setor sob sigilo. `null` se o nível já é bairro. */
  bairros: FeatureCollection | null;
  quebras: number[];
  cores: string[];
  semDado: string;
  temSemDado: boolean;
}

// Setores: buscados só quando uma visualização por setor liga (a camada de
// setor do mapa vai por URL e não expõe o GeoJSON). Servido do cache HTTP.
let setoresRequest: Promise<FeatureCollection> | null = null;
function loadSetores(): Promise<FeatureCollection> {
  setoresRequest ??= fetch(getLevel('setor').url)
    .then((res) => (res.ok ? (res.json() as Promise<FeatureCollection>) : Promise.reject(new Error(`HTTP ${res.status}`))))
    .catch((err: Error) => {
      setoresRequest = null; // tenta de novo na próxima seleção
      throw err;
    });
  return setoresRequest;
}

/** Chave do código de cada nível no ETL — os prédios (tiles) trazem o mesmo código. */
const CODIGO = { setor: 'cd_setor', bairro: 'cd_unidade' } as const;

/**
 * Cópia de `fc` só com geometria, `codigo` da área e `{ valor }` da
 * visualização (sem valor = sigilo).
 */
function comValor(fc: FeatureCollection, visualizacao: Visualizacao, nivel: keyof typeof CODIGO): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: fc.features.map((feature) => {
      const props = feature.properties ?? {};
      const valor = visualizacao.valor(props);
      const codigo = props[CODIGO[nivel]] as string;
      return { type: 'Feature', geometry: feature.geometry, properties: valor == null ? { codigo } : { codigo, valor } };
    }),
  };
}

/** Classificação da visualização ativa (quantis + rampa do tema), ou `null` sem nenhuma. */
export function useChoropleth(
  id: VisualizacaoId | null,
  theme: ThemeName,
  /** Cor base do mapa (`--map-land`): ponto de partida da rampa. */
  mapLand: string,
  bairrosData: FeatureCollection | null,
): Choropleth | null {
  const visualizacao = getVisualizacao(id);
  const nivel = visualizacao?.nivel;
  const [setores, setSetores] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (nivel !== 'setor' || setores) return;
    let cancelled = false;
    loadSetores()
      .then((data) => {
        if (!cancelled) setSetores(data);
      })
      .catch((err: Error) => console.warn(`[useChoropleth] setores indisponíveis (${err.message})`));
    return () => {
      cancelled = true;
    };
  }, [nivel, setores]);

  // Dados e quebras não dependem do tema: trocar de tema só refaz as cores
  // (sem recopiar geometria nem reenviar a source para o MapLibre).
  const classificacao = useMemo(() => {
    if (!visualizacao) return null;
    const fonte = visualizacao.nivel === 'setor' ? setores : bairrosData;
    if (!fonte) return null;

    const data = comValor(fonte, visualizacao, visualizacao.nivel);
    // Quebras só do nível principal: a legenda é dele.
    const valores = data.features.flatMap((f) => (f.properties?.valor != null ? [f.properties.valor as number] : []));
    return {
      visualizacao,
      data,
      bairros: visualizacao.nivel === 'setor' && bairrosData ? comValor(bairrosData, visualizacao, 'bairro') : null,
      quebras: quebrasQuantil(valores, CHOROPLETH_CLASSES),
      temSemDado: valores.length < data.features.length,
    };
  }, [visualizacao, setores, bairrosData]);

  return useMemo(() => {
    if (!classificacao) return null;
    const tom = theme === 'dark' ? 'escuro' : 'claro';
    const { visualizacao: v, quebras } = classificacao;
    return {
      ...classificacao,
      cores: rampa(mapLand, v.matiz[tom], quebras.length + 1, RAMPA_INICIO),
      semDado: COR_SEM_DADO[tom],
    };
  }, [classificacao, theme, mapLand]);
}
