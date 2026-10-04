'use client';

import { NoteCard } from '@/components/panel/NoteCard';

/** Procedência dos postes 3D: posição sintetizada das vias do OSM; crédito do modelo fica em Models3DNote. */
export function StreetLampsNote({ enabled }: { enabled: boolean }) {
  return (
    <NoteCard className={`${enabled ? '' : 'hidden '}max-w-[min(420px,calc(100vw-36px))] my-10 px-3 py-2`}>
      <p className="cv-note-body">
        <strong>Postes de rua</strong> posicionados a partir das vias do{' '}
        <a href="https://openstreetmap.org" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>
        .
      </p>
    </NoteCard>
  );
}
