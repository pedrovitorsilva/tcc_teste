import Image from 'next/image';
import Link from 'next/link';
import { CtaButton } from './CtaButton';
import { PALETA_TOPO } from './paleta';
import { CONTAINER, Texto, Titulo } from './Tipografia';
import fotoMapa from '../../../public/images/landing/mapa-tablet.jpg';

/** Topo: foto de fundo, título, chamada principal. Sempre escuro (ver `PALETA_TOPO`). */
export function Hero({ id }: { id: string }) {
  return (
    <section id={id} style={PALETA_TOPO} className="relative isolate flex min-h-[88svh] items-end bg-ink text-page">
      <Image
        src={fotoMapa}
        alt=""
        fill
        priority
        sizes="100vw"
        placeholder="blur"
        className="-z-20 object-cover object-[70%_center]"
      />
      {/* Véu: escurece só onde está o texto (à esquerda); no celular o texto cobre a foto toda. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-ink/80 md:bg-transparent md:bg-[linear-gradient(90deg,var(--ink)_0%,color-mix(in_srgb,var(--ink)_88%,transparent)_38%,color-mix(in_srgb,var(--ink)_25%,transparent)_75%,transparent_100%)]"
      />

      <div className={`${CONTAINER} pb-16 pt-32 md:pb-24 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700`}>
        <p className="flex items-center gap-3 text-[13px] font-bold tracking-[0.06em] text-ink-soft">
          <span aria-hidden="true" className="h-px w-8 bg-current" />
          Vitória da Conquista, Bahia
        </p>
        <Titulo as="h1" size="hero" linha1="Veja a sua cidade" linha2="loteamento por loteamento."
          className="mt-5" />
        <Texto className="mt-6 text-[18px]">
          Veja dados compilados do IBGE e diversas outras fontes, com recortes
          específicos para o loteamento onde você mora.
        </Texto>
        <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
          <CtaButton text="Abrir o mapa" href="/map" variant="claro" />
          <Link
            href="/api/projeto"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[15px] underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
          >
            Ler Artigo (PDF)
          </Link>
        </div>
        <p className="mt-4 text-[14px] text-ink-soft">Grátis, sem cadastro, abre no navegador.</p>
      </div>
    </section>
  );
}
