import { useEffect, useRef } from "react";

/**
 * Loop de `requestAnimationFrame` ligado só enquanto `active` — camadas
 * animadas nunca rodam paradas. `dtS` (segundos desde o frame anterior) tem
 * teto de 0,1 s: aba em background não "catapulta" a animação.
 */
export function useAnimationFrame(active: boolean, tick: (now: number, dtS: number) => void): void {
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (!active) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function loop(now) {
      const dtS = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      tickRef.current(now, dtS);
      frame = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);
}
