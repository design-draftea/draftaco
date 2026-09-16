# 2026-09-16 — Nomenclatura da Draftea e o placar da NFL como gatilho

Entregue pela branch `feature/draftea-nomenclatura-mercados` e incorporado à `main` pela
Pull Request #5 (merge `47d0e28`). Este arquivo guarda o relato que estava em
`AI_HANDOFF.md` enquanto a tarefa corria; o que vale como decisão tomada está aqui, não
como sugestão.

- Checkout: pasta principal `draftaco`, na branch `feature/draftea-nomenclatura-mercados`.
  O nome ficou pequeno para o que a branch virou: começou na nomenclatura da Draftea e
  cresceu para duas frentes, pedidas na mesma sessão. As duas foram implementadas,
  conferidas no navegador e entregues numa Pull Request única, com autorização explícita da
  pessoa responsável pelo protótipo para commit, PR e merge.

## Frente 1 — nomenclatura e navegação da Draftea (só Draftea)

- A Pitaco não muda em nada. Conferido item a item nas duas marcas depois da mudança.
- Mercados e rótulos no catálogo `src/brands/draftea/legacyCopy.ts`: `Resultado final` ->
  `Money Line`, `RF` -> `ML`, `Handicap` -> `Spread`, `Vencer` -> `Moneyline`,
  `Ao vivo`/`AO VIVO` -> `Live`/`LIVE`, tag `IMPERDÍVEL` -> `PROMO`, `Carregar mais` ->
  `Ver todos`. Exato e regex, para pegar também as frases compostas.
- Navbar: `Bets · Mis entradas · Gaming · Rewards`. Os rótulos NÃO passam pelo catálogo
  legado — são nomes próprios da Draftea, não tradução do texto da Pitaco. Cada marca
  declara os seus em `messages.navbarItems` (`src/shared/brand/types.ts` e os dois
  `config.ts`), e a `Navbar` lê de lá pelo id do item. Traduzir `Apostas` -> `Bets` no
  catálogo renomearia o produto inteiro, não só a navbar.
- Trilho de esportes e competições: o último item (`Mais`, que abre o bottom sheet) sai na
  Draftea. O respiro de fim de trilho vinha da seção `--tail`, que era justamente a dele,
  então a classe passa para a última seção restante — sem isso o `CS` encostava na borda ao
  rolar até o fim.
- Carrossel de promoções da home: `Aumentada` e `Super Aumentada` saem na Draftea. A página
  `/draftea/promocoes` ainda tem os cards de missão dessas duas mecânicas; a pessoa
  responsável pelo protótipo foi avisada e o pedido era o carrossel.
- Ficou de fora de propósito: `Transmissão ao vivo` continua `Transmisión en vivo`, porque
  ali é transmissão de vídeo e não o estado do jogo.
- Defeito PREEXISTENTE registrado, fora do escopo desta branch: na página de competição da
  Draftea os chips de filtro ainda aparecem em pt-BR (`GOLS`, `DUPLA CHANCE`,
  `FINALIZAÇÕES AO GOL`, `ASSISTÊNCIAS`) — faltam as variantes em caixa alta no catálogo.

## Frente 2 — placar da NFL como gatilho e corte no touchdown (as duas marcas)

- O placar INTEIRO abre o sheet de jogadas, e não só a faixa de situação: o alvo de 26px da
  faixa era pequeno demais para o que a área toda já parecia oferecer. É um `button` POR
  DENTRO da `section` (`.live-event-inline__score-trigger`), envolvendo placar e faixa. Ele
  não pode envolver a `section`, senão o bottom sheet ficaria dentro do próprio alvo
  clicável; e dois botões irmãos dariam dois alvos anunciados para a mesma ação. A faixa
  deixou de ser `button` e virou `span`.
- O ponto extra SAIU do recorte do jogo (`demoPlays` em `scripts/build-nfl-live-fixture.mjs`
  e o fixture regerado). Ele era o lance de corte, então o sheet abria num chute entre os
  postes em vez de abrir no touchdown de 47 jardas.
- O custo foi decidido explicitamente pela pessoa responsável pelo protótipo: o placar passa
  de 13 x 14 para **13 x 13**, que é o placar CERTO nesse instante, com o PAT ainda por
  chutar; o relógio vai de Q2 05:50 para 05:58. A alternativa (manter 13 x 14 e esconder o
  ponto extra só do replay) foi apresentada e descartada.
- `buildDrives` passou a encerrar a campanha que PONTUOU, e não só a que terminou em chute
  de pontuação. Sem isso a campanha do touchdown apareceria "em andamento": sem a palavra
  Touchdown na lista, com o ganho de campo parando no último snap em vez da end zone e com a
  contagem parcial de lances no lugar da oficial.
- `liveSituation` ganhou o caso do touchdown, que NÃO é o caso do chute de pontuação: no
  chute a posse já passou para quem recebe e a faixa descreve o recomeço na 25; no touchdown
  a posse FICA com quem marcou, porque o ponto extra é dele, e a faixa descreve o LANCE. O
  fixture passou a trazer `live.result` e `live.scorer`.
- A faixa mostra `Touchdown · MIA · Hill`, numa string só. A primeira versão usava os dois
  slots que a faixa já tinha, e `Touchdown` e `Hill` separados por 12px liam como dois
  rótulos sem relação — a pessoa responsável pelo protótipo pediu separador e o time. O
  sobrenome sai de `shortName`, o MESMO helper da lista de campanhas do sheet: a faixa
  anuncia justamente o lance em que o sheet abre. Fica registrado que o nome renderiza
  `Hill`, e não `T.Hill`, porque é assim que o app escreve jogador em toda parte.
- `check:nfl` subiu de 28 para 30 conferências: a campanha em andamento pode faltar depois
  de qualquer pontuação (não só de chute), o touchdown mantém a posse e descreve o lance, e
  o ponto extra não pode voltar a ser o último lance do recorte.
- Validações executadas: `npm ci`, `npm run build`, `check:brands`, `check:nfl` e
  `check:player-props` passando; `npm run lint` com os MESMOS 45 problemas da `main`
  (38 erros, 7 avisos) — nenhum introduzido aqui. No navegador, em 375x812, nas duas marcas:
  home, competição, evento de futebol ao vivo, evento de basquete ao vivo, evento de NFL ao
  vivo e evento pré-jogo. O gatilho foi conferido com clique real sobre o nome do time, longe
  do "Ver mais", e o sheet abre em `Passe de 47 jardas · Tagovailoa → Hill · 3ª para 4`.
  Sem erros de console.
- Próximo passo: conferir as rotas publicadas depois do deploy do GitHub Actions. A raiz
  responder não prova que `/pitaco/apostas` e `/draftea/apuestas` carregam.
- O checkout `draftaco-v0` não faz parte deste trabalho e deve permanecer intacto.
