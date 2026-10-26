import { CtaButton } from '../CtaButton';
import { MapImage } from '../figures/MapImage';
import { Rotulo, Titulo } from '../Tipografia';

// É uma sequência de verdade (cada passo usa o anterior), por isso numerada.
const PASSOS = [
  {
    titulo: 'Partimos de quem o Censo contou',
    texto: 'Cada setor do IBGE tem uma população conhecida. Esse total não muda: ninguém é inventado.',
  },
  {
    titulo: 'Dividimos pelo número de casas',
    texto:
      'Contamos os endereços de moradia de cada loteamento no cadastro de endereços do IBGE. Mais casas, maior a parte da população.',
  },
  {
    titulo: 'Mostramos o que sobra',
    texto: 'Quem não cabe em nenhum loteamento aparece à parte no mapa, em vez de sumir na média dos vizinhos.',
  },
];

/** O método em três passos, ao lado do mapa da cidade. */
export function ComoFunciona() {
  return (
    <section id="como-funciona" className="grid scroll-mt-16 md:grid-cols-2">
      <div className="flex items-center justify-center bg-panel-2 px-10 py-16 md:py-24">
        <figure className="w-full max-w-sm">
          <MapImage className="w-full" />
          <figcaption className="mt-5 text-center text-[14px] text-ink-soft">
            Vitória da Conquista, dividida em bairros.
          </figcaption>
        </figure>
      </div>

      <div className="bg-loteamento px-5 py-20 text-page md:px-14 md:py-28 lg:px-20">
        <Rotulo className="opacity-85">Como funciona</Rotulo>
        <Titulo linha1="Repartimos quem" linha2="o Censo já contou." className="mt-5" />
        <ol className="mt-10 max-w-120 space-y-8">
          {PASSOS.map((passo, i) => (
            <li key={passo.titulo} className="grid grid-cols-[2.25rem_1fr] gap-x-3">
              <span aria-hidden="true" className="font-(family-name:--font-display) text-[28px] font-semibold leading-none">
                {i + 1}
              </span>
              <div>
                <p className="text-[17px] font-bold">{passo.titulo}</p>
                <p className="mt-1.5 text-[16px] leading-[1.6] opacity-90">{passo.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <CtaButton text="Abrir o mapa" href="/map" variant="contorno" className="mt-12" />
      </div>
    </section>
  );
}
