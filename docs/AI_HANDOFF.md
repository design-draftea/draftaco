# Handoff entre Codex e Claude

## Estado atual

- Atualizado em: 2026-09-15.
- Checkout: pasta principal `draftaco`, na branch `fix/campo-nfl-altura-safari`
  (commit `b34f368`, a partir de `main`). **Tarefa em andamento**: a correção está
  implementada e conferida localmente, aguardando validação da pessoa responsável pelo
  protótipo no iPhone. Sem Pull Request aberta.
- Objetivo: no Safari do iPhone, os elementos desenhados sobre o campo do replay da NFL
  (retrato, nome, rastro, bola e as linhas de scrimmage e de primeira descida) saíam de
  registro com a arte. Causa: `.nfl-plays__field` tirava a altura de `aspect-ratio` sem
  largura declarada, e o Safari transfere a proporção a partir da largura do CONTÊINER,
  ignorando a sangria de `margin: 0 -16px`. O frame ficava ~16px mais baixo, e o palco —
  SVG com viewBox 375x185 e `meet` — encolhia para caber na altura e se centralizava na
  horizontal. Correção: `width: calc(100% + 32px)` em
  `src/components/BottomSheet/NflPlaysStatsBottomSheet.css`.
- Validações executadas: WebKit 18.2 headless (Playwright) em 320, 375, 393 e 430 de
  largura — a altura do frame passa a bater com a proporção e a escala do palco volta a ser
  largura/375, sem deslocamento horizontal; medição no Chromium inalterada; `npm run build`,
  `npm run check:nfl` e `npm run check:brands` passando.
- Próximo passo: validar no iPhone e, com aprovação explícita, abrir a Pull Request para
  `main`. O merge dispara a publicação pelo GitHub Actions e pede autorização à parte.
- `main` está publicada e conferida: a revisão técnica do replay da NFL, com a bola indo
  para a mão do jogador, entrou pela Pull Request #2 (merge `496685f`) e o deploy do GitHub
  Actions concluiu. Os bundles em produção batem byte a byte com o build local, e
  `/pitaco/apostas` e `/draftea/apuestas` carregam o app.
- O checkout `draftaco-v0` não faz parte deste trabalho e deve permanecer intacto.

## Histórico das entregas

- [2026-09-15 — Revisão técnica do replay da NFL e a bola na mão do jogador](handoffs/2026-09-15-replay-nfl-divida-tecnica.md):
  desfecho explícito no lugar do booleano `complete`, extração de `playScene.ts`, renomeação
  de `lateral` para `playSide`, `npm run check:nfl`, correção de um token inexistente,
  `timeScaler`, e a regra de posse que leva a bola para o selo sobre o retrato. Traz também
  o que ficou de fora: o perfil de desempenho com CPU estrangulada e a conferência direta no
  nó do Figma.
- [2026-09-11 — Arquitetura de marcas e replay da NFL](handoffs/2026-09-11-brand-architecture-nfl.md):
  a base das duas frentes, e as armadilhas de dado do play-by-play do nflverse — elas não
  quebram nada, produzem uma imagem plausível e errada, e cada uma custou uma rodada.

## Preservação

- Não incluir por engano os arquivos locais preexistentes `.pnpm-store/`, `.worktrees/`,
  `design-qa.md`, `pnpm-lock.yaml` e `pnpm-workspace.yaml`.
- Não executar `worktree prune`, `remove` ou `repair` sem revisar as referências herdadas em
  `.git/worktrees`.
- Não publicar em `draftaco-v0`, não fazer force push automático e não tratar referências
  locais herdadas como prova do estado remoto.

## Antes de começar a próxima tarefa

Leia [AI_CONTEXT.md](AI_CONTEXT.md) para produto, arquitetura, rotas e comandos, e
[COLLABORATION.md](COLLABORATION.md) quando a tarefa envolver arquitetura entre marcas,
Git, validação completa ou publicação. Mexer no replay da NFL pede também o histórico de
2026-09-15 acima: o que está documentado ali são decisões tomadas, não sugestões.
