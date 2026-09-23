// Fonte dos carros 3D: Overture Maps, tema `transportation`, source-layer
// `segment` (mesmo bucket/release de config/buildings.ts). Modelos: pack
// glTF local em public/cars/ (ver public/cars/license.txt — CC-BY-4.0).

import { OVERTURE_RELEASE } from './buildings';

/** URL do PMTiles do tema `transportation` do Overture. */
export const CARS_PMTILES_URL =
  `pmtiles://https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com/tiles/${OVERTURE_RELEASE}/transportation.pmtiles`;

/** Identificador da source vetorial de vias no MapLibre. */
export const CARS_SOURCE_ID = 'overture-transportation';

/** Nome da layer de vias dentro da source `transportation` do Overture. */
export const CARS_SOURCE_LAYER = 'segment';

/** Layer invisível que mantém a source marcada como "used" (ver Buildings3D/§3). */
export const CARS_PROBE_LAYER_ID = 'overture-transportation-probe';

/** Zoom mínimo pra exibir carros — mesmo critério de escala das outras camadas 3D. */
export const CARS_MIN_ZOOM = 13;

/** Caminho do glTF combinado (pack inteiro, todos os tipos de veículo). */
export const CAR_GLTF_URL = '/cars/scene.gltf';

/**
 * Tipos de veículo escolhidos (dos ~14 do pack) — nomes exatos dos nós no
 * glTF, usados com `scene.getObjectByName`. MVP: só carros "normais", sem
 * caminhão/ônibus/ambulância/monster truck.
 */
export const CAR_TYPES = ['Sedan', 'Hatchback', 'SUV', 'Pickup'] as const;
export type CarType = (typeof CAR_TYPES)[number];

/** As 4 posições de roda, sufixo do nome do nó: `"${tipo} wheel ${posição}"`. */
export const CAR_WHEEL_POSITIONS = [
  'front right',
  'rear right',
  'front left',
  'rear left',
] as const;

/** Velocidade média dos carros (m/s) — ~25 km/h, trânsito de bairro. */
export const CAR_SPEED_MPS = 15;

/** Largura aproximada (m) por `class` do Overture; desconhecida cai em `ROAD_WIDTH_DEFAULT_M`. */
export const ROAD_WIDTH_M: Record<string, number> = {
  motorway: 14,
  trunk: 12,
  primary: 10,
  secondary: 8,
  tertiary: 8,
  residential: 6,
  unclassified: 6,
  living_street: 5,
  service: 4,
};
export const ROAD_WIDTH_DEFAULT_M = 6;

/**
 * Layer do basemap (CARTO) que desenha cada `class` — a largura em pixels dela
 * (`line-width`) no zoom atual dá a largura "desenhada" da via.
 */
export const ROAD_STYLE_LAYER: Record<string, string> = {
  motorway: 'road_mot_fill_noramp',
  trunk: 'road_trunk_fill_noramp',
  primary: 'road_pri_fill_noramp',
  secondary: 'road_sec_fill_noramp',
  tertiary: 'road_sec_fill_noramp',
  residential: 'road_minor_fill',
  unclassified: 'road_minor_fill',
  living_street: 'road_minor_fill',
  service: 'road_service_fill',
};

/** Largura de referência (m) em que o carro tem `CAR_MODEL_SCALE`; escala limitada a [MIN, MAX]. */
export const ROAD_WIDTH_REF_M = 7;
export const CAR_SCALE_FACTOR_MIN = 0.3;
export const CAR_SCALE_FACTOR_MAX = 2.5;

/** Classes sem carro (calçadas, ciclovias, trilhas). */
export const NON_CAR_CLASSES = new Set([
  'footway', 'pedestrian', 'steps', 'path', 'cycleway', 'bridleway', 'track',
]);

/** Comprimento mínimo de via (m) por carro — evita amontoar carros num segmento curto. */
export const CAR_MIN_SPACING_M = 15;

/** Teto de carros por segmento e no total, mesmo espírito de MAX_TREES_*. */
export const MAX_CARS_PER_SEGMENT = 3;
export const MAX_CARS_TOTAL = 150;

/**
 * Escala aplicada ao modelo clonado. Medido (Sedan, após `worldClone`):
 * ~1,57 m de comprimento em escala 1 — pequeno demais pra um carro real
 * (~4,5 m), por isso o fator ~2,9 abaixo. Reajustar se trocar o pack.
 */
export const CAR_MODEL_SCALE = 0.25;

/**
 * Offset de rotação (radianos) somado ao heading calculado — compensa o
 * eixo "de frente" com que o modelo foi modelado, caso não seja +Z. Ajustar
 * depois de conferir visualmente.
 */
export const CAR_MODEL_FORWARD_OFFSET = 0;

/**
 * Atribuição exibida automaticamente pelo controle de atribuição do mapa.
 * O texto do pack de veículos é o crédito exato exigido por
 * public/cars/license.txt (CC-BY-4.0) — não simplificar/parafrasear.
 */
export const CARS_ATTRIBUTION =
  '<a href="https://overturemaps.org" target="_blank" rel="noreferrer">© Overture Maps Foundation</a> · ' +
  'This work is based on <a href="https://sketchfab.com/3d-models/free-low-poly-vehicles-pack-cb7640039e7a40679a53be705ebff50e" target="_blank" rel="noreferrer">"Free Low Poly Vehicles Pack"</a> ' +
  'by <a href="https://sketchfab.com/rgsdev" target="_blank" rel="noreferrer">RgsDev</a> licensed under ' +
  '<a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC-BY-4.0</a>';
