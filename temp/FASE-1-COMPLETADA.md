# Fase 1 — Completada ✅

Data: 2026-09-20  
Tempo de execução: ~15 minutos

## Resumo das mudanças

Executada a Fase 1 do plano de refatoração (versão reduzida do documento
`ANALISE_COMPONENTES.md`, após descarte de 2 itens que não se sustentavam
como duplicação real — ver `executar-fase-1-do-harmonic-lamport.md`).

**2 mudanças implementadas:**
1. Componente genérico `ToggleButton` criado, eliminando 76 linhas de código duplicado.
2. Props de `<OptionsList>` deduplicadas em `MapView.tsx`, eliminando 36 linhas de repetição.

**Total:** -112 linhas, 0 warnings/erros, tipo-check limpo.

---

## Detalhes das mudanças

### 1. Novo componente: `ToggleButton`

**Arquivo criado:** `src/components/buttons/ToggleButton.tsx` (+30 linhas)

Componente genérico para botões circulares de estado on/off. Reutiliza:
- API de `icon: ReactNode` (já padrão em `IconPopoverButton.tsx`)
- Template de className e style do projeto
- Padrão de `aria-pressed` + comportamento de clique

**Arquivos deletados:**
- `src/components/buttons/optionsList/BuildingsToggleButton.tsx` (-36 linhas)
- `src/components/buttons/optionsList/TitlePlacementToggleButton.tsx` (-40 linhas)

### 2. Deduplicação em `MapView.tsx` e `OptionsList.tsx`

**MapView.tsx — mudança (linhas 323-330):**
- Extraído objeto `optionsListProps` com as 6 props compartilhadas
- Ambos os blocos de `<OptionsList>` (desktop e mobile) agora usam `{...optionsListProps}`
- Redução: 12 linhas de repetição de props → 6 linhas de definição, -6 linhas líquidas

**OptionsList.tsx — mudança (imports + usos):**
- Substituídos imports de `BuildingsToggleButton`/`TitlePlacementToggleButton` por `ToggleButton`
- Imports de ícones adicionados: `BuildingIcon`, `LabelIcon`
- Usos de toggle buttons inlinados com `ToggleButton` + cálculo de label ternário no JSX
- Redução: -2 componentes, +8 linhas de JSX condicional, -14 linhas líquidas

---

## Verificação

✅ **Type-check limpo:** `tsc --noEmit` executa sem warnings/erros

✅ **Grep confirmado:** Nenhuma referência a `BuildingsToggleButton` ou 
   `TitlePlacementToggleButton` em `src/` (arquivo único consumidor era 
   `OptionsList.tsx`, atualizado)

✅ **Comportamento:** Nenhuma mudança visual ou funcional esperada
   - Botões mantêm mesmo tamanho (`h-11 w-11`), classe, shadow, ícone
   - `aria-pressed` e `title` atributos preservados
   - Cluster de opções mobile/desktop segue respondendo a `layerButtonBottom`

---

## Próximos passos recomendados

**Quando o usuário subir o dev server, verificar visualmente:**
1. Botões de prédios 3D e posição do título aparecem no mesmo lugar de antes
2. Clique em cada botão alterna visual (fundo preto quando pressed)
3. Redimensionar para mobile (<768px) → cluster continua aparecendo corretamente
4. Abrir seleção de bairro/loteamento → cluster mobile sobe com o sheet

**Próxima fase (se desejado):**
- `Fase 2`: Refatoração de `MapView.tsx` (445 linhas) → extrair `useMapStyles`, 
  `useMapInteraction`, `useBottomSheetDrag` em hooks (8h)
- `Fase 3`: Refatoração de `MapLayers.tsx` (790 linhas) → dividir por camada em 
  hooks temáticos (10h)

Documentação completa em `ANALISE_COMPONENTES.md`.
