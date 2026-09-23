import type { Position } from 'geojson';
import { lngLatToLocalMeters, type MercatorOrigin } from './threeCustomLayer';

/**
 * "Andar sobre uma linha dado uma fração 0..1" — mesmo problema que
 * `src/components/ui/map.tsx` já resolve internamente para `MapRoute`
 * (`measureRoute`/`findSegmentIndex`/`pointAtFraction`), mas esse arquivo é
 * código de terceiros (mapcn) que não pode ser editado nem tem essas
 * funções exportadas. Reimplementado aqui, mesmo algoritmo (distância
 * acumulada + busca binária), em metros locais (não graus), porque é isso
 * que `Cars3D.tsx` precisa pra posicionar a malha do carro.
 */

export interface PathMeasure {
  /** Pontos da via já convertidos pra metros locais (mesmo `origin` de sempre). */
  points: { x: number; z: number }[];
  /** Distância acumulada até cada ponto — mesmo tamanho de `points`. */
  cumulative: number[];
  /** Comprimento total da via, em metros. */
  total: number;
}

export function measurePath(coordinates: Position[], origin: MercatorOrigin): PathMeasure {
  const points = coordinates.map(([lng, lat]) => lngLatToLocalMeters(origin, [lng, lat]));
  const cumulative = [0];
  let total = 0;

  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dz = points[i].z - points[i - 1].z;
    total += Math.hypot(dx, dz);
    cumulative.push(total);
  }

  return { points, cumulative, total };
}

/** Índice do segmento (entre `points[i]` e `points[i+1]`) que contém `distance`. */
function findSegmentIndex(cumulative: number[], distance: number): number {
  let low = 0;
  let high = cumulative.length - 1;

  while (low < high) {
    const mid = (low + high) >> 1;
    if (cumulative[mid] < distance) low = mid + 1;
    else high = mid;
  }

  return Math.min(low === 0 ? 0 : low - 1, cumulative.length - 2);
}

export interface PathPosition {
  x: number;
  z: number;
  /** Ângulo (radianos) do trecho local, medido a partir de +Z (sul) girando em direção a +X (leste). */
  heading: number;
}

/**
 * Posição e direção do trecho local em `fraction` (0..1) ao longo da via.
 * `fraction` fora de [0,1] é grampeado — quem anima decide como fazer o
 * "ida e volta" (ver `Cars3D.tsx`), esta função só interpola um sentido.
 */
export function positionAtFraction(measure: PathMeasure, fraction: number): PathPosition {
  const { points, cumulative, total } = measure;

  if (points.length === 0) return { x: 0, z: 0, heading: 0 };
  if (points.length === 1 || total === 0) {
    return { x: points[0].x, z: points[0].z, heading: 0 };
  }

  const t = Math.min(1, Math.max(0, fraction));
  const target = total * t;
  const index = findSegmentIndex(cumulative, target);
  const a = points[index];
  const b = points[index + 1];
  const segLen = cumulative[index + 1] - cumulative[index];
  const segT = segLen === 0 ? 0 : (target - cumulative[index]) / segLen;

  return {
    x: a.x + (b.x - a.x) * segT,
    z: a.z + (b.z - a.z) * segT,
    heading: Math.atan2(b.x - a.x, b.z - a.z),
  };
}
