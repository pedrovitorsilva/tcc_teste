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
 * Dois níveis de densidade, cada um com orçamento próprio: mata (`forest`,
 * `wetland`) vira massa de copas sobrepostas; campo aberto (`grass`, `shrub`,
 * `park`) continua com árvores espaçadas. Orçamentos separados para uma mata
 * grande não "comer" as árvores dos gramados.
 */
export type TreeDensity = 'forest' | 'open';

export const TREE_DENSITY_BY_SUBTYPE: Record<AnyVegetationSubtype, TreeDensity> = {
  forest: 'forest',
  wetland: 'forest',
  shrub: 'open',
  grass: 'open',
  park: 'open',
};

/** Área (m²) por árvore, ao espalhar pontos num polígono. */
export const TREE_SPACING_FOREST = 15;
export const TREE_SPACING_OPEN = 400;

/** Teto por polígono individual — evita um polígono grande sozinho estourar o orçamento. */
export const MAX_TREES_PER_POLYGON_FOREST = 800;
export const MAX_TREES_PER_POLYGON_OPEN = 200;

/** Teto por nível de densidade; a soma é o tamanho fixo dos InstancedMesh. */
export const MAX_TREES_FOREST = 8000;
export const MAX_TREES_OPEN = 5000;
export const MAX_TREES_TOTAL = MAX_TREES_FOREST + MAX_TREES_OPEN;

/** Dimensões da árvore (metros): altura/raio do tronco e da copa. */
export const TREE_TRUNK_HEIGHT = 2.2;
export const TREE_TRUNK_RADIUS = 0.18;
export const TREE_CANOPY_HEIGHT = 3.2;
export const TREE_CANOPY_RADIUS = 1.4;

export const TREE_TRUNK_COLOR = '#6b4a30';
/** Copa: cada árvore sorteia (hash da posição) um tom entre esses dois. */
export const TREE_CANOPY_COLOR_DARK = '#2d5a2e';
export const TREE_CANOPY_COLOR_LIGHT = '#4f7f3b';

/** Atribuição exibida automaticamente pelo controle de atribuição do mapa. */
export const VEGETATION_ATTRIBUTION =
  '<a href="https://overturemaps.org" target="_blank" rel="noreferrer">© Overture Maps Foundation</a>';
