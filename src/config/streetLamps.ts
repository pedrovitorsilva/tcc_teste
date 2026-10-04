// Postes 3D: gerados em build-time por scripts/prepare-lamps.mjs a partir das
// vias do OpenStreetMap (1 a cada ~32 m, lado alternado). Saída em
// public/data/postes.json: [[lng, lat, heading], ...], heading em radianos,
// direção da luminária (poste → eixo da via), leste=0, anti-horário.

/**
 * Modelo: "Low Poly Street Light" (Fridqeir, CC-BY-4.0 — public/lights/license.txt).
 * Medido no glTF: já vem em metros, Y para cima, base em y=0 e braço ao longo
 * de +X (~6,3 m de altura, luminária centrada em x≈2,6 m) — bate com o
 * referencial local do poste (+X = heading), então entra sem escala/rotação.
 */
export const STREET_LAMP_GLTF_URL = '/lights/scene.gltf';

export const STREET_LAMP_COLOR_DAY = '#e0e0e0'; // poste sempre; luminária de dia
export const STREET_LAMP_COLOR_NIGHT = '#fff9e6'; // luminária acesa (emissive)

/** Halo no chão, só à noite: disco aditivo de raio GLOW_RADIUS (m). */
export const STREET_LAMP_GLOW_RADIUS = 12;
/** 0xfff4cc × 0,5: mesmo tom, metade do brilho (o blending é aditivo, cor = intensidade). */
export const STREET_LAMP_GLOW_COLOR = 0x807a66;

export const STREET_LAMPS_DATA_URL = '/data/postes.json';
export const STREET_LAMPS_MIN_ZOOM = 13;

/**
 * Teto de instâncias. Medido no postes.json gerado: o maior bairro (Lagoa das
 * Flores) tem ~4,8 mil postes e metade dos 24 passa de 2 mil — um teto menor
 * cortaria o bairro pela metade (ordem das vias, não espacial).
 */
export const MAX_LAMPS_TOTAL = 6000;

/** Autor do modelo do poste (public/lights/license.txt), montado no (i) por ModelsAttribution. */
export const STREET_LAMP_MODEL_CREDIT =
  '<a href="https://sketchfab.com/Fridqeir" target="_blank" rel="noreferrer">Fridqeir</a> (postes)';
