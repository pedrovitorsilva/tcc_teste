import type { ReactNode } from 'react';

// Fundo + overlay de divisões SVG (sem silhueta externa).
export function MapMask({
  color, width, height, className, children,
}: {
  svg_url?: string; // Não usado mais, mas mantém compatibilidade
  color: string;
  width: number;
  height: number;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={className}
      style={{
        aspectRatio: `${width} / ${height}`,
        background: color,
        borderRadius: '0.5rem',
        position: 'relative',
      }}
    >
      {/* Overlay de divisões/loteamentos/setores */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      >
        {children}
      </svg>
    </div>
  );
}
