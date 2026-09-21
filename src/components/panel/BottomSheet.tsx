'use client';

import { FeatureDetails, FeatureBackLink } from '@/components/panel/FeatureDetails';
import { CloseIcon, DragHandleIcon } from '@/components/icons';
import type { IndexedFeature } from '@/hooks/useGeoIndex';
import { useBottomSheetDrag } from '@/hooks/useBottomSheetDrag';
import type { LevelId, Selection, SheetSnap } from '@/types/map';

interface BottomSheetProps {
  selection: Selection | null;
  loteamentos: IndexedFeature[];
  buildingCount: number;
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  onClose: () => void;
  onNavigate: (level: LevelId, name: string) => void;
}

/**
 * The details sheet on mobile. Snap is controlled by parent so MapView
 * can know sheet height and reposition floating controls.
 */
export function BottomSheet({
  selection,
  loteamentos,
  buildingCount,
  snap,
  onSnapChange,
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
        <div className="cv-kicker truncate">
          {selection
            ? selection.level === 'bairro'
              ? 'ficha do bairro'
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
            loteamentos={loteamentos}
            buildingCount={buildingCount}
            onSelectLoteamento={(name) => onNavigate('loteamento', name)}
          />
        )}
      </div>
    </div>
  );
}
