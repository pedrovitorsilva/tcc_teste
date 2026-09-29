import { SectionShell, type SectionContent } from '../SectionShell';
import { RedistributionFigure } from '../figures/RedistributionFigure';

export function ProposalSection({ content }: { content: SectionContent }) {
  return (
    <SectionShell
      kicker={content.kicker}
      number={3}
      title={content.title}
      lead={content.lead}
      paragraphs={content.paragraphs}
      figure={<RedistributionFigure />}
      reverse={false}
    />
  );
}
