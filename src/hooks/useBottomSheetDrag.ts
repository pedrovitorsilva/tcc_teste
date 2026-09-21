'use client';

import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from 'react';
import type { Selection, SheetSnap } from '@/types/map';

// Fração da altura da tela que a folha ocupa em cada modo de encaixe —
// consumida também por MapView (padding do mapa e posição dos controles
// flutuantes quando a folha está aberta no mobile).
export const PREVIEW_FRACTION = 0.35;
export const EXPANDED_FRACTION = 0.85;
const CLOSE_THRESHOLD_FRACTION = PREVIEW_FRACTION - 0.1;

interface BottomSheetDragState {
  isOpen: boolean;
  isDragging: boolean;
  heightStyle: string;
  headerRef: RefObject<HTMLDivElement>;
  contentRef: RefObject<HTMLDivElement>;
  handlePointerDown: (e: PointerEvent) => void;
  handlePointerMove: (e: PointerEvent) => void;
  endDrag: () => void;
  onDragHandleClick: () => void;
}

/**
 * Física de arraste da folha (mobile): mede a altura natural do conteúdo,
 * resolve a altura-alvo por modo de encaixe e decide, ao soltar, se fecha,
 * expande ou recolhe. Isolado do JSX porque a mesma lógica de altura serve
 * tanto o arraste por ponteiro quanto o toque na alça (clique alterna snap).
 */
export function useBottomSheetDrag(
  selection: Selection | null,
  snap: SheetSnap,
  onSnapChange: (snap: SheetSnap) => void,
  onClose: () => void,
): BottomSheetDragState {
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
    // featureId/level não são lidos aqui: são a chave que força remedir
    // quando o conteúdo troca (bairro A -> bairro B) com a folha já aberta.
  }, [isOpen, selection?.featureId, selection?.level]);

  const targetHeightPx = isOpen
    ? snap === 'preview'
      ? window.innerHeight * PREVIEW_FRACTION
      : (expandedHeightPx ?? window.innerHeight * EXPANDED_FRACTION)
    : 0;

  function handlePointerDown(e: PointerEvent) {
    setIsDragging(true);
    didDragRef.current = false;
    dragStartYRef.current = e.clientY;
    baseHeightPxRef.current = targetHeightPx;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
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

  function onDragHandleClick() {
    // pointerup já resolveu o snap via endDrag() para um arraste real;
    // só um clique/toque sem deslocamento (ou ativação por teclado)
    // deve alternar aqui.
    if (didDragRef.current) return;
    onSnapChange(snap === 'preview' ? 'expanded' : 'preview');
  }

  const heightStyle = isOpen ? `${targetHeightPx - dragOffsetPx}px` : '0px';

  return {
    isOpen,
    isDragging,
    heightStyle,
    headerRef,
    contentRef,
    handlePointerDown,
    handlePointerMove,
    endDrag,
    onDragHandleClick,
  };
}
