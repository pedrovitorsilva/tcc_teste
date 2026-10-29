"use client";

import type { ReactNode } from "react";
import { HachuraAmostra } from "@/components/panel/HachuraAmostra";
import { Selo } from "@/components/panel/Selo";
import { Secao } from "@/components/panel/FichaSecoes";
import { useTheme } from "@/components/theme/ThemeProvider";
import { fmt } from "@/config/indicadores";
import { PROCEDENCIA, type Procedencia } from "@/config/procedencia";
import { COR_SEM_DADO } from "@/config/visualizacoes";

/** Uma linha da legenda: amostra visual à esquerda, explicação à direita. */
function Item({ amostra, children }: { amostra: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <dt className="flex w-16 shrink-0 justify-center pt-0.5">{amostra}</dt>
      <dd className="cv-note-body">{children}</dd>
    </div>
  );
}

const SIMBOLO = "cv-rec-value text-[14.5px]";

/**
 * Todos os sinais de procedência e incerteza da ficha e do mapa num lugar só,
 * cada um com a mesma amostra visual que aparece no uso.
 */
export function ComoLer({ erroTipico }: { erroTipico?: number | null }) {
  const { theme } = useTheme();
  const semDado = COR_SEM_DADO[theme === "dark" ? "escuro" : "claro"];
  return (
    <Secao titulo="Como ler os números">
      <dl className="pt-1">
        {(Object.keys(PROCEDENCIA) as Procedencia[]).map((tipo) => (
          <Item key={tipo} amostra={<Selo tipo={tipo} />}>
            {PROCEDENCIA[tipo].descricao}
          </Item>
        ))}
        <Item amostra={<span className={SIMBOLO}>≈</span>}>
          Valor estimado, não contado.
          {erroTipico != null && ` Metade dos testes do método errou menos de ±${fmt.pct(erroTipico)}.`}
        </Item>
        <Item amostra={<span className={SIMBOLO}>—</span>}>
          Sem valor: sigilo do IBGE (área com poucos domicílios) ou amostra com menos de 30 respostas.
        </Item>
        <Item amostra={<HachuraAmostra />}>
          Loteamento com limites aproximados, sem confirmação em cadastro oficial.
        </Item>
        <Item amostra={<HachuraAmostra espelhada />}>Parte do bairro fora de qualquer loteamento.</Item>
        <Item amostra={<span aria-hidden className="inline-block h-3 w-5 rounded-[2px]" style={{ background: semDado }} />}>
          No mapa de calor: área sem dado, nunca zero.
        </Item>
      </dl>
    </Secao>
  );
}
