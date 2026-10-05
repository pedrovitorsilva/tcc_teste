'use client';

import { FeatureDetails, FeatureBackLink } from '@/components/panel/FeatureDetails';
import { CentralizarIcon, CloseIcon, DragHandleIcon } from '@/components/icons';
import type { IndexedFeature } from '@/hooks/useGeoIndex';
import { rotuloUnidade } from '@/config/levels';
import type { Resumo } from '@/lib/resumo';
import { useBottomSheetDrag } from '@/hooks/useBottomSheetDrag';
import type { AreaPonderacaoProperties, LevelId, Selection, SheetSnap } from '@/types/map';

interface BottomSheetProps {
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
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  onClose: () => void;
  onNavigate: (level: LevelId, name: string) => void;
  /** Reenquadra a seleção (depois de pan/zoom). */
  onRecenter: () => void;
}

/**
 * The details sheet on mobile. Snap is controlled by parent so MapView
 * can know sheet height and reposition floating controls.
 */
export function BottomSheet({
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
  snap,
  onSnapChange,
  onRecenter,
  onClose,
  onNavigate,
}: BottomSheetProps) {
  const {
    isOpen,
    isDragging,
    heightStyle,
    headerRef,
    contentRef,
    handlePointerDown,
    handlePointerMove,
    endDrag,
    onDragHandleClick,
  } = useBottomSheetDrag(selection, snap, onSnapChange, onClose);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-2xl border-t border-cv-border bg-panel shadow-[0_-4px_24px_rgba(0,0,0,.16)]"
      style={{
        height: heightStyle,
        transitionProperty: isDragging ? 'none' : 'height',
        transitionDuration: '300ms',
        transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
      }}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={onDragHandleClick}
        aria-label={snap === 'preview' ? 'Expandir ficha' : 'Recolher ficha'}
        className="flex h-11 w-full shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ink"
      >
        <DragHandleIcon className="h-4 w-8 text-ink-faint" aria-hidden="true" />
      </button>

      <div
        ref={headerRef}
        className="relative flex shrink-0 flex-col items-center border-b border-cv-border px-11 pb-3 text-center"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar ficha"
          title="Fechar"
          className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full border border-cv-border text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onRecenter}
          aria-label="Centralizar no mapa"
          title="Centralizar no mapa"
          className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full border border-cv-border text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <CentralizarIcon className="h-4 w-4" />
        </button>
        <div className="cv-kicker truncate">
          {selection
            ? selection.level === 'bairro'
              ? `ficha do ${rotuloUnidade(selection.properties.tipo as string)}`
              : `loteamento — ${selection.parentBairro ?? ''}`
            : ''}
        </div>
        <h2 className="cv-h2 truncate">{selection?.name ?? ''}</h2>
        {selection && (
          <FeatureBackLink
            selection={selection}
            onClose={onClose}
            onNavigate={onNavigate}
            className="mt-1"
          />
        )}
      </div>

      {/* min-h-0 pelo mesmo motivo da Sidebar: sem ele o flex item não encolhe
          e a folha corta o fim do conteúdo em vez de rolar. `scrollHeight`
          (usado para clampar a altura expandida) continua medindo certo. */}
      <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
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
          />
        )}
      </div>
    </div>
  );
}
