# Decisões Técnicas — Mapa de Vitória da Conquista

> O **porquê** por trás do código: alternativas rejeitadas e seus motivos, bugs já
> corrigidos que explicam a implementação atual, números medidos que sustentam
> constantes e pontos que exigem atenção na manutenção.
>
> Este documento existe para facilitar a leitura do código. Quando houver uma
> decisão não óbvia, o comentário no código explica **o quê** em uma linha e aponta
> para a seção correspondente aqui.
>
> Para entender a aplicação antes de entrar nestes detalhes, comece pelo
> [`GUIA-DO-PROJETO.md`](./GUIA-DO-PROJETO.md).

**Índice**

* [§1 — Cor e temas](#1--cor-e-temas)
* [§2 — O mapa e suas camadas](#2--o-mapa-e-suas-camadas)
* [§3 — Prédios 3D](#3--prédios-3d)
* [§4 — Dependências evitadas](#4--dependências-evitadas)
* [§5 — Armadilhas de manutenção](#5--armadilhas-de-manutenção)

---

## §1 — Cor e temas

*Código relacionado: `src/app/globals.css`, `src/lib/color/palette.ts`,
`src/lib/color/oklab.ts`, `src/lib/map/tint.ts` e blocos de tema em
`src/components/map/MapLayers.tsx`.*

### As camadas usam um único hue, em diferentes valores de lightness

A decisão estrutural principal é: **os níveis não se distinguem por hue**. Cada tema
usa um único hue em quatro ou cinco valores de lightness, formando uma rampa. Isso
também ajuda na acessibilidade, inclusive para pessoas com daltonismo.

O que muda entre os temas é a **direção** da rampa e o significado dessa ordem:

* **Claro e Antigo** (fundo claro): a unidade menor é a mais clara. Em um fundo
  branco, maior lightness tem menos peso visual; o bairro mantém o foco e os detalhes
  mais finos recuam.

* **Escuro** (fundo escuro): a unidade menor tem maior lightness. O bairro forma
  o fundo e a edificação concentra o destaque. Assim, maior lightness representa
  um nível mais detalhado.

`--uncertain` (geometria não confirmada) segue a mesma lógica de cada tema. Nos
temas claros, seu chroma é próximo de zero. No tema escuro, ele ocupa o topo da
rampa, com alta lightness. Como também é usado no título da Nota do Cartógrafo,
precisa se diferenciar de `--ink` no painel. Por isso, `--ink` usa um branco
neutro-frio e `--uncertain` um branco quente: a diferença vem da temperatura, não
da lightness.

### Por que trocar variáveis CSS, e não alterar o mapa diretamente

O exemplo do MapLibre ("change a layer's color with buttons") usa
`setPaintProperty` diretamente na layer. Aqui isso seria menos adequado: o
design system — layers do mapa, extrusions, swatches da sidebar e borda da Nota
do Cartógrafo — já usa `--bairro`, `--loteamento`, `--setor` e `--building`.
O `useThemeTokens` converte essas variáveis para os valores que o MapLibre precisa.

Ao alterar as variáveis, **mapa e interface mudam juntos**, usando uma única fonte
de configuração.

### Por que OKLab e não HSL

A recoloração do basemap precisa **preservar a lightness percebida** ao trocar
hue e chroma. O HSL não oferece isso: seu `L` é uma média dos canais, não uma
medida perceptual. Uma mesma alteração em HSL pode mudar a ordem de lightness
das cores originais, que é importante para diferenciar vias, quadras e outras
feições do mapa.

### A recoloração do basemap usa a lightness, não uma tabela fixa de cores

`lib/map/tint.ts` remapeia **qualquer** cor de entrada com base na sua lightness
percebida, em vez de converter cores específicas uma a uma. Isso facilita a
manutenção: o style vem de uma URL remota da CARTO e pode mudar sem aviso.

Uma tabela fixa poderia parar de funcionar sem erro aparente caso a CARTO alterasse
um tom de cinza, deixando algumas layers com cores incorretas.

Quatro detalhes do algoritmo não são óbvios:

1. **`background` é separado de `land`.** Em um style claro, os dois papéis
   coincidem: o papel é o fundo e também representa a feição com menor lightness.
   Em um style escuro, eles são diferentes: o fundo é quase preto, enquanto a
   feição mais clara — as vias — precisa permanecer destacada. Sem essa separação,
   a recoloração inverteria o contraste e as vias desapareceriam.

2. **`contrast` não é 1 de propósito** (padrão 0.7). O basemap funciona como
   base visual; usar a cor no valor máximo faria as vias competirem com os dados
   desenhados por cima.

---

## §2 — O mapa e suas camadas

*Código relacionado: `src/components/map/MapLayers.tsx`.*

### Um único handler de clique, global — não um por layer

Quando um bairro está selecionado, seu polígono cobre a área abaixo dos loteamentos
destacados. Dois listeners por layer (`map.on('click', layerId, …)`) disputavam o
mesmo clique, e o bairro acabava sendo selecionado. Assim, não era possível
selecionar um loteamento dentro dele.

A solução é um handler global que verifica primeiro as layers de loteamento
(mais específicas e visualmente acima) e depois a de bairro. A prioridade fica,
assim, definida de forma explícita.

### Hierarquia: o clique só entra em um loteamento com contexto

O primeiro clique seleciona o bairro. Somente com um bairro em contexto o clique
pode selecionar um loteamento. Isso vale **apenas para cliques no mapa**.

A busca por texto pode ir direto para um loteamento, pois nesse caso o usuário
já informou qual é o alvo.

Exceção: com o toggle **Bairros** desligado, essa hierarquia não se aplica.
Não existe um primeiro clique no bairro, e o usuário desativou a layer para
navegar apenas pelos loteamentos.

### Casar por id, não por nome

Realce e seleção usam, sempre que possível, o id gerado pelo MapLibre. O nome só é
usado quando é a única informação disponível (`selection.parentBairro`, que vem
do dado como string, sem id associado).

Isso evita ambiguidades, pois existem bairros com o mesmo nome de loteamentos.

### O brilho noturno - halo (auréola)

O tema escuro é o único com brilho. Ele ajuda a separar os "polígonos âmbar sobre
fundo preto" do efeito de cidade iluminada usado como referência visual.

O MapLibre não possui glow. A solução é usar uma linha mais larga e com `line-blur`
abaixo da linha nítida, criando o efeito.

A intensidade varia conforme o estado porque **uma malha inteira acesa vira
ruído visual**. Em vez disso, o estado normal é discreto, a seleção recebe mais
destaque e um alvo diferente do selecionado fica quase apagado.

Isso gera dois efeitos importantes:

* **À noite o bairro selecionado fica mais espesso**, em vez de ficar mais fino
  como nos outros temas. Como o preenchimento é quase invisível de propósito,
  o contorno carrega o foco. Um contorno mais fino passaria a parecer menos
  selecionado.

* **O preenchimento não acompanha a atenuação do contorno.** Ele indica presença,
  não foco. Atenuá-lo junto faria o bairro praticamente desaparecer quando outro
  elemento fosse selecionado.

### Traço tracejado em zoom de cidade

Loteamentos não confiáveis usam uma espessura mínima maior em zoom baixo. No traço
padrão de 1 px, o padrão `[6, 4]` fica fino demais para parecer tracejado. Nesse
caso, apenas a cor do preenchimento seria percebida, mas o design system exige que
a distinção não dependa somente de cor.

### Enquadramento e inclinação da câmera

O `fitBounds` usa a bbox que já vem pronta na seleção: do evento do mapa, no clique,
ou do índice do GeoJSON completo, na busca. Ele **não** consulta a source.

A source conhece apenas tiles já renderizados e poderia devolver a geometria
recortada em vários fragmentos.

O pitch de 50° é aplicado junto porque as extrusions das edificações só aparecem
como volume em um ângulo inclinado. De cima, elas parecem apenas um preenchimento
plano. Ao fechar a seleção, o mapa volta para a vista superior, que é a leitura
cartográfica padrão do projeto.

### Toda layer é recriável

Trocar o tema recarrega o style inteiro do MapLibre. Isso remove sources e layers
que não fazem parte do style original.

Por isso, toda criação é idempotente: verifica `getSource` e `getLayer` antes de
adicionar cada elemento e pode ser executada novamente quando `isLoaded` muda.

---

## §3 — Prédios 3D

*Código relacionado: `src/components/map/Buildings3D.tsx`,
`src/lib/map/buildingClip.ts` e `src/config/buildings.ts`.*

### Por que Overture, e não o basemap ou o OSM

Exemplo medido no centro de Vitória da Conquista:

| Fonte                   | Edificações |
| ----------------------- | ----------: |
| CARTO (`carto.streets`) |           9 |
| OpenFreeMap (OSM)       |          14 |
| **Overture**            |   **8.188** |

O tileset da CARTO possui uma source-layer `building` com `render_height`, mas ela
é agregada em maxzoom 14 e descarta grande parte das edificações pequenas.

O OSM bruto possui cerca de 9,7 mil edificações na cidade inteira. Overture cobre
a cidade por meio de detecção automática, combinando Google Open Buildings,
Microsoft ML e OSM. Isso fornece a grande quantidade de footprints usada como
referência visual.

Nada disso é armazenado no projeto: o arquivo tem cerca de 180 GB e fica na AWS.
O protocolo PMTiles busca somente os bytes dos tiles necessários por range request.

### Fonte alternativa avaliada e rejeitada: Global Building Atlas

Chegou a existir uma branch (`replace_overture_gba`) trocando o Overture pelo
**Global Building Atlas** (`GBA.ODbLPolygon`, TUM), buscando um contorno de
prédios versionado localmente em vez de dependente de um bucket remoto de
180 GB. A troca funcionou tecnicamente (pipeline de preparo, reprojeção
EPSG:3857→WGS84, recorte por bairro — tudo certo), mas foi revertida por um
motivo mais simples: **cobertura**.

Medido diretamente no bairro Centro (mesma área da tabela acima):

| Fonte                    | Edificações |
| ------------------------ | ----------: |
| **Overture**              |   **8.188** (tile z14 do centro, área comparável) |
| **Global Building Atlas** |      **45** (bairro Centro inteiro) |

100% das features do GBA nessa região vêm de `properties.source == "ms"`
(Microsoft Building Footprints) — o componente OSM do GBA não tem nenhuma
contribuição aqui, e a cobertura do Microsoft ML sozinho é muito mais rala
que a combinação de três fontes que o Overture já faz (Google Open Buildings
+ Microsoft ML + OSM). Não é um problema de reprojeção ou de recorte: os
footprints têm tamanho e posição plausíveis, só existem poucos deles.

Se o GBA for reavaliado no futuro, o próximo passo não é mexer no código —
é conferir se a cobertura melhorou para o Brasil/Bahia antes de repetir a
troca.

### Por que o recorte é feito em JavaScript

O MapLibre não possui um predicado espacial em expressions de style:
`within` avalia apenas features `Point` e `LineString`, não polígonos.

Por isso, não é possível filtrar pelo `filter` de uma layer para obter apenas
os footprints "dentro do bairro X". O caminho é consultar as features e fazer
o recorte em JavaScript.

A geometria usada no recorte vem do índice do GeoJSON completo. A geometria do
evento do mapa é evitada porque vem recortada por tile e poderia deixar buracos
no resultado.

### A altura é sintética

Os footprints do Overture vêm de detecção automática e quase não possuem altura:
no tile z14 do centro, **10 de 8.188 features** têm `height`.

Em vez de inventar andares, o projeto usa uma altura genérica que cresce de forma
suave com a raiz da área do footprint. Assim, um galpão não fica com o mesmo
tamanho de uma casa sem afirmar que a altura foi medida.

O divisor é calibrado para que uma casa de cerca de 100 m² (lado próximo de 10 m)
fique perto da base e um galpão de cerca de 2.500 m² (lado próximo de 50 m) chegue
perto do teto.

A fórmula é **determinística**: a mesma footprint sempre gera a mesma altura.
O recorte é recalculado a cada hover, e alturas instáveis fariam a cidade
"tremer".

### Zoom mínimo e cache

Abaixo do zoom 13, nenhum prédio é exibido. No zoom de cidade inteira (11), seriam
dezenas de milhares de extrusions pouco legíveis, e cada tile z14 custa cerca de
500 KB comprimido. O `fitBounds` de uma seleção já leva o mapa para acima desse
limite.

Os recortes já calculados ficam em cache por alvo, para que um novo hover no mesmo
bairro não repita a varredura.

**Só entram no cache resultados calculados quando a source está totalmente
carregada**. Um recorte parcial armazenado em cache continuaria parcial nas próximas
execuções.

### Frustum culling — somente o que está na tela

Mesmo dentro de um bairro grande, se o usuário fez pan/zoom e está vendo apenas
uma parte dele, não é necessário executar point-in-polygon nos prédios que estão
fora da tela.

O `compute()` primeiro elimina features pelo centroide usando `map.getBounds()`.
Esse teste de retângulo é O(1) e evita o teste O(vértices) do point-in-polygon
para tudo que está fora do viewport.

Como `compute()` roda novamente a cada `moveend`, o recorte acompanha a posição
atual do mapa sem invalidar o cache ou alterar a forma como os dados são publicados.

### LOD (level of detail) por área — prédios pequenos somem em zoom baixo

`lodMinAreaM2(zoom)` (`src/lib/map/buildingClip.ts`) diminui linearmente de
`LOD_MIN_AREA_M2` (60 m²) no `BUILDINGS_MIN_ZOOM` (13) até 0 no
`LOD_FULL_DETAIL_ZOOM` (16).

Um prédio muito pequeno custa praticamente a mesma tessellation 3D que um grande,
mas não é perceptível de longe. No zoom mínimo, apenas footprints com pelo menos
cerca de 60 m² recebem extrusão. A partir do zoom 16, todos aparecem, inclusive
os pequenos.

### A layer-sonda invisível

O MapLibre só baixa os tiles de uma source quando alguma layer a referencia.
Layers com `visibility: none` não baixam os tiles, mas uma layer com
`fill-opacity: 0` continua baixando.

Por isso existe uma layer "sonda" invisível, cuja única função é forçar o download
dos tiles.

### A cor das extrusions

As extrusions usam sempre `--building`, o último nível da rampa de granularidade
do tema ativo.

Antes, elas herdavam a cor do nível selecionado. Isso funcionava quando cada nível
usava um hue diferente. Com os três temas convertidos em rampas de um único hue
(§1), esse comportamento **inverteria a ordem visual**: dentro de um bairro, as
edificações ficariam no nível mais escuro, embora sejam o elemento mais detalhado.

### Por que fica fora de `MapLayers`

`MapLayers.tsx` já concentra as três layers administrativas e passa de 900 linhas.

`Buildings3D` tem uma responsabilidade única: fonte de edificações, recorte para
o alvo e extrusão.

---

## §4 — Dependências evitadas

Duas funções deste projeto foram escritas à mão em vez de usar bibliotecas conhecidas.
Nos dois casos, o critério foi o mesmo: **a dependência de runtime só deve ser adicionada
quando custa menos que o código que ela substitui.**

| Escrito à mão             | Alternativa recusada | Motivo                                                                                                                                                                                                                                               |
| ------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/color/oklab.ts`      | Culori               | O projeto precisa de duas conversões e de um parser de cor CSS. A biblioteca inteira custaria mais que as cerca de 60 linhas necessárias.                                                                                                            |
| `lib/map/buildingClip.ts` | `@turf/*`            | Turf já existe no projeto, mas como **devDependency** e é usado apenas no script de preparação de dados. Torná-lo uma dependência de runtime por causa de duas funções (point-in-polygon e área aproximada) adicionaria mais custo do que benefício. |

A área do polígono usa uma aproximação equirretangular. Ela é suficiente para
footprints de algumas dezenas de metros e é muito mais barata que uma projeção
geográfica completa.

---

## §5 — Armadilhas de manutenção

**A release do Overture é pinada de propósito.** Releases antigas saem do bucket
com o tempo. Quando os prédios deixarem de aparecer, a manutenção esperada é
atualizar a string em `config/buildings.ts`. O índice de releases está
[nesse link](https://docs.overturemaps.org/examples/overture-tiles/).

**Registrar o protocolo PMTiles duas vezes é um erro no MapLibre.** O Fast Refresh
do Next.js reexecuta módulos, então `ensurePMTilesProtocol()` precisa ser idempotente.

**Esse registro deve acontecer antes de `new maplibregl.Map(...)`.** Por isso,
a chamada fica no escopo do módulo em `MapView.tsx`, e não dentro de um effect.
O componente `<Map>` de terceiros cria a instância durante o effect de montagem,
e a source de prédios falharia ao resolver a URL se o protocolo ainda não estivesse
registrado.

**O MapLibre não resolve `var()` em propriedades de `paint`.** As cores precisam
chegar como valores hex/rgba. Essa é a razão de existir o hook `useThemeTokens`:
ele lê a variável CSS já calculada pelo navegador e retorna o valor final (§1).

**Não edite `src/components/ui/map.tsx`.** O arquivo vem do registry `mapcn` e
pode ser sobrescrito durante uma reinstalação. Toda customização deve ser feita
por props a partir de `MapView`.

O `mapcn`, por padrão, fornece um código que permite usar elementos do MapLibre
e Mapbox React. Ele não é uma biblioteca de mapas independente; por isso, o
arquivo não deve ser editado diretamente.
