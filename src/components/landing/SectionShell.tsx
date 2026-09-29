import type { ReactNode } from 'react';

export type SectionContent = {
  kicker: string;
  title: string;
  lead: string;
  paragraphs: string[];
};

export function SectionShell({
  kicker, number, title, lead, children,
}: {
  kicker: string;
  number: 1 | 2 | 3 | 4;
  title: string;
  lead: string;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-240 px-6 py-16 md:py-24">
      <div className="flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-full bg-ink text-sm font-semibold text-page">
          {number}
        </span>
        <p className="cv-kicker uppercase">{kicker}</p>
      </div>
      <h2 className="cv-h2 mt-4">{title}</h2>
      <p className="cv-lead mt-3 italic">{lead}</p>
      <div className="mt-8">{children}</div>
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
