# Handoff entre Codex e Claude

## Estado atual

- Atualizado em: 2026-09-15.
- Checkout: pasta principal `draftaco`. **Nenhuma tarefa em andamento** — não há trabalho
  pendente na árvore, e a próxima tarefa começa com uma branch nova a partir de `main`.
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
