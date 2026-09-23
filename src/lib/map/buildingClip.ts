import type { Geometry, Position } from 'geojson';
import {
  BUILDING_AREA_DIVISOR,
  BUILDING_BASE_HEIGHT,
  BUILDING_EXTRA_HEIGHT,
  BUILDINGS_MIN_ZOOM,
  LOD_FULL_DETAIL_ZOOM,
  LOD_MIN_AREA_M2,
} from '@/config/buildings';

/**
 * Spatial clipping of buildings to a polygon (bairro/loteamento). Exists because
 * MapLibre's `within` doesn't evaluate polygons, and is written by hand instead of
 * promoting turf to a runtime dependency — docs/DECISOES-TECNICAS.md §3 and §5.
 */

/** Approximate centroid: average of the outer ring vertices. */
export function ringCentroid(ring: Position[]): [number, number] {
  let x = 0;
  let y = 0;
  // The last vertex repeats the first; ignoring it prevents skewing the average.
  const count = ring.length > 1 ? ring.length - 1 : ring.length;
  for (let i = 0; i < count; i += 1) {
    x += ring[i][0];
    y += ring[i][1];
  }
  return [x / count, y / count];
}

/**
 * Bbox `[minX, minY, maxX, maxY]` do anel. Ao contrário do centroide, serve
 * pra testar interseção com o viewport mesmo quando o polígono é bem maior
 * que a tela — necessário pra `land_cover` (uma mancha de floresta pode
 * cobrir o viewport inteiro sem que seu centroide esteja nele). Prédios não
 * precisam disso porque o footprint já é pequeno o bastante pro centroide
 * bastar.
 */
export function ringBBox(ring: Position[]): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/** `true` se os dois bboxes `[minX, minY, maxX, maxY]` se sobrepõem. */
export function bboxIntersects(
  a: [number, number, number, number],
  b: [number, number, number, number],
): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

/** First outer ring of a polygon geometry. `null` for everything else. */
export function outerRing(geometry: Geometry): Position[] | null {
  if (geometry.type === 'Polygon') return geometry.coordinates[0] ?? null;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates[0]?.[0] ?? null;
  return null;
}

/** Ray casting in a single ring. */
function pointInRing(point: [number, number], ring: Position[]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Inside the outer ring and outside all holes. */
function pointInPolygonRings(point: [number, number], rings: Position[][]): boolean {
  if (rings.length === 0 || !pointInRing(point, rings[0])) return false;
  for (let i = 1; i < rings.length; i += 1) {
    if (pointInRing(point, rings[i])) return false;
  }
  return true;
}

/** `true` if the point falls inside the geometry (Polygon or MultiPolygon). */
export function pointInPolygon(point: [number, number], geometry: Geometry): boolean {
  if (geometry.type === 'Polygon') {
    return pointInPolygonRings(point, geometry.coordinates);
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((rings) => pointInPolygonRings(point, rings));
  }
  return false;
}

/**
 * PRNG determinístico (mulberry32) a partir de um seed numérico — não
 * `Math.random()` de propósito: o recorte de `Trees3D` roda de novo a cada
 * `moveend`, e árvores reamostradas aleatoriamente a cada pan "tremeriam"
 * (mesma preocupação documentada para `syntheticHeight`).
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seed estável a partir das coordenadas do anel — mesmo anel sempre gera o mesmo seed. */
function seedFromRing(ring: Position[]): number {
  let seed = 0;
  for (const [x, y] of ring) {
    seed = (seed * 31 + Math.round(x * 1e6) + Math.round(y * 1e6) * 7) | 0;
  }
  return seed;
}

/**
 * Amostra `count` pontos dentro do anel externo por rejeição (ponto
 * pseudo-aleatório determinístico no bbox, mantém se cair dentro do
 * polígono). Usado por `Trees3D` para espalhar árvores dentro de um
 * polígono de vegetação — não é específico de prédio, só reaproveita
 * `pointInRing` já existente aqui. `maxAttempts` evita loop infinito em
 * anéis degenerados (área ~0).
 */
export function randomPointsInRing(ring: Position[], count: number): [number, number][] {
  if (ring.length < 4 || count <= 0) return [];

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const rand = mulberry32(seedFromRing(ring));
  const points: [number, number][] = [];
  const maxAttempts = count * 20;
  let attempts = 0;

  while (points.length < count && attempts < maxAttempts) {
    attempts += 1;
    const candidate: [number, number] = [
      minX + rand() * (maxX - minX),
      minY + rand() * (maxY - minY),
    ];
    if (pointInRing(candidate, ring)) points.push(candidate);
  }

  return points;
}

const METERS_PER_DEGREE_LAT = 111_320;

/** Ring area in m², equirectangular approximation — sufficient for a footprint (§5). */
export function approxAreaM2(ring: Position[]): number {
  if (ring.length < 4) return 0;
  const latRad = (ring[0][1] * Math.PI) / 180;
  const mx = METERS_PER_DEGREE_LAT * Math.cos(latRad);
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const x1 = ring[j][0] * mx;
    const y1 = ring[j][1] * METERS_PER_DEGREE_LAT;
    const x2 = ring[i][0] * mx;
    const y2 = ring[i][1] * METERS_PER_DEGREE_LAT;
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

/**
 * MOCK (MVP): synthetic height — the source data carries almost no height. Grows
 * with footprint area and is deterministic, because the clip is recalculated on
 * each hover. See docs/DECISOES-TECNICAS.md §3.
 */
export function syntheticHeight(areaM2: number): number {
  const extra = Math.min(
    BUILDING_EXTRA_HEIGHT,
    Math.sqrt(Math.max(areaM2, 0)) / BUILDING_AREA_DIVISOR
  );
  return Math.round((BUILDING_BASE_HEIGHT + extra) * 10) / 10;
}

/** LOD: minimum area to display a building at current zoom — decreases to 0 until
 * LOD_FULL_DETAIL_ZOOM, when every building (even small ones) appear. */
export function lodMinAreaM2(zoom: number): number {
  if (zoom >= LOD_FULL_DETAIL_ZOOM) return 0;
  const t = Math.max(
    0,
    (LOD_FULL_DETAIL_ZOOM - zoom) / (LOD_FULL_DETAIL_ZOOM - BUILDINGS_MIN_ZOOM)
  );
  return LOD_MIN_AREA_M2 * t;
}
