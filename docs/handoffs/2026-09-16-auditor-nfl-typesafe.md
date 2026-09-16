# Auditor semântico do replay NFL com TypeSafe

## Entrega

- Atualizado em: 2026-09-16.
- Checkout: worktree `.worktrees/typesafe-nfl-semantic-audit`, branch
  `feature/typesafe-nfl-semantic-audit`, criada a partir de `origin/main` em `2ae8231`.
- **Auditor semântico opcional implementado, validado localmente e aprovado para entrega.**
- Objetivo: comparar apenas os lances semanticamente ambíguos do campinho (`no_play` e sack)
  com a descrição oficial do nflverse, em uma única chamada ao Jev, sem alterar o fixture nem
  chamar IA durante a reprodução.
- Critérios de aceite cumpridos: chave lida somente do ambiente ou de `.env.typesafe.local`;
  `--dry-run`, `--ids`, `--threshold` e `--json`; confiança baixa ou divergência retorna código
  `1`; falhas de configuração/API retornam `2`; lance sintético sem súmula é ignorado e informado.
- Arquivos alterados: `scripts/audit-nfl-scenes-typesafe.mjs`, `package.json`, `.env.example`,
  `README.md` e este handoff.
- Decisão: o auditor é uma ferramenta de QA manual; não muda a regra determinística, não entra
  no app e não deve virar bloqueio de CI antes de ser calibrado em mais jogos.
- Validações: `npm ci`; `node --check`; ajuda e dry-run; chamada real ao Jev 1.13.0 com oito
  lances (todos OK, confiança mínima 88%, 3359 tokens, 904 ms); `npm run check:nfl` (66);
  `npm run check:brands`; ESLint do script; `npm run build`; `git diff --check`.
- Fluxo Git autorizado pela pessoa responsável em 2026-09-16: commit, Pull Request, merge em
  `main` e publicação automática. No momento deste registro, os identificadores remotos e a
  validação pós-deploy ainda não existiam e deveriam ser conferidos no GitHub.
