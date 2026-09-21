"use client";

import { CartographerNote } from "@/components/panel/CartographerNote";
import { BuildingsNote } from "@/components/panel/BuildingsNote";
import type { IndexedFeature } from "@/hooks/useGeoIndex";
import type { LevelId, Selection } from "@/types/map";
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
  buildingCount: number;
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
  buildingCount,
  onSelectLoteamento,
  onHoverLoteamento,
}: FeatureDetailsProps) {
  if (selection.level === "bairro") {
    return (
      <BairroBody
        bairroName={selection.name}
        loteamentos={loteamentos}
        buildingCount={buildingCount}
        onSelectLoteamento={onSelectLoteamento}
        onHoverLoteamento={onHoverLoteamento}
      />
    );
  }
  return <LoteamentoBody selection={selection} />;
}

function BairroBody({
  bairroName,
  loteamentos,
  buildingCount,
  onSelectLoteamento,
  onHoverLoteamento,
}: {
  bairroName: string;
  loteamentos: IndexedFeature[];
  buildingCount: number;
  onSelectLoteamento: (name: string) => void;
  onHoverLoteamento?: (name: string | null) => void;
}) {
  const children = loteamentos.filter((l) => l.parentBairro === bairroName);

  return (
    <>
      <BuildingsNote count={buildingCount} />

      <div className="cv-sec-title mt-0">Registro geral</div>
      <div className="cv-rec-row">
        <span className="cv-rec-label">Loteamentos mapeados</span>
        <span className="cv-rec-value">{children.length}</span>
      </div>

      <div className="cv-sec-title my-2">Loteamentos</div>
      <div>
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
    </>
  );
}

function LoteamentoBody({
  selection,
}: {
  selection: Selection;
}) {
  const isReliable = selection.properties.is_reliable !== false;

  return (
    <>
      {!isReliable && <CartographerNote />}

      <div className="cv-sec-title mt-0">Informações</div>
      <div className="cv-rec-row">
        <span className="cv-rec-label">Bairro</span>
        <span className="cv-rec-value">{selection.parentBairro ?? "—"}</span>
      </div>
      <div className="cv-rec-row">
        <span className="cv-rec-label">Confiabilidade da geometria</span>
        <span className={cn("cv-rec-value", !isReliable && "text-uncertain")}>
          {isReliable ? "Confirmada" : "Não confirmada"}
        </span>
      </div>
    </>
  );
}
