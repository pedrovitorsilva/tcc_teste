'use client';

import { IconPopoverButton } from '../IconPopoverButton';
import { LayersIcon } from '@/components/icons';
import { LayerControls, type Camada3D } from './LayerControls';
import type { LayerToggles } from '@/types/map';

interface LayerControlsPopoverButtonProps {
  toggles: LayerToggles;
  onChange: (toggles: LayerToggles) => void;
  camadas3D: Camada3D[];
  className?: string;
}

/**
 * Botão "Camadas": limites e 3D num popover só. O contador mostra quantas
 * camadas 3D estão ligadas, para o estado não ficar escondido atrás do botão.
 */
export function LayerControlsPopoverButton({
  toggles,
  onChange,
  camadas3D,
  className,
}: LayerControlsPopoverButtonProps) {
  const ativas3D = camadas3D.filter((c) => c.enabled).length;
  return (
    <IconPopoverButton
      icon={
        <span className="relative flex">
          <LayersIcon className="h-4 w-4" />
          {ativas3D > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-2.5 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] leading-none font-medium text-page"
            >
              {ativas3D}
            </span>
          )}
        </span>
      }
      ariaLabel={ativas3D > 0 ? `Camadas do mapa (${ativas3D} em 3D ligadas)` : 'Camadas do mapa'}
      title="Camadas"
      panelPosition="bottom-[calc(100%+8px)] left-0"
      className={className}
    >
      <LayerControls toggles={toggles} onChange={onChange} camadas3D={camadas3D} />
    </IconPopoverButton>
  );
}
