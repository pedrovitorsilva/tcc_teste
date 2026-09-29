import { CtaButton } from './CtaButton';
import { MapMask } from './figures/MapMask';

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
    <section className="relative flex min-h-screen items-center overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -right-16 top-1/2 w-[70vw] max-w-130 -translate-y-1/2 opacity-15">
        <MapMask svg_url="/svg/conquista.svg" color="var(--bairro)" width={288} height={359.5} />
      </div>
      <div className="relative mx-auto w-full max-w-240 px-6 py-20">
        <p className="mb-6 inline-block rounded-full border border-cv-border bg-panel px-3 py-1 text-xs text-ink-soft">
          {credibility}
        </p>
        <h1 className="cv-title max-w-2xl">{headline}</h1>
        <p className="cv-lead mt-6 max-w-xl">{subheadline}</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <CtaButton {...cta_primary} />
          <CtaButton {...cta_secondary} variant="ghost" target="_blank" />
        </div>
      </div>
    </section>
  );
}
