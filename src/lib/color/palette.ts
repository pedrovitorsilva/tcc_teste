import type { ColorToken } from '@/types/map';
import type { ThemeName } from '@/lib/color/theme';

/**
 * Troca de cores dos polígonos em runtime, escrevendo nas variáveis CSS em vez
 * de chamar `setPaintProperty` direto: assim mapa e interface mudam juntos, a
 * partir de uma fonte só. Ver docs/DECISOES-TECNICAS.md §1.
 */

/** Tokens de cor que a paleta controla: os três níveis administrativos + prédios. */
export type PaletteToken = ColorToken | 'building';

export type PaletteOverride = Partial<Record<PaletteToken, string>>;

export type PaletteColors = Record<PaletteToken, string>;

export interface Palette {
  id: string;
  label: string;
  /**
   * Uma variante por tema: a mesma paleta precisa de lightness diferente para
   * continuar legível em cada fundo. Na variante `dark`, cada preset é uma rampa
   * — muda a cor da luz, não a estrutura. Ver docs/DECISOES-TECNICAS.md §1.
   */
  colors: Record<ThemeName, PaletteColors>;
}

const CSS_VAR: Record<PaletteToken, string> = {
  bairro: '--bairro',
  loteamento: '--loteamento',
  setor: '--setor',
  building: '--building',
};

export const COLOR_TOKENS: PaletteToken[] = ['bairro', 'loteamento', 'setor', 'building'];

export const TOKEN_LABELS: Record<PaletteToken, string> = {
  bairro: 'Bairro',
  loteamento: 'Loteamento',
  setor: 'Setor censitário',
  building: 'Prédios',
};

/** Presets trocam todos os níveis de uma vez: o valor de uma cor aqui é ser distinguível das outras. */
export const PALETTES: Palette[] = [
  {
    id: 'terra',
    label: 'Terra',
    colors: {
      // Rampa terrosa: mesma escada do tema claro, em sépia.
      light: { bairro: '#52361d', loteamento: '#704f31', setor: '#8e6947', building: '#af845f' },
      // Rampa dourada, a luz padrão do tema noturno.
      dark: { bairro: '#9e7500', loteamento: '#c89711', setor: '#ecb841', building: '#ffd47c' },
      // Oxblood padrão do tema antigo; prédios em marrom (55° OKLCH), fora do matiz.
      vintage: { bairro: '#660c0f', loteamento: '#832b28', setor: '#a0453f', building: '#b47548' },
    },
  },
  {
    id: 'frio',
    label: 'Frio',
    colors: {
      // O azul-ardósia padrão do tema claro.
      light: { bairro: '#303d58', loteamento: '#475676', setor: '#607195', building: '#798eb6' },
      // Rampa de vapor de mercúrio: mesma escada, luz fria.
      dark: { bairro: '#2f6d93', loteamento: '#57a3c4', setor: '#9fd4e8', building: '#c1ecfd' },
      vintage: { bairro: '#12375a', loteamento: '#2b5075', setor: '#43698f', building: '#5c84ab' },
    },
  },
  {
    id: 'contraste',
    label: 'Alto contraste',
    colors: {
      // Mesmo azul, croma bem mais alto: a escada fica óbvia sem virar arco-íris.
      light: { bairro: '#1d3879', loteamento: '#32529b', setor: '#486ec0', building: '#5b8ce7' },
      // O primeiro degrau não pode descer mais: abaixo de #b8410f perde os 3:1
      // de contraste contra o azul-marinho do tema.
      dark: { bairro: '#c24710', loteamento: '#f07818', setor: '#ffd24d', building: '#ffee8b' },
      vintage: { bairro: '#680020', loteamento: '#900d32', setor: '#ae3149', building: '#cd4e62' },
    },
  },
];

/** Variante da paleta para o tema ativo. */
export function paletteColors(palette: Palette, theme: ThemeName): PaletteColors {
  return palette.colors[theme];
}

/** Escreve as custom properties no `<html>`; `undefined` remove o override. */
export function applyPaletteOverride(override: PaletteOverride) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const token of COLOR_TOKENS) {
    const value = override[token];
    if (value) root.style.setProperty(CSS_VAR[token], value);
    else root.style.removeProperty(CSS_VAR[token]);
  }
}
