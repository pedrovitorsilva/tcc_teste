# Transparência de procedência na ficha — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A ficha passa a dizer, para cada número, de onde ele vem (oficial, estimado, amostral), quanto o método erra, quanto da população fica fora dos loteamentos e quão confiável é cada loteamento — reunido numa legenda "Como ler os números".

**Architecture:** Três números novos nascem no ETL (`dados/etl/etl.ipynb`): resíduo por bairro, erro típico do método (validação agregar-desagregar) e um flag de sobra visível. O front só lê esses campos dos GeoJSON já carregados — nenhum fetch novo, nenhuma prop nova atravessando `MapView`. A interpretação da qualidade é uma função pura (`src/lib/qualidade.ts`), testada com `node --test`.

**Tech Stack:** Python/GeoPandas (notebook do ETL), Next.js 14 + React 18 + TypeScript, Tailwind v4, Node 26 (`node --test` com type stripping nativo).

**Spec:** as 5 melhorias da conversa de 2026-10-29 (itens 1–5 abaixo), parte da ideia "B + A rebaixada" do artigo NIRE/SBSI 2027:
1. Sobra explicada: "X pessoas (Y%) moram fora de qualquer loteamento" + entrada de legenda da hachura.
2. Selo de procedência: oficial / estimado / amostral, com forma e texto.
3. Erro típico ao lado do "≈", vindo da validação B3.
4. Qualidade em faixa (boa / média / baixa) e dica de amostra visível no toque.
5. Legenda "Como ler os números" reunindo os mecanismos.

## Global Constraints

- **Antes da Task 1, perguntar ao usuário se quer uma branch separada** (CLAUDE.md: implementação grande). Não assumir `master`.
- **Nunca subir o servidor** (`npm run dev`, `next dev`…). Validação visual: pedir ao usuário para subir e aguardar.
- `npm run build` só com o dev server do usuário parado; para checar tipos usar `npx tsc --noEmit`.
- Não editar `src/components/ui/map.tsx`.
- Arquivos temporários (screenshots, scripts de diagnóstico) só em `temp/`; apagar ao fim.
- Sem dependência nova de runtime.
- `dados/` **não** está no repositório `teste/`: mudanças do notebook não entram em commit deste repo; só os outputs copiados para `public/data/`.
- Distinção nunca só por cor (regra do design system): todo selo/faixa tem texto **e** forma.
- `null` continua sendo "—" (`SEM_VALOR`), nunca zero.
- Textos de interface em pt-BR, frases curtas, sem jargão ("Eq. 1" não aparece na UI).
- Comentários no código: densidade e idioma (pt-BR) iguais aos dos arquivos vizinhos.

## Review Focus

1. **Bairro sem polígono de sobra** (8 bairros, ex.: Centro): resíduo > 0 mas nada hachurado — a frase não pode mandar olhar uma hachura que não existe. Teste: `textoSobra` com `tem_area: false` (Task 2).
2. **Distritos e zona rural da sede** não têm loteamentos nem `residuo`: a ficha não mostra a linha de sobra. Teste: `textoSobra(null)` → `null` (Task 2).
3. **Loteamento sem endereço no CNEFE** (`pct_coord_precisas: null`): linha de coordenadas "—", sem faixa, e a faixa geral ignora o item nulo em vez de quebrar. Teste em `avaliarQualidade` (Task 2).
4. **Loteamento aproximado com coordenadas boas**: a geral é baixa (decisão do usuário em 2026-10-29: limites aproximados pesam mais), mas a linha de coordenadas continua mostrando "boa". Teste em `avaliarQualidade` (Task 2).
5. **Outputs do ETL antigos em `public/data`** (campos novos ausentes): a ficha deve continuar renderizando sem o erro típico e sem a linha de sobra, não quebrar. Coberto por tipos opcionais (`?:`) e pelo teste `textoSobra(undefined)` (Task 2).

---

### Task 1: ETL — resíduo por bairro, erro típico do método (B3) e flag de sobra

**Files:**
- Modify: `../dados/etl/etl.ipynb` (células indicadas pelo índice atual; cabeçalhos entre parênteses)
- Modify: `../dados/etl/model/hierarquia_dados.md` (§4.2, §4.3, §4.5)
- Copy: `../dados/etl/output/{bairros_e_distritos,loteamentos,sobras}.geojson`, `metadados.json` → `public/data/`

**Interfaces:**
- Produces (JSON):
  - `bairros_e_distritos.geojson` → `properties.residuo: { pop: number; pct: number; tem_area: boolean }` **só em `tipo == "bairro"`**; distritos sem a chave.
  - `loteamentos.geojson` → `properties.qualidade.erro_tipico_metodo: number` (fração 0–1, mesmo valor em todos).
  - `metadados.json` → `validacao.erro_metodo: { mdape: number; p90_ape: number; wape: number; n_setores: number; n_bairros: number; descricao: string }`.

- [ ] **Step 0: Duas correções aprovadas em 2026-10-29 (antes de tudo)**

  - **`fracao` por registro (célula 74).** `COD_UNICO_ENDERECO` não é único no CNEFE (7.082 códigos repetidos: mesmo ponto com casa + fazenda, ou dois domicílios). Agrupar por `cd_endereco` dava ½ a cada registro repetido, mesmo dentro de um único loteamento — e a `fracao` é o numerador da Eq. 1 (célula 107), enquanto o denominador (`enderecos_setor`) conta registros. Efeito medido: ~1.490 endereços residenciais subcontados nos loteamentos, ~3.760 pessoas empurradas para o resíduo. Trocar o agrupamento para o índice do registro do CNEFE (`cnefe_lot.groupby(level=0)`, preservado pelo `sjoin`; garantir `cnefe` com índice único antes). Atualizar a markdown da 4.4.
  - **Coordenada precisa = níveis 1 e 2 (célula 119).** O nível 2 é o ponto do prédio para apartamentos (98% empilhados, complementos "APARTAMENTO 101…"): preciso para saber em que loteamento o endereço está. `coord_precisas_lot = (cnefe_lot["nv_geo_coord"] <= 2)…`. Comentário de uma linha com o porquê.

- [ ] **Step 1: Nova célula "7.4 Validação do método (agregar e desagregar)" logo após a célula 108 (7.2)**

  Para cada bairro (`setores_bairro`, agrupados por `cd_unidade`) com ≥ 2 setores: `P_b = Σ P_s`; previsão `P̂_s = P_b × E_s / Σ E_s`, com `E_s = enderecos_setor` (o mesmo denominador do resíduo). Excluir setores com `pop` nulo ou zero e bairros com `Σ E_s == 0`. Métricas sobre `ape_s = |P̂_s − P_s| / P_s`:
  `mdape = mediana(ape)`, `p90_ape = quantil 0,9`, `wape = Σ|P̂_s − P_s| / Σ P_s`. Guardar em `erro_metodo` (dict acima, valores arredondados a 4 casas) e `ERRO_TIPICO = erro_metodo["mdape"]`.
  `descricao`: `"População oficial do bairro redistribuída aos seus setores pela proporção de endereços residenciais do CNEFE e comparada com a população oficial de cada setor. mdape = erro absoluto percentual mediano."`
  Imprimir as quatro métricas e `n_setores`.

- [ ] **Step 2: Resíduo por bairro na célula 114 (Etapa 8)**

  Antes do laço: `pop_sem_lot = residuo["pop"].groupby(setores.set_index("cd_setor")["cd_unidade"].reindex(residuo.index)).sum()` (mesma expressão da célula 128 — mover para cá e, na 128, reutilizar a variável).
  No laço, depois de `doc.update(aninhar(...))` e só para `u["tipo"] == "bairro"`: com `pop_sem = float(pop_sem_lot.get(cd, 0.0))` e `pop_bairro = doc["demografia"]["pop"]`, gravar `doc["residuo"] = {"pop": round(pop_sem, 1), "pct": round(pop_sem / pop_bairro, 4) if pop_bairro else 0.0, "tem_area": False}`.

- [ ] **Step 3: Erro típico na qualidade do loteamento (célula onde `props_loteamentos[...]["qualidade"]` é montado, Etapa 9)**

  Acrescentar `"erro_tipico_metodo": ERRO_TIPICO` ao dict `qualidade`.

- [ ] **Step 4: Flag de sobra visível na célula 128 (11.1)**

  Após o laço: `for cd in props_sobras: props_unidades[cd]["residuo"]["tem_area"] = True`, e regravar `colecao(props_unidades, unidades.set_index("cd_unidade").geometry, "bairros_e_distritos.geojson")` com comentário de uma linha: o arquivo já foi gravado na 11.0, mas a sobra só existe aqui.

- [ ] **Step 5: Metadados na célula 130 (11.2)**

  `"erro_metodo": erro_metodo` dentro de `validacao`; em `regras`, `"erro_metodo": "validação agregar-desagregar: bairro → setores pelos endereços do CNEFE (ver validacao.erro_metodo)"`.

- [ ] **Step 6: Checagens na célula 133 (Etapa 12)** — acrescentar à lista `checagens`:

```python
("todo bairro tem residuo; distrito não", all(("residuo" in u) == (u["tipo"] == "bairro") for u in uni_p)),
("Σ residuo dos bairros = Σ resíduo dos setores (±1)", abs(sum(u["residuo"]["pop"] for u in uni_p if u["tipo"] == "bairro") - pop_res) <= 1),
("tem_area ⇔ bairro tem sobra", {u["cd_unidade"] for u in uni_p if u.get("residuo", {}).get("tem_area")} == {s["cd_unidade"] for s in sob_p}),
("erro típico em todo loteamento, 0 < e < 1", all(0 < l["qualidade"]["erro_tipico_metodo"] < 1 for l in lot_p)),
("metadados.validacao.erro_metodo presente", {"mdape", "p90_ape", "wape", "n_setores"} <= set(meta["validacao"]["erro_metodo"])),
("nenhum endereço em mais de um loteamento", all(l["qualidade"]["enderecos_compartilhados"] == 0 for l in lot_p)),
```

- [ ] **Step 7: Rodar o notebook inteiro (Kernel → Restart & Run All)**

  Esperado: Etapa 12 com todas as checagens ✔; resíduo dos bairros **menor** que os 24.579 de antes (~3,7 mil a menos, pela correção da `fracao`) e alocada maior na mesma medida; Σ residuo dos bairros = `pop_residuo_bairros`. **Anotar mdape, p90, wape, alocada e resíduo** — são números do artigo.

- [ ] **Step 8: Copiar outputs, regenerar prédios e documentar o esquema**

  Copiar os 4 arquivos para `public/data/`. Rodar `npm run prepare-data` (o hash dos GeoJSON mudou: regenera `public/tiles/predios`, baixa ~65 MB). Conferir se os números do clipe do Recreio (`recreioClipDados.ts`, DECISOES §7) mudaram; se sim, registrar como pendência (regravar o clipe não faz parte deste plano). Em `hierarquia_dados.md`, acrescentar `residuo` ao exemplo §4.2, `erro_tipico_metodo` ao §4.3 e `erro_metodo` ao §4.5, e corrigir o texto de `enderecos_compartilhados`/`pct_coord_precisas`.

- [ ] **Step 9: Commit**

```bash
git add public/data/bairros_e_distritos.geojson public/data/loteamentos.geojson public/data/sobras.geojson public/data/metadados.json public/tiles/predios
git commit -m "data(etl): count CNEFE records once, residue per bairro and method error"
```

---

### Task 2: Tipos, funções puras de procedência/qualidade/sobra e o check

**Files:**
- Modify: `src/types/map.ts` (`UnidadeProperties`, `LoteamentoProperties["qualidade"]`)
- Create: `src/config/procedencia.ts`
- Create: `src/lib/qualidade.ts`
- Create: `scripts/check-transparencia.mjs`
- Modify: `package.json` (script `check`)

**Interfaces:**
- Consumes: campos JSON da Task 1.
- Produces:
  - `UnidadeProperties.residuo?: { pop: number; pct: number; tem_area: boolean }`
  - `LoteamentoProperties["qualidade"].erro_tipico_metodo?: number`
  - `config/procedencia.ts`: `type Procedencia = 'oficial' | 'estimado' | 'amostral'`; `PROCEDENCIA: Record<Procedencia, { rotulo: string; descricao: string; borda: 'solid' | 'dashed' | 'dotted' }>`
  - `lib/qualidade.ts`: `type Faixa = 'boa' | 'media' | 'baixa'`; `ROTULO_FAIXA: Record<Faixa, string>`; `LIMIARES`; `avaliarQualidade(q: LoteamentoProperties['qualidade'], isReliable: boolean): AvaliacaoQualidade`; `textoSobra(residuo: UnidadeProperties['residuo'] | null | undefined): string | null`
  - `interface ItemQualidade { chave: 'limites' | 'coordenadas'; valor: number | null; faixa: Faixa | null }`; `interface AvaliacaoQualidade { geral: Faixa; itens: ItemQualidade[] }`

`lib/qualidade.ts` só pode ter `import type` (apagado pelo Node) e nenhum import de valor com alias `@/` — é o que deixa o check rodar sem bundler.

Valores fixados (simulados em 2026-10-29 com a correção do nível 2: coordenadas 155/8/2, **geral 94 boa / 4 média / 68 baixa**, sendo 66 das baixas por limites aproximados). A métrica "divisa" saiu: não há endereço em mais de um loteamento (ver Task 1, Step 0):

```ts
export const LIMIARES = {
  /** Fração de endereços com coordenada precisa (nv_geo_coord 1 ou 2): ≥ boa, ≥ média, abaixo baixa. */
  coordenadas: { boa: 0.95, media: 0.8 },
} as const;
export const ROTULO_FAIXA: Record<Faixa, string> = { boa: 'boa', media: 'média', baixa: 'baixa' };
```

Textos de `PROCEDENCIA` (copy fixada):

| chave | rotulo | borda | descricao |
|---|---|---|---|
| oficial | `oficial` | solid | `Contagem publicada pelo IBGE (Censo 2022) ou pelo INEP.` |
| estimado | `estimado` | dashed | `População do setor censitário repartida entre loteamentos pela proporção de endereços do CNEFE.` |
| amostral | `amostral` | dotted | `Amostra do Censo 2022 para a área de ponderação inteira, não só para este loteamento.` |

`textoSobra` (copy fixada; números via `Intl` pt-BR, inteiro e 1 casa decimal):
- `tem_area: true` → `≈ {pop} moradores ({pct}) vivem fora de qualquer loteamento, na área hachurada do mapa.`
- `tem_area: false` → `≈ {pop} moradores ({pct}) vivem fora de qualquer loteamento, em trechos pequenos entre eles.`
- `null`/`undefined` → `null`

- [ ] **Step 1: Escrever o check falhando — `scripts/check-transparencia.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avaliarQualidade, textoSobra } from '../src/lib/qualidade.ts';

const q = (coord) => ({ sobreposicao_pct: 0, enderecos_compartilhados: 0, contem_sigilo: [], pct_coord_precisas: coord });

test('pior das duas vence', () => {
  assert.equal(avaliarQualidade(q(0.99), true).geral, 'boa');
  assert.equal(avaliarQualidade(q(0.85), true).geral, 'media');
  assert.equal(avaliarQualidade(q(0.5), true).geral, 'baixa');
});
test('limites aproximados levam a geral para baixa, mas a linha de coordenadas segue boa', () => {
  const a = avaliarQualidade(q(0.99), false);
  assert.equal(a.geral, 'baixa');
  assert.deepEqual(a.itens.map((i) => [i.chave, i.faixa]), [['limites', 'baixa'], ['coordenadas', 'boa']]);
});
test('limiares inclusivos', () => {
  assert.equal(avaliarQualidade(q(0.95), true).geral, 'boa');
  assert.equal(avaliarQualidade(q(0.8), true).geral, 'media');
});
test('coordenada sem dado vira null e não derruba a faixa geral', () => {
  const a = avaliarQualidade(q(null), true);
  assert.deepEqual(a.itens.map((i) => i.faixa), ['boa', null]);
  assert.equal(a.geral, 'boa');
});
test('textoSobra', () => {
  assert.equal(textoSobra({ pop: 1306, pct: 0.571, tem_area: true }),
    '≈ 1.306 moradores (57,1%) vivem fora de qualquer loteamento, na área hachurada do mapa.');
  assert.equal(textoSobra({ pop: 85.9, pct: 0.0085, tem_area: false }),
    '≈ 86 moradores (0,9%) vivem fora de qualquer loteamento, em trechos pequenos entre eles.');
  assert.equal(textoSobra(null), null);
  assert.equal(textoSobra(undefined), null);
});
```

- [ ] **Step 2: Rodar e ver falhar**

  Run: `node --test scripts/check-transparencia.mjs` → Expected: FAIL (`Cannot find module .../src/lib/qualidade.ts`).

- [ ] **Step 3: Implementar tipos, `config/procedencia.ts` e `lib/qualidade.ts`** com as assinaturas e valores acima. Ordem fixa de `itens`: `limites` (valor `null`, faixa `boa`/`baixa` por `isReliable`), `coordenadas` (valor = `pct_coord_precisas`). `geral` = pior faixa não nula. Formatar em `textoSobra` com `Intl.NumberFormat` local ao arquivo (não importar `fmt` de `@/config/indicadores`).

- [ ] **Step 4: Rodar e ver passar** — `node --test scripts/check-transparencia.mjs` → Expected: `pass 5`. Depois `npx tsc --noEmit` → sem erros.

- [ ] **Step 5: Script e commit** — em `package.json`, `"check": "node --test scripts/check-transparencia.mjs"`.

```bash
git add src/types/map.ts src/config/procedencia.ts src/lib/qualidade.ts scripts/check-transparencia.mjs package.json
git commit -m "feat(ficha): provenance labels, quality bands and residue text as pure functions"
```

---

### Task 3: Selo de procedência nas seções e nos números-chave (item 2)

**Files:**
- Create: `src/components/panel/Selo.tsx`
- Modify: `src/components/panel/FichaSecoes.tsx` (`Secao`, `SecoesCenso`, `SecaoEscolas`, `SecaoEnderecos`, `SecaoAreaPonderacao`)
- Modify: `src/components/panel/FeatureDetails.tsx` (`BairroBody`, `LoteamentoBody`)

**Interfaces:**
- Consumes: `Procedencia`, `PROCEDENCIA` (Task 2).
- Produces: `Selo({ tipo }: { tipo: Procedencia }): JSX.Element`; `Secao` ganha `selo?: Procedencia`.

- [ ] **Step 1: `Selo.tsx`** — pílula inline: `PROCEDENCIA[tipo].rotulo` em `text-[11px]`, borda 1px no estilo `PROCEDENCIA[tipo].borda`, cor `text-ink-soft` para `oficial` e `text-uncertain` para os outros dois, `title` e `aria-label` = `descricao`. Forma (borda) + texto: nada só por cor.

- [ ] **Step 2: `Secao` com `selo`** — renderizar `<Selo>` no `summary`, depois do título e antes do `›`.

- [ ] **Step 3: Aplicar** —
  - `SecoesCenso`: as 5 seções recebem `selo={estimado ? 'estimado' : 'oficial'}`.
  - `SecaoEscolas`: `selo="oficial"`; o subtítulo "Fora da escola (estimativa)" vira "Fora da escola" + `<Selo tipo="estimado" />`.
  - `SecaoEnderecos`: `selo="oficial"`. `SecaoAreaPonderacao`: `selo="amostral"`. `SecaoQualidade` e "Sobre o mapa 3D": sem selo.
  - `BairroBody`: logo após `<NumerosChave>`, `<p className="cv-note-body mt-2"><Selo tipo="oficial" /> Censo 2022, soma dos setores do IBGE.</p>`.
  - `LoteamentoBody`: a frase existente `≈ estimativa: Censo por setor repartido pelos endereços do CNEFE.` passa a ser `<Selo tipo="estimado" /> Censo por setor repartido pelos endereços do CNEFE.`

- [ ] **Step 4: Verificar** — `npx tsc --noEmit` sem erros; `npm run check` passa.

- [ ] **Step 5: Commit**

```bash
git add src/components/panel/Selo.tsx src/components/panel/FichaSecoes.tsx src/components/panel/FeatureDetails.tsx
git commit -m "feat(ficha): provenance label (oficial/estimado/amostral) on every section"
```

---

### Task 4: Sobra explicada na ficha do bairro (item 1)

**Files:**
- Create: `src/components/panel/HachuraAmostra.tsx`
- Modify: `src/components/panel/FeatureDetails.tsx` (`BairroBody`)

**Interfaces:**
- Consumes: `textoSobra` (Task 2), `UnidadeProperties.residuo`.
- Produces: `HachuraAmostra({ espelhada }: { espelhada?: boolean }): JSX.Element` — amostra 20×12 px em CSS `repeating-linear-gradient` na cor `var(--uncertain)`, 45° (aproximado) ou 135° quando `espelhada` (sobra), do mesmo jeito que `lib/map/hachurePattern.ts` desenha no mapa. `aria-hidden`. Reutilizada na Task 7.

- [ ] **Step 1: `HachuraAmostra.tsx`** com a assinatura acima.

- [ ] **Step 2: `BairroBody`** — depois da linha de procedência (Task 3) e antes de `<Comparacao>`: se `textoSobra(unidade.residuo)` não for `null`, um `<p className="cv-note-body mt-1 flex items-start gap-2">` com `<HachuraAmostra espelhada />` só quando `tem_area` e o texto.

- [ ] **Step 3: Verificar** — `npx tsc --noEmit`; `npm run check`.

- [ ] **Step 4: Commit**

```bash
git add src/components/panel/HachuraAmostra.tsx src/components/panel/FeatureDetails.tsx
git commit -m "feat(ficha): show population outside any loteamento on the bairro card"
```

---

### Task 5: Erro típico ao lado do "≈" (item 3)

**Files:**
- Modify: `src/components/panel/FichaResumo.tsx` (`Kpi`, `NumerosChave`)
- Modify: `src/components/panel/FeatureDetails.tsx` (`LoteamentoBody`)

**Interfaces:**
- Consumes: `qualidade.erro_tipico_metodo` (Task 1/2), `fmt.pct`.
- Produces: `Kpi.detalhe?: string`, renderizado sob o valor em `cv-note-body`.

- [ ] **Step 1: `Kpi.detalhe`** — `<dd>` continua com o valor; se houver `detalhe`, uma linha menor logo abaixo.

- [ ] **Step 2: `LoteamentoBody`** — com `const erro = lot.qualidade.erro_tipico_metodo`, os itens "Moradores" e "Domicílios" ganham `detalhe: erro != null ? \`erro típico ±${fmt.pct(erro)}\` : undefined`. Na frase de procedência (Task 3), acrescentar ` Erro típico do método: ±{fmt.pct(erro)}.` quando `erro != null`.

- [ ] **Step 3: Verificar** — `npx tsc --noEmit`; `npm run check`.

- [ ] **Step 4: Commit**

```bash
git add src/components/panel/FichaResumo.tsx src/components/panel/FeatureDetails.tsx
git commit -m "feat(ficha): typical method error next to loteamento estimates"
```

---

### Task 6: Qualidade em faixas e dica de amostra visível no toque (item 4)

**Files:**
- Modify: `src/components/panel/FichaSecoes.tsx` (`Linha`, `SecaoAreaPonderacao`, `SecaoQualidade`)
- Modify: `src/components/panel/FeatureDetails.tsx` (chamada de `SecaoQualidade`)

**Interfaces:**
- Consumes: `avaliarQualidade`, `ROTULO_FAIXA`, `Faixa` (Task 2).
- Produces: `Linha` troca `titulo?: string` (só usado na AP) por `nota?: string`, renderizada **visível** abaixo da linha (`cv-note-body`). `SecaoQualidade({ qualidade, isReliable })`.

- [ ] **Step 1: `Linha.nota`** — remover `titulo`; com `nota`, renderizar o texto sob a linha. Em `SecaoAreaPonderacao`: `nota={ind?.suprimido ? \`menos de 30 respostas na amostra (n = ${ind.n})\` : undefined}`.

- [ ] **Step 2: `SecaoQualidade`** — título `Qualidade da estimativa: ${ROTULO_FAIXA[geral]}` (lido com a seção fechada). Linhas, nesta ordem:
  - `Limites do loteamento` → `confirmados` | `aproximados`
  - `Endereços com coordenada precisa` → `{fmt.pct(valor)} · {ROTULO_FAIXA[faixa]}`

  Cada faixa leva também a forma `●●●` (boa), `●●○` (média), `●○○` (baixa), `aria-hidden`. Linha `null` → `fmt.pct(null)` ("—"), sem faixa. Rodapé: `A qualidade geral é a pior das duas linhas.` As linhas "Área sobreposta a outros loteamentos" e "Endereços em mais de um loteamento" saem da UI: valem 0 em todos os 166 (a segunda, depois da correção da Task 1).

- [ ] **Step 3: `LoteamentoBody`** — `<SecaoQualidade qualidade={lot.qualidade} isReliable={isReliable} />`.

- [ ] **Step 4: Verificar** — `npx tsc --noEmit`; `npm run check`; `grep -rn "titulo=" src/components/panel/FichaSecoes.tsx` sem uso de `Linha titulo`.

- [ ] **Step 5: Commit**

```bash
git add src/components/panel/FichaSecoes.tsx src/components/panel/FeatureDetails.tsx
git commit -m "feat(ficha): quality bands and touch-visible sample-size note"
```

---

### Task 7: Legenda "Como ler os números" (item 5)

**Files:**
- Create: `src/components/panel/ComoLer.tsx`
- Modify: `src/components/panel/FeatureDetails.tsx` (`BairroBody`, `LoteamentoBody`)

**Interfaces:**
- Consumes: `Secao`, `Selo`, `PROCEDENCIA`, `HachuraAmostra`, `fmt.pct`.
- Produces: `ComoLer({ erroTipico }: { erroTipico?: number | null }): JSX.Element` — uma `Secao` recolhida com título `Como ler os números`.

- [ ] **Step 1: `ComoLer.tsx`** — lista de definições, uma linha por mecanismo, sempre amostra visual + texto (copy fixada):
  1. `<Selo tipo="oficial" />`, `<Selo tipo="estimado" />`, `<Selo tipo="amostral" />` → a `descricao` de cada um em `PROCEDENCIA`.
  2. `≈` → `Valor estimado, não contado.` + quando houver `erroTipico`: ` Metade dos testes do método errou menos de ±{fmt.pct(erroTipico)}.`
  3. `—` → `Sem valor: sigilo do IBGE (área com poucos domicílios) ou amostra com menos de 30 respostas.`
  4. `<HachuraAmostra />` → `Loteamento com limites aproximados, sem confirmação em cadastro oficial.`
  5. `<HachuraAmostra espelhada />` → `Parte do bairro fora de qualquer loteamento.`
  6. Quadrado cinza (mesma cor de `semDado` da legenda do mapa de calor; usar `var(--ink-faint)` se o token não for exposto) → `No mapa de calor: área sem dado, nunca zero.`

- [ ] **Step 2: Montar** — `<ComoLer />` no `BairroBody` e `<ComoLer erroTipico={lot.qualidade.erro_tipico_metodo} />` no `LoteamentoBody`, como **primeira** seção do bloco `mt-5` (antes de Loteamentos / SecoesCenso).

- [ ] **Step 3: Verificar** — `npx tsc --noEmit`; `npm run check`.

- [ ] **Step 4: Commit**

```bash
git add src/components/panel/ComoLer.tsx src/components/panel/FeatureDetails.tsx
git commit -m "feat(ficha): 'Como ler os números' legend gathering every provenance cue"
```

---

### Task 8: Documentação e validação visual

**Files:**
- Modify: `docs/DECISOES-TECNICAS.md` (nova §8)
- Modify: `docs/GUIA-DO-PROJETO.md` (§0 "Onde mexer para...", §5)
- Temp: `temp/transparencia-*.png` (apagar no fim)

- [ ] **Step 1: `DECISOES-TECNICAS.md` §8 "Transparência de procedência"** — o porquê de: selo por seção, e não por linha (a origem é a mesma dentro da seção); validação agregar-desagregar (o que mede e o que **não** mede: testa a premissa população ∝ endereços na escala de setor, não a geometria dos loteamentos); limiares de `LIMIARES` com a distribuição medida (94/4/68); por que o nível 2 do CNEFE conta como preciso; o bug da `fracao` por código de endereço e o efeito no resíduo; remoção das linhas de sobreposição e de endereços compartilhados; regravação de `bairros_e_distritos.geojson` na 11.1. Incluir no índice.

- [ ] **Step 2: `GUIA-DO-PROJETO.md`** — em §0, linhas "Mudar os limiares de qualidade → `src/lib/qualidade.ts`" e "Mudar os textos de procedência → `src/config/procedencia.ts`"; em §5, citar `residuo` e `erro_tipico_metodo`.

- [ ] **Step 3: Pedir ao usuário para subir o dev server** e aguardar a confirmação. Depois, com Playwright (script em `temp/`), capturar desktop (1440×900) e mobile (390×844), temas claro e escuro: ficha de **Universidade** (sobra 57,1% com hachura), **Centro** (resíduo sem hachura), um loteamento confiável e um aproximado, e o "Como ler os números" aberto. Conferir: selos legíveis nos 3 temas, faixas com forma, nota de amostra visível sem hover.

- [ ] **Step 4: `npm run check` e `npx tsc --noEmit`** finais; pedir ao usuário para parar o dev server se quiser rodar `npm run build`.

- [ ] **Step 5: Limpar `temp/` e commit**

```bash
git add docs/DECISOES-TECNICAS.md docs/GUIA-DO-PROJETO.md
git commit -m "docs: provenance transparency decisions and where to change them"
```
