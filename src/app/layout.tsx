import type { Metadata } from "next";
import { Cormorant_Garamond, EB_Garamond } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

// Fonts are loaded with the next/font/google module, which optimizes performance and ensures they are only loaded once.
// The `variable` option allows us to define a CSS variable that can be used in our stylesheets to apply the font family.
const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cadastro Vivo",
  description:
    "Descubra de onde vem a população do seu quarteirão. Um mapa interativo que desagrega dados do IBGE em loteamentos — o pedaço da cidade onde você realmente mora.",
};

  
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Anti-FOUC (Flash of Unstyled Content): aplica o tema antes da hidratação,
  // pra não piscar o tema errado. Reimplementa manualmente a mesma lógica de
  // `isThemeName`/`applyTheme` (src/lib/color/theme.ts) porque roda antes do
  // bundle JS carregar — não pode importar o módulo. Mudar uma lógica exige
  // replicar a mudança na outra.

  const antiFlashScript = `( 
    function () {
      try {
        var s = window.localStorage.getItem('cadastro-vivo-theme');
        var t = (s==='light'||s==='dark'||s==='vintage') ? s:'light';
        var r = document.documentElement; 
        r.dataset.theme = t;
        r.classList.remove('light','dark');
        r.classList.add(t==='dark'?'dark':'light');
          }
      catch(e){
        }
    })();`;


  return (
    <html
      lang="pt-BR"
      data-theme="light"
      className={`${cormorantGaramond.variable} ${ebGaramond.variable} light`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: antiFlashScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
