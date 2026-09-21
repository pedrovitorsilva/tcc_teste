import type { ComponentType, SVGProps } from 'react';
import type { LucideIcon } from "lucide-react";
import {
  X,
  Search,
  Layers,
  GripHorizontal,
  Sun,
  Moon,
  Palette,
  ScrollText,
  Building2,
} from 'lucide-react';

/** Envolve um ícone lucide-react com o stroke fino padrão do projeto. */
// function createIcon(Icon: ComponentType<SVGProps<SVGSVGElement>>) {
//   return function WrappedIcon(props: SVGProps<SVGSVGElement>) {
//     return <Icon strokeWidth={1.6} aria-hidden="true" {...props} />;
//   };
// }
const createIcon =
  (Icon: LucideIcon) => (props: React.ComponentProps<LucideIcon>) => (
    <Icon strokeWidth={1.6} aria-hidden="true" {...props} />
  );


export const CloseIcon = createIcon(X);
export const SearchIcon = createIcon(Search);
export const LayersIcon = createIcon(Layers);
export const DragHandleIcon = createIcon(GripHorizontal);
export const SunIcon = createIcon(Sun);
export const MoonIcon = createIcon(Moon);
export const PaletteIcon = createIcon(Palette);
export const ScrollIcon = createIcon(ScrollText);
export const BuildingIcon = createIcon(Building2);
