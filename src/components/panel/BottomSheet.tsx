'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { FeatureDetails, FeatureBackLink } from '@/components/panel/FeatureDetails';
import { CloseIcon, DragHandleIcon } from '@/components/icons';
import type { IndexedFeature } from '@/hooks/useGeoIndex';
import type { LevelId, Selection } from '@/types/map';

export type SheetSnap = 'preview' | 'expanded';

const PREVIEW_FRACTION = 0.35;
const EXPANDED_FRACTION = 0.85;
const CLOSE_THRESHOLD_FRACTION = PREVIEW_FRACTION - 0.1;

interface BottomSheetProps {
  selection: Selection | null;
  loteamentos: IndexedFeature[];
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
  snap,
  onSnapChange,
  onClose,
  onNavigate,
}: BottomSheetProps) {
  const isOpen = selection !== null;
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const dragStartYRef = useRef(0);
  const baseHeightPxRef = useRef(0);
  const didDragRef = useRef(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Altura "expandida" clampeada ao conteúdo real — evita a folha abrir a
  // 85% da tela com um vazio grande quando a ficha só tem 1-2 linhas.
  const [expandedHeightPx, setExpandedHeightPx] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const HANDLE_HEIGHT = 44;
    const BREATHING_ROOM = 24;
    const header = headerRef.current?.offsetHeight ?? 0;
    const content = contentRef.current?.scrollHeight ?? 0;
    const natural = HANDLE_HEIGHT + header + content + BREATHING_ROOM;
    const cap = window.innerHeight * EXPANDED_FRACTION;
    setExpandedHeightPx(Math.min(natural, cap));
  }, [isOpen, selection]);

  const targetHeightPx = isOpen
    ? snap === 'preview'
      ? window.innerHeight * PREVIEW_FRACTION
      : (expandedHeightPx ?? window.innerHeight * EXPANDED_FRACTION)
    : 0;

  function handlePointerDown(e: React.PointerEvent) {
    setIsDragging(true);
    didDragRef.current = false;
    dragStartYRef.current = e.clientY;
    baseHeightPxRef.current = targetHeightPx;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging) return;
    const dy = e.clientY - dragStartYRef.current;
    if (Math.abs(dy) > 4) didDragRef.current = true;
    // Arrastar para baixo (dy > 0) encolhe a folha.
    setDragOffsetPx(dy);
  }

  function endDrag() {
    if (!isDragging) return;
    setIsDragging(false);
    const finalHeightPx = baseHeightPxRef.current - dragOffsetPx;
    const finalFraction = finalHeightPx / window.innerHeight;
    setDragOffsetPx(0);

    if (finalFraction < CLOSE_THRESHOLD_FRACTION) {
      onClose();
      return;
    }
    const midpoint = (PREVIEW_FRACTION + EXPANDED_FRACTION) / 2;
    onSnapChange(finalFraction >= midpoint ? 'expanded' : 'preview');
  }

  const heightStyle = isOpen ? `${targetHeightPx - dragOffsetPx}px` : '0px';

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
        onClick={() => {
          // pointerup já resolveu o snap via endDrag() para um arraste real;
          // só um clique/toque sem deslocamento (ou ativação por teclado)
          // deve alternar aqui.
          if (didDragRef.current) return;
          onSnapChange(snap === 'preview' ? 'expanded' : 'preview');
        }}
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
            onSelectLoteamento={(name) => onNavigate('loteamento', name)}
          />
        )}
      </div>
    </div>
  );
}
