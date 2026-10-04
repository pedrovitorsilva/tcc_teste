// Gera public/data/postes.json — postes de iluminação ao longo das vias do
// OpenStreetMap (© OpenStreetMap contributors, ODbL), via Overpass, recortados
// pelos bairros. Saída: [[lng, lat, heading], ...], heading em radianos [0, 2π)
// = direção em que a luminária aponta (do poste pro eixo da via), medida a
// partir do leste no sentido anti-horário (leste=0, norte=π/2).
//
// Falha de rede não quebra o build: usa o cache em temp/ (qualquer idade) ou,
// sem cache, avisa e sai sem gerar nada — os postes só não aparecem.
import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const bairrosPath = path.join(root, 'public', 'data', 'bairros.geojson');
const outPath = path.join(root, 'public', 'data', 'postes.json');
const cachePath = path.join(root, 'temp', 'postes-osm-cache.json');

// Instância principal + espelhos públicos, tentados em ordem (a principal dá 504 sob carga).
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const USER_AGENT = 'cadastro-vivo-tcc/0.1 (prepare-lamps; build-time)';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SPACING_M = 32;
const SIDEWALK_OFFSET_M = 1.5;

// Cópia de ROAD_WIDTH_M (src/config/cars.ts) — o node não importa .ts direto.
const ROAD_WIDTH_M = { primary: 10, secondary: 8, tertiary: 8, residential: 6, living_street: 5, service: 4 };
const ROAD_WIDTH_DEFAULT_M = 6;

const M_PER_DEG_LAT = 111_320;

// --- geometria (mesma regra de src/lib/map/buildingClip.ts: anel externo dentro, buracos fora)
function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const pointInRings = (p, rings) => pointInRing(p, rings[0]) && !rings.slice(1).some((r) => pointInRing(p, r));
function pointInGeometry(p, g) {
  if (g.type === 'Polygon') return pointInRings(p, g.coordinates);
  if (g.type === 'MultiPolygon') return g.coordinates.some((rings) => pointInRings(p, rings));
  return false;
}

// --- Overpass + cache
function bboxOf(fc) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]);
      b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]);
    } else c.forEach(walk);
  };
  fc.features.forEach((f) => walk(f.geometry.coordinates));
  return b;
}

async function loadOsm([w, s, e, n]) {
  const fresh = existsSync(cachePath) && Date.now() - statSync(cachePath).mtimeMs < CACHE_MAX_AGE_MS;
  if (fresh) {
    console.log('  Overpass: usando cache (< 1 dia) em temp/postes-osm-cache.json');
    return JSON.parse(readFileSync(cachePath, 'utf8'));
  }
  const bbox = `${s},${w},${n},${e}`;
  const query =
    '[out:json][timeout:60];' +
    `way[highway~"^(primary|secondary|tertiary|residential|living_street|service)$"](${bbox});out geom;` +
    `node[highway=street_lamp](${bbox});out;`;
  const errors = [];
  for (const url of OVERPASS_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      mkdirSync(path.dirname(cachePath), { recursive: true });
      writeFileSync(cachePath, JSON.stringify(json));
      console.log(`  Overpass: ${new URL(url).host}`);
      return json;
    } catch (err) {
      errors.push(`${new URL(url).host}: ${err.message}`);
    }
  }
  const why = errors.join('; ');
  if (existsSync(cachePath)) {
    console.warn(`  Overpass falhou (${why}) — usando cache antigo.`);
    return JSON.parse(readFileSync(cachePath, 'utf8'));
  }
  console.warn(`  Overpass falhou (${why}) e não há cache — postes.json não gerado.`);
  return null;
}

// --- geração ao longo das vias
/** 1 poste a cada SPACING_M ao longo da via, alternando o lado. */
function lampsAlongWay(way) {
  const pts = way.geometry.map(({ lon, lat }) => [lon, lat]);
  const half = (ROAD_WIDTH_M[way.tags.highway] ?? ROAD_WIDTH_DEFAULT_M) / 2 + SIDEWALK_OFFSET_M;
  const out = [];
  let next = SPACING_M / 2; // distância (m, desde o início da via) do próximo poste
  let walked = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const [lng0, lat0] = pts[i - 1];
    const [lng1, lat1] = pts[i];
    const mPerDegLng = M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
    const dx = (lng1 - lng0) * mPerDegLng; // leste
    const dy = (lat1 - lat0) * M_PER_DEG_LAT; // norte
    const len = Math.hypot(dx, dy);
    if (len === 0) continue;
    while (next <= walked + len) {
      const t = (next - walked) / len;
      const side = out.length % 2 === 0 ? 1 : -1; // 1 = direita do sentido de marcha
      // Normal à direita de (dx, dy) é (dy, -dx).
      const nx = (dy / len) * side;
      const ny = (-dx / len) * side;
      const lng = lng0 + (dx * t + nx * half) / mPerDegLng;
      const lat = lat0 + (dy * t + ny * half) / M_PER_DEG_LAT;
      let heading = Math.atan2(-ny, -nx); // aponta de volta pro eixo da via
      if (heading < 0) heading += Math.PI * 2;
      out.push([lng, lat, heading]);
      next += SPACING_M;
    }
    walked += len;
  }
  return out;
}

const bairros = JSON.parse(readFileSync(bairrosPath, 'utf8'));
const osm = await loadOsm(bboxOf(bairros));
if (!osm) process.exit(0);

const ways = osm.elements.filter((el) => el.type === 'way' && el.geometry?.length > 1);
const osmLamps = osm.elements.filter((el) => el.type === 'node');
console.log(`  Overpass: ${ways.length} vias, ${osmLamps.length} node[highway=street_lamp]`);

const geometries = bairros.features.map((f) => f.geometry);
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
const lamps = ways
  .flatMap(lampsAlongWay)
  .filter(([lng, lat]) => geometries.some((g) => pointInGeometry([lng, lat], g)))
  .map(([lng, lat, h]) => [round(lng, 6), round(lat, 6), round(h, 2)]);

writeFileSync(outPath, JSON.stringify(lamps));
console.log(`  postes.json: ${lamps.length} postes, ${(statSync(outPath).size / 1024 / 1024).toFixed(2)} MB`);
