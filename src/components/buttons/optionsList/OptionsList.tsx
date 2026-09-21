'use client';

import { LayerControlsPopoverButton } from './LayerControlsPopoverButton';
import { PalettePopoverButton } from './PalettePopoverButton';
import { BuildingsToggleButton } from './BuildingsToggleButton';
import { TitlePlacementToggleButton } from './TitlePlacementToggleButton';
import type { LayerToggles } from '@/types/map';

interface OptionsListProps {
  layerToggles: LayerToggles;
  onLayerTogglesChange: (toggles: LayerToggles) => void;
  buildingsEnabled: boolean;
  onBuildingsChange: (enabled: boolean) => void;
  titleInPolygon: boolean;
  onTitleChange: (inPolygon: boolean) => void;
}

/** Agrupa camadas, paleta, prédios 3D e posição do título — sempre juntos,
 * idênticos no cluster de opções desktop e mobile de MapView.tsx. */
export function OptionsList({
  layerToggles,
  onLayerTogglesChange,
  buildingsEnabled,
  onBuildingsChange,
  titleInPolygon,
  onTitleChange,
}: OptionsListProps) {
  return (
    <>
      <LayerControlsPopoverButton
        toggles={layerToggles}
        onChange={onLayerTogglesChange}
        className="relative"
      />
      <PalettePopoverButton className="relative" />
      <BuildingsToggleButton enabled={buildingsEnabled} onChange={onBuildingsChange} />
      <TitlePlacementToggleButton inPolygon={titleInPolygon} onChange={onTitleChange} />
    </>
  );
}
