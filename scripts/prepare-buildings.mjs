// Gera public/tiles/predios/{z}/{x}/{y}.pbf — os prédios do Overture Maps
// (© Overture Maps Foundation, ODbL) do município inteiro, já com altura, área
// e bairro/setor/loteamento calculados aqui, uma vez. No mapa, recorte, LOD,
// altura e cor do mapa de calor viram filtros e expressões nativas do MapLibre,
// sem processamento em JavaScript (docs/CODIGO-MELHORIAS.md, Fase 2).
//
// Também gera public/tiles/predios/metadados.json: release usada e contagem de
// prédios por bairro/distrito e loteamento (a ficha mostra o número).
//
// A saída É versionada no Git (o repositório faz o papel de cache): o deploy não
// baixa nada. Rode `npm run prepare-data` de vez em quando e commite
// public/tiles/predios. O script só baixa o Overture se as entradas mudaram
// (GeoJSON do ETL ou este script) ou se a release usada ficou mais de
// MAX_ATRASO_DIAS atrás da mais nova; senão sai em segundos. PREDIOS_FORCE=1
// ignora a regra. Falha de rede não apaga nada: os tiles antigos só são trocados
// depois que todo o download e o cálculo terminam.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PMTiles } from 'pmtiles';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { GeoJSONVT } from '@maplibre/geojson-vt';
import { fromGeojsonVt } from '@maplibre/vt-pbf';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataDir = path.join(root, 'public', 'data');
const outDir = path.join(root, 'public', 'tiles', 'predios');

const BUCKET = 'https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com';
/** Zoom dos tiles do Overture (o máximo do arquivo). */
const SOURCE_ZOOM = 14;
/** Zooms gravados: 13 é o mínimo dos prédios no mapa; acima de 14 o MapLibre amplia o 14. */
const OUT_ZOOMS = [13, 14];
/** Nome da source-layer nos tiles gerados (src/config/buildings.ts). */
const LAYER = 'predios';
const CONCURRENCY = 8;
/** Release usada mais velha que a mais nova por mais que isso (dias) → baixa de novo. O Overture publica ~1 por mês. */
const MAX_ATRASO_DIAS = 90;
/**
 * Área mínima (m²) que o LOD mostra abaixo do z14 — o 1º valor de
 * LOD_MIN_AREA_STEPS (src/config/buildings.ts). Prédio menor nunca aparece no
 * z13, então não entra nos tiles z13 (eram metade do tamanho total).
 */
const LOD_MIN_AREA_Z13 = 60;

// MOCK (MVP): altura sintética — o Overture quase não traz altura (10 de 8.188
// prédios no centro). Cresce com a raiz da área, entre BASE e BASE+EXTRA metros,
// e é determinística (docs/DECISOES-TECNICAS.md §3). Mora aqui: é o único lugar
// que calcula altura; o mapa só lê `height` do tile.
const BUILDING_BASE_HEIGHT = 5;
const BUILDING_EXTRA_HEIGHT = 13;
const BUILDING_AREA_DIVISOR = 3.2;

// Cópia de src/lib/map/buildingClip.ts — o node não importa .ts direto.
const M_PER_DEG_LAT = 111_320;

function ringCentroid(ring) {
  const count = ring.length > 1 ? ring.length - 1 : ring.length;
  let x = 0, y = 0;
  for (let i = 0; i < count; i++) { x += ring[i][0]; y += ring[i][1]; }
  return [x / count, y / count];
}
function approxAreaM2(ring) {
  if (ring.length < 4) return 0;
  const mx = M_PER_DEG_LAT * Math.cos((ring[0][1] * Math.PI) / 180);
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i++) {
    sum += ring[j][0] * mx * ring[i][1] * M_PER_DEG_LAT - ring[i][0] * mx * ring[j][1] * M_PER_DEG_LAT;
  }
  return Math.abs(sum) / 2;
}
const syntheticHeight = (area) =>
  Math.round((BUILDING_BASE_HEIGHT + Math.min(BUILDING_EXTRA_HEIGHT, Math.sqrt(Math.max(area, 0)) / BUILDING_AREA_DIVISOR)) * 10) / 10;
const outerRing = (g) => (g.type === 'Polygon' ? g.coordinates[0] : g.type === 'MultiPolygon' ? g.coordinates[0]?.[0] : null);
function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const pointInRings = (p, rings) => pointInRing(p, rings[0]) && !rings.slice(1).some((r) => pointInRing(p, r));
const pointInGeometry = (p, g) =>
  g.type === 'Polygon' ? pointInRings(p, g.coordinates) : g.type === 'MultiPolygon' ? g.coordinates.some((r) => pointInRings(p, r)) : false;

function bboxOf(geometry) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]);
      b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]);
    } else c.forEach(walk);
  };
  walk(geometry.coordinates);
  return b;
}

/** Áreas de um GeoJSON do ETL com bbox, para point-in-polygon com filtro de bbox. */
function areas(file, codeKey) {
  const fc = JSON.parse(readFileSync(path.join(dataDir, file), 'utf8'));
  return fc.features.filter((f) => f.geometry).map((f) => ({ code: f.properties[codeKey], geometry: f.geometry, bbox: bboxOf(f.geometry) }));
}
// ponytail: varredura linear com filtro de bbox (36 unidades, 664 setores, 166
// loteamentos); índice espacial se o município crescer em ordem de grandeza.
function codeAt(point, list) {
  const [x, y] = point;
  for (const a of list) {
    if (x < a.bbox[0] || x > a.bbox[2] || y < a.bbox[1] || y > a.bbox[3]) continue;
    if (pointInGeometry(point, a.geometry)) return a.code;
  }
  return null;
}

/** Release mais nova do bucket (mesma regra de src/lib/map/overtureRelease.ts). */
async function latestRelease() {
  const res = await fetch(`${BUCKET}/?list-type=2&prefix=tiles/&delimiter=/`);
  if (!res.ok) throw new Error(`listagem do bucket: HTTP ${res.status}`);
  const releases = [...(await res.text()).matchAll(/<Prefix>tiles\/([^/<]+)\/<\/Prefix>/g)].map((m) => m[1]).sort();
  if (releases.length === 0) throw new Error('listagem do bucket vazia');
  return releases[releases.length - 1];
}

const lon2x = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const lat2y = (lat, z) =>
  Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z);
const tileBBox = (z, x, y) => {
  const lon = (v) => (v / 2 ** z) * 360 - 180;
  const lat = (v) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * v) / 2 ** z))) * 180) / Math.PI;
  return [lon(x), lat(y + 1), lon(x + 1), lat(y)];
};
const intersects = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];

// --- 1. Áreas do ETL
const unidades = areas('bairros_e_distritos.geojson', 'cd_unidade');
const setores = areas('setores.geojson', 'cd_setor');
// Loteamentos podem se sobrepor: vence o primeiro do arquivo que contém o centroide.
const loteamentos = areas('loteamentos.geojson', 'cd_loteamento');
const municipio = unidades.reduce((b, u) => [Math.min(b[0], u.bbox[0]), Math.min(b[1], u.bbox[1]), Math.max(b[2], u.bbox[2]), Math.max(b[3], u.bbox[3])], [Infinity, Infinity, -Infinity, -Infinity]);

// --- 2. Precisa regenerar? Só se as entradas mudaram ou a release ficou muito velha.
const diasDe = (release) => Date.parse(release.slice(0, 10)) / 86_400_000;
const entrada = createHash('sha256')
  .update(readFileSync(fileURLToPath(import.meta.url)))
  .update(['bairros_e_distritos', 'setores', 'loteamentos'].map((n) => readFileSync(path.join(dataDir, `${n}.geojson`))).reduce((a, b) => Buffer.concat([a, b])))
  .digest('hex');
const metaPath = path.join(outDir, 'metadados.json');
const atual = existsSync(metaPath) && existsSync(path.join(outDir, '14')) ? JSON.parse(readFileSync(metaPath, 'utf8')) : null;
const maisNova = await latestRelease().catch((err) => {
  console.warn(`  Overture indisponível (${err.message}).`);
  return null;
});
if (!process.env.PREDIOS_FORCE && atual?.entrada === entrada) {
  const atraso = maisNova ? Math.round(diasDe(maisNova) - diasDe(atual.release)) : null;
  if (atraso === null || atraso <= MAX_ATRASO_DIAS) {
    console.log(`  Tiles atuais (release ${atual.release}${atraso === null ? ', sem rede para comparar' : `, ${atraso} dia(s) atrás da mais nova`}) — nada a fazer.`);
    process.exit(0);
  }
  console.log(`  Release ${atual.release} está ${atraso} dias atrás de ${maisNova} (limite ${MAX_ATRASO_DIAS}) — regenerando.`);
}
if (!maisNova) {
  console.warn('  Sem rede para baixar o Overture — tiles de prédios não regenerados.');
  process.exit(0);
}
const release = maisNova;

// --- 3. Download dos tiles z14 do Overture que tocam alguma unidade.
console.log(`  Overture: release ${release}`);
const pm = new PMTiles(`${BUCKET}/tiles/${release}/buildings.pmtiles`);
const coords = [];
for (let x = lon2x(municipio[0], SOURCE_ZOOM); x <= lon2x(municipio[2], SOURCE_ZOOM); x++) {
  for (let y = lat2y(municipio[3], SOURCE_ZOOM); y <= lat2y(municipio[1], SOURCE_ZOOM); y++) {
    const tb = tileBBox(SOURCE_ZOOM, x, y);
    if (unidades.some((u) => intersects(tb, u.bbox))) coords.push([x, y]);
  }
}
console.log(`  ${coords.length} tiles z${SOURCE_ZOOM} a baixar`);

/** Por id do Overture, a maior das partes: o tile corta o prédio na borda (com buffer), e a maior parte é a mais completa. */
const porId = new Map();
let baixados = 0, bytes = 0;
async function worker() {
  while (coords.length) {
    const [x, y] = coords.pop();
    const r = await pm.getZxy(SOURCE_ZOOM, x, y);
    baixados++;
    if (baixados % 100 === 0) console.log(`  ${baixados} tiles…`);
    if (!r) continue;
    bytes += r.data.byteLength;
    const layer = new VectorTile(new PbfReader(new Uint8Array(r.data))).layers.building;
    if (!layer) continue;
    for (let i = 0; i < layer.length; i++) {
      const feature = layer.feature(i);
      const geometry = feature.toGeoJSON(x, y, SOURCE_ZOOM).geometry;
      const ring = outerRing(geometry);
      if (!ring) continue;
      const area = approxAreaM2(ring);
      const id = feature.properties.id ?? `${x}/${y}/${i}`;
      const atual = porId.get(id);
      if (!atual || area > atual.area) porId.set(id, { geometry, ring, area });
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker)).catch((err) => {
  console.warn(`  download do Overture falhou (${err.message}) — tiles de prédios não regenerados.`);
  process.exit(0);
});
console.log(`  ${(bytes / 1e6).toFixed(1)} MB baixados, ${porId.size} prédios únicos`);

// --- 4. Altura, área e a quem cada prédio pertence (pelo centroide)
const features = [];
const porUnidade = {};
const porLoteamento = {};
// Ordenado por id: o download é paralelo e a ordem de chegada varia; sem isso os
// bytes dos tiles mudariam a cada geração e o Git veria diff onde não há mudança.
const ordenados = [...porId].sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0));
for (const [, { geometry, ring, area }] of ordenados) {
  const centro = ringCentroid(ring);
  const cdBairro = codeAt(centro, unidades);
  if (!cdBairro) continue; // fora do município
  const cdLoteamento = codeAt(centro, loteamentos);
  porUnidade[cdBairro] = (porUnidade[cdBairro] ?? 0) + 1;
  if (cdLoteamento) porLoteamento[cdLoteamento] = (porLoteamento[cdLoteamento] ?? 0) + 1;
  const properties = { height: syntheticHeight(area), area: Math.round(area), cd_bairro: cdBairro };
  const cdSetor = codeAt(centro, setores);
  if (cdSetor) properties.cd_setor = cdSetor;
  if (cdLoteamento) properties.cd_loteamento = cdLoteamento;
  features.push({ type: 'Feature', geometry, properties });
}
console.log(`  ${features.length} prédios no município`);

// --- 5. Tiles MVT estáticos (o z13 só com o que o LOD mostra nele)
const indexOf = (list) =>
  new GeoJSONVT({ type: 'FeatureCollection', features: list }, { maxZoom: Math.max(...OUT_ZOOMS), indexMaxZoom: 0, tolerance: 1, buffer: 64 });
const indexes = {
  13: indexOf(features.filter((f) => f.properties.area >= LOD_MIN_AREA_Z13)),
  14: indexOf(features),
};
rmSync(outDir, { recursive: true, force: true });
let arquivos = 0, total = 0, maior = 0;
for (const z of OUT_ZOOMS) {
  const index = indexes[z];
  for (let x = lon2x(municipio[0], z); x <= lon2x(municipio[2], z); x++) {
    for (let y = lat2y(municipio[3], z); y <= lat2y(municipio[1], z); y++) {
      const tile = index.getTile(z, x, y);
      if (!tile || tile.features.length === 0) continue;
      const pbf = fromGeojsonVt({ [LAYER]: tile }, { version: 2, extent: 4096 });
      mkdirSync(path.join(outDir, String(z), String(x)), { recursive: true });
      writeFileSync(path.join(outDir, String(z), String(x), `${y}.pbf`), pbf);
      arquivos++; total += pbf.byteLength; maior = Math.max(maior, pbf.byteLength);
    }
  }
}

writeFileSync(
  path.join(outDir, 'metadados.json'),
  JSON.stringify({ release, entrada, gerado_em: new Date().toISOString(), total: features.length, bounds: municipio, por_unidade: porUnidade, por_loteamento: porLoteamento }),
);
console.log(`  ${arquivos} tiles em public/tiles/predios — ${(total / 1e6).toFixed(1)} MB (maior: ${(maior / 1e3).toFixed(0)} KB)`);
