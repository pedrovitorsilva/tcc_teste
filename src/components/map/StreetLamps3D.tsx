"use client";

// Postes 3D a partir de public/data/postes.json (gerado por
// scripts/prepare-lamps.mjs sobre as vias do OpenStreetMap). Cena Three.js
// própria (CustomLayerInterface), mesmo padrão de Trees3D: poste + luminária
// em InstancedMesh e, à noite, um disco de luz aditivo no chão.
//
// Geometria vem de public/lights/scene.gltf (GLTFLoader, como Cars3D), mas
// em vez de um `clone(true)` por poste (Cars3D: dezenas de carros) as malhas
// do glTF são fundidas em 2 geometrias (corpo / luminária) e instanciadas:
// um bairro chega a ~4,8 mil postes, e 5 malhas × clone por poste seriam
// ~24 mil draw calls por frame contra 3 aqui.
import { useEffect, useMemo, useRef, useState } from "react";
import type { Geometry } from "geojson";
import type { CustomLayerInterface } from "maplibre-gl";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useMap } from "@/components/ui/map";
import {
  MAX_LAMPS_TOTAL,
  STREET_LAMP_COLOR_DAY,
  STREET_LAMP_COLOR_NIGHT,
  STREET_LAMP_GLOW_COLOR,
  STREET_LAMP_GLOW_RADIUS,
  STREET_LAMP_GLTF_URL,
  STREET_LAMPS_DATA_URL,
  STREET_LAMPS_MIN_ZOOM,
} from "@/config/streetLamps";
import { CAR_SCALE_FACTOR_MAX, CAR_SCALE_FACTOR_MIN, ROAD_WIDTH_M, ROAD_WIDTH_REF_M } from "@/config/cars";
import { lightingFor } from "@/config/lighting";
import { drawnWidthPx, pixelsPerMeter } from "@/components/map/Cars3D";
import { pointInPolygon } from "@/lib/map/buildingClip";
import { radialGlowTexture } from "@/lib/map/glowTexture";
import {
  lngLatToLocalMeters,
  mercatorOrigin,
  projectionMatrixFor,
  type MercatorOrigin,
} from "@/lib/map/threeCustomLayer";
import type { IndexedFeature } from "@/hooks/useGeoIndex";
import type { HoveredBairro, Selection } from "@/types/map";

// Sem crédito no (i): o OSM já vem do basemap CARTO; a nota da sidebar
// (StreetLampsNote) explica a origem dos postes.
const LAMPS_LAYER_ID = "street-lamps-3d-layer";

/** [lng, lat, heading] — heading em radianos, leste=0, anti-horário. */
type Lamp = [number, number, number];

// Carregado uma vez por sessão (religar o toggle não baixa de novo). Falha
// zera a promise pra tentar de novo no próximo toggle.
let lampsRequest: Promise<Lamp[]> | null = null;
function loadLamps(): Promise<Lamp[]> {
  lampsRequest ??= fetch(STREET_LAMPS_DATA_URL)
    .then((res) => (res.ok ? (res.json() as Promise<Lamp[]>) : Promise.reject(new Error(`HTTP ${res.status}`))))
    .catch((err: Error) => {
      console.warn(`[StreetLamps3D] ${STREET_LAMPS_DATA_URL} indisponível (${err.message}) — rode npm run prepare-data.`);
      lampsRequest = null;
      return [];
    });
  return lampsRequest;
}

interface StreetLamps3DProps {
  enabled: boolean;
  /** Tema escuro: luminária acesa + halo no chão. */
  night: boolean;
  selection: Selection | null;
  hoveredBairro: HoveredBairro | null;
  bairros: IndexedFeature[];
  loteamentos: IndexedFeature[];
}

interface ClipTarget {
  geometry: Geometry;
  bbox?: [number, number, number, number];
}

interface LampScene {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  poles: THREE.InstancedMesh;
  heads: THREE.InstancedMesh;
  glows: THREE.InstancedMesh;
  headMaterial: THREE.MeshLambertMaterial;
  light: THREE.HemisphereLight;
  origin: MercatorOrigin;
  /** Postes recortados: [x, z, heading] no referencial local. */
  placed: [number, number, number][];
  /** Escala aplicada hoje às instâncias (muda com o zoom). */
  scale: number;
}

// Mesmo fator de Cars3D numa via residencial (maioria dos postes): largura
// desenhada da via em metros / largura de referência, mesmo piso/teto — poste
// e carro na mesma rua ficam proporcionais em qualquer zoom.
function lampScale(map: Parameters<typeof drawnWidthPx>[0]): number {
  const zoom = map.getZoom();
  const px = drawnWidthPx(map, "residential", zoom);
  const widthM = px === null ? ROAD_WIDTH_M.residential : px / pixelsPerMeter(zoom, map.getCenter().lat);
  return Math.min(CAR_SCALE_FACTOR_MAX, Math.max(CAR_SCALE_FACTOR_MIN, widthM / ROAD_WIDTH_REF_M));
}

function writeMatrices(refs: LampScene) {
  const dummy = new THREE.Object3D();
  dummy.scale.setScalar(refs.scale);
  refs.placed.forEach(([x, z, heading], i) => {
    dummy.position.set(x, 0, z);
    dummy.rotation.y = heading; // +X local → (leste cos h, norte sin h)
    dummy.updateMatrix();
    refs.poles.setMatrixAt(i, dummy.matrix);
    refs.heads.setMatrixAt(i, dummy.matrix);
    refs.glows.setMatrixAt(i, dummy.matrix);
  });
  for (const mesh of [refs.poles, refs.heads, refs.glows]) {
    mesh.count = refs.placed.length;
    mesh.instanceMatrix.needsUpdate = true;
    // Ver Trees3D: sem isso o boundingSphere fica o da 1ª render (vazio) e
    // o frustum culling descarta a mesh pra sempre.
    mesh.computeBoundingSphere();
  }
}

function applyNight(refs: LampScene, night: boolean) {
  const lighting = lightingFor(night);
  refs.light.color.set(lighting.color);
  refs.light.intensity = lighting.hemisphere;
  refs.headMaterial.emissive.set(night ? STREET_LAMP_COLOR_NIGHT : 0x000000);
  refs.glows.visible = night;
}

export function StreetLamps3D({
  enabled,
  night,
  selection,
  hoveredBairro,
  bairros,
  loteamentos,
}: StreetLamps3DProps) {
  const { map, isLoaded } = useMap();
  const sceneRef = useRef<LampScene | null>(null);
  const nightRef = useRef(night);
  nightRef.current = night;
  const [lamps, setLamps] = useState<Lamp[] | null>(null);

  const target: ClipTarget | null = useMemo(() => {
    if (!enabled) return null;
    const feature = selection
      ? (selection.level === "loteamento" ? loteamentos : bairros).find(
          (item) => item.featureId === selection.featureId,
        )
      : hoveredBairro
        ? bairros.find((item) => item.featureId === hoveredBairro.featureId)
        : undefined;
    return feature?.geometry ? { geometry: feature.geometry, bbox: feature.bbox } : null;
  }, [enabled, selection, hoveredBairro, bairros, loteamentos]);

  // JSON sob demanda: só quando o toggle liga, fora do caminho do render.
  useEffect(() => {
    if (!enabled || lamps) return;
    let cancelled = false;
    loadLamps().then((data) => {
      if (!cancelled) setLamps(data);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, lamps]);

  // Lifecycle: custom layer (cena Three.js).
  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;

    if (!map.getLayer(LAMPS_LAYER_ID)) {
      const customLayer: CustomLayerInterface = {
        id: LAMPS_LAYER_ID,
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

          // Geometrias vazias até o glTF chegar (o recorte já pode ir gravando
          // as matrizes); no load são trocadas pelas reais. Referencial local
          // do poste: +X = heading (rumo à via).
          const poleMaterial = new THREE.MeshLambertMaterial({ color: STREET_LAMP_COLOR_DAY });
          // DoubleSide: o glTF tem faces abertas (doubleSided no material original).
          const headMaterial = new THREE.MeshLambertMaterial({
            color: STREET_LAMP_COLOR_DAY,
            side: THREE.DoubleSide,
          });
          const glowMaterial = new THREE.MeshBasicMaterial({
            map: radialGlowTexture(),
            color: STREET_LAMP_GLOW_COLOR,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
          });

          const poles = new THREE.InstancedMesh(new THREE.BufferGeometry(), poleMaterial, MAX_LAMPS_TOTAL);
          const heads = new THREE.InstancedMesh(new THREE.BufferGeometry(), headMaterial, MAX_LAMPS_TOTAL);
          const glows = new THREE.InstancedMesh(new THREE.BufferGeometry(), glowMaterial, MAX_LAMPS_TOTAL);
          for (const mesh of [poles, heads, glows]) mesh.count = 0;

          const light = new THREE.HemisphereLight(0xffffff, 0x3a2a1a);
          scene.add(light, poles, heads, glows);

          const refs: LampScene = {
            scene, renderer, poles, heads, glows, headMaterial, light, origin,
            placed: [],
            scale: lampScale(mapInstance),
          };
          applyNight(refs, nightRef.current);
          sceneRef.current = refs;

          new GLTFLoader().load(STREET_LAMP_GLTF_URL, (gltf) => {
            // Funde as malhas por peça, já no referencial do modelo (matrixWorld
            // absorve a correção de eixo do Sketchfab/FBX). Nós "Cube*" = carcaça
            // + lente da luminária (acende à noite); o resto = poste e braço.
            gltf.scene.updateMatrixWorld(true);
            const body: THREE.BufferGeometry[] = [];
            const head: THREE.BufferGeometry[] = [];
            gltf.scene.traverse((child) => {
              if (!(child instanceof THREE.Mesh)) return;
              (child.name.startsWith("Cube") ? head : body).push(
                child.geometry.clone().applyMatrix4(child.matrixWorld),
              );
              child.geometry.dispose();
              (child.material as THREE.Material).dispose();
            });

            if (sceneRef.current !== refs) return; // layer removida antes do load terminar
            const headGeometry = mergeGeometries(head)!;
            headGeometry.computeBoundingBox();

            // Halo: quadrado no chão sob o centro da luminária; o gradiente
            // radial da textura faz o disco. Levemente acima do chão pra não
            // brigar no depth.
            const glowGeometry = new THREE.PlaneGeometry(
              STREET_LAMP_GLOW_RADIUS * 2,
              STREET_LAMP_GLOW_RADIUS * 2,
            );
            glowGeometry.rotateX(-Math.PI / 2);
            glowGeometry.translate(headGeometry.boundingBox!.getCenter(new THREE.Vector3()).x, 0.05, 0);

            const loaded: [THREE.InstancedMesh, THREE.BufferGeometry][] = [
              [refs.poles, mergeGeometries(body)!],
              [refs.heads, headGeometry],
              [refs.glows, glowGeometry],
            ];
            for (const [mesh, geometry] of loaded) {
              mesh.geometry.dispose();
              mesh.geometry = geometry;
              mesh.computeBoundingSphere();
            }
            map.triggerRepaint();
          });
        },
        render(_gl, options) {
          const refs = sceneRef.current;
          if (!refs || map.getZoom() < STREET_LAMPS_MIN_ZOOM) return;

          const scale = lampScale(map);
          if (scale !== refs.scale) {
            refs.scale = scale;
            writeMatrices(refs);
          }

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
          for (const mesh of [refs.poles, refs.heads, refs.glows]) {
            mesh.geometry.dispose();
            const material = mesh.material as THREE.MeshBasicMaterial;
            material.map?.dispose();
            material.dispose();
          }
          refs.renderer.dispose();
          sceneRef.current = null;
        },
      };
      map.addLayer(customLayer);
    }

    return () => {
      if (map.getLayer(LAMPS_LAYER_ID)) map.removeLayer(LAMPS_LAYER_ID);
    };
  }, [map, isLoaded, enabled]);

  useEffect(() => {
    const refs = sceneRef.current;
    if (!refs || !map) return;
    applyNight(refs, night);
    map.triggerRepaint();
  }, [map, night]);

  // Recorte: postes dentro do bairro/loteamento em foco. Barato (prefiltro por
  // bbox sobre ~55 mil pontos), então roda direto a cada troca de alvo, sem
  // debounce nem moveend — os postes são estáticos e o zoom é checado no render.
  useEffect(() => {
    const refs = sceneRef.current;
    if (!map || !refs) return;

    const placed: LampScene["placed"] = [];
    if (target && lamps) {
      const [w, s, e, n] = target.bbox ?? [-Infinity, -Infinity, Infinity, Infinity];
      for (const [lng, lat, heading] of lamps) {
        if (placed.length >= MAX_LAMPS_TOTAL) break;
        if (lng < w || lng > e || lat < s || lat > n) continue;
        if (!pointInPolygon([lng, lat], target.geometry)) continue;
        const { x, z } = lngLatToLocalMeters(refs.origin, [lng, lat]);
        placed.push([x, z, heading]);
      }
    }
    refs.placed = placed;
    writeMatrices(refs);
    map.triggerRepaint();
  }, [map, isLoaded, enabled, target, lamps]);

  return null;
}
