'use client';

import { useEffect } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  SOBRAS_URL,
  SOBRA_FILL_LAYER_ID,
  SOBRA_FILL_OPACITY,
  SOBRA_HATCH_IMAGE_ID,
  SOBRA_HATCH_SIZE,
  SOBRA_SOURCE_ID,
} from '@/config/sobras';
import { canvasToImageData, createHatchPatternCanvas } from '@/lib/map/hachurePattern';
import { ensureSource, GLOW_LAYER_IDS } from '@/lib/map/layerHelpers';
import type { ThemeTokens } from '@/hooks/useThemeTokens';
import type { PreviewTarget, Selection } from '@/types/map';

interface UseSobraLayerProps {
  map: MaplibreMap | null;
  isLoaded: boolean;
  tokens: ThemeTokens;
  selection: Selection | null;
  hoveredBairroName: string | null;
  previewTarget: PreviewTarget | null;
  layerToggleLoteamento: boolean;
}

/**
 * Hachura da "sobra": parte do bairro que nenhum loteamento cobre. Fica sobre o
 * preenchimento do bairro e abaixo do contorno e dos loteamentos, então não os
 * afeta. Só aparece quando os loteamentos aparecem (toggle ligado, ou bairro em
 * hover/seleção/preview) — senão o bairro inteiro pareceria "descoberto".
 * Sem handlers: clique e hover passam direto para o bairro.
 */
export function useSobraLayer({
  map,
  isLoaded,
  tokens,
  selection,
  hoveredBairroName,
  previewTarget,
  layerToggleLoteamento,
}: UseSobraLayerProps) {
  // Imagem + source + layer. Idempotente; a imagem é a única parte que muda com o tema.
  useEffect(() => {
    if (!map || !isLoaded) return;

    const image = canvasToImageData(createHatchPatternCanvas(tokens.uncertain, SOBRA_HATCH_SIZE, true));
    if (map.hasImage(SOBRA_HATCH_IMAGE_ID)) map.updateImage(SOBRA_HATCH_IMAGE_ID, image);
    else map.addImage(SOBRA_HATCH_IMAGE_ID, image, { pixelRatio: 2 });

    ensureSource(map, SOBRA_SOURCE_ID, SOBRAS_URL);
    if (!map.getLayer(SOBRA_FILL_LAYER_ID)) {
      const before = map.getLayer(GLOW_LAYER_IDS.bairro) ? GLOW_LAYER_IDS.bairro : undefined;
      map.addLayer(
        {
          id: SOBRA_FILL_LAYER_ID,
          type: 'fill',
          source: SOBRA_SOURCE_ID,
          layout: { visibility: 'none' },
          paint: { 'fill-pattern': SOBRA_HATCH_IMAGE_ID, 'fill-opacity': SOBRA_FILL_OPACITY },
        },
        before
      );
    }
  }, [map, isLoaded, tokens.uncertain]);

  // Visibilidade: mesmas condições dos loteamentos, filtrando pelo bairro.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!map.getLayer(SOBRA_FILL_LAYER_ID)) return;

    const locked = selection?.level === 'bairro' ? selection.name : (selection?.parentBairro ?? null);
    const hovered = !selection ? hoveredBairroName : null;
    const preview = previewTarget?.level === 'bairro' ? previewTarget.name : (previewTarget?.parentBairro ?? null);
    const nomes = [locked, hovered, preview].filter((n): n is string => n !== null);

    map.setLayoutProperty(
      SOBRA_FILL_LAYER_ID,
      'visibility',
      layerToggleLoteamento || nomes.length > 0 ? 'visible' : 'none'
    );
    map.setFilter(
      SOBRA_FILL_LAYER_ID,
      layerToggleLoteamento ? null : ['in', ['get', 'nome'], ['literal', nomes]]
    );
  }, [map, isLoaded, selection, hoveredBairroName, previewTarget, layerToggleLoteamento]);
}
