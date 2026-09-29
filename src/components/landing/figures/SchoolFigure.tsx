import { Figure } from '../Figure';
import { MapMask } from './MapMask';
import { H, LOTS, VB, W } from './geo';

export function SchoolFigure() {
  return (
    <Figure
      aria-label="Comparação: demanda média por bairro contra demanda por loteamento, com um lote de alta demanda destacado"
      figcaption="Na média do bairro tudo parece igual; por loteamento, um lote concentra a demanda. (Ilustrativo)"
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
        <div className="flex flex-col items-center gap-2">
          <MapMask svg_url="/svg/conquista.svg" color="var(--ink-faint)" width={W} height={H} className="w-44 opacity-50" />
          <span className="text-sm text-ink-soft">Demanda média</span>
        </div>
        <span aria-hidden className="text-lg font-semibold text-ink-soft">vs.</span>
        <div className="flex flex-col items-center gap-2">
          <MapMask svg_url="/svg/conquista.svg" color="var(--panel-2)" width={W} height={H} className="w-44">
            <svg viewBox={VB} className="size-full">
              {LOTS.map((p, i) => (
                <polygon key={p} points={p} stroke="var(--ink-faint)" strokeWidth="1.5"
                  fill={i === 1 ? 'var(--uncertain)' : 'var(--loteamento)'} fillOpacity={i === 1 ? 0.9 : 0.25} />
              ))}
            </svg>
          </MapMask>
          <span className="text-sm text-ink-soft">Demanda por loteamento</span>
        </div>
      </div>
    </Figure>
  );
}
