"use client";

// Fonte das edificações 3D: Overture Maps, por HTTP range request.
import { useEffect, useMemo, useRef } from "react";
import type { FeatureCollection, Geometry } from "geojson";
import type { GeoJSONSource, MapSourceDataEvent } from "maplibre-gl";
import { useMap } from "@/components/ui/map";
import {
  BUILDINGS_ATTRIBUTION,
  BUILDINGS_CLIP_LAYER_ID,
  BUILDINGS_CLIP_SOURCE_ID,
  BUILDINGS_MIN_ZOOM,
  BUILDINGS_PMTILES_URL,
  BUILDINGS_PROBE_LAYER_ID,
  BUILDINGS_SOURCE_ID,
  BUILDINGS_SOURCE_LAYER,
  BUILDING_EXTRUSION_OPACITY,
} from "@/config/buildings";
import {
  approxAreaM2,
  lodMinAreaM2,
  outerRing,
  pointInPolygon,
  ringCentroid,
  syntheticHeight,
} from "@/lib/map/buildingClip";
import type { IndexedFeature } from "@/hooks/useGeoIndex";
import type { ThemeTokens } from "@/hooks/useThemeTokens";
import type { HoveredBairro, Selection } from "@/types/map";

const EMPTY: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const CLIP_DEBOUNCE_MS = 120;

interface Buildings3DProps {
  tokens: ThemeTokens;
  /** Liga/desliga a exibição — off por padrão, sem nenhum request de tile. */
  enabled: boolean;
  selection: Selection | null;
  hoveredBairro: HoveredBairro | null;
  bairros: IndexedFeature[];
  loteamentos: IndexedFeature[];
  /** Informa quantas edificações estão sendo exibidas. */
  onCountChange?: (count: number) => void;
}

interface ClipTarget {
  key: string;
  geometry: Geometry;
  /** BBox usada como filtro antes do teste espacial. */
  bbox?: [number, number, number, number];
}

/** Exibe as edificações 3D do bairro ou loteamento em foco.
 *
 * Fonte das edificações 3D: Overture Maps, por HTTP e range request.
 */
export function Buildings3D({
  tokens,
  enabled,
  selection,
  hoveredBairro,
  bairros,
  loteamentos,
  onCountChange,
}: Buildings3DProps) {
  const { map, isLoaded } = useMap();

  const cacheRef = useRef(new Map<string, FeatureCollection>());
  const onCountChangeRef = useRef(onCountChange);

  onCountChangeRef.current = onCountChange;

  const target: ClipTarget | null = useMemo(() => {
    if (!enabled) return null;

    if (selection) {
      const features = selection.level === "loteamento" ? loteamentos : bairros;

      const feature = features.find(
        (item) => item.featureId === selection.featureId,
      );

      if (!feature?.geometry) return null;

      return {
        key: `${selection.level}:${selection.featureId}`,
        geometry: feature.geometry,
        bbox: feature.bbox,
      };
    }

    if (hoveredBairro) {
      const feature = bairros.find(
        (item) => item.featureId === hoveredBairro.featureId,
      );

      if (!feature?.geometry) return null;

      return {
        key: `bairro:${hoveredBairro.featureId}`,
        geometry: feature.geometry,
        bbox: feature.bbox,
      };
    }

    return null;
  }, [enabled, selection, hoveredBairro, bairros, loteamentos]);

  // Lifecycle de source/layers — só existem enquanto `enabled` é true, pra
  // não continuar baixando tiles de prédio em segundo plano com o toggle off.
  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;

    if (!map.getSource(BUILDINGS_SOURCE_ID)) {
      map.addSource(BUILDINGS_SOURCE_ID, {
        type: "vector",
        url: BUILDINGS_PMTILES_URL,
        attribution: BUILDINGS_ATTRIBUTION,
      });
    }

    // Camada invisível que mantém os tiles carregados.
    if (!map.getLayer(BUILDINGS_PROBE_LAYER_ID)) {
      map.addLayer({
        id: BUILDINGS_PROBE_LAYER_ID,
        type: "fill",
        source: BUILDINGS_SOURCE_ID,
        "source-layer": BUILDINGS_SOURCE_LAYER,
        minzoom: BUILDINGS_MIN_ZOOM,
        paint: {
          "fill-opacity": 0,
        },
      });
    }

    if (!map.getSource(BUILDINGS_CLIP_SOURCE_ID)) {
      map.addSource(BUILDINGS_CLIP_SOURCE_ID, {
        type: "geojson",
        data: EMPTY,
        promoteId: "id",
      });
    }

    if (!map.getLayer(BUILDINGS_CLIP_LAYER_ID)) {
      map.addLayer({
        id: BUILDINGS_CLIP_LAYER_ID,
        type: "fill-extrusion",
        source: BUILDINGS_CLIP_SOURCE_ID,
        minzoom: BUILDINGS_MIN_ZOOM,
        paint: {
          "fill-extrusion-color": tokens.building,
          "fill-extrusion-base": 0,
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-opacity": BUILDING_EXTRUSION_OPACITY,
          "fill-extrusion-vertical-gradient": true,
        },
      });
    }

    return () => {
      if (map.getLayer(BUILDINGS_CLIP_LAYER_ID)) map.removeLayer(BUILDINGS_CLIP_LAYER_ID);
      if (map.getSource(BUILDINGS_CLIP_SOURCE_ID)) map.removeSource(BUILDINGS_CLIP_SOURCE_ID);
      if (map.getLayer(BUILDINGS_PROBE_LAYER_ID)) map.removeLayer(BUILDINGS_PROBE_LAYER_ID);
      if (map.getSource(BUILDINGS_SOURCE_ID)) map.removeSource(BUILDINGS_SOURCE_ID);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, enabled]);

  // Atualiza a cor quando o tema mudar.
  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;
    if (!map.getLayer(BUILDINGS_CLIP_LAYER_ID)) return;

    map.setPaintProperty(BUILDINGS_CLIP_LAYER_ID, "fill-extrusion-color", tokens.building);
  }, [map, isLoaded, enabled, tokens.building]);

  // Recorte por bairro/loteamento selecionado ou em hover.
  useEffect(() => {
    if (!map || !isLoaded) return;

    const source = map.getSource(BUILDINGS_CLIP_SOURCE_ID) as
      | GeoJSONSource
      | undefined;

    if (!source) return;

    const publish = (data: FeatureCollection) => {
      source.setData(data);
      onCountChangeRef.current?.(data.features.length);
    };

    if (!target) {
      publish(EMPTY);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    const compute = () => {
      if (map.getZoom() < BUILDINGS_MIN_ZOOM) {
        publish(EMPTY);
        return;
      }

      const bounds = map.getBounds();
      const minArea = lodMinAreaM2(map.getZoom());

      const features = map.querySourceFeatures(BUILDINGS_SOURCE_ID, {
        sourceLayer: BUILDINGS_SOURCE_LAYER,
      });

      const seen = new Set<string>();
      const clipped: FeatureCollection["features"] = [];
      const { bbox } = target;

      for (const feature of features) {
        const ring = outerRing(feature.geometry);

        if (!ring) continue;

        const centroid = ringCentroid(ring);

        // Frustum culling: descarta o que está fora da tela antes do teste
        // point-in-polygon (mais caro) — importa mesmo dentro de um bairro
        // grande, quando o usuário deu pan/zoom pra ver só uma parte dele.
        if (
          centroid[0] < bounds.getWest() ||
          centroid[0] > bounds.getEast() ||
          centroid[1] < bounds.getSouth() ||
          centroid[1] > bounds.getNorth()
        ) {
          continue;
        }

        if (
          bbox &&
          (centroid[0] < bbox[0] ||
            centroid[0] > bbox[2] ||
            centroid[1] < bbox[1] ||
            centroid[1] > bbox[3])
        ) {
          continue;
        }

        if (!pointInPolygon(centroid, target.geometry)) {
          continue;
        }

        const area = approxAreaM2(ring);
        if (area < minArea) continue; // LOD: prédio pequeno demais pro zoom atual

        const id = feature.properties?.id;

        if (typeof id === "string") {
          if (seen.has(id)) continue;
          seen.add(id);
        }

        clipped.push({
          type: "Feature",
          geometry: feature.geometry,
          properties: {
            id: typeof id === "string" ? id : undefined,
            height: syntheticHeight(area),
          },
        });
      }

      const data: FeatureCollection = {
        type: "FeatureCollection",
        features: clipped,
      };

      // Apenas recortes completos entram no cache.
      if (map.isSourceLoaded(BUILDINGS_SOURCE_ID)) {
        cacheRef.current.set(target.key, data);
      }

      publish(data);
    };

    const schedule = () => {
      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(compute, CLIP_DEBOUNCE_MS);
    };

    const handleSourceData = (event: MapSourceDataEvent) => {
      if (event.sourceId === BUILDINGS_SOURCE_ID && event.isSourceLoaded) {
        schedule();
      }
    };

    const cached = cacheRef.current.get(target.key);

    if (cached) {
      publish(cached);
    } else {
      schedule();
    }

    map.on("sourcedata", handleSourceData);
    map.on("moveend", schedule);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }

      map.off("sourcedata", handleSourceData);
      map.off("moveend", schedule);
    };
  }, [map, isLoaded, target]);

  return null;
}
