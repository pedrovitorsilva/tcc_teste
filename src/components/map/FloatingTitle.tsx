'use client';

import type { FloatingTitleState } from '@/types/map';

export function FloatingTitle({ state }: { state: FloatingTitleState | null }) {
  return (
    <div
      className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center transition-opacity duration-200"
      style={{ opacity: state ? 1 : 0 }}
    >
      <div className="cv-crumb">{state?.crumb ?? ''}</div>
      <div className="cv-title mt-px text-ink">{state?.main ?? ''}</div>
    </div>
  );
}
