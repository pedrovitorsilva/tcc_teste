import Link from 'next/link';
import { LinhaInfo } from '../Linhas';
import { CONTAINER, Rotulo, Texto, Titulo } from '../Tipografia';

/** Fontes, sigilo do IBGE e limites — o que dá para confiar e onde há incerteza. */
export function Dados() {
  return (
    <section id="dados" className="scroll-mt-16 bg-page py-24 text-ink md:py-36">
      <div className={`${CONTAINER} grid gap-14 md:grid-cols-[2fr_3fr] md:gap-16`}>
        <div>
          <Rotulo className="text-ink-soft">Os dados</Rotulo>
          <Titulo linha1="De onde vêm" linha2="os números." className="mt-5" />
          <Texto className="mt-6">
            Tudo vem de fontes públicas e é preparado antes, fora do site. O mapa mostra o resultado e avisa onde ele é
            uma estimativa.
          </Texto>
          <Link
            href="/api/projeto"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block text-[15px] underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
          >
            Ler o projeto completo (PDF)
          </Link>
        </div>

        <dl className="border-b border-cv-border">
          <LinhaInfo rotulo="Fontes">
            IBGE, Censo Demográfico 2022: setores censitários, resultados por setor, áreas de ponderação e a amostra do
            Censo. Cadastro de endereços do IBGE (CNEFE). Escolas do INEP. Prédios do Overture Maps e ruas do
            OpenStreetMap.
          </LinhaInfo>
          <LinhaInfo rotulo="Sigilo do IBGE">
            Quando uma área tem poucos moradores, o IBGE esconde alguns números para proteger quem mora ali. No mapa,
            essas áreas aparecem em cinza, nunca como zero.
          </LinhaInfo>
          <LinhaInfo rotulo="Estimativas">
            A população de cada setor é real; a divisão pelos loteamentos é uma estimativa feita pelo número de casas. Dos
            166 loteamentos, 66 têm o contorno aproximado e aparecem marcados no mapa.
          </LinhaInfo>
          <LinhaInfo rotulo="Outros Detalhes">
            A altura dos prédios, localização dos postes e vegetação é fictícia e estimada, 
            podendo não refletir a realidade/
          </LinhaInfo>
        </dl>
      </div>
    </section>
  );
}
