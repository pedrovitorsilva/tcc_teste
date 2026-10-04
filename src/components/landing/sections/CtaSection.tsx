import { CtaButton } from '../CtaButton';

export function CtaSection({ title, microcopy }: { title: string; microcopy: string }) {
  return (
    <section className="mx-auto my-6 w-full max-w-240 rounded-3xl border border-cv-border bg-ink px-4 py-12 text-center text-page shadow-sm md:my-10 md:px-6 md:py-16">
      <h2 className="cv-h2 mb-6">{title}</h2>
      <CtaButton text="Explorar o mapa" href="/map" variant="inverse" />
      <p className="mt-4 text-sm opacity-90">{microcopy}</p>
    </section>
  );
}
