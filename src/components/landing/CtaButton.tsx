import Link from 'next/link';
import { cn } from '@/lib/utils';

type Props = {
  text: string;
  href: string;
  /**
   * Pela superfície onde o botão está: `claro` sobre seção escura, `escuro`
   * sobre seção clara, `contorno` só com o fio na cor do texto da seção.
   */
  variant?: 'claro' | 'escuro' | 'contorno';
  className?: string;
  target?: string;
};

export function CtaButton({ text, href, variant = 'escuro', className, target }: Props) {
  return (
    <Link
      href={href}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-[2px] px-6 text-[13px] font-bold uppercase tracking-[0.14em] transition-opacity hover:opacity-85',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current',
        variant === 'claro' && 'bg-page text-ink',
        variant === 'escuro' && 'bg-ink text-page',
        variant === 'contorno' && 'border border-current',
        className,
      )}
    >
      {text}
    </Link>
  );
}
