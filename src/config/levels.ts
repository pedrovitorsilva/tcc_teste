import type { LayerToggles, LevelConfig, LevelId } from '@/types/map';

/**
 * Metadata for the three administrative levels: GeoJSON URLs (output do ETL em
 * dados/etl/output, copiado para public/data), source/layer IDs and stroke width.
 *
 * Colors are not here — they're resolved at runtime from the active theme tokens
 * (hooks/useThemeTokens.ts), so theme changes don't require code updates.
 */
export const LEVELS: LevelConfig[] = [
  {
    id: 'bairro',
    label: 'Bairro',
    // Bairros e distritos na mesma camada; `tipo` diferencia os dois.
    url: '/data/bairros_e_distritos.geojson',
    sourceId: 'bairro-source',
    fillLayerId: 'bairro-fill',
    lineLayerId: 'bairro-line',
    colorToken: 'bairro',
    lineWidth: 1.6,
    lineWidthHover: 2.3,
    lineWidthPreview: 2.4,
  },
  {
    id: 'loteamento',
    label: 'Loteamento',
    url: '/data/loteamentos.geojson',
    sourceId: 'loteamento-source',
    fillLayerId: 'loteamento-fill',
    lineLayerId: 'loteamento-line',
    colorToken: 'loteamento',
    lineWidth: 1,
    lineWidthHover: 2.15,
    lineWidthPreview: 2.1,
  },
  {
    id: 'setor',
    label: 'Setor Censitário',
    url: '/data/setores.geojson',
    sourceId: 'setor-source',
    fillLayerId: 'setor-fill',
    lineLayerId: 'setor-line',
    colorToken: 'setor',
    lineWidth: 0.7,
    lineWidthHover: 0.7,
    lineWidthPreview: 0.7,
    dashArray: [2, 3],
  },
];

export function getLevel(id: LevelId): LevelConfig {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`Unknown level id: ${id}`);
  return level;
}

// Bairros começam visíveis (protótipo real: checkbox "Bairros" ligado por
// padrão, mas desligável — não é um "sempre visível" travado).
export const DEFAULT_LAYER_TOGGLES: LayerToggles = {
  bairro: true,
  loteamento: false,
  setor: false,
};

/** Rótulo do nível `bairro` para quem o vê: a mesma camada traz bairros e distritos. */
export function rotuloUnidade(tipo: string | undefined): 'bairro' | 'distrito' {
  return tipo === 'distrito' ? 'distrito' : 'bairro';
}

/** Áreas de ponderação: só dados (indicadores da ficha do loteamento), sem camada no mapa. */
export const AREAS_PONDERACAO_URL = '/data/areas_ponderacao.geojson';
