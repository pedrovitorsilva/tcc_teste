// Fonte da água 3D: Overture Maps, tema `base`, source-layer `water`
// (mesmo bucket/release já usado por `config/buildings.ts`).

import { OVERTURE_RELEASE } from './buildings';

/** URL do PMTiles do tema `base` do Overture — água e vegetação vêm do mesmo arquivo. */
export const WATER_PMTILES_URL =
  `pmtiles://https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com/tiles/${OVERTURE_RELEASE}/base.pmtiles`;

/** Identificador da source vetorial de água no MapLibre. */
export const WATER_SOURCE_ID = 'overture-water';

/** Nome da layer de água dentro da source `base` do Overture. */
export const WATER_SOURCE_LAYER = 'water';

/** Layer invisível que mantém a source marcada como "used" (ver Buildings3D/§3). */
export const WATER_PROBE_LAYER_ID = 'overture-water-probe';

/** Zoom mínimo pra exibir água — o tileset do tema `base` tem maxzoom 13. */
export const WATER_MIN_ZOOM = 13;

/** Cor base da água (RGB 0-1, consumido direto pelo shader). */
export const WATER_COLOR: [number, number, number] = [0.16, 0.42, 0.58];

/** Amplitude da variação de brilho da onda (fração da cor base). */
export const WATER_WAVE_AMPLITUDE = 0.12;

/** Velocidade da animação da onda. */
export const WATER_WAVE_SPEED = 0.6;

/** Comprimento de onda espacial, em metros. */
export const WATER_WAVE_LENGTH = 6;

export const WATER_OPACITY = 0.85;

/** Atribuição exibida automaticamente pelo controle de atribuição do mapa. */
export const WATER_ATTRIBUTION =
  '<a href="https://overturemaps.org" target="_blank" rel="noreferrer">© Overture Maps Foundation</a>';
