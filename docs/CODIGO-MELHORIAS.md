# Mapa — Pontos de melhoria


### Buscar o GeoJSON em Server Component, não em `useEffect`/hook client

> **Veredito: 🔴 Adiado.** Ganho real, mas estreito e não urgente
> — ver seção 6.

**Hoje:** `useGeoIndex.ts` faz `fetch()` client-side no mount para montar o
índice de busca — é o padrão clássico "`useEffect` + `useState` para dados do
servidor", que a skill `nextjs-anti-patterns` lista como anti-pattern
(Categoria 1.2 / 2.1).

**Proposta original:** `page.tsx` vira um Server Component `async` que lê os
arquivos de `public/data/*.geojson` diretamente e passa o resultado como prop
inicial para `MapView`.

**Quando reconsiderar:** quando a leitura de dado passar a ser uma consulta a
banco de verdade (seção 4.3) — aí a diferença entre disco local e rede passa
a ter latência real para justificar o cuidado extra, e a decisão de
renderização dinâmica pode ser tomada junto, documentada na mesma mudança.

### Introduzir uma camada de acesso a dados explícita

> **Veredito pós-debate: 🟡 Carona, não autônomo.** Só faz sentido junto/depois
> de 1 acontecer — não como mudança isolada hoje.

**Hoje:** as URLs dos dados ficam em `config/levels.ts` (e `AREAS_PONDERACAO_URL`),
lidas por `useGeoIndex` e pelas camadas; não há ainda uma camada de acesso a dados
que esconda se a origem é arquivo estático ou API.

**Quando fazer:** como um passo de nomeação/organização de custo quase zero,
*quando* 1 acontecer (quem passar a possuir a leitura do arquivo é o
dono natural dessas funções) — não como tarefa isolada com a estrutura atual.

### Suspense/loading como preparação

> **Veredito pós-debate: ⛔ Descartado por ora** — mais forte que a proposta
> original de "baixa prioridade, só registrar".

**Hoje:** não há `loading.tsx` nem `<Suspense>`.


**Quando reconsiderar:** só quando existir latência real (de rede ou de
banco de dados) para testar o fallback contra ela.

### Prédios 3D — Fase 2: tiles próprios gerados no ETL

> **Veredito: 🟡 Planejado, não iniciado.** É o próximo passo depois da Fase 1
> (`perf/predios`, já no `master`). Maior ganho de densidade e desempenho, mas muda
> o modelo de dados: os prédios passam a ser versionados no projeto.

**Hoje (depois da Fase 1):** os prédios vêm do arquivo remoto do Overture
(`buildings.pmtiles`, ~180 GB, por range request). A cada tile novo, a thread
principal faz `querySourceFeatures`, converte a geometria, roda o point-in-polygon
contra o bairro e calcula área e altura (`lib/map/buildingTiles.ts`). Depois manda
o resultado por `updateData` para uma source GeoJSON, que o worker retila e
triangula de novo.

A Fase 1 cortou o desperdício: sonda sem geometria, cache por tile, LOD por filtro,
envio incremental. Mas três custos são estruturais e só somem mudando a origem dos
dados:

* **O tile é decodificado duas vezes:** no worker, para a sonda, e na thread
  principal, para a consulta. Cada prédio é retilado e triangulado de novo na
  source GeoJSON.
* **O recorte roda na thread principal:** o tile mais cheio tem ~17,5 mil prédios,
  e o primeiro recorte de um bairro denso trava a interface por alguns
  centésimos de segundo.
* **O mapa depende do bucket do Overture em tempo de execução.** Ele só mantém as
  ~2 últimas releases; foi a causa do 404 em `2026-08-19.0`. A resolução da release
  mais nova (`lib/map/overtureRelease.ts`) contorna, mas não elimina.

**Medição que dimensiona a proposta** (release `2026-10-21.0`, bbox dos bairros
urbanos):

| Medida | Valor |
| --- | ---: |
| Tiles z14 | 72 |
| Tamanho dos tiles (com todas as propriedades do Overture) | ~47 MB |
| Prédios (com duplicatas de borda) | ~158 mil |
| Máximo por tile | ~17,5 mil |
| Vértices | ~870 mil |

**Proposta:** calcular tudo **uma vez, fora do site**, e servir tiles vetoriais
prontos, só com o que a aplicação usa.

1. **Script de preparo** `scripts/prepare-buildings.mjs`, no molde do
   `prepare-lamps.mjs` e rodado por `npm run prepare-data`:
   * baixa os tiles z14 do Overture que cobrem o município, com `pmtiles`,
     `@mapbox/vector-tile` e `pbf`. Os três já estão em `node_modules` como
     dependências transitivas e passariam a ser diretas;
   * deduplica os prédios de borda pelo `id` do Overture;
   * calcula, por prédio, `height` e `area` (`syntheticHeight` e `approxAreaM2` de
     `lib/map/buildingClip.ts`, as mesmas fórmulas de hoje) e `cd_bairro`,
     `cd_setor` e `cd_loteamento`, por point-in-polygon do centroide contra
     `public/data/*.geojson`;
   * grava **tiles MVT estáticos** em `public/tiles/predios/{z}/{x}/{y}.pbf`, com
     `geojson-vt` e `vt-pbf` (também já transitivas), nos zooms 13 a 15. Cada
     prédio leva só essas propriedades, nada das ~10 propriedades do Overture.
2. **Em tempo de execução**, uma `fill-extrusion` direto na source vetorial local,
   sem nenhuma etapa em JavaScript:
   * **recorte:** `filter: ['==', ['get', 'cd_bairro'], <bairro>]`, ou
     `cd_loteamento` para loteamento;
   * **LOD:** o mesmo filtro de área da Fase 1 (`LOD_MIN_AREA_STEPS`);
   * **altura:** `['get', 'height']`;
   * **mapa de calor:** `['match', ['get', 'cd_setor'], …, <--building>]`, montado a
     partir das quebras e cores de `useChoropleth`. Some o point-in-polygon por
     prédio em `Buildings3D` (cor do setor, fallback do bairro).

**O que deixa de existir:** `querySourceFeatures` e `lib/map/buildingTiles.ts` nos
prédios, a layer-sonda e a source remota dos prédios, a source GeoJSON
intermediária com `setData`/`updateData`, o cache por alvo e por tile, o
point-in-polygon do mapa de calor, e a dependência do bucket do Overture para os
prédios. Vegetação, água e carros continuam remotos, a menos que sigam o mesmo
caminho.

**Ganhos esperados:**

* **Velocidade:** trocar de bairro vira trocar um `filter`. O worker reavalia os
  tiles já carregados, sem rede e sem recorte.
* **Cache:** arquivos estáticos e imutáveis, cacheados pelo navegador e pela CDN
  (Vercel), em vez de range requests num arquivo de 180 GB.
* **RAM e CPU:** um único parse por tile, no worker. Nada de GeoJSON intermediário
  na thread principal nem de geometria duplicada em memória.
* **Densidade:** a cidade inteira cabe nos tiles. Mostrar mais prédios passa a
  depender só do filtro de LOD e da GPU, não de JavaScript.

**Custos e riscos:**

* **Tamanho no repositório:** estimado em 10 a 20 MB (a medir no primeiro
  preparo). Se passar disso, a alternativa é publicar os tiles fora do Git (Vercel
  Blob ou um bucket) e manter só o script no repositório.
* **Desatualização:** os prédios ficam fixos na release usada no preparo.
  Atualizar é rodar o script de novo. A mesma lógica já vale para os dados do
  Censo.
* **Revisão de decisão:** `DECISOES-TECNICAS.md` §3 diz que "nada disso é
  armazenado no projeto". A Fase 2 inverte isso e precisa registrar o porquê. A
  branch do Global Building Atlas foi rejeitada por cobertura, não por guardar
  dados localmente, então o precedente não impede.
* **Prédio na divisa:** cada prédio pertence a um único bairro, setor e
  loteamento, pelo centroide, como já acontece hoje. Loteamentos que se sobrepõem
  (`qualidade.sobreposicao_pct`) precisam de uma regra de desempate no script.
* **Hover:** cada troca de `filter` reavalia os tiles carregados no worker. Hover
  rápido entre bairros pode pedir um debounce, que já existe no `useClipEffect`
  (120 ms).
* **Zona rural:** os distritos cobrem muitos tiles com poucos prédios. Medir quantos
  tiles a mais o município inteiro pede em relação à área urbana (72) antes de
  decidir se os distritos entram.

**Passos sugeridos:**

1. Medir: rodar o preparo só para os bairros urbanos e anotar o tamanho em disco
   por zoom.
2. Escrever `scripts/prepare-buildings.mjs` e o comando em `package.json`.
3. Trocar a source e o recorte em `Buildings3D.tsx` (filtro por `cd_bairro` e
   `cd_loteamento`, LOD e altura por propriedade), mantendo a contagem de prédios
   da ficha via `querySourceFeatures` com filtro (barato, sem geometria) ou
   pré-calculada por bairro no script.
4. Trocar a cor do mapa de calor por uma expressão `match` em `cd_setor`, com o
   bairro como fallback.
5. Remover o código que deixou de existir (lista acima) e atualizar
   `DECISOES-TECNICAS.md` §3 e §6 e o `GUIA-DO-PROJETO.md`, seção 9.

**Como validar:**

* Mesmo conjunto de prédios por bairro que a Fase 1, comparado por `id` num
  script.
* Mesma cor por prédio no mapa de calor.
* No DevTools: tempo de troca de bairro, heap da aba e número de requisições,
  antes e depois.

**Quando fazer:** quando a densidade da Fase 1 não bastar (bairros grandes
travando no primeiro recorte), ou quando a dependência do bucket do Overture
voltar a causar problema.



