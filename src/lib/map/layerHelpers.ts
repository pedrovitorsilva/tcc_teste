import type { ExpressionSpecification, Map as MaplibreMap } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';

/** Cria ou ignora (idempotente) uma source GeoJSON. */
export function ensureSource(
  map: MaplibreMap,
  sourceId: string,
  data: FeatureCollection | string
) {
  if (map.getSource(sourceId)) return;
  map.addSource(sourceId, {
    type: 'geojson',
    data,
    generateId: true,
  });
}

/** Cria ou ignora (idempotente) uma fill layer. */
export function ensureFillLayer(
  map: MaplibreMap,
  id: string,
  sourceId: string,
  opts?: { visible?: boolean; filter?: ExpressionSpecification }
) {
  if (map.getLayer(id)) return;
  map.addLayer({
    id,
    type: 'fill',
    source: sourceId,
    ...(opts?.filter ? { filter: opts.filter } : {}),
    ...(opts?.visible ? {} : { layout: { visibility: 'none' } }),
    paint: { 'fill-color': '#000000', 'fill-opacity': 0 },
  });
}

/** Cria ou ignora (idempotente) o efeito de brilho, só visível no tema escuro (ver §2).
 * Sempre criado oculto; visibilidade real é decidida pelos efeitos de estado abaixo. */
export function ensureGlowLayer(
  map: MaplibreMap,
  id: string,
  sourceId: string,
  lineWidth: number
) {
  if (map.getLayer(id)) return;
  map.addLayer({
    id,
    type: 'line',
    source: sourceId,
    layout: { visibility: 'none' },
    paint: {
      'line-color': '#000000',
      'line-width': lineWidth * GLOW_WIDTH_FACTOR,
      'line-blur': GLOW_BLUR,
      'line-opacity': 0,
    },
  });
}

/** Cria ou ignora (idempotente) uma line layer. */
export function ensureLineLayer(
  map: MaplibreMap,
  id: string,
  sourceId: string,
  lineWidth: number,
  opts?: { visible?: boolean; filter?: ExpressionSpecification; dasharray?: number[] }
) {
  if (map.getLayer(id)) return;
  map.addLayer({
    id,
    type: 'line',
    source: sourceId,
    ...(opts?.filter ? { filter: opts.filter } : {}),
    ...(opts?.visible ? {} : { layout: { visibility: 'none' } }),
    paint: {
      'line-color': '#000000',
      'line-width': lineWidth,
      ...(opts?.dasharray ? { 'line-dasharray': opts.dasharray } : {}),
    },
  });
}

/** Sincroniza visibilidade, largura e opacidade do halo com o estado atual.
 * Chamado por 3 efeitos (bairro, loteamento, setor) e factorizado para evitar duplicação. */
export function syncGlowLayer(
  map: MaplibreMap,
  glowLayerId: string,
  opts: {
    visible: boolean;
    lineOpacity: ExpressionSpecification | number;
    lineWidth?: ExpressionSpecification | number;
  }
) {
  map.setLayoutProperty(glowLayerId, 'visibility', opts.visible ? 'visible' : 'none');
  if (opts.lineWidth !== undefined) {
    map.setPaintProperty(glowLayerId, 'line-width', opts.lineWidth);
  }
  map.setPaintProperty(glowLayerId, 'line-opacity', opts.lineOpacity);
}

/** Multiplicador da espessura da linha nítida para a largura do halo. */
export const GLOW_WIDTH_FACTOR = 6;
export const GLOW_BLUR = 8;

/** Halo (efeito de brilho - linha larga e borrada sob a nítida), só no tema escuro — ver docs/DECISOES-TECNICAS.md §2. */
export const GLOW_LAYER_IDS = {
  bairro: 'bairro-glow',
  loteamento: 'loteamento-glow',
  setor: 'setor-glow',
} as const;

// Intensidade por estado no tema escuro. `dim` = "outra coisa está selecionada".
// Malha inteira acesa vira ruído — ver docs/DECISOES-TECNICAS.md §2.
export const NIGHT_LINE = { active: 1, idle: 0.42, dim: 0.14 };
export const NIGHT_GLOW = { active: 0.9, idle: 0.14, dim: 0.03 };
export const NIGHT_WIDTH = { activeFactor: 1.5, idleFactor: 0.7 };
