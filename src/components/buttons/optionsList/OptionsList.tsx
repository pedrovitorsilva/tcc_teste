'use client';

import { LayerControlsPopoverButton } from './LayerControlsPopoverButton';
import { PalettePopoverButton } from './PalettePopoverButton';
import { BuildingIcon, VegetationIcon, WaterIcon, CarIcon, LampIcon } from '@/components/icons';
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
  lampsEnabled: boolean;
  onLampsChange: (enabled: boolean) => void;
}

const ICONE = 'h-4 w-4';

/** Controles do canto do mapa: "Camadas" (limites + 3D) e "Paleta". Dois botões
 * em vez de sete — o 3D ambienta, não é o que se consulta a todo momento. */
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
  lampsEnabled,
  onLampsChange,
}: OptionsListProps) {
  return (
    <>
      <LayerControlsPopoverButton
        toggles={layerToggles}
        onChange={onLayerTogglesChange}
        camadas3D={[
          { key: 'predios', label: 'Edificações', icon: <BuildingIcon className={ICONE} />, enabled: buildingsEnabled, onChange: onBuildingsChange },
          { key: 'vegetacao', label: 'Vegetação', icon: <VegetationIcon className={ICONE} />, enabled: vegetationEnabled, onChange: onVegetationChange },
          { key: 'agua', label: 'Água', icon: <WaterIcon className={ICONE} />, enabled: waterEnabled, onChange: onWaterChange },
          { key: 'carros', label: 'Carros', icon: <CarIcon className={ICONE} />, enabled: carsEnabled, onChange: onCarsChange },
          { key: 'postes', label: 'Postes', icon: <LampIcon className={ICONE} />, enabled: lampsEnabled, onChange: onLampsChange },
        ]}
        className="relative"
      />
      <PalettePopoverButton className="relative" />
    </>
  );
}
