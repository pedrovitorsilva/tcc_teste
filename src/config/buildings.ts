// Source of 3D buildings: static vector tiles in public/tiles/predios, generated
// once by scripts/prepare-buildings.mjs from Overture Maps (height, area and
// bairro/setor/loteamento codes are precomputed there). Vegetation, water and
// cars still read Overture remotely, hence the release constants below.

/**
 * Overture Maps release for the remote layers (vegetation, water, cars).
 * Placeholder: o handler `pmtiles://` (lib/map/pmtilesProtocol.ts) troca
 * `/tiles/latest/` pela release mais nova listada no bucket — ele só mantém as
 * ~2 últimas, então uma data fixa dava 404 a cada ~2 meses.
 */
export const OVERTURE_RELEASE = 'latest';

/** Bucket S3 dos tiles do Overture (listagem pública com CORS). */
export const OVERTURE_BUCKET_URL = 'https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com';

/** Usada se a listagem do bucket falhar. */
export const OVERTURE_FALLBACK_RELEASE = '2026-10-21.0';

/** Building tiles (z13–z14; MapLibre overzooms z14 above that). Missing tile = no buildings (404 is silent). */
export const BUILDINGS_TILES_URL = '/tiles/predios/{z}/{x}/{y}.pbf';
export const BUILDINGS_TILES_MAX_ZOOM = 14;

/** Release used and building count per bairro/distrito and loteamento. */
export const BUILDINGS_METADATA_URL = '/tiles/predios/metadados.json';

/** Identifier of the building vector source in MapLibre. */
export const BUILDINGS_SOURCE_ID = 'predios';

/** Source-layer name inside the generated tiles. */
export const BUILDINGS_SOURCE_LAYER = 'predios';

/** Identifier of the layer responsible for 3D extrusion of buildings. */
export const BUILDINGS_LAYER_ID = 'predios-extrusion';

/**
 * Minimum zoom level to display 3D buildings.
 * Avoids processing and rendering large amounts of geometry at low zoom levels.
 */
export const BUILDINGS_MIN_ZOOM = 13;

/** Opacity of 3D building extrusions. Must stay 1: below that MapLibre draws every extrusion twice per frame (depth pass + color pass). */
export const BUILDING_EXTRUSION_OPACITY = 1;

/** Minimum area (m²) for a building to get 3D extrusion at minimum zoom — decreases
 * linearly to 0 at LOD_FULL_DETAIL_ZOOM, where all appear. */
export const LOD_MIN_AREA_M2 = 60;

/** Zoom level at which area-based filtering is no longer applied. */
export const LOD_FULL_DETAIL_ZOOM = 16;

/**
 * The same LOD curve as integer-zoom steps, applied by the extrusion layer's
 * `filter` (MapLibre evaluates filters per tile zoom), so zooming never forces
 * a new clip. Format: [min area (m²) below the first step, zoom, area, ...].
 */
export const LOD_MIN_AREA_STEPS = [60, 14, 40, 15, 20, 16, 0] as const;

/** Mobile LOD: z13 150 m² (worst tile 27k → ~9k buildings), z14 100 m²; z15+ as desktop. */
export const LOD_MIN_AREA_STEPS_MOBILE = [150, 14, 100, 15, 20, 16, 0] as const;

/**
 * Required attribution for the data source.
 * Displayed automatically by the map attribution control.
 */
export const BUILDINGS_ATTRIBUTION =
  '<a href="https://overturemaps.org" target="_blank" rel="noreferrer">© Overture Maps Foundation</a>';

/**
 * Map pitch applied when framing a selection.
 * Enhances the perception of buildings as 3D volumes.
 */
export const SELECTION_PITCH = 50;

/** Lower on mobile: less horizon in view means fewer building tiles loaded and drawn. */
export const SELECTION_PITCH_MOBILE = 35;

/** Cap on the map's pixel ratio: 3× phone screens render 9 pixels per CSS pixel, 2× renders 4. */
export const MAX_PIXEL_RATIO = 2;