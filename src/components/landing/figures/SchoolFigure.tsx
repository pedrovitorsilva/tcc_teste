import { Figure } from '../Figure';
import { LOTS, VB } from './geo';

export function SchoolFigure() {
  return (
    <Figure
      aria-label="Comparação: demanda média por bairro contra demanda por loteamento, com um lote de alta demanda destacado"
      figcaption="Na média do bairro tudo parece igual; por loteamento, um lote concentra a demanda. (Ilustrativo)"
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
        {/* Demanda média - todos os lotes iguais */}
        <div className="flex flex-col items-center gap-2">
          <svg viewBox={VB} className="w-44 rounded-lg" style={{ background: 'var(--panel-2)', opacity: 0.5 }}>
            {LOTS.map((p) => (
              <polygon key={p} points={p} stroke="var(--ink-faint)" strokeWidth="1.5"
                fill="var(--loteamento)" fillOpacity="0.25" />
            ))}
          </svg>
          <span className="text-sm text-ink-soft">Demanda média</span>
        </div>

        <span aria-hidden className="text-lg font-semibold text-ink-soft">vs.</span>

        {/* Demanda por loteamento */}
        <div className="flex flex-col items-center gap-2">
          <svg viewBox={VB} className="w-44 rounded-lg" style={{ background: 'var(--panel-2)' }}>
            {LOTS.map((p, i) => (
              <polygon key={p} points={p} stroke="var(--ink-faint)" strokeWidth="1.5"
                fill={i === 1 ? 'var(--uncertain)' : 'var(--loteamento)'} fillOpacity={i === 1 ? 0.9 : 0.25} />
            ))}
          </svg>
          <span className="text-sm text-ink-soft">Demanda por loteamento</span>
        </div>
      </div>
    </Figure>
  );
}
