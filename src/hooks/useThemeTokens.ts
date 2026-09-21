'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';

export interface ThemeTokens {
  bairro: string;
  loteamento: string;
  setor: string;
  uncertain: string;
  ink: string;
  inkSoft: string;
  panel: string;
  accentWash: string;
  /** Cor das extrusões de edificação, nos três temas — o último degrau da rampa. */
  building: string;
  /** Cor do "papel" do basemap — alvo claro da tintura do tema antigo. */
  mapLand: string;
  /** Cor chapada da água no basemap. */
  mapWater: string;
  /** Cor da tinta do basemap — alvo escuro da tintura do tema antigo. */
  mapInk: string;
}

const VAR_NAMES: Record<keyof ThemeTokens, string> = {
  bairro: '--bairro',
  loteamento: '--loteamento',
  setor: '--setor',
  uncertain: '--uncertain',
  ink: '--ink',
  inkSoft: '--ink-soft',
  panel: '--panel',
  accentWash: '--accent-wash',
  building: '--building',
  mapLand: '--map-land',
  mapWater: '--map-water',
  mapInk: '--map-ink',
};

// Espelha [data-theme="light"] do globals.css, para o primeiro render (servidor
// e pré-hidratação), antes de dar para ler o estilo computado.
const FALLBACK_TOKENS: ThemeTokens = {
  bairro: '#303d58',
  loteamento: '#475676',
  setor: '#607195',
  uncertain: '#55565a',
  ink: '#1a1f2b',
  inkSoft: '#545c6b',
  panel: '#ffffff',
  accentWash: 'rgba(48, 61, 88, .06)',
  building: '#798eb6',
  mapLand: '#ffffff',
  mapWater: '#e3e9f2',
  mapInk: '#2b3242',
};

function readTokens(): ThemeTokens {
  if (typeof window === 'undefined') return FALLBACK_TOKENS;
  const style = getComputedStyle(document.documentElement);
  const out = { ...FALLBACK_TOKENS };
  (Object.keys(VAR_NAMES) as (keyof ThemeTokens)[]).forEach((key) => {
    const value = style.getPropertyValue(VAR_NAMES[key]).trim();
    if (value) out[key] = value;
  });
  return out;
}

/**
 * Resolve os tokens (`--bairro`, `--loteamento`, ...) para o valor calculado,
 * relendo a cada troca de tema. Existe porque o `paint` do MapLibre não resolve
 * `var()`: quem pinta camadas precisa reaplicar a cada objeto novo daqui.
 * Ver docs/DECISOES-TECNICAS.md §6.
 */
export function useThemeTokens(): ThemeTokens {
  const { theme, paletteOverride } = useTheme();
  const [tokens, setTokens] = useState<ThemeTokens>(readTokens);

  useEffect(() => {
    // Espera um frame: o atributo/estilo inline e o estilo computado não
    // atualizam no mesmo tick, e leríamos o valor antigo.
    const raf = requestAnimationFrame(() => setTokens(readTokens()));
    return () => cancelAnimationFrame(raf);
  }, [theme, paletteOverride]);

  return tokens;
}
