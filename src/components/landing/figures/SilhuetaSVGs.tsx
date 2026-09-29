/**
 * Silhuetas SVG inline (sem dependência de carregamento externo).
 * Renderizam como componentes React.
 */

export function ConquistaSilhueta({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 288 359.546922"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Silhueta de Vitória da Conquista"
    >
      <g fillOpacity="1" fill="currentColor">
        {/* Importar via: bairro = polígonos grandes, loteamento = médios, setor = grid */}
        {/* Por enquanto, um retângulo arredondado que representa o município */}
        <rect x="10" y="10" width="268" height="339.546922" rx="20" fill="currentColor" />
      </g>
    </svg>
  );
}

export function BrasilSilhueta({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1966.9 1935.1"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Silhueta do Brasil"
    >
      <g fillOpacity="1" fill="currentColor">
        <path d="M 500 500 L 1500 500 L 1500 1400 L 500 1400 Z" />
      </g>
    </svg>
  );
}

export function BahiaSilhueta({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 693.623 704.335"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Silhueta da Bahia"
    >
      <g fillOpacity="1" fill="currentColor">
        <path d="M 100 100 L 600 100 L 580 650 L 80 680 Z" />
      </g>
    </svg>
  );
}
