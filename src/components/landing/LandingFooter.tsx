import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="border-t border-cv-border-soft px-6 py-10 text-center text-xs text-ink-soft">
      <p>Baseado em pesquisa de Pedro Vitor Oliveira da Silva, IFBA, PGDW 2026.</p>
      <p className="mt-2">
        <Link href="/api/projeto" className="underline focus-visible:outline-2 focus-visible:outline-ink">
          Ler projeto completo (PDF)
        </Link>
      </p>
    </footer>
  );
}
