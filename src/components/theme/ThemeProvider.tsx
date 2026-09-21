'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { applyTheme, getStoredTheme, type ThemeName } from '@/lib/color/theme';
import { applyPaletteOverride, type PaletteOverride } from '@/lib/color/palette';

interface ThemeContextValue {
  /** Tema ativo — persiste em localStorage (lib/color/theme.ts). */
  theme: ThemeName;
  /** Troca o tema e limpa o override de paleta (cor escolhida à mão pode
   * ficar ilegível no tema oposto). */
  setTheme: (name: ThemeName) => void;
  /** Cores de polígono escolhidas pelo usuário, sobrepondo as do tema. */
  paletteOverride: PaletteOverride;
  /** Substitui o override inteiro (usado pelos presets). Para editar um
   * token só, o chamador precisa espalhar o override atual — ver
   * PaletteControls.tsx, o color picker por camada faz isso. */
  setPaletteOverride: (override: PaletteOverride) => void;
  /** Limpa o override, devolvendo os polígonos às cores do tema. */
  resetPalette: () => void;
}

const EMPTY_OVERRIDE: PaletteOverride = {};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Server-rendered default is "light" (matches the inline anti-FOUC script
  // and the <html> fallback in layout.tsx); the real stored value (if any)
  // is picked up on mount, client-side only.
  const [theme, setThemeState] = useState<ThemeName>('light');
  // Sem persistência, por decisão de projeto: a paleta volta ao padrão do tema
  // a cada recarga (o tema em si continua persistindo em lib/theme.ts).
  const [paletteOverride, setPaletteOverrideState] =
    useState<PaletteOverride>(EMPTY_OVERRIDE);

  useEffect(() => {
    const stored = getStoredTheme();
    if (stored) setThemeState(stored);
  }, []);

  // Trocar de tema limpa o override: uma cor escolhida à mão sobre o tema
  // claro tem boa chance de ficar ilegível sobre o escuro.
  const setTheme = useCallback((name: ThemeName) => {
    setPaletteOverrideState(EMPTY_OVERRIDE);
    setThemeState(name);
  }, []);

  const resetPalette = useCallback(() => {
    setPaletteOverrideState(EMPTY_OVERRIDE);
  }, []);

  // Depois do tema: `applyTheme` mexe no [data-theme] e as custom properties
  // inline precisam ser reescritas por cima do que a nova regra de CSS define.
  useEffect(() => {
    applyTheme(theme);
    applyPaletteOverride(paletteOverride);
  }, [theme, paletteOverride]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        paletteOverride,
        setPaletteOverride: setPaletteOverrideState,
        resetPalette,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
