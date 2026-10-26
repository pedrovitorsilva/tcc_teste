import { MapasMaup } from "../figures/MapasMaup";
import { CONTAINER, Rotulo, Texto, Titulo } from "../Tipografia";

/** Por que o projeto existe: o recorte oficial é grande demais para quem mora num loteamento. */
export function Problema() {
  return (
    <section
      id="problema"
      className="scroll-mt-16 bg-page py-24 text-ink md:py-36"
    >
      <div
        className={`${CONTAINER} grid gap-10 md:grid-cols-[1fr_2fr] md:grid-rows-[auto_1fr] md:gap-x-16`}
      >
        <Rotulo className="text-ink-soft md:pt-4">O problema</Rotulo>
        {/* No celular o texto vem antes dos mapas; no desktop ocupa a coluna da direita inteira. */}
        <div className="md:col-start-2 md:row-span-2 md:row-start-1">
          <Titulo
            linha1="Zabelê ou na Vila Serrana?"
            linha2="Diferenças entre bairros e loteamentos."
          />
          <div className="mt-8 space-y-5">
            <Texto>
              Grandes portais, como IBGE e prefeituras locais, publicam dados
              divididos por bairro ou setor censitário. São recortes que nem
              sempre combinam com a forma como as pessoas vivem e usam a cidade.
            </Texto>
            <Texto>
              Quem mora em Vitória da Conquista, por exemplo, pensa em
              loteamento: uma divisáo de um bairro, com populaçào e contexto
              próprios.
            </Texto>
            <Texto>
              Quando olhamos apenas os dados do bairro Zabelê, os loteamentos
              Vila Serrana e Urbis IV podem parecer ter a mesma necessidade de
              escolas, por exemplo. Só uma análise detalhada poderia mostrar que
              um tem quatro vezes mais moradores que o outro.
            </Texto>
          </div>
          <p className="mt-10 font-(family-name:--font-display) text-[24px] italic text-ink-soft">
            Mudar a perspectiva pode mudar a forma de ver os dados.
          </p>
        </div>
        <div className="mt-6 md:relative md:col-start-1 md:row-start-2 md:mt-0">
          <MapasMaup />
        </div>
      </div>
    </section>
  );
}
