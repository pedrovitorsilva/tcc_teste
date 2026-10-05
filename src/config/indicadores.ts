/**
 * Rótulos e formatação dos campos do ETL exibidos na ficha. Os dados não trazem
 * rótulos (metadados.json só tem fontes e regras); a estrutura de cada bloco está
 * em dados/etl/model/hierarquia_dados.md.
 */

const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

/** `null`/ausente = sigilo do IBGE ou indicador suprimido. */
export const SEM_VALOR = '—';

export const fmt = {
  int: (v: number | null | undefined) => (v == null ? SEM_VALOR : inteiro.format(v)),
  dec: (v: number | null | undefined) => (v == null ? SEM_VALOR : decimal.format(v)),
  /** Fração 0–1 → "12,3%". */
  pct: (v: number | null | undefined) => (v == null ? SEM_VALOR : `${decimal.format(v * 100)}%`),
  brl: (v: number | null | undefined) => (v == null ? SEM_VALOR : reais.format(v)),
  /** Abaixo de 1 km² vira hectare: "0,1 km²" esconderia a diferença entre loteamentos pequenos. */
  km2: (v: number | null | undefined) =>
    v == null ? SEM_VALOR : v < 1 ? `${inteiro.format(v * 100)} ha` : `${decimal.format(v)} km²`,
};

export const IDADE: Record<string, string> = {
  '0_4': '0 a 4 anos',
  '5_9': '5 a 9 anos',
  '10_14': '10 a 14 anos',
  '15_19': '15 a 19 anos',
  '20_24': '20 a 24 anos',
  '25_29': '25 a 29 anos',
  '30_39': '30 a 39 anos',
  '40_49': '40 a 49 anos',
  '50_59': '50 a 59 anos',
  '60_69': '60 a 69 anos',
  '70_mais': '70 anos ou mais',
};

/** `dppo` (particulares permanentes ocupados) é a base dos tipos, não um tipo. */
export const TIPO_DOMICILIO: Record<string, string> = {
  casa: 'Casa',
  casa_vila_condominio: 'Casa de vila ou condomínio',
  apartamento: 'Apartamento',
  comodo_cortico: 'Cômodo ou cortiço',
  degradada: 'Habitação degradada',
  improvisado: 'Domicílio improvisado',
};

export const SANEAMENTO: Record<string, { titulo: string; itens: Record<string, string> }> = {
  agua: {
    titulo: 'Abastecimento de água',
    itens: { rede_geral: 'Rede geral', poco: 'Poço ou nascente', outras: 'Outras formas' },
  },
  agua_canalizada: {
    titulo: 'Água canalizada',
    itens: { dentro: 'Dentro do domicílio', so_terreno: 'Só no terreno', nao: 'Sem canalização' },
  },
  banheiro: {
    titulo: 'Banheiro',
    itens: {
      exclusivo: 'Exclusivo do domicílio',
      comum: 'Compartilhado',
      so_sanitario: 'Só sanitário',
      nenhum: 'Nenhum',
    },
  },
  esgoto: {
    titulo: 'Esgotamento sanitário',
    itens: {
      rede_ou_fossa_ligada: 'Rede ou fossa ligada à rede',
      fossa_septica: 'Fossa séptica',
      fossa_rudimentar: 'Fossa rudimentar',
      outros: 'Outras formas',
      inexistente: 'Sem esgotamento',
    },
  },
  lixo: {
    titulo: 'Destino do lixo',
    itens: { coletado: 'Coletado', queimado_enterrado: 'Queimado ou enterrado', outros: 'Outro destino' },
  },
};

export const ENDERECOS_CNEFE: Record<string, string> = {
  particulares: 'Domicílios particulares',
  coletivos: 'Domicílios coletivos',
  agropecuario: 'Estabelecimentos agropecuários',
  ensino: 'Estabelecimentos de ensino',
  saude: 'Estabelecimentos de saúde',
  religioso: 'Estabelecimentos religiosos',
  outras_finalidades: 'Outras finalidades',
  em_construcao: 'Em construção',
};

/** Nome dos blocos em `contem_sigilo`, para a nota de soma incompleta. */
export const BLOCOS: Record<string, string> = {
  demografia: 'população',
  domicilios: 'domicílios',
  saneamento: 'saneamento',
  alfabetizacao: 'alfabetização',
  renda_responsavel: 'renda',
};

export const FORA_ESCOLA_SINTETICA: Record<string, string> = {
  fora_escola_0_4: '0 a 4 anos',
  fora_escola_5_9: '5 a 9 anos',
  fora_escola_10_14: '10 a 14 anos',
  fora_escola_15_19: '15 a 19 anos',
};

type Formato = keyof typeof fmt;

/**
 * Indicadores das áreas de ponderação, na ordem exibida. Os `pct_fora_escola_<faixa>`
 * ficam de fora: já aparecem como estimativa sintética do próprio loteamento.
 */
export const INDICADORES_AP: { categoria: string; titulo: string; itens: [string, string, Formato][] }[] = [
  {
    categoria: 'educacao',
    titulo: 'Educação',
    itens: [
      ['pct_0_3_creche', 'Crianças de 0 a 3 anos na creche', 'pct'],
      ['pct_4_5_pre_escola', 'Crianças de 4 e 5 anos na pré-escola', 'pct'],
      ['pct_6_14_fora_escola', '6 a 14 anos fora da escola', 'pct'],
      ['pct_15_17_fora_escola', '15 a 17 anos fora da escola', 'pct'],
      ['pct_distorcao_idade_serie', 'Distorção idade-série', 'pct'],
      ['pct_estuda_fora_municipio', 'Estudam fora do município', 'pct'],
    ],
  },
  {
    categoria: 'trabalho',
    titulo: 'Trabalho',
    itens: [
      ['tx_ocupacao_14_mais', 'Taxa de ocupação (14 anos ou mais)', 'pct'],
      ['pct_ocupados_sem_previdencia', 'Ocupados sem contribuição à previdência', 'pct'],
    ],
  },
  {
    categoria: 'renda',
    titulo: 'Renda',
    itens: [
      ['renda_dom_pc_mediana', 'Renda domiciliar per capita (mediana)', 'brl'],
      ['pct_dom_ate_meio_sm_pc', 'Domicílios com até ½ salário mínimo per capita', 'pct'],
    ],
  },
  {
    categoria: 'moradia',
    titulo: 'Moradia',
    itens: [
      ['pct_alugados', 'Domicílios alugados', 'pct'],
      ['pct_adensamento_excessivo', 'Adensamento excessivo', 'pct'],
      ['pct_paredes_inadequadas', 'Paredes de material inadequado', 'pct'],
    ],
  },
  {
    categoria: 'internet',
    titulo: 'Internet',
    itens: [['pct_dom_com_internet', 'Domicílios com internet', 'pct']],
  },
  {
    categoria: 'mobilidade',
    titulo: 'Mobilidade',
    itens: [
      ['pct_desloc_mais_1h', 'Mais de 1 hora até o trabalho', 'pct'],
      ['pct_trabalha_fora_municipio', 'Trabalham fora do município', 'pct'],
    ],
  },
  {
    categoria: 'migracao',
    titulo: 'Migração',
    itens: [['pct_reside_menos_5_anos', 'Moram no município há menos de 5 anos', 'pct']],
  },
  {
    categoria: 'acessibilidade',
    titulo: 'Acessibilidade',
    itens: [
      ['pct_deficiencia', 'Pessoas com deficiência', 'pct'],
      ['pct_autismo', 'Pessoas com diagnóstico de autismo', 'pct'],
    ],
  },
];
