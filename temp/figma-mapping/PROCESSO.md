# Como gerar as pranchas de referência para o Figma

Processo usado para gerar `01-colors.png` … `05-interactions.png`. Nenhuma
ferramenta aqui escreve no Figma — o resultado é sempre um PNG anotado para
recriar manualmente lá (Color Styles, Text Styles, frames).

## Pré-requisitos

- Fonte da verdade: `src/app/globals.css` (tokens de cor + classes `.cv-*`) e
  `src/app/layout.tsx` (fontes via `next/font`). Ler esses dois arquivos
  primeiro sempre — se algo mudou lá, as pranchas 01/02 ficam desatualizadas.
- Servidor local para as capturas: **nunca** com `npm run dev` (regra do
  projeto — pedir ao usuário para subir e confirmar). Só depois disso usar
  Playwright contra `localhost:3000`.
- Um servidor HTTP estático próprio para as páginas HTML de composição (o
  Playwright MCP bloqueia `file://`): `python -m http.server <porta> -d
  temp/figma-mapping` em background, matar no final.

## 01 / 02 — cores e tipografia (não depende do dev server)

1. Copiar os valores exatos de `--page`, `--panel`, `--ink`, `--bairro`,
   `--loteamento`, `--setor`, `--building`, `--uncertain`, etc. dos 3 blocos
   de tema (`[data-theme="light"|"dark"|"vintage"]`) para um HTML estático
   com swatches (cor de fundo = valor do token, rótulo = nome + hex/rgba).
2. Mesma lógica para as classes `@layer components` (`.cv-title`, `.cv-h2`,
   `.cv-crumb`, `.cv-kicker`, `.cv-rec-row`, `.cv-sec-title`,
   `.cv-note-title`, `.cv-note-body`) — um `<link>` pro Google Fonts com as
   mesmas famílias/pesos do `layout.tsx` (Cormorant Garamond, EB Garamond).
3. Abrir cada HTML pelo servidor estático e `browser_take_screenshot`
   (`fullPage: true`).

## 03 / 04 — decomposição visual de componentes (precisa do dev server)

1. Pedir para o usuário subir `npm run dev` e confirmar.
2. Resolver o viewport (`browser_resize`) — 1440×900 para desktop, 390×844
   para mobile — **antes** de navegar (recarregar depois de redimensionar,
   senão o `BottomSheet` calcula os snap points errado).
3. Chegar num estado com a lista repetida visível: usar a `SearchBox`
   (digitar um nome de bairro com `browser_type`, **sempre em página recém-
   carregada** — reusar o campo depois de outras interações às vezes não
   dispara o dropdown; mais simples recarregar a página do que depurar) e
   clicar na opção. Em mobile, clicar em "Expandir ficha" e esperar ~1s
   (a transição do BottomSheet não é instantânea).
4. Tirar o screenshot bruto (`browser_take_screenshot`, sem `fullPage`).
5. **Pegar as coordenadas exatas**: `browser_snapshot({ boxes: true })` no
   mesmo estado retorna `[box=x,y,w,h]` de cada elemento em px de viewport —
   não adivinhar posição pela imagem, usar esses valores direto.
6. Montar um HTML que embute o screenshot como `<img>` de fundo (tamanho
   natural do viewport) com `<div>` absolutos usando as boxes coletadas:
   borda colorida + rótulo. Cores usadas: magenta = shell/regiões de topo,
   verde = subseção, laranja = componente individual, azul tracejado =
   "repeating component". Dar `padding` no wrapper da página (~46px no topo)
   para rótulos que ficam *acima* de uma box no canto (0,0) não serem
   cortados pela borda da página.
7. Screenshot final com `fullPage: true`.

## 05 — exemplos de interação

Reaproveitar screenshots brutos dos passos 03/04 (ex.: mapa sem seleção vs.
com seleção) e capturar pares extra específicos: tema claro/escuro (clicar
no botão de tema, esperar ~1s), popover fechado/aberto (clicar no ícone),
dropdown da busca vazio/com resultados. Montar um HTML em grid — uma linha
por padrão de interação, duas miniaturas (`height` fixo, `width: auto`) +
texto curto do que dispara a transição — e tirar um único screenshot
`fullPage: true`.

## Depois de gerar

1. Ler os PNGs finais com `Read` para inspeção visual antes de entregar.
2. Apagar HTMLs e screenshots brutos de `temp/figma-mapping/` — só os 5 PNGs
   finais (e este `.md`) devem sobrar.
3. Matar o servidor HTTP estático e fechar o browser do Playwright.
4. Entregar com `SendUserFile`.
