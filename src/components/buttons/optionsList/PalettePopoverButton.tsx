'use client';

import { IconPopoverButton } from '../IconPopoverButton';
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
      panelPosition="bottom-[calc(100%+8px)] left-0"
      className={className}
    >
      <PaletteControls />
    </IconPopoverButton>
  );
}
