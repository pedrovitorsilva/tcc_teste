import { CtaButton } from './CtaButton';
import { MapImage } from './figures/MapImage';

type Cta = { text: string; href: string };

export function Hero({
  headline, subheadline, credibility, cta_primary, cta_secondary,
}: {
  headline: string;
  subheadline: string;
  credibility: string;
  cta_primary: Cta;
  cta_secondary: Cta;
}) {
  return (
    <section className="relative bg-page py-10 md:py-24">
      <div className="mx-auto max-w-240 px-4 md:px-6">
        {/* Mobile: linha 1 = texto + mapa (~1/3); linha 2 = botões. `contents` solta os filhos no grid; md+: volta a ser a coluna esquerda. */}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.5fr)] items-center gap-x-3 gap-y-5 md:grid-cols-2 md:gap-12">
          <div className="contents md:block">
            <div>
              <p className="mb-3 inline-block rounded-2xl border border-cv-border bg-panel px-2.5 py-1 text-xs text-ink-soft md:mb-6 md:rounded-full md:px-3">
                {credibility}
              </p>
              <h1 className="cv-title-hero">{headline}</h1>
              <p className="cv-lead mt-3 text-[length:clamp(14px,3.6vw,16px)] md:mt-6 md:text-base">{subheadline}</p>
            </div>
            <div className="col-span-2 row-start-2 md:col-auto md:row-auto md:mt-8">
              {/* w-fit: a subdiv tem a largura da linha de botões; a legenda centraliza nela no desktop. */}
              <div className="mx-auto w-fit">
                {/* Mobile: auto-cols-fr + w-fit => as duas colunas têm a largura do botão mais largo (mesmo tamanho). */}
                <div className="grid auto-cols-fr grid-flow-col gap-2 md:flex md:gap-4">
                  <CtaButton {...cta_primary} className="px-4 md:px-6" />
                  <CtaButton {...cta_secondary} variant="ghost" target="_blank" className="px-4 md:px-6" />
                </div>
                <p className="mt-2 text-center text-xs text-ink-soft">
                  Grátis · sem cadastro · abre no navegador
                </p>
              </div>
              {/* Mobile: um dado por linha, centralizado; md+: uma linha com separador "·". */}
              <p className="mt-5 text-center text-xs uppercase tracking-wider text-ink-soft md:mt-8 md:text-left md:text-sm">
                <span className="block md:inline">24 bairros</span>
                <span className="hidden md:inline"> · </span>
                <span className="block md:inline">166 loteamentos</span>
                <span className="hidden md:inline"> · </span>
                <span className="block md:inline">664 setores censitários</span>
              </p>
            </div>
          </div>
          <div className="col-start-2 row-start-1 rounded-xl border border-cv-border bg-panel p-2 shadow-sm md:col-auto md:row-auto md:rounded-3xl md:p-6">
            <MapImage className="mx-auto w-full max-w-72 rounded-lg" />
            <p className="mt-4 hidden text-center text-sm text-ink-soft md:block">
              Vitória da Conquista
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
