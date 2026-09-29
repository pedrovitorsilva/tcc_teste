import { Figure } from '../Figure';
import { MapMask } from './MapMask';

const ITEMS = [
  { url: '/svg/Brasil.svg', w: 1967, h: 1935, color: 'var(--setor)', label: 'Brasil' },
  { url: '/svg/Bahia.svg', w: 694, h: 704, color: 'var(--loteamento)', label: 'Bahia' },
  { url: '/svg/conquista.svg', w: 288, h: 360, color: 'var(--bairro)', label: 'Vitória da Conquista' },
];

export function LocatorFigure() {
  return (
    <Figure aria-label="Mapas em sequência: Brasil, Bahia e Vitória da Conquista">
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-end md:justify-center">
        {ITEMS.map((it, i) => (
          <div key={it.label} className="contents">
            {i > 0 && (
              <span aria-hidden className="text-2xl text-ink-faint md:mb-16">
                <span className="md:hidden">↓</span>
                <span className="hidden md:inline">→</span>
              </span>
            )}
            <div className="flex w-40 flex-col items-center gap-2 md:w-52">
              <MapMask svg_url={it.url} color={it.color} width={it.w} height={it.h} className="w-full" />
              <span className="text-sm text-ink-soft">{it.label}</span>
            </div>
          </div>
        ))}
      </div>
    </Figure>
  );
}
