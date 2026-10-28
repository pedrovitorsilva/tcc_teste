import { ThemeSwitcher } from '@/components/buttons/themeSwitcher/ThemeSwitcher';
import { AtlasVdcLogo } from '@/components/icons';
import { CtaButton } from './CtaButton';
import { CONTAINER, Titulo } from './Tipografia';

/** Chamada final e créditos. */
export function LandingFooter() {
  return (
    <footer className="bg-ink pt-24 text-page md:pt-32">
      <div className={CONTAINER}>
        <AtlasVdcLogo className="mb-2 size-14" />
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <Titulo linha1="Pronto para ver" linha2="o seu pedaço da cidade?" />
          <CtaButton text="Abrir o mapa" href="/map" variant="claro" className="self-start md:self-auto" />
        </div>

        <div className="mt-20 flex flex-col gap-6 border-t border-current/20 py-8 text-[14px] md:flex-row md:items-center md:justify-between">
          <p className="opacity-80">
            Pedro Vitor Oliveira da Silva, IFBA - Vitória da Conquista, Pós Graduação em Desenvolvimento Web - 2026.
          </p>
          <div className="flex items-center gap-6">
            <CtaButton text="Ler Projeto" href="/docs/Projeto_Pesquisa_Pedro_Silva_PGDW2026.pdf" variant="contorno" target="_blank" />
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
