/**
 * Visualizações do mapa (botão "Visualizações"). Seleção única no menu inteiro:
 * no máximo uma ativa, de qualquer grupo.
 *
 * Mapa de calor = coroplético: cada área pintada pelo valor dela. Só taxas e
 * densidades — contagem absoluta faria área grande parecer "mais".
 */
import { fmt, SANEAMENTO } from '@/config/indicadores';

type Props = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Cor do valor máximo, por tema (vintage usa `claro`). A rampa parte da cor
 * base do mapa (`--map-land`) até ela: como o terreno é claro no claro/vintage
 * e escuro no escuro, menor→maior sai claro→escuro e escuro→claro (o valor
 * alto "acende") sem regra extra.
 */
export interface Matiz {
  claro: string;
  escuro: string;
}

export const MATIZES = {
  /** Densidade: vermelho/laranja. */
  calor: { claro: '#b3261e', escuro: '#ffb36b' },
  /** Renda: verde. */
  renda: { claro: '#1b5e20', escuro: '#8fe3a1' },
  /** Carência (quanto mais, pior): vermelho. */
  carencia: { claro: '#8f1d1d', escuro: '#ff8a80' },
} satisfies Record<string, Matiz>;

/** Onde a 1ª faixa começa no caminho base→máximo: perto do terreno, mas ainda distinguível dele. */
export const RAMPA_INICIO = 0.1;

/** Sigilo do IBGE / sem dado: cinza neutro, nunca zero. */
export const COR_SEM_DADO = { claro: '#d9d7d2', escuro: '#3a3a38' };

/** Opacidade do preenchimento — o basemap (vias) ainda aparece por baixo. */
export const CHOROPLETH_OPACITY = 0.8;
export const CHOROPLETH_CLASSES = 5;

export type NivelVisualizacao = 'setor' | 'bairro';

export interface Visualizacao {
  id: string;
  rotulo: string;
  /** Setor por padrão; bairro onde o setor tem sigilo demais. */
  nivel: NivelVisualizacao;
  matiz: Matiz;
  valor: (p: Props) => number | null;
  formato: (v: number) => string;
  /** Nota da legenda (fonte, ressalva). */
  nota?: string;
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Categorias do bloco `saneamento.esgoto` — as mesmas de `SANEAMENTO.esgoto` na ficha. */
const ESGOTO_CATEGORIAS = Object.keys(SANEAMENTO.esgoto.itens);

export const GRUPOS_VISUALIZACAO: { titulo: string; opcoes: Visualizacao[] }[] = [
  {
    titulo: 'Mapa de calor',
    opcoes: [
      {
        id: 'densidade',
        rotulo: 'Densidade demográfica',
        nivel: 'setor',
        matiz: MATIZES.calor,
        // Área domiciliada (onde há casas); setor rural não tem — cai na área total.
        valor: (p) => {
          const pop = num(p.demografia?.pop);
          const area = num(p.area_domiciliada_km2) ?? num(p.area_km2);
          return pop != null && area ? pop / area : null;
        },
        formato: (v) => `${fmt.int(v)} hab/km²`,
      },
      {
        id: 'renda',
        rotulo: 'Renda média do responsável',
        nivel: 'setor',
        matiz: MATIZES.renda,
        valor: (p) => num(p.renda_responsavel?.rendimento_medio),
        formato: (v) => fmt.brl(v),
      },
      {
        id: 'esgoto',
        rotulo: 'Sem rede de esgoto',
        // 23% dos setores têm esgoto sob sigilo — no bairro a soma fecha.
        nivel: 'bairro',
        matiz: MATIZES.carencia,
        // Denominador = soma das categorias de esgoto, não `dppo`: os setores sob
        // sigilo somem do numerador do bairro, e com `dppo` o Centro saía 15% sem
        // rede (real: 0,4%). Assim numerador e denominador cobrem os mesmos domicílios.
        valor: (p) => {
          const esgoto = p.saneamento?.esgoto ?? {};
          const rede = num(esgoto.rede_ou_fossa_ligada);
          const total = ESGOTO_CATEGORIAS.reduce((soma, k) => soma + (num(esgoto[k]) ?? 0), 0);
          return rede != null && total ? 1 - rede / total : null;
        },
        formato: (v) => fmt.pct(v),
        nota: 'Por bairro: nos setores, 23% estão sob sigilo do IBGE.',
      },
    ],
  },
];

export type VisualizacaoId = string;

export function getVisualizacao(id: VisualizacaoId | null): Visualizacao | null {
  if (!id) return null;
  for (const grupo of GRUPOS_VISUALIZACAO) {
    const opcao = grupo.opcoes.find((o) => o.id === id);
    if (opcao) return opcao;
  }
  return null;
}
