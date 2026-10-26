import type { CSSProperties } from 'react';

/**
 * Paleta fixa do topo (foto + cabeçalho por cima dela): a foto é escura em
 * qualquer tema, então o topo usa sempre os valores do tema escuro do projeto
 * (globals.css), sobrescrevendo os tokens só ali dentro. Mesma convenção das
 * seções escuras da página: fundo `--ink`, texto `--page`.
 */
export const PALETA_TOPO = {
  '--ink': '#0c1626',
  '--page': '#e3e6ea',
  '--ink-soft': '#a4acb6',
  '--border': 'rgba(227, 230, 234, .24)',
} as CSSProperties;
