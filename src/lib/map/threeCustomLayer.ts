import * as THREE from 'three';
import * as MapLibreGL from 'maplibre-gl';

/**
 * Matemática pura de integração Three.js ↔ MapLibre `CustomLayerInterface` —
 * o mesmo boilerplate do exemplo oficial "3D model with three.js" do
 * MapLibre/Mapbox, compartilhado por todas as camadas 3D com cena Three.js
 * (Trees3D, Water3D, Cars3D, StreetLamps3D).
 */

/** Origem local em coordenadas mercator (0..1) — cada camada escolhe seu ponto de referência. */
export interface MercatorOrigin {
  x: number;
  y: number;
  z: number;
  /** Unidades mercator por metro nesse ponto — escala geometria (em metros) pro espaço mercator. */
  mercatorUnitsPerMeter: number;
}

export function mercatorOrigin(lng: number, lat: number, altitude = 0): MercatorOrigin {
  const merc = MapLibreGL.MercatorCoordinate.fromLngLat({ lng, lat }, altitude);
  return {
    x: merc.x,
    y: merc.y,
    z: merc.z,
    mercatorUnitsPerMeter: merc.meterInMercatorCoordinateUnits(),
  };
}

/**
 * Matriz combinando a câmera que o MapLibre passa em
 * `render(gl, { defaultProjectionData })` — usar
 * `defaultProjectionData.mainMatrix` — com a transformação da origem local
 * (translação mercator + escala metro→mercator + rotação X, porque o
 * Three.js usa Y-up e o mundo mercator é Z-up).
 */
export function projectionMatrixFor(
  origin: MercatorOrigin,
  matrix: ArrayLike<number>,
): THREE.Matrix4 {
  const rotationX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);

  const scale = origin.mercatorUnitsPerMeter;
  const modelMatrix = new THREE.Matrix4()
    .makeTranslation(origin.x, origin.y, origin.z)
    .scale(new THREE.Vector3(scale, -scale, scale))
    .multiply(rotationX);

  return new THREE.Matrix4().fromArray(matrix).multiply(modelMatrix);
}

/** O que toda cena Three.js de camada 3D tem; cada camada estende com suas malhas/luzes. */
export interface ThreeBase {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  origin: MercatorOrigin;
}

interface ThreeLayerHooks<T extends ThreeBase> {
  /** Monta a cena específica da camada sobre a base já criada. */
  setup: (base: ThreeBase, map: MapLibreGL.Map) => T;
  /** Libera geometrias/materiais/texturas da camada (o renderer é liberado aqui). */
  dispose: (refs: T) => void;
  /** Chamado antes de cada render; `false` pula o frame. */
  beforeRender?: (refs: T) => boolean;
}

/**
 * `CustomLayerInterface` que desenha uma cena Three.js no mesmo contexto WebGL
 * do MapLibre (origem local no centro do mapa no momento do `onAdd`). A cena
 * fica em `ref` enquanto a layer existe — `null` depois do `onRemove`, que é
 * como callbacks assíncronos (ex.: glTF) sabem que a layer já saiu.
 */
export function createThreeLayer<T extends ThreeBase>(
  id: string,
  ref: { current: T | null },
  hooks: ThreeLayerHooks<T>,
): MapLibreGL.CustomLayerInterface {
  return {
    id,
    type: 'custom',
    renderingMode: '3d',
    onAdd(map, gl) {
      const center = map.getCenter();
      const renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
      ref.current = hooks.setup(
        { scene: new THREE.Scene(), renderer, origin: mercatorOrigin(center.lng, center.lat) },
        map,
      );
    },
    render(_gl, options) {
      const refs = ref.current;
      if (!refs || hooks.beforeRender?.(refs) === false) return;
      const camera = new THREE.Camera();
      camera.projectionMatrix = projectionMatrixFor(refs.origin, options.defaultProjectionData.mainMatrix);
      refs.renderer.resetState();
      refs.renderer.render(refs.scene, camera);
    },
    onRemove() {
      const refs = ref.current;
      if (!refs) return;
      hooks.dispose(refs);
      refs.renderer.dispose();
      ref.current = null;
    },
  };
}

/**
 * Offset em metros locais de `lngLat` relativo a `origin`, já no sistema de
 * eixos que `projectionMatrixFor` espera: **x** = leste, **z** = sul (o chão
 * é o plano XZ; `y` fica livre para altitude/altura de cada instância). Usar
 * o resultado como `(x, y_altura, z)` na malha — trocar `z` por `y` aqui
 * decorre da rotação X embutida na matriz acima, não é arbitrário.
 *
 * Evita herdar erro de precisão float32 de coordenadas mercator absolutas,
 * já que tudo fica relativo a uma origem local só.
 */
export function lngLatToLocalMeters(
  origin: MercatorOrigin,
  lngLat: [number, number],
): { x: number; z: number } {
  const merc = MapLibreGL.MercatorCoordinate.fromLngLat({ lng: lngLat[0], lat: lngLat[1] }, 0);
  return {
    x: (merc.x - origin.x) / origin.mercatorUnitsPerMeter,
    z: (merc.y - origin.y) / origin.mercatorUnitsPerMeter,
  };
}
