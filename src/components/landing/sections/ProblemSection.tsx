import { SectionShell, type SectionContent } from '../SectionShell';
import { DivisionsFigure } from '../figures/DivisionsFigure';

export function ProblemSection({ content }: { content: SectionContent }) {
  return (
    <SectionShell
      kicker={content.kicker}
      number={1}
      title={content.title}
      lead={content.lead}
      paragraphs={content.paragraphs}
      figure={<DivisionsFigure />}
      reverse={false}
    />
  );
}
