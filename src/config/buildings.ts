// Source of 3D buildings: Overture Maps, via HTTP range request.

// Chosen dynamic requests by area — nothing is stored in the project as the file is ~180 GB. 

/**
 * Overture Maps release used as the source for buildings.
 * Must be updated when the release is no longer available.
 */
const OVERTURE_RELEASE = '2026-08-19.0';

/**
 * URL of the Overture Maps PMTiles file for buildings.
 * Data is accessed remotely via HTTP Range Request.
 */
export const BUILDINGS_PMTILES_URL =
  `pmtiles://https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com/tiles/${OVERTURE_RELEASE}/buildings.pmtiles`;

/** Identifier of the building vector source in MapLibre. */
export const BUILDINGS_SOURCE_ID = 'overture-buildings';

/** Name of the building layer within the Overture Maps vector source. */
export const BUILDINGS_SOURCE_LAYER = 'building';

/**
 * Auxiliary layer used to force tile loading from the source.
 * Has no relevant visual content.
 */
export const BUILDINGS_PROBE_LAYER_ID = 'overture-buildings-probe';

/** Identifier of the GeoJSON source containing buildings clipped to target. */
export const BUILDINGS_CLIP_SOURCE_ID = 'buildings-clip-source';

/** Identifier of the layer responsible for 3D extrusion of buildings. */
export const BUILDINGS_CLIP_LAYER_ID = 'buildings-clip-extrusion';

/**
 * Minimum zoom level to display 3D buildings.
 * Avoids processing and rendering large amounts of geometry at low zoom levels.
 */
export const BUILDINGS_MIN_ZOOM = 13;

/** Minimum height assigned to buildings, in meters. */
export const BUILDING_BASE_HEIGHT = 5;

/** Maximum additional height applied to larger buildings, in meters. */
export const BUILDING_EXTRA_HEIGHT = 13;

/**
 * Factor used to convert footprint area to approximate height.
 * Produces smaller heights for small buildings and larger heights for large ones.
 */
export const BUILDING_AREA_DIVISOR = 3.2;

/** Opacity of 3D building extrusions. */
export const BUILDING_EXTRUSION_OPACITY = 0.92;

/** Minimum area (m²) for a building to get 3D extrusion at minimum zoom — decreases
 * linearly to 0 at LOD_FULL_DETAIL_ZOOM, where all appear. */
export const LOD_MIN_AREA_M2 = 60;

/** Zoom level at which area-based filtering is no longer applied. */
export const LOD_FULL_DETAIL_ZOOM = 16;

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