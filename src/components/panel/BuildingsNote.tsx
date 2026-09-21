'use client';

import { NoteCard } from '@/components/panel/NoteCard';

/** Procedência das edificações 3D: o volume é sintético, e dizer isso importa mais que o efeito (§3). */
export function BuildingsNote({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <NoteCard className="pointer-events-none max-w-[min(420px,calc(100vw-36px))] px-3 py-2">
      <p className="cv-note-body">
        <strong>{count.toLocaleString('pt-BR')} edificações</strong> por detecção
        automática (Overture · Google Open Buildings · Microsoft ML). A altura
        exibida é volume genérico derivado da área construída — não é altura
        medida.
      </p>
    </NoteCard>
  );
}
