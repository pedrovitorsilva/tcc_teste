import { CtaButton } from '../CtaButton';

export function CtaSection() {
  return (
    <section className="mx-auto flex max-w-240 flex-col items-center gap-6 px-6 py-16 text-center">
      <h2 className="cv-h2">Pronto para explorar?</h2>
      <CtaButton text="Explorar o mapa" href="/map" />
    </section>
  );
}
