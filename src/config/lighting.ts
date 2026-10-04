// Luz das cenas Three.js (Trees3D, Cars3D, Water3D): dia, e noite de luar no
// tema escuro (ver globals.css). Intensidades em luz linear, como o Three usa —
// por isso a noite não divide pelo mesmo fator que escureceu o terreno: um
// fator igual deixaria árvore e carro pretos sobre o chão já escuro.

export interface Lighting {
  /** AmbientLight (Cars3D). */
  ambient: number;
  /** HemisphereLight (Trees3D). */
  hemisphere: number;
  /** DirectionalLight (Cars3D). */
  sun: number;
  /** Cor do sol/lua, 0xRRGGBB — também o céu da HemisphereLight. */
  color: number;
  /** Multiplicador da saída do shader da água (Water3D), em sRGB cru. */
  water: number;
}

export const LIGHTING_DAY: Lighting = {
  ambient: 1.2,
  hemisphere: 1.4,
  sun: 2,
  color: 0xffffff,
  water: 1,
};

export const LIGHTING_NIGHT: Lighting = {
  ambient: 0.3,
  hemisphere: 0.5,
  sun: 0.4,
  color: 0xcce5ff, // azul-frio do luar
  // Leva a água média do #0d1a31 do claro a ≈ #060d1b, perto de --map-water noturno.
  water: 0.55,
};

export const lightingFor = (night: boolean): Lighting =>
  night ? LIGHTING_NIGHT : LIGHTING_DAY;
