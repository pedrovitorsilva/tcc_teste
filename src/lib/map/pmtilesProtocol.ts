'use client';

// Namespace import: `maplibre-gl` v6 has no default export.
import * as MapLibreGL from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { latestOvertureRelease } from './overtureRelease';

// The protocol is global to the `maplibre-gl` module, not per-instance — we can
// register it here without touching the third-party component.
let registered = false;

/** Register the `pmtiles://` handler once. Idempotent: registering twice is an error. 
 * Ensina o MapLibre a ler `pmtiles://`: lê o índice do arquivo remoto e baixa só o tile pedido via HTTP range request.
 */
export function ensurePMTilesProtocol() {
  if (registered || typeof window === 'undefined') return;
  const protocol = new Protocol();
  // `/tiles/latest/` → release real. O TileJSON devolvido já traz a URL
  // resolvida, então os requests de tile seguintes não passam pelo replace.
  MapLibreGL.addProtocol('pmtiles', async (params, abort) => {
    const url = params.url.includes('/tiles/latest/')
      ? params.url.replace('/tiles/latest/', `/tiles/${await latestOvertureRelease()}/`)
      : params.url;
    return protocol.tile({ ...params, url }, abort);
  });
  registered = true;
}
