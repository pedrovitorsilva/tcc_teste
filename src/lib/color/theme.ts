/**
 * Nome do tema ativo: persistência em `localStorage` e aplicação no
 * `<html>` (atributo `data-theme` + classe `light`/`dark`).
 *
 * `applyTheme`/`isThemeName` são reimplementados manualmente (não
 * importados) no script anti-FOUC inline em `src/app/layout.tsx` — ele
 * precisa rodar antes do bundle JS carregar. Mudar a lógica aqui exige
 * atualizar o script lá também.
 */

export type ThemeName = 'light' | 'dark' | 'vintage';

export const THEMES: ThemeName[] = ['light', 'dark', 'vintage'];

export const THEME_LABELS: Record<ThemeName, string> = {
  light: 'Tema claro',
  dark: 'Tema escuro',
  vintage: 'Tema antigo',
};

// mapcn (src/components/ui/map.tsx) only resolves its basemap from the
// `dark`/`light` class on <html> — a `vintage` theme still needs the
// street-map tile that "light" resolves to.
const THEME_TO_MAPCN_CLASS: Record<ThemeName, 'light' | 'dark'> = {
  light: 'light',
  dark: 'dark',
  vintage: 'light',
};

const STORAGE_KEY = 'cadastro-vivo-theme';

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && (THEMES as string[]).includes(value);
}

export function getStoredTheme(): ThemeName | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isThemeName(value) ? value : null;
  } catch {
    return null;
  }
}

export function applyTheme(name: ThemeName) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = name;
  root.classList.remove('light', 'dark');
  root.classList.add(THEME_TO_MAPCN_CLASS[name]);
  try {
    window.localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // localStorage unavailable (private mode, etc.) — theme still applies for this session.
  }
}
