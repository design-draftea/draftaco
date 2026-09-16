# Handoff entre Codex e Claude

## Estado atual

- Atualizado em: 2026-09-15.
- Checkout: pasta principal `draftaco`, na branch `fix/campo-nfl-altura-safari`
  (commits `b34f368`, `cf0c65e` e `20c5074`, a partir de `main`). **Tarefa em andamento**:
  as duas mudanças estão implementadas e conferidas localmente, aguardando validação da
  pessoa responsável pelo protótipo no iPhone. Sem Pull Request aberta.
- Objetivo 1: no Safari do iPhone, os elementos desenhados sobre o campo do replay da NFL
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
- Objetivo 2 (pedido na mesma sessão): no passe recebido, a bola caía no gramado e só depois
  subia para o selo sobre o retrato. Agora ela tem curva própria, com destino na mão, e sobe
  da linha de scrimmage até o selo sem descer em momento nenhum — decisão explícita da pessoa
  responsável pelo protótipo: a bola não pode cair e subir, e divergir do tracejado não é
  problema. O tracejado continua mirando o gramado, com a corcova inteira, e emenda no trecho
  rasteiro; levá-lo junto com a bola larga um degrau entre o fim do arco e a linha da corrida.
  As duas alternativas (tracejado até a mão, e o mesmo com um fio no ponto da recepção) foram
  implementadas, comparadas quadro a quadro e descartadas — não estão no código. Só passe
  recebido mudou: chute com retorno, corrida, passe incompleto e chute ao gol seguem
  idênticos, conferidos nas 47 jogadas do fixture.
- Objetivo 3 (pedido na mesma sessão): o lance terminado fica mais tempo na tela antes da
  troca, e tocar no play de uma campanha do quarter rola o corpo do sheet até o topo, onde
  está o campo. O tempo de leitura é o `stageExitDelay` (620 -> 1020ms; com a placa girando,
  1280 -> 1680ms), não o respiro entre lances — este só acompanha para preservar os ~100ms de
  campo limpo (1100 -> 1500 e 1750 -> 2150). `npm run check:nfl` cobre a ordem dessas cinco
  constantes nos dois arquivos.
- Objetivo 4 (pedido na mesma sessão): a troca de foco no lançamento era um corte seco — o
  retrato de quem lançou sumia e o de quem recebe aparecia no mesmo quadro. Agora os dois se
  cruzam em dois tempos, cada um com a própria haste e o próprio nome: quem sai apaga em
  380ms (`REPLAY_TIMING.focusSwap`) e quem entra espera 130ms (`focusSwapDelay`) antes de
  aparecer, para não disputar o olho com a bola saindo. A primeira versão fazia os dois
  juntos em 220ms e passava despercebida.
  A cena expõe `leavingFocus`; o retrato que sai fica montado por uma fração do voo
  (`FOCUS_SWAP_SPAN`), e `check:nfl` confere que essa janela cobre a animação no voo mais
  curto. Vale para passe recebido e chute com retorno; não vale quando o foco não troca de
  pessoa.
- Objetivo 5 (pedido na mesma sessão): o sheet abre no lance mais recente que tem replay
  (`isAnimatable`), e não no mais recente com voo de bola. Corrida tem replay e não tem voo,
  então uma campanha terminada em corrida abria numa jogada anterior e parava ali. Simulando
  os 56 estados pelos quais as campanhas do fixture passam ao vivo, 17 abriam antes da última
  jogada; agora 1 — um lance anulado antes do snap, que não tem o que desenhar. Fica
  registrado que abrir na PRIMEIRA jogada da campanha foi discutido e descartado: 15 a 48
  segundos por campanha, e a porta de entrada é uma faixa ao vivo; quem quer a campanha
  inteira tem o botão "Repetir campanha", os marcadores da timeline e o play de cada campanha
  na lista.
- Objetivo 6 (pedido na mesma sessão): o fixture ganhou uma campanha FABRICADA para
  demonstração — MIA, 5 jogadas, 71 jardas, terminando em touchdown de 47 jardas e ponto
  extra, virando o jogo em 14 x 13. Ela mora em `scripts/build-nfl-live-fixture.mjs`, em
  formato de play-by-play, e não editada no JSON gerado: assim passa pelas mesmas contas de
  placar, estatística e campanhas. `--demo=0` gera o recorte real puro. O corte real subiu de
  1520 para 1543 para a campanha do KC fechar no field goal. Antes de fabricar, o jogo real
  foi conferido campanha a campanha: só três terminam em touchdown e nenhuma junta variedade
  com tamanho curto.
- Objetivo 7 (pedido na mesma sessão): a palavra ANULADA sobre o campo saiu. Ela caía na
  mesma coluna do nome e do retrato quando o lance acontecia no meio do campo. No lugar dela,
  o selo da bola na mão mostra um X — a marca foi para a posse, que é o que a anulada desfaz.
  Três variantes (X por cima com contorno, por cima sem contorno, e no lugar da bola) foram
  implementadas e comparadas em tamanho real; venceu a do X no lugar da bola, porque num selo
  de 16px cabe a bola ou o X, não os dois.
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
