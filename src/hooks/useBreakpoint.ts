'use client';

import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

// Aligned to Tailwind standard breakpoints (md=768px, lg=1024px):
// <768px mobile, 768–1024px tablet, ≥1024px desktop.
function resolveBreakpoint(width: number): Breakpoint {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export function useBreakpoint(): Breakpoint {
  // Default "desktop" on first render (SSR-safe); corrects on client immediately
  // after mounting, before any user interaction.
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const update = () => setBreakpoint(resolveBreakpoint(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return breakpoint;
}
