import { NoteCard } from '@/components/panel/NoteCard';

export function CartographerNote() {
  return (
    <NoteCard className="mb-4.5 p-3">
      <div className="cv-note-title mb-1">✎ Nota do Cartógrafo</div>
      <p className="cv-note-body">
        Os limites geográficos deste loteamento não têm confirmação em cadastro
        oficial. O traçado exibido é aproximado — trate os dados associados
        como estimativas sujeitas a revisão.
      </p>
    </NoteCard>
  );
}
