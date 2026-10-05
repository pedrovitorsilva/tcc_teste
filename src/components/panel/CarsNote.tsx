'use client';

import { NoteCard } from '@/components/panel/NoteCard';
/** Contagem dos carros 3D; crédito do modelo fica em Models3DNote. */
export function CarsNote({ count, enabled }: { count: number; enabled: boolean }) {
  if (count === 0) return null;

  return (
    <NoteCard className={`${enabled ? "" : "hidden "}my-2 px-3 py-2`}>
      <p className="cv-note-body">
        <strong>{count.toLocaleString("pt-BR")} veículos</strong> animados.
      </p>
    </NoteCard>
  );
}
