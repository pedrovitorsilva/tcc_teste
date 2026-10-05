"use client";

import { useEffect, useMemo, useState } from "react";
import { Map, MapControls } from "@/components/ui/map";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useMapStyles } from "@/hooks/useMapStyles";
import { useGeoIndex } from "@/hooks/useGeoIndex";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useMapInteraction } from "@/hooks/useMapInteraction";
import { PREVIEW_FRACTION } from "@/hooks/useBottomSheetDrag";
import { DEFAULT_LAYER_TOGGLES, rotuloUnidade } from "@/config/levels";
import type {
  FloatingTitleState,
  LayerToggles,
} from "@/types/map";
import { ensurePMTilesProtocol } from "@/lib/map/pmtilesProtocol";
import { MapLayers } from "./map/MapLayers";
import { Buildings3D } from "./map/Buildings3D";
import { Trees3D } from "./map/Trees3D";
import { Water3D } from "./map/Water3D";
import { Cars3D } from "./map/Cars3D";
import { StreetLamps3D } from "./map/StreetLamps3D";
import { ModelsAttribution } from "./map/ModelsAttribution";
import { OptionsList } from "./buttons/optionsList/OptionsList";
import { FloatingTitle } from "./map/FloatingTitle";
import { ThemeSwitcher } from "./buttons/themeSwitcher/ThemeSwitcher";
import { ThemeSwitcherPopoverButton } from "./buttons/themeSwitcher/ThemeSwitcherPopoverButton";
import { SearchBox } from "./SearchBox";
import { MostrarFichaIcon } from "./icons";
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
  // Vintage segue diurno: só o escuro tem noite.
  const night = theme === "dark";
  const tokens = useThemeTokens();
  const mapStyles = useMapStyles(theme, tokens);
  const { bairros, loteamentos, areasPonderacao, municipio, bairrosData, loteamentosData } = useGeoIndex();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "mobile";
  const sidebarWidth = breakpoint === "tablet" ? 320 : 380;

  const [layerToggles, setLayerToggles] = useState<LayerToggles>(
    DEFAULT_LAYER_TOGGLES,
  );
  const [buildingCount, setBuildingCount] = useState(0);
  const [vehiclesCount, setVehiclesCount] = useState(0);
  const [buildingsEnabled, setBuildingsEnabled] = useState(false);
  const [vegetationEnabled, setVegetationEnabled] = useState(false);
  const [waterEnabled, setWaterEnabled] = useState(false);
  const [carsEnabled, setCarsEnabled] = useState(false);
  const [lampsEnabled, setLampsEnabled] = useState(false);

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

  // Ficha recolhida: a seleção continua no mapa, só o painel sai da frente.
  // Uma seleção nova reabre — quem clicou numa área quer ver a ficha dela.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [recenterKey, setRecenterKey] = useState(0);
  useEffect(() => {
    setSidebarCollapsed(false);
  }, [selection?.featureId, selection?.level]);
  const handleRecenter = () => setRecenterKey((k) => k + 1);

  const floatingTitle: FloatingTitleState | null = useMemo(() => {
    if (previewTarget) {
      return previewTarget.level === "bairro"
        ? { crumb: rotuloUnidade(previewTarget.tipo), main: previewTarget.name }
        : { crumb: previewTarget.parentBairro ?? "", main: previewTarget.name };
    }
    // A seleção não entra: o nome já está na ficha (ou no botão que a reabre).
    // Loteamento vence bairro: é o alvo mais específico.
    if (hoveredLoteamento) {
      return {
        crumb: hoveredLoteamento.parentBairro ?? "",
        main: hoveredLoteamento.name,
      };
    }
    if (hoveredBairro) {
      return { crumb: rotuloUnidade(hoveredBairro.tipo), main: hoveredBairro.name };
    }
    return null;
  }, [previewTarget, hoveredLoteamento, hoveredBairro]);

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

  const optionsListProps = {
    layerToggles,
    onLayerTogglesChange: setLayerToggles,
    buildingsEnabled,
    onBuildingsChange: setBuildingsEnabled,
    vegetationEnabled,
    onVegetationChange: setVegetationEnabled,
    waterEnabled,
    onWaterChange: setWaterEnabled,
    carsEnabled,
    onCarsChange: setCarsEnabled,
    lampsEnabled,
    onLampsChange: setLampsEnabled,
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
            recenterKey={recenterKey}
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
          <Trees3D
            enabled={vegetationEnabled}
            night={night}
            selection={selection}
            hoveredBairro={hoveredBairro}
            bairros={bairros}
            loteamentos={loteamentos}
          />
          <Water3D
            enabled={waterEnabled}
            night={night}
            selection={selection}
            hoveredBairro={hoveredBairro}
            bairros={bairros}
            loteamentos={loteamentos}
          />
          <Cars3D
            enabled={carsEnabled}
            night={night}
            selection={selection}
            hoveredBairro={hoveredBairro}
            bairros={bairros}
            loteamentos={loteamentos}
            onCountChange={setVehiclesCount}
          />
          <StreetLamps3D
            enabled={lampsEnabled}
            night={night}
            selection={selection}
            hoveredBairro={hoveredBairro}
            bairros={bairros}
            loteamentos={loteamentos}
          />
          <ModelsAttribution cars={carsEnabled} lamps={lampsEnabled} />
        </Map>

        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="pointer-events-auto absolute top-[18px] left-[18px] right-[18px] flex items-center gap-2">
            <div className="w-[280px] max-md:w-[140px] shrink-0">
              <SearchBox
                bairros={bairros}
                loteamentos={loteamentos}
                onPreview={handlePreview}
                onSelect={handleNavigate}
                placeholder={isMobile ? "Pesquisar..." : "Buscar bairro, distrito ou loteamento..."}
              />
            </div>

            <FloatingTitle state={floatingTitle} />

            <div className="hidden shrink-0 md:block">
              <ThemeSwitcher />
            </div>
            <div className="shrink-0 md:hidden">
              <ThemeSwitcherPopoverButton />
            </div>
          </div>

          {selection && sidebarCollapsed && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="pointer-events-auto absolute top-[76px] right-[18px] hidden min-h-11 max-w-[240px] items-center gap-2 rounded-full border border-cv-border bg-panel px-4 text-sm text-ink shadow-[0_4px_16px_rgba(0,0,0,.08)] hover:bg-panel-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:flex"
            >
              <MostrarFichaIcon className="size-4 shrink-0" />
              <span className="truncate">{selection.name}</span>
            </button>
          )}

          <div className="pointer-events-auto absolute bottom-[18px] left-[18px] flex items-end gap-2">
            <OptionsList {...optionsListProps} />
          </div>
        </div>
      </div>

      {/* Desktop/tablet: sidebar lateral animada. Mobile: bottom sheet. */}
      <div className="hidden md:block">
        <Sidebar
          selection={selection}
          bairros={bairros}
          loteamentos={loteamentos}
          municipio={municipio}
          areasPonderacao={areasPonderacao}
          buildingCount={buildingCount}
          vehiclesCount={vehiclesCount}
          buildingsEnabled={buildingsEnabled}
          carsEnabled={carsEnabled}
          lampsEnabled={lampsEnabled}
          onClose={handleClose}
          onNavigate={handleNavigate}
          onHoverLoteamento={handleHoverLoteamentoByName}
          collapsed={sidebarCollapsed}
          onCollapse={() => setSidebarCollapsed(true)}
          onRecenter={handleRecenter}
          width={sidebarWidth}
        />
      </div>
      <div className="md:hidden">
        <BottomSheet
          selection={selection}
          bairros={bairros}
          loteamentos={loteamentos}
          municipio={municipio}
          areasPonderacao={areasPonderacao}
          buildingCount={buildingCount}
          vehiclesCount={vehiclesCount}
          buildingsEnabled={buildingsEnabled}
          carsEnabled={carsEnabled}
          lampsEnabled={lampsEnabled}
          snap={sheetSnap}
          onSnapChange={setSheetSnap}
          onRecenter={handleRecenter}
          onClose={handleClose}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  );
}
