'use client';

import { NoteCard } from '@/components/panel/NoteCard';

/** Procedência dos postes 3D: posição sintetizada das vias do OSM + crédito CC-BY do modelo. */
export function StreetLampsNote({ enabled }: { enabled: boolean }) {
  return (
    <NoteCard className={`${enabled ? '' : 'hidden '}max-w-[min(420px,calc(100vw-36px))] my-10 px-3 py-2`}>
      <p className="cv-note-body">
        <strong>Postes de rua</strong> posicionados a partir das vias do{' '}
        <a href="https://openstreetmap.org" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>
        . Modelo 3D baseado em{' '}
        <a
          href="https://sketchfab.com/3d-models/low-poly-street-light-bf960763cd58472eb444e2d4875ca474"
          target="_blank"
          rel="noreferrer"
        >
          Low Poly Street Light
        </a>
        , por{' '}
        <a href="https://sketchfab.com/Fridqeir" target="_blank" rel="noreferrer">
          Fridqeir
        </a>
        , com a licença{' '}
        <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC-BY-4.0
        </a>
        .
      </p>
    </NoteCard>
  );
}
