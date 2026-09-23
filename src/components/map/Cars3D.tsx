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
import type { CustomLayerInterface, MapSourceDataEvent } from "maplibre-gl";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useMap } from "@/components/ui/map";
import {
  CAR_GLTF_URL,
  CAR_MIN_SPACING_M,
  CAR_MODEL_FORWARD_OFFSET,
  CAR_MODEL_SCALE,
  CAR_SPEED_MPS,
  CAR_TYPES,
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

interface ActiveCar {
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

  const cacheRef = useRef(new Map<string, Position[][]>());
  const lastRoadsRef = useRef<Position[][]>([]);
  const sceneRef = useRef<CarScene | null>(null);
  const rafRef = useRef<number | null>(null);
  const publishCarsRef = useRef<((roads: Position[][]) => void) | null>(null);

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

  const publishCars = (roads: Position[][]) => {
    const refs = sceneRef.current;
    if (!refs || !map) return;

    for (const car of refs.active) refs.scene.remove(car.group);
    refs.active = [];

    if (!refs.prefabs) return; // reexecutado via publishCarsRef quando o glTF terminar de carregar

    let totalCars = 0;
    for (const coordinates of roads) {
      if (totalCars >= MAX_CARS_TOTAL) break;

      const measure = measurePath(coordinates, refs.origin);
      if (measure.total < CAR_MIN_SPACING_M) continue;

      const rand = mulberry32(seedFromRing(coordinates));
      const count = Math.min(MAX_CARS_PER_SEGMENT, Math.floor(measure.total / CAR_MIN_SPACING_M));

      for (let i = 0; i < count && totalCars < MAX_CARS_TOTAL; i += 1) {
        const type = CAR_TYPES[Math.floor(rand() * CAR_TYPES.length)];
        const prefab = refs.prefabs.get(type);
        if (!prefab) continue;

        const group = prefab.clone(true);
        refs.scene.add(group);
        refs.active.push({
          group,
          measure,
          phase: rand(),
          speedFactor: 0.8 + rand() * 0.4,
        });
        totalCars += 1;
      }
    }

    map.triggerRepaint();
  };
  publishCarsRef.current = publishCars;

  const stopAnimation = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const startAnimation = () => {
    if (rafRef.current !== null || !map) return;

    const start = performance.now();
    const tick = (now: number) => {
      const refs = sceneRef.current;
      if (refs && refs.active.length > 0) {
        const elapsedS = (now - start) / 1000;
        for (const car of refs.active) {
          const cycleS = (2 * car.measure.total) / (CAR_SPEED_MPS * car.speedFactor);
          const { fraction, reverse } = triangleWave(elapsedS, car.phase, cycleS);
          const point = positionAtFraction(car.measure, fraction);
          car.group.position.set(point.x, 0, point.z);
          car.group.rotation.set(0, point.heading + (reverse ? Math.PI : 0) + CAR_MODEL_FORWARD_OFFSET, 0);
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
      const roads: Position[][] = [];

      for (const feature of features) {
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

        roads.push(coordinates);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, target]);

  return null;
}
