import { Atkinson_Hyperlegible } from 'next/font/google';

/**
 * Texto corrido, rótulos e botões da landing. Desenhada para legibilidade
 * (Braille Institute) — combina com a proposta de linguagem acessível e
 * contrasta com o Cormorant dos títulos. Só a landing carrega: o mapa não muda.
 */
export const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-landing',
  display: 'swap',
});
