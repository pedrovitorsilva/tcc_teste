'use client';

import { FeatureDetails, FeatureBackLink } from '@/components/panel/FeatureDetails';
import { CentralizarIcon, CloseIcon, RecolherIcon } from '@/components/icons';
import type { IndexedFeature } from '@/hooks/useGeoIndex';
import { rotuloUnidade } from '@/config/levels';
import type { Resumo } from '@/lib/resumo';
import type { AreaPonderacaoProperties, LevelId, Selection } from '@/types/map';

interface SidebarProps {
  selection: Selection | null;
  /** Bairros e distritos — comparação do loteamento com o bairro pai. */
  bairros: IndexedFeature[];
  loteamentos: IndexedFeature[];
  municipio: Resumo | null;
  /** Áreas de ponderação por `cd_ap` — indicadores da ficha do loteamento. */
  areasPonderacao: Map<string, AreaPonderacaoProperties>;
  buildingCount: number;
  vehiclesCount: number;
  buildingsEnabled: boolean;
  carsEnabled: boolean;
  lampsEnabled: boolean;
  onClose: () => void;
  onNavigate: (level: LevelId, name: string) => void;
  /** Mirrors loteamento list hover to polygon on map. */
  onHoverLoteamento?: (name: string | null) => void;
  /** Recolhida: a seleção segue no mapa, o painel sai da frente. */
  collapsed: boolean;
  onCollapse: () => void;
  /** Reenquadra a seleção (depois de pan/zoom). */
  onRecenter: () => void;
  /** 320px on tablet (768–1024px), 380px on desktop. */
  width?: number;
}

export function Sidebar({
  selection,
  bairros,
  loteamentos,
  municipio,
  areasPonderacao,
  buildingCount,
  vehiclesCount,
  buildingsEnabled,
  carsEnabled,
  lampsEnabled,
  onClose,
  onNavigate,
  onHoverLoteamento,
  collapsed,
  onCollapse,
  onRecenter,
  width = 380,
}: SidebarProps) {
  const isOpen = selection !== null && !collapsed;

  return (
    <div
      className="grid h-full overflow-hidden border-l border-cv-border bg-panel transition-[grid-template-columns] duration-450 ease-[cubic-bezier(.2,.8,.2,1)]"
      style={{
        gridTemplateColumns: isOpen ? `${width}px` : '0px',
        gridTemplateRows: '100%',
      }}
    >
      <div className="flex h-full flex-col" style={{ width }}>
        <div className="relative shrink-0 border-b border-cv-border px-5 pt-5.5 pb-4 pr-36">
          {/* Ações do painel agrupadas à direita, da menos à mais definitiva. */}
          <div className="absolute top-3.5 right-3 flex gap-1">
            {[
              { label: 'Centralizar no mapa', onClick: onRecenter, icon: <CentralizarIcon className="h-4 w-4" /> },
              { label: 'Recolher ficha', onClick: onCollapse, icon: <RecolherIcon className="h-4 w-4" /> },
              { label: 'Fechar ficha', onClick: onClose, icon: <CloseIcon className="h-3.5 w-3.5" /> },
            ].map(({ label, onClick, icon }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                aria-label={label}
                title={label}
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-panel-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {icon}
              </button>
            ))}
          </div>
          <div className="cv-kicker">
            {selection
              ? selection.level === 'bairro'
                ? `ficha do ${rotuloUnidade(selection.properties.tipo as string)}`
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
              bairros={bairros}
              loteamentos={loteamentos}
              municipio={municipio}
              areasPonderacao={areasPonderacao}
              buildingCount={buildingCount}
              vehiclesCount={vehiclesCount}
              buildingsEnabled={buildingsEnabled}
              carsEnabled={carsEnabled}
              lampsEnabled={lampsEnabled}
              onSelectLoteamento={(name) => onNavigate('loteamento', name)}
              onHoverLoteamento={onHoverLoteamento}
            />
          )}
        </div>
      </div>
    </div>
  );
}
