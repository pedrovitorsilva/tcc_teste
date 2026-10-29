/**
 * Leitura da qualidade do loteamento e da população fora de loteamentos, como
 * texto pronto para a ficha. Funções puras, sem import de valor: o check
 * (`npm run check`) roda este arquivo direto no Node. Limiares e distribuição
 * medida em docs/DECISOES-TECNICAS.md §8.
 */
import type { LoteamentoProperties, UnidadeProperties } from '@/types/map';

export type Faixa = 'boa' | 'media' | 'baixa';

export const ROTULO_FAIXA: Record<Faixa, string> = { boa: 'boa', media: 'média', baixa: 'baixa' };

export const LIMIARES = {
  /** Fração de endereços com coordenada precisa (nv_geo_coord 1 ou 2): ≥ boa, ≥ média, abaixo baixa. */
  coordenadas: { boa: 0.95, media: 0.8 },
} as const;

export interface ItemQualidade {
  chave: 'limites' | 'coordenadas';
  valor: number | null;
  faixa: Faixa | null;
}

export interface AvaliacaoQualidade {
  /** A pior faixa entre os itens com dado. */
  geral: Faixa;
  itens: ItemQualidade[];
}

const ORDEM: Faixa[] = ['boa', 'media', 'baixa'];

export function avaliarQualidade(q: LoteamentoProperties['qualidade'], isReliable: boolean): AvaliacaoQualidade {
  const coord = q.pct_coord_precisas;
  const { boa, media } = LIMIARES.coordenadas;
  const itens: ItemQualidade[] = [
    { chave: 'limites', valor: null, faixa: isReliable ? 'boa' : 'baixa' },
    { chave: 'coordenadas', valor: coord, faixa: coord == null ? null : coord >= boa ? 'boa' : coord >= media ? 'media' : 'baixa' },
  ];
  const geral = ORDEM[Math.max(...itens.map((i) => (i.faixa ? ORDEM.indexOf(i.faixa) : 0)))];
  return { geral, itens };
}

const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Frase da ficha do bairro; `null` para distrito (não tem loteamentos nem `residuo`). */
export function textoSobra(residuo: UnidadeProperties['residuo'] | null | undefined): string | null {
  if (!residuo) return null;
  // Abaixo de meio morador a frase diria "≈ 0 moradores (0,0%)"
  if (residuo.pop < 0.5) return 'Todos os moradores do bairro estão em algum loteamento.';
  const onde = residuo.tem_area ? 'na área hachurada do mapa' : 'em trechos pequenos entre eles';
  return `≈ ${inteiro.format(residuo.pop)} moradores (${decimal.format(residuo.pct * 100)}%) vivem fora de qualquer loteamento, ${onde}.`;
}
