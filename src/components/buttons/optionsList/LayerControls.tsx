'use client';

import type { ReactNode } from 'react';
import type { LayerToggles } from '@/types/map';

const LIMITES: { key: keyof LayerToggles; label: string }[] = [
  { key: 'bairro', label: 'Bairros' },
  { key: 'loteamento', label: 'Loteamentos' },
  { key: 'setor', label: 'Setores censitários' },
];

/** Camada 3D: o estado vive no MapView; aqui só se liga e desliga. */
export interface Camada3D {
  key: string;
  label: string;
  icon: ReactNode;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

function Caixa({
  checked,
  onChange,
  icon,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-2 text-[13px] text-ink select-none hover:bg-panel-2">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border-[1.4px] border-ink-soft text-[10px] leading-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
        style={checked ? { background: 'var(--ink)', borderColor: 'var(--ink)', color: 'var(--page)' } : undefined}
      >
        {checked ? '✓' : ''}
      </span>
      {icon && <span className="text-ink-soft">{icon}</span>}
      {children}
    </label>
  );
}

/**
 * Painel único de camadas, em dois grupos: os limites (o que se navega) e o 3D
 * (o que ambienta). Agrupar por categoria tira 5 botões soltos de cima do mapa.
 */
export function LayerControls({
  toggles,
  onChange,
  camadas3D,
}: {
  toggles: LayerToggles;
  onChange: (toggles: LayerToggles) => void;
  camadas3D: Camada3D[];
}) {
  return (
    <div className="w-60 rounded-[10px] border border-cv-border bg-panel p-2 shadow-[0_4px_16px_rgba(0,0,0,.08)]">
      <fieldset>
        <legend className="cv-sec-title px-2 pt-1 pb-0.5 text-[12px]">Limites</legend>
        {LIMITES.map(({ key, label }) => (
          <Caixa key={key} checked={toggles[key]} onChange={() => onChange({ ...toggles, [key]: !toggles[key] })}>
            {label}
          </Caixa>
        ))}
      </fieldset>
      <fieldset className="mt-1 border-t border-cv-border-soft pt-1">
        <legend className="cv-sec-title px-2 pt-1 pb-0.5 text-[12px]">3D</legend>
        {camadas3D.map(({ key, label, icon, enabled, onChange: alterna }) => (
          <Caixa key={key} checked={enabled} onChange={() => alterna(!enabled)} icon={icon}>
            {label}
          </Caixa>
        ))}
      </fieldset>
    </div>
  );
}
