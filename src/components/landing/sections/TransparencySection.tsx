import { SectionShell, type SectionContent } from '../SectionShell';
import { ResidualFigure } from '../figures/ResidualFigure';

export function TransparencySection({ content }: { content: SectionContent }) {
  return (
    <SectionShell
      kicker={content.kicker}
      number={4}
      title={content.title}
      lead={content.lead}
      paragraphs={content.paragraphs}
      figure={<ResidualFigure />}
      reverse
    />
  );
}
