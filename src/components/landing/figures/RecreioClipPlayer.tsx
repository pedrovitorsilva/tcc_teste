'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';

/** Duração da parte em CSS (s); tem de bater com `--t` de `.cv-clip` em globals.css. */
const T = 10.4;

/**
 * Toca o clipe do Recreio: começa quando a figura aparece na tela, recomeça do
 * zero ao voltar a ela, e o vídeo (um por tema) só é baixado depois disso.
 * Com movimento reduzido, mostra só o último quadro do vídeo.
 */
export function RecreioClipPlayer({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const telaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [emVista, setEmVista] = useState(false);
  const [carregar, setCarregar] = useState(false);
  const [reduzido, setReduzido] = useState(false);

  useEffect(() => {
    setReduzido(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const tela = telaRef.current;
    if (!tela) return;
    const observer = new IntersectionObserver(([entry]) => {
      setEmVista(entry.isIntersecting);
      if (entry.isIntersecting) setCarregar(true);
    }, { threshold: 0.4 });
    observer.observe(tela);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const tela = telaRef.current;
    const video = videoRef.current;
    if (!tela || !video || !emVista || reduzido) return;
    let timer = 0;
    const ciclo = () => {
      // Tirar e repor a classe (com reflow no meio) reinicia as animações CSS.
      tela.classList.remove('on');
      void tela.offsetWidth;
      video.pause();
      video.currentTime = 0;
      tela.classList.add('on');
      timer = window.setTimeout(() => void video.play().catch(() => {}), (T - 0.8) * 1000);
    };
    const aoTerminar = () => {
      timer = window.setTimeout(ciclo, 2000);
    };
    video.addEventListener('ended', aoTerminar);
    ciclo();
    return () => {
      window.clearTimeout(timer);
      video.removeEventListener('ended', aoTerminar);
      video.pause();
      tela.classList.remove('on');
    };
  }, [emVista, reduzido, theme]);

  const base = `/videos/recreio-${theme}`;
  return (
    <div ref={telaRef} className="cv-clip relative aspect-[390/844] w-full overflow-hidden rounded-[24px] bg-page shadow-[0_10px_40px_rgba(0,0,0,.18)]">
      <video
        ref={videoRef}
        src={carregar ? `${base}.mp4` : undefined}
        poster={carregar ? `${base}-${reduzido ? 'fim' : 'inicio'}.webp` : undefined}
        muted
        playsInline
        preload={carregar ? 'auto' : 'none'}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
