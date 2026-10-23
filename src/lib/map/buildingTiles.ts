import type { Feature, Geometry } from 'geojson';
import {
  approxAreaM2,
  outerRing,
  pointInPolygon,
  ringCentroid,
  syntheticHeight,
} from './buildingClip';

/**
 * O que o recorte lê de cada feature de `querySourceFeatures`. `geometry` é
 * preguiçosa no MapLibre (converte o tile só quando acessada) — por isso tudo
 * que dá pra decidir antes dela (tile já cacheado, tile fora do alvo, cópia de
 * tile ampliado) é decidido antes. `_z/_x/_y` = tile canônico de origem.
 */
export interface TileFeature {
  properties: Record<string, unknown>;
  readonly geometry: Geometry;
  _z: number;
  _x: number;
  _y: number;
}

interface Alvo {
  geometry: Geometry;
  bbox?: [number, number, number, number];
}

/** Prédios já recortados de cada tile canônico (`z/x/y`), para um alvo. */
export type PrediosPorTile = Map<string, Feature[]>;

const lon = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
const lat = (y: number, z: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI;

/**
 * Recorta para `alvo` só os tiles canônicos que ainda não estão em `cache` e
 * devolve a união dos tiles presentes em `features`, sem duplicata de borda.
 *
 * Sem culling por viewport de propósito: o resultado de um tile não depende de
 * onde a câmera está, então pan e zoom reaproveitam o cache e só pagam tile
 * novo — a GPU já descarta o que está fora da tela. O LOD por área também fica
 * fora daqui (filtro da layer), pelo mesmo motivo.
 */
export function recortarPorTile(features: Iterable<TileFeature>, alvo: Alvo, cache: PrediosPorTile): Feature[] {
  const presentes = new Set<string>();
  const novos = new Map<string, { lista: Feature[]; primeiroId?: unknown; fechado: boolean }>();
  const b = alvo.bbox;

  for (const f of features) {
    const key = `${f._z}/${f._x}/${f._y}`;
    presentes.add(key);
    if (cache.has(key)) continue;

    let tile = novos.get(key);
    if (!tile) {
      // Tile inteiro fora da bbox do alvo: nenhum prédio dele entra — pula sem converter geometria.
      const fora = !!b && (lon(f._x + 1, f._z) < b[0] || lon(f._x, f._z) > b[2] || lat(f._y, f._z) < b[1] || lat(f._y + 1, f._z) > b[3]);
      tile = { lista: [], primeiroId: f.properties.id, fechado: fora };
      novos.set(key, tile);
    } else if (tile.primeiroId !== undefined && f.properties.id === tile.primeiroId) {
      // Acima do z14 cada tile ampliado devolve o tile canônico inteiro, na
      // mesma ordem: rever o 1º prédio = começou uma cópia já processada.
      tile.fechado = true;
    }
    if (tile.fechado) continue;

    const ring = outerRing(f.geometry);
    if (!ring) continue;
    const [lng, latC] = ringCentroid(ring);
    if (b && (lng < b[0] || lng > b[2] || latC < b[1] || latC > b[3])) continue;
    if (!pointInPolygon([lng, latC], alvo.geometry)) continue;

    const area = approxAreaM2(ring);
    const id = typeof f.properties.id === 'string' ? f.properties.id : `${lng},${latC}`;
    tile.lista.push({
      type: 'Feature',
      geometry: f.geometry,
      // `id` sempre presente: chave do diff (`updateData`) e do cache de cor.
      // Centroide: decide de qual setor/bairro o prédio pega a cor no mapa de calor.
      properties: { id, height: syntheticHeight(area), area, lng, lat: latC },
    });
  }
  for (const [key, tile] of novos) cache.set(key, tile.lista);

  const vistos = new Set<unknown>();
  const uniao: Feature[] = [];
  for (const key of presentes) {
    for (const predio of cache.get(key)!) {
      const id = predio.properties!.id;
      if (vistos.has(id)) continue; // prédio de borda: vem nos dois tiles vizinhos
      vistos.add(id);
      uniao.push(predio);
    }
  }
  return uniao;
}
