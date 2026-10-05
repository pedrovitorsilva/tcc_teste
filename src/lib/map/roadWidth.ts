import type { Map as MapLibreMap } from "maplibre-gl";
import { ROAD_STYLE_LAYER, ROAD_WIDTH_DEFAULT_M, ROAD_WIDTH_M } from "@/config/cars";

/** Pixels por metro no zoom/latitude (tiles de 512 px do MapLibre). */
export function pixelsPerMeter(zoom: number, lat: number): number {
  return (512 * 2 ** zoom) / (40075016.686 * Math.cos((lat * Math.PI) / 180));
}

const stopsCache = new Map<string, [number, number][] | null>();

/** `line-width` (px) da layer do basemap que desenha `roadClass` em `zoom`; `null` se não achar. */
export function drawnWidthPx(map: MapLibreMap, roadClass: string, zoom: number): number | null {
  const layerId = ROAD_STYLE_LAYER[roadClass];
  if (!layerId || !map.getLayer(layerId)) return null;
  let stops = stopsCache.get(layerId);
  if (stops === undefined) {
    const width = map.getPaintProperty(layerId, "line-width") as
      | number
      | { stops?: [number, number][] }
      | undefined;
    stops = typeof width === "object" && width?.stops ? width.stops : null;
    // ponytail: só o formato legado `stops` do CARTO; expressões `interpolate` caem no fallback em metros.
    stopsCache.set(layerId, stops);
  }
  if (!stops || stops.length === 0) return null;
  if (zoom <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i += 1) {
    if (zoom <= stops[i][0]) {
      const [z0, w0] = stops[i - 1];
      const [z1, w1] = stops[i];
      return w0 + ((w1 - w0) * (zoom - z0)) / (z1 - z0);
    }
  }
  return stops[stops.length - 1][1];
}

/**
 * Largura (m) com que a via aparece desenhada no zoom atual — carros e
 * postes acompanham a via como ela é vista, não a largura real. Sem a layer
 * do basemap, cai na largura aproximada por classe.
 */
export function drawnWidthM(map: MapLibreMap, roadClass: string): number {
  const zoom = map.getZoom();
  const px = drawnWidthPx(map, roadClass, zoom);
  return px === null
    ? (ROAD_WIDTH_M[roadClass] ?? ROAD_WIDTH_DEFAULT_M)
    : px / pixelsPerMeter(zoom, map.getCenter().lat);
}
