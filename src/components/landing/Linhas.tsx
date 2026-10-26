import type { ReactNode } from 'react';

/**
 * Linha de lista separada por fio — nome e explicação à esquerda, valor
 * opcional à direita (como o cardápio da referência). Usada em "Em números"
 * e "No mapa". A cor do fio e do texto secundário herda a da seção
 * (`currentColor` com opacidade), então funciona em fundo claro e escuro.
 */
export function Linha({ titulo, descricao, valor }: { titulo: string; descricao: string; valor?: string }) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 border-t border-current/20 py-6">
      <span className="font-(family-name:--font-display) text-[24px] font-semibold leading-tight">{titulo}</span>
      {valor && (
        <span className="font-(family-name:--font-display) text-[24px] font-semibold tabular-nums">{valor}</span>
      )}
      <span className="col-span-2 mt-1.5 max-w-[30rem] text-[15px] leading-[1.6] opacity-80">{descricao}</span>
    </li>
  );
}

/** Linha "rótulo | conteúdo" (como "Find us / Hours" da referência). Usada em "Os dados". */
export function LinhaInfo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-t border-cv-border py-6 md:grid-cols-[10rem_1fr] md:gap-8">
      <dt className="text-[12px] font-bold uppercase tracking-[0.18em] text-ink-soft md:pt-1">{rotulo}</dt>
      <dd className="max-w-[36rem] text-[16px] leading-[1.65]">{children}</dd>
    </div>
  );
}
