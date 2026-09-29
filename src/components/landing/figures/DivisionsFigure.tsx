import { Figure } from '../Figure';
import { LOTS, OUTLINE, SETOR_LINES, VB } from './geo';

const svgProps = { viewBox: VB, className: 'w-full rounded-lg', style: { background: 'var(--panel-2)' } };

export function DivisionsFigure() {
  return (
    <Figure
      aria-label="Mesma área em 3 níveis de granularidade: bairros, loteamentos e setores"
      figcaption="Mesma área da cidade, cada vez mais subdividida. (Ilustrativo)"
    >
      <div className="grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-3">
        <div className="flex w-full max-w-56 flex-col items-center gap-2">
          <svg {...svgProps}>
            <polygon points={OUTLINE} fill="var(--bairro)" fillOpacity="0.3" stroke="var(--bairro)" strokeWidth="2" />
          </svg>
          <span className="text-sm text-ink-soft">Bairros</span>
        </div>

        <div className="flex w-full max-w-56 flex-col items-center gap-2">
          <svg {...svgProps}>
            {LOTS.map((p) => (
              <polygon key={p} points={p} fill="var(--loteamento)" fillOpacity="0.3" stroke="var(--loteamento)" strokeWidth="1.5" />
            ))}
          </svg>
          <span className="text-sm text-ink-soft">Loteamentos</span>
        </div>

        <div className="flex w-full max-w-56 flex-col items-center gap-2">
          <svg {...svgProps}>
            <defs>
              <clipPath id="divisions-outline"><polygon points={OUTLINE} /></clipPath>
            </defs>
            <g clipPath="url(#divisions-outline)">
              {LOTS.map((p) => (
                <polygon key={p} points={p} fill="var(--setor)" fillOpacity="0.2" stroke="var(--setor)" strokeWidth="1" />
              ))}
              {SETOR_LINES.map(([x1, y1, x2, y2]) => (
                <line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--setor)" strokeWidth="1" />
              ))}
            </g>
          </svg>
          <span className="text-sm text-ink-soft">Setores</span>
        </div>
      </div>
    </Figure>
  );
}
