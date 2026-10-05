"use client";

import type { ReactNode } from "react";
import { CartographerNote } from "@/components/panel/CartographerNote";
import { BuildingsNote } from "@/components/panel/BuildingsNote";
import { CarsNote } from "@/components/panel/CarsNote";
import { StreetLampsNote } from "@/components/panel/StreetLampsNote";
import { Models3DNote } from "@/components/panel/Models3DNote";
import {
  Linha,
  NotaSigilo,
  Secao,
  SecaoAreaPonderacao,
  SecaoEnderecos,
  SecaoEscolas,
  SecaoQualidade,
  SecoesCenso,
} from "@/components/panel/FichaSecoes";
import { LoteamentosIcon } from "@/components/icons";
import { rotuloUnidade } from "@/config/levels";
import { fmt } from "@/config/indicadores";
import type { IndexedFeature } from "@/hooks/useGeoIndex";
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
  loteamentos: IndexedFeature[];
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

/** Conteúdo da ficha — o mesmo na Sidebar (desktop) e no BottomSheet (mobile). */
export function FeatureDetails({
  selection,
  loteamentos,
  areasPonderacao,
  buildingCount,
  vehiclesCount,
  buildingsEnabled,
  carsEnabled,
  lampsEnabled,
  onSelectLoteamento,
  onHoverLoteamento,
}: FeatureDetailsProps) {
  const notes = (
    <div>
      {/* Só carros e postes usam modelos de terceiros; edificações/vegetação/água são geradas. */}
      <Models3DNote enabled={carsEnabled || lampsEnabled} />
      <BuildingsNote count={buildingCount} enabled={buildingsEnabled} />
      <StreetLampsNote enabled={lampsEnabled} />
      <CarsNote count={vehiclesCount} enabled={carsEnabled} />
    </div>
  );
  if (selection.level === "bairro") {
    return (
      <BairroBody
        bairroName={selection.name}
        unidade={selection.properties as unknown as UnidadeProperties}
        loteamentos={loteamentos}
        notes={notes}
        onSelectLoteamento={onSelectLoteamento}
        onHoverLoteamento={onHoverLoteamento}
      />
    );
  }
  return (
    <LoteamentoBody
      selection={selection}
      areasPonderacao={areasPonderacao}
      notes={notes}
    />
  );
}

function BairroBody({
  bairroName,
  unidade,
  loteamentos,
  notes,
  onSelectLoteamento,
  onHoverLoteamento,
}: {
  bairroName: string;
  unidade: UnidadeProperties;
  loteamentos: IndexedFeature[];
  notes: ReactNode;
  onSelectLoteamento: (name: string) => void;
  onHoverLoteamento?: (name: string | null) => void;
}) {
  const children = loteamentos.filter((l) => l.parentBairro === bairroName);
  const tipo = rotuloUnidade(unidade.tipo);

  return (
    <>
      <div className="cv-sec-title mt-0">Registro geral</div>
      <Linha rotulo="Tipo" valor={tipo === "distrito" ? "Distrito" : "Bairro"} />
      <Linha rotulo="Área" valor={fmt.km2(unidade.area_km2)} />
      <Linha rotulo="Área com domicílios" valor={fmt.km2(unidade.area_domiciliada_km2)} />
      {/* Distrito não tem loteamento mapeado: a lista só existe para bairro. */}
      {tipo === "bairro" && <Linha rotulo="Loteamentos mapeados" valor={children.length} />}

      {children.length > 0 && (
        <Secao titulo="Loteamentos" icone={<LoteamentosIcon className="size-4 shrink-0" />}>
          <div className="pt-1">
            {children.map((lot) => (
              <button
                key={lot.name}
                type="button"
                onClick={() => onSelectLoteamento(lot.name)}
                // Foco espelha o hover: navegar por teclado destaca o mesmo polígono.
                onMouseEnter={() => onHoverLoteamento?.(lot.name)}
                onMouseLeave={() => onHoverLoteamento?.(null)}
                onFocus={() => onHoverLoteamento?.(lot.name)}
                onBlur={() => onHoverLoteamento?.(null)}
                className="mb-1.5 flex min-h-11 w-full items-center justify-between rounded-md border border-cv-border-soft bg-panel-2 px-2.75 py-2.25 text-left text-sm hover:border-cv-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <span>{lot.name}</span>
                <span
                  className={cn(
                    "cv-note-body text-[11px] not-italic",
                    lot.isReliable === false && "font-medium text-uncertain",
                  )}
                >
                  {lot.isReliable === false
                    ? "geometria não confirmada"
                    : "geometria confirmada"}
                </span>
              </button>
            ))}
          </div>
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
      <NotaSigilo blocos={unidade.contem_sigilo} />

      {notes}
    </>
  );
}

function LoteamentoBody({
  notes,
  selection,
  areasPonderacao,
}: {
  notes: ReactNode;
  selection: Selection;
  areasPonderacao: Map<string, AreaPonderacaoProperties>;
}) {
  const lot = selection.properties as unknown as LoteamentoProperties;
  const isReliable = lot.is_reliable !== false;

  return (
    <>
      {!isReliable && <CartographerNote />}

      <div className="cv-sec-title mt-0">Informações</div>
      <Linha rotulo="Bairro" valor={selection.parentBairro ?? "—"} />
      <Linha
        rotulo="Confiabilidade da geometria"
        valor={isReliable ? "Confirmada" : "Não confirmada"}
        incerto={!isReliable}
      />
      <Linha rotulo="Área" valor={fmt.km2(lot.area_km2)} />

      {lot.estimativas ? (
        <>
          <p className="cv-note-body mt-3">
            Valores estimados (≈): os dados do Censo por setor foram repartidos entre os
            loteamentos pela proporção de endereços residenciais do CNEFE.
          </p>
          <SecoesCenso
            dados={lot.estimativas}
            estimado
            areaDensidadeKm2={lot.area_km2}
            rotuloDensidade="Densidade"
          />
        </>
      ) : (
        <p className="cv-note-body mt-3">
          Sem endereços residenciais no CNEFE dentro deste loteamento: não há estimativa
          de população nem de domicílios.
        </p>
      )}
      <SecaoEscolas escolas={lot.escolas} foraEscola={lot.estimativas_sinteticas} />
      <SecaoEnderecos enderecos={lot.enderecos_cnefe} />
      <SecaoAreaPonderacao aps={lot.aps} areas={areasPonderacao} />
      <SecaoQualidade qualidade={lot.qualidade} />
      <NotaSigilo blocos={lot.qualidade.contem_sigilo} />

      {notes}
    </>
  );
}
