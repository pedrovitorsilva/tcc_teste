import type { LevelId } from '@/types/map';

/**
 * Hierarquia do botão voltar no mapa: a seleção vive no histórico do navegador
 * como até 2 entradas por cima da entrada-base da página (a URL não muda):
 *
 *   base (sem seleção)  →  E1 [bairro]  →  E2 [bairro, loteamento]
 *
 * Cada entrada guarda a cadeia inteira em `history.state.cvChain`. Aqui fica só a
 * regra (pura, testável); a API do navegador é injetada via `HistoryLike`.
 */

/** Identifica uma seleção sem carregar o objeto inteiro (que o pool de features resolve). */
export interface SelectionRef {
  level: LevelId;
  featureId: string | number;
}

export type Chain = SelectionRef[];

/** Entrada do histórico: profundidade = `chain.length`. */
export interface HistoryOp {
  type: 'push' | 'replace';
  chain: Chain;
}

/** `go` (≤ 0) roda primeiro; `ops` roda depois — só após o `popstate` quando `go !== 0`. */
export interface HistoryPlan {
  go: number;
  ops: HistoryOp[];
}

/** O que o planejamento precisa do navegador; `window.history` satisfaz. */
export interface HistoryLike {
  state: unknown;
  pushState(state: unknown, unused: string): void;
  replaceState(state: unknown, unused: string): void;
  go(delta: number): void;
}

const same = (a: SelectionRef, b: SelectionRef) => a.level === b.level && String(a.featureId) === String(b.featureId);
const igual = (a: Chain, b: Chain) => a.length === b.length && a.every((ref, i) => same(ref, b[i]));

/** Cadeia gravada na entrada atual; entrada sem cadeia (a base, ou de fora do mapa) = vazia. */
export function chainOf(state: unknown): Chain {
  const chain = (state as { cvChain?: Chain } | null)?.cvChain;
  return Array.isArray(chain) ? chain : [];
}

/**
 * Como ir da cadeia atual (`cur`) à desejada (`next`) mexendo o mínimo no
 * histórico. Trocar de bairro/loteamento no mesmo nível substitui a entrada
 * (não empilha); descer empilha só o que falta; subir volta com `go` e depois
 * substitui a entrada onde chegou.
 */
export function planejar(cur: Chain, next: Chain): HistoryPlan {
  const t = next.length;
  if (t === 0) return { go: -cur.length, ops: [] };
  if (cur.length > t) return { go: -(cur.length - t), ops: [{ type: 'replace', chain: next }] };
  if (cur.length === t) return igual(cur, next) ? { go: 0, ops: [] } : { go: 0, ops: [{ type: 'replace', chain: next }] };

  const ops: HistoryOp[] = [];
  // A entrada atual tem de ser o prefixo da nova cadeia; se não é (bairro A → loteamento de B), troca antes de empilhar.
  if (cur.length > 0 && !igual(cur, next.slice(0, cur.length))) ops.push({ type: 'replace', chain: next.slice(0, cur.length) });
  for (let n = cur.length + 1; n <= t; n++) ops.push({ type: 'push', chain: next.slice(0, n) });
  return { go: 0, ops };
}

export function aplicarOps(ops: HistoryOp[], h: HistoryLike): void {
  for (const op of ops) {
    // Mescla, não substitui: sem o `__NA` do Next, o `popstate` dele recarrega a página (DECISOES-TECNICAS §2).
    const state = { ...(h.state as object | null), cvChain: op.chain };
    if (op.type === 'push') h.pushState(state, '');
    else h.replaceState(state, '');
  }
}

/** Executa o plano. Devolve as operações que ficam para depois do `popstate` (vazio se não houve `go`). */
export function executar(plan: HistoryPlan, h: HistoryLike): HistoryOp[] {
  if (plan.go !== 0) {
    h.go(plan.go);
    return plan.ops;
  }
  aplicarOps(plan.ops, h);
  return [];
}
