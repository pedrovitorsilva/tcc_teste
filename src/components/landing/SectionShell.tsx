import type { ReactNode } from 'react';

export type SectionContent = {
  kicker: string;
  title: string;
  lead: string;
  paragraphs: string[];
};

export function SectionShell({
  kicker, number, title, lead, paragraphs, figure, reverse = false,
}: {
  kicker: string;
  number: 1 | 2 | 3 | 4;
  title: string;
  lead: string;
  paragraphs: string[];
  figure?: ReactNode;
  reverse?: boolean;
}) {
  return (
    <section className="mx-auto my-6 w-full max-w-240 rounded-3xl border border-cv-border bg-panel p-6 shadow-sm md:my-10 md:p-10">
      <div className="grid items-start gap-8 md:grid-cols-2 md:gap-12">
        <div className={reverse ? 'md:order-2' : undefined}>
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-full bg-ink text-sm font-semibold text-page">
              {number}
            </span>
            <p className="cv-kicker uppercase">{kicker}</p>
          </div>
          <h2 className="cv-h2 mt-4">{title}</h2>
          <p className="cv-lead mt-3 italic">{lead}</p>
          <div className="mt-6">
            <Paragraphs items={paragraphs} />
          </div>
        </div>
        <div className={reverse ? 'md:order-1' : undefined}>{figure}</div>
      </div>
    </section>
  );
}

export function Paragraphs({ items }: { items: string[] }) {
  return (
    <div className="space-y-4">
      {items.map((p) => (
        <p key={p} className="cv-lead">{p}</p>
      ))}
    </div>
  );
}
