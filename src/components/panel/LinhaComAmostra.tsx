import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Amostra visual (selo, hachura, símbolo) numa coluna de largura fixa, centrada
 * na vertical com o texto ao lado. A mesma coluna na ficha e em "Como ler os
 * números" deixa as amostras alinhadas umas com as outras.
 */
export function LinhaComAmostra({
  amostra,
  children,
  className,
}: {
  amostra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {amostra && <span className="flex w-16 shrink-0 items-center justify-center">{amostra}</span>}
      <span className="cv-note-body min-w-0">{children}</span>
    </div>
  );
}
