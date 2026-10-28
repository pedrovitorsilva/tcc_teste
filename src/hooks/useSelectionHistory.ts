'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  aplicarOps,
  chainOf,
  executar,
  planejar,
  type Chain,
  type HistoryOp,
} from '@/lib/map/selectionHistory';

interface SelectionHistory {
  /** Registra no histórico uma seleção feita pelo usuário (cadeia raiz → seleção). */
  commit: (chain: Chain) => void;
  /** Volta ao mapa geral (desfaz todas as entradas de seleção de uma vez). */
  close: () => void;
  /** Sobe um nível. */
  back: () => void;
  /** Profundidade atual: 0 = mapa geral, 1 = bairro, 2 = loteamento. */
  depth: () => number;
}

/**
 * Liga a seleção ao botão voltar do navegador/celular: voltar sobe a hierarquia
 * (loteamento → bairro → mapa geral) antes de sair da página. `restore` recebe a
 * cadeia da entrada para onde o usuário foi (voltar, avançar) e deve aplicar a
 * seleção SEM mexer no histórico. Regra em `lib/map/selectionHistory.ts`.
 */
export function useSelectionHistory(restore: (chain: Chain) => void): SelectionHistory {
  const restoreRef = useRef(restore);
  restoreRef.current = restore;
  /** Operações que esperam o `popstate` de um `go` (ex.: subir de nível e trocar a seleção). */
  const pendingRef = useRef<HistoryOp[] | null>(null);

  useEffect(() => {
    // Recarregar com a entrada de uma seleção deixaria o histórico dizendo "bairro" com o estado React vazio.
    aplicarOps([{ type: 'replace', chain: [] }], window.history);

    const onPopState = (event: PopStateEvent) => {
      if (pendingRef.current) {
        // O `go` do commit chegou: completa a troca de entrada; a seleção já foi aplicada pelo chamador.
        const ops = pendingRef.current;
        pendingRef.current = null;
        aplicarOps(ops, window.history);
        return;
      }
      restoreRef.current(chainOf(event.state));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const commit = useCallback((chain: Chain) => {
    const plan = planejar(chainOf(window.history.state), chain);
    const pending = executar(plan, window.history);
    pendingRef.current = pending.length ? pending : null;
  }, []);

  const close = useCallback(() => {
    const plan = planejar(chainOf(window.history.state), []);
    executar(plan, window.history);
  }, []);

  const back = useCallback(() => window.history.back(), []);
  const depth = useCallback(() => chainOf(window.history.state).length, []);

  return { commit, close, back, depth };
}
