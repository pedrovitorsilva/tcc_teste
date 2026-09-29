import type { ReactNode } from 'react';

// Silhueta como <img> + overlay de divisões SVG.
export function MapMask({
  svg_url, color, width, height, className, children,
}: {
  svg_url: string;
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
        position: 'relative',
      }}
    >
      {/* Silhueta (SVG como img, colocar tint via CSS filter ou opacity) */}
      <img
        src={svg_url}
        alt="Mapa"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.4,
          objectFit: 'contain',
        }}
        aria-hidden="true"
      />
      {/* Overlay de divisões */}
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
