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
  CircleDashed,
  PanelRightClose,
  PanelRightOpen,
  LocateFixed,
  Map as MapGlyph,
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
export const MapIcon = createIcon(MapGlyph);
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

/** Geometria aproximada: tracejado, como o contorno do loteamento incerto no mapa. */
export const IncertoIcon = createIcon(CircleDashed);

// Controles da ficha.
export const RecolherIcon = createIcon(PanelRightClose);
export const MostrarFichaIcon = createIcon(PanelRightOpen);
export const CentralizarIcon = createIcon(LocateFixed);

/**
 * Marca do projeto: globo sem o quarto superior direito, com o arco, a cruz e a
 * joia da bandeira de Vitória da Conquista. Mesmos traços de src/app/icon.svg.
 */
export const AtlasVdcLogo = (props: ComponentProps<'svg'>) => (
  <svg viewBox="166 259 648 644" fill="none" stroke="currentColor" aria-hidden="true" {...props}>
    <g strokeWidth={25}>
      <path d="M490 283A298 298 0 1 0 788 581H490Z" />
      <path d="M490 581V879" />
      <path d="M192 581H490" />
      <path d="M490 283A137 298 0 0 0 490 879A137 298 0 0 0 627 581" />
      <path d="M260 392Q379 434 490 434" />
      <path d="M260 770Q490 688 720 770" />
    </g>
    <g transform="translate(515.3 277.3) scale(1.814)" strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 34C22 16 62 16 73 34" />
      <path d="M10 23L42 50L74 23" />
      <path d="M42 3V56" />
      <path d="M35 10L42 2L49 10" />
      <path d="M35 62L42 55L49 62" />
    </g>
    <path
      transform="translate(656.6 275) scale(2.094)"
      fill="currentColor"
      stroke="none"
      d="M8.5 57Q23.5 45 34 37V17H28V8H34V0H43V8H50V17H43V37Q53.5 45 68.5 57Z"
    />
    <g transform="translate(611 425.4) scale(2.926)" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 0.5H21L27.5 8V31L21 38.5H7L0.5 31V8Z" strokeWidth={4} />
      <path d="M7 8H21V31H7Z" />
      <path d="M7 0.5V8H0.5M21 0.5V8H27.5M7 38.5V31H0.5M21 38.5V31H27.5" />
    </g>
  </svg>
);
