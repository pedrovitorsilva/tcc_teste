'use client';

import { useEffect } from 'react';
import type { ExpressionSpecification, Map as MaplibreMap } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import {
  ensureSource,
  ensureFillLayer,
  ensureGlowLayer,
  ensureLineLayer,
  syncGlowLayer,
  GLOW_LAYER_IDS,
  GLOW_WIDTH_FACTOR,
  NIGHT_LINE,
  NIGHT_GLOW,
  NIGHT_WIDTH,
} from '@/lib/map/layerHelpers';
import { getLevel } from '@/config/levels';
import type { ThemeName } from '@/lib/color/theme';
import type { HoveredBairro, HoveredLoteamento, PreviewTarget, Selection } from '@/types/map';

const LOTEAMENTO = getLevel('loteamento');
const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] };

const UNRELIABLE_LINE_LAYER_ID = 'loteamento-unreliable-line';
const UNRELIABLE_HATCH_LAYER_ID = 'loteamento-unreliable-hatch';

// Opacidades de preenchimento. Valores medidos, não escolhidos: alpha mistura
// luz e pode inverter a rampa do tema escuro — ver docs/DECISOES-TECNICAS.md §1.
const LOTEAMENTO_FILL_OPACITY: Record<
  ThemeName,
  { reliable: number; unreliable: number; hover: number; preview: number }
> = {
  dark: { reliable: 0.1, unreliable: 0.14, hover: 0.28, preview: 0.26 },
  light: { reliable: 0.18, unreliable: 0.12, hover: 0.3, preview: 0.28 },
  vintage: { reliable: 0.28, unreliable: 0.18, hover: 0.42, preview: 0.4 },
};

interface UseLoteamentoLayerProps {
  map: MaplibreMap | null;
  isLoaded: boolean;
  theme: ThemeName;
  selection: Selection | null;
  hoveredBairro: HoveredBairro | null;
  hoveredLoteamento: HoveredLoteamento | null;
  previewTarget: PreviewTarget | null;
  layerToggleBairro: boolean;
  layerToggleLoteamento: boolean;
}

/** Hook para criação, setup e visibilidade/realce da camada de loteamentos,
 * incluindo os layers extras de reliability (tracejado + hachura). */
export function useLoteamentoLayer({
  map,
  isLoaded,
  theme,
  selection,
  hoveredBairro,
  hoveredLoteamento,
  previewTarget,
  layerToggleBairro,
  layerToggleLoteamento,
}: UseLoteamentoLayerProps) {
  // Cria sources e camadas (padrão + extras de reliability). Idempotente.
  useEffect(() => {
    if (!map || !isLoaded) return;

    ensureSource(map, LOTEAMENTO.sourceId, EMPTY_FC);
    ensureFillLayer(map, LOTEAMENTO.fillLayerId, LOTEAMENTO.sourceId);
    ensureFillLayer(map, UNRELIABLE_HATCH_LAYER_ID, LOTEAMENTO.sourceId, {
      filter: ['==', ['get', 'is_reliable'], false],
    });
    ensureGlowLayer(map, GLOW_LAYER_IDS.loteamento, LOTEAMENTO.sourceId, LOTEAMENTO.lineWidth);
    ensureLineLayer(map, LOTEAMENTO.lineLayerId, LOTEAMENTO.sourceId, LOTEAMENTO.lineWidth, {
      filter: ['!=', ['get', 'is_reliable'], false],
    });
    ensureLineLayer(map, UNRELIABLE_LINE_LAYER_ID, LOTEAMENTO.sourceId, LOTEAMENTO.lineWidth, {
      filter: ['==', ['get', 'is_reliable'], false],
      dasharray: [6, 4],
    });
  }, [map, isLoaded]);

  // Visibilidade dos loteamentos: toggle global, hover ou seleção do bairro-pai.
  // O preview da busca ignora todas essas condições.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!map.getLayer(LOTEAMENTO.fillLayerId)) return;

    const lockedBairroName =
      selection?.level === 'bairro'
        ? selection.name
        : selection?.parentBairro ?? null;
    const hoveredBairroName = !selection ? hoveredBairro?.name ?? null : null;
    const previewLotName =
      previewTarget?.level === 'loteamento' ? previewTarget.name : null;

    const showCondition: ExpressionSpecification = [
      'any',
      layerToggleLoteamento,
      hoveredBairroName
        ? ['==', hoveredBairroName, ['get', 'parentBairro']]
        : false,
      lockedBairroName
        ? ['==', lockedBairroName, ['get', 'parentBairro']]
        : false,
    ];

    // Por id, não por nome: há loteamentos homônimos de bairros no dataset.
    const isPreview: ExpressionSpecification | boolean =
      previewTarget?.level === 'loteamento'
        ? ['==', ['id'], previewTarget.featureId]
        : false;
    const isActive: ExpressionSpecification | boolean =
      selection?.level === 'loteamento'
        ? ['==', ['id'], selection.featureId]
        : false;

    // Condicionado a `showCondition` para que um hover remanescente nunca
    // acenda um loteamento que não deveria estar visível.
    const isHovered: ExpressionSpecification = [
      'all',
      ['boolean', ['feature-state', 'hover'], false],
      showCondition,
    ];

    const isNight = theme === 'dark';
    const fillOpacities = LOTEAMENTO_FILL_OPACITY[theme];
    const fillOpacity: ExpressionSpecification = [
      'case',
      isHovered,
      fillOpacities.hover,
      isPreview,
      fillOpacities.preview,
      showCondition,
      ['case', ['==', ['get', 'is_reliable'], false], fillOpacities.unreliable, fillOpacities.reliable],
      0,
    ];
    const lineWidth: ExpressionSpecification = [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      LOTEAMENTO.lineWidthHover,
      isPreview,
      LOTEAMENTO.lineWidthPreview,
      isActive,
      LOTEAMENTO.lineWidthHover,
      isNight ? LOTEAMENTO.lineWidth * NIGHT_WIDTH.idleFactor : LOTEAMENTO.lineWidth,
    ];
    // À noite só hover, preview ou seleção acendem o contorno por completo.
    const lineOpacity: ExpressionSpecification = [
      'case',
      isPreview,
      1,
      isActive,
      1,
      isHovered,
      1,
      showCondition,
      isNight ? NIGHT_LINE.idle : 1,
      0,
    ];
    const glowOpacity: ExpressionSpecification = [
      'case',
      isPreview,
      NIGHT_GLOW.active,
      isActive,
      NIGHT_GLOW.active,
      isHovered,
      NIGHT_GLOW.active,
      showCondition,
      NIGHT_GLOW.idle,
      0,
    ];

    const unreliableLineWidthForFallback = (fallback: number): ExpressionSpecification => [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      LOTEAMENTO.lineWidthHover,
      isPreview,
      LOTEAMENTO.lineWidthPreview,
      isActive,
      LOTEAMENTO.lineWidthHover,
      fallback,
    ];
    const unreliableLineWidth: ExpressionSpecification = [
      'interpolate',
      ['linear'],
      ['zoom'],
      10,
      unreliableLineWidthForFallback(1.6),
      15,
      unreliableLineWidthForFallback(LOTEAMENTO.lineWidth),
    ];

    map.setPaintProperty(LOTEAMENTO.fillLayerId, 'fill-opacity', fillOpacity);
    map.setPaintProperty(LOTEAMENTO.lineLayerId, 'line-width', lineWidth);
    map.setPaintProperty(LOTEAMENTO.lineLayerId, 'line-opacity', lineOpacity);
    map.setPaintProperty(UNRELIABLE_LINE_LAYER_ID, 'line-width', unreliableLineWidth);
    map.setPaintProperty(UNRELIABLE_LINE_LAYER_ID, 'line-opacity', lineOpacity);
    map.setPaintProperty(
      UNRELIABLE_HATCH_LAYER_ID,
      'fill-opacity',
      theme === 'vintage'
        ? (['case', showCondition, 0.85, isPreview, 0.85, 0] as ExpressionSpecification)
        : 0
    );

    const visible = layerToggleLoteamento || hoveredBairroName !== null || lockedBairroName !== null;
    const visibility = visible ? 'visible' : 'none';
    map.setLayoutProperty(LOTEAMENTO.fillLayerId, 'visibility', visibility);
    map.setLayoutProperty(LOTEAMENTO.lineLayerId, 'visibility', visibility);
    map.setLayoutProperty(UNRELIABLE_LINE_LAYER_ID, 'visibility', visibility);
    syncGlowLayer(map, GLOW_LAYER_IDS.loteamento, {
      visible: visible && isNight,
      lineWidth: ['*', lineWidth, GLOW_WIDTH_FACTOR] as ExpressionSpecification,
      lineOpacity: glowOpacity,
    });
    map.setLayoutProperty(
      UNRELIABLE_HATCH_LAYER_ID,
      'visibility',
      visible && theme === 'vintage' ? 'visible' : 'none'
    );
    // Preview isolado (busca) pode acontecer mesmo com tudo desligado —
    // força a camada visível nesse caso específico.
    if (!visible && previewLotName) {
      map.setLayoutProperty(LOTEAMENTO.fillLayerId, 'visibility', 'visible');
      map.setLayoutProperty(LOTEAMENTO.lineLayerId, 'visibility', 'visible');
      map.setLayoutProperty(UNRELIABLE_LINE_LAYER_ID, 'visibility', 'visible');
    }
  }, [
    map,
    isLoaded,
    theme,
    selection,
    hoveredBairro,
    previewTarget,
    layerToggleBairro,
    layerToggleLoteamento,
  ]);
}
