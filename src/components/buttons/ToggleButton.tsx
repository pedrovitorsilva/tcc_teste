'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ToggleButtonProps {
  pressed: boolean;
  onChange: (pressed: boolean) => void;
  icon: ReactNode;
  label: string;
  className?: string;
}

/** Botão circular de estado on/off. `label` alimenta aria-label e title —
 * calcule o texto contextual (ex.: "Edificações 3D ativas — desativar") no
 * chamador. */
export function ToggleButton({ pressed, onChange, icon, label, className }: ToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!pressed)}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-full border border-cv-border bg-panel text-ink-soft shadow-[0_4px_16px_rgba(0,0,0,.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        className
      )}
      style={
        pressed
          ? { background: 'var(--ink)', borderColor: 'var(--ink)', color: 'var(--page)' }
          : undefined
      }
    >
      {icon}
    </button>
  );
}
