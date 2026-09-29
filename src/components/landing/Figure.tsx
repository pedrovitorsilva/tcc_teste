import type { ReactNode } from 'react';

export function Figure({
  'aria-label': label, figcaption, children,
}: {
  'aria-label': string;
  figcaption?: string;
  children: ReactNode;
}) {
  return (
    <figure role="img" aria-label={label} >
      <div className="overflow-hidden rounded-2xl bg-panel-2 p-4">{children}</div>
      {figcaption && (
        <figcaption className="mt-4 text-center text-sm text-ink-soft">{figcaption}</figcaption>
      )}
    </figure>
  );
}
