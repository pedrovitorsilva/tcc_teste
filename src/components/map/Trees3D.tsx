"use client";

// Fonte da vegetação 3D: Overture Maps (tema `base`, layers `land_cover` e
// `land_use`), por HTTP range request — mesmo padrão do Buildings3D, com uma
// cena Three.js própria (CustomLayerInterface) no lugar de fill-extrusion nativo.
import { useEffect, useRef } from "react";
import type { Geometry, Position } from "geojson";
import * as THREE from "three";
import { useMap } from "@/components/ui/map";
import {
  LANDUSE_VEGETATION_SUBTYPES,
  MAX_TREES_FOREST,
  MAX_TREES_OPEN,
  MAX_TREES_PER_POLYGON_FOREST,
  MAX_TREES_PER_POLYGON_OPEN,
  MAX_TREES_TOTAL,
  TREE_CANOPY_COLOR_DARK,
  TREE_CANOPY_COLOR_LIGHT,
  TREE_CANOPY_HEIGHT,
  TREE_CANOPY_RADIUS,
  TREE_DENSITY_BY_SUBTYPE,
  TREE_SPACING_FOREST,
  TREE_SPACING_OPEN,
  TREE_TRUNK_COLOR,
  TREE_TRUNK_HEIGHT,
  TREE_TRUNK_RADIUS,
  VEGETATION_ATTRIBUTION,
  VEGETATION_LANDUSE_PROBE_LAYER_ID,
  VEGETATION_LANDUSE_SOURCE_ID,
  VEGETATION_LANDUSE_SOURCE_LAYER,
  VEGETATION_MIN_ZOOM,
  VEGETATION_PMTILES_URL,
  VEGETATION_PROBE_LAYER_ID,
  VEGETATION_SOURCE_ID,
  VEGETATION_SOURCE_LAYER,
  VEGETATION_SUBTYPES,
  VEGETATION_WATER_PROBE_LAYER_ID,
  VEGETATION_WATER_SOURCE_ID,
  VEGETATION_WATER_SOURCE_LAYER,
  type AnyVegetationSubtype,
} from "@/config/vegetation";
import {
  approxAreaM2,
  bboxIntersects,
  lodMinAreaM2,
  mulberry32,
  outerRing,
  pointInPolygon,
  randomPointsInRing,
  ringBBox,
  ringCentroid,
  seedFromRing,
} from "@/lib/map/buildingClip";
import { createThreeLayer, lngLatToLocalMeters, type ThreeBase } from "@/lib/map/threeCustomLayer";
import { viewportBBox } from "@/lib/map/bbox";
import { addProbedVectorSource, removeProbedVectorSource } from "@/lib/map/layerHelpers";
import { lightingFor } from "@/config/lighting";
import { useClipEffect } from "@/hooks/map/useClipEffect";
import { useClipTarget } from "@/hooks/map/useClipTarget";
import type { IndexedFeature } from "@/hooks/useGeoIndex";
import type { HoveredBairro, Selection } from "@/types/map";

const TREES_LAYER_ID = "trees-3d-layer";

// `park` mora em `land_use`, uma source-layer separada de `land_cover` dentro
// do mesmo `base.pmtiles` — MapLibre exige uma source por combinação de
// URL+tipo, mas todas apontam pro mesmo arquivo remoto. A de água existe só
// pra não espalhar árvore dentro d'água (land_cover/land_use podem se
// sobrepor com `water` na borda) — independente da source do Water3D, os dois
// toggles ligam/desligam sem depender um do outro.
const SOURCES = [
  [VEGETATION_SOURCE_ID, VEGETATION_PROBE_LAYER_ID, VEGETATION_SOURCE_LAYER],
  [VEGETATION_LANDUSE_SOURCE_ID, VEGETATION_LANDUSE_PROBE_LAYER_ID, VEGETATION_LANDUSE_SOURCE_LAYER],
  [VEGETATION_WATER_SOURCE_ID, VEGETATION_WATER_PROBE_LAYER_ID, VEGETATION_WATER_SOURCE_LAYER],
].map(([sourceId, probeLayerId, sourceLayer]) => ({
  sourceId,
  probeLayerId,
  sourceLayer,
  url: VEGETATION_PMTILES_URL,
  minzoom: VEGETATION_MIN_ZOOM,
  attribution: VEGETATION_ATTRIBUTION,
}));
const SOURCE_IDS = SOURCES.map((source) => source.sourceId);
const NO_TREES: [number, number][] = [];

/** Orçamento por nível de densidade (ver TREE_DENSITY_BY_SUBTYPE). */
const DENSITY = {
  forest: { spacingM2: TREE_SPACING_FOREST, perPolygon: MAX_TREES_PER_POLYGON_FOREST, max: MAX_TREES_FOREST },
  open: { spacingM2: TREE_SPACING_OPEN, perPolygon: MAX_TREES_PER_POLYGON_OPEN, max: MAX_TREES_OPEN },
} as const;

/** Hash determinístico em [0, 1) — `%` do JS preserva o sinal, daí o `+ 100`. */
const hash01 = (v: number) => (((v % 100) + 100) % 100) / 100;

interface Trees3DProps {
  /** Liga/desliga a exibição — off por padrão, sem nenhum request de tile. */
  enabled: boolean;
  /** Tema escuro: luar frio no lugar do sol (config/lighting.ts). */
  night: boolean;
  selection: Selection | null;
  hoveredBairro: HoveredBairro | null;
  bairros: IndexedFeature[];
  loteamentos: IndexedFeature[];
}

interface TreeScene extends ThreeBase {
  trunks: THREE.InstancedMesh;
  /** Copa em 2 cones (inferior invertido + superior), mesma matriz por árvore. */
  canopyLow: THREE.InstancedMesh;
  canopyHigh: THREE.InstancedMesh;
  light: THREE.HemisphereLight;
}

function applyTreeLight(light: THREE.HemisphereLight, night: boolean) {
  const lighting = lightingFor(night);
  light.color.set(lighting.color);
  light.intensity = lighting.hemisphere;
}

/** Espalha árvores dentro do bairro ou loteamento em foco.
 *
 * Fonte da vegetação 3D: Overture Maps (tema `base`, layers `land_cover` e
 * `land_use`), fontes vetoriais remotas. Estática: sem `requestAnimationFrame`,
 * só redesenha quando o MapLibre já ia redesenhar por outro motivo (pan, zoom,
 * troca de tema).
 */
export function Trees3D({
  enabled,
  night,
  selection,
  hoveredBairro,
  bairros,
  loteamentos,
}: Trees3DProps) {
  const { map, isLoaded } = useMap();

  const sceneRef = useRef<TreeScene | null>(null);
  // Lido no onAdd: a cena pode nascer (toggle ligado) já à noite.
  const nightRef = useRef(night);
  nightRef.current = night;

  const target = useClipTarget(enabled, selection, hoveredBairro, bairros, loteamentos);

  /** Recria as InstancedMesh (tronco + 2 cones de copa) a partir de uma lista de posições. */
  const publishTrees = (positions: [number, number][]) => {
    const refs = sceneRef.current;
    if (!refs || !map) return;

    const dummy = new THREE.Object3D();
    const dark = new THREE.Color(TREE_CANOPY_COLOR_DARK);
    const light = new THREE.Color(TREE_CANOPY_COLOR_LIGHT);
    const color = new THREE.Color();

    const count = Math.min(positions.length, MAX_TREES_TOTAL);
    for (let i = 0; i < count; i += 1) {
      const [lng, lat] = positions[i];
      const { x, z } = lngLatToLocalMeters(refs.origin, [lng, lat]);
      dummy.position.set(x, 0, z);
      // Rotação, altura, largura e cor determinísticas a partir da posição —
      // mesma árvore sempre igual, sem `Math.random()` (recorte roda de novo
      // a cada moveend).
      const raw = (x * 928371 + z * 12345) % (Math.PI * 2);
      dummy.rotation.y = raw < 0 ? raw + Math.PI * 2 : raw;
      const height = 0.8 + 0.5 * hash01(x * 928371 + z * 12345);
      const width = 0.85 + 0.3 * hash01(x * 123456 + z * 654321);
      dummy.scale.set(width, height, width);
      dummy.updateMatrix();
      refs.trunks.setMatrixAt(i, dummy.matrix);
      refs.canopyLow.setMatrixAt(i, dummy.matrix);
      refs.canopyHigh.setMatrixAt(i, dummy.matrix);

      color.lerpColors(dark, light, mulberry32(seedFromRing([[lng, lat]]))());
      refs.canopyLow.setColorAt(i, color);
      refs.canopyHigh.setColorAt(i, color);
    }

    for (const mesh of [refs.trunks, refs.canopyLow, refs.canopyHigh]) {
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      // O Three só calcula o boundingSphere da InstancedMesh uma vez (no 1º
      // render, quando count ainda é 0 → esfera vazia) e o frustum culling
      // passa a descartar a mesh inteira para sempre. Recalcula a cada publish.
      mesh.computeBoundingSphere();
    }

    map.triggerRepaint();
  };

  // Lifecycle: sources vetoriais + layers-sonda + custom layer (cena Three.js).
  // Só existem enquanto `enabled` é true.
  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;

    for (const source of SOURCES) addProbedVectorSource(map, source);

    if (!map.getLayer(TREES_LAYER_ID)) {
      map.addLayer(
        createThreeLayer(TREES_LAYER_ID, sceneRef, {
          setup(base) {
            const trunkGeometry = new THREE.CylinderGeometry(
              TREE_TRUNK_RADIUS,
              TREE_TRUNK_RADIUS,
              TREE_TRUNK_HEIGHT,
              6,
            );
            trunkGeometry.translate(0, TREE_TRUNK_HEIGHT / 2, 0);

            // Copa em 2 cones formando um losango (mais larga, sem pico fino):
            // o de baixo invertido (ponta no tronco), o de cima normal, base com base.
            const lowHeight = TREE_CANOPY_HEIGHT * 0.6;
            const highHeight = TREE_CANOPY_HEIGHT * 0.8;
            const canopyLowGeometry = new THREE.ConeGeometry(TREE_CANOPY_RADIUS * 0.8, lowHeight, 7);
            canopyLowGeometry.rotateX(Math.PI);
            canopyLowGeometry.translate(0, TREE_TRUNK_HEIGHT + lowHeight / 2, 0);
            const canopyHighGeometry = new THREE.ConeGeometry(TREE_CANOPY_RADIUS * 1.1, highHeight, 7);
            canopyHighGeometry.translate(0, TREE_TRUNK_HEIGHT + lowHeight + highHeight / 2, 0);

            const trunkMaterial = new THREE.MeshLambertMaterial({ color: TREE_TRUNK_COLOR });
            // Cor branca: a cor real vem por instância (instanceColor multiplica material.color).
            const canopyMaterial = new THREE.MeshLambertMaterial();

            const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, MAX_TREES_TOTAL);
            const canopyLow = new THREE.InstancedMesh(canopyLowGeometry, canopyMaterial, MAX_TREES_TOTAL);
            const canopyHigh = new THREE.InstancedMesh(canopyHighGeometry, canopyMaterial, MAX_TREES_TOTAL);
            for (const mesh of [trunks, canopyLow, canopyHigh]) mesh.count = 0;

            const light = new THREE.HemisphereLight(0xffffff, 0x3a2a1a);
            applyTreeLight(light, nightRef.current);
            base.scene.add(light, trunks, canopyLow, canopyHigh);

            return { ...base, trunks, canopyLow, canopyHigh, light };
          },
          dispose(refs) {
            for (const mesh of [refs.trunks, refs.canopyLow, refs.canopyHigh]) {
              mesh.geometry.dispose();
              (mesh.material as THREE.Material).dispose();
            }
          },
        }),
      );
    }

    return () => {
      if (map.getLayer(TREES_LAYER_ID)) map.removeLayer(TREES_LAYER_ID);
      for (const source of SOURCES) removeProbedVectorSource(map, source);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, enabled]);

  useEffect(() => {
    const refs = sceneRef.current;
    if (!refs || !map) return;
    applyTreeLight(refs.light, night);
    map.triggerRepaint();
  }, [map, night]);

  // Recorte por bairro/loteamento selecionado ou em hover.
  useClipEffect({
    map,
    isLoaded,
    target,
    sourceIds: SOURCE_IDS,
    minZoom: VEGETATION_MIN_ZOOM,
    empty: NO_TREES,
    publish: publishTrees,
    compute: (target) => {
      const startedAt = performance.now();
      const viewport = viewportBBox(map!);
      const minArea = lodMinAreaM2(map!.getZoom());

      // Duas fontes, mesmo critério de recorte: land_cover (forest/grass/
      // shrub/wetland) e land_use (park) — combinadas numa lista única de
      // candidatos antes do filtro espacial, pra não duplicar a lógica.
      const landCoverFeatures = map!.querySourceFeatures(VEGETATION_SOURCE_ID, {
        sourceLayer: VEGETATION_SOURCE_LAYER,
      });
      const landUseFeatures = map!.querySourceFeatures(VEGETATION_LANDUSE_SOURCE_ID, {
        sourceLayer: VEGETATION_LANDUSE_SOURCE_LAYER,
      });

      const candidates: { geometry: Geometry; subtype: AnyVegetationSubtype }[] = [];

      for (const feature of landCoverFeatures) {
        const subtype = feature.properties?.subtype;
        if (
          typeof subtype === "string" &&
          (VEGETATION_SUBTYPES as readonly string[]).includes(subtype)
        ) {
          candidates.push({ geometry: feature.geometry, subtype: subtype as AnyVegetationSubtype });
        }
      }

      for (const feature of landUseFeatures) {
        const subtype = feature.properties?.subtype;
        if (
          typeof subtype === "string" &&
          (LANDUSE_VEGETATION_SUBTYPES as readonly string[]).includes(subtype)
        ) {
          candidates.push({ geometry: feature.geometry, subtype: subtype as AnyVegetationSubtype });
        }
      }

      // Anéis de água no viewport — testados por polígono a cada ponto
      // sorteado, pra não deixar árvore nascer dentro d'água.
      const waterFeatures = map!.querySourceFeatures(VEGETATION_WATER_SOURCE_ID, {
        sourceLayer: VEGETATION_WATER_SOURCE_LAYER,
      });
      const waterRings: Position[][] = [];
      for (const feature of waterFeatures) {
        const ring = outerRing(feature.geometry);
        if (!ring) continue;
        if (!bboxIntersects(ringBBox(ring), viewport)) continue;
        waterRings.push(ring);
      }
      const isOnWater = (point: [number, number]) =>
        waterRings.some((ring) => pointInPolygon(point, { type: "Polygon", coordinates: [ring] }));

      const { bbox } = target;
      // Um orçamento por nível de densidade — mata estourando o dela não
      // consome o dos campos abertos.
      const placed = { forest: [] as [number, number][], open: [] as [number, number][] };

      for (const { geometry, subtype } of candidates) {
        const density = TREE_DENSITY_BY_SUBTYPE[subtype];
        const { spacingM2, perPolygon, max } = DENSITY[density];
        const positions = placed[density];
        if (positions.length >= max) continue;

        const ring = outerRing(geometry);
        if (!ring) continue;

        // Interseção de bbox, não "centroide dentro": um polígono de
        // land_cover/land_use (floresta, parque, por ex.) costuma ser bem
        // maior que a tela em zooms altos — o viewport pode estar inteiro
        // dentro dele sem que o centroide (calculado sobre o polígono
        // inteiro) esteja no viewport. Testar só o centroide fazia as
        // árvores sumirem ao aproximar o zoom.
        const ringBox = ringBBox(ring);
        if (!bboxIntersects(ringBox, viewport)) continue;
        if (bbox && !bboxIntersects(ringBox, bbox)) continue;

        const area = approxAreaM2(ring);
        if (area < minArea) continue; // LOD: mancha pequena demais pro zoom atual

        const centroid = ringCentroid(ring);
        if (!pointInPolygon(centroid, target.geometry)) continue;

        // Corta no que sobra do orçamento: randomPointsInRing é determinístico
        // e sequencial, então pedir menos pontos só pega um prefixo dos mesmos.
        const treeCount = Math.min(
          Math.round(area / spacingM2),
          perPolygon,
          max - positions.length,
        );
        if (treeCount <= 0) continue;

        for (const point of randomPointsInRing(ring, treeCount)) {
          if (!isOnWater(point)) positions.push(point);
        }
      }

      console.log(
        `[Trees3D] compute ${(performance.now() - startedAt).toFixed(1)} ms — ` +
          `${placed.forest.length} mata + ${placed.open.length} aberto (${target.key})`,
      );
      return [...placed.forest, ...placed.open];
    },
  });

  return null;
}
