"use client";

import type { ReactNode } from "react";
import { CartographerNote } from "@/components/panel/CartographerNote";
import { BuildingsNote } from "@/components/panel/BuildingsNote";
import { CarsNote } from "@/components/panel/CarsNote";
import { StreetLampsNote } from "@/components/panel/StreetLampsNote";
import { Models3DNote } from "@/components/panel/Models3DNote";
import {
  NotaSigilo,
  Secao,
  SecaoAreaPonderacao,
  SecaoEnderecos,
  SecaoEscolas,
  SecaoQualidade,
  SecoesCenso,
} from "@/components/panel/FichaSecoes";
import { Comparacao, NumerosChave, type Serie } from "@/components/panel/FichaResumo";
import { IncertoIcon, LoteamentosIcon } from "@/components/icons";
import { rotuloUnidade } from "@/config/levels";
import { fmt } from "@/config/indicadores";
import type { IndexedFeature } from "@/hooks/useGeoIndex";
import { resumir, type Resumo } from "@/lib/resumo";
import type {
  AreaPonderacaoProperties,
  LevelId,
  LoteamentoProperties,
  Selection,
  UnidadeProperties,
} from "@/types/map";
import { cn } from "@/lib/utils";

/** Interface for the 'back' element in sidebar and bottom sheet. */
export interface FeatureBackLinkProps {
  selection: Selection;
  onClose: () => void;
  onNavigate: (level: LevelId, name: string) => void;
  className?: string;
}

interface FeatureDetailsProps {
  selection: Selection;
  /** Bairros e distritos — a ficha do loteamento compara com o bairro pai. */
  bairros: IndexedFeature[];
  loteamentos: IndexedFeature[];
  /** Município inteiro: referência de todas as comparações. */
  municipio: Resumo | null;
  /** Áreas de ponderação por `cd_ap` — só a ficha do loteamento usa. */
  areasPonderacao: Map<string, AreaPonderacaoProperties>;
  buildingCount: number;
  vehiclesCount: number;
  buildingsEnabled: boolean;
  carsEnabled: boolean;
  lampsEnabled: boolean;
  onSelectLoteamento: (name: string) => void;
  /** Mirrors hover from search list to corresponding polygon on map.
   *
   * `null` on exit.
   */
  onHoverLoteamento?: (name: string | null) => void;
}

/** "‹ back" button, rendered in Sidebar/BottomSheet header — same navigation logic
 * as FeatureDetails, single source. Exported for separate use in the app shell. */
export function FeatureBackLink({
  selection,
  onClose,
  onNavigate,
  className,
}: FeatureBackLinkProps) {
  // Orphaned loteamento (no parent bairro) has no "back" — keep invisible.
  if (selection.level === "loteamento" && !selection.parentBairro) return null;

  const label =
    selection.level === "bairro"
      ? "voltar ao mapa geral"
      : `voltar para ${selection.parentBairro}`;

  return (
    <button
      type="button"
      onClick={() =>
        selection.level === "bairro"
          ? onClose()
          : selection.parentBairro &&
            onNavigate("bairro", selection.parentBairro)
      }
      className={cn(
        "cv-kicker cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        className,
      )}
    >
      ‹ {label}
    </button>
  );
}

/** Conteúdo da ficha — o mesmo na Sidebar (desktop) e no BottomSheet (mobile).
 *
 * Ordem pensada para leitura rápida: números-chave e comparação ficam à vista;
 * o detalhe vai em seções recolhidas, abertas sob demanda. */
export function FeatureDetails({
  selection,
  bairros,
  loteamentos,
  municipio,
  areasPonderacao,
  buildingCount,
  vehiclesCount,
  buildingsEnabled,
  carsEnabled,
  lampsEnabled,
  onSelectLoteamento,
  onHoverLoteamento,
}: FeatureDetailsProps) {
  const has3d = buildingsEnabled || carsEnabled || lampsEnabled;
  // As notas falam das camadas 3D, não da área: ficam juntas, recolhidas, no fim.
  const notes = has3d && (
    <Secao titulo="Sobre o mapa 3D">
      {/* Só carros e postes usam modelos de terceiros; edificações/vegetação/água são geradas. */}
      <Models3DNote enabled={carsEnabled || lampsEnabled} />
      <BuildingsNote count={buildingCount} enabled={buildingsEnabled} />
      <StreetLampsNote enabled={lampsEnabled} />
      <CarsNote count={vehiclesCount} enabled={carsEnabled} />
    </Secao>
  );

  if (selection.level === "bairro") {
    return (
      <BairroBody
        bairroName={selection.name}
        unidade={selection.properties as unknown as UnidadeProperties}
        loteamentos={loteamentos}
        municipio={municipio}
        notes={notes}
        onSelectLoteamento={onSelectLoteamento}
        onHoverLoteamento={onHoverLoteamento}
      />
    );
  }
  const pai = bairros.find((b) => b.name === selection.parentBairro);
  return (
    <LoteamentoBody
      selection={selection}
      bairroPai={pai ? (pai.properties as unknown as UnidadeProperties) : null}
      municipio={municipio}
      areasPonderacao={areasPonderacao}
      notes={notes}
    />
  );
}

const densidade = (pop: number | null, areaKm2: number | null) =>
  pop != null && areaKm2 ? `${fmt.int(pop / areaKm2)} hab/km²` : fmt.int(null);

/** Estimativa de loteamento leva "≈". */
const aprox = (v: number | null) => (v != null ? `≈ ${fmt.int(v)}` : fmt.int(v));

function BairroBody({
  bairroName,
  unidade,
  loteamentos,
  municipio,
  notes,
  onSelectLoteamento,
  onHoverLoteamento,
}: {
  bairroName: string;
  unidade: UnidadeProperties;
  loteamentos: IndexedFeature[];
  municipio: Resumo | null;
  notes: ReactNode;
  onSelectLoteamento: (name: string) => void;
  onHoverLoteamento?: (name: string | null) => void;
}) {
  const children = loteamentos.filter((l) => l.parentBairro === bairroName);
  const resumo = resumir([unidade]);
  const tipo = rotuloUnidade(unidade.tipo);
  const series: Serie[] = [
    { rotulo: tipo === "distrito" ? "Este distrito" : "Este bairro", resumo, cor: "var(--bairro)" },
    ...(municipio ? [{ rotulo: "Município", resumo: municipio, cor: "var(--ink-faint)", referencia: true }] : []),
  ];

  return (
    <>
      <NumerosChave
        itens={[
          { rotulo: "Moradores", valor: fmt.int(resumo.pop) },
          { rotulo: "Domicílios", valor: fmt.int(resumo.domicilios) },
          // Sobre a área com domicílios: a área total inclui mata, lagoa e vazios.
          { rotulo: "Densidade", valor: densidade(resumo.pop, unidade.area_domiciliada_km2) },
          { rotulo: "Área", valor: fmt.km2(unidade.area_km2) },
        ]}
      />
      <Comparacao series={series} />

      <div className="mt-5">
        {children.length > 0 && (
          <Secao
            titulo={`Loteamentos (${children.length})`}
            icone={<LoteamentosIcon className="size-4 shrink-0" />}
          >
            <ul className="pt-1">
              {children.map((lot) => (
                <li key={lot.name}>
                  <button
                    type="button"
                    onClick={() => onSelectLoteamento(lot.name)}
                    // Foco espelha o hover: navegar por teclado destaca o mesmo polígono.
                    onMouseEnter={() => onHoverLoteamento?.(lot.name)}
                    onMouseLeave={() => onHoverLoteamento?.(null)}
                    onFocus={() => onHoverLoteamento?.(lot.name)}
                    onBlur={() => onHoverLoteamento?.(null)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 text-left text-sm hover:bg-panel-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    <span>{lot.name}</span>
                    {/* Só a exceção ganha marca: ícone tracejado (como o contorno no mapa) + texto, não só cor. */}
                    {lot.isReliable === false && (
                      <span className="flex shrink-0 items-center gap-1 text-[12px] text-uncertain">
                        <IncertoIcon className="size-3.5" />
                        aproximado
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </Secao>
        )}
        <SecoesCenso
          dados={unidade}
          estimado={false}
          areaDensidadeKm2={unidade.area_domiciliada_km2}
          rotuloDensidade="Densidade (área com domicílios)"
        />
        <SecaoEscolas escolas={unidade.escolas} />
        <SecaoEnderecos enderecos={unidade.enderecos_cnefe} />
        {notes}
      </div>
      <NotaSigilo blocos={unidade.contem_sigilo} />
    </>
  );
}

function LoteamentoBody({
  notes,
  selection,
  bairroPai,
  municipio,
  areasPonderacao,
}: {
  notes: ReactNode;
  selection: Selection;
  bairroPai: UnidadeProperties | null;
  municipio: Resumo | null;
  areasPonderacao: Map<string, AreaPonderacaoProperties>;
}) {
  const lot = selection.properties as unknown as LoteamentoProperties;
  const isReliable = lot.is_reliable !== false;
  const resumo = lot.estimativas ? resumir([lot.estimativas]) : null;
  const series: Serie[] = [
    ...(resumo ? [{ rotulo: "Este loteamento", resumo, cor: "var(--loteamento)" }] : []),
    ...(bairroPai ? [{ rotulo: bairroPai.nome, resumo: resumir([bairroPai]), cor: "var(--bairro)" }] : []),
    ...(municipio ? [{ rotulo: "Município", resumo: municipio, cor: "var(--ink-faint)", referencia: true }] : []),
  ];

  return (
    <>
      {!isReliable && <CartographerNote />}

      {resumo ? (
        <>
          <NumerosChave
            itens={[
              { rotulo: "Moradores", valor: aprox(resumo.pop) },
              { rotulo: "Domicílios", valor: aprox(resumo.domicilios) },
              { rotulo: "Densidade", valor: densidade(resumo.pop, lot.area_km2) },
              { rotulo: "Área", valor: fmt.km2(lot.area_km2) },
            ]}
          />
          <p className="cv-note-body mt-2">
            ≈ estimativa: Censo por setor repartido pelos endereços do CNEFE.
          </p>
          <Comparacao series={series} />
        </>
      ) : (
        <>
          <NumerosChave itens={[{ rotulo: "Área", valor: fmt.km2(lot.area_km2) }]} />
          <p className="cv-note-body mt-2">
            Sem endereços residenciais no CNEFE: não há estimativa de população nem de
            domicílios.
          </p>
        </>
      )}

      <div className="mt-5">
        {lot.estimativas && (
          <SecoesCenso
            dados={lot.estimativas}
            estimado
            areaDensidadeKm2={lot.area_km2}
            rotuloDensidade="Densidade"
          />
        )}
        <SecaoEscolas escolas={lot.escolas} foraEscola={lot.estimativas_sinteticas} />
        <SecaoEnderecos enderecos={lot.enderecos_cnefe} />
        <SecaoAreaPonderacao aps={lot.aps} areas={areasPonderacao} />
        <SecaoQualidade qualidade={lot.qualidade} />
        {notes}
      </div>
      <NotaSigilo blocos={lot.qualidade.contem_sigilo} />
    </>
  );
}
