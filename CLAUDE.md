# Cadastro Vivo — instruções do projeto

## Servidor de desenvolvimento: nunca subir, sempre pedir

**Não suba o servidor deste projeto por conta própria.** Nada de `npm run dev`,
`next dev`, `npx next dev`, `yarn dev`, `pnpm dev`, `docker-compose up` ou
variantes — nem em foreground, nem em background, nem dentro de scripts.

Quando precisar da aplicação no ar (para tirar screenshots, validar uma mudança
visual, rodar Playwright contra ela), **peça ao usuário para subir** e aguarde a
confirmação de que está rodando. Depois disso, pode usar o servidor à vontade
(`curl`, Playwright, etc.).

Isso está bloqueado mecanicamente em `.claude/settings.json` (regras `permissions.deny`),
mas as regras cobrem prefixos de comando — se você encontrar uma forma que passe
pelo bloqueio, **ela também não deve ser usada**. A regra é a intenção, não o padrão.

**Por quê**: o usuário controla o ciclo de vida do servidor. Instâncias subidas
pelo agente ficaram órfãs, seguraram a porta 3000 e travaram o diretório `.next`
no Windows (`EPERM`/`EBUSY` em `npm run build`), além de corromper o cache de build.

### O que continua permitido

- `npm run build` — checagem de tipos e build de produção, **mas nunca com o
  dev server do usuário rodando ao mesmo tempo**: os dois disputam o mesmo
  diretório `.next` no Windows, e já corrompeu o cache/derrubou o dev server
  em produção (`EPERM` em `.next/trace`, chunks servidos com 500 depois).
  Peça para o usuário parar o `npm run dev` antes, ou pule o `npm run build`
  e valide só com o dev server dele mesmo.
- `npm install`, `npm run prepare-data` e demais scripts que não sobem servidor.
- Parar um servidor que o usuário subiu, **se ele pedir**.

## Arquivos temporários

Todo arquivo temporário gerado durante o trabalho — scripts de teste
(Playwright, diagnóstico), screenshots, dumps de debug, JSON intermediário
etc. — vai em `temp/` na raiz do projeto, nunca solto na raiz nem em
`src/`/`public/`. Crie a pasta se não existir. `temp/` deve estar (ou ser
adicionada) no `.gitignore`. Apague os arquivos de dentro de `temp/` que não
forem mais necessários ao final da tarefa, mas a pasta em si pode continuar
existindo vazia.

## Branch para implementações grandes

Antes de começar uma implementação grande (nova feature, troca de fonte de
dados, refatoração ampla), **pergunte ao usuário se ele quer trabalhar numa
branch separada** antes de tocar em código — não assuma nem `master` nem uma
branch nova por conta própria. Tarefas pequenas (fix pontual, ajuste de texto,
um componente isolado) não precisam dessa pergunta.

## Notas rápidas do projeto

- Next.js 14 (App Router) + React 18 + TypeScript + Tailwind v4 (CSS-first, sem `tailwind.config`).
- Mapa: MapLibre GL via `src/components/ui/map.tsx` — **código de terceiros** (registry `mapcn`).
  Não edite esse arquivo: ele é sobrescrito ao reinstalar. Customize por props a
  partir de `src/components/MapView.tsx`.
