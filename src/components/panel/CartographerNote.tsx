import { NoteCard } from '@/components/panel/NoteCard';

export function CartographerNote() {
  return (
    <NoteCard className="mb-4.5 p-3">
      <div className="cv-note-title mb-1">✎ Nota do Cartógrafo</div>
      <p className="cv-note-body">
        Limites aproximados, sem confirmação em cadastro oficial. Os números
        abaixo podem mudar quando o traçado for revisto.
      </p>
    </NoteCard>
  );
}
