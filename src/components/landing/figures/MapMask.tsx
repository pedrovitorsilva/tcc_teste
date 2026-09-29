/**
 * Imagem PNG com filtros que mudam conforme o tema.
 */
export function MapMask({
  image_url, width, height, className,
}: {
  image_url?: string;
  svg_url?: string; // Compatibilidade (ignorado)
  color?: string; // Compatibilidade (ignorado)
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        aspectRatio: `${width} / ${height}`,
        backgroundImage: image_url ? `url(${image_url})` : undefined,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        filter: 'var(--map-img-filter, brightness(0.95))',
      }}
    />
  );
}
