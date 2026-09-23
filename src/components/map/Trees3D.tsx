"use client";

// Fonte da vegetação 3D: Overture Maps (tema `base`, layers `land_cover` e
// `land_use`), por HTTP range request — mesmo padrão do Buildings3D, com uma
// cena Three.js própria (CustomLayerInterface) no lugar de fill-extrusion nativo.
import { useEffect, useMemo, useRef } from "react";
import type { Geometry, Position } from "geojson";
import type { CustomLayerInterface, MapSourceDataEvent } from "maplibre-gl";
import * as THREE from "three";
import { useMap } from "@/components/ui/map";
import {
  LANDUSE_VEGETATION_SUBTYPES,
  MAX_TREES_PER_POLYGON,
  MAX_TREES_TOTAL,
  TREE_CANOPY_COLOR,
  TREE_CANOPY_HEIGHT,
  TREE_CANOPY_RADIUS,
  TREE_SPACING_M2_BY_SUBTYPE,
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
  outerRing,
  pointInPolygon,
  randomPointsInRing,
  ringBBox,
  ringCentroid,
} from "@/lib/map/buildingClip";
import {
  lngLatToLocalMeters,
  mercatorOrigin,
  projectionMatrixFor,
  type MercatorOrigin,
} from "@/lib/map/threeCustomLayer";
import type { IndexedFeature } from "@/hooks/useGeoIndex";
import type { HoveredBairro, Selection } from "@/types/map";

const TREES_LAYER_ID = "trees-3d-layer";
const CLIP_DEBOUNCE_MS = 120;

interface Trees3DProps {
  /** Liga/desliga a exibição — off por padrão, sem nenhum request de tile. */
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

interface TreeScene {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  trunks: THREE.InstancedMesh;
  canopies: THREE.InstancedMesh;
  origin: MercatorOrigin;
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
  selection,
  hoveredBairro,
  bairros,
  loteamentos,
}: Trees3DProps) {
  const { map, isLoaded } = useMap();

  const cacheRef = useRef(new Map<string, [number, number][]>());
  const sceneRef = useRef<TreeScene | null>(null);

  const target: ClipTarget | null = useMemo(() => {
    if (!enabled) return null;

    if (selection) {
      const features = selection.level === "loteamento" ? loteamentos : bairros;
      const feature = features.find((item) => item.featureId === selection.featureId);
      if (!feature?.geometry) return null;
      return {
        key: `${selection.level}:${selection.featureId}`,
        geometry: feature.geometry,
        bbox: feature.bbox,
      };
    }

    if (hoveredBairro) {
      const feature = bairros.find((item) => item.featureId === hoveredBairro.featureId);
      if (!feature?.geometry) return null;
      return {
        key: `bairro:${hoveredBairro.featureId}`,
        geometry: feature.geometry,
        bbox: feature.bbox,
      };
    }

    return null;
  }, [enabled, selection, hoveredBairro, bairros, loteamentos]);

  /** Recria as duas InstancedMesh (tronco+copa) a partir de uma lista de posições. */
  const publishTrees = (positions: [number, number][]) => {
    const refs = sceneRef.current;
    if (!refs || !map) return;

    const matrix = new THREE.Matrix4();
    const dummy = new THREE.Object3D();

    const count = Math.min(positions.length, MAX_TREES_TOTAL);
    for (let i = 0; i < count; i += 1) {
      const [lng, lat] = positions[i];
      const { x, z } = lngLatToLocalMeters(refs.origin, [lng, lat]);
      dummy.position.set(x, 0, z);
      // Ângulo determinístico a partir da posição — mesma árvore sempre com a
      // mesma rotação, sem `Math.random()` (recorte roda de novo a cada moveend).
      const raw = (x * 928371 + z * 12345) % (Math.PI * 2);
      dummy.rotation.y = raw < 0 ? raw + Math.PI * 2 : raw;
      dummy.updateMatrix();
      matrix.copy(dummy.matrix);
      refs.trunks.setMatrixAt(i, matrix);
      refs.canopies.setMatrixAt(i, matrix);
    }

    refs.trunks.count = count;
    refs.canopies.count = count;
    refs.trunks.instanceMatrix.needsUpdate = true;
    refs.canopies.instanceMatrix.needsUpdate = true;

    map.triggerRepaint();
  };

  // Lifecycle: source vetorial + layer-sonda + custom layer (cena Three.js).
  // Só existem enquanto `enabled` é true.
  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;

    if (!map.getSource(VEGETATION_SOURCE_ID)) {
      map.addSource(VEGETATION_SOURCE_ID, {
        type: "vector",
        url: VEGETATION_PMTILES_URL,
        attribution: VEGETATION_ATTRIBUTION,
      });
    }

    // `park` mora em `land_use`, uma source-layer separada de `land_cover`
    // dentro do mesmo `base.pmtiles` — MapLibre exige uma source por
    // combinação de URL+tipo, mas ambas apontam pro mesmo arquivo remoto.
    if (!map.getSource(VEGETATION_LANDUSE_SOURCE_ID)) {
      map.addSource(VEGETATION_LANDUSE_SOURCE_ID, {
        type: "vector",
        url: VEGETATION_PMTILES_URL,
        attribution: VEGETATION_ATTRIBUTION,
      });
    }

    // Terceira source só pra saber onde tem água e não espalhar árvore lá
    // (land_cover/land_use podem se sobrepor com `water` na borda, ex.:
    // wetland encostando num lago). Independente da source do Water3D —
    // os dois toggles ligam/desligam sem depender um do outro.
    if (!map.getSource(VEGETATION_WATER_SOURCE_ID)) {
      map.addSource(VEGETATION_WATER_SOURCE_ID, {
        type: "vector",
        url: VEGETATION_PMTILES_URL,
        attribution: VEGETATION_ATTRIBUTION,
      });
    }

    // Camada invisível que mantém a source marcada como "used" — sem isso o
    // MapLibre não tila os dados e querySourceFeatures não retorna nada
    // (mesma lição de Buildings3D/§3, vale pra qualquer source).
    if (!map.getLayer(VEGETATION_PROBE_LAYER_ID)) {
      map.addLayer({
        id: VEGETATION_PROBE_LAYER_ID,
        type: "fill",
        source: VEGETATION_SOURCE_ID,
        "source-layer": VEGETATION_SOURCE_LAYER,
        minzoom: VEGETATION_MIN_ZOOM,
        paint: { "fill-opacity": 0 },
      });
    }

    if (!map.getLayer(VEGETATION_LANDUSE_PROBE_LAYER_ID)) {
      map.addLayer({
        id: VEGETATION_LANDUSE_PROBE_LAYER_ID,
        type: "fill",
        source: VEGETATION_LANDUSE_SOURCE_ID,
        "source-layer": VEGETATION_LANDUSE_SOURCE_LAYER,
        minzoom: VEGETATION_MIN_ZOOM,
        paint: { "fill-opacity": 0 },
      });
    }

    if (!map.getLayer(VEGETATION_WATER_PROBE_LAYER_ID)) {
      map.addLayer({
        id: VEGETATION_WATER_PROBE_LAYER_ID,
        type: "fill",
        source: VEGETATION_WATER_SOURCE_ID,
        "source-layer": VEGETATION_WATER_SOURCE_LAYER,
        minzoom: VEGETATION_MIN_ZOOM,
        paint: { "fill-opacity": 0 },
      });
    }

    if (!map.getLayer(TREES_LAYER_ID)) {
      const customLayer: CustomLayerInterface = {
        id: TREES_LAYER_ID,
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

          const trunkGeometry = new THREE.CylinderGeometry(
            TREE_TRUNK_RADIUS,
            TREE_TRUNK_RADIUS,
            TREE_TRUNK_HEIGHT,
            6,
          );
          trunkGeometry.translate(0, TREE_TRUNK_HEIGHT / 2, 0);

          const canopyGeometry = new THREE.ConeGeometry(
            TREE_CANOPY_RADIUS,
            TREE_CANOPY_HEIGHT,
            7,
          );
          canopyGeometry.translate(0, TREE_TRUNK_HEIGHT + TREE_CANOPY_HEIGHT / 2, 0);

          const trunkMaterial = new THREE.MeshLambertMaterial({ color: TREE_TRUNK_COLOR });
          const canopyMaterial = new THREE.MeshLambertMaterial({ color: TREE_CANOPY_COLOR });

          const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, MAX_TREES_TOTAL);
          const canopies = new THREE.InstancedMesh(
            canopyGeometry,
            canopyMaterial,
            MAX_TREES_TOTAL,
          );
          trunks.count = 0;
          canopies.count = 0;

          scene.add(new THREE.HemisphereLight(0xffffff, 0x3a2a1a, 1.4));
          scene.add(trunks, canopies);

          sceneRef.current = { scene, renderer, trunks, canopies, origin };
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

          refs.trunks.geometry.dispose();
          (refs.trunks.material as THREE.Material).dispose();
          refs.canopies.geometry.dispose();
          (refs.canopies.material as THREE.Material).dispose();
          refs.renderer.dispose();
          sceneRef.current = null;
        },
      };

      map.addLayer(customLayer);
    }

    return () => {
      if (map.getLayer(TREES_LAYER_ID)) map.removeLayer(TREES_LAYER_ID);
      if (map.getLayer(VEGETATION_WATER_PROBE_LAYER_ID)) {
        map.removeLayer(VEGETATION_WATER_PROBE_LAYER_ID);
      }
      if (map.getLayer(VEGETATION_LANDUSE_PROBE_LAYER_ID)) {
        map.removeLayer(VEGETATION_LANDUSE_PROBE_LAYER_ID);
      }
      if (map.getLayer(VEGETATION_PROBE_LAYER_ID)) map.removeLayer(VEGETATION_PROBE_LAYER_ID);
      if (map.getSource(VEGETATION_WATER_SOURCE_ID)) {
        map.removeSource(VEGETATION_WATER_SOURCE_ID);
      }
      if (map.getSource(VEGETATION_LANDUSE_SOURCE_ID)) {
        map.removeSource(VEGETATION_LANDUSE_SOURCE_ID);
      }
      if (map.getSource(VEGETATION_SOURCE_ID)) map.removeSource(VEGETATION_SOURCE_ID);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, enabled]);

  // Recorte por bairro/loteamento selecionado ou em hover — mesmo padrão de
  // debounce/moveend/sourcedata do Buildings3D.
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (!target) {
      publishTrees([]);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    const compute = () => {
      const zoom = map.getZoom();
      if (zoom < VEGETATION_MIN_ZOOM) {
        publishTrees([]);
        return;
      }

      const bounds = map.getBounds();
      const viewportBBox: [number, number, number, number] = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ];
      const minArea = lodMinAreaM2(zoom);

      // Duas fontes, mesmo critério de recorte: land_cover (forest/grass/
      // shrub/wetland) e land_use (park) — combinadas numa lista única de
      // candidatos antes do filtro espacial, pra não duplicar a lógica.
      const landCoverFeatures = map.querySourceFeatures(VEGETATION_SOURCE_ID, {
        sourceLayer: VEGETATION_SOURCE_LAYER,
      });
      const landUseFeatures = map.querySourceFeatures(VEGETATION_LANDUSE_SOURCE_ID, {
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
      // sorteado, pra não deixar árvore nascer dentro d'água (land_cover/
      // land_use pode se sobrepor com `water` na borda).
      const waterFeatures = map.querySourceFeatures(VEGETATION_WATER_SOURCE_ID, {
        sourceLayer: VEGETATION_WATER_SOURCE_LAYER,
      });
      const waterRings: Position[][] = [];
      for (const feature of waterFeatures) {
        const ring = outerRing(feature.geometry);
        if (!ring) continue;
        if (!bboxIntersects(ringBBox(ring), viewportBBox)) continue;
        waterRings.push(ring);
      }
      const isOnWater = (point: [number, number]) =>
        waterRings.some((ring) => pointInPolygon(point, { type: "Polygon", coordinates: [ring] }));

      const { bbox } = target;
      const positions: [number, number][] = [];

      for (const { geometry, subtype } of candidates) {
        const ring = outerRing(geometry);
        if (!ring) continue;

        // Interseção de bbox, não "centroide dentro": um polígono de
        // land_cover/land_use (floresta, parque, por ex.) costuma ser bem
        // maior que a tela em zooms altos — o viewport pode estar inteiro
        // dentro dele sem que o centroide (calculado sobre o polígono
        // inteiro) esteja no viewport. Testar só o centroide fazia as
        // árvores sumirem ao aproximar o zoom.
        const ringBox = ringBBox(ring);
        if (!bboxIntersects(ringBox, viewportBBox)) continue;
        if (bbox && !bboxIntersects(ringBox, bbox)) continue;

        const area = approxAreaM2(ring);
        if (area < minArea) continue; // LOD: mancha pequena demais pro zoom atual

        const centroid = ringCentroid(ring);
        if (!pointInPolygon(centroid, target.geometry)) continue;

        const treeCount = Math.min(
          Math.round(area / TREE_SPACING_M2_BY_SUBTYPE[subtype]),
          MAX_TREES_PER_POLYGON,
        );
        if (treeCount <= 0) continue;

        for (const point of randomPointsInRing(ring, treeCount)) {
          if (!isOnWater(point)) positions.push(point);
        }

        if (positions.length >= MAX_TREES_TOTAL) break;
      }

      const clipped = positions.slice(0, MAX_TREES_TOTAL);

      if (
        map.isSourceLoaded(VEGETATION_SOURCE_ID) &&
        map.isSourceLoaded(VEGETATION_LANDUSE_SOURCE_ID) &&
        map.isSourceLoaded(VEGETATION_WATER_SOURCE_ID)
      ) {
        cacheRef.current.set(target.key, clipped);
      }

      publishTrees(clipped);
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(compute, CLIP_DEBOUNCE_MS);
    };

    const handleSourceData = (event: MapSourceDataEvent) => {
      const isOurs =
        event.sourceId === VEGETATION_SOURCE_ID ||
        event.sourceId === VEGETATION_LANDUSE_SOURCE_ID ||
        event.sourceId === VEGETATION_WATER_SOURCE_ID;
      if (isOurs && event.isSourceLoaded) schedule();
    };

    const cached = cacheRef.current.get(target.key);
    if (cached) {
      publishTrees(cached);
    } else {
      schedule();
    }

    map.on("sourcedata", handleSourceData);
    map.on("moveend", schedule);

    return () => {
      if (timer) clearTimeout(timer);
      map.off("sourcedata", handleSourceData);
      map.off("moveend", schedule);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, target]);

  return null;
}
