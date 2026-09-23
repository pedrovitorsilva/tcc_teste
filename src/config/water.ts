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

// Textura de água: albedo + normal map (tangent-space), mesmo pack, 512×512.
export const WATER_DIFFUSE_MAP_URL = '/water/Water_diffuse_texture.jpg';
export const WATER_NORMAL_MAP_URL = '/water/Water_texture.jpg';

/**
 * Quantos metros cada repetição (tile) da textura cobre no chão. Pequeno
 * demais deixa a ondulação "amassada"; grande demais borra o detalhe.
 */
export const WATER_TEXTURE_TILE_SIZE_M = 20;

/**
 * Direção+velocidade de scroll da UV (unidades de UV por segundo) de cada
 * uma das duas amostras da textura — direções diferentes pra não
 * sincronizar visualmente (mesma ideia do `flowDirection` do Water2Mesh).
 */
export const WATER_SCROLL_SPEED_A: [number, number] = [0.06, 0.072];
export const WATER_SCROLL_SPEED_B: [number, number] = [-0.09, 0.02];

/** Intensidade e "foco" (expoente) do brilho especular. */
export const WATER_SPECULAR_STRENGTH = 0.6;
export const WATER_SPECULAR_SHININESS = 40;

/** Direção fixa da luz (não normalizada aqui — o shader normaliza). */
export const WATER_LIGHT_DIR: [number, number, number] = [0.4, 1, 0.3];

/** Atribuição exibida automaticamente pelo controle de atribuição do mapa. */
export const WATER_ATTRIBUTION =
  '<a href="https://overturemaps.org" target="_blank" rel="noreferrer">© Overture Maps Foundation</a>';
