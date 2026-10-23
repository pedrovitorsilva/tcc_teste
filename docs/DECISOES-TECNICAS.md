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
* [§6 — Visualizações e mapas de calor](#6--visualizações-e-mapas-de-calor)

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
do `nm_bairro` do loteamento como string, sem id associado).

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

### Recorte por tile canônico, com cache — pan e zoom quase de graça

O recorte (`recortarPorTile`, em `src/lib/map/buildingTiles.ts`) trabalha por
**tile canônico** (o tile z14 de origem de cada feature) e guarda o resultado por
`(alvo, tile)`. A tela mostra a união dos tiles presentes, sem duplicata de borda.

Antes, o recorte descartava o que estava fora da tela (*frustum culling* pelo
centroide) e aplicava o LOD dentro do próprio cálculo. O resultado dependia da
câmera, e todo `moveend` refazia tudo. Agora o resultado de um tile não depende de
onde a câmera está: pan e zoom só pagam os tiles **novos**, e descartar o que está
fora da tela fica com a GPU, que já faz isso.

Três atalhos evitam converter a geometria (`feature.geometry` é preguiçosa no
MapLibre, e converter é a parte cara):

* **Tile já cacheado** para o alvo: pulado inteiro.
* **Tile fora da bbox do alvo**: pulado inteiro, comparando só a bbox do tile.
* **Cópias de tile ampliado**: acima do z14, cada tile ampliado devolve o tile
  canônico inteiro de novo, na mesma ordem. Rever o primeiro prédio do tile
  significa que começou uma cópia já processada.

Medido em 9 tiles em volta do Centro, cada um repetido 3 vezes como no zoom 16:

* o recorte converteu **55,7 mil** geometrias em vez de 226 mil e devolveu o mesmo
  conjunto de 5.202 prédios;
* repetir com os mesmos tiles (um pan) converteu **zero** geometrias e levou ~23 ms.

O cache guarda os tiles dos últimos 3 alvos. A publicação também é incremental:
`updateData({ add, remove })` manda ao worker só os prédios que entraram e saíram.
`setData` completo fica para a source recém-criada (inclusive na troca de tema) e
para a troca de cores do mapa de calor (§6).

### LOD (level of detail) por área — prédios pequenos somem em zoom baixo

Um prédio muito pequeno custa praticamente a mesma tessellation 3D que um grande,
mas não é perceptível de longe.

O LOD é o `filter` da layer de extrusão, não o recorte:
`['>=', ['get', 'area'], ['step', ['zoom'], …LOD_MIN_AREA_STEPS]]`. Os degraus
(`config/buildings.ts`) são 60 m² abaixo do z14, 40 m² no z14, 20 m² no z15 e
todos a partir do z16. É a mesma curva do `lodMinAreaM2`, discretizada por zoom
inteiro, porque o MapLibre avalia filtros pelo zoom de cada tile. Assim, mudar o
zoom não refaz o recorte. A área de cada prédio vai como propriedade (`area`) na
feature publicada.

### A layer-sonda invisível

O MapLibre só baixa os tiles de uma source quando alguma layer a referencia.
Layers com `visibility: none` não baixam os tiles, mas uma layer com
`fill-opacity: 0` continua baixando.

Por isso existe uma layer "sonda" invisível, cuja única função é forçar o download
dos tiles.

A sonda tem um `filter` que nunca casa (`['has', '__sonda__']`). O
`querySourceFeatures` lê o **tile bruto** (`rawTileData`), não a geometria da layer.
Sem o filtro, o worker triangulava e subia para a GPU cada polígono do tile (até
~17 mil prédios por tile z14) só para pintá-lo com opacidade 0. O mesmo helper
(`addProbedVectorSource`) serve vegetação, água e carros, que ganham o mesmo
corte.

### A cor das extrusions

Sem mapa de calor ativo, as extrusions usam `--building`, o último nível da rampa
de granularidade do tema ativo. Com um mapa de calor ativo, cada prédio passa a usar
a cor da área em que está, com `--building` como fallback (§6).

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

---

## §6 — Visualizações e mapas de calor

*Código relacionado: `src/config/visualizacoes.ts`, `src/lib/map/choropleth.ts`,
`src/hooks/useChoropleth.ts`, `src/components/map/ChoroplethLayer.tsx`,
`src/components/map/ChoroplethLegend.tsx`,
`src/components/buttons/optionsList/VisualizacoesPopoverButton.tsx` e o trecho de
cor em `src/components/map/Buildings3D.tsx`.*

### "Mapa de calor" aqui é um coroplético

O nome na interface é "mapa de calor", mas a técnica é um **coroplético**: cada
polígono (setor ou bairro) é pintado pelo valor da sua variável. Não é um heatmap
de densidade de pontos. O Censo entrega valores por área, não por endereço, e
espalhar esses valores como pontos inventaria uma distribuição que o dado não tem.

### Seleção única, garantida pelo próprio radio

O menu "Visualizações" é organizado em grupos, e o primeiro é "Mapa de calor". Só
uma visualização fica ativa por vez, de qualquer grupo. Isso não depende de lógica
de estado: todas as opções, de todos os grupos, são `<input type="radio">` com o
mesmo `name`. O navegador já garante que só uma fica marcada, e "Nenhuma" é a
opção que desliga. Um grupo novo entra só como dado em `GRUPOS_VISUALIZACAO`.

### Em que nível pintar

Medido nos arquivos de `public/data`:

| Nível | Unidades | Por que sim / por que não |
| --- | ---: | --- |
| **Setor censitário** | 664 | Maior detalhe, dado oficial do IBGE (não estimado), cobre o município inteiro. Mas tem sigilo: esgoto nulo em 155 setores (23%). |
| **Bairro/distrito** | 36 | Sem nulos, mas grosso; os 12 distritos rurais são enormes e dominam a imagem. |
| Loteamento | 166 | **Descartado.** São estimativas (alocação pelo CNEFE), 66 de 166 não são confiáveis (`is_reliable`) e não cobrem a cidade inteira (há sobras). |

A regra: **setor por padrão; bairro quando o setor tem sigilo demais** (hoje, só o
esgoto). Cada variável declara o próprio nível em `config/visualizacoes.ts`, e a
legenda diz qual nível está pintado.

### Só taxas e densidades, nunca contagens

Uma contagem absoluta (população, domicílios) faria áreas grandes parecerem "mais",
só por serem grandes. Toda variável é normalizada: hab/km², renda média, fração de
domicílios. Para a densidade, o divisor é `area_domiciliada_km2` (onde há moradia).
Os 119 setores rurais não têm esse campo e usam `area_km2`.

### O esgoto usa a soma das categorias como denominador

Os setores sob sigilo **somem do numerador** do bairro (`rede_ou_fossa_ligada`),
mas não do total de domicílios (`dppo`). Com `1 − rede/dppo`, o Centro saía com
**15,4%** dos domicílios sem rede; o valor real é **0,4%**. O denominador correto
é a soma das categorias de esgoto que o IBGE reportou, o mesmo conjunto de
domicílios do numerador. As categorias vêm de `SANEAMENTO.esgoto` em
`config/indicadores.ts`, a mesma lista que a ficha usa.

### Sigilo é cinza, nunca zero

Área sem valor (sigilo do IBGE) fica num cinza neutro e ganha uma entrada própria
na legenda ("Sem dado (sigilo IBGE)"). Pintar como a menor faixa afirmaria um valor
baixo que ninguém mediu.

### Quebras por quantil, com fallback

Os dados são muito assimétricos. A densidade por setor tem p10 de 1.014, p50 de
7.603 e p90 de 18.182 hab/km². Intervalos iguais poriam quase tudo na primeira
faixa. Por isso as 5 faixas são por **quantil** (`quebrasQuantil`).

Duas armadilhas:

* O `step` do MapLibre exige quebras em ordem estrita, então quebras repetidas
  são descartadas.
* Quando muitos valores empatam no mínimo (ex.: quase todo bairro com 0%), os
  quantis colapsam numa faixa só. Nesse caso a função cai em **intervalos
  iguais**.

### As cores partem da cor base do mapa

Cada variável define só a cor do valor **máximo** por tema (`MATIZES`). A rampa é
interpolada em OKLab (§1) da cor do terreno (`--map-land`) até essa cor. A primeira
faixa fica em `RAMPA_INICIO` do caminho: perto do terreno, mas ainda distinguível
dele.

A ordem pedida para os temas sai sozinha dessa escolha, porque o terreno é claro no
claro e no antigo e escuro no escuro:

* **Claro e Antigo:** menor valor = mais claro, maior valor = mais escuro.
* **Escuro:** menor valor = mais escuro, maior valor = mais claro. O valor alto
  "acende", na mesma lógica da rampa de granularidade (§1).

Os matizes seguem o tipo de variável. Densidade usa vermelho/laranja, renda usa
verde e carência (quanto mais, pior, como no esgoto) usa vermelho. Cada variável é
uma rampa de **um matiz só**, e nada de arco-íris: matizes misturados não têm ordem
perceptível.

### O MapLibre não lê propriedade aninhada

Os GeoJSON do ETL guardam os indicadores em objetos aninhados
(`renda_responsavel.rendimento_medio`). Expressions do MapLibre não alcançam esse
nível. Por isso `useChoropleth` monta uma cópia só com geometria e um campo achatado
`{ valor }`. Feature sem valor fica sem a chave, e a expression trata isso com
`['has', 'valor']`.

### Dados e cores são calculados separadamente

`useChoropleth` tem dois `useMemo`:

* **dados e quebras**, que dependem da variável e do arquivo;
* **cores**, que dependem do tema e da cor base.

Trocar o tema refaz só as cores. A geometria não é recopiada nem reenviada ao
MapLibre (`ChoroplethLayer` só chama `setData` quando os dados mudam), e os prédios
não refazem o point-in-polygon.

### Onde a camada entra na pilha

O preenchimento entra logo acima do fill de bairro, abaixo do halo e de todas as
linhas (`beforeId` = halo do bairro). Limites, hover e 3D continuam legíveis por
cima. Por isso `<ChoroplethLayer>` é renderizado **depois** de `<MapLayers>`: o
`beforeId` precisa já existir. Como toda layer (§2), ela é recriada quando o tema
recarrega o style.

### Setores buscados sob demanda

O arquivo de setores (2,4 MB) já é carregado pelo MapLibre por URL, para a camada
de setores. O mapa de calor por setor faz uma segunda busca, só quando uma variável
desse nível é escolhida (servida do cache HTTP). Passar o objeto já parseado para o
MapLibre, como é feito com bairros e loteamentos, obrigaria o thread principal a
parsear 2,4 MB em toda abertura do mapa, mesmo para quem nunca usa o mapa de calor.

### Prédios 3D na cor da área

Com um mapa de calor ativo, cada prédio usa a cor da área em que está o seu
centroide:

1. a faixa do **setor**;
2. se o setor estiver sob sigilo, a do **bairro**, com as mesmas quebras e cores da
   legenda (a legenda continua sendo do nível principal);
3. se nenhum dos dois tiver valor, `--building`.

Variáveis por bairro pulam o passo 1.

A cor entra como propriedade `cor` em cada feature no momento de publicar o recorte,
e o paint usa `['coalesce', ['get', 'cor'], <--building>]`. O recorte em cache (§3)
continua só com geometria. Trocar de variável republica o último recorte com as
cores novas, sem refazê-lo.

O teste "em que setor está este prédio?" é uma busca linear com filtro de bbox mais
point-in-polygon. Ele é guardado **por prédio**: pan e zoom republicam os mesmos
prédios, então só prédio novo paga o teste. Se pesar em bairros muito grandes, o
próximo passo é um índice espacial.

### A legenda acompanha a ficha

* **Desktop/tablet:** a legenda aparece no topo da ficha quando ela está aberta e
  flutua no mapa, ao lado dos botões, quando a ficha está fechada ou recolhida.
* **Mobile:** a legenda aparece **só na ficha**. Na tela pequena, um cartão
  flutuante a mais cobriria o próprio mapa que ele explica.
