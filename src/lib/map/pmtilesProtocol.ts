'use client';

// Namespace import: `maplibre-gl` v6 has no default export.
import * as MapLibreGL from 'maplibre-gl';
import { Protocol } from 'pmtiles';

// The protocol is global to the `maplibre-gl` module, not per-instance — we can
// register it here without touching the third-party component.
let registered = false;

/** Register the `pmtiles://` handler once. Idempotent: registering twice is an error (§6). */
export function ensurePMTilesProtocol() {
  if (registered || typeof window === 'undefined') return;
  const protocol = new Protocol();
  MapLibreGL.addProtocol('pmtiles', protocol.tile);
  registered = true;
}
