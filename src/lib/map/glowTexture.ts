import * as THREE from 'three';

/**
 * Textura de brilho radial (branco no centro → transparente na borda), gerada
 * num canvas — sem request de rede. Feita pra `AdditiveBlending`: o alfa
 * zera a contribuição na borda, a cor vem do `color` do material.
 */
export function radialGlowTexture(size = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const r = size / 2;
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}
