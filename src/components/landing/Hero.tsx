import { CtaButton } from './CtaButton';
import { MapMask } from './figures/MapMask';
import { H, LOTS, W } from './figures/geo';

type Cta = { text: string; href: string };

export function Hero({
  headline, subheadline, credibility, cta_primary, cta_secondary,
}: {
  headline: string;
  subheadline: string;
  credibility: string;
  cta_primary: Cta;
  cta_secondary: Cta;
}) {
  return (
    <section className="relative bg-page py-16 md:py-24">
      <div className="mx-auto max-w-240 px-4 md:px-6">
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
          <div>
            <p className="mb-6 inline-block rounded-full border border-cv-border bg-panel px-3 py-1 text-xs text-ink-soft">
              {credibility}
            </p>
            <h1 className="cv-title">{headline}</h1>
            <p className="cv-lead mt-6">{subheadline}</p>
            <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-start">
              <div className="flex flex-col items-center gap-2 md:items-start">
                <CtaButton {...cta_primary} />
                <span className="text-xs text-ink-soft">Grátis · sem cadastro · abre no navegador</span>
              </div>
              <CtaButton {...cta_secondary} variant="ghost" target="_blank" />
            </div>
            <p className="mt-8 text-sm uppercase tracking-wider text-ink-soft">
              24 bairros · 166 loteamentos · 664 setores censitários
            </p>
          </div>
          <div className="rounded-3xl border border-cv-border bg-panel p-6 shadow-sm">
            <MapMask svg_url="/svg/conquista.svg" color="var(--panel-2)" width={W} height={H} className="mx-auto w-full max-w-72">
              {LOTS.map((p, i) => (
                <polygon key={p} points={p} stroke="var(--ink-faint)" strokeWidth="1.5"
                  fill={i === 1 ? 'var(--uncertain)' : 'var(--loteamento)'} fillOpacity={i === 1 ? 0.9 : 0.25} />
              ))}
            </MapMask>
            <p className="mt-4 text-center text-sm text-ink-soft">
              Vitória da Conquista · subdivisões ilustrativas
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
