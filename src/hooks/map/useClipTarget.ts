import { useMemo } from "react";
import type { Geometry } from "geojson";
import type { IndexedFeature } from "@/hooks/useGeoIndex";
import type { HoveredBairro, Selection } from "@/types/map";

/** Área em foco que recorta as camadas 3D. */
export interface ClipTarget {
  key: string;
  geometry: Geometry;
  /** BBox usada como filtro antes do teste espacial. */
  bbox?: [number, number, number, number];
}

/**
 * Alvo do recorte das camadas 3D: a seleção (bairro, distrito ou loteamento)
 * vence o hover; `null` com a camada desligada ou sem foco. O hover só vale
 * para bairro: distritos têm dezenas de km (a zona rural contorna a cidade
 * inteira) e o recorte deles custa demais para uma prévia — 3D só ao selecionar.
 */
export function useClipTarget(
  enabled: boolean,
  selection: Selection | null,
  hoveredBairro: HoveredBairro | null,
  bairros: IndexedFeature[],
  loteamentos: IndexedFeature[],
): ClipTarget | null {
  return useMemo(() => {
    if (!enabled) return null;
    let key: string;
    let feature: IndexedFeature | undefined;
    if (selection) {
      key = `${selection.level}:${selection.featureId}`;
      const features = selection.level === "loteamento" ? loteamentos : bairros;
      feature = features.find((item) => item.featureId === selection.featureId);
    } else if (hoveredBairro?.tipo === "bairro") {
      key = `bairro:${hoveredBairro.featureId}`;
      feature = bairros.find((item) => item.featureId === hoveredBairro.featureId);
    } else {
      return null;
    }
    if (!feature?.geometry) return null;
    return { key, geometry: feature.geometry, bbox: feature.bbox };
  }, [enabled, selection, hoveredBairro, bairros, loteamentos]);
}
