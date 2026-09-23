'use client';

import { LayerControlsPopoverButton } from './LayerControlsPopoverButton';
import { PalettePopoverButton } from './PalettePopoverButton';
import { ToggleButton } from '../ToggleButton';
import { BuildingIcon, VegetationIcon, WaterIcon, CarIcon } from '@/components/icons';
import type { LayerToggles } from '@/types/map';

interface OptionsListProps {
  layerToggles: LayerToggles;
  onLayerTogglesChange: (toggles: LayerToggles) => void;
  buildingsEnabled: boolean;
  onBuildingsChange: (enabled: boolean) => void;
  vegetationEnabled: boolean;
  onVegetationChange: (enabled: boolean) => void;
  waterEnabled: boolean;
  onWaterChange: (enabled: boolean) => void;
  carsEnabled: boolean;
  onCarsChange: (enabled: boolean) => void;
}

/** Agrupa camadas, paleta e as camadas 3D (prédios, vegetação, água) — sempre
 * juntos, idênticos no cluster de opções desktop e mobile de MapView.tsx. */
export function OptionsList({
  layerToggles,
  onLayerTogglesChange,
  buildingsEnabled,
  onBuildingsChange,
  vegetationEnabled,
  onVegetationChange,
  waterEnabled,
  onWaterChange,
  carsEnabled,
  onCarsChange,
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
        pressed={vegetationEnabled}
        onChange={onVegetationChange}
        icon={<VegetationIcon className="h-4 w-4" />}
        label={
          vegetationEnabled
            ? 'Vegetação 3D ativa — desativar'
            : 'Vegetação 3D desativada — ativar'
        }
      />
      <ToggleButton
        pressed={waterEnabled}
        onChange={onWaterChange}
        icon={<WaterIcon className="h-4 w-4" />}
        label={
          waterEnabled
            ? 'Água 3D ativa — desativar'
            : 'Água 3D desativada — ativar'
        }
      />
      <ToggleButton
        pressed={carsEnabled}
        onChange={onCarsChange}
        icon={<CarIcon className="h-4 w-4" />}
        label={
          carsEnabled
            ? 'Carros 3D ativos — desativar'
            : 'Carros 3D desativados — ativar'
        }
      />
    </>
  );
}
