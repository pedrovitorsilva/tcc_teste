import {
  LandingHeader, Hero, LocatorSection, ProblemSection, ImportanceSection, CtaSection,
  ProposalSection, TransparencySection, Faq, FinalCta, LandingFooter, StickyMobileCta,
} from '@/components/landing';

export default function Landing() {
  return (
    <div className="pt-16 md:pt-0">
      <LandingHeader showCta />
      <main>
        <Hero
          headline="De onde vem a população do seu quarteirão?"
          subheadline="O IBGE responde por bairro inteiro. Este mapa responde por loteamento, o pedaço da cidade onde você realmente mora."
          credibility="TCC PGDW 2026 · IFBA · Vitória da Conquista–BA"
          cta_primary={{ text: 'Explorar o mapa', href: '/map' }}
          cta_secondary={{ text: 'Ler o projeto (PDF)', href: '/api/projeto' }}
        />
        <LocatorSection />
        <ProblemSection
          content={{
            kicker: 'O problema',
            title: 'As divisões oficiais não batem com a cidade real',
            lead: 'Os dados oficiais usam fronteiras que não são as da vizinhança onde as pessoas vivem. Por isso, dizem pouco sobre a sua rua.',
            paragraphs: [
              'O Censo do IBGE conta as pessoas por setor censitário. A prefeitura organiza os serviços por bairro. São recortes grandes, feitos para administrar, e não para mostrar como cada vizinhança vive.',
              'Na prática, as pessoas moram em loteamentos: pedaços menores do bairro, com ruas, história e necessidades próprias. Um mesmo bairro pode juntar um loteamento antigo e cheio de casas com outro novo e quase vazio.',
              'Isso tem nome: MAUP, o Problema da Unidade de Área Modificável. Quer dizer que o jeito de desenhar as fronteiras muda o que os números parecem mostrar. É como fotografar a cidade de longe: a imagem sai certa, mas os detalhes somem.',
            ],
          }}
        />
        <ImportanceSection
          content={{
            kicker: 'Por que isso importa',
            title: 'Bairro inteiro esconde onde o problema realmente está',
            lead: 'A média do bairro pode parecer equilibrada enquanto uma parte dele precisa de ajuda urgente.',
            paragraphs: [
              'Imagine que você precisa decidir onde abrir uma nova escola. Olhando só a média do bairro, tudo parece em ordem: tem vaga para quase todo mundo.',
              'Agora olhe loteamento por loteamento. Aparece um bolsão de famílias com crianças e sem vaga por perto. Esse bolsão estava lá o tempo todo, escondido dentro da média.',
              'Enxergar esse nível de detalhe ajuda a planejar melhor onde colocar escolas, postos de saúde e obras. Isso significa gastar o dinheiro público onde ele faz mais diferença.',
            ],
          }}
        />
        <CtaSection />
        <ProposalSection
          content={{
            kicker: 'A proposta',
            title: 'Não inventamos gente nova — redistribuímos a que já existe',
            lead: 'O Censo já diz quantas pessoas moram em cada setor. Nosso trabalho é decidir quanto dessa população fica em cada loteamento que ocupa aquele setor.',
            paragraphs: [
              'Pense num setor censitário com 300 moradores conhecidos. O total é oficial e não muda. A pergunta é outra: como essas 300 pessoas se dividem entre os loteamentos que ficam dentro dele?',
              'Para responder, contamos os endereços residenciais de cada loteamento no CNEFE, o cadastro de endereços do IBGE. Loteamento com mais casas recebe uma fatia maior da população do setor.',
              'A lógica é simples: onde há mais casas, moram mais pessoas. Assim, cada loteamento recebe a parte que combina com o que existe nele.',
            ],
          }}
        />
        <TransparencySection
          content={{
            kicker: 'Honestidade dos dados',
            title: 'O que sobra é mostrado, não escondido',
            lead: 'Quando uma parte da população não se encaixa em nenhum loteamento, o mapa mostra isso claramente.',
            paragraphs: [
              'Nem toda a área de um setor fica dentro de um loteamento mapeado. Pode ser zona rural, terreno vazio ou um loteamento que ainda não entrou no cadastro.',
              'Em vez de repartir essa sobra em silêncio entre os vizinhos, o método mostra esse resíduo à parte. A página diz o que sobrou e por que sobrou, para você saber até onde os números são confiáveis.',
            ],
          }}
        />
        <Faq
          items={[
            {
              question: 'Preciso de cadastro para usar?',
              answer: 'Não. É só abrir o mapa e explorar, de graça e sem login.',
            },
            {
              question: 'Os números são reais?',
              answer:
                'Em parte. Os totais vêm de dados oficiais do Censo (IBGE 2022). A divisão entre loteamentos ainda é ilustrativa e está em validação. O método completo está no PDF.',
            },
            {
              question: 'Onde está o método completo?',
              answer:
                'No projeto de pesquisa (PDF), seções 3 e 4. O link também está no rodapé da página.',
            },
          ]}
        />
        <FinalCta />
      </main>
      <LandingFooter />
      <StickyMobileCta />
    </div>
  );
}
