# Cadastro Vivo — Arquitetura do código e pontos de melhoria

> Documento vivo. Descreve a estrutura atual do código, a ordem em que as
> peças carregam na página, e uma lista de melhorias sugeridas seguindo as
> práticas do Next.js App Router — sem mudar o resultado final que o usuário
> vê. Não é o mesmo documento que `CLAUDE.md` cita como `ARQUITETURA-ATUAL.md`
> (esse arquivo não existe neste checkout); este aqui tem escopo mais restrito:
> estrutura de código + ordem de carregamento + plano de melhoria técnica.

**Status do projeto: MVP.** Vários pontos abaixo (seção "Dados mockados")
existem propositalmente como placeholders até a aplicação ganhar um banco de
dados real. Eles não devem ser removidos agora — só documentados, para que a
troca futura seja localizada e barata.

---

## 1. Estrutura de diretórios

```
src/
├── app/
│   ├── layout.tsx        # Layout raiz (server): fontes, metadata, script anti-FOUC, <ThemeProvider>
│   ├── page.tsx           # Única rota ("/"), server, renderiza <MapView>
│   └── globals.css        # Tailwind v4 (CSS-first) + design tokens dos 3 temas
├── components/
│   ├── MapView.tsx         # Orquestrador: estado da página inteira, monta mapa + toda a UI flutuante
│   ├── SearchBox.tsx        # Busca em bairros+loteamentos
│   ├── IconPopoverButton.tsx  # Shell compartilhado dos popovers de theme/ e layers/
│   ├── map/                 # Renderização no/sobre o mapa
│   │   ├── MapLayers.tsx        # Fontes/camadas MapLibre de bairro/loteamento/setor
│   │   ├── Buildings3D.tsx      # Fonte PMTiles da Overture + extrusões 3D dos prédios
│   │   ├── FloatingPolygonLabel.tsx / FloatingTitle.tsx  # Os dois modos (mutuamente exclusivos) de rótulo
│   │   └── TitlePlacementToggle.tsx  # Alterna entre os dois modos acima
│   ├── panel/                # Sidebar (desktop) / bottom sheet (mobile) + conteúdo compartilhado
│   │   ├── Sidebar.tsx / BottomSheet.tsx  # Ambos renderizam FeatureDetails
│   │   └── FeatureDetails.tsx / CartographerNote.tsx / BuildingsNote.tsx / NoteCard.tsx
│   ├── theme/                # Tema + paleta de cores
│   │   ├── ThemeProvider.tsx    # Único Context da aplicação (tema + override de paleta)
│   │   ├── ThemeSwitcher(.tsx|Popover.tsx)
│   │   └── PaletteControls.tsx / PalettePopover.tsx
│   ├── layers/                # Visibilidade das camadas administrativas
│   │   └── LayerControls.tsx / LayerControlsPopover.tsx
│   ├── icons/               # Wrappers finos sobre lucide-react
│   └── ui/map.tsx           # VENDORED (registry mapcn) — não editar, ver CLAUDE.md
├── hooks/
│   ├── useGeoIndex.ts        # Busca bairros+loteamentos e monta índice de busca
│   ├── useThemeTokens.ts     # Lê os custom properties CSS resolvidos (para o MapLibre)
│   ├── useBreakpoint.ts
│   └── useClickOutside.ts
├── lib/
│   ├── utils.ts                   # `cn` (re-export do pacote `cn`)
│   ├── color/                     # Tema ativo + paleta + matemática de cor
│   │   ├── theme.ts / palette.ts      # Persistência de tema + presets/override de cor
│   │   └── oklab.ts                   # Conversão sRGB↔OKLab + parser de cor CSS
│   └── map/                       # Suporte ao MapLibre
│       ├── bbox.ts / buildingClip.ts / hachurePattern.ts / polygonLabel.ts / pmtilesProtocol.ts
│       └── tint.ts                    # Tingimento OKLab do basemap CARTO
├── config/
│   ├── levels.ts       # LEVELS (bairro/loteamento/setor): urls, ids, cores, tooltips
│   └── buildings.ts    # Fonte PMTiles da Overture, zoom mínimo, constantes de extrusão
└── types/map.ts        # Tipos de domínio compartilhados

public/data/               # bairros.geojson, loteamentos.geojson, setores.geojson (servidos estaticamente)
neatogeo_Bairros.geojson, neatogeo_Loteamentos.geojson   # fonte bruta na raiz do repo
scripts/prepare-data.mjs   # gera public/data/{bairros,loteamentos}.geojson (npm run prepare-data)
temp/                      # scratch da sessão (screenshots, testes) — ver CLAUDE.md
```

Não há `src/app/api/**` — zero rotas de API. Não há banco de dados, nem
biblioteca de estado externa (Redux/Zustand/Jotai) — só `useState`/Context do
React.

---

## 2. Ordem de carregamento — "quem carrega o quê"

### 2.1 Primeira pintura (server → hidratação)

1. **`layout.tsx`** (server component) roda primeiro: importa `globals.css`
   (então os tokens de tema/Tailwind já existem antes de qualquer HTML),
   carrega as fontes (`next/font/google`), define `metadata` e renderiza
   `<html data-theme="light" class="... light">` com um `<script
   dangerouslySetInnerHTML>` inline no `<head>` — esse script roda **antes da
   hidratação** e corrige `data-theme`/classe a partir do `localStorage`, pra
   evitar flash de tema errado.
2. **`page.tsx`** (server) renderiza `<main><MapView /></main>` — nesse ponto
   o HTML enviado ainda não tem mapa nenhum, só a casca.
3. React hidrata. `<ThemeProvider>` (único Context da app, montado em
   `layout.tsx`) assume o estado de tema (que default para `'light'` no
   server e é corrigido no client via `useEffect`) e do override de paleta
   (sempre `{}` no boot — não persiste).
4. **`MapView`** (`'use client'`, é o primeiro Client Component da árvore —
   tudo abaixo dele é client) monta. É aqui que a aplicação de fato começa:
   busca o índice de busca (`useGeoIndex`, fetch client-side de
   `/data/bairros.geojson` + `/data/loteamentos.geojson`), resolve os tokens
   de cor do tema ativo (`useThemeTokens`), monta/tinge o estilo do basemap
   (`useMapStyles` → busca o style JSON da CARTO e tinge em OKLab) e decide o
   breakpoint (`useBreakpoint`).

### 2.2 Bootstrap do mapa (dentro de `MapView`)

5. **Efeito colateral em module-scope** (roda no import do módulo, antes de
   qualquer render): `MapView.tsx` chama `ensurePMTilesProtocol()`, que
   registra o protocolo `pmtiles://` no MapLibre. Precisa acontecer antes do
   `new maplibregl.Map(...)`, senão a fonte de prédios (Overture) não resolve
   a URL.
6. `<Map>` (componente vendored em `ui/map.tsx`) constrói a instância real do
   MapLibre num `useEffect` que roda uma vez. Ele só renderiza os `children`
   depois que a instância existe, e só expõe `isLoaded=true` (via
   `MapContext`) depois que **dois** eventos disparam: `load` do mapa e
   `style.load` completo.
7. Só então montam, como irmãos: **`MapLayers`** (cria fontes/camadas de
   bairro → loteamento → setor a partir das URLs estáticas em
   `config/levels.ts`) e **`Buildings3D`** (cria a fonte PMTiles da Overture +
   a camada de extrusão, com um recorte calculado sob demanda). Ambos esperam
   `isLoaded` de forma independente — não há dependência um do outro — e
   `MapLayers` vem primeiro na árvore JSX, mas isso não importa
   funcionalmente.
8. Trocar de tema recarrega o *style* inteiro do MapLibre
   (`setStyle(..., { diff: false })`), o que apaga fontes/camadas
   customizadas — por isso `isLoaded` cai e sobe de novo, e os efeitos de
   `MapLayers`/`Buildings3D` recriam tudo do zero a cada troca de tema.

### 2.3 Diagrama resumido

```
layout.tsx (server)
 └─ globals.css (tokens + Tailwind)
 └─ script anti-FOUC (pré-hidratação)
 └─ ThemeProvider (Context único)
     └─ page.tsx (server) → <MapView> (primeiro client boundary)
         ├─ module load: ensurePMTilesProtocol()
         ├─ hooks: useGeoIndex (fetch), useThemeTokens, useMapStyles (fetch+tint), useBreakpoint
         └─ <Map> (vendored, cria a instância MapLibre)
             └─ on 'load' + 'style.load' → isLoaded = true
                 ├─ MapControls
                 ├─ MapLayers        (fontes/camadas bairro/loteamento/setor)
                 ├─ Buildings3D      (fonte PMTiles + extrusão 3D)
                 └─ FloatingPolygonLabel
         + UI flutuante irmã do <Map>: SearchBox, ThemeSwitcher(Popover),
           PalettePopover, LayerControlsPopover, FloatingTitle, BuildingsNote,
           TitlePlacementToggle, Sidebar (desktop) | BottomSheet (mobile)
```

---

## 3. Fluxo de dados e **dados mockados** (⚠️ ler antes de mexer)

Hoje **não existe backend nem banco de dados** — tudo é arquivo estático ou
serviço público de terceiros:

| Peça | O que é | Status |
|---|---|---|
| `neatogeo_Bairros.geojson`, `neatogeo_Loteamentos.geojson` (raiz) | Export bruto de origem externa ("Neatogeo") | Fonte, mantida no repo |
| `scripts/prepare-data.mjs` (`npm run prepare-data`, manual) | Normaliza geometrias, calcula `parentBairro` por área de interseção (`@turf`), e **gera um campo sintético `is_reliable`** (1 a cada 6 loteamentos, determinístico) | **MOCK explícito** — o comentário no próprio script já avisa que não existe ainda um campo real de confiabilidade |
| `public/data/bairros.geojson`, `public/data/loteamentos.geojson` | Saída do script acima | Gerado, versionado |
| `public/data/setores.geojson` | Mantido à mão, sem script de geração (fonte bruta não faz mais parte do projeto) | Estático |
| `src/lib/map/buildingClip.ts` | Altura de prédio **sintética** (fórmula própria, não vem de nenhum dado real) | **MOCK explícito** |
| `useGeoIndex.ts` | `fetch('/data/bairros.geojson')` + `fetch('/data/loteamentos.geojson')` no mount, monta índice de busca em memória | Client-side fetch |
| `MapLayers.tsx` via `config/levels.ts` | MapLibre busca **de novo**, direto, as mesmas URLs (`/data/bairros.geojson` etc.) para desenhar as camadas | Client-side fetch (duplicado com o de cima) |
| Estilo do basemap (CARTO) | `fetch` client-side de `basemaps.cartocdn.com/...style.json`, tingido em OKLab | Serviço público real, não mockado |
| Prédios 3D (Overture) | `pmtiles://...s3.../buildings.pmtiles`, HTTP range requests | Serviço público real, não mockado |

**Ponto de atenção para o futuro:** `bairros.geojson` e `loteamentos.geojson`
são buscados **duas vezes** de origens diferentes (uma vez pelo hook, uma vez
pelo MapLibre) — isso é tratado na seção de melhorias (4.2).

Quando o banco de dados real chegar, a expectativa é que **`scripts/`, os
`neatogeo_*.geojson` da raiz e os mocks citados acima saiam** do projeto —
mas até lá eles continuam a única fonte de dados e não devem ser apagados.

---

## 4. Pontos de melhoria (Next.js App Router)

Todos os itens abaixo **preservam o resultado final visível** — são mudanças
de onde/como o trabalho é feito, não do que a página mostra. Cada um segue
uma prática documentada das skills `nextjs-anti-patterns` /
`nextjs-advanced-routing`. **Revisado após debate entre dois agentes** (ver
seção 6) — o veredito de cada item já reflete a conclusão do debate, não só
a proposta original.

### 4.1 Buscar o GeoJSON em Server Component, não em `useEffect`/hook client

> **Veredito pós-debate: 🔴 Adiado.** Ganho real, mas estreito e não urgente
> — ver seção 6.

**Hoje:** `useGeoIndex.ts` faz `fetch()` client-side no mount para montar o
índice de busca — é o padrão clássico "`useEffect` + `useState` para dados do
servidor", que a skill `nextjs-anti-patterns` lista como anti-pattern
(Categoria 1.2 / 2.1).

**Proposta original:** `page.tsx` vira um Server Component `async` que lê os
arquivos de `public/data/*.geojson` diretamente e passa o resultado como prop
inicial para `MapView`.

**Por que foi adiado:** `MapView` é `'use client'` da raiz pra baixo, e a
pintura visível dos polígonos depende do carregamento do estilo CARTO e dos
eventos `load`/`style.load` do MapLibre — nenhum dos dois fica mais rápido
com essa mudança. O ganho real é mais estreito do que a proposta original
descrevia: eliminar a janela de array vazio em que `SearchBox`/`Sidebar`
ficam mudos, e trocar uma requisição HTTP por uma leitura de disco. Contra
isso pesa um risco concreto: `page.tsx` hoje não tem nenhuma API dinâmica
(`cookies()`/`headers()`), então o Next tende a renderizar a rota
estaticamente — sem `export const dynamic = 'force-dynamic'` (ou
equivalente) explícito, uma rodada de `npm run prepare-data` sem rebuild
passaria a servir dado velho pra **todo mundo**, não só pra quem tinha cache
de navegador (que é o pior caso hoje). Combinado com o histórico já
documentado em `CLAUDE.md` de `.next` corrompido/`EPERM` neste ambiente
Windows, isso é um risco real, não hipotético.

**Quando reconsiderar:** quando a leitura de dado passar a ser uma consulta a
banco de verdade (seção 4.3) — aí a diferença entre disco local e rede passa
a ter latência real para justificar o cuidado extra, e a decisão de
renderização dinâmica pode ser tomada junto, documentada na mesma mudança.

### 4.2 Eliminar o fetch duplicado de bairros/loteamentos

> **Veredito pós-debate: ✅ Aceito — prioridade mais alta da lista, e não
> depende de 4.1.** **Implementado** — `useGeoIndex` expõe o GeoJSON bruto
> (`bairrosData`/`loteamentosData`) além do índice derivado, com
> `try`/`catch` no fetch; `MapView` repassa esses dados para `MapLayers`, que
> cria as sources de bairro/loteamento com um `FeatureCollection` vazio e as
> preenche via `setData()` num efeito separado assim que o fetch resolve.
> `setores.geojson` continua por URL, sem mudança.

**Hoje:** os mesmos dois arquivos são buscados duas vezes — uma por
`useGeoIndex.ts:54-55` (client-side, `Promise.all(fetch(...))`), outra
porque `MapLayers.tsx` passa a **URL** (`LEVEL.url` de `config/levels.ts`)
para `map.addSource(..., { type: 'geojson', data: url })`, e o MapLibre faz o
fetch dele mesmo. `setores.geojson` (1.9 MB, sem índice de busca associado)
não tem esse problema e fica de fora, de propósito.

**Proposta (refinada no debate):** não depende do Server Component de 4.1 —
dá pra fazer inteiramente client-side. `MapView` passa a deter o resultado
do `fetch` que hoje já existe em `useGeoIndex`, e repassa o objeto
`FeatureCollection` já resolvido para `MapLayers` (MapLibre aceita `data:
FeatureCollection` diretamente, não só URL) em vez de repassar a URL.

**O que essa mudança custa de verdade** (o motivo de não ser um one-liner):
- O efeito que cria as fontes/camadas em `MapLayers.tsx` roda hoje só com
  `[map, isLoaded]` como dependência — ele não espera dado nenhum, porque é
  o próprio MapLibre que busca a URL, no tempo dele. Se o `fetch` do
  `useGeoIndex` ainda não resolveu quando `isLoaded` vira `true`, o efeito
  precisa de uma proteção (não criar a fonte com dado vazio) e uma chamada
  `setData()` de acompanhamento quando o dado chegar depois — isso é código
  novo, não só trocar o valor passado.
- `useGeoIndex.ts` hoje não tem `try`/`catch` no `Promise.all(...fetch...)` —
  uma falha deixa `loading: true` pra sempre, sem erro visível. Isso hoje é
  mascarado porque o fetch independente do MapLibre normalmente ainda
  consegue desenhar os polígonos mesmo se o do hook falhar. Ao remover essa
  duplicação, esse "acidente feliz" desaparece — então vale aproveitar a
  mudança pra também adicionar um tratamento de erro mínimo ali.

**Por que não muda o resultado:** o MapLibre desenha a mesma geometria; só
deixa de baixar o mesmo arquivo duas vezes.

### 4.3 Introduzir uma camada de acesso a dados explícita

> **Veredito pós-debate: 🟡 Carona, não autônomo.** Só faz sentido junto/depois
> de 4.1 acontecer — não como mudança isolada hoje.

**Hoje:** a leitura de dado mockado está espalhada — `useGeoIndex` sabe a URL
`/data/bairros.geojson`, `config/levels.ts` também sabe essa URL,
separadamente.

**Por que foi rebaixado:** essa duplicação já encolhe sozinha assim que 4.2
for feito — `MapLayers` deixa de precisar da URL de bairro/loteamento, e o
literal `/data/bairros.geojson` sobrevive só em um lugar. O que sobra é um
grep, não um risco de manutenção. Além disso, uma assinatura como
`getBairros(): Promise<FeatureCollection>` é um chute sobre como vai ser a
API do banco real — um backend de verdade provavelmente vai precisar de
paginação ou filtro por bbox/viewport (relevante principalmente para
`setores.geojson`, que é o arquivo grande, 1.9 MB), e a assinatura
provavelmente seria reescrita de qualquer forma quando o banco chegar.

**Quando fazer:** como um passo de nomeação/organização de custo quase zero,
*se e quando* 4.1 acontecer (quem passar a possuir a leitura do arquivo é o
dono natural dessas funções) — não como tarefa isolada com a estrutura atual.

### 4.4 Marcar explicitamente o que é mock, no código

> **Veredito pós-debate: ✅ Aceito, com um refinamento.** **Implementado** —
> `// MOCK (MVP): ver ARQUITETURA-CODIGO-E-MELHORIAS.md §3` em
> `scripts/prepare-data.mjs` (`attachReliability`) e `src/lib/map/buildingClip.ts`
> (`syntheticHeight`), no lugar da explicação duplicada.

**Hoje:** `scripts/prepare-data.mjs` já comenta que `is_reliable` é
sintético; `buildingClip.ts` não deixa tão claro que a altura é inventada.
Este próprio documento (seção 3) já lista os dois como "MOCK explícito".

**Proposta:** um comentário curto (`// MOCK (MVP): ver
ARQUITETURA-CODIGO-E-MELHORIAS.md §3`) nos pontos que geram dado sintético,
em vez de reexplicar o raciocínio no código. O refinamento veio do debate:
os dois agentes notaram que duplicar a explicação (tabela do documento +
comentário extenso no código) cria duas fontes de verdade que podem divergir
— o comentário deve **apontar** para a explicação, não repeti-la.

### 4.5 Suspense/loading como preparação

> **Veredito pós-debate: ⛔ Descartado por ora** — mais forte que a proposta
> original de "baixa prioridade, só registrar".

**Hoje:** não há `loading.tsx` nem `<Suspense>`.

**Por que foi descartado, não só adiado:** os dois agentes convergiram em um
argumento mais forte do que "não traz benefício ainda": um fallback que
nunca é exercitado é pior do que nenhum fallback. A primeira vez que ele
rodaria de verdade seria a primeira vez que a aplicação tivesse latência de
rede real em produção (o banco de dados indo ao ar) — o pior momento
possível para descobrir um bug de layout/dimensão no skeleton, sem nada real
pra comparar e sem forma de testar isso no ambiente de desenvolvimento atual
sem throttling artificial.

**Quando reconsiderar:** só quando existir latência real (de rede ou de
banco de dados) para testar o fallback contra ela.

### 4.6 Estado centralizado em `MapView` — observar, não extrair

> **Veredito pós-debate: ✅ Aceito como está — nenhuma mudança de código.**

**Hoje:** `MapView.tsx` concentra ~8 `useState` (seleção, hover, preview,
toggles de camada, snap do bottom sheet, contagem de prédios, posição do
título). É um padrão válido ("elevar estado ao orquestrador mais próximo" em
vez de Context/lib externa) e funciona bem no tamanho atual — inclusive o
único ponto onde três estados mudam juntos (`handleSelect`: seleção +
hover de bairro + hover de loteamento) já é coordenado por um único
`useCallback`, que é exatamente a coordenação que um `useReducer` compraria,
sem custo extra de abstração.

**Proposta:** não trocar por Redux/Zustand agora (YAGNI). Só registrar o
gatilho para revisitar: se `MapView` continuar crescendo, o primeiro passo é
extrair um hook (`useMapSelectionState`) ou um `useReducer`, ainda dentro de
React puro, antes de considerar uma lib externa.

---

## 5. O que **não** muda nesta proposta

- Nenhuma dependência nova.
- `scripts/prepare-data.mjs`, os `neatogeo_*.geojson` da raiz e
  `public/data/*.geojson` continuam existindo exatamente como estão.
- `src/components/ui/map.tsx` (vendored) não é tocado.
- Nenhuma mudança visual, de UX ou de comportamento do mapa.
- **Ajuste pós-debate:** só 4.2 e 4.4 são mudanças recomendadas para agora.
  4.1 e 4.3 ficam registradas como plano, não como próximo passo; 4.5 foi
  descartado; 4.6 explicitamente não muda nada.

---

## 6. Debate

Dois agentes leram o código-fonte real (não só este documento) e debateram
os 6 itens da seção 4 em duas rodadas — abertura e réplica — um defendendo a
estrutura atual, outro defendendo as mudanças propostas. O escopo de
"cadastro/edição de loteamento" foi deliberadamente excluído do debate a
pedido do usuário (não é uma funcionalidade planejada a considerar aqui).

**Como o debate mudou o documento, além dos vereditos por item:**

1. **4.2 não depende de 4.1.** A proposta original implicava que eliminar o
   fetch duplicado exigia primeiro mover a leitura para um Server Component.
   O debate mostrou que não: dá para simplesmente passar o dado já resolvido do
   `fetch` client-side existente para `MapLayers`, sem servidor nenhum. Isso
   separa uma mudança de baixo risco e alto valor (4.2) de uma mudança de
   valor mais estreito e risco operacional real neste ambiente Windows
   (4.1) — que na proposta original estavam misturadas como se fossem um
   pacote só.
2. **4.1 tem um risco concreto que a proposta original não mencionava:**
   renderização estática da rota "congelando" o dado lido do disco até o
   próximo rebuild, se `dynamic = 'force-dynamic'` não for setado
   explicitamente — um risco de blast radius maior (todo visitante vê dado
   velho) que o problema que já existe hoje (cache de navegador por aba).
3. **4.2, ao remover a redundância do MapLibre, também remove um
   "acidente feliz"**: hoje, se o fetch do `useGeoIndex` falha (não tem
   `try`/`catch`), os polígonos ainda aparecem porque o MapLibre busca por
   conta própria. A correção de 4.2 deve empacotar também um tratamento de
   erro mínimo nesse fetch, ou troca uma falha visível por uma silenciosa.
4. **4.3 murchou de proposta "forte" para "carona condicional"** — os dois
   agentes concordaram que a duplicação que ela resolve (a URL repetida em
   dois arquivos) encolhe sozinha assim que 4.2 é feito, e que desenhar a
   assinatura das funções antes de conhecer o banco real é apostar em uma
   forma que provavelmente muda.
5. **4.5 saiu de "baixa prioridade" para "descartado"** — um argumento mais
   afiado emergiu no debate (fallback nunca exercitado é pior que nenhum
   fallback) que nenhum dos dois agentes tinha na abertura.

**Prioridade de implementação sugerida, se/quando alguém for mexer nisso:**

1. 4.2 (eliminar fetch duplicado, com guarda de prontidão de dado + tratamento
   de erro em `useGeoIndex`) — pode ser feito agora, isolado.
2. 4.4 (comentários `MOCK`) — trivial, pode ser feito junto ou a qualquer
   momento.
3. 4.1 + 4.3 juntos — só quando o banco de dados real entrar em cena.
4. 4.5 — só quando 4.1/4.3 já existirem e houver latência real para testar.
5. 4.6 — nada a fazer; só revisitar se `MapView` crescer muito mais.
