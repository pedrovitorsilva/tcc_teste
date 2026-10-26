import { PALETA_TOPO } from './paleta';

/** Faixa fina acima do cabeçalho: de onde vêm os dados, antes de qualquer outra coisa. */
export function TopBar() {
  return (
    <p
      style={PALETA_TOPO}
      className="bg-ink px-5 py-2 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-page"
    >
      Dados do Censo 2022 do IBGE<span className="hidden sm:inline">, em Vitória da Conquista</span>
    </p>
  );
}
