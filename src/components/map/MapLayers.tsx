'use client';

import type { FeatureCollection } from 'geojson';
import { useEffect } from 'react';
import { useMap } from '@/components/ui/map';
import { SELECTION_PITCH } from '@/config/buildings';
import type { ThemeName } from '@/lib/color/theme';
import type {
  HoveredBairro,
  HoveredLoteamento,
  PreviewTarget,
  Selection,
} from '@/types/map';
import type { ThemeTokens } from '@/hooks/useThemeTokens';
import { useGeoLayerStyles } from '@/hooks/useGeoLayerStyles';
import { useBairroLayer } from '@/hooks/map/useBairroLayer';
import { useLoteamentoLayer } from '@/hooks/map/useLoteamentoLayer';
import { useSetorLayer } from '@/hooks/map/useSetorLayer';
import { useMapLayerHandlers } from '@/hooks/useMapLayerHandlers';

interface MapLayersProps {
  theme: ThemeName;
  tokens: ThemeTokens;
  /**
   * GeoJSON já buscado por `useGeoIndex` (`null` até resolver). Objeto e não URL,
   * para o MapLibre não rebuscar o arquivo — docs/ARQUITETURA-CODIGO-E-MELHORIAS.md §4.2.
   * Setor não tem consumidor duplo e segue por URL.
   */
  bairroData: FeatureCollection | null;
  loteamentoData: FeatureCollection | null;
  layerToggles: { bairro: boolean; loteamento: boolean; setor: boolean };
  selection: Selection | null;
  hoveredBairro: HoveredBairro | null;
  /** Vem do mapa ou da lista da ficha — ver HoveredLoteamento. */
  hoveredLoteamento: HoveredLoteamento | null;
  previewTarget: PreviewTarget | null;
  onHoverBairro: (hovered: HoveredBairro | null) => void;
  onHoverLoteamento: (hovered: HoveredLoteamento | null) => void;
  onSelect: (selection: Selection) => void;
  /** Padding for `fitBounds`; on mobile it's asymmetric so selection rises above the sheet. */
  fitPadding?: number | { top: number; bottom: number; left: number; right: number };
}

export function MapLayers({
  theme,
  tokens,
  bairroData,
  loteamentoData,
  layerToggles,
  selection,
  hoveredBairro,
  hoveredLoteamento,
  previewTarget,
  onHoverBairro,
  onHoverLoteamento,
  onSelect,
  fitPadding = 40,
}: MapLayersProps) {
  const { map, isLoaded } = useMap();

  // Hook de dados + cores por tema
  useGeoLayerStyles({
    map,
    isLoaded,
    theme,
    tokens,
    bairroData,
    loteamentoData,
  });

  // Hooks de criação e visibilidade per-camada
  useBairroLayer({
    map,
    isLoaded,
    theme,
    selection,
    hoveredBairro,
    previewTarget,
    layerToggleBairro: layerToggles.bairro,
  });

  useLoteamentoLayer({
    map,
    isLoaded,
    theme,
    selection,
    hoveredBairro,
    hoveredLoteamento,
    previewTarget,
    layerToggleBairro: layerToggles.bairro,
    layerToggleLoteamento: layerToggles.loteamento,
  });

  useSetorLayer({
    map,
    isLoaded,
    theme,
    layerToggleLoteamento: layerToggles.loteamento,
    layerToggleSetor: layerToggles.setor,
  });

  // Hook consolidado de handlers (hover + clique)
  useMapLayerHandlers({
    map,
    isLoaded,
    selection,
    hoveredLoteamento,
    layerToggleBairro: layerToggles.bairro,
    onHoverBairro,
    onHoverLoteamento,
    onSelect,
  });

  // Enquadra a seleção. A bbox vem pronta (a source só enxerga tiles
  // renderizados e devolveria geometria fragmentada) e o pitch entra junto,
  // porque extrusão de topo lê como preenchimento — §2.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!selection) {
      if (map.getPitch() !== 0) map.easeTo({ pitch: 0, duration: 800 });
      return;
    }
    if (!selection.bbox) return;
    map.fitBounds(selection.bbox, {
      padding: fitPadding,
      duration: 800,
      pitch: SELECTION_PITCH,
    });
  }, [map, isLoaded, selection, fitPadding]);

  return null;
}
