'use client';

import { LayerControlsPopoverButton } from './LayerControlsPopoverButton';
import { PalettePopoverButton } from './PalettePopoverButton';
import { ToggleButton } from '../ToggleButton';
import { BuildingIcon, LabelIcon } from '@/components/icons';
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
      <ToggleButton
        pressed={buildingsEnabled}
        onChange={onBuildingsChange}
        icon={<BuildingIcon className="h-4 w-4" />}
        label={
          buildingsEnabled
            ? 'Edificações 3D ativas — desativar'
            : 'Edificações 3D desativadas — ativar'
        }
      />
      <ToggleButton
        pressed={titleInPolygon}
        onChange={onTitleChange}
        icon={<LabelIcon className="h-4 w-4" />}
        label={
          titleInPolygon
            ? 'Nome dentro do polígono — voltar ao título centralizado'
            : 'Nome centralizado — mover para dentro do polígono'
        }
      />
    </>
  );
}
