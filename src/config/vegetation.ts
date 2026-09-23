// Fonte da vegetação 3D: Overture Maps, tema `base`, source-layer `land_cover`
// (mesmo bucket/release já usado por `config/buildings.ts`).

import { OVERTURE_RELEASE } from './buildings';

/** URL do PMTiles do tema `base` do Overture — água e vegetação vêm do mesmo arquivo. */
export const VEGETATION_PMTILES_URL =
  `pmtiles://https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com/tiles/${OVERTURE_RELEASE}/base.pmtiles`;

/** Identificador da source vetorial de vegetação no MapLibre. */
export const VEGETATION_SOURCE_ID = 'overture-vegetation';

/** Nome da layer de cobertura do solo dentro da source `base` do Overture. */
export const VEGETATION_SOURCE_LAYER = 'land_cover';

/** Layer invisível que mantém a source marcada como "used" (ver Buildings3D/§3). */
export const VEGETATION_PROBE_LAYER_ID = 'overture-vegetation-probe';

/**
 * `park` não é `land_cover` (cobertura física do solo) — é `land_use` (uso
 * humano do terreno), outra source-layer dentro do mesmo `base.pmtiles`.
 * Confirmado com dado real: 131 polígonos `park` no tile do centro de VC.
 */
export const VEGETATION_LANDUSE_SOURCE_ID = 'overture-landuse';
export const VEGETATION_LANDUSE_SOURCE_LAYER = 'land_use';
export const VEGETATION_LANDUSE_PROBE_LAYER_ID = 'overture-landuse-probe';

/**
 * Terceira source, só pra excluir água: land_cover/land_use podem se
 * sobrepor com `water` na borda (ex.: wetland encostando num lago) e
 * espalhar árvore dentro d'água. Fonte própria (não reaproveita a source do
 * Water3D) porque os dois componentes ligam/desligam independentemente —
 * se a água estiver desligada, a source do Water3D nem existe.
 */
export const VEGETATION_WATER_SOURCE_ID = 'overture-vegetation-water-check';
export const VEGETATION_WATER_SOURCE_LAYER = 'water';
export const VEGETATION_WATER_PROBE_LAYER_ID = 'overture-vegetation-water-check-probe';

/** Zoom mínimo pra exibir vegetação — o tileset do tema `base` tem maxzoom 13. */
export const VEGETATION_MIN_ZOOM = 13;

/**
 * Subtypes de `land_cover` tratados como vegetação (confirmados com dados reais
 * no tile do centro de VC: forest, shrub, grass, wetland). `crop`/`barren`/`urban`
 * ficam de fora por não terem aparência de vegetação nesse contexto.
 */
export const VEGETATION_SUBTYPES = ['forest', 'grass', 'shrub', 'wetland'] as const;

export type VegetationSubtype = (typeof VEGETATION_SUBTYPES)[number];

/** Subtypes de `land_use` tratados como vegetação — só `park` por enquanto. */
export const LANDUSE_VEGETATION_SUBTYPES = ['park'] as const;

export type LanduseVegetationSubtype = (typeof LANDUSE_VEGETATION_SUBTYPES)[number];

export type AnyVegetationSubtype = VegetationSubtype | LanduseVegetationSubtype;

/**
 * Área (m²) que cada árvore ocupa, em média, ao espalhar pontos num polígono —
 * por subtype, porque um campo aberto (`grass`) não deveria ficar tão denso
 * quanto uma mata (`forest`). Densidade decrescente: forest > wetland > shrub >
 * grass/park (park usa a mesma densidade de grass, a pedido).
 */
export const TREE_SPACING_M2_BY_SUBTYPE: Record<AnyVegetationSubtype, number> = {
  forest: 40,
  wetland: 90,
  shrub: 150,
  grass: 400,
  park: 400,
};

/** Teto de árvores por polígono individual — evita um polígono grande sozinho estourar o total. */
export const MAX_TREES_PER_POLYGON = 400;

/** Teto de árvores no total — tamanho fixo do InstancedMesh. */
export const MAX_TREES_TOTAL = 3000;

/** Dimensões da árvore (metros): altura/raio do tronco e da copa. */
export const TREE_TRUNK_HEIGHT = 2.2;
export const TREE_TRUNK_RADIUS = 0.18;
export const TREE_CANOPY_HEIGHT = 3.2;
export const TREE_CANOPY_RADIUS = 1.4;

export const TREE_TRUNK_COLOR = '#6b4a30';
export const TREE_CANOPY_COLOR = '#3f7d43';

/** Atribuição exibida automaticamente pelo controle de atribuição do mapa. */
export const VEGETATION_ATTRIBUTION =
  '<a href="https://overturemaps.org" target="_blank" rel="noreferrer">© Overture Maps Foundation</a>';
