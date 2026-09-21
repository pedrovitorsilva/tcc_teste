'use client';

import { useEffect } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import {
  ensureSource,
  ensureFillLayer,
  ensureGlowLayer,
  ensureLineLayer,
  syncGlowLayer,
  GLOW_LAYER_IDS,
  NIGHT_LINE,
  NIGHT_GLOW,
} from '@/lib/map/layerHelpers';
import { getLevel } from '@/config/levels';
import type { ThemeName } from '@/lib/color/theme';

const SETOR = getLevel('setor');
const SETOR_FILL_LAYER_ID = SETOR.fillLayerId;

// Opacidades de preenchimento. Valores medidos, não escolhidos: alpha mistura
// luz e pode inverter a rampa do tema escuro — ver docs/DECISOES-TECNICAS.md §1.
const SETOR_FILL_OPACITY: Record<ThemeName, number> = {
  dark: 0.16,
  light: 0.1,
  vintage: 0.14,
};

interface UseSetorLayerProps {
  map: MaplibreMap | null;
  isLoaded: boolean;
  theme: ThemeName;
  layerToggleLoteamento: boolean;
  layerToggleSetor: boolean;
}

/** Hook para criação, setup e visibilidade da camada de setores censitários. */
export function useSetorLayer({
  map,
  isLoaded,
  theme,
  layerToggleLoteamento,
  layerToggleSetor,
}: UseSetorLayerProps) {
  // Cria sources e camadas. Idempotente.
  useEffect(() => {
    if (!map || !isLoaded) return;

    // Preenchimento do setor: o id já existia em config/levels.ts mas a camada
    // nunca chegou a ser criada, porque até aqui o setor era só contorno.
    // Entra para o gradiente de granularidade do tema escuro ler como áreas, e
    // não apenas como traços — por isso fica invisível nos outros dois temas.
    ensureSource(map, SETOR.sourceId, SETOR.url);
    ensureFillLayer(map, SETOR_FILL_LAYER_ID, SETOR.sourceId);
    ensureGlowLayer(map, GLOW_LAYER_IDS.setor, SETOR.sourceId, SETOR.lineWidth);
    ensureLineLayer(map, SETOR.lineLayerId, SETOR.sourceId, SETOR.lineWidth, {
      dasharray: SETOR.dashArray ?? [2, 3],
    });
  }, [map, isLoaded]);

  // Setores censitários: visibilidade por toggle. Com Loteamentos também ligado,
  // o setor perde opacidade para os traçados sobrepostos não ficarem densos demais.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!map.getLayer(SETOR.lineLayerId)) return;
    const visibility = layerToggleSetor ? 'visible' : 'none';
    const isNight = theme === 'dark';
    // Camada de referência, sem estado de seleção. À noite fica sempre no nível
    // "leve", para não competir com bairro e loteamento acesos.
    const baseOpacity = layerToggleLoteamento ? 0.55 : 1;
    const lineOpacity = isNight ? baseOpacity * NIGHT_LINE.idle : baseOpacity;

    map.setLayoutProperty(SETOR.lineLayerId, 'visibility', visibility);
    map.setPaintProperty(SETOR.lineLayerId, 'line-opacity', lineOpacity);

    map.setLayoutProperty(
      SETOR_FILL_LAYER_ID,
      'visibility',
      layerToggleSetor && isNight ? 'visible' : 'none'
    );
    map.setPaintProperty(SETOR_FILL_LAYER_ID, 'fill-opacity', SETOR_FILL_OPACITY[theme]);
    syncGlowLayer(map, GLOW_LAYER_IDS.setor, {
      visible: layerToggleSetor && isNight,
      lineOpacity: baseOpacity * NIGHT_GLOW.idle,
    });
  }, [map, isLoaded, theme, layerToggleSetor, layerToggleLoteamento]);
}
