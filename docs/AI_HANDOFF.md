# Handoff entre Codex e Claude

## Estado atual

- Atualizado em: 2026-09-14.
- Responsáveis: Codex na arquitetura de marcas; Claude na experiência de NFL.
- Checkout: pasta principal `draftaco`, branch `feature/brand-architecture`.
- Status: as duas frentes permanecem não commitadas na mesma branch, sem Pull Request, merge ou deploy.
- Destino configurado: `design-draftea/draftaco`; o estado remoto, as permissões e a publicação ainda precisam ser validados antes de qualquer operação remota.
- O checkout `draftaco-v0` não faz parte desta tarefa e deve permanecer intacto.

O relato técnico completo preservado em 2026-09-11 está em [handoffs/2026-09-11-brand-architecture-nfl.md](handoffs/2026-09-11-brand-architecture-nfl.md).

## Arquitetura de marcas

- Áreas alteradas: `src/brands/`, `src/features/`, `src/shared/`, componentes compartilhados, `src/App.tsx`, `src/main.tsx`, `src/theme.ts`, `vite.config.ts` e scripts de contrato.
- Pitaco usa `pt-BR` e Draftea usa `es-MX`, com a marca definida pela URL.
- O cadastro funciona no Pitaco. Na Draftea, “Crear cuenta” permanece visível e sem ação, e a rota direta volta para apostas.
- Cassino está desativado nas duas marcas. O item permanece visível e sem ação na navbar, com `aria-disabled=true`; as rotas de cassino redirecionam para apostas.
- A troca de marca reinicia estado transitório; preferências persistentes usam namespace por marca.
- O runtime de localização foi retirado do pré-bundle do Vite para que alterações do catálogo apareçam por HMR.

## Experiência de NFL

- Áreas alteradas: dados e assets de NFL, trilhos e cards esportivos, competição, props, evento ao vivo, estatísticas, replay e seus componentes compartilhados.
- NFL foi adicionada ao trilho de esportes e às telas de competição, props, evento ao vivo e estatísticas.
- O evento ao vivo usa um fixture local derivado do play-by-play público do nflverse; não há busca em tempo de execução.
- O painel de replay usa os assets do campo e cobre os tipos de jogada documentados no histórico.
- A tela cheia legada de `LiveEventPage` ainda não possui um ramo específico para NFL; o fluxo em uso está no `LiveEventInline`.
- Alguns jogadores continuam usando o avatar genérico porque não há foto correspondente no repositório.

## Documentação de agentes

- `AGENTS.md`: leituras contextuais, autonomia para decisões reversíveis, validação proporcional e autorização de merge vinculada ao deploy automático.
- `CLAUDE.md`: reduzido a um apontamento para a fonte única de regras.
- `docs/AI_CONTEXT.md` e `docs/COLLABORATION.md`: fluxo de aprovação e verificações alinhados às regras compartilhadas.
- O handoff detalhado anterior foi preservado em `docs/handoffs/` e este arquivo passou a manter somente o estado operacional atual.

## Validações registradas

- `npm run build`, `npm run check:brands` e `git diff --check` passaram na última rodada documentada.
- A validação mobile cobriu Pitaco e Draftea, cadastro, login, localização, navegação e o estado desativado do Cassino.
- A experiência de NFL foi conferida no fluxo mobile; limitações e evidências detalhadas permanecem no histórico vinculado acima.
- `npm ci` continua obrigatório antes de uma futura Pull Request.

## Preservação

- Não incluir por engano os arquivos locais preexistentes `.pnpm-store/`, `.worktrees/`, `design-qa.md`, `pnpm-lock.yaml` e `pnpm-workspace.yaml`.
- Não executar `worktree prune`, `remove` ou `repair` sem revisar as referências herdadas em `.git/worktrees`.
- Não publicar em `draftaco-v0`, não fazer force push automático e não tratar referências locais herdadas como prova do estado remoto.

## Próximo passo

Apresentar `/pitaco` e `/draftea` para validação local da pessoa responsável. Após aprovação explícita, revisar e separar somente os arquivos pertencentes a estas frentes, executar a instalação reproduzível e as verificações aplicáveis, e preparar a Pull Request para o novo destino.
