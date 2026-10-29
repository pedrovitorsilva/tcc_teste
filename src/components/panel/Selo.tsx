import { PROCEDENCIA, type Procedencia } from '@/config/procedencia';
import { cn } from '@/lib/utils';

/** Classes literais (o Tailwind só gera o que aparece escrito no código). */
const BORDA = { solid: 'border-solid', dashed: 'border-dashed', dotted: 'border-dotted' } as const;

/** Selo de procedência: borda (forma) + rótulo, para não depender só da cor. */
export function Selo({ tipo }: { tipo: Procedencia }) {
  const { rotulo, descricao, borda } = PROCEDENCIA[tipo];
  return (
    <span
      title={descricao}
      aria-label={`${rotulo}: ${descricao}`}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border border-current px-1.5 py-px align-middle text-[11px] font-normal leading-tight not-italic',
        BORDA[borda],
        tipo === 'oficial' ? 'text-ink-soft' : 'text-uncertain',
      )}
    >
      {rotulo}
    </span>
  );
}
