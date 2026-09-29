import {
  LandingHeader, Hero, ProblemSection, ImportanceSection, CtaSection,
  ProposalSection, TransparencySection, LandingFooter, StickyMobileCta,
} from '@/components/landing';

export default function Landing() {
  return (
    <div className="pt-16 md:pt-0">
      <LandingHeader showCta />
      <main>
        <Hero
          headline="Veja quantas pessoas moram no seu loteamento — não só no seu bairro"
          subheadline="O IBGE só conta por bairro inteiro. O Cadastro Vivo mostra o mesmo número em pedaços menores, num mapa de Vitória da Conquista que você explora no navegador."
          credibility="TCC PGDW 2026 · IFBA · Vitória da Conquista–BA"
          cta_primary={{ text: 'Explorar o mapa', href: '/map' }}
          cta_secondary={{ text: 'Como foi feito (PDF)', href: '/api/projeto' }}
        />
        <ProblemSection
          content={{
            kicker: 'O problema',
            title: 'Os dados oficiais não enxergam o seu loteamento',
            lead: 'O Censo conta por setor e a prefeitura por bairro: recortes grandes, feitos para administrar.',
            paragraphs: [
              'Quem mora em Vitória da Conquista pensa em loteamento: um pedaço menor do bairro, com ruas, história e necessidades próprias. Um bairro pode juntar um loteamento antigo e denso com outro novo e quase vazio.',
              'A literatura define isso como MAUP - Problema da Unidade de Área Modificável. O jeito de desenhar a fronteira muda o que os números parecem dizer.',
            ],
          }}
        />
        <ImportanceSection
          content={{
            kicker: 'Por que isso importa',
            title: 'A média do bairro esconde quem mais precisa',
            lead: 'O bairro inteiro pode parecer equilibrado enquanto um pedaço dele fica descoberto.',
            paragraphs: [
              'Imagine decidir onde abrir uma nova escola. Na média do bairro, tudo parece em ordem; tem vaga. Mas por loteamento, aparece um bolsão de famílias com crianças e sem vaga por perto.',
              'Enxergar esse detalhe ajuda a planejar melhor: escola, posto de saúde, obra. Dinheiro público vai para onde mais falta.',
            ],
          }}
        />
        <CtaSection
          title="Pronto para ver o seu pedaço da cidade?"
          microcopy="Versão de demonstração: parte dos dados ainda é ilustrativa"
        />
        <ProposalSection
          content={{
            kicker: 'A proposta',
            title: 'Repartimos os moradores que o Censo já contou',
            lead: 'Não inventamos gente. O setor tem população conhecida; dividimos pelos loteamentos pela quantidade de casas.',
            paragraphs: [
              'Um setor censitário pode ter 300 moradores conhecidos. Esse total não muda. A pergunta é outra: como essas 300 pessoas se dividem entre os loteamentos que ficam ali dentro?',
              'Contamos os endereços residenciais de cada loteamento (dados oficiais do IBGE). Loteamento com mais casas recebe fatia maior. Simples: mais casas, mais gente mora ali.',
            ],
          }}
        />
        <TransparencySection
          content={{
            kicker: 'Honestidade dos dados',
            title: 'O que não sabemos aparece no mapa, não some',
            lead: 'Parte do setor pode ser rural, vazia ou loteamento não cadastrado ainda.',
            paragraphs: [
              'Em vez de esconder essa sobra na média entre vizinhos, mostramos à parte. A página diz o que sobrou e por quê.',
              'Assim você sabe: até onde os números são sólidos, e aonde começa a incerteza.',
            ],
          }}
        />
      </main>
      <LandingFooter />
      <StickyMobileCta />
    </div>
  );
}
