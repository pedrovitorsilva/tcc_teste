"use client";

import { fmt } from "@/config/indicadores";
import type { Resumo } from "@/lib/resumo";

/**
 * Topo da ficha: o que se lê sem abrir nenhuma seção. Números-chave e a mesma
 * medida em áreas de referência (bairro pai, município), para o valor ter escala.
 * Barras em CSS: são poucas e estáticas, não justificam biblioteca de gráficos.
 */

interface Kpi {
  rotulo: string;
  valor: string;
}

export function NumerosChave({ itens }: { itens: Kpi[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      {itens.map(({ rotulo, valor }) => (
        <div key={rotulo} className="min-w-0">
          <dt className="cv-kicker not-italic">{rotulo}</dt>
          <dd className="cv-kpi">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface Serie {
  rotulo: string;
  resumo: Resumo;
  /** Variável CSS do design system (ex.: `var(--loteamento)`). */
  cor: string;
  /** Só contorno: marca a série de referência (município) pela forma, não só por cor —
   * as cores das três séries ficam a 1,2–2,3:1 entre si. */
  referencia?: boolean;
}

const COMPARACOES: {
  chave: keyof Resumo;
  titulo: string;
  formato: (v: number | null) => string;
  /** `pct`: barra sobre 100%; `max`: sobre o maior valor da comparação. */
  escala: "pct" | "max";
}[] = [
  { chave: "renda", titulo: "Rendimento médio do responsável", formato: fmt.brl, escala: "max" },
  { chave: "esgotoRede", titulo: "Esgoto ligado à rede", formato: fmt.pct, escala: "pct" },
  { chave: "aguaRede", titulo: "Água da rede geral", formato: fmt.pct, escala: "pct" },
  { chave: "alfabetizacao", titulo: "Alfabetização (15 anos ou mais)", formato: fmt.pct, escala: "pct" },
];

export function Comparacao({ series }: { series: Serie[] }) {
  return (
    <div className="mt-5 space-y-4">
      {COMPARACOES.map(({ chave, titulo, formato, escala }) => {
        const valores = series.map((s) => s.resumo[chave]);
        const teto = escala === "pct" ? 1 : Math.max(0, ...valores.map((v) => v ?? 0));
        return (
          <div key={chave}>
            <div className="mb-1.5 text-[13px] text-ink">{titulo}</div>
            <div className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-x-2.5 gap-y-1.5">
              {series.map((s, i) => {
                const v = valores[i];
                return (
                  <div key={s.rotulo} className="contents">
                    <span className="truncate text-[12.5px] text-ink-soft" title={s.rotulo}>
                      {s.rotulo}
                    </span>
                    <span aria-hidden className="h-2 overflow-hidden rounded-full bg-panel-2">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${v == null || !teto ? 0 : Math.min(100, (v / teto) * 100)}%`,
                          // Referência em contorno: hachura já significa "incerto" no mapa (tema antigo).
                          ...(s.referencia ? { boxShadow: `inset 0 0 0 1.5px ${s.cor}` } : { background: s.cor }),
                        }}
                      />
                    </span>
                    <span className="text-right text-[12.5px] font-medium tabular-nums">{formato(v)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
