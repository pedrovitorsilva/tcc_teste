//
"use client";

import { useRef, useState, type ReactNode } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";

/**
 * Painel acima do botão, alinhado à esquerda; em tablet e celular (< lg) fica
 * centralizado na horizontal da tela, logo acima da fileira de botões do mapa
 * (`bottom-4.5` + botão `h-11` + 8px, em MapView), com rolagem se não couber.
 */
export const PANEL_ABOVE_CENTERED_BELOW_LG =
  "bottom-[calc(100%+8px)] left-0 max-lg:fixed max-lg:bottom-[calc(1.125rem+2.75rem+8px)] max-lg:left-1/2 max-lg:-translate-x-1/2 max-lg:max-h-[calc(100dvh-1.125rem-2.75rem-8px-1rem)] max-lg:overflow-y-auto";

interface IconPopoverButtonProps {
  icon: ReactNode;
  ariaLabel: string;
  title: string;
  /**
   * Classe Tailwind usadas para posicionar o painel em relação ao botão.
   * Ex.: `bottom-[calc(100%+8px)] left-0`.
   */
  panelPosition: string;

  className?: string;
  children: ReactNode;
}

/**
 * Botão circular que abre um painel flutuante reutilizável.
 * Fecha ao clicar fora ou pressionar Escape.
 */
export function IconPopoverButton({
  icon,
  ariaLabel,
  title,
  panelPosition,
  className,
  children,
}: IconPopoverButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useClickOutside(rootRef, open, setOpen);

  return (
    <div
      ref={rootRef}
      className={`relative ${className ?? ""}`}
      onKeyDown={(event) => {
        // Fecha apenas o popover e impede o Escape de alcançar o MapView.
        if (event.key === "Escape") {
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={ariaLabel}
        aria-expanded={open}
        title={title}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-cv-border bg-panel text-ink-soft shadow-[0_4px_16px_rgba(0,0,0,.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {icon}
      </button>

      {open && <div className={`absolute ${panelPosition}`}>{children}</div>}
    </div>
  );
}
