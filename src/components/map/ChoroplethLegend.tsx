'use client';

import type { Choropleth } from '@/hooks/useChoropleth';

const NIVEL_ROTULO = { setor: 'por setor censitário', bairro: 'por bairro e distrito' } as const;

/**
 * Legenda do mapa de calor: faixas por quantil + "sem dado". Some sem
 * visualização ativa. `embedded`: no topo da ficha, sem flutuar sobre o mapa.
 */
export function ChoroplethLegend({ choropleth, embedded = false }: { choropleth: Choropleth | null; embedded?: boolean }) {
  if (!choropleth) return null;
  const { visualizacao, quebras, cores, semDado, temSemDado } = choropleth;
  const f = visualizacao.formato;

  const faixas = cores.map((cor, i) => {
    const rotulo =
      quebras.length === 0
        ? 'Todos'
        : i === 0
          ? `até ${f(quebras[0])}`
          : i === cores.length - 1
            ? `${f(quebras[i - 1])} ou mais`
            : `${f(quebras[i - 1])} – ${f(quebras[i])}`;
    return { cor, rotulo };
  });
  if (temSemDado) faixas.push({ cor: semDado, rotulo: 'Sem dado (sigilo IBGE)' });

  return (
    <div
      className={
        embedded
          ? 'mb-4 rounded-[10px] border border-cv-border bg-panel p-3'
          : 'pointer-events-auto w-60 rounded-[10px] border border-cv-border bg-panel p-3 shadow-[0_4px_16px_rgba(0,0,0,.08)]'
      }
    >
      <p className="text-[13px] font-medium text-ink">{visualizacao.rotulo}</p>
      <p className="mb-2 text-[12px] text-ink-soft">{NIVEL_ROTULO[visualizacao.nivel]}</p>
      <ul className="space-y-1">
        {/* Chave por posição: duas faixas podem formatar igual (ex.: R$ arredondado). */}
        {faixas.map(({ cor, rotulo }, i) => (
          <li key={i} className="flex items-center gap-2 text-[12px] text-ink">
            <span aria-hidden="true" className="h-3 w-5 shrink-0 rounded-[2px]" style={{ background: cor }} />
            {rotulo}
          </li>
        ))}
      </ul>
      {visualizacao.nota && <p className="mt-2 text-[11px] text-ink-soft">{visualizacao.nota}</p>}
    </div>
  );
}
