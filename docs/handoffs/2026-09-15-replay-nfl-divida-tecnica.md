# Revisão técnica do replay da NFL e a bola na mão do jogador

Publicado em 2026-09-15 pela Pull Request #2 (merge `496685f`). Este arquivo é o histórico da
tarefa; o estado operacional atual fica em [../AI_HANDOFF.md](../AI_HANDOFF.md).

A entrega pagou a dívida técnica que a construção incremental do replay deixou — sem
funcionalidade nova — e, no meio do caminho, implementou o estudo da bola carregada.

## O que mudou

- **Desfecho explícito no lugar do booleano `complete`.** `PlayOutcome` (`gain`, `noGain`,
  `incomplete`, `voided`, `touchback`) é derivado uma vez em `playNarrative.ts`. Cada decisão
  de desenho — cor do caminho, marcador de chegada, pulso, opacidade do gradiente — virou
  tabela `Record<PlayOutcome, …>`, então um tipo novo de lance faz o TypeScript apontar o que
  falta decidir em vez de cair num ramo `else`. Era esse booleano, respondendo quatro
  perguntas diferentes, que fazia sack e interceptação doerem.
- **`playScene.ts` (novo).** Decide O QUE desenhar — geometria, desfecho, fases,
  visibilidade — sem React. `NflFieldStage.tsx` só desenha. `kickAtGoal`/`kickAtGoalKind`,
  que eram a mesma expressão calculada duas vezes, viraram uma.
- **`lateral` -> `playSide`.** Renomeado no fixture, no gerador (`playSideOf`) e na geometria
  (`depthForPlaySide`). O nome agora denuncia que o dado é INFERIDO de `pass_location` /
  `run_location`, e `playSideOf` é o ponto de entrada para quando um fornecedor trouxer a
  posição real da bola no snap. O fixture foi regenerado do nflverse e saiu byte a byte
  igual ao anterior, só com a chave renomeada.
- **`scripts/check-nfl-replay.mjs` (novo, `npm run check:nfl`).** 26 conferências sem
  dependências, no padrão dos outros `scripts/check-*`: tripwire de sha256 e dimensões da
  arte do campo (19 constantes de geometria saem de medições nela), conteúdo do fixture e
  relações entre constantes que quebram em silêncio. As verificações antigas viviam fora do
  projeto e se perderam quando a máquina limpou o `/tmp`.
- **Token fantasma.** `--ds-feedback-error-default` não existe em lugar nenhum do projeto e
  caía sempre no fallback. No ponto de "ao vivo" do sheet virou `--ds-live`, que existe e
  vale o mesmo hex. As cores do campo continuam constantes nomeadas, com comentário dizendo
  que não há token equivalente — para ninguém "migrar" isso depois para um token errado.
- **`timeScaler(speed)`.** As 14 divisões `/ speed` de duração de CSS viraram um helper
  único em `usePlayReplay.ts`. Sobrou uma divisão crua, no `setTimeout` do lance sem
  animação, que não é duração de CSS.
- **A bola vai para a mão do jogador.** Ela deixa de apagar no gramado: quem termina o lance
  com ela aparece com ela num selo sobre o retrato, no mesmo fundo (`#1b1b1b`) e na mesma
  borda (`#a877ff`) do jogador. Selo de 16 com borda de 1, bola dentro com 2 de respiro,
  montado no aro do retrato a 12,0 x 12,6 do centro dele. O aro do selo só aparece durante a
  passagem — antes da recepção existe uma bola voando, não um selo. Para ficar POR CIMA do
  jogador, a bola também mudou de lugar no SVG: solta continua atrás do retrato, carregada é
  desenhada depois da foto, da placa e do anel.

## A regra da bola

É uma regra de POSSE, e não de tipo de lance: quem termina o lance com a bola aparece com
ela no selo.

| carrega a bola | fica com a bola no gramado |
|---|---|
| passe completo (com ou sem avanço) | passe que cai |
| corrida | touchback |
| retorno de chute | punt sem retornador |
| touchdown | chute ao gol |
| lance anulado que aconteceu | anulada em que o lance não existiu |

No recorte atual: 39 lances com a bola no selo, 17 com a bola no gramado.

Os que ficam no gramado têm motivo. No chute ao gol a posição final da bola entre os postes
É a informação do lance. No punt dominado a bola para longe de quem chutou, e mandá-la para
o selo do chutador a faria voltar no tempo.

Numa corrida não há recepção — o corredor sai com a bola da própria linha —, então ali a
subida começa junto com o lance, sem a espera de 180ms que existe depois de um voo (essa
espera é o instante em que a bola é agarrada).

**Consequência aceita:** o rastro rasteiro sai nos lances em que a bola é carregada, corrida
inclusive. Ele era o rastro DA BOLA; com ela na mão do jogador, sobrariam pontos no gramado
atrás de nada. O caminho do lance continua desenhado pelo fluxo tracejado. Se a corrida
precisar manter o rastro, é uma condição em `frameAt`.

## Validações executadas

- `npm ci`, `npm run build` (inclui `tsc -b`), `npm run check:brands`, `npm run check:nfl` e
  `npm run check:player-props` passaram. `npx eslint` nos arquivos tocados não acusa nada.
- **Equivalência com a versão anterior:** as decisões de desenho foram comparadas em 58.464
  pontos (56 jogadas x 6 fases x 6 instantes). As únicas diferenças são as da regra de
  posse; os lances que mantêm a bola no gramado seguem idênticos, e a sombra continua presa
  ao ponto do chão, e não à bola que subiu. O comparador foi um arquivo de sessão, fora do
  repositório: ele importava a cena nova e uma cópia literal da lógica antiga.
- Os disparos do `check:nfl` foram testados ao contrário, numa cópia do repositório: arte
  alterada, profundidade assimétrica, alvo do gol encostado no poste, tempos fora de ordem,
  respiro encurtado, fixture com a chave antiga, selo desgrudado do retrato, respiro menor
  que a borda e regex que deixa de casar. Todos falham com a mensagem certa.
- No navegador, nas duas marcas: passe incompleto (X vermelho, placa não gira), passe
  completo com avanço (`+22 JD`, anel), corrida (`+28 JD`, sem arco), kickoff com retorno,
  ponto extra (bola fica entre os postes), touchdown (palavra, 40 faíscas, selo no jogador e
  nenhuma bola solta no gramado), anulada com jogada (cinza, selo ANULADA), anulada sem
  jogada (estático, botão desabilitado), encadeamento de campanha, clique na timeline e
  ícone de reset só no último lance.
- O selo foi medido em unidades do frame: círculo com 15 de preenchimento e 1 de borda (16
  externos), bola de 12 dentro, centro a 12,0 x 12,6 do centro do retrato, e as duas
  animações (grupo e aro) com a mesma espera e a mesma duração. Na corrida a passagem foi
  amostrada pela Web Animations API: em t=0 a bola está no snap, no chão, em tamanho cheio e
  com o aro invisível; em t=280 está no selo, com o aro inteiro.
- Depois do deploy, a rota foi conferida direto: os três bundles publicados batem byte a
  byte com o build local, e `/pitaco/apostas` e `/draftea/apuestas` carregam o app.

## O que ficou de fora

- **Item 7 do plano (desempenho): o perfil com CPU estrangulada não foi feito.** O painel de
  navegador embutido fica oculto, o `requestAnimationFrame` é estrangulado e não há como
  aplicar throttling de CPU por ali — medir por relógio não valeria nada. O levantamento
  estrutural que deu para fazer: no pico da comemoração de touchdown correm 174 animações,
  40 delas animando `filter: drop-shadow` (uma por faísca, e é o único grupo que não roda no
  compositor), e elas são FINITAS, concentradas no estouro. Depois da comemoração seguem em
  laço 9 ondas de letra (`transform`) e 11 cintilações (`opacity`), que são de compositor. O
  perfil com throttling continua a fazer, em aparelho real.
- **O nó do Figma não foi aberto diretamente.** O MCP do Figma Desktop responde, mas só
  enxerga a ABA ATIVA, e a aba aberta era outro documento; o conector remoto do Figma está
  sem autorização. O selo foi implementado a partir da referência visual e das medidas
  passadas pela pessoa responsável, e a posição sobre o aro foi medida na própria
  referência — bate com a proporção do frame (retrato de 40, selo de 16). Para conferir
  contra o nó `1953-4756` do arquivo `ENRUbTcNKoXvmuKprUu5CS` (Estudos Fluxos
  Draftea<>Pitaco), basta abrir esse arquivo como aba ativa no Figma Desktop.
- **O selo não espelha com o sentido do ataque.** Fica sempre no mesmo canto, como na
  referência. Se em lance para a esquerda ele precisar ir para o outro lado, é multiplicar
  `carry.x` pela direção em `playScene.ts` — está comentado lá.
- **Fora do escopo, para decidir depois:** `--ds-feedback-error-default` também aparece em
  `src/components/CompetitionPage/CompetitionPage.css:275`, com fallback `#ff3f6b`. Lá a
  troca MUDARIA a cor (o token real é `#f43f5e`), então foi deixada como está.
- **Premissa do plano que não se confirmou:** o item 3 assumia que um script de verificação
  não consegue importar TypeScript. `scripts/check-brand-contracts.mjs` já faz isso hoje,
  usando o esbuild que vem junto com o Vite. O `check:nfl` foi entregue por regex, como
  planejado e aprovado; se um dia valer a pena, dá para trocar por importação real dos
  módulos sem dependência nova.

## Onde o código mora

| arquivo | papel |
|---|---|
| `src/features/sports/NflPlayReplay/fieldGeometry.ts` | jarda -> ponto na arte, sem React |
| `src/features/sports/NflPlayReplay/playScene.ts` | o que desenhar: geometria, desfecho, fases |
| `src/features/sports/NflPlayReplay/usePlayReplay.ts` | máquina de estados, `REPLAY_TIMING`, `timeScaler` |
| `src/features/sports/NflPlayReplay/NflFieldStage.tsx` | só desenha: o SVG sobre a arte do campo |
| `src/features/sports/NflPlayReplay/NflPlayReplayPanel.tsx` | palco + card + overlays HTML |
| `src/features/sports/NflPlayReplay/playNarrative.ts` | textos, predicados e desfecho por marca |
| `src/components/BottomSheet/NflPlaysStatsBottomSheet.tsx` | seleção, timeline, encadeamento |
| `scripts/build-nfl-live-fixture.mjs` | gera `src/data/nflLiveGame.json` do nflverse |
| `scripts/check-nfl-replay.mjs` | `npm run check:nfl` |

As armadilhas de dado do play-by-play continuam documentadas em
[2026-09-11-brand-architecture-nfl.md](2026-09-11-brand-architecture-nfl.md).
