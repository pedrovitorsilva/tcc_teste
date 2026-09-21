"use client";

import { useMemo, useState } from "react";
import { Map, MapControls } from "@/components/ui/map";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useMapStyles } from "@/hooks/useMapStyles";
import { useGeoIndex } from "@/hooks/useGeoIndex";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useMapInteraction } from "@/hooks/useMapInteraction";
import { PREVIEW_FRACTION, EXPANDED_FRACTION } from "@/hooks/useBottomSheetDrag";
import { DEFAULT_LAYER_TOGGLES } from "@/config/levels";
import type {
  FloatingTitleState,
  LayerToggles,
  MapLabelTarget,
} from "@/types/map";
import { ensurePMTilesProtocol } from "@/lib/map/pmtilesProtocol";
import { MapLayers } from "./map/MapLayers";
import { Buildings3D } from "./map/Buildings3D";
import { FloatingPolygonLabel } from "./map/FloatingPolygonLabel";
import { OptionsList } from "./buttons/optionsList/OptionsList";
import { FloatingTitle } from "./map/FloatingTitle";
import { ThemeSwitcher } from "./buttons/themeSwitcher/ThemeSwitcher";
import { ThemeSwitcherPopoverButton } from "./buttons/themeSwitcher/ThemeSwitcherPopoverButton";
import { SearchBox } from "./SearchBox";
import { Sidebar } from "./panel/Sidebar";
import { BottomSheet } from "./panel/BottomSheet";

const CENTER: [number, number] = [-40.84, -14.86];
const ZOOM = 11;
const MIN_ZOOM = 9;
// Sudoeste/nordeste de Vitória da Conquista — trava o pan pra não deixar o
// mapa vazio fora da região de interesse.
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [-42.331167, -16.748426],
  [-39.42805, -13.48232],
];

// Escopo do módulo, não efeito: precisa rodar antes do `new maplibregl.Map()`
// que o <Map> dispara na montagem — ver docs/DECISOES-TECNICAS.md §6.
ensurePMTilesProtocol();

export function MapView() {
  const { theme } = useTheme();
  const tokens = useThemeTokens();
  const mapStyles = useMapStyles(theme, tokens);
  const { bairros, loteamentos, bairrosData, loteamentosData } = useGeoIndex();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "mobile";
  const sidebarWidth = breakpoint === "tablet" ? 320 : 380;

  const [layerToggles, setLayerToggles] = useState<LayerToggles>(
    DEFAULT_LAYER_TOGGLES,
  );
  const [buildingCount, setBuildingCount] = useState(0);
  const [buildingsEnabled, setBuildingsEnabled] = useState(false);
  const [titleInPolygon, setTitleInPolygon] = useState(false);

  const {
    selection,
    hoveredBairro,
    hoveredLoteamento,
    previewTarget,
    sheetSnap,
    setHoveredBairro,
    setHoveredLoteamento,
    setSheetSnap,
    handleSelect,
    handleClose,
    handleNavigate,
    handlePreview,
    handleHoverLoteamentoByName,
  } = useMapInteraction(bairros, loteamentos);

  const floatingTitle: FloatingTitleState | null = useMemo(() => {
    if (previewTarget) {
      return previewTarget.level === "bairro"
        ? { crumb: "bairro", main: previewTarget.name }
        : { crumb: previewTarget.parentBairro ?? "", main: previewTarget.name };
    }
    if (selection) {
      // On mobile, the name is already in the sheet header.
      if (isMobile) return null;
      return selection.level === "bairro"
        ? { crumb: "bairro selecionado", main: selection.name }
        : { crumb: selection.parentBairro ?? "", main: selection.name };
    }
    // Loteamento vence bairro: é o alvo mais específico.
    if (hoveredLoteamento) {
      return {
        crumb: hoveredLoteamento.parentBairro ?? "",
        main: hoveredLoteamento.name,
      };
    }
    if (hoveredBairro) {
      return { crumb: "bairro", main: hoveredBairro.name };
    }
    return null;
  }, [previewTarget, selection, hoveredLoteamento, hoveredBairro, isMobile]);

  /**
   * Alvo do rótulo desenhado no polígono. Mesma precedência do título flutuante,
   * mas exige a geometria completa (vem do índice, não do estado) — daí ser um
   * memo próprio. Aparece também no mobile, onde o título flutuante não aparece.
   */
  const mapLabelTarget: MapLabelTarget | null = useMemo(() => {
    if (!titleInPolygon) return null;

    const active = previewTarget ?? selection ?? null;
    let level = active?.level ?? null;
    let featureId = active?.featureId ?? null;

    if (!level && hoveredLoteamento) {
      level = "loteamento";
      featureId = hoveredLoteamento.featureId;
    }
    if (!level && hoveredBairro) {
      level = "bairro";
      featureId = hoveredBairro.featureId;
    }
    if (!level || featureId === null) return null;

    const isLoteamento = level === "loteamento";
    const feature = (isLoteamento ? loteamentos : bairros).find(
      (f) => f.featureId === featureId,
    );
    if (!feature?.geometry) return null;

    return {
      name: feature.name,
      geometry: feature.geometry,
      colorToken: !isLoteamento
        ? "bairro"
        : feature.isReliable === false
          ? "uncertain"
          : "loteamento",
    };
  }, [
    titleInPolygon,
    previewTarget,
    selection,
    hoveredLoteamento,
    hoveredBairro,
    bairros,
    loteamentos,
  ]);

  // Padding assimétrico no mobile, para a seleção ficar acima da folha. Depende
  // só do breakpoint: a folha sempre reabre em "prévia" numa seleção nova.
  const fitPadding = useMemo(() => {
    if (!isMobile || typeof window === "undefined") return 40;
    return {
      top: 40,
      bottom: window.innerHeight * PREVIEW_FRACTION + 40,
      left: 24,
      right: 24,
    };
  }, [isMobile]);

  const sheetHeightFraction =
    sheetSnap === "expanded" ? EXPANDED_FRACTION : PREVIEW_FRACTION;
  const layerButtonBottom =
    isMobile && selection
      ? `calc(${sheetHeightFraction * 100}vh + 12px)`
      : "18px";

  const optionsListProps = {
    layerToggles,
    onLayerTogglesChange: setLayerToggles,
    buildingsEnabled,
    onBuildingsChange: setBuildingsEnabled,
    titleInPolygon,
    onTitleChange: setTitleInPolygon,
  };

  return (
    <div className="flex h-full w-full">
      <div className="relative min-w-0 flex-1 overflow-hidden bg-page">
        <Map
          center={CENTER}
          zoom={ZOOM}
          minZoom={MIN_ZOOM}
          maxBounds={MAX_BOUNDS}
          styles={mapStyles}
          className="h-full w-full"
        >
          <MapControls />
          <MapLayers
            theme={theme}
            tokens={tokens}
            bairroData={bairrosData}
            loteamentoData={loteamentosData}
            layerToggles={layerToggles}
            selection={selection}
            hoveredBairro={hoveredBairro}
            hoveredLoteamento={hoveredLoteamento}
            previewTarget={previewTarget}
            onHoverBairro={setHoveredBairro}
            onHoverLoteamento={setHoveredLoteamento}
            onSelect={handleSelect}
            fitPadding={fitPadding}
          />
          <Buildings3D
            tokens={tokens}
            enabled={buildingsEnabled}
            selection={selection}
            hoveredBairro={hoveredBairro}
            bairros={bairros}
            loteamentos={loteamentos}
            onCountChange={setBuildingCount}
          />
          <FloatingPolygonLabel target={mapLabelTarget} tokens={tokens} />
        </Map>

        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="pointer-events-auto absolute top-[18px] left-[18px] w-[280px] max-md:right-[62px] max-md:w-auto">
            <SearchBox
              bairros={bairros}
              loteamentos={loteamentos}
              onPreview={handlePreview}
              onSelect={handleNavigate}
            />
          </div>

          <div className="pointer-events-auto absolute top-[18px] right-[18px] hidden md:block">
            <ThemeSwitcher />
          </div>
          <div className="pointer-events-auto absolute top-[18px] right-[18px] md:hidden">
            <ThemeSwitcherPopoverButton />
          </div>

          {/* Os dois modos são exclusivos: com o rótulo dentro da geometria, o
              título centralizado sai de cena para não duplicar o nome. */}
          <FloatingTitle state={titleInPolygon ? null : floatingTitle} />

          <div
            className="pointer-events-auto absolute left-[18px] hidden items-end gap-2 transition-[bottom] duration-300 md:flex"
            style={{ bottom: "18px" }}
          >
            <OptionsList {...optionsListProps} />
          </div>
          <div
            className="pointer-events-auto absolute left-[18px] flex gap-2 transition-[bottom] duration-300 md:hidden"
            style={{ bottom: layerButtonBottom }}
          >
            <OptionsList {...optionsListProps} />
          </div>
        </div>
      </div>

      {/* Desktop/tablet: sidebar lateral animada. Mobile: bottom sheet. */}
      <div className="hidden md:block">
        <Sidebar
          selection={selection}
          loteamentos={loteamentos}
          buildingCount={buildingCount}
          onClose={handleClose}
          onNavigate={handleNavigate}
          onHoverLoteamento={handleHoverLoteamentoByName}
          width={sidebarWidth}
        />
      </div>
      <div className="md:hidden">
        <BottomSheet
          selection={selection}
          loteamentos={loteamentos}
          buildingCount={buildingCount}
          snap={sheetSnap}
          onSnapChange={setSheetSnap}
          onClose={handleClose}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  );
}
