import { CtaButton } from '../CtaButton';
import { MapImage } from '../figures/MapImage';
import { Rotulo, Titulo } from '../Tipografia';

// É uma sequência de verdade (cada passo usa o anterior), por isso numerada.
const PASSOS = [
  {
    titulo: 'Partimos do que já é público',
    texto:
      'Tudo começa com os dados abertos do Censo 2022. Ninguém é inventado: usamos as pessoas que o IBGE já contou em cada bairro e setor da cidade.',
  },
  {
    titulo: 'Adaptamos os números para os loteamentos',
    texto:
      'Quando a área é maior que o loteamento, como o bairro, repartimos os dados pelo número de casas de cada parte. Quando é menor, como muitos setores, somamos os setores que ficam dentro do loteamento.',
  },
  {
    titulo: 'Organizamos os resultados no mapa',
    texto:
      'Cada loteamento tem uma ficha com população, idade, moradias e renda estimadas. As cores do mapa ajudam a comparar áreas, e quem não cabe em nenhum loteamento aparece à parte.',
  },
];

/** O método em três passos, ao lado do mapa da cidade. */
export function ComoFunciona() {
  return (
    <section id="como-funciona" className="grid scroll-mt-16 md:grid-cols-2">
      <div className="order-last flex items-center justify-center bg-panel-2 px-10 py-16 md:order-none md:py-24">
        <figure className="w-full max-w-sm">
          <MapImage className="w-full" />
          <figcaption className="mt-5 text-center text-[14px] text-ink-soft">
            Vitória da Conquista, dividida em bairros.
          </figcaption>
        </figure>
      </div>

      <div className="bg-loteamento px-5 py-20 text-page md:px-14 md:py-28 lg:px-20">
        <Rotulo className="opacity-85">Como funciona</Rotulo>
        <Titulo linha1="É assim que obtemos nossos dados:" linha2='' className="mt-5" />
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
