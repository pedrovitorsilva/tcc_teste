'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AtlasVdcLogo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { CtaButton } from './CtaButton';
import { PALETA_TOPO } from './paleta';
import { CONTAINER } from './Tipografia';

const LINKS = [
  { href: '#problema', text: 'O problema' },
  { href: '#como-funciona', text: 'Como funciona' },
  { href: '#dados', text: 'Os dados' },
];

/**
 * Cabeçalho fixo. Sobre a foto do topo fica transparente (paleta escura);
 * depois dela vira sólido com as cores do tema. O botão do mapa fica sempre
 * à vista, também no celular.
 */
export function LandingHeader({ heroId }: { heroId: string }) {
  const [sobreFoto, setSobreFoto] = useState(true);

  useEffect(() => {
    const hero = document.getElementById(heroId);
    if (!hero) return;
    // Sólido assim que a foto sai de baixo do cabeçalho (64 px).
    const observer = new IntersectionObserver(([entry]) => setSobreFoto(entry.isIntersecting), {
      rootMargin: '-64px 0px 0px 0px',
    });
    observer.observe(hero);
    return () => observer.disconnect();
  }, [heroId]);

  return (
    <header
      style={sobreFoto ? PALETA_TOPO : undefined}
      className={cn(
        'sticky top-0 z-40 -mb-16 h-16 text-page transition-colors duration-300',
        !sobreFoto && 'border-b border-cv-border bg-page/95 text-ink backdrop-blur',
      )}
    >
      <div className={cn(CONTAINER, 'flex h-full items-center justify-between gap-6')}>
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-(family-name:--font-display) text-[22px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
        >
          <AtlasVdcLogo className="size-7 shrink-0" />
          AtlasVDC
        </Link>
        <nav aria-label="Seções da página" className="hidden items-center gap-8 md:flex">
          {LINKS.map(({ href, text }) => (
            <a
              key={href}
              href={href}
              className="text-[13px] font-bold uppercase tracking-[0.14em] opacity-85 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
            >
              {text}
            </a>
          ))}
        </nav>
        <CtaButton text="Abrir o mapa" href="/map" variant={sobreFoto ? 'contorno' : 'escuro'} className="px-4 md:px-5" />
      </div>
    </header>
  );
}
