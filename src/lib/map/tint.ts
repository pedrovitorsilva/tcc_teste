import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import { formatColor, oklabToRgb, parseColor, rgbToOklab } from '@/lib/color/oklab';

/**
 * Perceptual tinting of a MapLibre style — the three themes repaint the CARTO basemap
 * from their own tokens.
 *
 * It's a tone transfer (remaps any color by perceived lightness), not a lookup table,
 * and runs in OKLab to preserve lightness ordering. Why both choices: docs/DECISOES-TECNICAS.md §1.
 */

export interface TintTarget {
  /** Color where the **lightest** feature of the style goes. */
  land: string;
  /** Flat water color — replaces instead of remapping (see below). */
  water: string;
  /** Direction where the **darkest** feature of the style heads. */
  ink: string;
  /** Flat background. Default is `land`; in a dark style the two separate (§1). */
  background?: string;
  /** How much of the paper→ink path the darkest feature traverses. Not 1 by design (§1). */
  contrast?: number;
}

const DEFAULT_CONTRAST = 0.7;

type TintMode = 'background' | 'water' | 'feature';

/** Water is flat color, not remapped: remapping produces a beige that reads as shadow (§1). */
function isWaterLayer(layer: LayerSpecification): boolean {
  const sourceLayer = 'source-layer' in layer ? layer['source-layer'] : undefined;
  return /water|ocean|sea|river|lake/i.test(`${layer.id} ${sourceLayer ?? ''}`);
}

function isColorKey(key: string): boolean {
  return key.toLowerCase().includes('color');
}

/** Walk through a paint value (string or nested expression) applying `visit`. */
function walkColors(value: unknown, visit: (color: string) => void): void {
  if (typeof value === 'string') visit(value);
  else if (Array.isArray(value)) value.forEach((item) => walkColors(item, visit));
}

export function tintStyle(style: StyleSpecification, target: TintTarget): StyleSpecification {
  const landRgb = parseColor(target.land);
  const inkRgb = parseColor(target.ink);
  const waterRgb = parseColor(target.water);
  const backgroundRgb = parseColor(target.background ?? target.land);
  if (!landRgb || !inkRgb || !waterRgb || !backgroundRgb) return style;

  const land = rgbToOklab(landRgb);
  const ink = rgbToOklab(inkRgb);
  const water = rgbToOklab(waterRgb);
  const background = rgbToOklab(backgroundRgb);

  const contrast = target.contrast ?? DEFAULT_CONTRAST;

  // Measure the lightness range the style actually uses (Positron lives between
  // L≈0.80 and L≈1.00), not assuming 0..1 — without this the rendering disappears. Background and
  // water are excluded because they're painted flat. See §1.
  let minL = Infinity;
  let maxL = -Infinity;
  for (const layer of style.layers) {
    if (layer.type === 'background' || isWaterLayer(layer)) continue;
    const paint = 'paint' in layer ? layer.paint : undefined;
    if (!paint) continue;
    for (const [key, value] of Object.entries(paint)) {
      if (!isColorKey(key)) continue;
      walkColors(value, (color) => {
        const rgb = parseColor(color);
        if (!rgb) return;
        const { L } = rgbToOklab(rgb);
        if (L < minL) minL = L;
        if (L > maxL) maxL = L;
      });
    }
  }
  const span = maxL - minL;
  const hasRange = Number.isFinite(span) && span > 1e-3;

  function tintOne(input: string, mode: TintMode): string {
    const rgb = parseColor(input);
    if (!rgb) return input; // `transparent`, CSS names, non-color values

    if (mode === 'water') return formatColor(oklabToRgb({ ...water, alpha: rgb.a }));
    if (mode === 'background') {
      return formatColor(oklabToRgb({ ...background, alpha: rgb.a }));
    }

    const { L } = rgbToOklab(rgb);
    // 0 at the lightest feature of the style, 1 at the darkest.
    const darkness = hasRange ? (maxL - L) / span : 1 - Math.max(0, Math.min(1, L));

    // Straight interpolation from `land` to `ink` across all THREE OKLab axes, and `contrast`
    // scales the entire path. Interpolating only chroma made peachy paper with red ink turn
    // orange — see §1.
    const t = darkness * contrast;
    return formatColor(
      oklabToRgb({
        L: land.L + t * (ink.L - land.L),
        a: land.a + t * (ink.a - land.a),
        b: land.b + t * (ink.b - land.b),
        alpha: rgb.a,
      })
    );
  }

  /** Color can be string or nested expression; tinting only what `parseColor` recognizes preserves operators and numbers. */
  function tintValue(value: unknown, mode: TintMode): unknown {
    if (typeof value === 'string') return tintOne(value, mode);
    if (Array.isArray(value)) return value.map((item) => tintValue(item, mode));
    return value;
  }

  const layers = style.layers.map((layer) => {
    const paint = 'paint' in layer ? layer.paint : undefined;
    if (!paint) return layer;

    const mode: TintMode =
      layer.type === 'background'
        ? 'background'
        : isWaterLayer(layer)
          ? 'water'
          : 'feature';
    const nextPaint: Record<string, unknown> = { ...paint };
    let changed = false;

    for (const [key, value] of Object.entries(paint)) {
      if (!isColorKey(key)) continue;
      const tinted = tintValue(value, mode);
      if (tinted !== value) {
        nextPaint[key] = tinted;
        changed = true;
      }
    }

    return changed ? ({ ...layer, paint: nextPaint } as LayerSpecification) : layer;
  });

  return { ...style, layers };
}

const cache = new Map<string, Promise<StyleSpecification>>();

/**
 * Fetch and tint the style.json, caching by URL + target. Cache holds the
 * promise (not the result) so back-and-forth theme switches don't fire
 * concurrent fetches; rejections are not cached, so a network failure doesn't
 * condemn the theme for the rest of the session.
 */
export function loadTintedStyle(
  url: string,
  target: TintTarget
): Promise<StyleSpecification> {
  const key = [
    url,
    target.land,
    target.water,
    target.ink,
    target.background ?? target.land,
    target.contrast ?? DEFAULT_CONTRAST,
  ].join('|');
  const cached = cache.get(key);
  if (cached) return cached;

  const promise = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`style ${url} responded with ${response.status}`);
      return response.json() as Promise<StyleSpecification>;
    })
    .then((style) => tintStyle(style, target))
    .catch((error) => {
      cache.delete(key);
      throw error;
    });

  cache.set(key, promise);
  return promise;
}
