import type { BlocosCenso, Contagens } from '@/types/map';

/** Números do topo da ficha e da comparação entre áreas. `null` = sem dado (sigilo). */
export interface Resumo {
  pop: number | null;
  domicilios: number | null;
  /** Rendimento médio do responsável pelo domicílio (R$). */
  renda: number | null;
  /** Frações 0–1 dos domicílios. */
  esgotoRede: number | null;
  aguaRede: number | null;
  /** Fração 0–1 das pessoas de 15 anos ou mais. */
  alfabetizacao: number | null;
}

const total = (c: Contagens) => Object.values(c).reduce<number>((s, v) => s + (v ?? 0), 0);
const razao = (num: number, den: number) => (den > 0 ? num / den : null);

/**
 * Resume uma área ou a soma de várias (o município = todas as unidades).
 * Soma contagens antes de dividir: média de porcentagens daria peso igual a
 * bairros de tamanhos diferentes.
 */
export function resumir(areas: BlocosCenso[]): Resumo {
  let pop = 0, dom = 0, esgRede = 0, esgTot = 0, aguaRede = 0, aguaTot = 0;
  let alf = 0, alfTot = 0, rendaSoma = 0, rendaResp = 0;
  let temPop = false, temDom = false;

  for (const a of areas) {
    if (a.demografia.pop != null) { pop += a.demografia.pop; temPop = true; }
    if (a.domicilios.total != null) { dom += a.domicilios.total; temDom = true; }
    esgRede += a.saneamento.esgoto.rede_ou_fossa_ligada ?? 0;
    esgTot += total(a.saneamento.esgoto);
    aguaRede += a.saneamento.agua.rede_geral ?? 0;
    aguaTot += total(a.saneamento.agua);
    alf += a.alfabetizacao.alfabetizados_15_mais ?? 0;
    alfTot += (a.alfabetizacao.alfabetizados_15_mais ?? 0) + (a.alfabetizacao.nao_alfabetizados_15_mais ?? 0);
    // Média ponderada pelos responsáveis: é a média do conjunto, não das médias.
    const { rendimento_medio: media, responsaveis } = a.renda_responsavel;
    if (media != null && responsaveis) {
      rendaSoma += media * responsaveis;
      rendaResp += responsaveis;
    }
  }

  return {
    pop: temPop ? pop : null,
    domicilios: temDom ? dom : null,
    renda: razao(rendaSoma, rendaResp),
    esgotoRede: razao(esgRede, esgTot),
    aguaRede: razao(aguaRede, aguaTot),
    alfabetizacao: razao(alf, alfTot),
  };
}
