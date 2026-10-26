import { Linha } from "../Linhas";
import { CONTAINER, Rotulo, Titulo } from "../Tipografia";

// Números de public/data (Censo 2022 e saída do ETL) e dos tiles de prédios.
const COLUNA_1 = [
  {
    titulo: "Moradores",
    descricao: "Pessoas contadas pelo Censo 2022 em todo o município.",
    valor: "370.879",
  },
  {
    titulo: "Loteamentos",
    descricao:
      "O recorte que os moradores conhecem pelo nome, menor que os bairros.",
    valor: "166",
  },
];
const COLUNA_2 = [
  {
    titulo: "Bairros e distritos",
    descricao: "As áreas urbana e rural que compõe a cidade.",
    valor: "24 bairros + 12 distritos",
  },
  {
    titulo: "Setores censitários",
    descricao: "Os pedaços em que o IBGE organiza a contagem da população.",
    valor: "664",
  },
];

/** O tamanho do que está no mapa, em linhas como as de um cardápio. */
export function Numeros() {
  return (
    <section className="bg-ink py-24 text-page md:py-36">
      <div className={CONTAINER}>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Rotulo className="opacity-80">Em números</Rotulo>
          <Titulo
            linha1="Uma cidade,"
            linha2="em pedaços menores."
            className="md:text-right"
          />
        </div>
        <div className="mt-14 grid md:mt-20 md:grid-cols-2 md:gap-x-16">
          <ul>
            {COLUNA_1.map((l) => (
              <Linha key={l.titulo} {...l} />
            ))}
          </ul>
          <ul>
            {COLUNA_2.map((l) => (
              <Linha key={l.titulo} {...l} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
