'use client';

import { LabelIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

/**
 * Alterna onde o nome ativo aparece: centralizado na viewport (padrão) ou dentro
 * da geometria. Estado ligado usa o mesmo preenchimento do checkbox marcado.
 */
export function TitlePlacementToggleButton({
  inPolygon,
  onChange,
  className,
}: {
  inPolygon: boolean;
  onChange: (inPolygon: boolean) => void;
  className?: string;
}) {
  const label = inPolygon
    ? 'Nome dentro do polígono — voltar ao título centralizado'
    : 'Nome centralizado — mover para dentro do polígono';

  return (
    <button
      type="button"
      onClick={() => onChange(!inPolygon)}
      aria-label={label}
      aria-pressed={inPolygon}
      title={label}
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-full border border-cv-border bg-panel text-ink-soft shadow-[0_4px_16px_rgba(0,0,0,.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        className
      )}
      style={
        inPolygon
          ? { background: 'var(--ink)', borderColor: 'var(--ink)', color: 'var(--page)' }
          : undefined
      }
    >
      <LabelIcon className="h-4 w-4" />
    </button>
  );
}
