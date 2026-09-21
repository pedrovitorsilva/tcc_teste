'use client';

import { useTheme } from '@/components/theme/ThemeProvider';
import { useThemeTokens } from '@/hooks/useThemeTokens';
import {
  COLOR_TOKENS,
  PALETTES,
  TOKEN_LABELS,
  paletteColors,
  type PaletteColors,
  type PaletteToken,
} from '@/lib/color/palette';

const HEX = /^#[0-9a-f]{6}$/i;

/** `<input type="color">` só aceita `#rrggbb`: um token em rgb() travaria o input, então cai no preto. */
function toHex(value: string): string {
  return HEX.test(value.trim()) ? value.trim().toLowerCase() : '#000000';
}

function PaletteSwatches({ colors }: { colors: PaletteColors }) {
  return (
    <span className="flex gap-1" aria-hidden="true">
      {COLOR_TOKENS.map((token) => (
        <span
          key={token}
          className="h-3.5 w-3.5 rounded-[3px] border border-cv-border"
          style={{ background: colors[token] }}
        />
      ))}
    </span>
  );
}

/** Painel de edição da paleta: presets substituem todas as cores de uma vez,
 * o color picker por camada mescla no override existente (ver
 * ThemeProvider.setPaletteOverride). */
export function PaletteControls() {
  const { theme, paletteOverride, setPaletteOverride, resetPalette } = useTheme();
  const tokens = useThemeTokens();

  // A cor mostrada é sempre a que está valendo: o override quando existe, e o
  // token do tema ativo quando não.
  const current = (token: PaletteToken) =>
    toHex(paletteOverride[token] ?? tokens[token]);

  const hasOverride = COLOR_TOKENS.some((token) => paletteOverride[token]);

  return (
    <div className="w-62 rounded-[10px] border border-cv-border bg-panel p-3 shadow-[0_4px_16px_rgba(0,0,0,.08)]">
      <div className="mb-2 text-[11px] font-medium tracking-wide text-ink-soft uppercase">
        Paletas
      </div>
      <div className="mb-3 flex flex-col gap-1">
        {PALETTES.map((palette) => {
          const colors = paletteColors(palette, theme);
          return (
            <button
              key={palette.id}
              type="button"
              onClick={() => setPaletteOverride({ ...colors })}
              className="flex min-h-11 items-center justify-between gap-2 rounded-md px-2 text-[12.5px] text-ink-soft hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {palette.label}
              <PaletteSwatches colors={colors} />
            </button>
          );
        })}
      </div>

      <div className="mb-2 text-[11px] font-medium tracking-wide text-ink-soft uppercase">
        Cor por camada
      </div>
      <div className="flex flex-col gap-1">
        {COLOR_TOKENS.map((token) => (
          <label
            key={token}
            className="flex min-h-11 cursor-pointer items-center justify-between gap-2 px-2 text-[12.5px] text-ink-soft"
          >
            {TOKEN_LABELS[token]}
            <input
              type="color"
              value={current(token)}
              onChange={(e) =>
                setPaletteOverride({ ...paletteOverride, [token]: e.target.value })
              }
              className="h-6 w-9 cursor-pointer rounded border border-cv-border bg-transparent p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            />
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={resetPalette}
        disabled={!hasOverride}
        className="mt-2 min-h-11 w-full rounded-md px-2 text-[12.5px] text-ink-soft hover:bg-page disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Restaurar cores do tema
      </button>
    </div>
  );
}
