"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { IconPopoverButton } from "../IconPopoverButton";
import { ThemeSwitcher, THEME_ICONS } from "./ThemeSwitcher";
import { THEME_LABELS } from "@/lib/color/theme";

/**
 *
 * Colapsa icones de mudar tema num único botão que abre um pequeno menu com o seletor completo.
 * Para telas mobile (<768px).
 */
export function ThemeSwitcherPopoverButton({
  className,
}: {
  className?: string;
}) {
  const { theme } = useTheme();
  const Icon = THEME_ICONS[theme];

  return (
    <IconPopoverButton
      icon={<Icon className="h-4 w-4" />}
      ariaLabel={`Tema: ${THEME_LABELS[theme]}. Trocar tema`}
      title="Trocar tema"
      panelPosition="top-[calc(100%+8px)] right-0"
      className={className}
    >
      <ThemeSwitcher />
    </IconPopoverButton>
  );
}
