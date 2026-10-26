'use client';

import { useCallback, useEffect, useState } from 'react';
import type { IndexedFeature } from '@/hooks/useGeoIndex';
import { useSelectionHistory } from '@/hooks/useSelectionHistory';
import type { Chain, SelectionRef } from '@/lib/map/selectionHistory';
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

  /** Só estado: aplica a seleção sem tocar no histórico do navegador. */
  const aplicarSelecao = useCallback(
    (next: Selection) => {
      // O MapLibre devolve propriedades aninhadas (demografia, estimativas…) como
      // texto JSON. O índice tem os objetos originais na mesma posição do
      // `featureId` (`generateId` numera na ordem do arquivo).
      const pool = next.level === 'bairro' ? bairros : loteamentos;
      const indexed = pool[Number(next.featureId)];
      setSelection(indexed ? { ...next, properties: indexed.properties } : next);
      setHoveredBairro(null);
      setHoveredLoteamento(null);
    },
    [bairros, loteamentos],
  );

  /** Seleção a partir de uma feature do índice (a busca, o voltar do navegador). */
  const selecaoDe = (feature: IndexedFeature): Selection => ({
    level: feature.level,
    featureId: feature.featureId,
    name: feature.name,
    properties: feature.properties,
    parentBairro: feature.parentBairro,
    bbox: feature.bbox,
  });

  /** Cadeia do histórico até `sel`: o loteamento passa pelo bairro-pai, para o voltar também passar. */
  const cadeiaDe = (sel: Selection): Chain => {
    const ref: SelectionRef = { level: sel.level, featureId: sel.featureId };
    if (sel.level !== 'loteamento' || !sel.parentBairro) return [ref];
    const pai = bairros.find((b) => b.name === sel.parentBairro);
    return pai ? [{ level: 'bairro', featureId: pai.featureId }, ref] : [ref];
  };

  // Voltar/avançar do navegador: aplica a seleção da entrada, sem mexer no histórico.
  const history = useSelectionHistory((chain) => {
    const ref = chain[chain.length - 1];
    if (!ref) {
      setSelection(null);
      return;
    }
    const feature = (ref.level === 'bairro' ? bairros : loteamentos)[Number(ref.featureId)];
    if (feature) aplicarSelecao(selecaoDe(feature));
  });

  const handleSelect = useCallback(
    (next: Selection) => {
      history.commit(cadeiaDe(next));
      aplicarSelecao(next);
    },
    // `cadeiaDe` só lê `bairros`; `history` tem identidade estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aplicarSelecao, bairros, history],
  );

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

  // Fechar desce o histórico inteiro de uma vez (o `popstate` limpa a seleção), sem deixar entradas sobrando.
  const handleClose = useCallback(() => {
    history.close();
    setSelection(null);
  }, [history]);

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
      // "‹ voltar para [bairro]" do loteamento = o voltar do navegador (a entrada anterior já é o pai).
      if (level === 'bairro' && selection?.level === 'loteamento' && selection.parentBairro === name && history.depth() === 2) {
        history.back();
        return;
      }
      const pool = level === 'bairro' ? bairros : loteamentos;
      const feature = pool.find((f) => f.name === name);
      if (!feature) return;
      handleSelect(selecaoDe(feature));
    },
    // `selecaoDe` só monta o objeto, sem estado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bairros, loteamentos, handleSelect, selection, history],
  );

  const handlePreview = useCallback((feature: IndexedFeature | null) => {
    setPreviewTarget(
      feature
        ? {
            level: feature.level,
            featureId: feature.featureId,
            name: feature.name,
            parentBairro: feature.parentBairro,
            tipo: feature.tipo,
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
