/**
 * Amostra da hachura do mapa para a ficha e a legenda. Imita `lib/map/hachurePattern.ts`:
 * aproximado = "/" em tile de 8 px; sobra = "\" (espelhada) em tile de 12 px
 * (`SOBRA_HATCH_SIZE`). Num tile de lado n, as linhas ficam a n/√2 uma da outra.
 * No CSS as listras são perpendiculares ao ângulo do gradiente: 135deg desenha "/".
 */
export function HachuraAmostra({ espelhada = false }: { espelhada?: boolean }) {
  const [angulo, passo] = espelhada ? [45, 12 / Math.SQRT2] : [135, 8 / Math.SQRT2];
  return (
    <span
      aria-hidden
      className="inline-block h-3 w-5 shrink-0 rounded-[2px] border border-cv-border"
      style={{
        backgroundImage: `repeating-linear-gradient(${angulo}deg, var(--uncertain) 0 1px, transparent 1px ${passo}px)`,
      }}
    />
  );
}
