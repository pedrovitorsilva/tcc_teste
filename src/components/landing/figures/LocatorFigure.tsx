import { Figure } from '../Figure';
import { MapImage } from './MapImage';

export function LocatorFigure() {
  return (
    <Figure aria-label="Mapas em sequência: Brasil, Bahia e Vitória da Conquista">
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-end md:justify-center">
        <div className="flex w-40 flex-col items-center gap-2 md:w-52">
          <div className="w-full aspect-[1967/1935] rounded-lg bg-setor opacity-30" />
          <span className="text-sm text-ink-soft">Brasil</span>
        </div>
        <span aria-hidden className="text-2xl text-ink-faint md:mb-16">
          <span className="md:hidden">↓</span>
          <span className="hidden md:inline">→</span>
        </span>
        <div className="flex w-40 flex-col items-center gap-2 md:w-52">
          <div className="w-full aspect-[694/704] rounded-lg bg-loteamento opacity-30" />
          <span className="text-sm text-ink-soft">Bahia</span>
        </div>
        <span aria-hidden className="text-2xl text-ink-faint md:mb-16">
          <span className="md:hidden">↓</span>
          <span className="hidden md:inline">→</span>
        </span>
        <div className="flex w-40 flex-col items-center gap-2 md:w-52">
          <MapImage className="w-full rounded-lg" />
          <span className="text-sm text-ink-soft">Vitória da Conquista</span>
        </div>
      </div>
    </Figure>
  );
}
