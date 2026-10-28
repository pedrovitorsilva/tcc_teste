'use client';

import { IconPopoverButton, PANEL_ABOVE_CENTERED_BELOW_LG } from '../IconPopoverButton';
import { PaletteIcon } from '@/components/icons';
import { PaletteControls } from './PaletteControls';

/**
 *  Colapsa menu de seleção de cores em botão.
*/
export function PalettePopoverButton({ className }: { className?: string }) {
  return (
    <IconPopoverButton
      icon={<PaletteIcon className="h-4 w-4" />}
      ariaLabel="Cores das camadas"
      title="Cores das camadas"
      panelPosition={PANEL_ABOVE_CENTERED_BELOW_LG}
      className={className}
    >
      <PaletteControls />
    </IconPopoverButton>
  );
}
