/** Bounding box of a GeoJSON geometry — used by map `fitBounds` and by search index. */

type NestedCoords = number[] | NestedCoords[];

export type BBox = [number, number, number, number];

/** `[minLng, minLat, maxLng, maxLat]`. Used by map and search index so both frame identically. */
export function computeBBox(geometry: GeoJSON.Geometry): BBox {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const visit = (coords: NestedCoords): void => {
    if (typeof coords[0] === 'number') {
      const [lng, lat] = coords as number[];
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      return;
    }
    (coords as NestedCoords[]).forEach(visit);
  };

  if ('coordinates' in geometry) {
    visit(geometry.coordinates as NestedCoords);
  }

  return [minLng, minLat, maxLng, maxLat];
}
