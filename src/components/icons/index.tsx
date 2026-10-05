import type { ComponentProps, ComponentType } from 'react';
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
  Building,
  Building2,
  Trees,
  Waves,
  Car,
  UtilityPole,
  PersonStanding,
  House,
  Toilet,
  BookA,
  School,
  BadgePercent,
  Dam,
  Bath,
  WavesArrowDown,
  Trash2,
  BookX,
  GraduationCap,
  BriefcaseBusiness,
  HandCoins,
  Armchair,
  Wifi,
  BusFront,
  PlaneLanding,
  Accessibility,
} from 'lucide-react';
import { MdOutlineFamilyRestroom } from 'react-icons/md';
import { DollarCircleSolid, Neighbourhood, Pipe3d, Planimetry } from 'iconoir-react';

/** Envolve um ícone lucide-react com o stroke fino padrão do projeto. */
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
export const VegetationIcon = createIcon(Trees);
export const WaterIcon = createIcon(Waves);
export const CarIcon = createIcon(Car);
export const LampIcon = createIcon(UtilityPole);

/** Mesmo traço fino para os ícones do iconoir (os "Solid" são preenchidos e o ignoram). */
type IconoirIcon = ComponentType<ComponentProps<typeof Neighbourhood>>;
const createIconoir =
  (Icon: IconoirIcon) => (props: ComponentProps<IconoirIcon>) => (
    <Icon strokeWidth={1.6} aria-hidden="true" {...props} />
  );

// Títulos das seções da ficha.
export const LoteamentosIcon = createIconoir(Neighbourhood);
export const PopulacaoIcon = createIcon(PersonStanding);
export const DomiciliosIcon = createIcon(House);
export const SaneamentoIcon = createIcon(Toilet);
export const AlfabetizacaoIcon = createIcon(BookA);
export const RendaIcon = createIconoir(DollarCircleSolid);
export const EscolasIcon = createIcon(School);
export const EnderecosIcon = createIcon(Building2);
export const AreaPonderacaoIcon = createIconoir(Planimetry);
export const QualidadeIcon = createIcon(BadgePercent);

// Subtítulos dentro das seções da ficha.
/** Material Symbols `family_restroom` (react-icons não aceita strokeWidth). */
export const FaixaEtariaIcon = (props: ComponentProps<typeof MdOutlineFamilyRestroom>) => (
  <MdOutlineFamilyRestroom aria-hidden="true" {...props} />
);
export const TipoDomicilioIcon = createIcon(Building);
export const AguaAbastecimentoIcon = createIcon(Dam);
export const AguaCanalizadaIcon = createIconoir(Pipe3d);
export const BanheiroIcon = createIcon(Bath);
export const EsgotoIcon = createIcon(WavesArrowDown);
export const LixoIcon = createIcon(Trash2);
export const ForaEscolaIcon = createIcon(BookX);
export const EducacaoIcon = createIcon(GraduationCap);
export const TrabalhoIcon = createIcon(BriefcaseBusiness);
export const RendaApIcon = createIcon(HandCoins);
export const MoradiaIcon = createIcon(Armchair);
export const InternetIcon = createIcon(Wifi);
export const MobilidadeIcon = createIcon(BusFront);
export const MigracaoIcon = createIcon(PlaneLanding);
export const AcessibilidadeIcon = createIcon(Accessibility);
