import { ThemeSwitcher } from '@/components/buttons/themeSwitcher/ThemeSwitcher';
import { CtaButton } from './CtaButton';

export function LandingHeader({ showCta = true }: { showCta?: boolean }) {
  return (
    <header className="z-40 border-b border-cv-border-soft bg-page/90 backdrop-blur md:sticky md:top-0">
      <div className="mx-auto flex max-w-240 items-center justify-between gap-4 px-6 py-3">
        <span className="font-(family-name:--font-display) text-lg font-semibold text-ink">
          Cadastro Vivo
        </span>
        {showCta ? (
          <CtaButton text="Explorar o mapa" href="/map" className="hidden md:inline-flex" />
        ) : (
          <span className="hidden w-32 md:block" />
        )}
        <ThemeSwitcher />
      </div>
    </header>
  );
}
