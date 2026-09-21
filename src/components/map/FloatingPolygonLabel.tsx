'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMap } from '@/components/ui/map';
import {
  FLOAT_MAX_SIZE,
  FLOAT_MIN_LEGIBLE_SIZE,
  floatingLabelSizeCoefficient,
  polygonLabelAnchor,
} from '@/lib/map/polygonLabel';
import type { ThemeTokens } from '@/hooks/useThemeTokens';
import type { MapLabelTarget } from '@/types/map';

interface ScreenPosition {
  x: number;
  y: number;
  size: number;
}

/**
 * Nome do bairro/loteamento ativo como cartão HTML flutuante sobre a geometria.
 * É overlay HTML, e não uma `symbol` layer, para ter sombra CSS e tipografia de
 * display; o tamanho sai do raio do polígono. Ver docs/DECISOES-TECNICAS.md §4.
 */
export function FloatingPolygonLabel({
  target,
  tokens,
}: {
  target: MapLabelTarget | null;
  tokens: ThemeTokens;
}) {
  const { map, isLoaded } = useMap();

  // O polo de inacessibilidade é uma varredura em grade — recalculá-lo a cada
  // render (hover dispara vários por segundo) seria desperdício. Mesmo padrão
  // da MapLabel.tsx original.
  const placed = useMemo(() => {
    if (!target) return null;
    const anchor = polygonLabelAnchor(target.geometry);
    if (!anchor) return null;
    return {
      anchor,
      coefficient: floatingLabelSizeCoefficient(anchor.radius, target.name),
    };
  }, [target]);

  const [pos, setPos] = useState<ScreenPosition | null>(null);

  useEffect(() => {
    if (!map || !isLoaded || !placed) {
      setPos(null);
      return;
    }

    const update = () => {
      const screen = map.project(placed.anchor.point);
      const size = Math.min(placed.coefficient * 2 ** map.getZoom(), FLOAT_MAX_SIZE);
      setPos(size >= FLOAT_MIN_LEGIBLE_SIZE ? { x: screen.x, y: screen.y, size } : null);
    };

    update();
    // Cobre pan, zoom, rotação e inclinação — não precisa de um listener por
    // frame (`'render'`), que dispararia a 60fps sem necessidade.
    map.on('move', update);
    return () => {
      map.off('move', update);
    };
  }, [map, isLoaded, placed]);

  if (!target || !pos) return null;

  return (
    <div
      className="cv-title pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-center whitespace-nowrap transition-opacity duration-150"
      style={{
        left: pos.x,
        top: pos.y,
        fontSize: pos.size,
        color: tokens[target.colorToken],
        // Dois drop-shadow empilhados: um justo e escuro para legibilidade
        // contra o basemap (funciona como halo), outro maior e mais suave,
        // deslocado para baixo, para a sensação de profundidade/flutuação.
        filter:
          'drop-shadow(0 1px 1px rgba(0,0,0,.35)) drop-shadow(0 10px 18px rgba(0,0,0,.28))',
      }}
    >
      {target.name}
    </div>
  );
}
