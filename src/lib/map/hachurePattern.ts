/**
 * Cross-hatching at 45° from the old theme, as a tileable canvas that MapLibre
 * registers via `map.addImage`. The three diagonals (one central + two cut at
 * the corners) are the trick for the tile to have no seams.
 */
export function createHatchPatternCanvas(
  color: string,
  size = 8
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.lineCap = 'square';

  const segments: [number, number, number, number][] = [
    [0, size, size, 0],
    [-size / 2, size / 2, size / 2, -size / 2],
    [size / 2, size * 1.5, size * 1.5, size / 2],
  ];

  segments.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  return canvas;
}

export function canvasToImageData(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext('2d');
  if (!ctx) return new ImageData(canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
