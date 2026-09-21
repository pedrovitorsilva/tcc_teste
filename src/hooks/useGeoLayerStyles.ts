'use client';

import { useEffect } from 'react';
import type { GeoJSONSource, Map as MaplibreMap, ExpressionSpecification } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { LEVELS } from '@/config/levels';
import { canvasToImageData, createHatchPatternCanvas } from '@/lib/map/hachurePattern';
import type { ThemeName } from '@/lib/color/theme';
import type { ThemeTokens } from '@/hooks/useThemeTokens';

const HATCH_IMAGE_ID = 'uncertain-hatch';
const UNRELIABLE_LINE_LAYER_ID = 'loteamento-unreliable-line';
const UNRELIABLE_HATCH_LAYER_ID = 'loteamento-unreliable-hatch';

interface UseGeoLayerStylesProps {
  map: MaplibreMap | null;
  isLoaded: boolean;
  theme: ThemeName;
  tokens: ThemeTokens;
  bairroData: FeatureCollection | null;
  loteamentoData: FeatureCollection | null;
}

/** Hook para sincronizar dados e estilos de cores das camadas com o tema ativo. */
export function useGeoLayerStyles({
  map,
  isLoaded,
  theme,
  tokens,
  bairroData,
  loteamentoData,
}: UseGeoLayerStylesProps) {
  // Preenche as sources vazias com o GeoJSON já buscado. Efeito separado da
  // criação para não fazê-la esperar o fetch; roda de novo a cada troca de
  // tema (via `isLoaded`), sem rebuscar nada.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (bairroData) {
      (map.getSource(LEVELS[0].sourceId) as GeoJSONSource | undefined)?.setData(bairroData);
    }
    if (loteamentoData) {
      (map.getSource(LEVELS[1].sourceId) as GeoJSONSource | undefined)?.setData(loteamentoData);
    }
  }, [map, isLoaded, bairroData, loteamentoData]);

  // Textura de hachura (tema "vintage" apenas) — precisa existir como imagem
  // do MapLibre antes que a layer que a referencia possa ficar visível.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (theme === 'vintage') {
      const canvas = createHatchPatternCanvas(tokens.uncertain, 8);
      if (map.hasImage(HATCH_IMAGE_ID)) map.removeImage(HATCH_IMAGE_ID);
      map.addImage(HATCH_IMAGE_ID, canvasToImageData(canvas), { pixelRatio: 2 });
    } else if (map.getLayer(UNRELIABLE_HATCH_LAYER_ID)) {
      map.setLayoutProperty(UNRELIABLE_HATCH_LAYER_ID, 'visibility', 'none');
      if (map.hasImage(HATCH_IMAGE_ID)) map.removeImage(HATCH_IMAGE_ID);
    }
  }, [map, isLoaded, theme, tokens.uncertain]);

  // Sincroniza a cor de todas as camadas (fill, linha, halo) com os tokens do tema ativo.
  // Roda de novo a cada troca de tema; sai cedo se as camadas ainda não existem neste ciclo.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!map.getLayer(LEVELS[0].fillLayerId)) return; // ainda não criadas neste ciclo

    const [bairro, loteamento, setor] = LEVELS;

    map.setPaintProperty(bairro.fillLayerId, 'fill-color', tokens.accentWash);
    map.setPaintProperty(bairro.lineLayerId, 'line-color', tokens.bairro);

    const loteamentoColor: ExpressionSpecification = [
      'case',
      ['==', ['get', 'is_reliable'], false],
      tokens.uncertain,
      tokens.loteamento,
    ];
    map.setPaintProperty(loteamento.fillLayerId, 'fill-color', loteamentoColor);
    map.setPaintProperty(loteamento.lineLayerId, 'line-color', tokens.loteamento);
    map.setPaintProperty(UNRELIABLE_LINE_LAYER_ID, 'line-color', tokens.uncertain);

    if (map.getLayer(UNRELIABLE_HATCH_LAYER_ID) && map.hasImage(HATCH_IMAGE_ID)) {
      map.setPaintProperty(UNRELIABLE_HATCH_LAYER_ID, 'fill-pattern', HATCH_IMAGE_ID);
    }

    map.setPaintProperty(setor.lineLayerId, 'line-color', tokens.setor);
    map.setPaintProperty(setor.fillLayerId, 'fill-color', tokens.setor);

    // Halo na mesma cor da linha que ele envolve — é a própria luz do nível
    // espalhada, não uma cor à parte.
    map.setPaintProperty('bairro-glow', 'line-color', tokens.bairro);
    map.setPaintProperty('loteamento-glow', 'line-color', loteamentoColor);
    map.setPaintProperty('setor-glow', 'line-color', tokens.setor);
  }, [map, isLoaded, tokens]);
}
