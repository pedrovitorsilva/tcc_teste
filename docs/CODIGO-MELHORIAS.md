# Mapa — Pontos de melhoria

### Agrupar elementos 3D .tsx em codigo central

Diminuir tamanho dos arquivos Buildings3D.tsx, Cars3D.tsx, Trees3D.tsx e Water3D.tsx, agrupando logica em arquivo .tsx ou .ts generico na medida do possivel.

### Modo noturno com luzes em postes e luzes nos carros


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

**Hoje:** a leitura de dado mockado está espalhada — `useGeoIndex` sabe a URL
`/data/bairros.geojson`, `config/levels.ts` também sabe essa URL,
separadamente.

**Quando fazer:** como um passo de nomeação/organização de custo quase zero,
*quando* 1 acontecer (quem passar a possuir a leitura do arquivo é o
dono natural dessas funções) — não como tarefa isolada com a estrutura atual.

### Suspense/loading como preparação

> **Veredito pós-debate: ⛔ Descartado por ora** — mais forte que a proposta
> original de "baixa prioridade, só registrar".

**Hoje:** não há `loading.tsx` nem `<Suspense>`.


**Quando reconsiderar:** só quando existir latência real (de rede ou de
banco de dados) para testar o fallback contra ela.



