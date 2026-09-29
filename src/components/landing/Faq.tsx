export function Faq({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <section className="mx-auto w-full max-w-240 px-6 py-16 md:py-24">
      <p className="cv-kicker uppercase">Perguntas frequentes</p>
      <div className="mt-6 divide-y divide-cv-border-soft border-y border-cv-border-soft">
        {items.map(({ question, answer }) => (
          <details key={question} className="py-4">
            <summary className="cursor-pointer font-medium text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-ink">
              {question}
            </summary>
            <p className="cv-note-body mt-3">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
