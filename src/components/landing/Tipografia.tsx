import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Largura e respiro lateral de todas as seções. */
export const CONTAINER = 'mx-auto w-full max-w-[1120px] px-5 md:px-10';

/**
 * Título em duas linhas, a segunda inteira em itálico — o ritmo da página.
 * `size="hero"` só no topo; o resto usa o tamanho de seção.
 */
export function Titulo({
  linha1,
  linha2,
  as: Tag = 'h2',
  size = 'secao',
  className,
}: {
  linha1: string;
  linha2: string;
  as?: 'h1' | 'h2';
  size?: 'hero' | 'secao';
  className?: string;
}) {
  return (
    <Tag
      className={cn(
        'font-(family-name:--font-display) font-semibold tracking-[-0.01em]',
        size === 'hero' ? 'text-[clamp(44px,6.4vw,80px)] leading-[0.98]' : 'text-[clamp(34px,4.6vw,40px)] leading-[1.02]',
        className,
      )}
    >
      <span className="block">{linha1}</span>
      <span className="block italic">{linha2}</span>
    </Tag>
  );
}

/** Rótulo curto de seção (caixa-alta espaçada, como na referência). */
export function Rotulo({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-[12px] font-bold uppercase tracking-[0.18em]', className)}>{children}</p>;
}

/** Parágrafo de leitura: ≤ ~65 caracteres por linha. */
export function Texto({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('max-w-[34rem] text-[17px] leading-[1.65]', className)}>{children}</p>;
}
