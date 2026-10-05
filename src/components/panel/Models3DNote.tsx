'use client';

import { NoteCard } from '@/components/panel/NoteCard';
import { CAR_TYPES } from '@/config/cars';

/** Créditos dos modelos 3D de terceiros (carros e postes), com a licença CC-BY citada uma vez. */
export function Models3DNote({ enabled }: { enabled: boolean }) {
  return (
    <NoteCard className={`${enabled ? '' : 'hidden '}my-2 px-3 py-2`}>
      <p className="cv-note-body">
        <strong>3D</strong>
        <br />
        Carros:{' '}
        <a
          href="https://sketchfab.com/3d-models/free-low-poly-vehicles-pack-cb7640039e7a40679a53be705ebff50e"
          target="_blank"
          rel="noreferrer"
        >
          {CAR_TYPES.join(', ')}
        </a>{' '}
        por{' '}
        <a href="https://sketchfab.com/rgsdev" target="_blank" rel="noreferrer">
          RgsDev
        </a>
        <br />
        Postes:{' '}
        <a
          href="https://sketchfab.com/3d-models/low-poly-street-light-bf960763cd58472eb444e2d4875ca474"
          target="_blank"
          rel="noreferrer"
        >
          &ldquo;Low Poly Street Light&rdquo;
        </a>{' '}
        por{' '}
        <a href="https://sketchfab.com/Fridqeir" target="_blank" rel="noreferrer">
          Fridqeir
        </a>
        <br />
        Licença:{' '}
        <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC-BY-4.0
        </a>
      </p>
    </NoteCard>
  );
}
