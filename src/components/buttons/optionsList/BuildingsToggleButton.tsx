'use client';

import { BuildingIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

export function BuildingsToggleButton({
  enabled,
  onChange,
  className,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
}) {
  const label = enabled
    ? 'Edificações 3D ativas — desativar'
    : 'Edificações 3D desativadas — ativar';

  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      aria-label={label}
      aria-pressed={enabled}
      title={label}
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-full border border-cv-border bg-panel text-ink-soft shadow-[0_4px_16px_rgba(0,0,0,.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        className
      )}
      style={
        enabled
          ? { background: 'var(--ink)', borderColor: 'var(--ink)', color: 'var(--page)' }
          : undefined
      }
    >
      <BuildingIcon className="h-4 w-4" />
    </button>
  );
}
