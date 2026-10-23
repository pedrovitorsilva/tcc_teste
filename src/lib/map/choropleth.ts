import type { ExpressionSpecification } from 'maplibre-gl';
import { formatColor, oklabToRgb, parseColor, rgbToOklab } from '../color/oklab';

/**
 * Quebras por quantil: `classes - 1` limiares, sem repetição (o `step` do
 * MapLibre exige ordem estrita). Com empates demais no mínimo (ex.: quase todo
 * bairro com 0%), os quantis colapsam — aí cai em intervalos iguais.
 */
export function quebrasQuantil(valores: number[], classes: number): number[] {
  const ordenados = [...valores].sort((a, b) => a - b);
  if (ordenados.length === 0) return [];
  const min = ordenados[0];
  const max = ordenados[ordenados.length - 1];
  const quebras: number[] = [];
  for (let i = 1; i < classes; i += 1) {
    const q = ordenados[Math.floor((i / classes) * (ordenados.length - 1))];
    if (q > min && (quebras.length === 0 || q > quebras[quebras.length - 1])) quebras.push(q);
  }
  if (quebras.length >= 2 || max === min) return quebras;
  return Array.from({ length: classes - 1 }, (_, i) => min + ((max - min) * (i + 1)) / classes);
}

/**
 * `n` cores do menor ao maior valor, interpoladas em OKLab (lightness
 * monotônica, sem desvio de matiz do HSL) da cor `base` do mapa até `intensa`.
 * A 1ª cor fica em `inicio` do caminho (0 = a própria base, que sumiria no
 * terreno); a última é `intensa`.
 */
export function rampa(base: string, intensa: string, n: number, inicio: number): string[] {
  const a = rgbToOklab(parseColor(base)!);
  const b = rgbToOklab(parseColor(intensa)!);
  if (n === 1) return [formatColor(oklabToRgb(b))];
  return Array.from({ length: n }, (_, i) => {
    const t = inicio + ((1 - inicio) * i) / (n - 1);
    return formatColor(
      oklabToRgb({
        L: a.L + (b.L - a.L) * t,
        a: a.a + (b.a - a.a) * t,
        b: a.b + (b.b - a.b) * t,
        alpha: 1,
      }),
    );
  });
}

/** Cor da classe de `valor` — o mesmo `step` de `expressaoCor`, em JS (prédios 3D). */
export function corDoValor(valor: number, quebras: number[], cores: string[]): string {
  let i = 0;
  while (i < quebras.length && valor >= quebras[i]) i += 1;
  return cores[i];
}

/** `fill-color`: feature sem `valor` (sigilo) → cinza; o resto, classe por `step`. */
export function expressaoCor(quebras: number[], cores: string[], semDado: string): ExpressionSpecification {
  const step: unknown[] = ['step', ['to-number', ['get', 'valor']], cores[0]];
  quebras.forEach((q, i) => step.push(q, cores[i + 1]));
  return ['case', ['has', 'valor'], step, semDado] as unknown as ExpressionSpecification;
}
