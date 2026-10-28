import type { CSSProperties } from 'react';
import { BAIRRO, LOTEAMENTOS, PESSOAS_POR_PONTO, PONTOS, SETORES, TOTAL_PESSOAS } from './recreioClipDados';
import { RecreioClipPlayer } from './RecreioClipPlayer';

const LEGENDAS = [
  <>
    <b>IBGE</b> · {SETORES.length} setores, {TOTAL_PESSOAS} pessoas; cada ponto = {PESSOAS_POR_PONTO}. Sabemos quantas há em cada setor, não onde.
  </>,
  <>
    <b>CNEFE</b> · os pontos vão para endereços reais de casas. É assim que um setor se reparte entre loteamentos.
  </>,
  <>
    <b>Resultado</b> · pessoas estimadas em cada loteamento (a parte dentro do Recreio).
  </>,
];

/**
 * O método no bairro Recreio: pontos (1 = 10 pessoas) que saem dos setores do
 * Censo para as casas do CNEFE e, no fim, viram o vídeo do app no mesmo
 * enquadramento. Componente de servidor: os ~620 pontos vão no HTML, e a
 * animação é CSS (globals.css, .cv-clip). Ver DECISOES-TECNICAS §7.
 */
export function RecreioClip() {
  return (
    <RecreioClipPlayer>
      <svg viewBox="0 0 390 844" className="cv-clip-cena" aria-hidden="true">
        <defs>
          <clipPath id="cv-clip-recreio">
            <path d={BAIRRO} />
          </clipPath>
        </defs>
        <g clipPath="url(#cv-clip-recreio)">
          {LOTEAMENTOS.map((l) => (
            <path key={l.nome} className="lot-fill" style={{ '--a': l.alfa } as CSSProperties} d={l.d} />
          ))}
          {SETORES.map((s) => (
            <path key={s.d} className="setor" d={s.d} />
          ))}
          {LOTEAMENTOS.map((l) =>
            l.incerto ? (
              <path key={l.nome} className="lot-linha incerto" d={l.d} />
            ) : (
              <path key={l.nome} className="lot-linha traco" pathLength={1} d={l.d} />
            ),
          )}
        </g>
        <path className="bairro" d={BAIRRO} />
        <g>
          {PONTOS.map(([x0, y0, x1, y1, fora, atraso], i) => (
            <circle
              key={i}
              r={1.7}
              className={fora ? 'res' : 'lot'}
              style={{ '--x0': `${x0}px`, '--y0': `${y0}px`, '--x1': `${x1}px`, '--y1': `${y1}px`, '--d': `${atraso}s` } as CSSProperties}
            />
          ))}
        </g>
        <g className="rot-setor">
          {SETORES.map((s) => (
            <text key={s.d} x={s.x} y={s.y + 4} className="num">
              {s.pop}
            </text>
          ))}
        </g>
        <g className="rot-lot">
          {LOTEAMENTOS.map((l) => (
            <g key={l.nome}>
              <text x={l.x} y={l.y - 3} className="nome">
                {l.nome}
              </text>
              <text x={l.x} y={l.y + 11} className="num">
                {l.pop}
              </text>
            </g>
          ))}
        </g>
      </svg>
      {LEGENDAS.map((legenda, i) => (
        <p key={i} className={`legenda l${i + 1}`}>
          {legenda}
        </p>
      ))}
    </RecreioClipPlayer>
  );
}
