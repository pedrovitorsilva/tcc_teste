// Fonte dos carros 3D: Overture Maps, tema `transportation`, source-layer
// `segment` (mesmo bucket/release de config/buildings.ts). Modelos: pack
// glTF local (carro único) em public/cars/ (ver public/cars/license.txt — CC-BY-4.0).

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

/** Caminho do glTF do carro. */
export const CAR_GLTF_URL = '/cars/scene.gltf';

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
  'footway', 'pedestrian', 'steps', 'path', 'cycleway', 'bridleway', 'track', 'service',
]);

/** Comprimento mínimo de via (m) por carro — evita amontoar carros num segmento curto. */
export const CAR_MIN_SPACING_M = 40;

/** Teto de carros por segmento e no total, mesmo espírito de MAX_TREES_*. */
export const MAX_CARS_PER_SEGMENT = 2;
export const MAX_CARS_TOTAL = 150;

/**
 * Escala aplicada ao modelo clonado. Medido (após `worldClone`): ~3,4
 * unidades de comprimento em escala 1; 0,19 mantém o tamanho visual anterior.
 * Reajustar se trocar o modelo.
 */
export const CAR_MODEL_SCALE = 1.19;

/** Destaque extra (multiplicador) para carros nas rodovias. */
export const CAR_CLASS_BOOST: Record<string, number> = {
  motorway: 1.6,
  trunk: 1.5,
  primary: 1.3,
};

/**
 * Offset de rotação (radianos) somado ao heading calculado — compensa o
 * eixo "de frente" com que o modelo foi modelado, caso não seja +Z. Ajustar
 * depois de conferir visualmente.
 */
export const CAR_MODEL_FORWARD_OFFSET = Math.PI; // frente do modelo em -Z

/**
 * Faróis/lanternas, só à noite. As peças são MeshBasicMaterial (sem luz, sem
 * `emissive`): a cor já é o brilho final. Tamanhos em metros de um carro real
 * de `CAR_REFERENCE_LENGTH_M` — convertidos pro comprimento medido de cada
 * modelo, então acompanham a escala do carro (zoom/classe de via).
 */
export const CAR_REFERENCE_LENGTH_M = 4.5;
export const CAR_HEADLIGHT_COLOR = 0xfff4cc; // branco-quente
export const CAR_TAILLIGHT_COLOR = 0xff3333; // vermelho
/** Caixinha de cada farol/lanterna (m): largura × altura × profundidade. */
export const CAR_LAMP_SIZE_M: [number, number, number] = [0.3, 0.15, 0.1];

/** Disco aditivo no chão à frente do carro (como o halo dos postes). */
export const CAR_HEADLIGHT_GLOW_RADIUS = 4; // m
export const CAR_HEADLIGHT_GLOW_COLOR = 0xfff4cc;
/** Multiplica a cor do disco — no blending aditivo, cor = intensidade. */
export const CAR_HEADLIGHT_INTENSITY = 0.6;

/**
 * Atribuição exibida automaticamente pelo controle de atribuição do mapa.
 * Só dados (o (i) deduplica com buildings/water/vegetation); o crédito
 * CC-BY-4.0 do pack de veículos vai em CAR_MODEL_CREDIT (ver ModelsAttribution).
 */
export const CARS_ATTRIBUTION =
  '<a href="https://overturemaps.org" target="_blank" rel="noreferrer">© Overture Maps Foundation</a>';

/** Autor do modelo de carro (public/cars/license.txt), montado no (i) por ModelsAttribution. */
export const CAR_MODEL_CREDIT =
  '<a href="https://sketchfab.com/moonlight2023" target="_blank" rel="noreferrer">Moonlight</a> (carros)';
