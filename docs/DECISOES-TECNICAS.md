# Decisões Técnicas — Cadastro Vivo

> O **porquê** por trás do código: alternativas rejeitadas e o motivo, bugs já
> corrigidos que justificam a forma atual, números medidos que sustentam constantes,
> e armadilhas de manutenção.
>
> Este documento existe para que o código possa ser lido rápido. Onde houver uma
> decisão não óbvia, o comentário no código diz **o quê** em uma linha e aponta para
> a seção correspondente aqui.
>
> Para entender a aplicação antes de mergulhar aqui, comece pelo
> [`GUIA-DO-PROJETO.md`](./GUIA-DO-PROJETO.md).

**Índice**

- [§1 — Cor e temas](#1--cor-e-temas)
- [§2 — O mapa e suas camadas](#2--o-mapa-e-suas-camadas)
- [§3 — Prédios 3D](#3--prédios-3d)
- [§4 — Rótulos dentro do polígono](#4--rótulos-dentro-do-polígono)
- [§5 — Dependências evitadas](#5--dependências-evitadas)
- [§6 — Armadilhas de manutenção](#6--armadilhas-de-manutenção)

---

## §1 — Cor e temas

*Código relacionado: `src/app/globals.css`, `src/lib/color/palette.ts`,
`src/lib/color/oklab.ts`, `src/lib/map/tint.ts`, blocos de tema em
`src/components/map/MapLayers.tsx`.*

### As camadas são um matiz só, em lightness diferentes

A decisão estrutural mais importante: **os níveis não se distinguem por matiz**. Cada
tema usa um único matiz em quatro ou cinco claridades, formando uma rampa. Isso
sobrevive intacto a qualquer dicromacia, porque lightness é o canal que o daltonismo
preserva.

O que muda entre os temas é a **direção** da rampa e o que ela significa:

- **Claro e Antigo** (fundo claro): a unidade menor é a mais clara. Sobre papel
  branco, mais claro é menos peso — o bairro ancora a leitura e o detalhe fino recua.
  O croma do tema Claro é baixo de propósito (0.050 a 0.065): de relance o mapa lê
  como uma gravura em cinza, e o azul só se revela na comparação entre níveis.
  O tema Antigo fixa o croma em 0.122 no matiz 26° (OKLCH) do cartaz de referência.
- **Escuro** (fundo escuro): a unidade menor **brilha mais**. O bairro é o clarão
  difuso de fundo e a edificação é o ponto de luz concentrado. A ordem vira o próprio
  significado: mais claro é mais fino. O dourado de referência (`#efbe52`, H=84°)
  define o matiz de toda a rampa, e cai entre `--setor` e `--building` — a referência
  está literalmente dentro da rampa.

`--uncertain` (geometria não confirmada) segue a mesma lógica em cada tema: nos temas
de fundo claro é o mesmo matiz com croma quase zerado, na lightness exata do
loteamento — "mesmo nível, sem cor". No tema escuro ele é o topo da rampa, luz
estourada. Como ele também pinta o título da Nota do Cartógrafo, precisa se distinguir
de `--ink` no painel: daí `--ink` ser um branco neutro-frio e `--uncertain` um branco
quente — os dois se separam por temperatura, não por lightness.

Nos prédios do tema Antigo, `--building` foge do matiz 26° dos outros três níveis e
usa marrom (55° OKLCH, croma reduzido para 0.10): na mesma lightness da rampa, mas
lendo como marrom e não como "vermelho mais claro".

### Alpha mistura luz — a escada precisa ser remedida depois da composição

No tema escuro as opacidades de preenchimento não são questão de gosto. A rampa tem
que continuar ascendente **depois** de composta sobre o fundo, e alpha mistura luz.
Medido sobre `--page`: o par que vinha dos outros temas (loteamento 0.28, setor 0.14)
**inverte a escada** — o setor, que é a cor mais clara, chega à tela mais escuro que o
loteamento. Por isso, à noite, o setor recebe mais opacidade que o loteamento, o
oposto dos outros temas.

A incerteza inverte pelo mesmo motivo: nos temas Claro e Antigo ela é mais apagada que
um loteamento normal, para ler como "menos firme"; à noite, sendo o topo da rampa, é
mais opaca.

### As paletas guardam uma variante por tema

`PALETTES` (`lib/color/palette.ts`) não é um conjunto único de hexadecimais por
preset: é uma variante por tema. Uma paleta calibrada sobre o modo claro 
fica ilegível sobre o modo escuro — o que separa as camadas ali é contraste
contra um fundo claro, e esse contraste some quando o fundo inverte.

A variante escura tem uma restrição a mais: como o tema escuro separa as camadas por
lightness e não por matiz, um preset que trocasse as três por matizes de mesma
lightness destruiria o gradiente de granularidade. Por isso cada variante escura é
uma rampa, e **o preset muda a cor da luz, não a estrutura dela**.

### Por que trocar variáveis CSS, e não pintar o mapa direto

O exemplo do MapLibre ("change a layer's color with buttons") chama `setPaintProperty`
direto na camada. Aqui isso seria um retrocesso: todo o design system — camadas do
mapa, extrusões, swatches da sidebar, borda da nota do cartógrafo — já lê `--bairro` /
`--loteamento` / `--setor` / `--building`, e `useThemeTokens` já converte essas
variáveis no que o MapLibre precisa. Escrevendo nas variáveis, **mapa e interface
mudam juntos**, a partir de uma fonte só.

### Por que OKLab e não HSL

A tintura do basemap depende de *preservar a lightness percebida* ao trocar matiz e
croma. É precisamente o que o HSL não oferece: o `L` dele é uma média aritmética de
canais, não uma medida perceptual, e a mesma operação em HSL embaralha a ordem de
lightness do original — que é quase tudo o que distingue uma via de uma quadra no
Positron.

### A tintura do basemap é transferência de tom, não tabela de-para

`lib/map/tint.ts` remapeia **qualquer** cor de entrada pela sua lightness percebida,
em vez de traduzir cores conhecidas uma a uma. O motivo é de manutenção: o style vem
de uma URL remota da CARTO e pode mudar sem aviso. Uma tabela fixa quebraria em
silêncio no dia em que eles reajustassem um cinza, deixando camadas soltas na cor
errada.

Quatro detalhes do algoritmo que não são óbvios:

1. **A faixa de lightness é medida, não assumida como 0..1.** Sem isso o resultado sai
   lavado: o Positron inteiro vive entre L≈0.80 e L≈1.00, então um mapeamento absoluto
   espreme as feições nos 20% mais claros da rampa e o traçado de vias desaparece no
   pergaminho. Normalizando pela faixa observada, o contraste *relativo* é reexpandido.
2. **Água entra como cor chapada**, sem passar pelo remapeamento. No mapa de
   referência a água é um cinza-esverdeado uniforme; remapear produziria um bege
   levemente mais escuro que o continente, que lê como sombra, não como água.
3. **`background` é separado de `land`.** Num style claro os dois papéis coincidem (o
   papel é o fundo e o alvo da feição mais clara). Num style escuro eles se separam: o
   fundo é quase preto, mas a feição mais clara — as vias — é justamente o que precisa
   acender. Sem esse campo a tintura inverteria o traçado e as vias sumiriam.
4. **`contrast` não é 1 de propósito** (padrão 0.7). O basemap é substrato; levá-lo até
   a tinta cheia faz o traçado de vias competir com os dados desenhados por cima.


---

## §2 — O mapa e suas camadas

*Código relacionado: `src/components/map/MapLayers.tsx`.*

### Um único handler de clique, global — não um por camada

Com um bairro selecionado, o polígono do bairro cobre toda a área por baixo dos
loteamentos destacados. Dois listeners por camada (`map.on('click', layerId, …)`)
disputam o mesmo clique, e o bairro sempre "ganhava" — era impossível selecionar um
loteamento dentro dele. A solução é um handler global que consulta explicitamente as
camadas de loteamento primeiro (mais específicas, visualmente por cima) e só depois a
de bairro, tornando a prioridade determinística.

### Hierarquia: o clique nunca entra num loteamento sem contexto

O primeiro clique seleciona o bairro; só com o bairro em contexto o clique desce para
um loteamento. Isso vale **apenas para o clique no mapa** — a busca por texto salta
direto para um loteamento, porque ali o usuário nomeou o alvo.

Exceção: com o toggle "Bairros" desligado, a hierarquia não se aplica. Não existe um
"primeiro clique no bairro" possível, e o usuário desligou a camada de propósito para
navegar só por loteamentos.

### Casar por id, não por nome

Realce e seleção são casados pelo id gerado pelo MapLibre sempre que possível. O nome
só é usado quando é a única informação disponível (`selection.parentBairro`, que vem
do dado como string, sem id associado). O motivo é concreto: **"Boa Vista" existe como
bairro e como loteamento** no dataset — casar por nome produz realce ambíguo.

### O halo noturno

O tema escuro é o único com halo, e é o que separa "polígonos âmbar sobre fundo preto"
do efeito de cidade iluminada das referências. O MapLibre não tem glow, mas uma linha
larga e borrada (`line-blur`) por baixo da linha nítida produz halo real.

A intensidade é modulada por estado porque **a malha inteira acesa vira ruído** — é o
mesmo problema de um mapa de logística onde todas as rotas brilham: nada se destaca.
O repouso é discreto, a seleção é que acende, e o estado "outra coisa está
selecionada" fica quase apagado para o alvo ativo ficar sozinho na tela.

Dois efeitos colaterais dessa lógica:

- **À noite o bairro selecionado engrossa**, em vez de afinar como nos outros temas.
  Ali o preenchimento é quase nada de propósito, então quem carrega o foco é o
  contorno — e um contorno mais fino leria como "menos selecionado".
- **O preenchimento não segue a atenuação do contorno.** Ele é presença, não foco;
  atenuá-lo junto faria o bairro sumir por inteiro quando outro estivesse selecionado.

### Traço tracejado em zoom de cidade

Loteamentos não confiáveis usam espessura mínima maior em zoom baixo. No traço padrão
(1px) o tracejado `[6, 4]` fica fino demais para "ler" como tracejado, deixando só a
cor do preenchimento como sinal perceptível — e o design system pede que a distinção
nunca dependa só de cor.

### Enquadramento e inclinação da câmera

O `fitBounds` usa a bbox que já vem pronta na seleção (do evento do mapa, no clique, ou
do índice do GeoJSON completo, na busca), e **não** consulta a source. A source só
enxerga tiles já renderizados e devolveria a geometria recortada em fragmentos.

O pitch de 50° entra junto porque as extrusões de edificação só leem como volume num
ângulo oblíquo — de cima elas viram preenchimento chapado. Fechar a seleção devolve o
mapa à vista de topo, que é a leitura cartográfica padrão do projeto.

### Toda camada é recriável

Trocar de tema recarrega o style inteiro do MapLibre, o que apaga sources e camadas
que não vieram dele. Por isso todo efeito de criação é idempotente (checa
`getSource`/`getLayer` antes de adicionar) e roda de novo quando `isLoaded` oscila.

Sobre as sources de bairro e loteamento receberem o GeoJSON já carregado em vez de uma
URL, veja [`ARQUITETURA-CODIGO-E-MELHORIAS.md`](./ARQUITETURA-CODIGO-E-MELHORIAS.md)
§4.2.

---

## §3 — Prédios 3D

*Código relacionado: `src/components/map/Buildings3D.tsx`, `src/lib/map/buildingClip.ts`,
`src/config/buildings.ts`.*

### Por que Overture, e não o basemap ou o OSM

Medido nos tiles reais z14 do centro de Vitória da Conquista:

| Fonte | Edificações no tile |
|---|---|
| CARTO (`carto.streets`) | 9 |
| OpenFreeMap (OSM) | 14 |
| **Overture** | **8.188** |

O tileset do CARTO até tem uma source-layer `building` com `render_height`, mas é
agregado em maxzoom 14 e descarta quase toda edificação pequena. O OSM bruto tem só
~9,7 mil edificações na cidade inteira. O Overture cobre a cidade via detecção
automática (Google Open Buildings + Microsoft ML + OSM), que é o que dá o "tapete" de
footprints da referência visual.

Nada disso é armazenado no projeto: o arquivo tem ~180 GB e fica na AWS. O protocolo
PMTiles busca só os bytes dos tiles em vista, por range request.

### Por que o recorte é feito em JavaScript

O MapLibre não tem predicado espacial em expressão de estilo: a expressão `within` só
avalia features `Point` e `LineString`, **nunca polígonos**. Não há como filtrar
footprints "dentro do bairro X" pelo `filter` de uma layer — o caminho é consultar as
features e recortar em JS, ponto a ponto.

A geometria do alvo vem do índice do GeoJSON completo, não do evento do mapa: essa
última chega recortada por tile e deixaria buracos no resultado.

### A altura é sintética — `MOCK (MVP)`

As footprints do Overture vêm de detecção automática e praticamente não trazem altura:
no tile z14 do centro, **10 de 8.188 features** têm `height`. Em vez de inventar
andares, usa-se um volume genérico que cresce suavemente com a raiz da área da
footprint — assim um galpão não fica do mesmo tamanho de uma casa, sem alegar altura
medida. O divisor é calibrado para que uma casa (~100 m², lado ~10 m) fique perto da
base e um galpão grande (~2500 m², lado ~50 m) chegue perto do teto.

A fórmula é **determinística** de propósito: mesma footprint, mesma altura, sempre. O
recorte é recalculado a cada hover, e alturas instáveis fariam a cidade tremular.

### Zoom mínimo e cache

Abaixo do zoom 13, nenhum prédio: no zoom de cidade inteira (11) seriam dezenas de
milhares de extrusões ilegíveis, e cada tile z14 custa ~500 KB comprimido. O
`fitBounds` de uma seleção já leva o mapa acima desse limite.

Os recortes já calculados ficam em cache por alvo, para que re-hover no mesmo bairro
não refaça a varredura. **Só entram no cache resultados calculados com a source
inteiramente carregada** — um recorte parcial em cache ficaria parcial para sempre.

### Frustum culling — só o que está na tela

Mesmo dentro de um bairro grande, se o usuário deu pan/zoom pra ver só um canto dele,
não vale a pena testar point-in-polygon (o teste mais caro do recorte) contra prédios
que nem aparecem na tela. `compute()` descarta pelo centroide contra `map.getBounds()`
**antes** do point-in-polygon — um teste O(1) de retângulo eliminando o trabalho
O(vértices) do teste de polígono para tudo que está fora do viewport. Como `compute()`
roda do zero a cada `moveend`, o corte já reflete a posição atual do mapa sem
precisar invalidar cache nem reestruturar a publicação.

### LOD (level of detail) por área — prédios pequenos somem em zoom baixo

`lodMinAreaM2(zoom)` (`src/lib/map/buildingClip.ts`) decai linearmente de
`LOD_MIN_AREA_M2` (60 m²) no `BUILDINGS_MIN_ZOOM` (13) até 0 no `LOD_FULL_DETAIL_ZOOM`
(16). Um prédio minúsculo custa a mesma tesselação 3D que um grande, mas é
imperceptível de longe — no zoom mínimo, só prédios com pelo menos ~60 m² de
footprint ganham extrusão; a partir do zoom 16, todos aparecem, mesmo os pequenos.

### A camada-sonda invisível

O MapLibre só baixa os tiles de uma source referenciada por alguma camada, e camadas
com `visibility: none` não baixam nada — mas `fill-opacity: 0` baixa. Daí existir uma
camada "sonda" invisível cuja única função é forçar o download dos tiles.

### A cor das extrusões

As extrusões usam sempre `--building`, o último degrau da rampa de granularidade do
tema ativo. Antes elas herdavam a cor do nível selecionado, o que funcionava quando
cada nível era um matiz distinto; com os três temas convertidos em rampas
monocromáticas (§1) isso **inverteria o gradiente** — dentro de um bairro as
edificações sairiam no degrau mais escuro, e elas são o elemento mais fino de todos.

### Por que mora fora de `MapLayers`

`MapLayers.tsx` já concentra as três camadas administrativas e passa de 900 linhas.
`Buildings3D` tem uma responsabilidade só: fonte de edificações, recorte ao alvo e
extrusão.

---

## §4 — Rótulos dentro do polígono

*Código relacionado: `src/lib/map/polygonLabel.ts`,
`src/components/map/FloatingPolygonLabel.tsx`.*

### O centroide não serve

Em bairros côncavos — e há vários no dataset, além dos `MultiPolygon` — o centroide
cai **fora** da própria geometria. O que se quer é o ponto interior mais distante de
qualquer borda, o "polo de inacessibilidade", porque a distância até a borda é
exatamente o raio disponível para o texto.

A implementação é uma busca em grade com refinamento, e não o algoritmo exato
(polylabel) nem o turf: são polígonos de dezenas de vértices, calculados uma vez por
alvo, e a precisão de um refinamento já é muito maior que a necessária para posicionar
texto. Num `MultiPolygon`, rotula-se a maior parte — as demais costumam ser fragmentos
de fronteira, pequenos demais para caber texto.

### Correção de Mercator

A distância é medida num espaço escalado, onde a latitude é comprimida para o mesmo
passo de tela da longitude. No Mercator, um grau de latitude ocupa 1/cos(lat) vezes
mais pixels que um grau de longitude; sem essa correção o raio sairia enviesado no
eixo vertical.

### O tamanho trava o rótulo ao terreno

O corpo ideal do texto é `K · 2^zoom`. Como o tamanho cresce com `2^zoom`, o rótulo
ocupa sempre a mesma fração do polígono em qualquer nível de zoom — que é o que
"tamanho proporcional" pede. `K` sai do raio de cada polígono, então um loteamento
pequeno recebe um rótulo proporcionalmente pequeno, sem precisar projetar a bbox a
cada frame. Abaixo de um corpo mínimo o rótulo some, em vez de encolher além do ponto
de leitura.

> 📌 **Pendência:** o teto de tamanho (`FLOAT_MAX_SIZE`, 240px) foi herdado do texto
> nativo. Reavaliar em inspeção visual se o efeito ampliado bate no teto com
> frequência.

### Overlay HTML, não texto nativo do mapa

O rótulo é um cartão HTML por cima do mapa, e não uma `symbol` layer do MapLibre,
porque o efeito pedido era de profundidade real ("voando acima do bairro"): sombra CSS
de verdade e a mesma tipografia de display do título flutuante — coisas que uma
`symbol` layer não oferece.

---

## §5 — Dependências evitadas

Duas funções deste projeto existem escritas à mão em vez de virem de uma biblioteca
conhecida. O critério, nos dois casos, foi o mesmo: **a dependência de runtime só entra
quando custa menos que o código que ela substitui.**

| Escrito à mão | Alternativa recusada | Motivo |
|---|---|---|
| `lib/color/oklab.ts` | Culori | O projeto precisa de duas conversões e um parser de cor CSS. A biblioteca inteira custaria mais que as ~60 linhas. |
| `lib/map/buildingClip.ts` | `@turf/*` | Turf já existe no projeto, mas como **devDependency**, usado só pelo script de preparação de dados. Promovê-lo a dependência de runtime por causa de duas funções (ponto-em-polígono e área aproximada) sairia caro. |

A área do polígono usa uma aproximação equirretangular — mais que suficiente para uma
footprint de dezenas de metros, e muito mais barata que uma projeção de verdade.

---

## §6 — Armadilhas de manutenção

**A release do Overture é pinada de propósito.** Releases antigas saem do bucket com o
tempo. Quando os prédios sumirem, atualizar a string em `config/buildings.ts` é a
manutenção esperada — o índice de releases fica em
<https://docs.overturemaps.org/examples/overture-tiles/>.

**Registrar o protocolo PMTiles duas vezes é erro no MapLibre.** O Fast Refresh do
Next reexecuta módulos, então `ensurePMTilesProtocol()` é idempotente por necessidade,
não por elegância.

**Esse registro precisa acontecer antes de `new maplibregl.Map(...)`.** Por isso a
chamada fica no escopo do módulo em `MapView.tsx`, e não dentro de um efeito — o
componente `<Map>` de terceiros constrói a instância no próprio efeito de montagem, e
a source de prédios falharia ao resolver a URL.

**O MapLibre não resolve `var()` em propriedades de `paint`.** As cores precisam
chegar como hex/rgba literal. É a razão de existir o hook `useThemeTokens`, que lê a
variável CSS já calculada pelo navegador e devolve o valor final (§1).

**Não edite `src/components/ui/map.tsx`.** É código de terceiros vindo do registry
`mapcn` e é sobrescrito ao reinstalar. Toda customização é feita por props a partir do
`MapView`. Ver `CLAUDE.md`.

**As referências a `design_system/§N` espalhadas pelo código apontam para um documento
que não está neste checkout.** Foram preservadas por serem ponteiros baratos e úteis
caso o arquivo reapareça, mas hoje não é possível segui-las.

**`temp/` é área descartável.** Nada permanente deve referenciar arquivos de lá — as
imagens usadas pela documentação foram copiadas para `docs/imagens/` por esse motivo.
