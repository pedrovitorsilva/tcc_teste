import type { Metadata } from 'next';
import {
  ComoFunciona,
  Dados,
  Hero,
  LandingFooter,
  LandingHeader,
  Numeros,
  Problema,
  TopBar,
} from '@/components/landing';
import { atkinson } from '@/components/landing/fonts';

export const metadata: Metadata = {
  title: 'AtlasVDC — Vitória da Conquista, loteamento por loteamento',
  description:
    'Um mapa da população de Vitória da Conquista dividida por loteamento, a partir do Censo 2022 do IBGE. Grátis, sem cadastro, no navegador.',
};

const HERO_ID = 'inicio';

export default function Landing() {
  return (
    <div className={`${atkinson.variable} bg-page font-(family-name:--font-landing) text-ink`}>
      <TopBar />
      <LandingHeader heroId={HERO_ID} />
      <main>
        <Hero id={HERO_ID} />
        <Problema />
        <Numeros />
        <ComoFunciona />
        <Dados />
      </main>
      <LandingFooter />
    </div>
  );
}
