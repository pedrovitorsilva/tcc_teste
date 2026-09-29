import type { ReactNode } from 'react';

// Silhueta via CSS mask. children (ex.: <svg> de divisões) ficam recortados pela silhueta.
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
  const mask = `url(${svg_url})`;
  return (
    <div
      className={className}
      style={{
        aspectRatio: `${width} / ${height}`,
        background: color,
        maskImage: mask,
        WebkitMaskImage: mask,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    >
      {children}
    </div>
  );
}
