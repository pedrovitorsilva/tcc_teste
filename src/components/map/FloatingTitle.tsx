'use client';

import type { FloatingTitleState } from '@/types/map';

export function FloatingTitle({ state }: { state: FloatingTitleState | null }) {
  return (
    <div
      className="pointer-events-none min-w-0 flex-1 transition-opacity duration-200"
      style={{ opacity: state ? 1 : 0 }}
    >
      <div className="cv-crumb">{state?.crumb ?? ''}</div>
      <div className="truncate text-[15px] font-semibold text-ink">{state?.main ?? ''}</div>
    </div>
  );
}
