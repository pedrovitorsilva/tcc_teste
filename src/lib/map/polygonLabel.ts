import type { Geometry, Position } from 'geojson';
import { pointInPolygon } from '@/lib/map/buildingClip';

/**
 * Where to anchor a label inside a polygon, and how much space it has.
 *
 * Uses the "pole of inaccessibility" (interior point farthest from the edge), via
 * grid search with refinement — the centroid falls outside concave polygons.
 * See docs/DECISOES-TECNICAS.md §4.
 */

export interface PolygonLabelAnchor {
  /** Interior point where the label is anchored. */
  point: [number, number];
  /** Distance to edge, in degrees of longitude — to convert to pixels: `× 512 · 2^zoom / 360`. */
  radius: number;
}

/** Samples per axis in initial sweep. */
const COARSE_STEPS = 24;
/** Refinement passes, each halving the window. */
const REFINE_PASSES = 5;

type Ring = Position[];

function ringsOf(geometry: Geometry): Ring[][] {
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

function bboxOf(rings: Ring[]): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of rings[0]) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/** Point-to-segment distance already scaled; `yScale` corrects Mercator on the vertical axis (§4). */
function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  let t = lengthSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lengthSq;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distanceToRings(
  point: [number, number],
  rings: Ring[],
  yScale: number
): number {
  const px = point[0];
  const py = point[1] * yScale;
  let best = Infinity;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const d = distanceToSegment(
        px,
        py,
        ring[j][0],
        ring[j][1] * yScale,
        ring[i][0],
        ring[i][1] * yScale
      );
      if (d < best) best = d;
    }
  }
  return best;
}

/**
 * Interior point with maximum clearance. `null` for non-polygon or
 * degenerate geometries (no sample fell inside).
 */
export function polygonLabelAnchor(geometry: Geometry): PolygonLabelAnchor | null {
  const polygons = ringsOf(geometry);
  if (polygons.length === 0) return null;

  // In a MultiPolygon, label the largest part; the rest are boundary fragments.
  let rings = polygons[0];
  if (polygons.length > 1) {
    let bestArea = -Infinity;
    for (const candidate of polygons) {
      const [minX, minY, maxX, maxY] = bboxOf(candidate);
      const area = (maxX - minX) * (maxY - minY);
      if (area > bestArea) {
        bestArea = area;
        rings = candidate;
      }
    }
  }

  const [minX, minY, maxX, maxY] = bboxOf(rings);
  if (!(maxX > minX) || !(maxY > minY)) return null;

  const yScale = 1 / Math.cos(((minY + maxY) / 2) * (Math.PI / 180));
  const subGeometry: Geometry = { type: 'Polygon', coordinates: rings };

  let best: PolygonLabelAnchor | null = null;
  let windowX = (maxX - minX) / 2;
  let windowY = (maxY - minY) / 2;
  let centerX = (minX + maxX) / 2;
  let centerY = (minY + maxY) / 2;

  for (let pass = 0; pass <= REFINE_PASSES; pass += 1) {
    // First pass sweeps the entire bbox; subsequent passes, a smaller window
    // each time around the best point found so far.
    const steps = pass === 0 ? COARSE_STEPS : 8;
    const x0 = centerX - windowX;
    const y0 = centerY - windowY;
    const stepX = (windowX * 2) / steps;
    const stepY = (windowY * 2) / steps;

    for (let i = 0; i <= steps; i += 1) {
      for (let j = 0; j <= steps; j += 1) {
        const candidate: [number, number] = [x0 + i * stepX, y0 + j * stepY];
        if (!pointInPolygon(candidate, subGeometry)) continue;
        const radius = distanceToRings(candidate, rings, yScale);
        if (!best || radius > best.radius) best = { point: candidate, radius };
      }
    }

    if (!best) return null;
    centerX = best.point[0];
    centerY = best.point[1];
    windowX /= 2;
    windowY /= 2;
  }

  return best;
}

/** Average glyph width as a fraction of font size. */
const GLYPH_WIDTH_RATIO = 0.55;
/** Pixels per degree of longitude at `zoom = 0` (512px tiles). */
const PIXELS_PER_DEGREE_Z0 = 512 / 360;

/** Floating label padding: the card hovers over the geometry, so it can occupy more space. */
const FLOAT_WIDTH_FILL = 2.6;
const FLOAT_HEIGHT_FILL = 1.3;

/**
 * Coefficient `K`: text size in pixels is `K · 2^zoom`, which locks the
 * label to the terrain (same fraction of the polygon at any zoom). Derived from `radius`
 * for each polygon — see docs/DECISOES-TECNICAS.md §4.
 */
export function floatingLabelSizeCoefficient(radius: number, text: string): number {
  const chars = Math.max(text.length, 1);
  const byWidth = FLOAT_WIDTH_FILL / (GLYPH_WIDTH_RATIO * chars);
  const fill = Math.min(byWidth, FLOAT_HEIGHT_FILL);
  return fill * radius * PIXELS_PER_DEGREE_Z0;
}

/** Below this the label disappears instead of shrinking past readability. */
export const FLOAT_MIN_LEGIBLE_SIZE = 9;
/** TODO: ceiling inherited from native text; re-evaluate on visual inspection if it hits often. */
export const FLOAT_MAX_SIZE = 240;
