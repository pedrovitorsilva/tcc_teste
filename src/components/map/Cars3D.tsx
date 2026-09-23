"use client";

// Fonte dos carros 3D: Overture Maps (tema `transportation`, layer
// `segment`, `subtype=road`) — mesmo esqueleto de source/probe/recorte das
// outras 3 camadas. MVP sem cruzamento (decisão do usuário): cada carro
// anda ida-e-volta só no segmento onde nasceu, sem atravessar interseção
// (grafo de `connectors` do Overture fica documentado, não implementado).
//
// Modelos: pack glTF combinado em public/cars/scene.gltf (14 tipos de
// veículo na mesma cena; usamos 4). Corpo+rodas de cada tipo são nós
// irmãos sem transform próprio (offset já embutido na geometria) — ao
// invés de InstancedMesh por peça (corpo/roda × tipo), cada carro na cena é
// um `THREE.Group.clone(true)` do prefab do seu tipo: mais simples, e a
// contagem de carros (dezenas, não milhares como as árvores) não justifica
// o custo de manter ~20 InstancedMesh sincronizadas.
import { useEffect, useRef } from "react";
import type { Geometry, Position } from "geojson";
import type { CustomLayerInterface, Map as MapLibreMap, MapSourceDataEvent } from "maplibre-gl";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useMap } from "@/components/ui/map";
import {
  CAR_GLTF_URL,
  CAR_MIN_SPACING_M,
  CAR_MODEL_FORWARD_OFFSET,
  CAR_CLASS_BOOST,
  CAR_MODEL_SCALE,
  CAR_SCALE_FACTOR_MAX,
  CAR_SCALE_FACTOR_MIN,
  CAR_SPEED_MPS,
  CAR_TYPES,
  NON_CAR_CLASSES,
  ROAD_WIDTH_DEFAULT_M,
  ROAD_STYLE_LAYER,
  ROAD_WIDTH_M,
  ROAD_WIDTH_REF_M,
  CAR_WHEEL_POSITIONS,
  CARS_ATTRIBUTION,
  CARS_MIN_ZOOM,
  CARS_PMTILES_URL,
  CARS_PROBE_LAYER_ID,
  CARS_SOURCE_ID,
  CARS_SOURCE_LAYER,
  MAX_CARS_PER_SEGMENT,
  MAX_CARS_TOTAL,
  type CarType,
} from "@/config/cars";
import { WATER_LIGHT_DIR } from "@/config/water";
import {
  bboxIntersects,
  mulberry32,
  pointInPolygon,
  ringBBox,
  seedFromRing,
} from "@/lib/map/buildingClip";
import {
  mercatorOrigin,
  projectionMatrixFor,
  type MercatorOrigin,
} from "@/lib/map/threeCustomLayer";
import { measurePath, positionAtFraction, type PathMeasure } from "@/lib/map/pathProgress";
import type { IndexedFeature } from "@/hooks/useGeoIndex";
import type { HoveredBairro, Selection } from "@/types/map";

const CARS_LAYER_ID = "cars-3d-layer";
const CLIP_DEBOUNCE_MS = 120;

interface Cars3DProps {
  /** Liga/desliga a exibição — off por padrão, sem nenhum request de tile/modelo. */
  enabled: boolean;
  selection: Selection | null;
  hoveredBairro: HoveredBairro | null;
  bairros: IndexedFeature[];
  loteamentos: IndexedFeature[];
}

interface ClipTarget {
  key: string;
  geometry: Geometry;
  bbox?: [number, number, number, number];
}

interface Road {
  /** Id estável (classe + extremos) — permite manter os carros ao recalcular vias. */
  id: string;
  coordinates: Position[];
  roadClass: string;
}

interface ActiveCar {
  roadId: string;
  roadClass: string;
  /** Deslocamento lateral (m) do eixo da via, mão direita — recalculado com o zoom. */
  laneOffset: number;
  group: THREE.Group;
  measure: PathMeasure;
  /** Fração (0..1) do ciclo "ida e volta" em que o carro nasce — evita todos saírem sincronizados. */
  phase: number;
  speedFactor: number;
}

interface CarScene {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  origin: MercatorOrigin;
  /** `null` até o glTF terminar de carregar — carros só aparecem depois disso. */
  prefabs: Map<CarType, THREE.Group> | null;
  /** Cena bruta do glTF, mantida só para dispose (prefabs/clones compartilham geometria/material com ela). */
  rawGltfScene: THREE.Object3D | null;
  active: ActiveCar[];
}

/** Centraliza o grupo no plano XZ (mantém Y como veio do modelo) — sem isso o
 * pivot do carro fica na posição em que o tipo foi desenhado dentro do pack
 * (uma fileira de 14 veículos lado a lado), e girar o grupo pra orientar o
 * carro faria ele "orbitar" um ponto distante em vez de girar no próprio eixo. */
function recenterGroupXZ(group: THREE.Group): void {
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  for (const child of group.children) {
    child.position.x -= center.x;
    child.position.z -= center.z;
  }
}

/**
 * Clona `node` como objeto autônomo, "assando" sua matriz de mundo (posição
 * + rotação + escala acumuladas de toda a cadeia de ancestrais, incluindo
 * `RootNode` e a correção de eixo do exportador Sketchfab/FBX) como sua
 * própria matriz local. Necessário porque corpo e rodas são nós-irmãos sob
 * `RootNode` — cada um carrega sua matriz relativa a esse ancestral comum, e
 * cloná-los isolados (como antes) descartava a transform do `RootNode`,
 * deixando o carro com orientação/escala erradas (rodas "somem" dentro do
 * corpo deformado). Clonar com `deep=true` preserva os filhos do próprio
 * nó (as sub-peças do corpo, ex. `Sedan_body grey_0`), que já são relativos
 * a ele e não precisam de correção.
 */
function worldClone(node: THREE.Object3D): THREE.Object3D {
  node.updateWorldMatrix(true, false);
  const clone = node.clone(true);
  clone.matrix.copy(node.matrixWorld);
  clone.matrix.decompose(clone.position, clone.quaternion, clone.scale);
  clone.matrixAutoUpdate = true;
  return clone;
}

function buildCarPrefabs(gltfScene: THREE.Object3D): Map<CarType, THREE.Group> {
  const prefabs = new Map<CarType, THREE.Group>();

  for (const type of CAR_TYPES) {
    const body = gltfScene.getObjectByName(type);
    if (!body) continue;

    const group = new THREE.Group();
    group.add(worldClone(body));
    for (const position of CAR_WHEEL_POSITIONS) {
      const wheel = gltfScene.getObjectByName(`${type} wheel ${position}`);
      if (wheel) group.add(worldClone(wheel));
    }

    recenterGroupXZ(group);
    group.scale.setScalar(CAR_MODEL_SCALE);
    prefabs.set(type, group);
  }

  return prefabs;
}

function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      for (const key of ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "aoMap"] as const) {
        const texture = (material as unknown as Record<string, unknown>)[key];
        if (texture instanceof THREE.Texture) texture.dispose();
      }
      material.dispose();
    }
  });
}

/** Pixels por metro no zoom/latitude (tiles de 512 px do MapLibre). */
function pixelsPerMeter(zoom: number, lat: number): number {
  return (512 * 2 ** zoom) / (40075016.686 * Math.cos((lat * Math.PI) / 180));
}

const stopsCache = new Map<string, [number, number][] | null>();

/** `line-width` (px) da layer do basemap que desenha `roadClass` em `zoom`; `null` se não achar. */
function drawnWidthPx(map: MapLibreMap, roadClass: string, zoom: number): number | null {
  const layerId = ROAD_STYLE_LAYER[roadClass];
  if (!layerId || !map.getLayer(layerId)) return null;
  let stops = stopsCache.get(layerId);
  if (stops === undefined) {
    const width = map.getPaintProperty(layerId, "line-width") as
      | number
      | { stops?: [number, number][] }
      | undefined;
    stops = typeof width === "object" && width?.stops ? width.stops : null;
    // ponytail: só o formato legado `stops` do CARTO; expressões `interpolate` caem no fallback em metros.
    stopsCache.set(layerId, stops);
  }
  if (!stops || stops.length === 0) return null;
  if (zoom <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i += 1) {
    if (zoom <= stops[i][0]) {
      const [z0, w0] = stops[i - 1];
      const [z1, w1] = stops[i];
      return w0 + ((w1 - w0) * (zoom - z0)) / (z1 - z0);
    }
  }
  return stops[stops.length - 1][1];
}

/** Fração 0..1 de um ciclo "ida e volta" (triangular) no instante `elapsedS`. */
function triangleWave(elapsedS: number, phase: number, cycleS: number): { fraction: number; reverse: boolean } {
  if (cycleS <= 0) return { fraction: 0, reverse: false };
  const half = cycleS / 2;
  const t = (((elapsedS + phase * cycleS) % cycleS) + cycleS) % cycleS;
  if (t <= half) return { fraction: t / half, reverse: false };
  return { fraction: 1 - (t - half) / half, reverse: true };
}

/** Exibe carros 3D andando ida-e-volta pelas vias do bairro ou loteamento em foco.
 *
 * Fonte: Overture Maps (tema `transportation`, layer `segment`), fonte
 * vetorial remota. Modelos: pack glTF local. Animada: mantém um
 * `requestAnimationFrame` próprio, ligado só enquanto `enabled` e houver
 * alvo — mesmo padrão de `Water3D.tsx`.
 */
export function Cars3D({ enabled, selection, hoveredBairro, bairros, loteamentos }: Cars3DProps) {
  const { map, isLoaded } = useMap();

  const cacheRef = useRef(new Map<string, Road[]>());
  const lastRoadsRef = useRef<Road[]>([]);
  const sceneRef = useRef<CarScene | null>(null);
  const rafRef = useRef<number | null>(null);
  const publishCarsRef = useRef<((roads: Road[]) => void) | null>(null);
  // Relógio único: reiniciar o loop de animação não pode teletransportar os carros.
  const clockStartRef = useRef(performance.now());
  const targetRef = useRef<ClipTarget | null>(null);

  const target: ClipTarget | null = enabled
    ? selection
      ? (() => {
          const features = selection.level === "loteamento" ? loteamentos : bairros;
          const feature = features.find((item) => item.featureId === selection.featureId);
          if (!feature?.geometry) return null;
          return {
            key: `${selection.level}:${selection.featureId}`,
            geometry: feature.geometry,
            bbox: feature.bbox,
          };
        })()
      : hoveredBairro
        ? (() => {
            const feature = bairros.find((item) => item.featureId === hoveredBairro.featureId);
            if (!feature?.geometry) return null;
            return {
              key: `bairro:${hoveredBairro.featureId}`,
              geometry: feature.geometry,
              bbox: feature.bbox,
            };
          })()
        : null
    : null;

  // Incremental: carros de vias que continuam presentes são mantidos (senão
  // todo pan/zoom os recriaria e eles "pulariam").
  const publishCars = (roads: Road[]) => {
    const refs = sceneRef.current;
    if (!refs || !map) return;
    if (!refs.prefabs) return; // reexecutado via publishCarsRef quando o glTF terminar de carregar

    const wanted = new Set(roads.map((road) => road.id));
    refs.active = refs.active.filter((car) => {
      if (wanted.has(car.roadId)) return true;
      refs.scene.remove(car.group);
      return false;
    });
    const present = new Set(refs.active.map((car) => car.roadId));

    for (const road of roads) {
      if (refs.active.length >= MAX_CARS_TOTAL) break;
      if (present.has(road.id)) continue;

      const measure = measurePath(road.coordinates, refs.origin);
      if (measure.total < CAR_MIN_SPACING_M) continue;

      const rand = mulberry32(seedFromRing(road.coordinates));
      const count = Math.min(MAX_CARS_PER_SEGMENT, Math.floor(measure.total / CAR_MIN_SPACING_M));
      for (let i = 0; i < count && refs.active.length < MAX_CARS_TOTAL; i += 1) {
        const type = CAR_TYPES[Math.floor(rand() * CAR_TYPES.length)];
        const prefab = refs.prefabs.get(type);
        if (!prefab) continue;

        const group = prefab.clone(true);
        refs.scene.add(group);
        refs.active.push({
          roadId: road.id,
          roadClass: road.roadClass,
          laneOffset: 0, // 0 = ainda sem escala; o tick calcula
          group,
          measure,
          phase: rand(),
          speedFactor: 0.8 + rand() * 0.4,
        });
      }
    }

    map.triggerRepaint();
  };
  publishCarsRef.current = publishCars;
  targetRef.current = target;

  const stopAnimation = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const startAnimation = () => {
    if (rafRef.current !== null || !map) return;

    let lastZoom = NaN;
    const tick = (now: number) => {
      const refs = sceneRef.current;
      if (refs && refs.active.length > 0) {
        const elapsedS = (now - clockStartRef.current) / 1000;
        const zoom = map.getZoom();
        const rescale = zoom !== lastZoom;
        lastZoom = zoom;
        const pxPerMeter = pixelsPerMeter(zoom, map.getCenter().lat);
        for (const car of refs.active) {
          const cycleS = (2 * car.measure.total) / (CAR_SPEED_MPS * car.speedFactor);
          const { fraction, reverse } = triangleWave(elapsedS, car.phase, cycleS);
          if (rescale || car.laneOffset === 0) {
            // Largura desenhada da via (px) → metros no zoom atual: o carro
            // acompanha a via como ela aparece, não a largura real.
            const px = drawnWidthPx(map, car.roadClass, zoom);
            const widthM = px === null ? (ROAD_WIDTH_M[car.roadClass] ?? ROAD_WIDTH_DEFAULT_M) : px / pxPerMeter;
            const factor = Math.min(CAR_SCALE_FACTOR_MAX, Math.max(CAR_SCALE_FACTOR_MIN, widthM / ROAD_WIDTH_REF_M));
            car.group.scale.setScalar(CAR_MODEL_SCALE * factor * (CAR_CLASS_BOOST[car.roadClass] ?? 1));
            car.laneOffset = widthM / 4;
          }
          const point = positionAtFraction(car.measure, fraction);
          const heading = point.heading + (reverse ? Math.PI : 0);
          // Mão direita: normal à direita do sentido de marcha (x=leste, z=sul).
          const dx = Math.sin(heading);
          const dz = Math.cos(heading);
          car.group.position.set(
            point.x - dz * car.laneOffset,
            0,
            point.z + dx * car.laneOffset,
          );
          car.group.rotation.set(0, heading + CAR_MODEL_FORWARD_OFFSET, 0);
        }
        map.triggerRepaint();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  // Lifecycle: source vetorial + layer-sonda + custom layer (cena Three.js +
  // carregamento do glTF). Só existem enquanto `enabled` é true.
  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;

    if (!map.getSource(CARS_SOURCE_ID)) {
      map.addSource(CARS_SOURCE_ID, {
        type: "vector",
        url: CARS_PMTILES_URL,
        attribution: CARS_ATTRIBUTION,
      });
    }

    if (!map.getLayer(CARS_PROBE_LAYER_ID)) {
      map.addLayer({
        id: CARS_PROBE_LAYER_ID,
        type: "fill",
        source: CARS_SOURCE_ID,
        "source-layer": CARS_SOURCE_LAYER,
        minzoom: CARS_MIN_ZOOM,
        paint: { "fill-opacity": 0 },
      });
    }

    if (!map.getLayer(CARS_LAYER_ID)) {
      const customLayer: CustomLayerInterface = {
        id: CARS_LAYER_ID,
        type: "custom",
        renderingMode: "3d",
        onAdd(mapInstance, gl) {
          const center = mapInstance.getCenter();
          const origin = mercatorOrigin(center.lng, center.lat);

          const scene = new THREE.Scene();
          const renderer = new THREE.WebGLRenderer({
            canvas: mapInstance.getCanvas(),
            context: gl,
            antialias: true,
          });
          renderer.autoClear = false;

          // Os materiais do glTF são PBR (MeshStandardMaterial) — sem luz
          // na cena eles renderizam pretos, diferente do MeshBasicMaterial
          // usado em Trees3D. Mesma direção de luz de Water3D, por consistência.
          scene.add(new THREE.AmbientLight(0xffffff, 1.2));
          const sun = new THREE.DirectionalLight(0xffffff, 2);
          sun.position.set(WATER_LIGHT_DIR[0], WATER_LIGHT_DIR[1], WATER_LIGHT_DIR[2]);
          scene.add(sun);

          sceneRef.current = { scene, renderer, origin, prefabs: null, rawGltfScene: null, active: [] };

          new GLTFLoader().load(CAR_GLTF_URL, (gltf) => {
            const refs = sceneRef.current;
            if (!refs) return; // layer já removida antes do load terminar
            refs.rawGltfScene = gltf.scene;
            refs.prefabs = buildCarPrefabs(gltf.scene);
            publishCarsRef.current?.(lastRoadsRef.current);
          });
        },
        render(gl, options) {
          const refs = sceneRef.current;
          if (!refs) return;

          const camera = new THREE.Camera();
          camera.projectionMatrix = projectionMatrixFor(
            refs.origin,
            options.defaultProjectionData.mainMatrix,
          );

          refs.renderer.resetState();
          refs.renderer.render(refs.scene, camera);
        },
        onRemove() {
          const refs = sceneRef.current;
          if (!refs) return;

          for (const car of refs.active) refs.scene.remove(car.group);
          if (refs.rawGltfScene) disposeObject3D(refs.rawGltfScene);
          refs.renderer.dispose();
          sceneRef.current = null;
        },
      };

      map.addLayer(customLayer);
    }

    return () => {
      stopAnimation();
      if (map.getLayer(CARS_LAYER_ID)) map.removeLayer(CARS_LAYER_ID);
      if (map.getLayer(CARS_PROBE_LAYER_ID)) map.removeLayer(CARS_PROBE_LAYER_ID);
      if (map.getSource(CARS_SOURCE_ID)) map.removeSource(CARS_SOURCE_ID);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, enabled]);

  // Recorte por bairro/loteamento selecionado ou em hover — mesmo padrão de
  // debounce/moveend/sourcedata das outras camadas 3D.
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (!target) {
      stopAnimation();
      lastRoadsRef.current = [];
      publishCars([]);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    const compute = () => {
      const target = targetRef.current;
      if (!target) return;
      if (map.getZoom() < CARS_MIN_ZOOM) {
        publishCars([]);
        return;
      }

      const bounds = map.getBounds();
      const viewportBBox: [number, number, number, number] = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ];
      const features = map.querySourceFeatures(CARS_SOURCE_ID, {
        sourceLayer: CARS_SOURCE_LAYER,
        filter: ["==", ["get", "subtype"], "road"],
      });

      const { bbox } = target;
      const roads: Road[] = [];
      const seen = new Set<string>();

      for (const feature of features) {
        const roadClass = String(feature.properties?.class ?? "");
        if (NON_CAR_CLASSES.has(roadClass)) continue;

        const geometry = feature.geometry;
        const coordinates: Position[] | null =
          geometry.type === "LineString"
            ? geometry.coordinates
            : geometry.type === "MultiLineString"
              ? (geometry.coordinates[0] ?? null)
              : null;
        if (!coordinates || coordinates.length < 2) continue;

        const lineBBox = ringBBox(coordinates);
        if (!bboxIntersects(lineBBox, viewportBBox)) continue;
        if (bbox && !bboxIntersects(lineBBox, bbox)) continue;

        const midpoint = coordinates[Math.floor(coordinates.length / 2)] as [number, number];
        if (!pointInPolygon(midpoint, target.geometry)) continue;

        const first = coordinates[0];
        const last = coordinates[coordinates.length - 1];
        const id = `${roadClass}:${first[0]},${first[1]}:${last[0]},${last[1]}`;
        if (seen.has(id)) continue; // tiles vizinhos repetem a mesma via
        seen.add(id);

        roads.push({
          id,
          coordinates,
          roadClass,
        });
      }

      lastRoadsRef.current = roads;
      if (map.isSourceLoaded(CARS_SOURCE_ID)) {
        cacheRef.current.set(target.key, roads);
      }

      publishCars(roads);
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(compute, CLIP_DEBOUNCE_MS);
    };

    const handleSourceData = (event: MapSourceDataEvent) => {
      if (event.sourceId === CARS_SOURCE_ID && event.isSourceLoaded) schedule();
    };

    const cached = cacheRef.current.get(target.key);
    if (cached) {
      lastRoadsRef.current = cached;
      publishCars(cached);
    } else {
      schedule();
    }

    startAnimation();

    map.on("sourcedata", handleSourceData);
    map.on("moveend", schedule);

    return () => {
      if (timer) clearTimeout(timer);
      stopAnimation();
      map.off("sourcedata", handleSourceData);
      map.off("moveend", schedule);
    };
    // `target` é recriado a cada render (hover); só a chave importa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, target?.key]);

  return null;
}
