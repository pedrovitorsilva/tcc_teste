'use client';

import type { LayerToggles } from '@/types/map';
/*
export interface LayerToggles {
  bairro: boolean;
  loteamento: boolean;
  setor: boolean;
}
*/

const ITEMS: { key: keyof LayerToggles; label: string }[] = [
  { key: 'bairro', label: 'Bairros' },
  { key: 'loteamento', label: 'Loteamentos' },
  { key: 'setor', label: 'Setores censitários' },
];

/**
 *
 * Retorna popover com os polígonos ativos (bairro, loteamento, setor).
 *
 * Permite que o usuário selecione quais contornos estarão visíveis.
 */
export function LayerControls({
  toggles,
  onChange,
}: {
  toggles: LayerToggles;
  onChange: (toggles: LayerToggles) => void;
}) {
  return (
    <div className="flex gap-3.5 rounded-[10px] border border-cv-border bg-panel px-3 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,.08)]">
      {ITEMS.map(({ key, label }) => {
        const checked = toggles[key];
        return (
          <label
            key={key}
            className="flex min-h-11 cursor-pointer items-center gap-1.5 text-[12.5px] text-ink-soft select-none"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onChange({ ...toggles, [key]: !checked })}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border-[1.4px] border-ink-soft text-[10px] leading-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
              style={
                checked
                  ? { background: 'var(--ink)', borderColor: 'var(--ink)', color: 'var(--page)' }
                  : undefined
              }
            >
              {checked ? '✓' : ''}
            </span>
            {label}
          </label>
        );
      })}
    </div>
  );
}
