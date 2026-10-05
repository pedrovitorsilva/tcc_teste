'use client';

import type { FloatingTitleState } from '@/types/map';

/** Nome da área sob o cursor (ou na prévia da busca). Fundo de painel: sem ele,
 * o texto fica por cima das vias e quarteirões e some. */
export function FloatingTitle({ state }: { state: FloatingTitleState | null }) {
  return (
    <div
      className="pointer-events-none min-w-0 flex-1 transition-opacity duration-200"
      style={{ opacity: state ? 1 : 0 }}
    >
      {state && (
        <div className="inline-flex max-w-full flex-col rounded-[14px] border border-cv-border bg-panel px-3.5 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,.08)]">
          {state.crumb && <div className="cv-crumb">{state.crumb}</div>}
          <div className="truncate text-[15px] font-semibold text-ink">{state.main}</div>
        </div>
      )}
    </div>
  );
}
