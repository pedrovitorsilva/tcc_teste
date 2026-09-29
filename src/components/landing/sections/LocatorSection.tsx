import { LocatorFigure } from '../figures/LocatorFigure';

export function LocatorSection() {
  return (
    <section className="mx-auto w-full max-w-240 px-6 py-16">
      <p className="cv-kicker uppercase">Onde estamos</p>
      <h2 className="cv-h2 mt-4">Brasil, Bahia, Vitória da Conquista</h2>
      <LocatorFigure />
    </section>
  );
}
