import { Figure } from '../Figure';
import { BAIRROS, H, LOTS, SETOR_H, SETOR_V, VB, W } from './geo';

export function DivisionsFigure() {
  return (
    <Figure
      aria-label="Três divisões ilustrativas da mesma área: bairros, loteamentos e setores"
      figcaption="Mesma área da cidade, três formas diferentes de dividi-la. (Ilustrativo)"
    >
      <div className="grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-3">
        {/* Bairros */}
        <div className="flex w-full max-w-56 flex-col items-center gap-2">
          <svg viewBox={VB} className="size-full w-full rounded-lg" style={{ background: 'var(--panel-2)' }}>
            {BAIRROS.map((p) => <polygon key={p} points={p} fill="var(--bairro)" fillOpacity="0.3" stroke="var(--bairro)" strokeWidth="2" />)}
          </svg>
          <span className="text-sm text-ink-soft">Bairros</span>
        </div>

        {/* Loteamentos */}
        <div className="flex w-full max-w-56 flex-col items-center gap-2">
          <svg viewBox={VB} className="size-full w-full rounded-lg" style={{ background: 'var(--panel-2)' }}>
            {LOTS.map((p) => <polygon key={p} points={p} fill="var(--loteamento)" fillOpacity="0.3" stroke="var(--loteamento)" strokeWidth="1.5" />)}
          </svg>
          <span className="text-sm text-ink-soft">Loteamentos</span>
        </div>

        {/* Setores */}
        <div className="flex w-full max-w-56 flex-col items-center gap-2">
          <svg viewBox={VB} className="size-full w-full rounded-lg" style={{ background: 'var(--panel-2)' }}>
            {SETOR_V.map((x) => <line key={x} x1={x} x2={x} y1="0" y2={H} stroke="var(--setor)" strokeWidth="2" />)}
            {SETOR_H.map((y) => <line key={y} y1={y} y2={y} x1="0" x2={W} stroke="var(--setor)" strokeWidth="2" />)}
          </svg>
          <span className="text-sm text-ink-soft">Setores</span>
        </div>
      </div>
    </Figure>
  );
}
