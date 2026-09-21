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
import type { HoveredBairro, PreviewTarget, Selection } from '@/types/map';

const BAIRRO = getLevel('bairro');
const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] };

interface UseBairroLayerProps {
  map: MaplibreMap | null;
  isLoaded: boolean;
  theme: ThemeName;
  selection: Selection | null;
  hoveredBairro: HoveredBairro | null;
  previewTarget: PreviewTarget | null;
  layerToggleBairro: boolean;
}

/** Hook para criação, setup e visibilidade/realce da camada de bairros. */
export function useBairroLayer({
  map,
  isLoaded,
  theme,
  selection,
  hoveredBairro,
  previewTarget,
  layerToggleBairro,
}: UseBairroLayerProps) {
  // Cria sources e camadas. Idempotente: trocar de tema recarrega o style e
  // apaga tudo que não veio dele, então este efeito roda de novo e recria.
  useEffect(() => {
    if (!map || !isLoaded) return;

    ensureSource(map, BAIRRO.sourceId, EMPTY_FC);
    ensureFillLayer(map, BAIRRO.fillLayerId, BAIRRO.sourceId, { visible: true });
    ensureGlowLayer(map, GLOW_LAYER_IDS.bairro, BAIRRO.sourceId, BAIRRO.lineWidth);
    ensureLineLayer(map, BAIRRO.lineLayerId, BAIRRO.sourceId, BAIRRO.lineWidth, { visible: true });
  }, [map, isLoaded]);

  // Visibilidade/realce de bairros: hover, seleção ("locked"), preview de busca.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!map.getLayer(BAIRRO.fillLayerId)) return;

    // "Locked" = bairro selecionado ou bairro-pai do loteamento selecionado.
    // Casa por id; só usa nome quando é a única informação disponível
    // (`parentBairro` vem como string) — ver docs/DECISOES-TECNICAS.md §2.
    const isBairroLocked: ExpressionSpecification = [
      'any',
      selection?.level === 'bairro'
        ? (['==', ['id'], selection.featureId] as ExpressionSpecification)
        : false,
      selection?.level === 'loteamento' && selection.parentBairro
        ? (['==', ['get', 'name'], selection.parentBairro] as ExpressionSpecification)
        : false,
    ];
    const isBairroPreview: ExpressionSpecification | boolean =
      previewTarget?.level === 'bairro'
        ? ['==', ['id'], previewTarget.featureId]
        : false;
    const isLocked = selection !== null;

    const isNight = theme === 'dark';

    // À noite o bairro selecionado engrossa; nos outros temas afina (1.1 vs 1.6).
    // Ver docs/DECISOES-TECNICAS.md §2.
    const lineWidth: ExpressionSpecification = [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      BAIRRO.lineWidthHover,
      isBairroPreview,
      BAIRRO.lineWidthPreview,
      isBairroLocked,
      isNight ? BAIRRO.lineWidth * NIGHT_WIDTH.activeFactor : 1.1,
      isNight ? BAIRRO.lineWidth * NIGHT_WIDTH.idleFactor : BAIRRO.lineWidth,
    ];

    const dimOpacity: ExpressionSpecification = [
      'case',
      isBairroPreview,
      1,
      isBairroLocked,
      1,
      isLocked,
      isNight ? NIGHT_LINE.dim : 0.28,
      isNight ? NIGHT_LINE.idle : 1,
    ];

    // Preenchimento é presença, não foco: não acompanha a atenuação do contorno,
    // senão o bairro sumiria inteiro quando outro estivesse selecionado.
    const fillOpacity: ExpressionSpecification = isNight
      ? ['case', isBairroPreview, 1, isBairroLocked, 1, isLocked, 0.35, 1]
      : dimOpacity;

    const glowOpacity: ExpressionSpecification = [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      NIGHT_GLOW.active,
      isBairroPreview,
      NIGHT_GLOW.active,
      isBairroLocked,
      NIGHT_GLOW.active,
      isLocked,
      NIGHT_GLOW.dim,
      NIGHT_GLOW.idle,
    ];

    map.setPaintProperty(BAIRRO.lineLayerId, 'line-width', lineWidth);
    map.setPaintProperty(BAIRRO.lineLayerId, 'line-opacity', dimOpacity);
    map.setPaintProperty(BAIRRO.fillLayerId, 'fill-opacity', fillOpacity);
    map.setLayoutProperty(
      BAIRRO.fillLayerId,
      'visibility',
      layerToggleBairro ? 'visible' : 'none'
    );
    map.setLayoutProperty(
      BAIRRO.lineLayerId,
      'visibility',
      layerToggleBairro ? 'visible' : 'none'
    );
    syncGlowLayer(map, GLOW_LAYER_IDS.bairro, {
      visible: layerToggleBairro && isNight,
      lineWidth: ['*', lineWidth, GLOW_WIDTH_FACTOR] as ExpressionSpecification,
      lineOpacity: glowOpacity,
    });
  }, [map, isLoaded, theme, selection, previewTarget, layerToggleBairro]);
}
