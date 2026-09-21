'use client';

import { useEffect, type RefObject } from 'react';

/** Fecha um popover ao clicar fora do elemento referenciado, só enquanto `active`. */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  setOpen: (open: boolean) => void
) {
  useEffect(() => {
    if (!active) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [active, ref, setOpen]);
}
