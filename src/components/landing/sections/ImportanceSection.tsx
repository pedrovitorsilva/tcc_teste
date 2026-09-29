import { SectionShell, type SectionContent } from '../SectionShell';
import { SchoolFigure } from '../figures/SchoolFigure';

export function ImportanceSection({ content }: { content: SectionContent }) {
  return (
    <SectionShell
      kicker={content.kicker}
      number={2}
      title={content.title}
      lead={content.lead}
      paragraphs={content.paragraphs}
      figure={<SchoolFigure />}
      reverse
    />
  );
}
