/**
 * Conversão sRGB ↔ OKLab (Björn Ottosson, 2020) + parser de cor CSS. Escrita à
 * mão em vez de puxar o Culori, e em OKLab e não HSL — ver
 * docs/DECISOES-TECNICAS.md §1 e §5. Consumida por lib/map/tint.ts.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
  /** 0..1 — preservado ao longo de toda a conversão. */
  a: number;
}

export interface Oklab {
  L: number;
  a: number;
  b: number;
  alpha: number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

export function rgbToOklab({ r, g, b, a }: Rgb): Oklab {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    alpha: a,
  };
}

export function oklabToRgb({ L, a, b, alpha }: Oklab): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return {
    r: clamp01(linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    g: clamp01(linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    b: clamp01(linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
    a: alpha,
  };
}

const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i;
const HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i;
const RGB_FN = /^rgba?\(([^)]+)\)$/i;
const HSL_FN = /^hsla?\(([^)]+)\)$/i;

function splitArgs(body: string): number[] {
  return body
    .split(/[,/\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part.endsWith('%') ? parseFloat(part) / 100 : parseFloat(part)));
}

/**
 * Aceita o que aparece num style.json do MapLibre: hex de 3/4/6/8 dígitos,
 * `rgb()` e `hsl()`. Devolve `null` para o resto (`transparent`, nomes CSS,
 * não-cores) para o chamador deixar o valor original intacto.
 */
export function parseColor(input: string): Rgb | null {
  const value = input.trim().toLowerCase();

  const short = HEX_SHORT.exec(value);
  if (short) {
    return {
      r: parseInt(short[1] + short[1], 16) / 255,
      g: parseInt(short[2] + short[2], 16) / 255,
      b: parseInt(short[3] + short[3], 16) / 255,
      a: short[4] ? parseInt(short[4] + short[4], 16) / 255 : 1,
    };
  }

  const long = HEX_LONG.exec(value);
  if (long) {
    return {
      r: parseInt(long[1], 16) / 255,
      g: parseInt(long[2], 16) / 255,
      b: parseInt(long[3], 16) / 255,
      a: long[4] ? parseInt(long[4], 16) / 255 : 1,
    };
  }

  const rgb = RGB_FN.exec(value);
  if (rgb) {
    const [r, g, b, a] = splitArgs(rgb[1]);
    if ([r, g, b].some((n) => !Number.isFinite(n))) return null;
    // `rgb()` percentual já virou 0..1 em splitArgs; o caso 0..255 divide aqui.
    const scale = (n: number) => (n > 1 ? n / 255 : n);
    return { r: scale(r), g: scale(g), b: scale(b), a: Number.isFinite(a) ? a : 1 };
  }

  const hsl = HSL_FN.exec(value);
  if (hsl) {
    const [h, s, l, a] = splitArgs(hsl[1]);
    if ([h, s, l].some((n) => !Number.isFinite(n))) return null;
    return { ...hslToRgb(h, s, l), a: Number.isFinite(a) ? a : 1 };
  }

  return null;
}

function hslToRgb(h: number, s: number, l: number): Omit<Rgb, 'a'> {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];
  return { r: r + m, g: g + m, b: b + m };
}

const toHex = (c: number) =>
  Math.round(clamp01(c) * 255)
    .toString(16)
    .padStart(2, '0');

/** Hex de 6 dígitos, ou `rgba()` quando há transparência a preservar. */
export function formatColor({ r, g, b, a }: Rgb): string {
  if (a >= 1) return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  const round255 = (c: number) => Math.round(clamp01(c) * 255);
  return `rgba(${round255(r)}, ${round255(g)}, ${round255(b)}, ${Number(a.toFixed(3))})`;
}
