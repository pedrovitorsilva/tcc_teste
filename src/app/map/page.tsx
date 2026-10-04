import type { Metadata } from 'next';
import { MapView } from '@/components/MapView';

export const metadata: Metadata = {
  title: 'Mapa — Vitória da Conquista',
  description:
    'Mapa interativo de bairros, loteamentos e setores censitários. Explore a população estimada por loteamento em Vitória da Conquista.',
};

export default function MapPage() {
  return (
    <main className="w-full h-dvh">
      <MapView />
    </main>
  );
}
