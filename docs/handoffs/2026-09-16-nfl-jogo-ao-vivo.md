# 2026-09-16 — O jogo de NFL andando sozinho até o intervalo

Entrega PUBLICADA (PR #6, merge `95667e2`). Este é o relato completo da rodada, movido para cá
quando o handoff principal passou a registrar a rodada seguinte — a regra de relógio da NFL.

## O que foi entregue

- Atualizado em: 2026-09-16.
- Checkout: pasta principal `draftaco`. A branch `feature/nfl-jogadas-ao-vivo` já está na
  `main`; o trabalho descrito aqui está PUBLICADO.
- Objetivo: o jogo de NFL do protótipo mostrava um INSTANTE congelado — o touchdown de 47
  jardas — enquanto o relógio do placar corria. Relógio andando com campo morto é a assinatura
  de um replay em laço. Agora os lances seguintes chegam sozinhos, um a um, até o intervalo; o
  protótipo abre na corrida ANTES do touchdown, o sheet de jogadas acompanha o jogo sem ninguém
  tocar em nada, e cada chegada tem movimento próprio na lista.
- **Entregue e publicado.** Pull Request #6, merge `95667e2`, deploy do GitHub Actions
  concluído com sucesso. Antes da PR rodaram `npm ci` e `npm run build`, com `check:nfl`
  (48 conferências), `check:brands` e `check:player-props` passando, e o `eslint src` ficou
  nos mesmos 26 problemas preexistentes (18 erros, 8 avisos) — nenhum novo.
- Esta sessão CONTINUOU o trabalho de outra sessão do Claude, na mesma pasta, que parou no
  meio por limite de créditos. O servidor de desenvolvimento na porta 5173 é daquela sessão e
  seguiu servindo esta mesma árvore de arquivos.

### O que a sessão anterior deixou pronto

- `src/features/sports/NflLiveFeed/` (novo): um store de módulo com `useSyncExternalStore`.
  Três árvores leem o mesmo jogo — o card da lista, o placar da `LiveEventPage` e o sheet de
  jogadas — e com um relógio por componente elas divergiriam em segundos.
- As contas ficam no gerador, não no navegador: `scripts/build-nfl-live-fixture.mjs` roda as
  mesmas regras do recorte estático uma vez por lance e emite `feed.steps` com o jogo inteiro
  já calculado (27 passos, de `Q2 05:58 13x13` até `Q2 00:02 16x14`). O módulo só escolhe qual
  passo está valendo agora.
- O relógio é DERIVADO dos lances e interpola entre um e o outro, então nunca deriva e
  reproduz de graça as paradas do jogo real. O intervalo entre lances é proporcional ao
  intervalo real, comprimido em 3x, com piso de 6s e teto de 14s.
- `hasNflLiveClock` desliga, só para o evento `nfl-1`, os seis relógios genéricos de 1 segundo
  que fazem os jogos mockados parecerem vivos. O jeito de desligar é OMITIR a chave do mapa de
  relógios, e não congelá-la: sem a chave, o consumidor cai no `dateTime` do evento, que é onde
  `withNflLiveState` põe o relógio do feed.
- `withNflLiveState` mora no ÚNICO ponto por onde toda lista de eventos passa
  (`getCalendarChampionships`, em `CalendarSection.tsx`). Espalhar a troca por cada tela daria
  versões diferentes do mesmo jogo na mesma sessão.
- `check:nfl` subiu de 30 para 46 conferências (arte, fixture e constantes).

### O que esta sessão fechou

- O card do jogo na lista de competição estava congelado: ele acompanhava o feed até o primeiro
  render e depois parava. Conferido no navegador antes da correção, com o trilho de jogos e o
  card lado a lado mostrando horários diferentes do MESMO jogo (trilho `04:15`, card `04:36`) e
  o card parado em `13x14 · Q2 04:36` por minutos.
- Causa: `useCompetitionMarketSelection`, em `src/components/CompetitionPage/CompetitionPage.tsx`,
  é o hook que MONTA esse card, e a lista de eventos dele é um `useMemo` com escopo de
  competição. Assinar o feed não basta ali: sem o feed nas dependências, o hook renderiza de
  novo a cada lance e devolve sempre o instantâneo do cache. O hook passou a assinar
  `useNflLiveFeed()` e o valor entrou na lista de dependências — o mesmo padrão que a `Home` já
  usava nos três memos dela.
- Duas regressões de lint da sessão anterior, corrigidas sem desabilitar regra nenhuma:
  - Em `CalendarSection.tsx`, `withNflLiveState` foi inserido ENTRE a diretiva
    `// eslint-disable-next-line react-refresh/only-export-components` e o
    `export function getCalendarChampionships` que ela protegia. A diretiva voltou para a linha
    de cima do export.
  - Em `LiveEventPage.tsx`, os dois efeitos de relógio passaram a ler `match.id` sem tê-lo nas
    dependências. Com o id fora da lista, trocar de partida deixaria o efeito decidindo pelo id
    da anterior. `match.id` entrou nos dois.

### A rodada do movimento ao vivo (abertura, avanço e chegada)

Três pedidos da pessoa responsável pelo protótipo, na mesma conversa.

**1. A abertura saiu do touchdown e passou para a corrida de 16 jardas.** O recorte de abertura
agora termina no lance 9005 (corrida de D.Achane, `Q2 06:38`, 13 x 7, campanha da MIA em
andamento numa 3ª & 4), e o touchdown virou o PRIMEIRO lance do horizonte, seguido do ponto
extra e do kickoff. A razão: abrir no touchdown gasta o melhor lance do recorte antes de alguém
ter olhado a tela — e o que o protótipo quer mostrar é o jogo ACONTECENDO. Mexido em
`demoPlays`/`bridgePlays` (`scripts/build-nfl-live-fixture.mjs`) e o fixture regerado; o feed foi
de 27 para 28 passos. O custo é a espera: entre a corrida e o touchdown o jogo real queimou 40
segundos, que a 3x dão ~13s até a primeira chegada — a maior espera do horizonte. Quem quiser
encurtar mexe em `FEED_TIMING.maxInterval`, e o preço é o relógio andar mais rápido que 3x nas
queimas longas.

**2. O sheet de jogadas passou a ACOMPANHAR o jogo.** Era o defeito relatado: com o sheet aberto,
os lances chegavam na lista e o campo nunca os mostrava. Três causas, todas em `PlaysView`
(`src/components/BottomSheet/NflPlaysStatsBottomSheet.tsx`):
- o encadeamento abria desligado (`autoAdvance` em `false`). Fazia sentido num recorte congelado,
  onde não havia próximo lance; com o jogo andando, virou o defeito. Abre ligado, e a pausa é o
  freio explícito de quem não quer ser levado adiante;
- o encadeamento era enquadrado na CAMPANHA: ao chegar no último lance dela, desligava. Agora a
  conta é feita na lista inteira de lances, então a reprodução atravessa para a campanha
  seguinte — o touchdown, o ponto extra e o kickoff passam sem ninguém tocar em nada;
- o avanço era decidido só no fim do lance. Na ponta ao vivo o próximo lance ainda não existe: o
  fim vem primeiro e a CHEGADA vem depois. Virou efeito, que dispara nas duas ordens.
O que decide se a reprodução atravessa para outra campanha é `isFollowing` — "esta reprodução
está acompanhando o jogo". Começa ligado, porque o sheet abre no lance mais recente; uma campanha
antiga aberta pela lista desliga, e é isso que a faz parar no fim dela em vez de emendar o resto
do jogo. A primeira versão comparava com a campanha ao vivo em vez de guardar a intenção, e
bastava a reprodução ficar atrás (uma aba escondida, por exemplo) para ela parar no meio, com o
jogo correndo à frente.
Junto disso, `isLastPlay` virou `continuesAfter` no `NflPlayReplayPanel`: "último lance da
campanha" e "a reprodução segue" eram a mesma pergunta no recorte congelado e deixaram de ser. É
`continuesAfter` que mantém o botão de pausa no respiro e que faz o palco sair apagando antes do
próximo lance entrar.

**3. Cada chegada tem movimento próprio.** O marcador do lance nasce no trilho, os marcadores se
redistribuem com transição em vez de salto, a linha da campanha que recebeu o lance recebe um
brilho que passa e sai, e a campanha que ESTREIA abre espaço na lista em vez de empurrar as
outras de uma vez. Nada disso é estado: quem sabe o que chegou é o `arrival` do feed, e cada
animação é disparada pela MONTAGEM de um elemento (o marcador novo, a linha nova, e um elemento
de brilho com `key` no id do lance, que remonta a cada chegada). A primeira versão guardava os
ids novos e limpava num `setTimeout`, e a limpeza do render seguinte cancelava o próprio
agendamento — a marca ficava para sempre na linha. O feed renderiza duas a três vezes por
segundo, por causa do relógio.

Dois defeitos encontrados e corrigidos no caminho, os dois de identidade instável:
- `playsAt`, no feed, devolvia um array NOVO de lances a cada tique de relógio. Além de fazer todo
  `useMemo` e efeito dependente recalcular no mesmo ritmo, era o que cancelava o agendamento da
  marca de chegada. Agora tem cache por `playCount`;
- `advanceTo` lia o mapa de lances por campanha do render em que o avanço foi AGENDADO. Entre
  agendar e disparar chegam lances, e o lance de destino podia não estar naquele mapa — o índice
  caía no fallback e a reprodução voltava para o PRIMEIRO lance da campanha, um salto para trás no
  meio do ao vivo. Observado no navegador: o foco pulou do 2º lance para o kickoff. Agora lê por
  ref o mapa atual, e o fallback é o ÚLTIMO lance da campanha — nunca o primeiro.

**4. Dois acertos de estado, pedidos depois de ver o movimento rodando.**
- Campanha que ACABA DE COMEÇAR: o ponto dela na linha do tempo fica na esquerda, não no meio.
  `markerOffset` centralizava a campanha de um lance só, o que era o desenho de um trilho parado;
  com o jogo andando, a campanha nasce com um lance e o ponto saltava do meio para a ponta quando
  o segundo chegava.
- INTERVALO: quando o relógio zera, o sheet entra em estado de intervalo — nenhuma campanha
  selecionada na lista, campo sem jogada e a palavra `Intervalo` centralizada na faixa escura
  acima do gramado (o mesmo lugar da palavra `TOUCHDOWN`, que é onde texto sobre o campo se lê).
  Saem também o cartão da jogada e a linha do tempo: os dois descrevem um lance em foco, e ali
  não há nenhum. A lista continua tocável, e escolher uma campanha tira a tela de intervalo da
  frente — rever uma campanha no intervalo é exatamente o que se faz ali. Quem está revendo uma
  campanha antiga quando o relógio zera NÃO é interrompido. Na Draftea a palavra sai
  `Medio Tiempo`, pelo catálogo (`'Intervalo': 'Medio Tiempo'`).

**5. No intervalo a faixa de situação não mostra mais descida.** O placar mostrava
`1ª & 20 · MIA 38` embaixo de `Intervalo`: a descida, a distância e o ponto da bola são do último
lance, e depois do apito não valem mais — a próxima posse começa depois do intervalo, em outro
lugar do campo. Quem monta a situação passa a marcar `footballSituation.isPeriodOver` quando o
feed acaba (nos dois pontos: `nflLiveMatch`, na tela do evento, e `withNflLiveState`, na lista),
e a faixa fica só com o acesso às jogadas. O desfecho do último lance (`Touchdown · MIA · Hill`)
também sai: no apito ele já não é a notícia. A faixa mantém os 26px e o placar continua sendo o
gatilho do sheet — a altura é fixa e o `Ver mais` é absoluto, então não há salto de layout.

**6. O sheet ganhou placar próprio, acima do campo, e o escudo do time na descrição do lance.**
Pedido com a referência da Live Activity da NFL (print do Twitter) na mão: escudo e sigla nas
pontas, o placar em números grandes por dentro deles e, no meio, o relógio com a situação de
campo embaixo. O sheet COBRE o placar da tela do evento — que é o gatilho dele —, e é justamente
ali que o placar muda a cada lance; sem isto, quem abre as jogadas para ver o jogo acontecendo
fica sem o número. A situação do meio sai de `getLiveSituationLabel`, que repete as três regras
da faixa do evento (nada no fim do período, o desfecho num lance de pontuação, descida e ponto da
bola no resto) — o mesmo instante não pode ser descrito de dois jeitos em duas telas. O escudo da
descrição entra por `contextLogo`, prop nova do `NflPlayReplayPanel`, com 20px: menor que os 32px
da lista de campanhas, porque ali ele acompanha uma linha de texto em vez de titular a linha.

**7. Acertos depois de ver o placar do sheet na tela.**
- A palavra `Intervalo` grande sobre o campo SAIU. Ela foi pedida quando o sheet não tinha placar;
  com o placar logo acima, era a mesma informação duas vezes. No intervalo o campo fica vazio e o
  estado é dito uma vez, no relógio do placar.
- No placar da tela do evento, o estado desce para a linha da SITUAÇÃO quando o período acaba —
  onde ficava `1ª & 20 · MIA 38` —, e não fica mais na linha do relógio, entre os números. Assim
  ele aparece uma vez e na mesma linha horizontal do `Ver mais` (medido: 246px e 247px de topo).
  A coluna do placar tem 52px fixos e alinha por baixo, então o número não se desloca. O ponto
  vermelho de ao vivo sai junto com a linha do relógio: no intervalo não há relógio correndo.
- Espaçamento da aba Jogadas, valores da pessoa responsável pelo protótipo: `gap: 24px` entre os
  chips e o bloco (`.nfl-stats-bs__body--plays`) e NENHUM gap dentro do bloco (`.nfl-plays`). Com
  os 8px de antes o placar encostava nos botões.

**8. O mesmo placar nas duas abas do sheet, e a tabela de quarters sem o total.**
- O placar da aba Jogadas passou a valer também na aba Estatísticas, no lugar do cabeçalho menor
  que havia lá (`Chiefs × Dolphins` com o relógio ao lado): ele dizia menos ocupando a mesma
  faixa, e dois placares diferentes no mesmo sheet eram a chance de um ficar atrás do outro. O
  componente virou `SheetScoreboard` e as classes saíram de `nfl-plays__scoreboard*` para
  `nfl-stats-bs__live-score*` — com as duas abas usando o bloco, o prefixo da aba de jogadas
  passaria a mentir para quem for ler o CSS. Saíram com o cabeçalho o `.nfl-stats-bs__live` e o
  ponto de ao vivo dele.
- A coluna `Total` saiu da tabela por quarter. O placar logo acima já é o total; repetido ali, era
  a terceira aparição do mesmo número na mesma tela.
- O gap da aba Jogadas deixou de precisar de modificador: os 24px são os mesmos do corpo do sheet,
  então `.nfl-stats-bs__body--plays` não declara mais gap (a classe continua no markup, que é o
  que dá os 40px dos chips do Figma).

**9. Dois acertos finais de posição e espaço.**
- No intervalo, o PLACAR volta a ficar onde estava. Tirar a linha do relógio do fluxo escorregava
  o número para baixo: a coluna do placar tem 52px e alinha por baixo. Agora a linha continua
  ocupando o lugar dela, invisível (`.live-event-inline__score-time--hidden`, com `aria-hidden`
  para o estado não ser lido duas vezes). Medido: 204px de topo do placar durante o jogo e no
  intervalo, com `Intervalo` em 246px contra 247px do `Ver mais`.
- `.live-event-inline__market-chips.content-filter-chips` perdeu os 8px de padding de baixo. Com
  eles fora, o override que o sheet de jogadas tinha só para cancelá-los saiu também, e com o
  override foi o modificador `.nfl-stats-bs__body--plays`, que já não declarava nada — as duas
  abas usam o mesmo espaçamento. A aba Estatísticas era a que ainda somava os 8px; agora as duas
  ficam nos 24px do sheet.

### Em aberto para a pessoa responsável pelo protótipo

- A faixa de situação do placar descreve o LANCE QUE ACABOU DE ACONTECER, com a descida e a
  distância do snap dele — não a situação que ficou. Com a abertura no touchdown isso não
  aparecia (ali a faixa mostra `Touchdown · MIA · Hill`); com a abertura na corrida, a primeira
  coisa que se lê é `2ª & 20 · MIA 37`, quando a corrida já ganhou 16 e a situação real é
  `3ª & 4 · KC 47`. É decisão de produto, não defeito: ou a faixa continua sendo o lance (como
  está, e como a lista de jogadas também descreve), ou passa a ser a situação de agora — e aí
  `liveSituation`, no gerador, precisa usar o desfecho do lance, o mesmo que o painel já calcula
  em `getNextSituation`. Não foi mexido.
- Defeito de texto PREEXISTENTE, visível na demonstração: `Corrida de 1 jardas` em vez de
  `1 jarda`, em `getPlayTitle` (`playNarrative.ts`). Fora do escopo desta rodada.

### Decisões e becos sem saída conferidos

- `src/components/CompetitionPage/CompetitionCalendar.tsx` NÃO é importado por ninguém: é uma
  implementação antiga da página de competição. A mudança de relógio que ela recebeu é coerente
  com as outras, mas não dá para conferir no navegador porque a tela não é alcançável.
- `SportsPageV2` só aceita `futebol` e `basquete` (`supportedSports`), então nunca mostra o jogo
  de NFL. Não há nada a fazer nela.
- O card "Outras partidas em destaque" da home e `getHomeCompetitionMatchFromCalendarEvent`
  descartam qualquer esporte que não seja futebol ou basquete, então o jogo de NFL não passa por
  ali e aquele memo de módulo não precisa do feed.
- Defeito PREEXISTENTE registrado, fora do escopo desta branch: nessa mesma lista, os cards de
  futebol ao vivo mostram o `dateTime` literal do dado (por exemplo `2T 22:12`) e nunca
  receberam os relógios genéricos, então o horário deles fica parado enquanto a tela do evento
  conta. Conferido na `main` do dado, não tocado aqui.

### Validações executadas nesta sessão

- `npm run build`, `npm run check:nfl` (48 conferências), `npm run check:brands` e
  `npm run check:player-props` passando. As duas conferências que o `check:nfl` tinha para o
  instante de abertura no touchdown não foram removidas: elas passaram a valer no PASSO em que o
  touchdown chega, que é onde a faixa precisa manter a posse com quem marcou. Entraram também a
  ordem do horizonte (touchdown, ponto extra, kickoff) e a exigência de a abertura ser um lance
  comum, com a campanha em andamento.
- O movimento ao vivo foi acompanhado no navegador por 40 segundos corridos, com a aba visível,
  registrando cada troca de estado: o sheet abre no lance mais recente, espera na ponta, a
  campanha nova entra na lista, a reprodução atravessa para ela e segue lance a lance (`1 de 1`
  -> `1 de 2` -> `2 de 2` -> `2 de 3` -> `3 de 3` ...), sem nenhum salto para trás.
- Cuidado para quem for repetir a medição: a aba escondida PARA o feed (é a regra de
  `handleVisibility`), e no painel do navegador do app a aba fica escondida entre chamadas. Sem a
  aba visível, o relógio congela e nenhum lance chega — parece defeito e não é.
- Campanha que começa: o ponto medido em `4px` no trilho de 343px, com a barra de progresso em
  `0px`, no lance `1 de 1` do kickoff.
- Intervalo conferido no fim do horizonte (alcançado no navegador acelerando `Date.now`, sem
  mexer no código): a palavra aparece, o palco sai, o cartão e o trilho saem, nenhuma campanha
  fica destacada e o relógio do placar mostra `Intervalo`. Tocando na primeira campanha da lista,
  a tela de intervalo sai e a campanha reproduz do primeiro lance.
- Faixa de situação no intervalo: de `2ª & 5 | KC 49 | Ver mais` para `Ver mais`, com zero itens
  de situação, 26px de altura e o placar ainda sendo o gatilho do sheet.
- Intervalo conferido de novo depois dos acertos: no sheet, campo vazio sem palavra e
  `KC 16 · Intervalo · 14 MIA` no placar; no header, `Intervalo | Ver mais` na mesma linha, sem
  relógio entre os números. Espaçamentos medidos no navegador: 24px no corpo, nenhum no bloco.
- Aba Estatísticas conferida depois da troca: o placar novo no topo, o cabeçalho antigo ausente,
  a tabela com quatro colunas de quarter e nenhuma de total (`7 6 0 0` e `0 14 0 0`, que fecham
  com o 13 x 14 do placar), e a aba Jogadas intacta ao voltar.
- Placar do sheet conferido nos três estados, nas duas marcas: lance comum
  (`KC 13 · Q2 4:47 · 2ª & 4 · KC 31 · 14 MIA`), lance de pontuação (`Touchdown · Hill` no lugar
  da descida) e intervalo (só `Intervalo`, sem situação). Na Draftea sai `2da & 20` e
  `Medio Tiempo`, pelo catálogo. O escudo da descrição mede 20px.
- No navegador, em 375x812, nas duas marcas: o card da lista e o trilho de jogos mostram o MESMO
  horário a cada amostra, o placar virou `13x14` -> `16x14` no field goal de Q2 00:22 e o relógio
  chegou a `Intervalo` — o protótipo TERMINA em vez de congelar outra vez. Na Draftea o card
  mostra `LIVE` e `ML`/`SPREAD`, com a nomenclatura da marca intacta.
- Página do evento de NFL e sheet de jogadas conferidos em seguida: abrem no lance que está
  valendo (`Passe de 6 jardas · Mahomes -> Kelce`) e seguem em frente com a lista de campanhas.
- Regressão do relógio genérico: a tela de um evento de futebol ao vivo (Flamengo x Cruzeiro)
  conta 1 segundo por segundo, amostrada de segundo em segundo. Sem erros de console.
- `npm run lint` acusa 53 problemas, mas varre também o `.worktrees/` local da máquina; em `src`
  são 26 (18 erros, 8 avisos). Desses, 4 avisos são `React Hook useMemo has an unnecessary
  dependency: 'nflLiveFeed'` — 3 da sessão anterior e 1 desta. O aviso é inerente ao padrão: a
  função de montagem LÊ o feed por fora do React (`getNflLiveFeed`) para continuar pura, então o
  ESLint não vê a dependência que o memo de fato tem. Desabilitar a regra é proibido pelo
  `AGENTS.md`.
- NÃO conferido nesta sessão: evento de basquete ao vivo e evento pré-jogo.

### Conferência depois do deploy

- `/pitaco/apostas` e `/draftea/apuestas` conferidos direto na rota, em 375x812. As duas
  respondem com HTTP 404 e o corpo do `index.html`: é o fallback de SPA do `deploy.yml`
  (`cp dist/index.html dist/404.html`), não um defeito — a rota renderiza.
- Na Pitaco, com a aba visível, o relógio do card andou de `Q2 04:28` para `Q2 03:57` em 10
  segundos reais: 31 segundos de jogo, que é a compressão de 3x valendo em produção.
- O placar da tela do evento abre o sheet de jogadas, que sobe com o placar próprio
  (`KC 13 · Q2 2:31 · 1ª & 10 · MIA 20 · 14 MIA`) e o campo reproduzindo o lance mais recente
  (`Corrida de 2 jardas · Achane`).
- Na Draftea: `LIVE`, colunas `ML`/`SPREAD`/`TOTAL` e navbar `Bets · Mis entradas · Gaming ·
  Rewards`, com o mesmo jogo.
- O protótipo publicado passa antes pelo portão de localização
  (`LocationPermissionGate`), que é preexistente: sem permissão de localização no navegador,
  nenhuma das duas rotas mostra o jogo.

### Próximo passo concreto

1. A decisão de produto em aberto na seção acima (a faixa de situação descrever o LANCE que
   acabou ou a SITUAÇÃO que ficou) continua esperando a pessoa responsável pelo protótipo.
2. Nada mais desta branch está pendente. A limpeza (branch local, branch remota e worktrees)
   não foi feita: o `AGENTS.md` pede autorização explícita para ela.

