'use client';

import { useTheme } from '@/components/theme/ThemeProvider';
import { SunIcon, MoonIcon, ScrollIcon } from '@/components/icons';
import { THEME_LABELS, THEMES, type ThemeName } from '@/lib/color/theme';
import { cn } from '@/lib/utils';

export const THEME_ICONS: Record<ThemeName, typeof SunIcon> = {
  light: SunIcon,
  dark: MoonIcon,
  vintage: ScrollIcon,
};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-0.5 rounded-[20px] border border-cv-border bg-panel p-0.75">
      {THEMES.map((name) => {
        const Icon = THEME_ICONS[name];
        const isActive = theme === name;
        return (
          <button
            key={name}
            type="button"
            title={THEME_LABELS[name]}
            aria-label={THEME_LABELS[name]}
            aria-pressed={isActive}
            onClick={() => setTheme(name)}
            className={cn(
              'flex min-h-11 min-w-11 items-center justify-center rounded-2xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
              isActive ? 'bg-ink text-page' : 'text-ink-soft hover:text-ink'
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
