'use client';

import { useEffect, useMemo, useState } from 'react';
import type { StyleSpecification } from 'maplibre-gl';
import type { MapStyleOption } from '@/components/ui/map';
import type { ThemeName } from '@/lib/color/theme';
import { loadTintedStyle } from '@/lib/map/tint';
import type { ThemeTokens } from '@/hooks/useThemeTokens';

// Variantes "nolabels": o basemap entra só como geometria, sem rótulos próprios
// competindo com os nomes que a aplicação desenha. Por prop, porque
// components/ui/map.tsx é de terceiros e não pode ser editado.
const MAP_STYLES = {
  light:
    'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json',
};

interface MapStyles {
  light: MapStyleOption;
  dark: MapStyleOption;
}

/**
 * Basemaps tingidos: os três temas repintam a geometria da CARTO a partir dos
 * tokens `--map-*`, em vez de servirem um style próprio (docs/DECISOES-TECNICAS.md §1).
 *
 * O componente de mapa só resolve "light" e "dark" (vintage entra como light,
 * ver lib/color/theme.ts), então o style tingido vai nas duas chaves. Enquanto a
 * busca não resolve — ou se falhar — vale o basemap cru da CARTO.
 */
export function useMapStyles(theme: ThemeName, tokens: ThemeTokens): MapStyles {
  const [tinted, setTinted] = useState<StyleSpecification | null>(null);
  const { mapLand, mapWater, mapInk } = tokens;

  useEffect(() => {
    // Cada tema define de qual style parte e para onde cada extremo da faixa de
    // lightness é puxado.
    const recipe =
      theme === 'vintage'
        ? {
            source: MAP_STYLES.light,
            target: { land: mapLand, water: mapWater, ink: mapInk },
          }
        : theme === 'dark'
          ? {
              source: MAP_STYLES.dark,
              target: {
                background: mapLand,
                // Invertido: a via mais clara vira o âmbar aceso, a mais escura
                // se dissolve no fundo. Só a malha principal fica acesa.
                land: mapInk,
                ink: mapLand,
                water: mapWater,
                contrast: 0.85,
              },
            }
          : {
              source: MAP_STYLES.light,
              // 0.55 dá a leitura de gravura sem chegar ao preto, que competiria
              // com os dados (o Positron cru desenha as vias em #ddd).
              target: {
                land: mapLand,
                water: mapWater,
                ink: mapInk,
                contrast: 0.55,
              },
            };

    // Limpa antes de buscar: senão o style do tema anterior segue pintado até a
    // nova busca resolver. O basemap cru no intervalo é o estado errado certo.
    setTinted(null);

    let cancelled = false;
    loadTintedStyle(recipe.source, recipe.target)
      .then((style) => {
        if (!cancelled) setTinted(style);
      })
      .catch(() => {
        if (!cancelled) setTinted(null);
      });
    return () => {
      cancelled = true;
    };
  }, [theme, mapLand, mapWater, mapInk]);

  return useMemo(
    () => (tinted ? { light: tinted, dark: tinted } : MAP_STYLES),
    [tinted],
  );
}
