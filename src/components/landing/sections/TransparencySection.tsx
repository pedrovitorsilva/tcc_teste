import { SectionShell, Paragraphs, type SectionContent } from '../SectionShell';
import { ResidualFigure } from '../figures/ResidualFigure';

export function TransparencySection({ content }: { content: SectionContent }) {
  return (
    <SectionShell kicker={content.kicker} number={4} title={content.title} lead={content.lead}>
      <Paragraphs items={content.paragraphs} />
      <ResidualFigure />
    </SectionShell>
  );
}
