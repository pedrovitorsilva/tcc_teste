"use client";

// Fonte dos carros 3D: Overture Maps (tema `transportation`, layer
// `segment`, `subtype=road`) — mesmo esqueleto de source/probe/recorte das
// outras camadas. Nos cruzamentos o carro sempre vira à direita (grafo
// montado pelas pontas das vias carregadas — ver `advanceAtEnd`).
//
// Modelo: glTF de um carro único em public/cars/scene.gltf. Cada carro na
// cena é um `THREE.Group.clone(true)` do prefab: mais simples que
// InstancedMesh, e a contagem de carros (dezenas, não milhares como as
// árvores) não justifica o custo.
import { useEffect, useRef } from "react";
import type { Position } from "geojson";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useMap } from "@/components/ui/map";
import {
  CAR_GLTF_URL,
  CAR_MIN_SPACING_M,
  CAR_MODEL_FORWARD_OFFSET,
  CAR_CLASS_BOOST,
  CAR_HEADLIGHT_COLOR,
  CAR_HEADLIGHT_GLOW_COLOR,
  CAR_HEADLIGHT_GLOW_RADIUS,
  CAR_HEADLIGHT_INTENSITY,
  CAR_LAMP_SIZE_M,
  CAR_REFERENCE_LENGTH_M,
  CAR_TAILLIGHT_COLOR,
  CAR_MODEL_SCALE,
  CAR_SCALE_FACTOR_MAX,
  CAR_SCALE_FACTOR_MIN,
  CAR_SPEED_MPS,
  NON_CAR_CLASSES,
  ROAD_WIDTH_REF_M,
  CARS_ATTRIBUTION,
  CARS_MIN_ZOOM,
  CARS_PMTILES_URL,
  CARS_PROBE_LAYER_ID,
  CARS_SOURCE_ID,
  CARS_SOURCE_LAYER,
  MAX_CARS_PER_SEGMENT,
  MAX_CARS_TOTAL,
} from "@/config/cars";
import { WATER_LIGHT_DIR } from "@/config/water";
import { lightingFor } from "@/config/lighting";
import {
  bboxIntersects,
  mulberry32,
  pointInPolygon,
  ringBBox,
  seedFromRing,
} from "@/lib/map/buildingClip";
import { radialGlowTexture } from "@/lib/map/glowTexture";
import { createThreeLayer, type ThreeBase } from "@/lib/map/threeCustomLayer";
import { viewportBBox } from "@/lib/map/bbox";
import { addProbedVectorSource, removeProbedVectorSource } from "@/lib/map/layerHelpers";
import { drawnWidthM } from "@/lib/map/roadWidth";
import { measurePath, positionAtFraction, type PathMeasure } from "@/lib/map/pathProgress";
import { useAnimationFrame } from "@/hooks/map/useAnimationFrame";
import { useClipEffect } from "@/hooks/map/useClipEffect";
import { useClipTarget } from "@/hooks/map/useClipTarget";
import type { IndexedFeature } from "@/hooks/useGeoIndex";
import type { HoveredBairro, Selection } from "@/types/map";

const CARS_LAYER_ID = "cars-3d-layer";
const SOURCE = {
  sourceId: CARS_SOURCE_ID,
  probeLayerId: CARS_PROBE_LAYER_ID,
  url: CARS_PMTILES_URL,
  sourceLayer: CARS_SOURCE_LAYER,
  minzoom: CARS_MIN_ZOOM,
  attribution: CARS_ATTRIBUTION,
};
const SOURCE_IDS = [CARS_SOURCE_ID];

interface Cars3DProps {
  /** Liga/desliga a exibição — off por padrão, sem nenhum request de tile/modelo. */
  enabled: boolean;
  /** Tema escuro: luar frio no lugar do sol (config/lighting.ts). */
  night: boolean;
  selection: Selection | null;
  hoveredBairro: HoveredBairro | null;
  bairros: IndexedFeature[];
  loteamentos: IndexedFeature[];
  /** Informa quantos veículos estão sendo exibidos. */
  onCountChange?: (count: number) => void;
}

interface Road {
  /** Id estável (classe + extremos) — permite manter os carros ao recalcular vias. */
  id: string;
  coordinates: Position[];
  roadClass: string;
}
const NO_ROADS: Road[] = [];

interface ActiveCar {
  roadId: string;
  roadClass: string;
  /** Deslocamento lateral (m) do eixo da via, mão direita — recalculado com o zoom. */
  laneOffset: number;
  group: THREE.Group;
  measure: PathMeasure;
  startKey: string;
  endKey: string;
  /** Sentido de marcha na via atual: +1 = início→fim, -1 = fim→início. */
  dir: 1 | -1;
  /** Distância (m) percorrida desde o início da via atual. */
  dist: number;
  speedFactor: number;
}

/** Grafo de vias: nó (ponta compartilhada) → pontas de via que nele terminam. */
interface RoadGraph {
  roads: Map<string, { road: Road; measure: PathMeasure }>;
  nodes: Map<string, { roadId: string; atStart: boolean }[]>;
}

const nodeKey = (position: Position) => `${position[0].toFixed(6)},${position[1].toFixed(6)}`;

/** Menor diferença angular assinada em (-π, π]. */
function angleDiff(a: number, b: number): number {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

/**
 * Ao chegar à ponta de uma via, o carro sempre vira à direita: entre as vias
 * que saem do nó (exceto retorno pela mesma), pega a de menor ângulo relativo
 * (negativo = direita; reto vale 0). Sem saída (ponta de via / fim da área
 * carregada) faz retorno na própria via.
 */
function advanceAtEnd(car: ActiveCar, graph: RoadGraph): void {
  const { measure } = car;
  const atEnd = car.dir > 0;
  const nodePos = atEnd ? car.endKey : car.startKey;
  const incoming = positionAtFraction(measure, atEnd ? 1 : 0).heading + (atEnd ? 0 : Math.PI);

  let best: { roadId: string; atStart: boolean; rel: number } | null = null;
  for (const end of graph.nodes.get(nodePos) ?? []) {
    if (end.roadId === car.roadId && end.atStart === !atEnd) continue;
    const entry = graph.roads.get(end.roadId);
    if (!entry || entry.measure.total < 1) continue;
    const outgoing =
      positionAtFraction(entry.measure, end.atStart ? 0 : 1).heading + (end.atStart ? 0 : Math.PI);
    const rel = angleDiff(incoming, outgoing);
    if (Math.abs(rel) > Math.PI - 0.15) continue; // retorno colado: não é curva
    if (!best || rel < best.rel) best = { roadId: end.roadId, atStart: end.atStart, rel };
  }

  if (!best) {
    car.dir = atEnd ? -1 : 1;
    car.dist = atEnd ? measure.total : 0;
    return;
  }

  const next = graph.roads.get(best.roadId)!;
  car.roadId = best.roadId;
  car.roadClass = next.road.roadClass;
  car.measure = next.measure;
  car.startKey = nodeKey(next.road.coordinates[0]);
  car.endKey = nodeKey(next.road.coordinates[next.road.coordinates.length - 1]);
  car.dir = best.atStart ? 1 : -1;
  car.dist = best.atStart ? 0 : next.measure.total;
  car.laneOffset = 0; // reescala pela nova classe de via
}

/**
 * Geometrias/materiais dos faróis, compartilhados por todos os carros (o
 * `clone(true)` dos prefabs reaproveita as referências). Ligar/desligar a
 * noite é só `material.visible` — 3 flags, sem varrer os carros, e carros
 * nascidos depois já saem no estado certo.
 */
interface CarLights {
  box: THREE.BoxGeometry;
  plane: THREE.PlaneGeometry;
  head: THREE.MeshBasicMaterial;
  tail: THREE.MeshBasicMaterial;
  glow: THREE.MeshBasicMaterial;
}

function createCarLights(): CarLights {
  const plane = new THREE.PlaneGeometry(1, 1);
  plane.rotateX(-Math.PI / 2); // deitado no chão (plano XZ), virado pra cima
  return {
    box: new THREE.BoxGeometry(1, 1, 1),
    plane,
    head: new THREE.MeshBasicMaterial({ color: CAR_HEADLIGHT_COLOR }),
    tail: new THREE.MeshBasicMaterial({ color: CAR_TAILLIGHT_COLOR }),
    // Mesmo halo dos postes (StreetLamps3D): aditivo, cor = intensidade.
    glow: new THREE.MeshBasicMaterial({
      map: radialGlowTexture(),
      color: new THREE.Color(CAR_HEADLIGHT_GLOW_COLOR).multiplyScalar(CAR_HEADLIGHT_INTENSITY),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  };
}

function disposeCarLights(lights: CarLights): void {
  lights.box.dispose();
  lights.plane.dispose();
  lights.glow.map?.dispose();
  for (const material of [lights.head, lights.tail, lights.glow]) material.dispose();
}

interface CarScene extends ThreeBase {
  ambient: THREE.AmbientLight;
  sun: THREE.DirectionalLight;
  lights: CarLights;
  /** `null` até o glTF terminar de carregar — carros só aparecem depois disso. */
  prefab: THREE.Group | null;
  /** Cena bruta do glTF, mantida só para dispose (prefabs/clones compartilham geometria/material com ela). */
  rawGltfScene: THREE.Object3D | null;
  active: ActiveCar[];
}

function applyCarLight(refs: Pick<CarScene, "ambient" | "sun" | "lights">, night: boolean) {
  const lighting = lightingFor(night);
  refs.ambient.color.set(lighting.color);
  refs.ambient.intensity = lighting.ambient;
  refs.sun.color.set(lighting.color);
  refs.sun.intensity = lighting.sun;
  for (const material of [refs.lights.head, refs.lights.tail, refs.lights.glow]) material.visible = night;
}

/** Centraliza o grupo no plano XZ (mantém Y) — o pivot do modelo não é o centro do carro, e girar o grupo faria ele "orbitar" em vez de girar no próprio eixo. */
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

/**
 * Faróis (2), lanternas (2) e o disco de luz no chão, medidos pelo bounding
 * box do próprio modelo — cada tipo tem largura/altura diferente. Chamado
 * antes da escala do prefab, então tudo acompanha a escala do carro.
 */
function addCarLights(group: THREE.Group, lights: CarLights): void {
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const m = size.z / CAR_REFERENCE_LENGTH_M; // unidades do modelo por metro de carro real
  // Frente do modelo: +Z, ou -Z se o offset de rotação virar o carro.
  const frontSign = Math.cos(CAR_MODEL_FORWARD_OFFSET) >= 0 ? 1 : -1;
  const frontZ = frontSign > 0 ? box.max.z : box.min.z;
  const rearZ = frontSign > 0 ? box.min.z : box.max.z;

  const [lampW, lampH, lampD] = CAR_LAMP_SIZE_M.map((v) => v * m);
  const lampY = box.min.y + size.y * 0.4;
  for (const [material, z] of [
    [lights.head, frontZ],
    [lights.tail, rearZ],
  ] as const) {
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(lights.box, material);
      lamp.scale.set(lampW, lampH, lampD);
      lamp.position.set(side * (size.x / 2 - lampW), lampY, z);
      group.add(lamp);
    }
  }

  // Disco centrado meio raio à frente do para-choque: a luz cai na via, não
  // embaixo do carro. Um pouco acima do chão pra não brigar no depth.
  const radius = CAR_HEADLIGHT_GLOW_RADIUS * m;
  const glow = new THREE.Mesh(lights.plane, lights.glow);
  glow.scale.set(radius * 2, 1, radius * 2);
  glow.position.set(0, box.min.y + 0.05 * m, frontZ + frontSign * radius * 0.5);
  group.add(glow);
}

function buildCarPrefab(gltfScene: THREE.Object3D, lights: CarLights): THREE.Group {
  const group = new THREE.Group();
  group.add(worldClone(gltfScene));
  recenterGroupXZ(group);
  addCarLights(group, lights);
  group.scale.setScalar(CAR_MODEL_SCALE);
  return group;
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

/** Exibe carros 3D andando pelas vias (sempre virando à direita nos cruzamentos) do bairro ou loteamento em foco.
 *
 * Fonte: Overture Maps (tema `transportation`, layer `segment`), fonte
 * vetorial remota. Modelo: glTF local. Animada: `requestAnimationFrame`
 * ligado só enquanto houver alvo — mesmo padrão de `Water3D.tsx`.
 */
export function Cars3D({ enabled, night, selection, hoveredBairro, bairros, loteamentos, onCountChange }: Cars3DProps) {
  const { map, isLoaded } = useMap();
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  const lastRoadsRef = useRef<Road[]>([]);
  const sceneRef = useRef<CarScene | null>(null);
  const publishCarsRef = useRef<((roads: Road[]) => void) | null>(null);
  const graphRef = useRef<RoadGraph>({ roads: new Map(), nodes: new Map() });
  /** Vias que já receberam carros — carros migram entre vias, então "tem carro agora" não serve. */
  const spawnedRef = useRef(new Set<string>());
  const lastZoomRef = useRef(NaN);
  // Lido no onAdd: a cena pode nascer (toggle ligado) já à noite.
  const nightRef = useRef(night);
  nightRef.current = night;

  const target = useClipTarget(enabled, selection, hoveredBairro, bairros, loteamentos);

  // Incremental: carros de vias que continuam presentes são mantidos (senão
  // todo pan/zoom os recriaria e eles "pulariam").
  const publishCars = (roads: Road[]) => {
    lastRoadsRef.current = roads;
    const refs = sceneRef.current;
    if (!refs || !map) return;
    const { prefab } = refs;
    if (!prefab) return; // reexecutado via publishCarsRef quando o glTF terminar de carregar

    const graph: RoadGraph = { roads: new Map(), nodes: new Map() };
    for (const road of roads) {
      const measure = measurePath(road.coordinates, refs.origin);
      graph.roads.set(road.id, { road, measure });
      const ends: [string, boolean][] = [
        [nodeKey(road.coordinates[0]), true],
        [nodeKey(road.coordinates[road.coordinates.length - 1]), false],
      ];
      for (const [key, atStart] of ends) {
        const list = graph.nodes.get(key);
        if (list) list.push({ roadId: road.id, atStart });
        else graph.nodes.set(key, [{ roadId: road.id, atStart }]);
      }
    }
    graphRef.current = graph;

    // Carros cuja via saiu da área carregada somem; os demais seguem.
    refs.active = refs.active.filter((car) => {
      if (graph.roads.has(car.roadId)) return true;
      refs.scene.remove(car.group);
      return false;
    });
    const spawned = spawnedRef.current;
    for (const id of spawned) if (!graph.roads.has(id)) spawned.delete(id);

    for (const road of roads) {
      if (refs.active.length >= MAX_CARS_TOTAL) break;
      if (spawned.has(road.id)) continue;

      const { measure } = graph.roads.get(road.id)!;
      if (measure.total < CAR_MIN_SPACING_M) continue;
      spawned.add(road.id);

      const rand = mulberry32(seedFromRing(road.coordinates));
      const count = Math.min(MAX_CARS_PER_SEGMENT, Math.floor(measure.total / CAR_MIN_SPACING_M));
      for (let i = 0; i < count && refs.active.length < MAX_CARS_TOTAL; i += 1) {
        const group = prefab.clone(true);
        refs.scene.add(group);
        refs.active.push({
          roadId: road.id,
          roadClass: road.roadClass,
          laneOffset: 0, // 0 = ainda sem escala; o tick calcula
          group,
          measure,
          startKey: nodeKey(road.coordinates[0]),
          endKey: nodeKey(road.coordinates[road.coordinates.length - 1]),
          dir: rand() < 0.5 ? 1 : -1,
          dist: rand() * measure.total,
          speedFactor: 0.8 + rand() * 0.4,
        });
      }
    }

    onCountChangeRef.current?.(refs.active.length);
    map.triggerRepaint();
  };
  publishCarsRef.current = publishCars;

  useAnimationFrame(target !== null, (_now, dtS) => {
    const refs = sceneRef.current;
    if (!map || !refs || refs.active.length === 0) return;
    const zoom = map.getZoom();
    const rescale = zoom !== lastZoomRef.current;
    lastZoomRef.current = zoom;
    for (const car of refs.active) {
      car.dist += car.dir * CAR_SPEED_MPS * car.speedFactor * dtS;
      if (car.dir > 0 ? car.dist >= car.measure.total : car.dist <= 0) {
        advanceAtEnd(car, graphRef.current);
      }
      const fraction = car.measure.total > 0 ? Math.min(1, Math.max(0, car.dist / car.measure.total)) : 0;
      if (rescale || car.laneOffset === 0) {
        const widthM = drawnWidthM(map, car.roadClass);
        const factor = Math.min(CAR_SCALE_FACTOR_MAX, Math.max(CAR_SCALE_FACTOR_MIN, widthM / ROAD_WIDTH_REF_M));
        car.group.scale.setScalar(CAR_MODEL_SCALE * factor * (CAR_CLASS_BOOST[car.roadClass] ?? 1));
        car.laneOffset = widthM / 4;
      }
      const point = positionAtFraction(car.measure, fraction);
      const heading = point.heading + (car.dir < 0 ? Math.PI : 0);
      // Mão direita: normal à direita do sentido de marcha (x=leste, z=sul).
      const dx = Math.sin(heading);
      const dz = Math.cos(heading);
      car.group.position.set(point.x - dz * car.laneOffset, 0, point.z + dx * car.laneOffset);
      car.group.rotation.set(0, heading + CAR_MODEL_FORWARD_OFFSET, 0);
    }
    map.triggerRepaint();
  });

  // Lifecycle: source vetorial + layer-sonda + custom layer (cena Three.js +
  // carregamento do glTF). Só existem enquanto `enabled` é true.
  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;

    addProbedVectorSource(map, SOURCE);

    if (!map.getLayer(CARS_LAYER_ID)) {
      map.addLayer(
        createThreeLayer(CARS_LAYER_ID, sceneRef, {
          setup(base) {
            // Os materiais do glTF são PBR (MeshStandardMaterial) — sem luz
            // na cena eles renderizam pretos, diferente do MeshBasicMaterial
            // usado em Trees3D. Mesma direção de luz de Water3D, por consistência.
            const ambient = new THREE.AmbientLight();
            const sun = new THREE.DirectionalLight();
            sun.position.set(WATER_LIGHT_DIR[0], WATER_LIGHT_DIR[1], WATER_LIGHT_DIR[2]);
            const lights = createCarLights();
            applyCarLight({ ambient, sun, lights }, nightRef.current);
            base.scene.add(ambient, sun);

            const refs: CarScene = { ...base, ambient, sun, lights, prefab: null, rawGltfScene: null, active: [] };
            new GLTFLoader().load(CAR_GLTF_URL, (gltf) => {
              if (sceneRef.current !== refs) return; // layer já removida antes do load terminar
              refs.rawGltfScene = gltf.scene;
              refs.prefab = buildCarPrefab(gltf.scene, refs.lights);
              publishCarsRef.current?.(lastRoadsRef.current);
            });
            return refs;
          },
          dispose(refs) {
            for (const car of refs.active) refs.scene.remove(car.group);
            if (refs.rawGltfScene) disposeObject3D(refs.rawGltfScene);
            disposeCarLights(refs.lights);
          },
        }),
      );
    }

    return () => {
      onCountChangeRef.current?.(0);
      if (map.getLayer(CARS_LAYER_ID)) map.removeLayer(CARS_LAYER_ID);
      removeProbedVectorSource(map, SOURCE);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, enabled]);

  useEffect(() => {
    const refs = sceneRef.current;
    if (!refs || !map) return;
    applyCarLight(refs, night);
    map.triggerRepaint();
  }, [map, night]);

  // Recorte por bairro/loteamento selecionado ou em hover.
  useClipEffect({
    map,
    isLoaded,
    target,
    sourceIds: SOURCE_IDS,
    minZoom: CARS_MIN_ZOOM,
    empty: NO_ROADS,
    publish: publishCars,
    compute: (target) => {
      const viewport = viewportBBox(map!);
      const features = map!.querySourceFeatures(CARS_SOURCE_ID, {
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
        if (!bboxIntersects(lineBBox, viewport)) continue;
        if (bbox && !bboxIntersects(lineBBox, bbox)) continue;

        const midpoint = coordinates[Math.floor(coordinates.length / 2)] as [number, number];
        if (!pointInPolygon(midpoint, target.geometry)) continue;

        const first = coordinates[0];
        const last = coordinates[coordinates.length - 1];
        const id = `${roadClass}:${first[0]},${first[1]}:${last[0]},${last[1]}`;
        if (seen.has(id)) continue; // tiles vizinhos repetem a mesma via
        seen.add(id);

        roads.push({ id, coordinates, roadClass });
      }

      return roads;
    },
  });

  return null;
}
