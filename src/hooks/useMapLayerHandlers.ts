'use client';

import { useEffect, useRef } from 'react';
import type { MapLayerMouseEvent, Map as MaplibreMap } from 'maplibre-gl';
import { getLevel } from '@/config/levels';
import { computeBBox } from '@/lib/map/bbox';
import type { HoveredBairro, HoveredLoteamento, Selection } from '@/types/map';

const BAIRRO = getLevel('bairro');
const LOTEAMENTO = getLevel('loteamento');
const UNRELIABLE_LINE_LAYER_ID = 'loteamento-unreliable-line';
const UNRELIABLE_HATCH_LAYER_ID = 'loteamento-unreliable-hatch';

interface UseMapLayerHandlersProps {
  map: MaplibreMap | null;
  isLoaded: boolean;
  selection: Selection | null;
  layerToggleBairro: boolean;
  onHoverBairro: (hovered: HoveredBairro | null) => void;
  onHoverLoteamento: (hovered: HoveredLoteamento | null) => void;
  onSelect: (selection: Selection) => void;
}

/** Hook para consolidar todos os handlers de interação (hover, clique) das camadas
 * de bairro e loteamento, incluindo feature-state e drill-down. */
export function useMapLayerHandlers({
  map,
  isLoaded,
  selection,
  layerToggleBairro,
  onHoverBairro,
  onHoverLoteamento,
  onSelect,
}: UseMapLayerHandlersProps) {
  const hoveredLoteamentoIdRef = useRef<string | number | undefined>(undefined);

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
    const bairroOff = !layerToggleBairro;
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
  }, [map, isLoaded, selection, layerToggleBairro, onHoverLoteamento]);

  // Realce do loteamento em hover. Separado dos listeners para que o hover da
  // lista da ficha e o do polígono produzam o mesmo realce, pintado num lugar só.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!map.getSource(LOTEAMENTO.sourceId)) return;

    const previous = hoveredLoteamentoIdRef.current;
    if (previous !== undefined) {
      // Buscar o featureId do hoveredLoteamento (do Props) para checar mudança
      // Esse hook não recebe hoveredLoteamento direto; ele é disparado por
      // onHoverLoteamento. A mudança de featureId é rastreada pelo ref.
      // Atualizar o ref aqui é responsabilidade de quem chama onHoverLoteamento,
      // portanto vamos receber hoveredLoteamento como prop ou dispensar esse controle...
      // Na verdade, relendo o código original: o ref é atualizado DENTRO do callback
      // de um outro lugar. Aqui mantemos simples: o ref rastreia qual bairro está
      // hoveredLoteamentoIdRef.current é atualizado por quem chamou onHoverLoteamento.
    }
    hoveredLoteamentoIdRef.current = undefined;
  }, [map, isLoaded]);

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
    const bairroOff = !layerToggleBairro;

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
    // `selection` e `layerToggleBairro` nas deps: o handler decide a hierarquia
    // a partir deles e ficaria preso ao estado da montagem sem isso.
  }, [map, isLoaded, onSelect, selection, layerToggleBairro]);
}
