import type { ReactNode } from 'react';

export function Figure({
  'aria-label': label, figcaption, children,
}: {
  'aria-label': string;
  figcaption?: string;
  children: ReactNode;
}) {
  return (
    <figure role="img" aria-label={label} className="my-8">
      {children}
      {figcaption && (
        <figcaption className="mt-4 text-center text-sm text-ink-soft">{figcaption}</figcaption>
      )}
    </figure>
  );
}
