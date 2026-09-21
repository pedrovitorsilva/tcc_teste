'use client';

import { useEffect, useRef } from 'react';
import type { FeatureCollection } from 'geojson';
import type {
  ExpressionSpecification,
  GeoJSONSource,
  MapLayerMouseEvent,
  Map as MaplibreMap,
} from 'maplibre-gl';
import { useMap } from '@/components/ui/map';
import { getLevel } from '@/config/levels';
import { SELECTION_PITCH } from '@/config/buildings';
import { computeBBox } from '@/lib/map/bbox';
import { canvasToImageData, createHatchPatternCanvas } from '@/lib/map/hachurePattern';
import type { ThemeName } from '@/lib/color/theme';
import type {
  HoveredBairro,
  HoveredLoteamento,
  PreviewTarget,
  Selection,
} from '@/types/map';
import type { ThemeTokens } from '@/hooks/useThemeTokens';

const HATCH_IMAGE_ID = 'uncertain-hatch';

const BAIRRO = getLevel('bairro');
const LOTEAMENTO = getLevel('loteamento');
const SETOR = getLevel('setor');

const UNRELIABLE_LINE_LAYER_ID = 'loteamento-unreliable-line';
const UNRELIABLE_HATCH_LAYER_ID = 'loteamento-unreliable-hatch';

/** Halo (efeito de brilho - linha larga e borrada sob a nítida), só no tema escuro — ver docs/DECISOES-TECNICAS.md §2. */
const GLOW_LAYER_IDS = {
  bairro: 'bairro-glow',
  loteamento: 'loteamento-glow',
  setor: 'setor-glow',
} as const;

/** Multiplicador da espessura da linha nítida para a largura do halo. */
const GLOW_WIDTH_FACTOR = 6;
const GLOW_BLUR = 8;

/** Cria ou ignora (idempotente) uma source GeoJSON. */
function ensureSource(
  map: MaplibreMap,
  sourceId: string,
  data: FeatureCollection | string
) {
  if (map.getSource(sourceId)) return;
  map.addSource(sourceId, {
    type: 'geojson',
    data,
    generateId: true,
  });
}

/** Cria ou ignora (idempotente) uma fill layer. */
function ensureFillLayer(
  map: MaplibreMap,
  id: string,
  sourceId: string,
  opts?: { visible?: boolean; filter?: ExpressionSpecification }
) {
  if (map.getLayer(id)) return;
  map.addLayer({
    id,
    type: 'fill',
    source: sourceId,
    ...(opts?.filter ? { filter: opts.filter } : {}),
    ...(opts?.visible ? {} : { layout: { visibility: 'none' } }),
    paint: { 'fill-color': '#000000', 'fill-opacity': 0 },
  });
}

/** Cria ou ignora (idempotente) o efeito de brilho, só visível no tema escuro (ver §2).
 * Sempre criado oculto; visibilidade real é decidida pelos efeitos de estado abaixo. */
function ensureGlowLayer(
  map: MaplibreMap,
  id: string,
  sourceId: string,
  lineWidth: number
) {
  if (map.getLayer(id)) return;
  map.addLayer({
    id,
    type: 'line',
    source: sourceId,
    layout: { visibility: 'none' },
    paint: {
      'line-color': '#000000',
      'line-width': lineWidth * GLOW_WIDTH_FACTOR,
      'line-blur': GLOW_BLUR,
      'line-opacity': 0,
    },
  });
}

/** Cria ou ignora (idempotente) uma line layer. */
function ensureLineLayer(
  map: MaplibreMap,
  id: string,
  sourceId: string,
  lineWidth: number,
  opts?: { visible?: boolean; filter?: ExpressionSpecification; dasharray?: number[] }
) {
  if (map.getLayer(id)) return;
  map.addLayer({
    id,
    type: 'line',
    source: sourceId,
    ...(opts?.filter ? { filter: opts.filter } : {}),
    ...(opts?.visible ? {} : { layout: { visibility: 'none' } }),
    paint: {
      'line-color': '#000000',
      'line-width': lineWidth,
      ...(opts?.dasharray ? { 'line-dasharray': opts.dasharray } : {}),
    },
  });
}

/** Sincroniza visibilidade, largura e opacidade do halo com o estado atual.
 * Chamado por 3 efeitos (bairro, loteamento, setor) e factorizado para evitar duplicação. */
function syncGlowLayer(
  map: MaplibreMap,
  glowLayerId: string,
  opts: {
    visible: boolean;
    lineOpacity: ExpressionSpecification | number;
    lineWidth?: ExpressionSpecification | number;
  }
) {
  map.setLayoutProperty(glowLayerId, 'visibility', opts.visible ? 'visible' : 'none');
  if (opts.lineWidth !== undefined) {
    map.setPaintProperty(glowLayerId, 'line-width', opts.lineWidth);
  }
  map.setPaintProperty(glowLayerId, 'line-opacity', opts.lineOpacity);
}

// Intensidade por estado no tema escuro. `dim` = "outra coisa está selecionada".
// Malha inteira acesa vira ruído — ver docs/DECISOES-TECNICAS.md §2.
const NIGHT_LINE = { active: 1, idle: 0.42, dim: 0.14 };
const NIGHT_GLOW = { active: 0.9, idle: 0.14, dim: 0.03 };
const NIGHT_WIDTH = { activeFactor: 1.5, idleFactor: 0.7 };

// Alias só pro setor: fill layer é nova (ver comentário na criação) e é referenciada em 3 efeitos diferentes.
const SETOR_FILL_LAYER_ID = SETOR.fillLayerId;

/** Placeholder na criação da source; o GeoJSON real entra por `setData()` (efeito abaixo). */
const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] };

// Opacidades de preenchimento. Valores medidos, não escolhidos: alpha mistura
// luz e pode inverter a rampa do tema escuro — ver docs/DECISOES-TECNICAS.md §1.
const SETOR_FILL_OPACITY: Record<ThemeName, number> = {
  dark: 0.16,
  light: 0.1,
  vintage: 0.14,
};
const LOTEAMENTO_FILL_OPACITY: Record<
  ThemeName,
  { reliable: number; unreliable: number; hover: number; preview: number }
> = {
  dark: { reliable: 0.1, unreliable: 0.14, hover: 0.28, preview: 0.26 },
  // Mais leve que Antigo: o azul é escuro e fecharia o polígono na opacidade do sépia.
  light: { reliable: 0.18, unreliable: 0.12, hover: 0.3, preview: 0.28 },
  vintage: { reliable: 0.28, unreliable: 0.18, hover: 0.42, preview: 0.4 },
};

interface MapLayersProps {
  theme: ThemeName;
  tokens: ThemeTokens;
  /**
   * GeoJSON já buscado por `useGeoIndex` (`null` até resolver). Objeto e não URL,
   * para o MapLibre não rebuscar o arquivo — docs/ARQUITETURA-CODIGO-E-MELHORIAS.md §4.2.
   * Setor não tem consumidor duplo e segue por URL.
   */
  bairroData: FeatureCollection | null;
  loteamentoData: FeatureCollection | null;
  layerToggles: { bairro: boolean; loteamento: boolean; setor: boolean };
  selection: Selection | null;
  hoveredBairro: HoveredBairro | null;
  /** Vem do mapa ou da lista da ficha — ver HoveredLoteamento. */
  hoveredLoteamento: HoveredLoteamento | null;
  previewTarget: PreviewTarget | null;
  onHoverBairro: (hovered: HoveredBairro | null) => void;
  onHoverLoteamento: (hovered: HoveredLoteamento | null) => void;
  onSelect: (selection: Selection) => void;
  /** Padding for `fitBounds`; on mobile it's asymmetric so selection rises above the sheet. */
  fitPadding?: number | { top: number; bottom: number; left: number; right: number };
}

export function MapLayers({
  theme,
  tokens,
  bairroData,
  loteamentoData,
  layerToggles,
  selection,
  hoveredBairro,
  hoveredLoteamento,
  previewTarget,
  onHoverBairro,
  onHoverLoteamento,
  onSelect,
  fitPadding = 40,
}: MapLayersProps) {
  const { map, isLoaded } = useMap();
  const hoveredLoteamentoIdRef = useRef<string | number | undefined>(undefined);

  // Cria sources e camadas. Idempotente: trocar de tema recarrega o style e
  // apaga tudo que não veio dele, então este efeito roda de novo e recria.
  useEffect(() => {
    if (!map || !isLoaded) return;

    ensureSource(map, BAIRRO.sourceId, EMPTY_FC);
    ensureFillLayer(map, BAIRRO.fillLayerId, BAIRRO.sourceId, { visible: true });
    ensureGlowLayer(map, GLOW_LAYER_IDS.bairro, BAIRRO.sourceId, BAIRRO.lineWidth);
    ensureLineLayer(map, BAIRRO.lineLayerId, BAIRRO.sourceId, BAIRRO.lineWidth, { visible: true });

    ensureSource(map, LOTEAMENTO.sourceId, EMPTY_FC);
    ensureFillLayer(map, LOTEAMENTO.fillLayerId, LOTEAMENTO.sourceId);
    ensureFillLayer(map, UNRELIABLE_HATCH_LAYER_ID, LOTEAMENTO.sourceId, {
      filter: ['==', ['get', 'is_reliable'], false],
    });
    ensureGlowLayer(map, GLOW_LAYER_IDS.loteamento, LOTEAMENTO.sourceId, LOTEAMENTO.lineWidth);
    ensureLineLayer(map, LOTEAMENTO.lineLayerId, LOTEAMENTO.sourceId, LOTEAMENTO.lineWidth, {
      filter: ['!=', ['get', 'is_reliable'], false],
    });
    ensureLineLayer(map, UNRELIABLE_LINE_LAYER_ID, LOTEAMENTO.sourceId, LOTEAMENTO.lineWidth, {
      filter: ['==', ['get', 'is_reliable'], false],
      dasharray: [6, 4],
    });

    // Preenchimento do setor: o id já existia em config/levels.ts mas a camada
    // nunca chegou a ser criada, porque até aqui o setor era só contorno.
    // Entra para o gradiente de granularidade do tema escuro ler como áreas, e
    // não apenas como traços — por isso fica invisível nos outros dois temas.
    ensureSource(map, SETOR.sourceId, SETOR.url);
    ensureFillLayer(map, SETOR_FILL_LAYER_ID, SETOR.sourceId);
    ensureGlowLayer(map, GLOW_LAYER_IDS.setor, SETOR.sourceId, SETOR.lineWidth);
    ensureLineLayer(map, SETOR.lineLayerId, SETOR.sourceId, SETOR.lineWidth, {
      dasharray: SETOR.dashArray ?? [2, 3],
    });
  }, [map, isLoaded]);

  // Preenche as sources vazias com o GeoJSON já buscado. Efeito separado da
  // criação para não fazê-la esperar o fetch; roda de novo a cada troca de
  // tema (via `isLoaded`), sem rebuscar nada.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (bairroData) {
      (map.getSource(BAIRRO.sourceId) as GeoJSONSource | undefined)?.setData(bairroData);
    }
    if (loteamentoData) {
      (map.getSource(LOTEAMENTO.sourceId) as GeoJSONSource | undefined)?.setData(loteamentoData);
    }
  }, [map, isLoaded, bairroData, loteamentoData]);

  // Textura de hachura (tema "vintage" apenas) — precisa existir como imagem
  // do MapLibre antes que a layer que a referencia possa ficar visível.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (theme === 'vintage') {
      const canvas = createHatchPatternCanvas(tokens.uncertain, 8);
      if (map.hasImage(HATCH_IMAGE_ID)) map.removeImage(HATCH_IMAGE_ID);
      map.addImage(HATCH_IMAGE_ID, canvasToImageData(canvas), { pixelRatio: 2 });
    } else if (map.getLayer(UNRELIABLE_HATCH_LAYER_ID)) {
      map.setLayoutProperty(UNRELIABLE_HATCH_LAYER_ID, 'visibility', 'none');
      if (map.hasImage(HATCH_IMAGE_ID)) map.removeImage(HATCH_IMAGE_ID);
    }
  }, [map, isLoaded, theme, tokens.uncertain]);

  // Sincroniza a cor de todas as camadas (fill, linha, halo) com os tokens do tema ativo.
  // Roda de novo a cada troca de tema; sai cedo se as camadas ainda não existem neste ciclo
  // (efeito de criação acima ainda não rodou).
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!map.getLayer(BAIRRO.fillLayerId)) return; // ainda não criadas neste ciclo

    map.setPaintProperty(BAIRRO.fillLayerId, 'fill-color', tokens.accentWash);
    map.setPaintProperty(BAIRRO.lineLayerId, 'line-color', tokens.bairro);

    const loteamentoColor: ExpressionSpecification = [
      'case',
      ['==', ['get', 'is_reliable'], false],
      tokens.uncertain,
      tokens.loteamento,
    ];
    map.setPaintProperty(LOTEAMENTO.fillLayerId, 'fill-color', loteamentoColor);
    map.setPaintProperty(LOTEAMENTO.lineLayerId, 'line-color', tokens.loteamento);
    map.setPaintProperty(UNRELIABLE_LINE_LAYER_ID, 'line-color', tokens.uncertain);

    if (map.getLayer(UNRELIABLE_HATCH_LAYER_ID) && map.hasImage(HATCH_IMAGE_ID)) {
      map.setPaintProperty(UNRELIABLE_HATCH_LAYER_ID, 'fill-pattern', HATCH_IMAGE_ID);
    }

    map.setPaintProperty(SETOR.lineLayerId, 'line-color', tokens.setor);
    map.setPaintProperty(SETOR_FILL_LAYER_ID, 'fill-color', tokens.setor);

    // Halo na mesma cor da linha que ele envolve — é a própria luz do nível
    // espalhada, não uma cor à parte.
    map.setPaintProperty(GLOW_LAYER_IDS.bairro, 'line-color', tokens.bairro);
    map.setPaintProperty(GLOW_LAYER_IDS.loteamento, 'line-color', loteamentoColor);
    map.setPaintProperty(GLOW_LAYER_IDS.setor, 'line-color', tokens.setor);
  }, [map, isLoaded, tokens]);

  // Visibilidade/realce de bairros: hover, seleção ("locked"), preview de busca.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!map.getLayer(BAIRRO.fillLayerId)) return;

    // "Locked" = bairro selecionado ou bairro-pai do loteamento selecionado.
    // Casa por id; só usa nome quando é a única informação disponível
    // (`parentBairro` vem como string) — ver docs/DECISOES-TECNICAS.md §2.
    const isBairroLocked: ExpressionSpecification = [
      'any',
      selection?.level === 'bairro'
        ? (['==', ['id'], selection.featureId] as ExpressionSpecification)
        : false,
      selection?.level === 'loteamento' && selection.parentBairro
        ? (['==', ['get', 'name'], selection.parentBairro] as ExpressionSpecification)
        : false,
    ];
    const isBairroPreview: ExpressionSpecification | boolean =
      previewTarget?.level === 'bairro'
        ? ['==', ['id'], previewTarget.featureId]
        : false;
    const isLocked = selection !== null;

    const isNight = theme === 'dark';

    // À noite o bairro selecionado engrossa; nos outros temas afina (1.1 vs 1.6).
    // Ver docs/DECISOES-TECNICAS.md §2.
    const lineWidth: ExpressionSpecification = [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      BAIRRO.lineWidthHover,
      isBairroPreview,
      BAIRRO.lineWidthPreview,
      isBairroLocked,
      isNight ? BAIRRO.lineWidth * NIGHT_WIDTH.activeFactor : 1.1,
      isNight ? BAIRRO.lineWidth * NIGHT_WIDTH.idleFactor : BAIRRO.lineWidth,
    ];

    const dimOpacity: ExpressionSpecification = [
      'case',
      isBairroPreview,
      1,
      isBairroLocked,
      1,
      isLocked,
      isNight ? NIGHT_LINE.dim : 0.28,
      isNight ? NIGHT_LINE.idle : 1,
    ];

    // Preenchimento é presença, não foco: não acompanha a atenuação do contorno,
    // senão o bairro sumiria inteiro quando outro estivesse selecionado.
    const fillOpacity: ExpressionSpecification = isNight
      ? ['case', isBairroPreview, 1, isBairroLocked, 1, isLocked, 0.35, 1]
      : dimOpacity;

    const glowOpacity: ExpressionSpecification = [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      NIGHT_GLOW.active,
      isBairroPreview,
      NIGHT_GLOW.active,
      isBairroLocked,
      NIGHT_GLOW.active,
      isLocked,
      NIGHT_GLOW.dim,
      NIGHT_GLOW.idle,
    ];

    map.setPaintProperty(BAIRRO.lineLayerId, 'line-width', lineWidth);
    map.setPaintProperty(BAIRRO.lineLayerId, 'line-opacity', dimOpacity);
    map.setPaintProperty(BAIRRO.fillLayerId, 'fill-opacity', fillOpacity);
    map.setLayoutProperty(
      BAIRRO.fillLayerId,
      'visibility',
      layerToggles.bairro ? 'visible' : 'none'
    );
    map.setLayoutProperty(
      BAIRRO.lineLayerId,
      'visibility',
      layerToggles.bairro ? 'visible' : 'none'
    );
    syncGlowLayer(map, GLOW_LAYER_IDS.bairro, {
      visible: layerToggles.bairro && isNight,
      lineWidth: ['*', lineWidth, GLOW_WIDTH_FACTOR] as ExpressionSpecification,
      lineOpacity: glowOpacity,
    });
  }, [map, isLoaded, theme, selection, previewTarget, layerToggles.bairro]);

  // Visibilidade dos loteamentos: toggle global, hover ou seleção do bairro-pai.
  // O preview da busca ignora todas essas condições.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!map.getLayer(LOTEAMENTO.fillLayerId)) return;

    const lockedBairroName =
      selection?.level === 'bairro'
        ? selection.name
        : selection?.parentBairro ?? null;
    const hoveredBairroName = !selection ? hoveredBairro?.name ?? null : null;
    const previewLotName =
      previewTarget?.level === 'loteamento' ? previewTarget.name : null;

    const showCondition: ExpressionSpecification = [
      'any',
      layerToggles.loteamento,
      hoveredBairroName
        ? ['==', hoveredBairroName, ['get', 'parentBairro']]
        : false,
      lockedBairroName
        ? ['==', lockedBairroName, ['get', 'parentBairro']]
        : false,
    ];

    // Por id, não por nome: há loteamentos homônimos de bairros no dataset.
    const isPreview: ExpressionSpecification | boolean =
      previewTarget?.level === 'loteamento'
        ? ['==', ['id'], previewTarget.featureId]
        : false;
    const isActive: ExpressionSpecification | boolean =
      selection?.level === 'loteamento'
        ? ['==', ['id'], selection.featureId]
        : false;

    // Condicionado a `showCondition` para que um hover remanescente nunca
    // acenda um loteamento que não deveria estar visível.
    const isHovered: ExpressionSpecification = [
      'all',
      ['boolean', ['feature-state', 'hover'], false],
      showCondition,
    ];

    const isNight = theme === 'dark';
    const fillOpacities = LOTEAMENTO_FILL_OPACITY[theme];
    const fillOpacity: ExpressionSpecification = [
      'case',
      isHovered,
      fillOpacities.hover,
      isPreview,
      fillOpacities.preview,
      showCondition,
      ['case', ['==', ['get', 'is_reliable'], false], fillOpacities.unreliable, fillOpacities.reliable],
      0,
    ];
    const lineWidth: ExpressionSpecification = [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      LOTEAMENTO.lineWidthHover,
      isPreview,
      LOTEAMENTO.lineWidthPreview,
      isActive,
      LOTEAMENTO.lineWidthHover,
      isNight ? LOTEAMENTO.lineWidth * NIGHT_WIDTH.idleFactor : LOTEAMENTO.lineWidth,
    ];
    // À noite só hover, preview ou seleção acendem o contorno por completo.
    const lineOpacity: ExpressionSpecification = [
      'case',
      isPreview,
      1,
      isActive,
      1,
      isHovered,
      1,
      showCondition,
      isNight ? NIGHT_LINE.idle : 1,
      0,
    ];
    const glowOpacity: ExpressionSpecification = [
      'case',
      isPreview,
      NIGHT_GLOW.active,
      isActive,
      NIGHT_GLOW.active,
      isHovered,
      NIGHT_GLOW.active,
      showCondition,
      NIGHT_GLOW.idle,
      0,
    ];
   

    const unreliableLineWidthForFallback = (fallback: number): ExpressionSpecification => [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      LOTEAMENTO.lineWidthHover,
      isPreview,
      LOTEAMENTO.lineWidthPreview,
      isActive,
      LOTEAMENTO.lineWidthHover,
      fallback,
    ];
    const unreliableLineWidth: ExpressionSpecification = [
      'interpolate',
      ['linear'],
      ['zoom'],
      10,
      unreliableLineWidthForFallback(1.6),
      15,
      unreliableLineWidthForFallback(LOTEAMENTO.lineWidth),
    ];

    map.setPaintProperty(LOTEAMENTO.fillLayerId, 'fill-opacity', fillOpacity);
    map.setPaintProperty(LOTEAMENTO.lineLayerId, 'line-width', lineWidth);
    map.setPaintProperty(LOTEAMENTO.lineLayerId, 'line-opacity', lineOpacity);
    map.setPaintProperty(UNRELIABLE_LINE_LAYER_ID, 'line-width', unreliableLineWidth);
    map.setPaintProperty(UNRELIABLE_LINE_LAYER_ID, 'line-opacity', lineOpacity);
    map.setPaintProperty(
      UNRELIABLE_HATCH_LAYER_ID,
      'fill-opacity',
      theme === 'vintage'
        ? (['case', showCondition, 0.85, isPreview, 0.85, 0] as ExpressionSpecification)
        : 0
    );

    const visible = layerToggles.loteamento || hoveredBairroName !== null || lockedBairroName !== null;
    const visibility = visible ? 'visible' : 'none';
    map.setLayoutProperty(LOTEAMENTO.fillLayerId, 'visibility', visibility);
    map.setLayoutProperty(LOTEAMENTO.lineLayerId, 'visibility', visibility);
    map.setLayoutProperty(UNRELIABLE_LINE_LAYER_ID, 'visibility', visibility);
    syncGlowLayer(map, GLOW_LAYER_IDS.loteamento, {
      visible: visible && isNight,
      lineWidth: ['*', lineWidth, GLOW_WIDTH_FACTOR] as ExpressionSpecification,
      lineOpacity: glowOpacity,
    });
    map.setLayoutProperty(
      UNRELIABLE_HATCH_LAYER_ID,
      'visibility',
      visible && theme === 'vintage' ? 'visible' : 'none'
    );
    // Preview isolado (busca) pode acontecer mesmo com tudo desligado —
    // força a camada visível nesse caso específico.
    if (!visible && previewLotName) {
      map.setLayoutProperty(LOTEAMENTO.fillLayerId, 'visibility', 'visible');
      map.setLayoutProperty(LOTEAMENTO.lineLayerId, 'visibility', 'visible');
      map.setLayoutProperty(UNRELIABLE_LINE_LAYER_ID, 'visibility', 'visible');
    }
  }, [
    map,
    isLoaded,
    theme,
    selection,
    hoveredBairro,
    previewTarget,
    layerToggles.loteamento,
  ]);

  // Setores censitários: visibilidade por toggle. Com Loteamentos também ligado,
  // o setor perde opacidade para os traçados sobrepostos não ficarem densos demais.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!map.getLayer(SETOR.lineLayerId)) return;
    const visibility = layerToggles.setor ? 'visible' : 'none';
    const isNight = theme === 'dark';
    // Camada de referência, sem estado de seleção. À noite fica sempre no nível
    // "leve", para não competir com bairro e loteamento acesos.
    const baseOpacity = layerToggles.loteamento ? 0.55 : 1;
    const lineOpacity = isNight ? baseOpacity * NIGHT_LINE.idle : baseOpacity;

    map.setLayoutProperty(SETOR.lineLayerId, 'visibility', visibility);
    map.setPaintProperty(SETOR.lineLayerId, 'line-opacity', lineOpacity);

    map.setLayoutProperty(
      SETOR_FILL_LAYER_ID,
      'visibility',
      layerToggles.setor && isNight ? 'visible' : 'none'
    );
    map.setPaintProperty(SETOR_FILL_LAYER_ID, 'fill-opacity', SETOR_FILL_OPACITY[theme]);
    syncGlowLayer(map, GLOW_LAYER_IDS.setor, {
      visible: layerToggles.setor && isNight,
      lineOpacity: baseOpacity * NIGHT_GLOW.idle,
    });
  }, [map, isLoaded, theme, layerToggles.setor, layerToggles.loteamento]);

  // Hover no bairro (só quando nada está selecionado) + clique = seleção.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!map.getLayer(BAIRRO.fillLayerId)) return;

    let hoveredFeatureId: string | number | undefined;

    const clearHover = () => {
      if (hoveredFeatureId !== undefined) {
        map.setFeatureState(
          { source: BAIRRO.sourceId, id: hoveredFeatureId },
          { hover: false }
        );
        hoveredFeatureId = undefined;
      }
      onHoverBairro(null);
      map.getCanvas().style.cursor = '';
    };

    const handleMouseMove = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;

      if (hoveredFeatureId !== undefined && hoveredFeatureId !== feature.id) {
        map.setFeatureState(
          { source: BAIRRO.sourceId, id: hoveredFeatureId },
          { hover: false }
        );
      }
      hoveredFeatureId = feature.id;
      map.setFeatureState(
        { source: BAIRRO.sourceId, id: hoveredFeatureId },
        { hover: true }
      );

      if (!selection && feature.id !== undefined) {
        onHoverBairro({
          featureId: feature.id,
          name: String(feature.properties?.name ?? ''),
        });
      }
      map.getCanvas().style.cursor = 'pointer';
    };

    map.on('mousemove', BAIRRO.fillLayerId, handleMouseMove);
    map.on('mouseleave', BAIRRO.fillLayerId, clearHover);

    return () => {
      map.off('mousemove', BAIRRO.fillLayerId, handleMouseMove);
      map.off('mouseleave', BAIRRO.fillLayerId, clearHover);
      clearHover();
    };
  }, [map, isLoaded, selection, onHoverBairro]);

  // Hover de loteamento vindo do mapa. Segue a hierarquia do clique: exige um
  // bairro em contexto, exceto com o toggle "Bairros" desligado (§2).
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!map.getLayer(LOTEAMENTO.fillLayerId)) return;

    const activeBairro =
      selection?.level === 'bairro' ? selection.name : (selection?.parentBairro ?? null);
    const bairroOff = !layerToggles.bairro;
    if (!activeBairro && !bairroOff) return;

    const handleMove = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature || feature.id === undefined) return;
      const props = feature.properties ?? {};
      const parentBairro =
        typeof props.parentBairro === 'string' ? props.parentBairro : undefined;
      if (!bairroOff && parentBairro !== activeBairro) return;
      onHoverLoteamento({
        featureId: feature.id,
        name: String(props.name ?? ''),
        parentBairro,
      });
    };
    const handleLeave = () => onHoverLoteamento(null);

    const layers = [LOTEAMENTO.fillLayerId, UNRELIABLE_HATCH_LAYER_ID];
    for (const layer of layers) {
      if (!map.getLayer(layer)) continue;
      map.on('mousemove', layer, handleMove);
      map.on('mouseleave', layer, handleLeave);
    }

    return () => {
      for (const layer of layers) {
        map.off('mousemove', layer, handleMove);
        map.off('mouseleave', layer, handleLeave);
      }
      onHoverLoteamento(null);
    };
  }, [map, isLoaded, selection, layerToggles.bairro, onHoverLoteamento]);

  // Realce do loteamento em hover. Separado dos listeners para que o hover da
  // lista da ficha e o do polígono produzam o mesmo realce, pintado num lugar só.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!map.getSource(LOTEAMENTO.sourceId)) return;

    const previous = hoveredLoteamentoIdRef.current;
    if (previous !== undefined && previous !== hoveredLoteamento?.featureId) {
      map.setFeatureState({ source: LOTEAMENTO.sourceId, id: previous }, { hover: false });
    }
    if (hoveredLoteamento) {
      map.setFeatureState(
        { source: LOTEAMENTO.sourceId, id: hoveredLoteamento.featureId },
        { hover: true }
      );
    }
    hoveredLoteamentoIdRef.current = hoveredLoteamento?.featureId;
  }, [map, isLoaded, hoveredLoteamento]);

  // Clique no mapa = seleção. Handler único global, consultando loteamento antes
  // de bairro: um listener por layer faz o bairro roubar o clique — §2.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!map.getLayer(LOTEAMENTO.fillLayerId) || !map.getLayer(BAIRRO.fillLayerId)) return;

    // Bairro em contexto: o selecionado, ou o pai do loteamento selecionado.
    const activeBairro =
      selection?.level === 'bairro' ? selection.name : (selection?.parentBairro ?? null);
    // Com "Bairros" desligado não há contexto possível: qualquer loteamento
    // visível vira clicável direto.
    const bairroOff = !layerToggles.bairro;

    const handleClick = (e: MapLayerMouseEvent) => {
      const loteamentoFeature = map.queryRenderedFeatures(e.point, {
        layers: [LOTEAMENTO.fillLayerId, UNRELIABLE_HATCH_LAYER_ID],
      })[0];
      if (loteamentoFeature && loteamentoFeature.id !== undefined) {
        const props = loteamentoFeature.properties ?? {};
        const parentBairro =
          typeof props.parentBairro === 'string' ? props.parentBairro : undefined;

        // Hierarquia: sem o bairro em contexto, o clique cai para o bairro-pai;
        // o segundo clique é que desce para o loteamento. A busca por texto não
        // passa por aqui e salta direto. Ver docs/DECISOES-TECNICAS.md §2.
        if (parentBairro !== undefined && (bairroOff || activeBairro === parentBairro)) {
          onSelect({
            level: 'loteamento',
            featureId: loteamentoFeature.id,
            name: String(props.name ?? ''),
            properties: props,
            parentBairro,
            bbox: computeBBox(loteamentoFeature.geometry),
          });
          map.getCanvas().style.cursor = '';
          return;
        }
      }

      // Sem fallback de bairro com a camada desligada: clique em área vazia não
      // deve selecionar um bairro invisível.
      if (bairroOff) return;

      const bairroFeature = map.queryRenderedFeatures(e.point, {
        layers: [BAIRRO.fillLayerId],
      })[0];
      if (!bairroFeature || bairroFeature.id === undefined) return;
      onSelect({
        level: 'bairro',
        featureId: bairroFeature.id,
        name: String(bairroFeature.properties?.name ?? ''),
        properties: bairroFeature.properties ?? {},
        bbox: computeBBox(bairroFeature.geometry),
      });
    };

    const handleEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const handleLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', handleClick);
    map.on('mouseenter', LOTEAMENTO.fillLayerId, handleEnter);
    map.on('mouseleave', LOTEAMENTO.fillLayerId, handleLeave);

    return () => {
      map.off('click', handleClick);
      map.off('mouseenter', LOTEAMENTO.fillLayerId, handleEnter);
      map.off('mouseleave', LOTEAMENTO.fillLayerId, handleLeave);
    };
    // `selection` e `layerToggles.bairro` nas deps: o handler decide a hierarquia
    // a partir deles e ficaria preso ao estado da montagem sem isso.
  }, [map, isLoaded, onSelect, selection, layerToggles.bairro]);

  // Enquadra a seleção. A bbox vem pronta (a source só enxerga tiles
  // renderizados e devolveria geometria fragmentada) e o pitch entra junto,
  // porque extrusão de topo lê como preenchimento — §2.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!selection) {
      if (map.getPitch() !== 0) map.easeTo({ pitch: 0, duration: 800 });
      return;
    }
    if (!selection.bbox) return;
    map.fitBounds(selection.bbox, {
      padding: fitPadding,
      duration: 800,
      pitch: SELECTION_PITCH,
    });
  }, [map, isLoaded, selection]);

  return null;
}
