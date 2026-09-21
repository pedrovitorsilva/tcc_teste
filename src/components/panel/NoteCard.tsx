import type { ReactNode } from 'react';

/** Cartão de nota com borda no tom "incerto", compartilhado por BuildingsNote e CartographerNote. */
export function NoteCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`rounded-r-lg border-l-[3px] ${className ?? ''}`}
      style={{ borderLeftColor: 'var(--uncertain)', background: 'var(--panel-2)' }}
    >
      {children}
    </div>
  );
}
