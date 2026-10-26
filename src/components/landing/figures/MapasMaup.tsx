import type { CSSProperties } from 'react';
import { MAPAS, SILHUETA } from './mapasMaupDados';

// Do maior recorte ao menor: a mesma cidade, cada vez mais dividida.
const PAINEIS = [
  { chave: 'bairros', legenda: 'Por bairros', nivel: 'var(--bairro)', traco: 1.8 },
  { chave: 'loteamentos', legenda: 'Por loteamentos', nivel: 'var(--loteamento)', traco: 1.1 },
  { chave: 'setores', legenda: 'Por setores censitários', nivel: 'var(--setor)', traco: 1.35 },
] as const;

/**
 * A mesma área ilustrativa em três recortes. Componente de servidor: os ~760
 * polígonos vão no HTML, sem peso no JavaScript do navegador. Cores em
 * globals.css (.cv-maup), pelo tema.
 */
export function MapasMaup() {
  return (
    // No desktop a figura preenche a altura do pai (absolute) e cada SVG encolhe
    // proporcionalmente para caber, em vez de esticar a coluna.
    <figure className="md:absolute md:inset-0 md:flex md:flex-col">
      <div className="grid gap-10 sm:grid-cols-3 sm:gap-6 md:flex md:min-h-0 md:flex-1 md:flex-col md:gap-4">
        {PAINEIS.map(({ chave, legenda, nivel, traco }) => (
          <div key={chave} className="md:flex md:min-h-0 md:flex-1 md:flex-col">
            <svg
              viewBox="0 0 750 460"
              role="img"
              aria-label={`Mapa ilustrativo dividido ${legenda.toLowerCase()}`}
              className="cv-maup h-auto w-full md:min-h-0 md:flex-1"
              style={{ '--nivel': nivel } as CSSProperties}
            >
              <clipPath id={`maup-${chave}`}>
                <path d={SILHUETA} />
              </clipPath>
              <g
                clipPath={`url(#maup-${chave})`}
                strokeWidth={traco}
                dangerouslySetInnerHTML={{ __html: MAPAS[chave] }}
              />
              <path className="contorno" d={SILHUETA} />
            </svg>
            <p className="mt-3 text-center text-[14px] font-bold md:mt-1 md:text-[13px]">{legenda}</p>
          </div>
        ))}
      </div>
      <figcaption className="mt-6 text-center text-[14px] text-ink-soft md:mt-4 md:text-[12px]">
        Exemplo de cidade dividida por bairros, loteamentos e setores censitários. Ilustração.
      </figcaption>
    </figure>
  );
}
