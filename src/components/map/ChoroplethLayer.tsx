"use client";

import { useEffect } from "react";
import type { GeoJSONSource } from "maplibre-gl";
import { useMap } from "@/components/ui/map";
import { CHOROPLETH_OPACITY } from "@/config/visualizacoes";
import { expressaoCor } from "@/lib/map/choropleth";
import { GLOW_LAYER_IDS } from "@/lib/map/layerHelpers";
import type { Choropleth } from "@/hooks/useChoropleth";

const SOURCE_ID = "choropleth-source";
const LAYER_ID = "choropleth-fill";

/**
 * Preenchimento do mapa de calor. Entra logo acima do fill de bairro (sob o
 * halo e todas as linhas), então limites e 3D seguem legíveis por cima.
 * Renderizar depois de <MapLayers>: o `beforeId` precisa já existir.
 */
export function ChoroplethLayer({ choropleth }: { choropleth: Choropleth | null }) {
  const { map, isLoaded } = useMap();
  const ativo = choropleth !== null;

  useEffect(() => {
    if (!map || !isLoaded || !ativo) return;

    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    }
    if (!map.getLayer(LAYER_ID)) {
      const beforeId = map.getLayer(GLOW_LAYER_IDS.bairro) ? GLOW_LAYER_IDS.bairro : undefined;
      map.addLayer(
        { id: LAYER_ID, type: "fill", source: SOURCE_ID, paint: { "fill-opacity": CHOROPLETH_OPACITY } },
        beforeId,
      );
    }

    return () => {
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map, isLoaded, ativo]);

  // Geometria só quando os dados mudam (variável); trocar de tema mantém `data`
  // e reaplica só as cores no efeito abaixo.
  const data = choropleth?.data;
  useEffect(() => {
    if (!map || !isLoaded || !data || !map.getLayer(LAYER_ID)) return;
    (map.getSource(SOURCE_ID) as GeoJSONSource).setData(data);
  }, [map, isLoaded, data]);

  useEffect(() => {
    if (!map || !isLoaded || !choropleth || !map.getLayer(LAYER_ID)) return;
    map.setPaintProperty(
      LAYER_ID,
      "fill-color",
      expressaoCor(choropleth.quebras, choropleth.cores, choropleth.semDado),
    );
  }, [map, isLoaded, choropleth]);

  return null;
}
