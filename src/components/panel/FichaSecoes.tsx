"use client";

import type { ReactNode } from "react";
import { NoteCard } from "@/components/panel/NoteCard";
import {
  AcessibilidadeIcon,
  AguaAbastecimentoIcon,
  AguaCanalizadaIcon,
  AlfabetizacaoIcon,
  AreaPonderacaoIcon,
  BanheiroIcon,
  EducacaoIcon,
  EsgotoIcon,
  FaixaEtariaIcon,
  ForaEscolaIcon,
  InternetIcon,
  LixoIcon,
  MigracaoIcon,
  MobilidadeIcon,
  MoradiaIcon,
  RendaApIcon,
  TipoDomicilioIcon,
  TrabalhoIcon,
  DomiciliosIcon,
  EnderecosIcon,
  EscolasIcon,
  PopulacaoIcon,
  QualidadeIcon,
  RendaIcon,
  SaneamentoIcon,
} from "@/components/icons";
import {
  BLOCOS,
  ENDERECOS_CNEFE,
  FORA_ESCOLA_SINTETICA,
  IDADE,
  INDICADORES_AP,
  SANEAMENTO,
  TIPO_DOMICILIO,
  fmt,
} from "@/config/indicadores";
import type {
  AreaPonderacaoProperties,
  BlocosCenso,
  Contagens,
  Escolas,
  LoteamentoProperties,
} from "@/types/map";
import { cn } from "@/lib/utils";

/** Seções da ficha, comuns a bairro/distrito (contagens) e loteamento (estimativas). */

export function Linha({
  rotulo,
  valor,
  incerto,
  titulo,
  proporcao,
}: {
  rotulo: ReactNode;
  valor: ReactNode;
  incerto?: boolean;
  /** Dica no hover do valor (ex.: por que está "—"). */
  titulo?: string;
  /** Fração 0–1: barra fina sob a linha, para ver a forma da distribuição sem ler os números. */
  proporcao?: number | null;
}) {
  const conteudo = (
    <>
      <span className="cv-rec-label">{rotulo}</span>
      <span className={cn("cv-rec-value shrink-0 text-right", incerto && "text-uncertain")} title={titulo}>
        {valor}
      </span>
    </>
  );
  if (proporcao === undefined) return <div className="cv-rec-row gap-3">{conteudo}</div>;
  return (
    // A barra já separa as linhas: sem o pontilhado e com menos respiro, a lista fica compacta.
    <div className="cv-rec-row flex-col gap-1 border-b-0 py-1.5">
      <div className="flex justify-between gap-3">{conteudo}</div>
      <span aria-hidden className="h-1 overflow-hidden rounded-full bg-panel-2">
        <span className="block h-full rounded-full bg-ink-faint" style={{ width: `${(proporcao ?? 0) * 100}%` }} />
      </span>
    </div>
  );
}

/**
 * Seção recolhível (`<details>` nativo: teclado e leitor de tela de graça).
 * Começa fechada: a ficha é longa e cada um abre só o que procura.
 */
export function Secao({ titulo, icone, children }: { titulo: string; icone?: ReactNode; children: ReactNode }) {
  return (
    <details className="group mt-3">
      <summary className="cv-sec-title flex min-h-11 cursor-pointer list-none items-center justify-between focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          {icone}
          {titulo}
        </span>
        <span aria-hidden className="text-base transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="pb-1">{children}</div>
    </details>
  );
}

function Subtitulo({ children, icone }: { children: ReactNode; icone?: ReactNode }) {
  return (
    <div className="cv-kicker mt-3 flex items-center gap-1.5">
      {icone}
      {children}
    </div>
  );
}

const ICONE_SUB = "size-3.5 shrink-0";

/** Ícone de cada bloco de saneamento (chaves de `SANEAMENTO`). */
const ICONE_SANEAMENTO: Record<string, ReactNode> = {
  agua: <AguaAbastecimentoIcon className={ICONE_SUB} />,
  agua_canalizada: <AguaCanalizadaIcon className={ICONE_SUB} />,
  banheiro: <BanheiroIcon className={ICONE_SUB} />,
  esgoto: <EsgotoIcon className={ICONE_SUB} />,
  lixo: <LixoIcon className={ICONE_SUB} />,
};

/** Ícone de cada categoria de indicador da AP (chaves de `INDICADORES_AP`). */
const ICONE_AP: Record<string, ReactNode> = {
  educacao: <EducacaoIcon className={ICONE_SUB} />,
  trabalho: <TrabalhoIcon className={ICONE_SUB} />,
  renda: <RendaApIcon className={ICONE_SUB} />,
  moradia: <MoradiaIcon className={ICONE_SUB} />,
  internet: <InternetIcon className={ICONE_SUB} />,
  mobilidade: <MobilidadeIcon className={ICONE_SUB} />,
  migracao: <MigracaoIcon className={ICONE_SUB} />,
  acessibilidade: <AcessibilidadeIcon className={ICONE_SUB} />,
};

/** Estimativa de loteamento leva "≈" e arredonda para inteiro. */
const qtd = (v: number | null | undefined, estimado: boolean) =>
  estimado && v != null ? `≈ ${fmt.int(v)}` : fmt.int(v);

/** Categorias exaustivas de um bloco: quantidade e fatia do total. Categoria
 * zerada some (é ruído: "≈ 0 · 0,0%"); a de sigilo fica, com "—". */
function Distribuicao({ rotulos, dados, estimado }: { rotulos: Record<string, string>; dados: Contagens; estimado: boolean }) {
  const base = Object.keys(rotulos).reduce((s, k) => s + (dados[k] ?? 0), 0);
  return (
    <>
      {Object.entries(rotulos).filter(([k]) => dados[k] !== 0).map(([k, rotulo]) => {
        const v = dados[k];
        return (
          <Linha
            key={k}
            rotulo={rotulo}
            valor={v == null ? fmt.int(v) : `${qtd(v, estimado)} · ${fmt.pct(base ? v / base : null)}`}
            proporcao={v == null || !base ? null : v / base}
          />
        );
      })}
    </>
  );
}

export function SecoesCenso({
  dados,
  estimado,
  areaDensidadeKm2,
  rotuloDensidade,
}: {
  dados: BlocosCenso;
  /** Loteamento: valores alocados dos setores, não contagem. */
  estimado: boolean;
  areaDensidadeKm2: number | null;
  rotuloDensidade: string;
}) {
  const { demografia: dem, domicilios: dom, alfabetizacao: alf, renda_responsavel: renda } = dados;
  const densidade = dem.pop != null && areaDensidadeKm2 ? dem.pop / areaDensidadeKm2 : null;
  const alfTotal = (alf.alfabetizados_15_mais ?? 0) + (alf.nao_alfabetizados_15_mais ?? 0);

  return (
    <>
      <Secao titulo="População" icone={<PopulacaoIcon className="size-4 shrink-0" />}>
        <Linha rotulo="Moradores" valor={qtd(dem.pop, estimado)} />
        <Linha rotulo={rotuloDensidade} valor={densidade == null ? fmt.int(null) : `${fmt.int(densidade)} hab/km²`} />
        <Linha rotulo="Homens" valor={qtd(dem.homens, estimado)} />
        <Linha rotulo="Mulheres" valor={qtd(dem.mulheres, estimado)} />
        <Subtitulo icone={<FaixaEtariaIcon className={ICONE_SUB} />}>Faixa etária</Subtitulo>
        <Distribuicao rotulos={IDADE} dados={dem.idade} estimado={estimado} />
      </Secao>

      <Secao titulo="Domicílios" icone={<DomiciliosIcon className="size-4 shrink-0" />}>
        <Linha rotulo="Total" valor={qtd(dom.total, estimado)} />
        <Linha rotulo="Ocupados" valor={qtd(dom.ocupados, estimado)} />
        <Linha rotulo="De uso ocasional" valor={qtd(dom.uso_ocasional, estimado)} />
        <Linha rotulo="Vagos" valor={qtd(dom.vagos, estimado)} />
        <Linha rotulo="Coletivos" valor={qtd(dom.coletivos, estimado)} />
        <Linha rotulo="Moradores por domicílio" valor={fmt.dec(dom.media_moradores)} />
        <Subtitulo icone={<TipoDomicilioIcon className={ICONE_SUB} />}>Tipo (ocupados)</Subtitulo>
        <Distribuicao rotulos={TIPO_DOMICILIO} dados={dom.tipo} estimado={estimado} />
      </Secao>

      <Secao titulo="Saneamento" icone={<SaneamentoIcon className="size-4 shrink-0" />}>
        {Object.entries(SANEAMENTO).map(([bloco, { titulo, itens }]) => (
          <div key={bloco}>
            <Subtitulo icone={ICONE_SANEAMENTO[bloco]}>{titulo}</Subtitulo>
            <Distribuicao rotulos={itens} dados={dados.saneamento[bloco as keyof BlocosCenso["saneamento"]]} estimado={estimado} />
          </div>
        ))}
      </Secao>

      <Secao titulo="Alfabetização" icone={<AlfabetizacaoIcon className="size-4 shrink-0" />}>
        <Linha rotulo="Taxa de alfabetização (15 anos ou mais)" valor={fmt.pct(alfTotal ? (alf.alfabetizados_15_mais ?? 0) / alfTotal : null)} />
        <Linha rotulo="Alfabetizados (15 anos ou mais)" valor={qtd(alf.alfabetizados_15_mais, estimado)} />
        <Linha rotulo="Não alfabetizados (15 anos ou mais)" valor={qtd(alf.nao_alfabetizados_15_mais, estimado)} />
      </Secao>

      <Secao titulo="Renda" icone={<RendaIcon className="size-4 shrink-0" />}>
        <Linha rotulo="Rendimento médio do responsável" valor={fmt.brl(renda.rendimento_medio)} />
        <Linha rotulo="Responsáveis por domicílio" valor={qtd(renda.responsaveis, estimado)} />
      </Secao>
    </>
  );
}

export function SecaoEscolas({
  escolas,
  foraEscola,
}: {
  escolas: Escolas;
  /** Só loteamento: estimativa sintética de quem está fora da escola. */
  foraEscola?: LoteamentoProperties["estimativas_sinteticas"];
}) {
  const soma = (r: Record<string, number>) => Object.values(r).reduce((s, n) => s + n, 0);
  return (
    <Secao titulo="Escolas" icone={<EscolasIcon className="size-4 shrink-0" />}>
      <Linha rotulo="Escolas públicas" valor={fmt.int(soma(escolas.publicas))} />
      <Linha rotulo="Escolas particulares" valor={fmt.int(soma(escolas.particulares))} />
      {foraEscola && (
        <>
          <Subtitulo icone={<ForaEscolaIcon className={ICONE_SUB} />}>Fora da escola (estimativa)</Subtitulo>
          {Object.entries(FORA_ESCOLA_SINTETICA).map(([k, rotulo]) => (
            <Linha key={k} rotulo={rotulo} valor={qtd(foraEscola[k]?.valor, true)} />
          ))}
          <p className="cv-note-body mt-2">
            População do loteamento na faixa × taxa de quem está fora da escola na área de ponderação.
          </p>
        </>
      )}
    </Secao>
  );
}

export function SecaoEnderecos({ enderecos }: { enderecos: Record<string, number> }) {
  return (
    <Secao titulo="Endereços" icone={<EnderecosIcon className="size-4 shrink-0" />}>
      <p className="cv-note-body mt-1">Cadastro de endereços do IBGE (CNEFE 2022).</p>
      {Object.entries(ENDERECOS_CNEFE).map(([k, rotulo]) => (
        <Linha key={k} rotulo={rotulo} valor={fmt.int(enderecos[k] ?? 0)} />
      ))}
    </Secao>
  );
}

/** Blocos cuja soma inclui setor com sigilo do IBGE (valor "X" → null). */
export function NotaSigilo({ blocos }: { blocos: string[] }) {
  if (blocos.length === 0) return null;
  return (
    <NoteCard className="mt-4 p-3">
      <p className="cv-note-body">
        Somas incompletas em {blocos.map((b) => BLOCOS[b] ?? b).join(", ")}: incluem setores em
        sigilo do IBGE, cujos valores não são divulgados.
      </p>
    </NoteCard>
  );
}

export function SecaoAreaPonderacao({
  aps,
  areas,
}: {
  aps: LoteamentoProperties["aps"];
  areas: Map<string, AreaPonderacaoProperties>;
}) {
  const ordenadas = [...aps].sort((a, b) => b.peso_pop - a.peso_pop);
  const principal = ordenadas[0] && areas.get(ordenadas[0].cd_ap);

  return (
    <Secao titulo="Outros Dados - Área de Ponderação do IBGE" icone={<AreaPonderacaoIcon className="size-4 shrink-0" />}>
      <p className="cv-note-body mt-1">
        Area de Ponderação é uma regiao do município onde o IBGE pesquisou uma amostra de
        domicílios. Os números abaixo valem para a área toda, e servem de referência para
        este loteamento.
      </p>
      {!principal ? (
        <p className="cv-note-body mt-2">Sem área de ponderação associada.</p>
      ) : (
        <>
          <Linha rotulo="Área" valor={principal.nome} />
          <Linha rotulo="Parte da população do loteamento" valor={fmt.pct(ordenadas[0].peso_pop)} />
          {ordenadas.slice(1).map((ap) => (
            <Linha
              key={ap.cd_ap}
              rotulo="Também cobre parte em"
              valor={`${areas.get(ap.cd_ap)?.nome ?? ap.cd_ap} (${fmt.pct(ap.peso_pop)})`}
            />
          ))}
          {INDICADORES_AP.map(({ categoria, titulo, itens }) => (
            <div key={categoria}>
              <Subtitulo icone={ICONE_AP[categoria]}>{titulo}</Subtitulo>
              {itens.map(([chave, rotulo, formato]) => {
                const ind = principal.indicadores[categoria]?.[chave];
                return (
                  <Linha
                    key={chave}
                    rotulo={rotulo}
                    valor={fmt[formato](ind?.suprimido ? null : ind?.valor)}
                    titulo={ind?.suprimido ? `Suprimido: só ${ind.n} respostas na amostra (mínimo 30)` : undefined}
                  />
                );
              })}
            </div>
          ))}
          <p className="cv-note-body mt-2">
            "—" = menos de 30 respostas na amostra. {principal.fonte}
          </p>
        </>
      )}
    </Secao>
  );
}

export function SecaoQualidade({ qualidade }: { qualidade: LoteamentoProperties["qualidade"] }) {
  return (
    <Secao titulo="Qualidade do dado" icone={<QualidadeIcon className="size-4 shrink-0" />}>
      <Linha rotulo="Área sobreposta a outros loteamentos" valor={fmt.pct(qualidade.sobreposicao_pct)} />
      <Linha rotulo="Endereços em mais de um loteamento" valor={fmt.int(qualidade.enderecos_compartilhados)} />
      <Linha rotulo="Endereços com coordenada precisa" valor={fmt.pct(qualidade.pct_coord_precisas)} />
    </Secao>
  );
}
