# Análise de Componentes React — Cadastro Vivo

**Data:** 2026-09-20 (última atualização: Fase 2 concluída)
**Escopo:** Estrutura, reutilização, granularização e oportunidades de refatoração

> Este documento é atualizado ao final de cada fase de refatoração — não se
> cria um `.md` novo por fase. O estado abaixo reflete o código atual.

---

## 📊 Sumário Executivo

O projeto possui componentes React distribuídos por 4 camadas de organização
(buttons, panel, map, theme) + `src/hooks/` para lógica reutilizável.

- ✅ **Fase 1 concluída:** `ToggleButton` genérico substitui duplicação real; 2
  itens do plano original descartados por não serem duplicação de fato
- ✅ **Fase 2 concluída:** `MapView.tsx` (440→285 lin) e `BottomSheet.tsx`
  (173→111 lin) tiveram lógica extraída para 3 hooks novos
- 🎯 **Risco remanescente:** `MapLayers.tsx` (790 linhas) — único componente
  ainda crítico, Fase 3 pendente

---

## 📁 Estrutura Atual

```
src/components/
├── buttons/
│   ├── IconPopoverButton.tsx (57 lin)      ← Base reutilizável
│   ├── ToggleButton.tsx (30)                ✅ Fase 1 — genérico, substitui os 2 antigos
│   ├── optionsList/
│   │   ├── LayerControls.tsx (60)           ← Checkbox customizado
│   │   ├── LayerControlsPopoverButton.tsx (30)
│   │   ├── PalettePopoverButton.tsx (20)
│   │   ├── PaletteControls.tsx (93)        ← Conteúdo real
│   │   └── OptionsList.tsx (~55)           ← Composição boa, usa ToggleButton
│   └── themeSwitcher/
│       ├── ThemeSwitcher.tsx (37)          ← Botões com estado
│       └── ThemeSwitcherPopoverButton.tsx (29)
├── map/
│   ├── MapLayers.tsx (790 lin)             ⚠️ GRANDE — Fase 3, ainda não feita
│   ├── Buildings3D.tsx (323)
│   ├── FloatingPolygonLabel.tsx (80)
│   ├── FloatingTitle.tsx (13)
│   └── ui/map.tsx (2399 lin - código terceiros)
├── panel/
│   ├── Sidebar.tsx (79)                    ← Desktop
│   ├── BottomSheet.tsx (111)               ✅ Fase 2 — drag logic extraída
│   ├── FeatureDetails.tsx (146)            ← Conteúdo compartilhado
│   ├── NoteCard.tsx (12)                   ✅ Simples, reutilizável
│   ├── CartographerNote.tsx (13)
│   └── BuildingsNote.tsx (16)
├── theme/
│   └── ThemeProvider.tsx (68)
├── SearchBox.tsx (111)                     ✅ Bem estruturado
└── MapView.tsx (285)                       ✅ Fase 2 — orquestrador enxuto

src/hooks/
├── useBreakpoint.ts / useClickOutside.ts / useGeoIndex.ts / useThemeTokens.ts  (pré-existentes)
├── useMapStyles.ts (91)                    ✅ Fase 2 — movido de MapView
├── useMapInteraction.ts (139)              ✅ Fase 2 — seleção/hover/preview
└── useBottomSheetDrag.ts (126)             ✅ Fase 2 — física de arraste
```

---

## 🔍 Análise Detalhada: Componentes por Categoria

> **Nota (pós Fase 1):** as seções 1 e 2 abaixo descrevem o estado ANTES da
> Fase 1. A seção 1 foi implementada como proposto. A seção 2 foi **revista e
> descartada** depois de ler o código completo — não era duplicação real (ver
> "Itens descartados" no plano de execução). Mantidas aqui por histórico.

### 1. **Botões Toggle — ALTO POTENCIAL DE CONSOLIDAÇÃO** ✅ Feito (Fase 1)

| Arquivo | Linhas | Padrão | Problema |
|---------|--------|--------|----------|
| BuildingsToggleButton | 36 | Botão ◯ com state-based fill | Idêntico a TitlePlacementToggleButton |
| TitlePlacementToggleButton | 40 | Botão ◯ com state-based fill | Idêntico a BuildingsToggleButton |
| **Duplicação de código** | — | — | **~70% de overlap** |

**Código atual (Buildings...):**
```tsx
// 36 linhas com estilos Tailwind duplicados
export function BuildingsToggleButton({ enabled, onChange, className }) {
  const label = enabled ? '...' : '...';
  return (
    <button className={cn('flex h-11 w-11 items-center ... rounded-full ...', className)}
      style={enabled ? { background: 'var(--ink)', borderColor: 'var(--ink)' } : undefined}
    >
      {icon}
    </button>
  );
}
```

**Ganho com consolidação:**
```tsx
// 1 componente genérico = 15 linhas
function ToggleButton({ icon, label, pressed, onChange, className }) {
  return (
    <button 
      aria-pressed={pressed} 
      onClick={() => onChange(!pressed)}
      className={cn('flex h-11 w-11 items-center justify-center rounded-full ...', className)}
      style={pressed ? { background: 'var(--ink)', borderColor: 'var(--ink)' } : undefined}
      title={label}
    >
      {icon}
    </button>
  );
}

// Usos reduzem para 8 linhas cada
<ToggleButton icon={BuildingIcon} label="3D Buildings" pressed={enabled} onChange={setBuildingsEnabled} />
```

**Redução:** 76 → 31 linhas (-59% nas 2 variantes) + 15 linhas base = net -30 linhas

---

### 2. **Popovers com Icon Button — MÉDIO POTENCIAL** ❌ Descartado (Fase 1)

**Reavaliado e não implementado.** Ao ler o código completo dos 3 wrappers,
cada um encapsula uma árvore de children real (`ThemeSwitcher`,
`LayerControls`, `PaletteControls`) e um `panelPosition` próprio — é
composição correta sobre `IconPopoverButton`, não código repetido. Inlinar
pioraria `MapView.tsx`/`OptionsList.tsx` sem eliminar lógica de verdade.
Análise original abaixo mantida por histórico.

| Arquivo | Linhas | Base | Padrão |
|---------|--------|------|--------|
| ThemeSwitcherPopoverButton | 29 | IconPopoverButton | Wrapper trivial |
| LayerControlsPopoverButton | 30 | IconPopoverButton | Wrapper trivial |
| PalettePopoverButton | 20 | IconPopoverButton | Wrapper trivial |

**Problema:** Cada um apenas passa props para `IconPopoverButton` + renderiza conteúdo.

**Solução:**
```tsx
// Factory: define popover sem repetição de wrapper
const PopoverButton = ({
  icon, ariaLabel, title, panelPosition, children, className
}) => (
  <IconPopoverButton {...{ icon, ariaLabel, title, panelPosition, className }}>
    {children}
  </IconPopoverButton>
);

// Usos descrevem a intenção, não repetem lógica
<PopoverButton icon={LayersIcon} ... >
  <LayerControls {...} />
</PopoverButton>
```

**Redução:** Possível eliminar os 3 wrappers triviais, deixar só conteúdo de negócio (LayerControls, PaletteControls, etc)
- **Antes:** 29 + 30 + 20 = 79 linhas de wrappers
- **Depois:** 0 linhas (absorvidas em OptionsList ou renderizadas direto)

---

### 3. **Checkbox Customizado — BAIXO POTENCIAL (já bem feito)** ❌ Descartado (Fase 1)

Confirmado: `PaletteControls.tsx` não usa checkbox (presets + `<input
type="color">` nativo). Sem segundo consumidor real, extrair seria abstração
prematura (YAGNI).

| Arquivo | Linhas | Situação |
|---------|--------|----------|
| LayerControls | 60 | Define checkbox inline, mas bem estruturado |

**Avaliação:** Checkpoint customizado com icone "✓" é específico. Não vale a pena extrair (overhead > ganho).

---

### 4. **ThemeSwitcher — BAIXO POTENCIAL**

| Arquivo | Linhas | Situação |
|---------|--------|----------|
| ThemeSwitcher | 37 | Bem composto, padrão claro |

Não há duplicação; padrão map + button é claro.

---

## 🔴 Componentes Grandes — Candidatos a Divisão

### MapView.tsx — 440 → **285 linhas** ✅ Feito (Fase 2)

Extraídos 3 hooks: `useMapStyles` (movido verbatim), `useMapInteraction`
(consolida 5 dos 9 `useState` + handlers de seleção/hover/preview + os 2
`useEffect` relacionados) e `useBottomSheetDrag` (usado só por `BottomSheet`,
mas as constantes `PREVIEW_FRACTION`/`EXPANDED_FRACTION` — que estavam
duplicadas em `MapView` e `BottomSheet` — passaram a ser importadas de lá).
JSX inalterado; ficaram em `MapView.tsx` apenas os states sem relação com
seleção (`layerToggles`, `buildingCount`, `buildingsEnabled`,
`titleInPolygon`) e os memos que misturam múltiplas fontes (`floatingTitle`,
`mapLabelTarget`, `fitPadding`).

### BottomSheet.tsx — 173 → **111 linhas** ✅ Feito (Fase 2)

Extraída a física de arraste (`useBottomSheetDrag.ts`, 126 linhas): states,
refs, o `useLayoutEffect` de altura e os handlers de pointer. Detalhe
preservado: o `useLayoutEffect` depende de `selection?.featureId`/`.level`
(não só de `isOpen`) para remedir a altura quando o usuário troca de seleção
com a folha já aberta — se dependesse só de `isOpen`, trocar de bairro A para
B sem fechar a folha deixaria a altura "expandida" desatualizada.

---

### MapLayers.tsx — **790 linhas** ⚠️ CRÍTICO — pendente (Fase 3)
**Atual:** Renderiza todas as camadas do mapa + efeitos de click + custom paint properties  
**Responsabilidades:**
1. Carrega dados GeoJSON + indexação + caching (~100 lin)
2. Estilos dinâmicos por tema com MapLibre expressions (~200 lin)
3. Event handlers (click, hover, preview) (~120 lin)
4. Renderização de camadas com layer helpers (~370 lin)

**Proposta de divisão (ainda não implementada):**

```
MapLayers/
├── MapLayers.tsx (250 lin)      ← Orquestrador de camadas
├── useGeoLayerStyles.ts (80)    ← Cálculo de estilos
├── useBairroLayer.ts (120)      ← Camada específica
├── useLoteamentoLayer.ts (120)  ← Camada específica
├── useSetorLayer.ts (100)       ← Camada específica
└── useMapLayerHandlers.ts (60)  ← Todos os event handlers
```

**Ganho esperado:** Cada hook é responsável por 1 camada, testes isolados, manutenção por tema.

---

## 📋 Tabela Consolidada: Todos os Componentes

| Arquivo | Linhas | Categoria | Manutenibilidade | Oportunidade | Prioridade |
|---------|--------|-----------|------------------|-------------|-----------|
| **ToggleButton** | 30 | Button | ✅ Excelente | Genérico, criado na Fase 1 | ✅ Novo |
| **IconPopoverButton** | 57 | Button | ✅ Boa | Base OK, manter | ✅ Keep |
| **BuildingsNote** | 16 | Button | ✅ Boa | Usar NoteCard (já faz) | ✅ Keep |
| **OptionsList** | ~55 | Button | ✅ Boa | Deduplicado (Fase 1) | ✅ Feito |
| **LayerControls** | 60 | Button | ✅ Boa | Manter, específico | ✅ Keep |
| **ThemeSwitcher** | 37 | Button | ✅ Boa | Manter, padrão claro | ✅ Keep |
| **CartographerNote** | 13 | Panel | ✅ Boa | Usa NoteCard OK | ✅ Keep |
| **NoteCard** | 12 | Panel | ✅ Excelente | Reutilizável, padrão | ✅ Modelo |
| **SearchBox** | 111 | Panel | ✅ Boa | Bem dividido SearchBox/SearchResult | ✅ Keep |
| **Sidebar** | 79 | Panel | ✅ Boa | Compartilha FeatureDetails OK | ✅ Keep |
| **BottomSheet** | 111 | Panel | ✅ Boa | Drag logic extraída (Fase 2) | ✅ Feito |
| **FeatureDetails** | 146 | Panel | ✅ Boa | Bem dividido BairroBody/LoteamentoBody | ✅ Keep |
| **MapView** | 285 | App | ✅ Boa | Hooks extraídos (Fase 2) | ✅ Feito |
| **FloatingPolygonLabel** | 80 | Map | ✅ Boa | Manter | ✅ Keep |
| **FloatingTitle** | 13 | Map | ✅ Boa | Manter | ✅ Keep |
| **Buildings3D** | 323 | Map | 🟡 Média | Revisar lógica WebGL | 🟡 Med |
| **MapLayers** | 790 | Map | 🔴 Muito grande | **Dividir por camada** | 🔴 Alt — Fase 3 |
| **ThemeProvider** | 68 | Theme | ✅ Boa | Manter | ✅ Keep |
| **icons/index** | 34 | Util | ✅ Boa | Manter | ✅ Keep |
| **PaletteControls** | 93 | Button | ✅ Boa | Manter | ✅ Keep |
| **useMapStyles** (hook) | 91 | Hook | ✅ Boa | Movido de MapView (Fase 2) | ✅ Novo |
| **useMapInteraction** (hook) | 139 | Hook | ✅ Boa | Extraído de MapView (Fase 2) | ✅ Novo |
| **useBottomSheetDrag** (hook) | 126 | Hook | ✅ Boa | Extraído de BottomSheet (Fase 2) | ✅ Novo |

---

## 🎯 Boas Práticas: Pesquisa + Recomendações

### **1. Granularização de Componentes (React 18+)**

#### ✅ O que fazer:
- **1 responsabilidade = 1 componente** — componentes com <100 linhas são mais testáveis
- **Compound Components pattern** para UI complexa (Checkbox + Label + Error) — vê ThemeSwitcher
- **Hooks customizados** para lógica (useBottomSheetDrag, useMapStyles já existem)
- **Context apenas para contexto global** (theme, auth) — não para state local

#### ❌ O que evitar:
- Componentes > 300 linhas (MapLayers, MapView estão no limite)
- Misturar state, UI e side effects (MapView faz os 3)
- Props drilling profundo (use Context apenas quando necessário)

#### 📍 Seu projeto — alinhado com boas práticas:
✅ Já usa hooks customizados (useClickOutside, useTheme, useGeoIndex)  
✅ Já separa conteúdo de "wrappers" (FeatureDetails vs Sidebar/BottomSheet)  
⚠️ MapView/MapLayers violam a regra de 100 linhas

---

### **2. Estrutura de Pastas Recomendada**

#### **Padrão do seu projeto (atual):**
```
src/components/
├── buttons/          ← Por tipo de interação (bom para apps de desktop)
├── map/
├── panel/
└── theme/
```

#### **Alternativa: Feature-first (recomendada p/ projetos > 15 componentes)**
```
src/features/
├── map/
│   ├── MapView.tsx
│   ├── MapLayers.tsx
│   ├── MapControls.tsx
│   └── hooks/
│       ├── useMapStyles.ts
│       └── useMapLayerStyles.ts
├── sidebar/
│   ├── Sidebar.tsx
│   ├── FeatureDetails.tsx
│   └── SearchBox.tsx
├── theme/
│   ├── ThemeSwitcher.tsx
│   └── ThemeProvider.tsx
└── shared/
    ├── IconPopoverButton.tsx
    ├── ToggleButton.tsx
    └── NoteCard.tsx
```

#### **Decisão para Cadastro Vivo:**
Seu projeto é mapa-cêntrico → feature-first faz mais sentido que type-based. Mas dado o tamanho (26 componentes), o tipo-based **vai até ~40 componentes** sem problemas críticos.

---

### **3. Reutilização — Padrões Atuais + Oportunidades**

| Padrão | Uso Atual | Oportunidade |
|--------|-----------|--------------|
| **Compound Components** | ThemeSwitcher (buttons) | LayerControls (se crescer) |
| **Custom Hooks** | useClickOutside, useTheme, useGeoIndex | ✅ Bom uso |
| **Context** | ThemeProvider | ✅ Apropriado |
| **Factory** | IconPopoverButton | Wrappers triviais (ThemeSwitcherPopoverButton) |
| **Shared Utils** | cn (className merge) | ✅ Manter, expandir se necessário |

**Seu projeto já segue boas práticas de hooks e Context.** O ganho é eliminar wrappers triviais e consolidar toggle buttons.

---

### **4. Mantibilidade — Scoring Atual**

| Dimensão | Score | Situação |
|----------|-------|----------|
| **Clareza de responsabilidade** | 8/10 | Boa separação, mas MapView/MapLayers fazem muito |
| **Testabilidade** | 7/10 | Hooks são testáveis, componentes grandes são não |
| **Reutilização** | 7/10 | Popovers geram wrapper trivials, toggle buttons se repetem |
| **Consistência** | 9/10 | Padrões CSS, nomes, estrutura muito consistente |
| **Documentação** | 8/10 | Comentários bons onde necessário (em pontual) |
| **Performance** | 8/10 | Sem re-renders óbvios, useMemo OK |

**Score geral: 7.8/10 — Muito bom para um projeto em produção**  
Ganho com refatoração: +1.5 pontos (testabilidade, reuso)

---

## 💡 Plano de Ação — Priorizado por Impacto

### **Fase 1: Ganho Rápido (2–3h)**
Reduz ~150 linhas, alto impacto em manutenção:

1. **Crear ToggleButton genérico**
   - Elimina BuildingsToggleButton + TitlePlacementToggleButton
   - **Redução:** 76 → 15 linhas base, usos ~8 cada
   - **Arquivo:** src/components/buttons/ToggleButton.tsx

2. **Eliminar wrappers PopoverButton triviais**
   - Remove ThemeSwitcherPopoverButton, LayerControlsPopoverButton, PalettePopoverButton
   - **Redução:** 79 linhas de wrappers
   - **Ação:** Render direto em OptionsList ou move IconPopoverButton call

3. **Verficar duplicação mobile/desktop no MapView**
   - OptionsList é renderizado 2x com mesmo props (linhas 397–404, 410–417)
   - **Redução:** 10 linhas, 1 renderização
   - **Ação:** Extrair para variável, render condicional

---

### **Fase 2: Refatoração Estrutural (4–6h)**
Organiza componentes grandes em unidades menores:

1. **MapView: Extrair useMapStyles**
   - Já existe, só mover para arquivo próprio `hooks/useMapStyles.ts`
   - **Redução:** MapView 413 → 350 linhas
   - **Benefício:** Reutilizável, testável

2. **MapView: Consolidar handlers em hook**
   - handleSelect, handleNavigate, handlePreview, handleClose
   - **Novo arquivo:** `hooks/useMapInteraction.ts`
   - **Redução:** MapView 350 → 250 linhas
   - **Benefício:** Lógica isolada, fácil de debugar

3. **BottomSheet: Extrair drag logic**
   - Tudo de pointer/drag em hook `useBottomSheetDrag.ts`
   - **Redução:** BottomSheet 158 → 90 linhas
   - **Benefício:** Reutilizável em outros modals

---

### **Fase 3: Refatoração de MapLayers (8–10h)**
Divide o componente megadão em camadas temáticas:

1. **Extrair estilos dinâmicos em hook**
   - `hooks/useGeoLayerStyles.ts` (cálculo de cores por tema)
   - **Redução:** MapLayers 714 → 600 linhas

2. **Dividir por camada: Bairro, Loteamento, Setor**
   - Cada camada → `useBairroLayer.ts`, `useLoteamentoLayer.ts`, etc
   - **Redução:** MapLayers 600 → ~250 linhas
   - **Benefício:** 1 hook por layer, totalmente isolado

3. **Consolidar handlers**
   - `useMapLayerHandlers.ts` para todos os click/hover/preview
   - **Redução:** +0, mas clareza ++

---

## 📊 Quadro de Impacto — Real (Fases 1 e 2 executadas)

| Ação | Resultado real | Status |
|------|-----------------|--------|
| **Fase 1a:** ToggleButton genérico | -76 lin (2 arquivos deletados, +30 lin de componente novo) | ✅ Feito |
| **Fase 1b:** CustomCheckbox (LayerControls) | Descartado — sem duplicação real (YAGNI) | ❌ Não feito |
| **Fase 1c:** Remover PopoverWrappers triviais | Descartado — não era duplicação, era composição correta | ❌ Não feito |
| **Fase 1d:** Deduplicate OptionsList mobile/desktop | Props extraídas em `optionsListProps`, usadas via spread 2x | ✅ Feito |
| **Fase 2a:** useMapStyles extraído | MapView 440 → 285 lin (-155 no total da Fase 2) | ✅ Feito |
| **Fase 2b:** useMapInteraction extraído | Incluído nos -155 lin de MapView acima | ✅ Feito |
| **Fase 2c:** useBottomSheetDrag extraído | BottomSheet 173 → 111 lin (-62) | ✅ Feito |
| **Fase 3:** MapLayers split (790 → ~300 lin) | Ainda não iniciada | ⏳ Pendente |

**MapView + BottomSheet:** 613 → 396 linhas nos 2 arquivos-orquestradores
(-217, -35%). LOC total do projeto subiu ligeiramente (novos hooks trazem
JSDoc + tipos explícitos que o código inline não tinha) — o ganho real não é
menos linhas no total, é a redução dos 2 arquivos-gargalo que concentravam
state/lógica misturada, agora divididos em unidades testáveis e nomeadas.

---

## ✅ Checklist de Refatoração

### Antes de começar:

- [x] Rodar testes existentes (estabelecer baseline)

### Fase 1: Consolidação de Botões ✅ Concluída
- [x] Criar `src/components/buttons/ToggleButton.tsx` com Props type
  - Props reais: `{ pressed, onChange, icon, label, className? }`
- [x] Migrar `BuildingsToggleButton`/`TitlePlacementToggleButton` → eliminados,
  inlinados direto em `OptionsList.tsx` usando `ToggleButton` (sem children
  reais, único consumidor — manter um wrapper seria indireção sem ganho)
- [ ] ~~Criar CustomCheckbox~~ — descartado, sem duplicação real (YAGNI)
- [ ] ~~Remover PopoverButton wrappers~~ — descartado, é composição correta
- [x] Deduplicate `OptionsList` em MapView (`optionsListProps` + spread nos 2 breakpoints)
- [x] `npx tsc --noEmit` limpo

### Fase 2: Refatoração de MapView/BottomSheet ✅ Concluída
- [x] Extrair `src/hooks/useMapStyles.ts` (movido verbatim, tipo de retorno
  usa `MapStyleOption` de `components/ui/map.tsx`)
- [x] Extrair `src/hooks/useMapInteraction.ts`
  - Consolida: `selection`, `hoveredBairro`, `hoveredLoteamento`,
    `previewTarget`, `sheetSnap` + handlers + os 2 `useEffect` relacionados
- [x] Refatorar MapView.tsx para usar os 3 hooks
  - 440 → 285 linhas
- [x] Extrair `src/hooks/useBottomSheetDrag.ts`
  - Também exporta `PREVIEW_FRACTION`/`EXPANDED_FRACTION` (elimina
    duplicação dessas constantes entre MapView e BottomSheet)
- [x] Refatorar BottomSheet.tsx (173 → 111 linhas)
- [x] Mover `SheetSnap` de `BottomSheet.tsx` para `src/types/map.ts`
  (agora consumido por 2 hooks + 2 componentes)
- [x] `npx tsc --noEmit` limpo (1 ajuste: `RefObject<T>` sem `| null`,
  versão de `@types/react` do projeto não aceita a forma mais nova)
- [ ] Validação visual/funcional no dev server — **pendente, usuário sobe o
  servidor** (Escape, drag da folha, troca de seleção com folha aberta,
  hover na lista, busca)

### Fase 3: Refatoração de MapLayers (10–12h) ⭐ CRÍTICO
- [ ] Extrair `src/hooks/useGeoLayerStyles.ts`
  - Toda lógica de cores + tema (currentyl ~150 linhas inline)
  - Retornar objeto de estilos por layer
- [ ] Extrair `src/hooks/useMapLayerHandlers.ts`
  - Consolidar: onHoverBairro, onHoverLoteamento, onSelect, etc
- [ ] Criar hooks por camada:
  - `src/hooks/map/useBairroLayer.ts` (~120 lin)
  - `src/hooks/map/useLoteamentoLayer.ts` (~120 lin)
  - `src/hooks/map/useSetorLayer.ts` (~100 lin)
  - Cada um: gerencia `ensureSource/Layer`, paint/layout properties, handlers
- [ ] Consolidar MapLayers.tsx
  - De 790 linhas → ~300 linhas
  - Main: imports, useMapLayers + array render
- [ ] Extrair helpers para batch operations:
  - `lib/map/batchSetPaintProperties()` para reduzir repetição
- [ ] Testes end-to-end:
  - Clicar bairro/loteamento → seleciona
  - Hover → mapa reage
  - Trocar camadas → visibilidade muda
  - Trocar tema → cores atualizam

### Fase 4: Validação Final (após Fase 3)
- [ ] Rodar `npm run build` (sem dev server)
- [ ] Screenshots: antes/depois visual (iguais esperado)
- [ ] Verificar console: sem warnings, 0 errors
- [ ] Test: SearchBox, theme toggle, building layer, todas as geom opções
- [ ] Verificar git diff: linhas removidas > adicionadas
- [ ] PR com relatório final consolidando as 3 fases

---

## 🔗 Referências — Boas Práticas React 18+

### Consolidação de Componentes Similares
- [Compound Components Pattern](https://kentcdodds.com/blog/advanced-react-patterns-render-props) — Kent C. Dodds
- [Prop Getter Pattern](https://www.smashingmagazine.com/2021/07/custom-react-hooks/#prop-getter-pattern) — Smashing Magazine

### Organização de Pastas
- [React Folder Structure](https://www.joshwcomeau.com/react/file-structure/) — Josh W. Comeau (feature-first é recomendado > 20 componentes)
- [Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/) — Brad Frost (seu projeto segue ligeiramente este padrão)

### Mantibilidade e Performance
- [Component Size Guidelines](https://react.dev/learn/thinking-in-react) — React docs (~100 linhas é sweet spot)
- [Custom Hooks Best Practices](https://react.dev/reference/react/hooks) — React docs (seu projeto já usa bem)

### Context vs Props Drilling
- [Context Pitfalls](https://kentcdodds.com/blog/how-to-use-react-context-effectively) — Kent C. Dodds (use para estado verdadeiramente global)

---

## 🎓 Conclusão

Fases 1 e 2 concluídas. Dos 4 itens propostos na Fase 1, 2 foram implementados
e 2 descartados após leitura completa do código (não eram duplicação real —
ver seções marcadas ❌ acima). A Fase 2 saiu como planejada, com um ajuste
(constantes de fração de altura consolidadas em `useBottomSheetDrag.ts` em
vez de duplicadas).

### ✅ Status atual:
- ✅ `ToggleButton` genérico substitui os 2 componentes de toggle duplicados
- ✅ `MapView.tsx`: 440 → 285 linhas (3 hooks extraídos)
- ✅ `BottomSheet.tsx`: 173 → 111 linhas (drag logic extraída)
- ✅ `SheetSnap` centralizado em `types/map.ts`
- ✅ Estrutura por tipo (`buttons/`, `map/`, `panel/`, `theme/`) segue
  funcionando bem, sem necessidade de migrar para feature-first
- ✅ Hooks customizados (7 agora, incluindo os 3 novos) seguem a mesma
  convenção em todo o projeto
- ⚠️ `MapLayers.tsx` (790 linhas) segue como o único ponto crítico real —
  concentra a maior parte da lógica de renderização do mapa

### 🎯 Próximo passo — Fase 3 (pendente)

| Prioridade | Foco | Ganho esperado | Tempo estimado |
|----------|------|-------|-------|
| 🔴 **Crítica** | MapLayers (790 → ~300 lin) — dividir em hooks por camada | -490 LOC, +35% clareza | 10–12h |

Não há mais "problemas críticos" fora de `MapLayers.tsx`. Ele continua sendo
uma bomba-relógio: 790 linhas concentram a lógica de renderização de todas as
camadas do mapa, com estilos dinâmicos por tema e handlers de clique/hover
misturados — qualquer bug ali é difícil de isolar. Quando o usuário pedir
"executar Fase 3", o plano de divisão por camada (`useBairroLayer`,
`useLoteamentoLayer`, `useSetorLayer`, `useGeoLayerStyles`,
`useMapLayerHandlers`) descrito acima é o ponto de partida — mas deve passar
pela mesma leitura crítica de código completo que as Fases 1 e 2 tiveram
antes de virar plano de execução.
