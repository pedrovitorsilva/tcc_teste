# Como o F4map (demo.f4map.com) constrói o mapa 3D

Pesquisa de arquitetura a partir da documentação pública do F4map (wiki oficial,
FAQ e página "3D Render"), focada em como cada elemento visual é gerado a
partir de dados do OpenStreetMap (OSM).

## Visão geral

- Renderiza em **WebGL** puro (sem plugins), com fallback de erro explícito
  quando o navegador não suporta.
- Fonte de dados: **OpenStreetMap**, sincronizado quase em tempo real
  (~5 min de delay), com cache de servidor causando até 24h de atraso para
  edições do usuário aparecerem.
- Motor de renderização e ferramentas de conversão são **proprietários** (F4,
  empresa fundada em 2002); não há nomes de bibliotecas divulgados
  publicamente (não é Three.js/Babylon.js nomeado — é engine própria sobre
  WebGL cru).
- Para edifícios específicos sem dados suficientes no OSM (ex.: Torre Eiffel),
  usam **modelos 3D extras** feitos à mão, fora do pipeline de geração
  automática.

## Prédios 3D de alturas diversas

Regra de altura, em ordem de prioridade:

1. Tag `height` (metros) — usada diretamente se presente.
2. Tag `building:levels` — convertida pela fórmula **3m por andar**.
3. Se nenhuma das duas existir: altura é **gerada pseudo-aleatoriamente a
   partir do `way_id`** do prédio (garante altura estável/determinística por
   edifício sem inventar dados geográficos reais).

Forma do telhado via `roof:shape` / `building:roof:shape` / `building:shape`,
com valores suportados: `flat` (padrão), `pyramidal`, `hipped`,
`half-hipped`, `skillion`, `gabled`, `dome`, `onion`, `mansard`, `gambrel`,
`round`, `sawtooth`, `saltbox` (e variantes múltiplas), etc.

Altura do telhado quando não informada:
- `dome`, `mansard`, `gambrel`, `round` → usa o menor lado do bounding box do
  edifício.
- `skillion` → 25% da altura total do prédio.
- Demais formas → 4 m fixos.

Cor/material: tags `colour` (nome ou hex), `building:material`,
`building:facade:material`, `roof:material`. Materiais especiais têm taxa de
reflexo simulada (vidro 30%, ouro 20%, espelho 99%).

## Carros andando em 3D

A documentação pública confirma a existência de **animação de veículos**
("vehicles" listados junto com chuva/neve/fontes como animações do motor),
mas **não publica os detalhes técnicos** (não há tags OSM documentadas para
isso, nem lógica de pathfinding/tráfego). Aparentam ser gerados
proceduralmente sobre a malha viária (`highway=*`) do OSM e movidos por uma
simulação interna não documentada — não é dado real de trânsito (a demo tem
um HUD de "distância/duração/velocidade" que parece ser de roteamento, não
telemetria real).

## Vegetação 3D e campos de futebol em 2D

**Vegetação:**
- `natural=tree` → árvore individual, posição exata do nó.
- `natural=tree_row` → árvores distribuídas semi-aleatoriamente ao longo da
  linha.
- `landuse=forest`, `landuse=orchard`, `natural=wood` → árvores preenchendo o
  interior do polígono de forma semi-aleatória (não é grid regular).
- `natural=heath`, `natural=scrub` → inserção de arbustos em vez de árvores.
- Tipo de árvore (decídua, conífera, palmeira) é inferido pela **latitude**
  quando a tag `leaf_type`/espécie não está presente no OSM — heurística
  climática simples.

**Campos esportivos:** não há página dedicada documentada publicamente para
`leisure=pitch`/`sport=soccer`, mas o comportamento visível na demo (e
consistente com o padrão "extrusão 0 = superfície 2D" do resto do motor) é
que polígonos de uso do solo sem regra de extrusão 3D — como campos de
esporte — são desenhados como **textura plana sobre o terreno**, com cor
derivada da tag `sport`/`surface`, e não como volume 3D.

## Cemitérios em 3D

Tags: `landuse=cemetery`, `amenity=grave_yard`.

O motor **adiciona covas ("graves") semi-aleatoriamente** dentro do polígono
do cemitério — mesma lógica de preenchimento procedural usada para árvores em
florestas, trocando o objeto instanciado. Não há documentação pública sobre o
modelo 3D específico usado para cada lápide.

## Efeitos de água em 3D

Tags: `natural=water`, `waterway=river|canal` (e fontes/`fountain` citadas
separadamente no material de marketing).

A água é renderizada **dentro da textura do terreno** (tile de solo), não
como geometria 3D separada, com uma **direção de onda global** aplicada sobre
toda a cena — ou seja, o efeito de ondulação não é por corpo d'água
individual, é um shader/animação de superfície compartilhado por todos os
polígonos de água visíveis.

## O que não é documentado publicamente

A F4 mantém como proprietário: nome do motor/engine WebGL, arquitetura de
tiling/streaming dos dados convertidos do OSM, algoritmo de tráfego dos
veículos, e o modelo 3D usado para lápides. A empresa afirma apenas ter
"tecnologias proprietárias para uma plataforma técnica robusta e escalável",
sem detalhar.

## Fontes

- [F4 Map — OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/F4_Map)
- [wiki.f4map.com — 3D Render (tags suportadas)](https://wiki.f4map.com/render)
- [wiki.f4map.com — FAQ](https://wiki.f4map.com/faq)
- [f4map.com — página institucional](https://www.f4map.com/)
- [demo.f4map.com — demo interativa](https://demo.f4map.com/)
