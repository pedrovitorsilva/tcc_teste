/**
 * Imagem do mapa com filtros que mudam conforme o tema.
 */
export function MapImage({ width = 288, height = 359.546922, className }: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        aspectRatio: `${width} / ${height}`,
        backgroundImage: 'url(/svg/conquista.png)',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        filter: 'var(--map-img-filter)',
      }}
    />
  );
}
