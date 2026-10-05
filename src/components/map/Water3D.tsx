"use client";

// Fonte da água 3D: Overture Maps (tema `base`, layer `water`), por HTTP
// range request — mesmo esqueleto de source/probe do Buildings3D/Trees3D,
// com uma cena Three.js própria (CustomLayerInterface) e loop de animação
// próprio (só roda enquanto `enabled` e houver alvo selecionado).
import { useEffect, useRef } from "react";
import type { Position } from "geojson";
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
  createThreeLayer,
  lngLatToLocalMeters,
  type MercatorOrigin,
  type ThreeBase,
} from "@/lib/map/threeCustomLayer";
import { viewportBBox } from "@/lib/map/bbox";
import { addProbedVectorSource, removeProbedVectorSource } from "@/lib/map/layerHelpers";
import { lightingFor } from "@/config/lighting";
import { useAnimationFrame } from "@/hooks/map/useAnimationFrame";
import { useClipEffect } from "@/hooks/map/useClipEffect";
import { useClipTarget } from "@/hooks/map/useClipTarget";
import type { IndexedFeature } from "@/hooks/useGeoIndex";
import type { HoveredBairro, Selection } from "@/types/map";

const WATER_LAYER_ID = "water-3d-layer";
const SOURCE = {
  sourceId: WATER_SOURCE_ID,
  probeLayerId: WATER_PROBE_LAYER_ID,
  url: WATER_PMTILES_URL,
  sourceLayer: WATER_SOURCE_LAYER,
  minzoom: WATER_MIN_ZOOM,
  attribution: WATER_ATTRIBUTION,
};
const SOURCE_IDS = [WATER_SOURCE_ID];
const NO_WATER: Position[][] = [];

interface Water3DProps {
  /** Liga/desliga a exibição — off por padrão, sem nenhum request de tile. */
  enabled: boolean;
  /** Tema escuro: água sob luar frio (config/lighting.ts). */
  night: boolean;
  selection: Selection | null;
  hoveredBairro: HoveredBairro | null;
  bairros: IndexedFeature[];
  loteamentos: IndexedFeature[];
}

interface WaterScene extends ThreeBase {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
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
  uniform vec3 uLight;

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
    // Opaco de propósito: polígonos de água grandes cruzam borda de tile do
    // MVT e o mesmo trecho acaba desenhado 2x (buffer de tile do
    // querySourceFeatures) — com alpha blending isso empilhava e escurecia
    // a costura. Como o shader é função pura da posição, a segunda cópia
    // desenha o pixel idêntico por cima — sem blending, sem escurecer.
    gl_FragColor = vec4(color * uLight, 1.0);
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

/** Cor×intensidade da luz, em sRGB cru como o resto do shader (sem conversão linear). */
function setWaterLight(uniform: THREE.Color, night: boolean) {
  const lighting = lightingFor(night);
  uniform.setHex(lighting.color, THREE.LinearSRGBColorSpace).multiplyScalar(lighting.water);
}

/** Exibe a água 3D (com ondulação animada) do bairro ou loteamento em foco.
 *
 * Fonte: Overture Maps (tema `base`, layer `water`), fonte vetorial remota.
 * Animada: mantém um `requestAnimationFrame` próprio, ligado só enquanto
 * `enabled` e houver alvo — desligar o toggle ou fechar a seleção para o loop.
 */
export function Water3D({
  enabled,
  night,
  selection,
  hoveredBairro,
  bairros,
  loteamentos,
}: Water3DProps) {
  const { map, isLoaded } = useMap();

  const sceneRef = useRef<WaterScene | null>(null);
  // Lido no onAdd: a cena pode nascer (toggle ligado) já à noite.
  const nightRef = useRef(night);
  nightRef.current = night;

  const target = useClipTarget(enabled, selection, hoveredBairro, bairros, loteamentos);

  const publishWater = (rings: Position[][]) => {
    const refs = sceneRef.current;
    if (!refs || !map) return;

    refs.mesh.geometry.dispose();
    refs.mesh.geometry = buildWaterGeometry(rings, refs.origin);
    map.triggerRepaint();
  };

  // Ondulação: o loop liga só enquanto existir alvo (nunca anima parado).
  useAnimationFrame(target !== null, (_now, dtS) => {
    const refs = sceneRef.current;
    if (!refs || !map) return;
    // Acumula dt (não `now`): tempo pequeno mantém precisão no `mediump` do shader.
    refs.material.uniforms.uTime.value += dtS;
    map.triggerRepaint();
  });

  // Lifecycle: source vetorial + layer-sonda + custom layer (cena Three.js).
  // Só existem enquanto `enabled` é true.
  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;

    addProbedVectorSource(map, SOURCE);

    if (!map.getLayer(WATER_LAYER_ID)) {
      map.addLayer(
        createThreeLayer(WATER_LAYER_ID, sceneRef, {
          setup(base) {
            const textureLoader = new THREE.TextureLoader();
            const diffuseMap = textureLoader.load(WATER_DIFFUSE_MAP_URL);
            const normalMap = textureLoader.load(WATER_NORMAL_MAP_URL);
            // Repeat "sequencial" simples — MirroredRepeat foi testado e
            // trocado: com uma textura de listras diagonais, cada repetição
            // espelhada forma losangos/borboletas nos encontros de tile, bem
            // mais visível que a costura que tentava evitar. A costura em si
            // já não escurece mais porque o material é opaco (ver comentário
            // no fragment shader) — a costura fica só numa emenda de textura,
            // não numa faixa escura empilhada.
            diffuseMap.wrapS = diffuseMap.wrapT = THREE.RepeatWrapping;
            normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;

            const material = new THREE.ShaderMaterial({
              vertexShader: VERTEX_SHADER,
              fragmentShader: FRAGMENT_SHADER,
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
                uLight: { value: new THREE.Color() },
              },
            });
            setWaterLight(material.uniforms.uLight.value, nightRef.current);

            const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
            base.scene.add(mesh);

            return { ...base, mesh, material, diffuseMap, normalMap };
          },
          dispose(refs) {
            refs.mesh.geometry.dispose();
            refs.material.dispose();
            refs.diffuseMap.dispose();
            refs.normalMap.dispose();
          },
        }),
      );
    }

    return () => {
      if (map.getLayer(WATER_LAYER_ID)) map.removeLayer(WATER_LAYER_ID);
      removeProbedVectorSource(map, SOURCE);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, enabled]);

  useEffect(() => {
    const refs = sceneRef.current;
    if (!refs || !map) return;
    setWaterLight(refs.material.uniforms.uLight.value, night);
    map.triggerRepaint();
  }, [map, night]);

  // Recorte por bairro/loteamento selecionado ou em hover.
  useClipEffect({
    map,
    isLoaded,
    target,
    sourceIds: SOURCE_IDS,
    minZoom: WATER_MIN_ZOOM,
    empty: NO_WATER,
    publish: publishWater,
    compute: (target) => {
      const viewport = viewportBBox(map!);
      const features = map!.querySourceFeatures(WATER_SOURCE_ID, {
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
        if (!bboxIntersects(ringBox, viewport)) continue;
        if (bbox && !bboxIntersects(ringBox, bbox)) continue;

        const centroid = ringCentroid(ring);
        if (!pointInPolygon(centroid, target.geometry)) continue;

        rings.push(ring);
      }

      return rings;
    },
  });

  return null;
}
