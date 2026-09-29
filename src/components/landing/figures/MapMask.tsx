import type { ReactNode } from 'react';

// Imagem PNG como fundo + overlay de divisões SVG.
export function MapMask({
  image_url, color, width, height, className, children,
}: {
  image_url?: string;
  svg_url?: string; // Compatibilidade (ignorado)
  color?: string; // Compatibilidade (ignorado)
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
        backgroundImage: image_url ? `url(${image_url})` : undefined,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
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
