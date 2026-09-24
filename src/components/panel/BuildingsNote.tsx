'use client';

import { NoteCard } from '@/components/panel/NoteCard';

/** Procedência das edificações 3D: o volume é sintético, e dizer isso importa mais que o efeito (§3). */
export function BuildingsNote({ count, enabled }: { count: number; enabled: boolean }) {
  if (count === 0) return null;

  return (
    <NoteCard className={`${enabled ? '' : 'hidden '}pointer-events-none max-w-[min(420px,calc(100vw-36px))] my-10 px-3 py-2`}>
      <p className="cv-note-body">
        <strong>{count.toLocaleString('pt-BR')} edificações</strong> por detecção
        automática (Overture · Google Open Buildings · Microsoft ML). Altura
        dos prédios não reflete necessariamente a realidade.
      </p>
    </NoteCard>
  );
}
