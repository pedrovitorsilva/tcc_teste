import Link from 'next/link';
import { cn } from '@/lib/utils';

type Props = {
  text: string;
  href: string;
  variant?: 'primary' | 'ghost' | 'inverse';
  className?: string;
  target?: string;
};

export function CtaButton({ text, href, variant = 'primary', className, target }: Props) {
  return (
    <Link
      href={href}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-85',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        variant === 'primary' && 'bg-ink text-page',
        variant === 'ghost' && 'border border-cv-border text-ink',
        variant === 'inverse' && 'bg-page text-ink border border-cv-border',
        className,
      )}
    >
      {text}
    </Link>
  );
}
