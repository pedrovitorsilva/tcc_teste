import { useEffect, useRef } from "react";
import type { Map as MapLibreMap, MapSourceDataEvent } from "maplibre-gl";
import type { ClipTarget } from "@/hooks/map/useClipTarget";

const CLIP_DEBOUNCE_MS = 120;

interface ClipEffectOptions<T> {
  map: MapLibreMap | null;
  isLoaded: boolean;
  target: ClipTarget | null;
  /** Sources vetoriais consultadas pelo `compute` — recalcula quando terminam de carregar. */
  sourceIds: readonly string[];
  minZoom: number;
  /** Publicado sem alvo ou abaixo de `minZoom`. */
  empty: T;
  compute: (target: ClipTarget) => T;
  publish: (data: T) => void;
}

/**
 * Recorte das camadas 3D por bairro/loteamento em foco: cache por alvo,
 * recálculo com debounce a cada `moveend` e a cada tile carregado das
 * `sourceIds`. Só entra no cache o recorte feito com todas as sources já
 * carregadas (senão o cache guardaria um recorte parcial).
 */
export function useClipEffect<T>(options: ClipEffectOptions<T>): void {
  // `compute`/`publish` mudam a cada render; o efeito lê sempre a versão atual.
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const cacheRef = useRef(new Map<string, T>());
  const { map, isLoaded, target } = options;

  useEffect(() => {
    if (!map || !isLoaded) return;
    const { sourceIds, minZoom, empty, publish } = optionsRef.current;

    if (!target) {
      publish(empty);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    const compute = () => {
      const current = optionsRef.current;
      if (map.getZoom() < minZoom) {
        current.publish(empty);
        return;
      }
      const data = current.compute(target);
      if (sourceIds.every((id) => map.isSourceLoaded(id))) {
        cacheRef.current.set(target.key, data);
      }
      current.publish(data);
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(compute, CLIP_DEBOUNCE_MS);
    };

    const handleSourceData = (event: MapSourceDataEvent) => {
      if (event.isSourceLoaded && sourceIds.includes(event.sourceId)) schedule();
    };

    const cached = cacheRef.current.get(target.key);
    if (cached) publish(cached);
    else schedule();

    map.on("sourcedata", handleSourceData);
    map.on("moveend", schedule);

    return () => {
      if (timer) clearTimeout(timer);
      map.off("sourcedata", handleSourceData);
      map.off("moveend", schedule);
    };
  }, [map, isLoaded, target]);
}
