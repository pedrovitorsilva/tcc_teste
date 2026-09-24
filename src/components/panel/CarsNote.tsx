'use client';

import { NoteCard } from '@/components/panel/NoteCard';
/** Procedência das edificações 3D: o volume é sintético, e dizer isso importa mais que o efeito (§3). */
export function CarsNote({ count, enabled }: { count: number; enabled: boolean }) {
  if (count === 0) return null;

  return (
    <NoteCard className={`${enabled ? "" : "hidden "}max-w-[min(420px,calc(100vw-36px))] my-10 px-3 py-2`}>
      <p className="cv-note-body">
        <strong>{count.toLocaleString("pt-BR")} veículos</strong> animados.
        Baseado em{" "}
        <a
          href="https://sketchfab.com/3d-models/free-low-poly-vehicles-pack-cb7640039e7a40679a53be705ebff50e"
          target="_blank"
          rel="noreferrer"
        >
          Free Low Poly Vehicles Pack
        </a>
        , por{" "}
        <a href="https://sketchfab.com/rgsdev" target="_blank" rel="noreferrer">
          RgsDev
        </a>
        , com a licença{" "}
        <a
          href="http://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC-BY-4.0
        </a>
        .
      </p>
    </NoteCard>
  );
}
