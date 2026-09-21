'use client';

import { IconPopoverButton } from '../IconPopoverButton';
import { LayersIcon } from '@/components/icons';
import { LayerControls } from './LayerControls';
import type { LayerToggles } from '@/types/map';

interface LayerControlsPopoverButtonProps {
  toggles: LayerToggles;
  onChange: (toggles: LayerToggles) => void;
  className?: string;
}

/**
 *  Colapsa menu de seleção de camadas(bairros/loteamentos/setores) em botão.
*/
export function LayerControlsPopoverButton({
  toggles,
  onChange,
  className,
}: LayerControlsPopoverButtonProps) {
  return (
    <IconPopoverButton
      icon={<LayersIcon className="h-4 w-4" />}
      ariaLabel="Camadas visíveis no mapa"
      title="Camadas visíveis"
      panelPosition="bottom-[calc(100%+8px)] left-0"
      className={className}
    >
      <LayerControls toggles={toggles} onChange={onChange} />
    </IconPopoverButton>
  );
}
