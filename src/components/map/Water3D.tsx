"use client";

// Fonte da água 3D: Overture Maps (tema `base`, layer `water`), por HTTP
// range request — mesmo esqueleto de source/probe do Buildings3D/Trees3D,
// com uma cena Three.js própria (CustomLayerInterface) e loop de animação
// próprio (só roda enquanto `enabled` e houver alvo selecionado).
import { useEffect, useMemo, useRef } from "react";
import type { Geometry, Position } from "geojson";
import type { CustomLayerInterface, MapSourceDataEvent } from "maplibre-gl";
import * as THREE from "three";
import earcut from "earcut";
import { useMap } from "@/components/ui/map";
import {
  WATER_ATTRIBUTION,
  WATER_COLOR,
  WATER_DIFFUSE_MAP_URL,
  WATER_LIGHT_DIR,
  WATER_MIN_ZOOM,
  WATER_NORMAL_MAP_URL,
  WATER_OPACITY,
  WATER_PMTILES_URL,
  WATER_PROBE_LAYER_ID,
  WATER_SCROLL_SPEED_A,
  WATER_SCROLL_SPEED_B,
  WATER_SOURCE_ID,
  WATER_SOURCE_LAYER,
  WATER_SPECULAR_SHININESS,
  WATER_SPECULAR_STRENGTH,
  WATER_TEXTURE_TILE_SIZE_M,
} from "@/config/water";
import {
  bboxIntersects,
  outerRing,
  pointInPolygon,
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

const WATER_LAYER_ID = "water-3d-layer";
const CLIP_DEBOUNCE_MS = 120;

interface Water3DProps {
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

interface WaterScene {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  origin: MercatorOrigin;
  diffuseMap: THREE.Texture;
  normalMap: THREE.Texture;
}

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  uniform float uTileSize;
  void main() {
    // UV derivado da posição local (metros) — sem precisar de atributo UV
    // na geometria, que só tem "position" (ver buildWaterGeometry).
    vUv = position.xz / uTileSize;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Emula (dentro do que dá em WebGL2 puro, sem reflexo planar/WebGPU) o
// efeito de webgpu_water.html: duas amostras da normal map em velocidades
// de scroll diferentes (como o `flowDirection` do Water2Mesh) formam a
// normal perturbada; um highlight especular Blinn-Phong contra uma luz fixa
// solta o "brilho de água" por cima do albedo tingido pela cor base.
const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uDiffuseMap;
  uniform sampler2D uNormalMap;
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec2 uScrollA;
  uniform vec2 uScrollB;
  uniform vec3 uLightDir;
  uniform float uSpecularStrength;
  uniform float uShininess;
  uniform float uOpacity;

  void main() {
    vec2 uvA = vUv + uTime * uScrollA;
    vec2 uvB = vUv + uTime * uScrollB;

    vec3 normalA = texture2D(uNormalMap, uvA).rgb * 2.0 - 1.0;
    vec3 normalB = texture2D(uNormalMap, uvB).rgb * 2.0 - 1.0;
    vec3 normal = normalize(normalA + normalB);

    vec3 albedo = texture2D(uDiffuseMap, uvA).rgb * uColor;

    // Sem posição de câmera real (nossa THREE.Camera só tem projectionMatrix
    // customizada, sem transform de mundo) — aproxima a vista como "de cima".
    vec3 viewDir = vec3(0.0, 1.0, 0.0);
    vec3 lightDir = normalize(uLightDir);
    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), uShininess) * uSpecularStrength;

    vec3 color = albedo + specular;
    gl_FragColor = vec4(color, uOpacity);
  }
`;

/** Triangula o anel externo de cada polígono (earcut) e concatena tudo numa
 * única BufferGeometry, em metros locais relativos a `origin`. Buracos
 * (ilhas dentro d'água) não são considerados — simplificação aceitável pra
 * decoração do mapa, não pra hidrografia precisa. */
function buildWaterGeometry(rings: Position[][], origin: MercatorOrigin): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  for (const ring of rings) {
    const flat: number[] = [];
    for (const [lng, lat] of ring) {
      const { x, z } = lngLatToLocalMeters(origin, [lng, lat]);
      flat.push(x, z);
    }

    const triangles = earcut(flat, undefined, 2);
    if (triangles.length === 0) continue;

    for (let i = 0; i < flat.length; i += 2) {
      positions.push(flat[i], 0, flat[i + 1]);
    }
    for (const index of triangles) indices.push(index + vertexOffset);
    vertexOffset += flat.length / 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

/** Exibe a água 3D (com ondulação animada) do bairro ou loteamento em foco.
 *
 * Fonte: Overture Maps (tema `base`, layer `water`), fonte vetorial remota.
 * Animada: mantém um `requestAnimationFrame` próprio, ligado só enquanto
 * `enabled` e houver alvo — desligar o toggle ou fechar a seleção para o loop.
 */
export function Water3D({
  enabled,
  selection,
  hoveredBairro,
  bairros,
  loteamentos,
}: Water3DProps) {
  const { map, isLoaded } = useMap();

  const cacheRef = useRef(new Map<string, Position[][]>());
  const sceneRef = useRef<WaterScene | null>(null);
  const rafRef = useRef<number | null>(null);

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

  const publishWater = (rings: Position[][]) => {
    const refs = sceneRef.current;
    if (!refs || !map) return;

    refs.mesh.geometry.dispose();
    refs.mesh.geometry = buildWaterGeometry(rings, refs.origin);
    map.triggerRepaint();
  };

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
      if (refs) {
        refs.material.uniforms.uTime.value = (now - start) / 1000;
        map.triggerRepaint();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  // Lifecycle: source vetorial + layer-sonda + custom layer (cena Three.js).
  // Só existem enquanto `enabled` é true.
  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;

    if (!map.getSource(WATER_SOURCE_ID)) {
      map.addSource(WATER_SOURCE_ID, {
        type: "vector",
        url: WATER_PMTILES_URL,
        attribution: WATER_ATTRIBUTION,
      });
    }

    // Camada invisível que mantém a source marcada como "used" — sem isso o
    // MapLibre não tila os dados e querySourceFeatures não retorna nada
    // (mesma lição de Buildings3D/§3, vale pra qualquer source).
    if (!map.getLayer(WATER_PROBE_LAYER_ID)) {
      map.addLayer({
        id: WATER_PROBE_LAYER_ID,
        type: "fill",
        source: WATER_SOURCE_ID,
        "source-layer": WATER_SOURCE_LAYER,
        minzoom: WATER_MIN_ZOOM,
        paint: { "fill-opacity": 0 },
      });
    }

    if (!map.getLayer(WATER_LAYER_ID)) {
      const customLayer: CustomLayerInterface = {
        id: WATER_LAYER_ID,
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

          const textureLoader = new THREE.TextureLoader();
          const diffuseMap = textureLoader.load(WATER_DIFFUSE_MAP_URL);
          const normalMap = textureLoader.load(WATER_NORMAL_MAP_URL);
          // MirroredRepeat, não Repeat: a foto de água não é uma textura
          // seamless (a borda direita não bate com a esquerda) — com Repeat
          // isso aparece como uma linha escura a cada 20m (WATER_TEXTURE_TILE_SIZE_M),
          // onde o tile recomeça. Espelhar garante que a borda sempre bate
          // com ela mesma, sem salto de cor.
          diffuseMap.wrapS = diffuseMap.wrapT = THREE.MirroredRepeatWrapping;
          normalMap.wrapS = normalMap.wrapT = THREE.MirroredRepeatWrapping;

          const material = new THREE.ShaderMaterial({
            vertexShader: VERTEX_SHADER,
            fragmentShader: FRAGMENT_SHADER,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide,
            uniforms: {
              uTime: { value: 0 },
              uColor: { value: new THREE.Vector3(...WATER_COLOR) },
              uDiffuseMap: { value: diffuseMap },
              uNormalMap: { value: normalMap },
              uTileSize: { value: WATER_TEXTURE_TILE_SIZE_M },
              uScrollA: { value: new THREE.Vector2(...WATER_SCROLL_SPEED_A) },
              uScrollB: { value: new THREE.Vector2(...WATER_SCROLL_SPEED_B) },
              uLightDir: { value: new THREE.Vector3(...WATER_LIGHT_DIR) },
              uSpecularStrength: { value: WATER_SPECULAR_STRENGTH },
              uShininess: { value: WATER_SPECULAR_SHININESS },
              uOpacity: { value: WATER_OPACITY },
            },
          });

          const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
          scene.add(mesh);

          sceneRef.current = { scene, renderer, mesh, material, origin, diffuseMap, normalMap };
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

          refs.mesh.geometry.dispose();
          refs.material.dispose();
          refs.diffuseMap.dispose();
          refs.normalMap.dispose();
          refs.renderer.dispose();
          sceneRef.current = null;
        },
      };

      map.addLayer(customLayer);
    }

    return () => {
      stopAnimation();
      if (map.getLayer(WATER_LAYER_ID)) map.removeLayer(WATER_LAYER_ID);
      if (map.getLayer(WATER_PROBE_LAYER_ID)) map.removeLayer(WATER_PROBE_LAYER_ID);
      if (map.getSource(WATER_SOURCE_ID)) map.removeSource(WATER_SOURCE_ID);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, enabled]);

  // Recorte por bairro/loteamento selecionado ou em hover — mesmo padrão de
  // debounce/moveend/sourcedata do Buildings3D/Trees3D. O loop de animação
  // liga só enquanto existir alvo, e desliga com ele (nunca anima parado).
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (!target) {
      stopAnimation();
      publishWater([]);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    const compute = () => {
      if (map.getZoom() < WATER_MIN_ZOOM) {
        publishWater([]);
        return;
      }

      const bounds = map.getBounds();
      const viewportBBox: [number, number, number, number] = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ];
      const features = map.querySourceFeatures(WATER_SOURCE_ID, {
        sourceLayer: WATER_SOURCE_LAYER,
      });

      const { bbox } = target;
      const rings: Position[][] = [];

      for (const feature of features) {
        const ring = outerRing(feature.geometry);
        if (!ring) continue;

        // Interseção de bbox, não "centroide dentro": um lago/rio pode ser
        // bem maior que a tela em zooms altos (mesmo problema documentado em
        // Trees3D) — testar só o centroide fazia a água sumir ao aproximar.
        const ringBox = ringBBox(ring);
        if (!bboxIntersects(ringBox, viewportBBox)) continue;
        if (bbox && !bboxIntersects(ringBox, bbox)) continue;

        const centroid = ringCentroid(ring);
        if (!pointInPolygon(centroid, target.geometry)) continue;

        rings.push(ring);
      }

      if (map.isSourceLoaded(WATER_SOURCE_ID)) {
        cacheRef.current.set(target.key, rings);
      }

      publishWater(rings);
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(compute, CLIP_DEBOUNCE_MS);
    };

    const handleSourceData = (event: MapSourceDataEvent) => {
      if (event.sourceId === WATER_SOURCE_ID && event.isSourceLoaded) schedule();
    };

    const cached = cacheRef.current.get(target.key);
    if (cached) {
      publishWater(cached);
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
