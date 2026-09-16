# 2026-09-15 — Campo da NFL no Safari e oito ajustes no replay

Entregue pela branch `fix/campo-nfl-altura-safari` e incorporado à `main` pela Pull Request
#4 (merge `7483bbc`). Este arquivo guarda o relato que estava em `AI_HANDOFF.md` enquanto a
tarefa corria; o que vale como decisão tomada está aqui, não como sugestão.

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
- Objetivo 2: no passe recebido, a bola caía no gramado e só depois subia para o selo sobre
  o retrato. Agora ela tem curva própria, com destino na mão, e sobe da linha de scrimmage
  até o selo sem descer em momento nenhum — decisão explícita da pessoa responsável pelo
  protótipo: a bola não pode cair e subir, e divergir do tracejado não é problema. O
  tracejado continua mirando o gramado, com a corcova inteira, e emenda no trecho rasteiro;
  levá-lo junto com a bola larga um degrau entre o fim do arco e a linha da corrida. As duas
  alternativas (tracejado até a mão, e o mesmo com um fio no ponto da recepção) foram
  implementadas, comparadas quadro a quadro e descartadas — não estão no código. Só passe
  recebido mudou: chute com retorno, corrida, passe incompleto e chute ao gol seguem
  idênticos, conferidos nas 47 jogadas do fixture.
- Objetivo 3: o lance terminado fica mais tempo na tela antes da troca, e tocar no play de
  uma campanha do quarter rola o corpo do sheet até o topo, onde está o campo. O tempo de
  leitura é o `stageExitDelay` (620 -> 1020ms; com a placa girando, 1280 -> 1680ms), não o
  respiro entre lances — este só acompanha para preservar os ~100ms de campo limpo (1100 ->
  1500 e 1750 -> 2150). `npm run check:nfl` cobre a ordem dessas cinco constantes nos dois
  arquivos.
- Objetivo 4: a troca de foco no lançamento era um corte seco — o retrato de quem lançou
  sumia e o de quem recebe aparecia no mesmo quadro. Agora os dois se cruzam em dois tempos,
  cada um com a própria haste e o próprio nome: quem sai apaga em 380ms
  (`REPLAY_TIMING.focusSwap`) e quem entra espera 130ms (`focusSwapDelay`) antes de
  aparecer, para não disputar o olho com a bola saindo. A primeira versão fazia os dois
  juntos em 220ms e passava despercebida. A cena expõe `leavingFocus`; o retrato que sai
  fica montado por uma fração do voo (`FOCUS_SWAP_SPAN`), e `check:nfl` confere que essa
  janela cobre a animação no voo mais curto. Vale para passe recebido e chute com retorno;
  não vale quando o foco não troca de pessoa.
- Objetivo 5: o sheet abre no lance mais recente que tem replay (`isAnimatable`), e não no
  mais recente com voo de bola. Corrida tem replay e não tem voo, então uma campanha
  terminada em corrida abria numa jogada anterior e parava ali. Simulando os 56 estados
  pelos quais as campanhas do fixture passam ao vivo, 17 abriam antes da última jogada;
  agora 1 — um lance anulado antes do snap, que não tem o que desenhar. Fica registrado que
  abrir na PRIMEIRA jogada da campanha foi discutido e descartado: 15 a 48 segundos por
  campanha, e a porta de entrada é uma faixa ao vivo; quem quer a campanha inteira tem o
  botão "Repetir campanha", os marcadores da timeline e o play de cada campanha na lista.
- Objetivo 6: o fixture ganhou uma campanha FABRICADA para demonstração — MIA, 5 jogadas,
  71 jardas, terminando em touchdown de 47 jardas e ponto extra, virando o jogo em 14 x 13.
  Ela mora em `scripts/build-nfl-live-fixture.mjs`, em formato de play-by-play, e não
  editada no JSON gerado: assim passa pelas mesmas contas de placar, estatística e
  campanhas. `--demo=0` gera o recorte real puro. O corte real subiu de 1520 para 1543 para
  a campanha do KC fechar no field goal. Antes de fabricar, o jogo real foi conferido
  campanha a campanha: só três terminam em touchdown e nenhuma junta variedade com tamanho
  curto. (O ponto extra saiu depois, em 2026-09-16; ver o handoff seguinte.)
- Objetivo 7: a palavra ANULADA sobre o campo saiu. Ela caía na mesma coluna do nome e do
  retrato quando o lance acontecia no meio do campo. No lugar dela, o selo da bola na mão
  mostra um X — a marca foi para a posse, que é o que a anulada desfaz. Três variantes (X
  por cima com contorno, por cima sem contorno, e no lugar da bola) foram implementadas e
  comparadas em tamanho real; venceu a do X no lugar da bola, porque num selo de 16px cabe a
  bola ou o X, não os dois.
- Objetivo 8: na lista de campanhas, a linha inteira virou o gatilho, e não só o ícone de
  play — um alvo de 44px numa linha de 72, com o resto do card parecendo tocável sem ser. É
  um `button` em volta do conteúdo, para o alvo ser focável e anunciado como botão, e o
  ícone virou `span` decorativo.
