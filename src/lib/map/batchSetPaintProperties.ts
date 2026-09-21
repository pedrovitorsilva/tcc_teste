import type { Map as MaplibreMap } from 'maplibre-gl';

/** Batch setter para múltiplas propriedades de paint de uma camada,
 * reduzindo chamadas repetidas a `map.setPaintProperty`. */
export function batchSetPaintProperties(
  map: MaplibreMap,
  layerId: string,
  properties: Record<string, unknown>
) {
  Object.entries(properties).forEach(([key, value]) => {
    map.setPaintProperty(layerId, key as any, value);
  });
}
