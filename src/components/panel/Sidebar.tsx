'use client';

import { FeatureDetails, FeatureBackLink } from '@/components/panel/FeatureDetails';
import { CloseIcon } from '@/components/icons';
import type { IndexedFeature } from '@/hooks/useGeoIndex';
import type { LevelId, Selection } from '@/types/map';

interface SidebarProps {
  selection: Selection | null;
  loteamentos: IndexedFeature[];
  buildingCount: number;
  vehiclesCount: number;
  buildingsEnabled: boolean;
  carsEnabled: boolean;
  onClose: () => void;
  onNavigate: (level: LevelId, name: string) => void;
  /** Mirrors loteamento list hover to polygon on map. */
  onHoverLoteamento?: (name: string | null) => void;
  /** 320px on tablet (768–1024px), 380px on desktop. */
  width?: number;
}

export function Sidebar({
  selection,
  loteamentos,
  buildingCount,
  vehiclesCount,
  buildingsEnabled,
  carsEnabled,
  onClose,
  onNavigate,
  onHoverLoteamento,
  width = 380,
}: SidebarProps) {
  const isOpen = selection !== null;

  return (
    <div
      className="grid h-full overflow-hidden border-l border-cv-border bg-panel transition-[grid-template-columns] duration-450 ease-[cubic-bezier(.2,.8,.2,1)]"
      style={{
        gridTemplateColumns: isOpen ? `${width}px` : '0px',
        gridTemplateRows: '100%',
      }}
    >
      <div className="flex h-full flex-col" style={{ width }}>
        <div className="relative shrink-0 border-b border-cv-border px-5 pt-5.5 pb-4 pr-11">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar ficha"
            title="Fechar"
            className="absolute top-3.5 right-3 flex h-11 w-11 items-center justify-center rounded-full border border-cv-border text-ink-soft hover:bg-panel-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
          <div className="cv-kicker">
            {selection
              ? selection.level === 'bairro'
                ? 'ficha do bairro'
                : `loteamento — ${selection.parentBairro ?? ''}`
              : ''}
          </div>
          <h2 className="cv-h2 mt-1">
            {selection?.name ?? ''}
          </h2>
          {selection && (
            <FeatureBackLink
              selection={selection}
              onClose={onClose}
              onNavigate={onNavigate}
              className="mt-2"
            />
          )}
        </div>

        {/* min-h-0: sem isso o `min-height: auto` do flex item impede o
            encolhimento, o conteúdo estoura a coluna e o `overflow-hidden` da
            raiz corta o fim da lista em vez de deixá-la rolar. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-5">
          {selection && (
            <FeatureDetails
              selection={selection}
              loteamentos={loteamentos}
              buildingCount={buildingCount}
              vehiclesCount={vehiclesCount}
              buildingsEnabled={buildingsEnabled}
              carsEnabled={carsEnabled}
              onSelectLoteamento={(name) => onNavigate('loteamento', name)}
              onHoverLoteamento={onHoverLoteamento}
            />
          )}
        </div>
      </div>
    </div>
  );
}
