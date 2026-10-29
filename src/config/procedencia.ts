/**
 * De onde vem cada número da ficha. O selo distingue pela borda (forma) e pelo
 * texto, nunca só pela cor; a mesma descrição aparece em "Como ler os números".
 */

export type Procedencia = 'oficial' | 'estimado' | 'amostral';

export const PROCEDENCIA: Record<Procedencia, { rotulo: string; descricao: string; borda: 'solid' | 'dashed' | 'dotted' }> = {
  oficial: {
    rotulo: 'oficial',
    descricao: 'Contagem publicada pelo IBGE (Censo 2022) ou pelo INEP.',
    borda: 'solid',
  },
  estimado: {
    rotulo: 'estimado',
    descricao: 'População do setor censitário repartida entre loteamentos pela proporção de endereços do CNEFE.',
    // Tracejado, como o contorno dos limites aproximados: a família visual do "incerto".
    borda: 'dashed',
  },
  amostral: {
    rotulo: 'amostral',
    descricao: 'Amostra do Censo 2022 para a área de ponderação inteira, não só para este loteamento.',
    borda: 'dotted',
  },
};
