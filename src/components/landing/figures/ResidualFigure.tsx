import { Figure } from '../Figure';
import { SECTOR_LOTS, SECTOR_VB } from './geo';

export function ResidualFigure() {
  return (
    <Figure
      aria-label="Setor com loteamentos e uma área hachurada que representa a população não coberta"
      figcaption="Essa sobra fica visível na plataforma — não um erro escondido na média. (Ilustrativo)"
    >
      <svg viewBox={SECTOR_VB} className="mx-auto w-full max-w-lg">
        <pattern id="hatch-residual" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="var(--uncertain)" strokeWidth="2" />
        </pattern>
        <rect x="10" y="10" width="300" height="140" fill="none" stroke="var(--setor)" strokeWidth="2" strokeDasharray="6 4" />
        <polygon points={SECTOR_LOTS.a} fill="var(--loteamento)" fillOpacity="0.3" stroke="var(--loteamento)" />
        <polygon points={SECTOR_LOTS.b} fill="var(--loteamento)" fillOpacity="0.3" stroke="var(--loteamento)" />
        <polygon points={SECTOR_LOTS.c} fill="url(#hatch-residual)" stroke="var(--uncertain)" />
        <g fill="var(--ink)" fontSize="13" textAnchor="middle">
          <text x="75" y="185">Loteamentos</text>
          <text x="225" y="185">Não coberto (sobra)</text>
        </g>
      </svg>
    </Figure>
  );
}
