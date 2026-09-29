import { Figure } from '../Figure';
import { SECTOR_DOTS, SECTOR_LOTS, SECTOR_VB } from './geo';

export function RedistributionFigure() {
  return (
    <Figure
      aria-label="Um setor com dois loteamentos: o que tem mais endereços recebe a maior fatia da população do setor"
      figcaption="A população do setor é repartida entre os loteamentos pelo número de endereços de cada um. Mais pontos, fatia maior. (Ilustrativo)"
    >
      <svg viewBox={SECTOR_VB} className="mx-auto w-full max-w-lg">
        <rect x="10" y="10" width="300" height="140" fill="none" stroke="var(--setor)" strokeWidth="2" strokeDasharray="6 4" />
        <polygon points={SECTOR_LOTS.a} fill="var(--loteamento)" fillOpacity="0.2" stroke="var(--loteamento)" />
        <polygon points={SECTOR_LOTS.b} fill="var(--loteamento)" fillOpacity="0.4" stroke="var(--loteamento)" />
        {SECTOR_DOTS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" fill="var(--ink)" />)}
        <g fill="var(--ink)" fontSize="13" textAnchor="middle">
          <text x="75" y="185">Fatia menor</text>
          <text x="225" y="185">Fatia maior</text>
        </g>
      </svg>
    </Figure>
  );
}
