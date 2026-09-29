import { CtaButton } from './CtaButton';

// Sem estado/JS: animação só com motion-safe (respeita prefers-reduced-motion).
export function StickyMobileCta() {
  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center border-b border-cv-border-soft bg-page/95 p-2 backdrop-blur md:hidden">
      <CtaButton text="Explorar o mapa" href="/map" className="w-full motion-safe:transition-transform motion-safe:active:scale-95" />
    </div>
  );
}
