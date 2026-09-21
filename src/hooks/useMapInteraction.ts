'use client';

import { useCallback, useEffect, useState } from 'react';
import type { IndexedFeature } from '@/hooks/useGeoIndex';
import type {
  HoveredBairro,
  HoveredLoteamento,
  LevelId,
  PreviewTarget,
  Selection,
  SheetSnap,
} from '@/types/map';

interface MapInteractionState {
  selection: Selection | null;
  hoveredBairro: HoveredBairro | null;
  hoveredLoteamento: HoveredLoteamento | null;
  previewTarget: PreviewTarget | null;
  sheetSnap: SheetSnap;
  setHoveredBairro: (bairro: HoveredBairro | null) => void;
  setHoveredLoteamento: (loteamento: HoveredLoteamento | null) => void;
  setSheetSnap: (snap: SheetSnap) => void;
  handleSelect: (next: Selection) => void;
  handleClose: () => void;
  handleNavigate: (level: LevelId, name: string) => void;
  handlePreview: (feature: IndexedFeature | null) => void;
  handleHoverLoteamentoByName: (name: string | null) => void;
}

/**
 * Estado e handlers de seleção/hover/preview do mapa — consolidados aqui porque
 * MapLayers, SearchBox, Sidebar e BottomSheet leem e escrevem o mesmo conjunto
 * de estados a partir de eventos diferentes (clique no polígono, hover na lista,
 * busca, navegação entre fichas).
 */
export function useMapInteraction(
  bairros: IndexedFeature[],
  loteamentos: IndexedFeature[],
): MapInteractionState {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [hoveredBairro, setHoveredBairro] = useState<HoveredBairro | null>(null);
  const [hoveredLoteamento, setHoveredLoteamento] =
    useState<HoveredLoteamento | null>(null);
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('preview');

  const handleSelect = useCallback((next: Selection) => {
    setSelection(next);
    setHoveredBairro(null);
    setHoveredLoteamento(null);
  }, []);

  /** Hover vindo da lista da ficha, que só sabe o nome. Casa nome + bairro-pai porque há homônimos no dataset. */
  const handleHoverLoteamentoByName = useCallback(
    (name: string | null) => {
      if (!name || selection?.level !== 'bairro') {
        setHoveredLoteamento(null);
        return;
      }
      const feature = loteamentos.find(
        (f) => f.name === name && f.parentBairro === selection.name,
      );
      setHoveredLoteamento(
        feature
          ? {
              featureId: feature.featureId,
              name: feature.name,
              parentBairro: feature.parentBairro,
            }
          : null,
      );
    },
    [loteamentos, selection],
  );

  // Toda seleção nova reabre a folha em modo "prévia".
  useEffect(() => {
    if (selection) setSheetSnap('preview');
  }, [selection?.featureId, selection?.level]);

  const handleClose = useCallback(() => {
    setSelection(null);
  }, []);

  useEffect(() => {
    if (!selection) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selection, handleClose]);

  const handleNavigate = useCallback(
    (level: LevelId, name: string) => {
      const pool = level === 'bairro' ? bairros : loteamentos;
      const feature = pool.find((f) => f.name === name);
      if (!feature) return;
      handleSelect({
        level,
        featureId: feature.featureId,
        name: feature.name,
        properties: feature.properties,
        parentBairro: feature.parentBairro,
        bbox: feature.bbox,
      });
    },
    [bairros, loteamentos, handleSelect],
  );

  const handlePreview = useCallback((feature: IndexedFeature | null) => {
    setPreviewTarget(
      feature
        ? {
            level: feature.level,
            featureId: feature.featureId,
            name: feature.name,
            parentBairro: feature.parentBairro,
          }
        : null,
    );
  }, []);

  return {
    selection,
    hoveredBairro,
    hoveredLoteamento,
    previewTarget,
    sheetSnap,
    setHoveredBairro,
    setHoveredLoteamento,
    setSheetSnap,
    handleSelect,
    handleClose,
    handleNavigate,
    handlePreview,
    handleHoverLoteamentoByName,
  };
}
