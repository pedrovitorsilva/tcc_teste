"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";
import { Map, MapControls } from "@/components/ui/map";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import type { ThemeName } from "@/lib/color/theme";
import { loadTintedStyle } from "@/lib/map/tint";
import { useGeoIndex, type IndexedFeature } from "@/hooks/useGeoIndex";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { DEFAULT_LAYER_TOGGLES } from "@/config/levels";
import type {
  FloatingTitleState,
  HoveredBairro,
  HoveredLoteamento,
  LayerToggles,
  MapLabelTarget,
  LevelId,
  PreviewTarget,
  Selection,
} from "@/types/map";
import { ensurePMTilesProtocol } from "@/lib/map/pmtilesProtocol";
import { MapLayers } from "./map/MapLayers";
import { Buildings3D } from "./map/Buildings3D";
import { BuildingsNote } from "./panel/BuildingsNote";
import { FloatingPolygonLabel } from "./map/FloatingPolygonLabel";
import { OptionsList } from "./buttons/optionsList/OptionsList";
import { FloatingTitle } from "./map/FloatingTitle";
import { ThemeSwitcher } from "./buttons/themeSwitcher/ThemeSwitcher";
import { ThemeSwitcherPopoverButton } from "./buttons/themeSwitcher/ThemeSwitcherPopoverButton";
import { SearchBox } from "./SearchBox";
import { Sidebar } from "./panel/Sidebar";
import { BottomSheet, type SheetSnap } from "./panel/BottomSheet";

const CENTER: [number, number] = [-40.84, -14.86];
const ZOOM = 11;
const MIN_ZOOM = 9;
// Sudoeste/nordeste de Vitória da Conquista — trava o pan pra não deixar o
// mapa vazio fora da região de interesse.
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [-42.331167, -16.748426],
  [-39.42805, -13.48232],
];
// Variantes "nolabels": o basemap entra só como geometria, sem rótulos próprios
// competindo com os nomes que a aplicação desenha. Por prop, porque
// components/ui/map.tsx é de terceiros e não pode ser editado.
const MAP_STYLES = {
  light:
    "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json",
};
const PREVIEW_FRACTION = 0.35;
const EXPANDED_FRACTION = 0.85;

/**
 * Basemaps tingidos: os três temas repintam a geometria da CARTO a partir dos
 * tokens `--map-*`, em vez de servirem um style próprio (docs/DECISOES-TECNICAS.md §1).
 *
 * O componente de mapa só resolve "light" e "dark" (vintage entra como light,
 * ver lib/color/theme.ts), então o style tingido vai nas duas chaves. Enquanto a
 * busca não resolve — ou se falhar — vale o basemap cru da CARTO.
 */
function useMapStyles(theme: ThemeName, tokens: ThemeTokens) {
  const [tinted, setTinted] = useState<StyleSpecification | null>(null);
  const { mapLand, mapWater, mapInk } = tokens;

  useEffect(() => {
    // Cada tema define de qual style parte e para onde cada extremo da faixa de
    // lightness é puxado.
    const recipe =
      theme === "vintage"
        ? {
            source: MAP_STYLES.light,
            target: { land: mapLand, water: mapWater, ink: mapInk },
          }
        : theme === "dark"
          ? {
              source: MAP_STYLES.dark,
              target: {
                background: mapLand,
                // Invertido: a via mais clara vira o âmbar aceso, a mais escura
                // se dissolve no fundo. Só a malha principal fica acesa.
                land: mapInk,
                ink: mapLand,
                water: mapWater,
                contrast: 0.85,
              },
            }
          : {
              source: MAP_STYLES.light,
              // 0.55 dá a leitura de gravura sem chegar ao preto, que competiria
              // com os dados (o Positron cru desenha as vias em #ddd).
              target: {
                land: mapLand,
                water: mapWater,
                ink: mapInk,
                contrast: 0.55,
              },
            };

    // Limpa antes de buscar: senão o style do tema anterior segue pintado até a
    // nova busca resolver. O basemap cru no intervalo é o estado errado certo.
    setTinted(null);

    let cancelled = false;
    loadTintedStyle(recipe.source, recipe.target)
      .then((style) => {
        if (!cancelled) setTinted(style);
      })
      .catch(() => {
        if (!cancelled) setTinted(null);
      });
    return () => {
      cancelled = true;
    };
  }, [theme, mapLand, mapWater, mapInk]);

  return useMemo(
    () => (tinted ? { light: tinted, dark: tinted } : MAP_STYLES),
    [tinted],
  );
}

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
  const [selection, setSelection] = useState<Selection | null>(null);
  const [hoveredBairro, setHoveredBairro] = useState<HoveredBairro | null>(
    null,
  );
  const [hoveredLoteamento, setHoveredLoteamento] =
    useState<HoveredLoteamento | null>(null);
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(
    null,
  );
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("preview");
  const [buildingCount, setBuildingCount] = useState(0);
  const [buildingsEnabled, setBuildingsEnabled] = useState(false);
  const [titleInPolygon, setTitleInPolygon] = useState(false);

  const handleSelect = useCallback((next: Selection) => {
    setSelection(next);
    setHoveredBairro(null);
    setHoveredLoteamento(null);
  }, []);

  /** Hover vindo da lista da ficha, que só sabe o nome. Casa nome + bairro-pai porque há homônimos no dataset. */
  const handleHoverLoteamentoByName = useCallback(
    (name: string | null) => {
      if (!name || selection?.level !== "bairro") {
        setHoveredLoteamento(null);
        return;
      }
      const feature = loteamentos.find(
        (f) => f.name === name && f.parentBairro === selection.name,
      );
      setHoveredLoteamento(
        feature
          ? {
              featureId: feature.featureId,
              name: feature.name,
              parentBairro: feature.parentBairro,
            }
          : null,
      );
    },
    [loteamentos, selection],
  );

  // Every new selection reopens the sheet in "preview" mode.
  useEffect(() => {
    if (selection) setSheetSnap("preview");
  }, [selection?.featureId, selection?.level]);

  const handleClose = useCallback(() => {
    setSelection(null);
  }, []);

  useEffect(() => {
    if (!selection) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [selection, handleClose]);

  const handleNavigate = useCallback(
    (level: LevelId, name: string) => {
      const pool = level === "bairro" ? bairros : loteamentos;
      const feature = pool.find((f) => f.name === name);
      if (!feature) return;
      handleSelect({
        level,
        featureId: feature.featureId,
        name: feature.name,
        properties: feature.properties,
        parentBairro: feature.parentBairro,
        bbox: feature.bbox,
      });
    },
    [bairros, loteamentos, handleSelect],
  );

  const handlePreview = useCallback((feature: IndexedFeature | null) => {
    setPreviewTarget(
      feature
        ? {
            level: feature.level,
            featureId: feature.featureId,
            name: feature.name,
            parentBairro: feature.parentBairro,
          }
        : null,
    );
  }, []);

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

          {/* Procedência das edificações 3D — centralizada, entre os controles
              de camada (à esquerda) e os de zoom (à direita). */}
          <div
            className="absolute left-1/2 flex -translate-x-1/2 justify-center transition-[bottom] duration-300"
            style={{ bottom: isMobile ? layerButtonBottom : "18px" }}
          >
            <BuildingsNote count={buildingCount} />
          </div>

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
          snap={sheetSnap}
          onSnapChange={setSheetSnap}
          onClose={handleClose}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  );
}
