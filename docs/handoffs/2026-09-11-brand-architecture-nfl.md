# Histórico de handoff — arquitetura de marcas e NFL

Este arquivo preserva o relato detalhado que estava no handoff operacional em 2026-09-11. Para o estado atual e o próximo passo, consulte [../AI_HANDOFF.md](../AI_HANDOFF.md).

## Estado atual

- Atualizado em: 2026-09-11.
- Agente: Claude.
- Status: duas frentes não commitadas convivem na mesma branch — (1) arquitetura de marcas (Codex, aguardando validação) e (2) NFL na rota de apostas (Claude, pronta para validação). Sem commit, PR, merge ou deploy.
- Checkout: pasta principal `draftaco`; branch `feature/brand-architecture`.
- Base preservada: commit `5924a21` de `feature/banners-promo-imperdivel`, 16 commits à frente da main local herdada. Foi mantida essa base, em vez de perder trabalho recente ao usar a main antiga.
- `origin` desta cópia foi atualizado para `design-draftea/draftaco`. Não houve fetch/push nem mudanças no repositório remoto. Tracking refs herdadas não são evidência do estado do novo destino.
- A pasta `draftaco-v0` não foi alterada.

## Tarefa em foco: NFL (Claude)

- Objetivo: adicionar a NFL no trilho de esportes entre NBA e Tênis e, ao clicar, abrir a página de competição conforme o Figma `Estudos Fluxos Draftea<>Pitaco`, nó `1762-73430`, com dados reais. Vale para Pitaco e Draftea.
- Esporte novo `nfl` (competição `nfl-liga`, campeonato `nfl`). O trilho ganhou uma seção própria com um único item `NFL` entre a seção de basquete e a de tênis.
- O card do carrossel reaproveita o card de colunas de mercado do basquete (`HomeCompetitionMarketColumnsMatchCard`, exportado de `HomeCompetitionSection`), que é pixel-compatível com o `leagueMarkets` do Figma: 183px de altura, três colunas de 64px (`RF` + badge `PA`, `Handicap`, `Total`), times empilhados e rodapé com `Ver mais`.
- Pills conforme o Figma: POPULARES, PARTIDAS, 1º TEMPO, PASSES, RECEPÇÕES, TOUCHDOWNS, CORRIDA, 2º TEMPO. `1º/2º TEMPO` derivam linha de total e handicap do jogo inteiro, com o mesmo tipo de offset de odd usado nos quartos do basquete.
- Acordeões de player props ganharam subtítulo opcional para o texto do Figma `(ganha se for maior ou igual)` / `(gana si es mayor o igual)`. Só a NFL usa; futebol e basquete seguem sem subtítulo.
- Jogo: 4 partidas pré-jogo (KC vs MIA, PIT vs CIN, BUF vs NE, PHI vs DAL). Não há jogo ao vivo na NFL de propósito: `liveEventSports` não inclui `nfl`, então a tela de evento ao vivo não foi estendida.
- Escudos vêm do CDN do TheSportsDB (`src/data/teamLogos.ts`); o badge da liga entrou em `competitionBadges.ts`. Avatar de jogador usa `playerAvatarNFL.svg` até os PNGs chegarem.
- Fotos dos 48 jogadores entregues pela pessoa usuária em `src/assets/jogadores/nfl/` vinham em `.webp`/`.jpeg` 150x150 com fundo opaco. Foram convertidas para `.png` com fundo transparente pelo pipeline do próprio repo (`swiftc scripts/remove-player-background.swift`), renomeadas para o slug do nome e registradas em `src/assets/jogadores/manifest.json` como `nfl/<nome-slug>.png`. Os originais `.webp`/`.jpeg` foram removidos do repo porque o glob de `src/data/playerImages.ts` só lê `*.png`. Atenção: `scripts/sync-player-images.mjs` considera entrada no manifesto como asset existente, então esses nomes não serão buscados automaticamente.
- `scripts/check-player-props-coverage.mjs` passou a cobrir a NFL (4 mercados x 4 partidas).
- Detalhe do evento (Figma `1825-51678`): clicar no card do jogo ou na aba do jogo no filtro superior abre o detalhe. `liveEventSports` passou a incluir `nfl`, então os dois caminhos usam o mesmo `getCompetitionLiveEventOpenPayload` do basquete e futebol.
- O detalhe reaproveita `LiveEventInlineHeader` (abas + matchHeader com `vs` + pills) e `LiveEventInlineMarkets`, com um ramo próprio para `nfl`: card `leagueMarkets` sem rodapé (155px), `Touchdown a qualquer momento` com odd única de largura total, `Jardas de passe`, `Recepções` e `Jardas de corrida` com 3 linhas, e as listas de `Total de Pontos` e `Handicap`.
- Mercados e colunas da NFL ficam em `src/shared/utils/nflMarkets.ts`, compartilhados entre a página de competição e o detalhe. As escalações seguem no `CalendarSection`, agora também consumidas pelo detalhe via `getCalendarPlayerPropsForEvent`.
- Novo mercado `td-qualquer-momento` (resultado único, sem linha) alimenta o acordeão de touchdown do detalhe. Ele não entra nas pills da página de competição.
- `HomeCompetitionMarketColumn` ganhou `fullLabel`: o cabeçalho da coluna precisa de rótulo curto para caber em 64px (`RF`), mas o betslip tem espaço e usa o nome real. A coluna de resultado da NFL declara `fullLabel: 'Resultado Final'`, que é a mesma string que o futebol já manda, então cai na entrada `RESULTADO FINAL` do catálogo da Draftea (`Resultado final`). `Handicap` e `Total` seguem sem `fullLabel` porque já são o nome do mercado, igual ao card de NBA.
- Efeito colateral desejado: com o rótulo real, o `isEarlyPayoutResultMarket` do `HomeCompetitionSection` volta a reconhecer o mercado de resultado e aplica o selo de pagamento antecipado. No detalhe, o `selectionDetails` do renderer inline passou a aceitar `marketTags`, para o card de colunas mandar o `PA` explicitamente e as duas telas mostrarem o mesmo selo.

## Replay de jogadas da NFL — entrega 1 (passe completo)

- Objetivo: transformar o estudo estático do Figma (`1915:3268`) em replay funcional dentro da aba Jogadas, com comportamento inspirado no replay da NFL no Twitter. Esta entrega cobre só o **passe completo**; os demais tipos de lance mostram estado informativo, sem animação.
- **Referência do Twitter foi acessada** (`x.com/i/nfl/game/...`, após login da pessoa usuária no navegador interno) e inspecionada no DOM. Arquitetura de lá: PNG do campo dentro de `<svg viewBox="0 0 1200 410">` com overlay SVG; grupos `nflGameFieldTurf`, `nflGameFieldSituation` (linhas de scrimmage `#1D9BF0` e primeira descida `rgb(255,212,0)`) e `nflGameFieldPlayTrace` (`Leg1`, `DirectionFlow`, `SnapMarker`, `MovingPin`), com a jogada desenhada numa profundidade constante. Velocidades 0,5×/1×/1,5×/2×/3×; replay de campanha percorre os lances, preenche a timeline e para em "Replay ended" sem loop; títulos curtos derivados ("29 yard pass", "Incomplete pass").
- **Não foi possível cronometrar** as fases do Twitter: o navegador limita `rAF`/`setTimeout` a ~1 fps no painel. As durações em `REPLAY_TIMING` são propostas, não medições, e estão reunidas num bloco só para ajuste.
- Divergências deliberadas do Twitter, conforme decisão do prompt: sem arco pontilhado inteiro, sem traço escuro persistente, e o foco alterna lançador → recebedor em vez de o retrato viajar com a bola.
- **Redução de movimento**: por decisão explícita da pessoa usuária, vale o AGENTS.md — a animação roda sempre, ignorando `prefers-reduced-motion`. O resultado continua legível em texto, então a funcionalidade não depende dela.

### Geometria (o ponto mais delicado)

- `src/features/sports/NflPlayReplay/fieldGeometry.ts` converte jarda em ponto no frame de referência 375×185 (o SVG usa isso como `viewBox`).
- Numa profundidade constante da imagem, jarda → x é **linear**; a perspectiva aparece entre profundidades. Por isso a jogada inteira fica numa profundidade só (`GROUND_Y = 132`), como no Figma e no Twitter.
- Calibração medida na própria arte (`campinhoNFL.png`, 1559×628), achando a fronteira end zone/gramado: linhas de gol em x=65,63 e x=308,62 no frame. Conferido contra o "50" pintado no overlay de marca.
- As linhas de scrimmage e primeira descida inclinam porque o campo alarga para a câmera: larguras medidas em 0,8241 (y=96) e 1,0895 (y=150) da largura do chão, centro estável em 187,25.
- `PASSER_SETBACK = 8.8`: no estudo a bola sai de x=106 enquanto a linha de scrimmage, na mesma profundidade, passa por 114,8 — o QB está atrás da linha, em shotgun. Vale só para passe.
- Verificação: `node --experimental-strip-types` sobre um teste ad hoc confirmou destino NE32 = 143,39 (Figma 143,7), origem NE20 = 105,43 (Figma 106), linha na base = 107,69 (Figma ~108) e altura de arco 27,14 para 37,7px (Figma 27). **Não virou script do repo porque `--experimental-strip-types` não existe no Node 20**, que é o alvo do projeto.

### Arquitetura

- `usePlayReplay.ts`: um único `requestAnimationFrame` dentro de um efeito, com tempo acumulado; as fases (`preparing`/`air`/`catch`/`run`/`result`) são derivadas do tempo, não guardadas em estado espalhado.
- **A troca de lance é remontagem**: `NflPlayReplayPanel` recebe `key={driveId:playId:runId:isOpen}`. Assim a limpeza do efeito mata o laço e nada do lance anterior sobrevive — sem efeito de sincronização, que o lint do React Compiler rejeitava. É também o que o Twitter faz (o SVG é reconstruído a cada lance).
- `NflFieldStage.tsx`: SVG transparente sobre a arte, camadas na ordem do Figma. Cores amostradas do estudo: rastro `#a877ff`, primeira descida `#ffd63d`, scrimmage `#40b8ff`.
- `playNarrative.ts`: títulos e situação por marca em código, porque os números quebram a string e o catálogo só casa nós de texto inteiros.
- `getDownAndDistanceLabel` saiu de `LiveEventPage.tsx` para `src/shared/utils/nflMarkets.ts` — o replay também precisa dele e importar de lá criaria ciclo, mesmo caso do `MarketAccordion`.

### Dados

- `scripts/build-nfl-live-fixture.mjs` ganhou `plays[]`: 56 lances, 15 passes completos. Campos por lance incluem `startYard` (jarda absoluta da própria end zone), `airYards`, `yardsAfterCatch`, `noPlay` e `penalty`.
- **`airYards` e `yardsAfterCatch` são separados**: o arco usa só a distância aérea e o avanço posterior é um trecho rasteiro. Somar os dois num número só fingiria que a bola voou o lance inteiro.
- `noPlay` é só `play_type === 'no_play'`. Penalidade num lance que valeu mantém o tipo real — marcar tudo com `penalty` como anulado fazia o kickoff inicial virar "Jogada anulada".
- `src/data/nflPlaysReplay.ts` foi removido: o mock saiu quando o dado real entrou.

### Correções depois da primeira validação

- O play da campanha travava no primeiro lance. Um lance sem animação (kickoff, incompleto, anulado) não tem voo para terminar, então nunca avisava o fim e a sequência parava ali. Agora ele fica `REPLAY_TIMING.staticHold` (1,5s) em estado informativo e cede a vez. Conferido: a campanha dos Dolphins percorre Kickoff → Passe de 9 jardas → Passe de 53 jardas → Ponto extra e para em `4 de 4`.
- A tela abria no último lance da campanha, que é um passe incompleto — sem animação, botão desabilitado, impressão de que nada funcionava. Agora abre no lance mais recente que tem replay.
- As linhas de scrimmage e primeira descida paravam antes das laterais, porque eu tinha usado as pontas do estudo (y 87..151) e lá elas já param curtas. A superfície de jogo vai de y=84 a y=162,5 (medido, constante ao longo do campo). As larguras nessas bordas vêm de um ajuste linear sobre as linhas de gol medidas de 10 em 10 entre y=88 e y=148 (`span(y) = 1,19727*y + 85,2126`): 0,7637 na lateral distante e 1,1501 na próxima. Medir direto na beirada falha porque a faixa branca do limite confunde a detecção.
- `getPlayResult` fora do passe passou a devolver o próprio título do lance. Um kickoff com touchback aparecia como "Jogada encerrada · sem avanço", que não informa nada.

### Linha animada e passe incompleto (segunda rodada de ajustes)

- **Fluxo direcional do caminho**, técnica copiada da referência: tracejado correndo por `stroke-dashoffset` com `<animate>` do SVG (SMIL), sobre um gradiente ao longo do caminho que vai de fraco na origem a forte no destino. Convertido do Twitter (`6 26`, largura 4,5, `viewBox` 1200) para o nosso frame (`1,6 5,4`, largura 2, frame 375); a duração fica em 0,32s porque período e velocidade escalam juntos. Sendo SMIL, **não depende do `rAF`** — foi a única parte da animação que consegui ver rodando aqui.
- O caminho é `arcPath()`: Bézier quadrática com o controle a `2h` acima do meio, **algebricamente idêntica** à parábola de `arcPoint`. Não é aproximação; o fluxo corre exatamente sobre a trajetória da bola.
- **Passe incompleto passou a ter voo.** `isAnimatablePass` virou `hasBallFlight` e aceita incompleto: `air_yards` traz a profundidade pretendida mesmo quando o passe cai, e 9 dos 10 incompletos deste jogo têm o alvo. Cobertura foi de 15 para **25 lances animados**; 31 seguem em estado informativo (corrida, chute, anulado).
- Desfecho do incompleto, refeito depois de ver o print certo da referência (a primeira versão foi um chute meu e errou em três pontos): **o foco NÃO passa para o alvo** — quem apareceria ali não ficou com a bola, e trocar a foto dava a entender que ficou, então o lançador permanece o lance inteiro; a trajetória e o marcador são **vermelhos** (`#f43f5e`, o mesmo do ponto de "ao vivo"); no ponto onde o passe caiu entra um **X**, não um anel; e a bola some ao chegar, cedendo o lugar ao X em vez de empilhar as duas coisas. Sem pulso, que é confirmação de recepção.
- **Tempos**: pausa inicial de 900ms para 450ms e `SEQUENCE_PAUSE` de 700ms para 320ms — o clique demorava a responder. Lances animados caíram para 1,8–2,3s.
- **Transição entre lances**: a `key` por lance remonta o palco, o que dava um corte seco. Entrada de 260ms (fade + deslocamento) no palco e no card de contexto costura um lance no outro.

### Botão de reproduzir: três estados e o caso do último lance

- Tocando mostra pausa, pausado no meio mostra play, e **terminado mostra a seta circular de repetir** (`ArrowCounterClockwiseIcon` do `@phosphor-icons/react`, que já era dependência). O triângulo no fim dava a entender que ainda havia algo por tocar.
- **No último lance da campanha o botão reinicia a CAMPANHA**, não o lance: rótulo `Repetir campanha` / `Repetir campaña`, e o clique volta para o primeiro lance com a sequência ligada. Nos demais lances segue `Repetir jogada`, repetindo só aquele.

### Chutes animados (kickoff, punt, field goal, ponto extra)

- `hasBallFlight` passou a aceitar chutes. Cobertura foi para **34 de 56 lances**; sobram 19 corridas e 3 lances anulados em estado informativo.
- Arco próprio para chute (`FlightKind = 'kick'`): razão 1,15, piso 26 e teto 66, contra 0,72 / 14 / 44 do passe. Um kickoff de 50 jardas não podia ter o arco de um passe curto; o teto fica abaixo do retrato (centro em y=58) para a bola não cruzar por cima da foto.
- **Pegadinha do kickoff**: no nflverse, `posteam` num kickoff é quem RECEBE, e `yrdln` é a linha de onde o adversário chuta. No referencial de `posteam` a bola voa para TRÁS (rumo à própria end zone) e só o retorno anda para frente. Punt, field goal e ponto extra são chutes do próprio `posteam` e vão para frente.
- **Pegadinha do field goal e do ponto extra**: `kick_distance` ali é a distância da TENTATIVA, que já inclui as 10 jardas da end zone e a profundidade do snap. Somá-la à posição dava queda na jarda 118, fora do campo. O que a bola percorre é da linha do snap até as traves, ou seja, até a jarda 100. A distância continua no rótulo, porque é assim que o futebol americano reporta.
- Conferência contra a súmula: o primeiro kickoff ("kicks 50 yards from MIA 35 to KC 15. L.Chenal to KC 31") bate exatamente — queda na 15, fim na 31. Teste em `testes/kickgeo.test.mts` cobre os 9 chutes do recorte.
- Textos: título ganha a distância (`Kickoff de 46 jardas`), situação vira `chutador → retornador` com retorno ou `Touchback`, e field goal reporta `bom` / `errado` a partir de `field_goal_result`.

### Touchdown na listagem de campanhas

- Campanha encerrada em touchdown mostra `Touchdown · <anotador>` no lugar do nome do time, como na referência. Vem de `fixed_drive_result` e `td_player_name`, novos campos `result` e `scorer` em `drives[]`.
- **A campanha em andamento fica sem resultado**: `fixed_drive_result` já traz o desfecho FINAL dela, então mostrá-lo entregaria o que ainda não aconteceu no jogo. Mesmo cuidado já aplicado em `drive_play_count` e tempo de posse.
- Campanha encerrada em field goal mostra `Field goal · <chutador>`, no mesmo formato do touchdown. O `scorer` do fixture passou a guardar o anotador do TD ou o chutador do field goal, conforme o caso.

### Abertura do sheet

- Abrir pelo "Ver mais" da faixa de situação cai no **último lance da campanha em andamento** e o reproduz do começo. Já era o comportamento; foi confirmado com carga limpa (`13 de 13`, tocando).
- `REPLAY_TIMING.openDelay` (360ms) segura o início na **primeira** abertura: o sheet sobe em 300ms (`slideUp`) e a preparação dura 450ms, então sem a espera sobravam só 150ms de preparação com a tela parada e a bola saía junto com a abertura. Trocar de lance depois disso começa na hora — `selectPlay` zera `isFirstOpen`, e aí não há animação de abertura disputando espaço.
- O sheet desmonta a `PlaysView` ao fechar, então "primeira montagem" equivale a "acabou de abrir"; é disso que `isFirstOpen` depende.

### Touchdown com onda nas letras

- A palavra "Touchdown" na linha de resultado ganha as letras subindo e descendo em sequência (45ms de atraso entre elas, 620ms cada), no degradê de marca do chip ativo.
- **Fica abaixo do campo, não como selo sobre o gramado**: o estudo aprovado é explícito nos dois pontos ("não colocar um selo grande sobre o gramado", "sem transformar o campo em uma celebração cheia de efeitos").
- **A onda corre uma vez e assenta**, em vez de ficar em laço. Em laço ela competiria para sempre com a lista de campanhas logo abaixo. Se quiserem o laço, é trocar `animation-iteration-count` para `infinite` em `.nfl-plays__touchdown-letter`.
- Acessibilidade: as letras são `aria-hidden` e o conjunto carrega `aria-label="Touchdown"`, senão o leitor de tela soletraria.

### End zone, traves e a faixa de touchdown

- **ATENÇÃO ao consultar o pbp: o jogo é `2023_19_MIA_KC`** (semana 19, playoff), não `2023_09_MIA_KC`. Consultas manuais no CSV filtrando o jogo errado devolvem números plausíveis e errados — aconteceu nesta tarefa e passou despercebido por uma rodada.
- **O ícone de reset só aparece no FIM da campanha.** Antes ele piscava a cada troca de lance.
  - Causa: no respiro entre lances (1,1 a 1,75s) o lance atual já terminou, então `replay.isEnded` ficava verdadeiro e o botão virava "repetir" antes de o próximo entrar.
  - `holdingForNext` (`ended && isSequence && !isLastPlay`) separa "acabou este lance" de "acabou a campanha". Nesse intervalo o botão segue sendo o de pausar, porque do ponto de vista de quem assiste a reprodução ainda está correndo.
  - O clique nesse estado precisou de `onStopSequence`: não há o que pausar dentro do lance (ele já acabou), quem segura o próximo é o encadeamento no componente de cima. Sem isso o botão mostraria pausa e faria outra coisa.
  - Medido numa campanha de 4 lances: `Pausar jogada` -> `Pausar campanha` em cada troca, e `Repetir campanha` só no `4 de 4`.
- **Clicar num ponto da timeline CONTINUA a campanha** dali em diante, como na referência do Twitter. Antes parava no lance clicado.
  - Razão: a timeline se parece com um scrubber de vídeo (barra de progresso, marcadores, botão de play ao lado) e todo player continua tocando depois de um seek. Parar contrariava o desenho.
  - Também resolveu uma inconsistência nossa: dos três pontos que chamam `selectPlay`, dois já encadeavam (abrir campanha pela lista, repetir campanha) e só o marcador da timeline não. A mesma superfície tinha dois comportamentos conforme o caminho de entrada.
  - Quem quiser ver um lance só usa o botão de pausa ao lado.
- **O seletor de velocidade está ESCONDIDO** a pedido da pessoa responsável pelo protótipo, atrás de `SHOW_SPEED_CONTROL` em `NflPlayReplayPanel.tsx`. Para voltar, trocar `false` por `true` — nada foi apagado (nem o botão, nem o estilo, nem `REPLAY_SPEEDS`).
  - O ESTADO de velocidade continua valendo e fica fixo em 1x: é ele que escala a duração de voo, fadeOut da bola, giro da placa, saída do palco e respiro entre lances. Remover o estado quebraria tudo isso.
- **Punt vinha SEM O NOME de quem chutou** — o nflverse guarda em `punter_player_name`, e o builder lia só `kicker_player_name`. Os 7 punts do jogo tinham punter e zero tinham kicker. O card ficava com "Punt de 28 jardas" e uma linha vazia embaixo, o que fez a jogada parecer sem sentido para quem não acompanha o esporte.
  - Também entrou `kickOutcome` (downed / fair catch / out of bounds / touchback): sem isso um retorno de 0 jardas parecia dado faltando, quando na verdade a bola foi dominada.
  - E o resultado do punt passou a dizer **"Posse para <adversário>"**. Punt é a jogada de desistir da posse; sem isso a distância sozinha é um número solto. Exigiu passar o nome do adversário do sheet até `getPlayResult`.
  - Coberto em `testes/kickgeo.test.mts`.
- **Jogada anulada por penalidade passou a ser DESENHADA quando ela aconteceu de verdade.**
  - O nflverse não preenche as colunas estatísticas (`passer`, `air_yards`, `yards_gained`) em `no_play`, porque o lance não conta na súmula. Mas ele aconteceu em campo, e o `desc` descreve. O protótipo mostrava campo vazio até para um TOUCHDOWN anulado (Mahomes -> Rice, 8 jardas, apagado por bloqueio ilegal).
  - `parseNullified` no builder extrai do texto oficial: tipo, passador, recebedor, corredor, jardas, lado e se foi touchdown. Validado contra os 17 `no_play` do jogo: 6 com jogada, 11 sem.
  - **Nem toda anulada teve jogada**: falta antes do snap (False Start, Delay of Game) para o lance antes de ele existir, e pedido de tempo também entra como `no_play`. Nesses casos `nullified` vem `null` e o lance segue estático — mostrar algo ali seria invenção.
  - **Passe incompleto anulado fica de fora** mesmo tendo acontecido: o texto diz "short right" mas não diz quantas jardas, e arbitrar a distância seria inventar o lance.
  - Num passe anulado o arco cobre o ganho INTEIRO: o texto não separa jardas aéreas de avanço.
  - Visual: caminho e marcadores em cinza neutro (`VOID_COLOR`), porque lilás é cor de confirmação e vermelho é erro do lance — aqui a jogada saiu bem, só não conta. Mais o selo `ANULADA` sobre o campo, que serve às duas marcas sem tradução.
  - Texto: o título passou a dizer O QUE foi anulado ("Touchdown anulado", "Corrida anulada de 2 jardas") e o resultado diz POR QUE, com um dicionário de faltas por marca em `getPenaltyName`.
  - A placa de jardas NÃO gira em anulada: não houve jardas para creditar, que é justamente o ponto.
  - `testes/anuladas.test.mts` trava a saída do extrator contra o que o texto diz — é regex sobre texto livre, a peça mais frágil do pipeline.
- **A placa do jogador GIRA no fim do lance e mostra as jardas** (`.nfl-plays__badge-front` / `--back`). No fim da animação a placa ficava parada justamente quando o resultado chega; agora ela vira e entrega o número onde o olho já está.
  - Só onde há avanço para contar: passe completo e corrida. Passe que cai não tem número; em chute o "quanto andou" é ambíguo (distância do chute ou do retorno?), então fica de fora. Conferido: incompleto e kickoff não giram.
  - São DUAS faces empilhadas com animações em fases opostas — a da frente encolhe em `scaleX` na primeira metade, a de trás cresce na segunda. Assim o próprio CSS troca o conteúdo no meio do giro, sem temporizador em JS para sincronizar.
  - Não é flip 3D: `transform-style: preserve-3d` não é confiável em SVG. Numa placa redonda o `scaleX` é indistinguível de uma moeda virando e funciona em qualquer navegador.
  - `transform-box: fill-box` é obrigatório: sem ele a origem da escala seria o canto do viewBox e a placa voaria para fora.
  - As duas metades são ASSIMÉTRICAS: ida 200ms, volta 280ms. Um giro real sai rápido e leva mais tempo assentando do que partindo.
  - `ease-in` na ida NÃO é escolha estética: a largura projetada de uma moeda girando segue cos(θ), então de 0 a 90 graus ela sai devagar e acelera. Com o `ease-out` da volta, as duas metades já formam uma curva in-out CONTÍNUA. Pôr `ease-in-out` em cada metade faria o giro frear de perfil e virar duas animações — foi perguntado e recusado por isso.
  - A volta usa `cubic-bezier(0.22, 1.35, 0.36, 1)`: o segundo ponto de controle passa de 1, então a placa excede o tamanho (pico medido 1,041) e assenta em 1. É o momento do giro, e era o que faltava para ele parecer físico.
  - Brilho: um clarão em `drop-shadow` que NÃO volta a zero (sobra glow de fundo enquanto o número está na tela) e um anel de impacto que abre no instante da virada. O anel escala em vez de animar `r` — mais portável, e escalar afina o traço junto, que é o que um anel de impacto faz. Ele fica FORA do grupo que gira, senão sairia achatado.
  - **A troca de lance tem respiro próprio quando há placa**: `SEQUENCE_PAUSE_GAIN` = 1750ms contra 1100ms, e `stageExitDelayGain` = 1280ms contra 620ms. Sem isso o palco começava a sair em 620ms, no meio do giro, e o número apagava enquanto aparecia. Sobram 580ms de número parado.
  - A regra de quais lances giram vive em `showsGainBadge` (playNarrative), usada pelo palco E pelo encadeamento: duas cópias sairiam de sincronia na primeira alteração.
  - `testes/placa.test.mts` trava a ORDEM desses tempos, que está espalhada por dois arquivos e quebra em silêncio. A classificação em si não dá para testar em Node (`playNarrative` importa sem extensão, só o Vite resolve) e foi conferida no navegador.
  - A unidade é por marca: JD no Pitaco, YD na Draftea.
- **Comemoração de touchdown**: onda em laço + partículas.
  - A onda das letras fica em LAÇO até o lance trocar (a troca desmonta o elemento e leva a animação junto). `touchdownWave` = 1400ms é o CICLO, não o movimento: o keyframe sobe e volta nos primeiros 37% e descansa no resto, senão a palavra pulsaria sem parar. Medido: 4 passadas em 6s.
  - **Fogos de artifício** (`.nfl-plays__fw`): cada faísca são TRÊS camadas aninhadas, uma por eixo do movimento.
    - `span` faz a gravidade em `ease-in` (começa parada e acelera), `span i` guarda o giro fixo do ângulo, e `i::before` faz o disparo para fora em `ease-out` (sai rápido e desacelera).
    - Somar um ease-out para fora com um ease-in para baixo dá uma PARÁBOLA de verdade. Com uma camada só a faísca anda em linha reta — era o defeito da primeira versão, que o usuário rejeitou. Medido por scrub da Web Animations API numa faísca horizontal: nos primeiros 72ms o X anda +36,5 e o Y +0,1; nos últimos 72ms o X anda +0,1 e o Y +3,2.
    - A gravidade tem de ficar FORA do giro, senão apontaria para a direção da faísca em vez de para baixo.
    - O rastro sai de graça do giro: a faísca é uma cápsula deitada com `transform-origin` na ponta de trás, então aponta para fora sozinha e a cauda fica virada para o centro. O degradê nasce transparente atrás e termina branco na frente — cabeça quente, cauda esfriando, sem custar animação de cor.
    - `::before` do container é o clarão do estouro, que some antes das faíscas chegarem longe: é ele que dá um "momento" à explosão em vez de só aparecerem riscos.
    - 40 faíscas em duas camadas de estilhaço (26 + 14, a segunda 95ms depois): um estouro só, de raio uniforme, vira um anel; duas com velocidades diferentes dão volume. Um quarto delas cintila — todas cintilando viraria ruído.
    - Abre mais para os lados via DISTÂNCIA por ângulo (`1,55 - 0,85·|sin|`), não achatando o container: assim as faíscas não saem deformadas. Sem isso a explosão invadiria o gramado e estouraria o topo do frame.
  - Os valores das faíscas são FIXOS, calculados uma vez no carregamento do módulo: sortear a cada render reiniciaria as animações a cada quadro do laço de reprodução.
- **Cores da linha de resultado e da timeline**: "Touchdown" e as jardas passaram a BRANCO (o degradê de marca competia com a palavra sobre o campo, que é onde a celebração acontece). Barra de progresso e pontos já percorridos usam `--ds-current-score`; o marcador atual tem o mesmo fundo e anel na mesma cor a 40%. O nome do jogador sobre o campo perdeu o contorno preto e ficou só branco.
- **"TOUCHDOWN" sobre o campo saiu do SVG e virou HTML sobreposto** (`.nfl-plays__field-touchdown`), porque cada letra precisa ESCALAR sozinha e `<tspan>` não aceita `transform` de forma confiável entre navegadores (é SVG2, suporte varia). A animação antiga em tspan provavelmente nem rodava.
  - Duas fases: cada letra nasce em `scale(2)` transparente e assenta (70ms de passo, 420ms cada); só depois da palavra formada a onda percorre as letras até `scale(1.35)` (começa em 1020ms, 55ms de passo). A última letra entra em 980ms, então as fases não se sobrepõem.
  - Ordem das animações importa: a entrada usa `both` e a onda usa `forwards`. Com `both` na onda, o quadro inicial dela valeria durante a espera e atropelaria a entrada — as duas mexem em `transform`.
  - Fonte 11 -> 16 unidades do frame, e `top` de 13 (baseline) para 14% do frame: mais para baixo, na faixa escura, e ainda bem acima do gramado (que começa em 45%).
  - `.nfl-plays__field` ganhou `container-type: inline-size` para a fonte escalar com o campo via `cqw`, com um valor em px antes como reserva.
- Retrato, haste e nome **sobem 6px** em relação ao estudo: centro do retrato 58 -> 52, haste 78 -> 72, nome 30 -> 24. `STEM_TOP_Y` passou a ser derivado (`PORTRAIT_CENTER_Y + PORTRAIT_RADIUS`) para os três não saírem de sincronia. Conferido que o nome não colide com a palavra TOUCHDOWN (baseline 24 contra 13, e 73px de folga horizontal, porque num touchdown o retrato vai para a end zone e o centro do topo fica livre).
- (tentado e descartado) Sombra radial do jogador no gramado, sob a haste do retrato, como na referência do Twitter. Não ficou boa na nossa arte e foi removida por decisão da pessoa responsável pelo protótipo. O `depthScale` que ela exigia saiu junto, para não virar código morto.
- Espessura do tracejado: cor **2,8** e contorno **3,6** (eram 2 e 3), em `FLOW_STROKE` / `FLOW_CASING_STROKE`. O X do passe incompleto subiu junto, 1,8 -> 2,4. Limite: com `linecap: round` cada traço rende a própria largura a mais de comprimento e o período é fixo em 7, então nesses valores sobram 2,6 de vão na cor e 1,8 no contorno. Para ir além, `FLOW_DASH`, `FLOW_PERIOD` e `FLOW_DURATION` têm de crescer junto.
- **A troca entre lances tem entrada E saída.** Antes só o lance novo era animado: o antigo sumia num quadro só, e a transição lia como corte mesmo depois de aumentar o respiro.
  - `.nfl-plays__stage--leaving` apaga o palco inteiro quando há um próximo lance para entrar (`replay.isEnded && isSequence && !isLastPlay`). No último da campanha o palco fica: ali se está olhando o desfecho, não esperando a troca.
  - Sequência completa: bola assenta -> bola apaga (180+420) -> palco apaga (620+380) -> ~100ms de campo limpo -> palco novo entra (480ms). `SEQUENCE_PAUSE` = 1100ms, dividido pela velocidade. Medido no navegador: 1114 e 1099ms entre lances em 1x.
  - Entrada do palco e do card foram de 260 para 480ms; o traço do caminho, de 220 para 400ms.
- **`segmentsFor()` decide ar e chão por tipo de lance**, e substituiu a cadeia de ternários no painel.
  - Consertou o **retorno de kickoff, que não animava**: os segmentos usavam `complete` e `yardsAfterCatch`, que são campos de PASSE e valem 0 em qualquer chute. O chute ficava com zero jarda dos dois lados, a fase de corrida nunca abria e o retorno aparecia desenhado mas parado. Agora chute usa `kickDistance` no ar e `returnYards` no chão.
- **A bola some ao SER RECEBIDA**, quando ainda há trecho rasteiro pela frente (passe com avanço, chute com retorno): dali em diante quem anda é o jogador com a bola na mão, e mantê-la desenhada fazia parecer uma bola rolando sozinha ao lado do retrato.
  - O fade cabe dentro da fase de recepção (`catchPulse - ballFadeDelay` = 280ms), para a bola sumir ANTES de a corrida começar.
  - O rastro do trecho rasteiro é suprimido nesse caso: pontos atrás de uma bola invisível ficavam sem leitura.
  - Touchdown e chute ao gol seguem de fora: ali a bola atravessa a corrida e para na posição final, que é a informação do lance.
- **A bola apaga ao assentar** (`nfl-plays__fade-out`), exceto em **touchdown e chute ao gol**, onde a posição final dela é a informação do lance. Lance sem animação também não apaga: não houve queda, a bola só marca a posição.
  - A sombra apaga junto, senão sobraria uma mancha sozinha no gramado.
  - O keyframe tem só `to`, para o `from` implícito ser a opacidade computada de cada elemento — assim a sombra parte dos seus 0,45 em vez de pular para 1 antes de apagar.
  - Espera e duração (180ms + 420ms) vêm de `REPLAY_TIMING` e são divididas pela velocidade da reprodução, senão em 3x a bola ainda estaria apagando quando o lance trocasse.
- `BALL_SIZE` foi de 18 (estudo) para **15**: em 375px a bola competia com o retrato e com os marcadores.
- `SEQUENCE_PAUSE` foi de 320 para **780ms**, e agora divide pela velocidade. Precisa ser maior que os 600ms do fadeOut, senão o lance troca com a bola ainda apagando. Medido no navegador: 759 / 793 / 791ms entre lances em 1x.
- **Corrida passou a ser animada** (era o último tipo comum ainda estático — 19 lances no recorte).
  - `isRun` + `isAnimatable` em `playNarrative`. `hasBallFlight` continua significando "a bola VOA": corrida anda, não voa, e reaproveitar o arco do passe nela mostraria algo que não aconteceu.
  - `ReplaySegments` ganhou `hasFlight`. Sem ele a corrida ficava 780ms parada "no ar" (piso de `airMin`) antes de andar, e ainda dava um pulso de recepção inexistente. É campo próprio e não `airYards === 0` porque passe também pode ter zero jarda aérea.
  - `complete` é verdadeiro em corrida, senão o caminho inteiro saía vermelho (o ramo do passe que falhou).
  - Origem e "recepção" no mesmo ponto; a corrida inteira é o trecho rasteiro. Por isso a segunda bolinha usa `arrivalX` (fim da corrida), senão ela empilhava na bolinha de saída e o fim do lance ficava sem marca.
  - O rastro passou a ser amostrado da mesma função que move a bola em cada fase (`trailFrom`): arco no ar, reta no chão.
  - Em corrida o retrato VIAJA com a bola, porque quem corre carrega a bola. `origin` virou `passer || rusher`, senão o nome sumia durante a preparação.
  - Falta ainda: sack/perda, interceptação e fumble. E "Corrida de -4 jardas" deveria ler "Perda de 4 jardas".
- **O caminho do lance tem UMA cor só** (`pathColor`): as duas bolinhas (saída e recepção), o rastro, o fluxo do traço e o pulso de chegada. Elas são as pontas do mesmo caminho, não marcadores separados — é o que a referência do Twitter faz. Passe que cai fica vermelho por inteiro, marcador de saída incluído. Antes as bolinhas eram brancas.
- **Os testes de geometria NÃO estão no repositório** e já se perderam uma vez: ficavam em `/tmp`, que a máquina limpou no reinício. Agora vivem no scratchpad da sessão, em `testes/` (`comum.mts`, `geo`, `alvos`, `kickgeo`, `profundidade`, `placa`, `anuladas`), e rodam com `node --experimental-strip-types`.
  - Eles não foram para o repositório porque `--experimental-strip-types` exige Node 22+, e o projeto tem como alvo o Node 20 (`docs/AI_CONTEXT.md`). Entrar assim seria uma armadilha para quem rodasse no Node do projeto.
  - Se forem para o repositório, converter para `.mjs` importando o build, ou subir o Node alvo. Enquanto isso, quem retomar precisa recriá-los — o que já custou uma rodada.
- **Divergência deliberada do estudo aprovado: não há recuo do passador.** Todo lance sai de CIMA da linha de scrimmage — passe, corrida e chute.
  - O estudo põe a bola em x=106 com a linha de scrimmage em x=114,9 na mesma profundidade (verificado no nó `1916:3269`: `Referência / Linha de scrimmage — NE 20` e `Bola / Posse de Maye`), ou seja, o QB em shotgun ~3,6 jardas atrás da linha. O estudo é coerente nisso: a recepção em 143,7 dá NE32 contando a partir da LINHA, não da bola.
  - A referência do Twitter faz o contrário, e a pessoa responsável pelo protótipo escolheu essa convenção. Razão: a linha azul marca onde a bola ESTAVA, e num diagrama começar o lance em cima dela lê mais direto do que reproduzir a formação.
  - Havia também um defeito próprio: o recuo valia só para passe, então a mesma jarda de snap era desenhada em dois lugares conforme o tipo do lance.
  - `PASSER_SETBACK`, `passerX` e `passerXAtDepth` foram removidos. `testes/profundidade.test.mts` trava a invariante comparando a origem com a linha azul interpolada na profundidade do lance.
- **Cada lance é desenhado numa de TRÊS profundidades**, conforme o lado do campo em que correu — `PLAY_DEPTH` = topo 101,5 / centro 116,75 / base 132.
  - A profundidade é UMA por jogada e não muda enquanto ela corre: a bola não sai da base e vai para o topo. O que muda é de um lance para o outro. Por isso `atDepth()` no `NflFieldStage` lê TODA jarda do lance na mesma linha.
  - A base (132) é o y do estudo aprovado, que era a profundidade única antes disso. Topo e base ficam à mesma distância em PIXELS do centro (15,25 para cada lado). A primeira versão igualava a distância REAL em campo (26,7 pés dos dois lados, topo em 105,83): fisicamente correto, mas a perspectiva comprime a metade distante e a faixa de cima lia como colada no centro. Aqui a leitura vence a física — as três faixas precisam se distinguir de relance. O preço assumido é que um lance no topo é desenhado mais perto da lateral (37,3 pés do centro contra 26,7 da base).
  - **Não são as marcas de hash.** As hashes ficam a 5,6m uma da outra num campo de 49m: dariam ±4px aqui, invisíveis. As faixas representam o lado do campo em que o lance correu.
  - Origem do dado: `pass_location` / `run_location` do pbp, que dizem para onde o lance FOI — o pbp não tem posição lateral da bola. Kickoff, field goal e ponto extra são `middle` por regra; quem não tem lado próprio (punt, jogada anulada) herda o do lance anterior, porque a bola não andou de lado. É inferência plausível, não medição.
  - O lado vira profundidade conforme o sentido do ataque: quem ataca para a direita tem a própria esquerda apontando para longe da câmera (topo); quem ataca para a esquerda, o contrário.
  - Coberto por `testes/profundidade.test.mts`.
- Medições na arte, na profundidade da jogada: linhas de gol em 65,63 e 308,62; faixa roxa da end zone em 40,88–63,88 e 310,62–333,62, com 23px de largura. Como uma jarda vale 2,43px, isso dá 9,47 jardas — as 10 regulamentares, descontando as linhas brancas de limite.
- `yardToX` passou a aceitar de **-10 a 110** para alcançar as duas end zones. Antes travava em 0..100, então nada podia entrar no roxo.
- **Touchdown termina na jarda 105** (meio da end zone), não em `startYard + yards`, que dá exatamente a linha de gol e deixava a bola em cima dela.
- **Field goal e ponto extra: a bola para NO MEIO DO GOL, entre os dois postes, e quem chuta não sai do lugar.**
  - A bola para no **meio da abertura, medido na altura em que ela para** (y=66): postes em 317,5 e 354,6 à direita (meio 336,1) e em 20,1 e 57,0 à esquerda (meio 38,6). `GOAL_TARGET` = (336,1, 66) e (38,6, 66). Não medir isso na base: a trave é um "Y" em perspectiva, o mastro inclina e os postes abrem conforme sobem, então o x da base (330,0 / 44,6) encosta a bola num dos postes lá em cima. A base serve para definir a profundidade do eixo central (ver abaixo).
  - (histórico do erro) O x chegou a ser movido de ~337 para 330 lendo "o meio deveria ser a base do gol" como instrução sobre o LADO. Era sobre a PROFUNDIDADE: a base das traves define o eixo central do campo, de onde o chute sai. Com a profundidade errada o chute inteiro parecia torto, inclusive o ponto final. Lição: separar as duas perguntas — a base responde "de que profundidade sai" e a abertura medida na altura da bola responde "em que x ela para".
  - Para enxergar isso foi preciso recortar e ampliar a trave na arte (11x) e medir a abertura poste a poste, em vez de inferir por agrupamentos de pixel. As leituras só são limpas entre y=54 e y=70; abaixo disso o travessão entra na conta e o "meio" derrapa.
  - **O pulso de chegada nasce onde a bola chegou, não no gramado**: `cy={catchY}`. Num chute ao gol a bola para no alto, entre os postes, e um anel na grama marcaria um ponto em que ela nunca encostou. Como `catchY` é a própria linha do chão em todo lance rasteiro, isso muda só o chute ao gol — passe, corrida, kickoff e punt seguem iguais.
  - **O chute sai do eixo central do campo** (`FIELD_MID_Y = 116,75`), e não da linha padrão da jogada em y=132: um field goal é batido do centro, não de perto de uma lateral. O eixo foi medido pela BASE das duas traves, que encontram o gramado exatamente em y=116,75 nos dois lados — logo ele é horizontal nessa altura. Não usar o meio em pixels da superfície (84..162,5 daria 123,25): a perspectiva comprime a metade distante e joga o centro real para cima, e 123,25 deixa o chute 6,5px abaixo da base do gol. Isso exigiu `yardToXAtDepth`, porque o x de uma jarda muda com a profundidade.
  - **Quem chuta permanece na posição inicial**: `staysAtOrigin` cobre passe que cai e chute sem retornador (field goal, ponto extra, punt sem retorno). Só a bola viaja. Kickoff tem retornador, e aí o foco passa para ele.
  - `arcPoint` e `arcPath` foram generalizados para origem E destino livres (antes só o destino), com a base sendo a reta entre os dois e a parábola fazendo a corcova. Com os dois no chão a conta é idêntica à parábola simétrica do estudo, então passe e kickoff não mudaram.
- (histórico) **Antes desta rodada os chutes ao gol pousavam no gramado, no fundo da end zone.** Traves medidas na arte — travessão em y=96,5 (direita, centro x=341,6) e y=94,2 (esquerda, x=32,1), contra 132 da linha do chão; topo das traves em y=26. O alvo do chute ao gol é o centro do travessão, no alto, e por isso ele NÃO passa por `yardToX`: tem ponto próprio em `GOAL_TARGET`.
- `arcPoint` e `arcPath` foram generalizados para aceitar um destino fora do chão: a base virou a reta entre origem e destino, com a parábola fazendo a corcova por cima. Com destino no chão a conta é idêntica à parábola simétrica do estudo, então nada mudou para passe e kickoff.
- Altura do arco ao gol é FIXA (78, ápice em y≈36), e não proporcional à distância: um field goal sobe alto independentemente de ser de 28 ou 50 jardas.
- `testes/alvos.test.mts` cobre isso: confirma que os dois touchdowns do recorte caem dentro do roxo, que os três chutes ao gol chegam ao fundo, e que a jarda 100 fica FORA do roxo (era o defeito relatado). Tolerância de 1px pela espessura da faixa branca.
- "TOUCHDOWN" também aparece sobre o campo, na faixa escura acima do gramado (`y=13`, a arte começa em `y=20`), com a mesma onda. Nunca sobre a grama, pelo que o estudo pede. Num touchdown a bola está numa end zone, então o retrato vai para o extremo e o centro do topo fica livre.

### Limitação de verificação (importante para quem continuar)

- **O `requestAnimationFrame` fica congelado no painel do Claude quando a página está ociosa.** Sonda: `setTimeout(1500)` disparou em 1853ms, `rAF` não disparou em 4251ms. Só há quadros quando algo força repintura (screenshot, interação).
- Consequência: a animação **não foi assistida**. Foi verificada por estado final, geometria (teste em Node contra os números do Figma) e progressão da sequência. A fluidez do voo precisa de validação em máquina real.
- Durações calculadas: lance animado 2,2–2,7s; lance sem animação 1,5s; campanhas de 9,9s (4 lances) a 33,8s (13 lances). Se ficar longo demais, os números estão todos em `REPLAY_TIMING`.

### Pendências

- `getDownAndDistanceLabel` não trata "& Gol" quando a primeira descida coincide com a linha de gol (aparece "2ª para 18" a partir da MIA 18). Não mexi porque o helper é compartilhado com o header ao vivo, já validado.
- **Fase 2**: demais tipos de lance (corrida, incompleto, touchdown, sack, interceptação, punt/kickoff/field goal, penalidade). Hoje todos caem em estado informativo e o botão de reproduzir fica desabilitado.
- O título de corrida negativa sai como "Corrida de -4 jardas"; deveria ser "Perda de 4 jardas".
- Durações das fases não validadas visualmente em máquina real — no painel do Claude o `rAF` roda a ~1 fps e o voo inteiro cabe dentro de um quadro, então a animação foi verificada por estado final e geometria, não assistindo.
- Reprodução de quarter inteiro (a campanha já encadeia; o quarter não).

## Alterações da NFL

- `src/components/CalendarSection/CalendarSection.tsx`: chips de mercado da NFL, escalações por time e mercado, builder de player props, ramo de `getMarketOdds`, campeonato `nfl` e mapeamento `nfl-liga -> nfl`.
- `src/components/CompetitionPage/CompetitionPage.tsx` e `.css`: pills da NFL, colunas `RF/Handicap/Total`, card de colunas dentro do carrossel, subtítulo do acordeão e largura/snap do card no trilho do carrossel.
- `src/components/HomeCompetitionSection/HomeCompetitionSection.tsx` e `.css`: card de colunas exportado e liberado para `nfl`, com rodapé opcional (`hideFooter`); card de player props com `oddsLayout="single"` para mercados sem linha; avatar de player props por esporte; rótulos de odd de mercado de duas vias.
- `src/features/sports/LiveEventPage/LiveEventPage.tsx` e `.css`: pills por esporte, subtítulo opcional no acordeão, seção de player props da NFL com contagem própria de "Carregar mais" e o ramo de mercados da NFL no detalhe.
- `src/shared/utils/nflMarkets.ts`: colunas `RF/Handicap/Total`, derivação das linhas de 1º/2º tempo e as pills do detalhe.
- `src/components/SportRail/SportRail.tsx` e `src/components/SportFilterBar/competicaoData.ts`: item e configuração da NFL.
- `src/shared/types/home.ts`: união `HomeCompetitionSport` com `nfl`.
- `src/shared/utils/competitionNavigation.ts`, `src/shared/utils/teamAbbreviations.ts`, `src/data/teamLogos.ts`, `src/data/competitionBadges.ts`, `src/services/theSportsDbTeamLogos.ts`: navegação, siglas, escudos e badge.
- `src/features/betslip/BetslipPageV2/betslipDisplayUtils.ts`: avatar de jogador da NFL no betslip.
- `src/brands/draftea/legacyCopy.ts`: textos es-MX da NFL, incluindo o subtítulo do Figma.

## Alterações

- `src/features`: telas movidas para auth, home, sports, casino, betslip, promotions, games e handoff; PromoDraftaco acompanha promotions.
- `src/shared`: hooks, utils e types compartilhados, roteamento/configuração/storage de marcas e localização durante renderização React.
- `src/brands`: configuração, mensagens e logos/ícones de navegação por marca. Catálogo legado Draftea separado; sem MutationObserver.
- `App.tsx`, `main.tsx`, Navbar/Header e imports ajustados para as novas fronteiras. Rotas conservam a marca; o item cassino permanece visível e sem ação na navbar, conforme a correção final da pessoa usuária.
- Persistência de tema, flags, favoritos, recordes e atalhos dos jogos separada por marca. Cache público de logos esportivos continua compartilhado.
- `vite.config.ts` e `tsconfig.app.json`: runtime JSX de localização, exclusão do pré-bundle para HMR correto e base `/draftaco/` tanto no build quanto no preview.
- `scripts/check-brand-contracts.mjs`, script `check:brands`, README, AI_CONTEXT e COLLABORATION documentam contratos e fluxo local.

## Decisões

- URL determina marca/idioma: Pitaco `pt-BR`, Draftea `es-MX`; mudança de marca recarrega o app para limpar estado transitório.
- Draftea: “Crear cuenta” visível e sem abertura de fluxo; URL direta de cadastro redireciona para apostas. Login simulado funciona.
- Pitaco: fluxo de cadastro preservado.
- Revisão final: cassino desativado nas duas marcas por `features.casino: false`. Item da navbar visível e sem ação; filtro e cards promocionais relacionados foram retirados; rotas diretas retornam para apostas. Código de cassino preservado.
- Componentes, dados e assets comuns restantes continuam nas pastas existentes. Não houve duplicação do app nem nova dependência de projeto.
- Novos textos devem usar mensagens explícitas. O adaptador JSX mantém compatibilidade com o catálogo herdado, sem alterar valores digitados. A cobertura não representa revisão linguística completa de todas as telas. Artes, nomes de jogos, moeda e dados mockados brasileiros foram preservados.

## Validações da NFL

- `npx tsc -p tsconfig.app.json --noEmit`: passou.
- `npm run build`: passou.
- `npm run check:brands`: passou em `/` e `/draftaco`.
- `node scripts/check-player-props-coverage.mjs`: passou, com `nfl NFL: jardas-passe:4/4, recepcoes:4/4, touchdowns:4/4, jardas-corrida:4/4`.
- `npx eslint` nos arquivos alterados: 3 erros, todos preexistentes (2 em `CompetitionPage.tsx`, confirmados no arquivo da `HEAD`; 1 de espaço irregular em um comentário antigo de `legacyCopy.ts`). Nenhum erro novo.
- Fotos: 48 de 48 convertidas sem falha de segmentação (conferido em contact sheet) e 32 cards renderizados no navegador sem nenhum fallback nem imagem quebrada.
- Navegador 375x812, dev na 5180: Pitaco e Draftea com NFL entre NBA e Tênis, página abrindo pelo trilho, card com `RF/PA`, `Handicap` e `Total`, quatro acordeões de player props, pills `PARTIDAS` (lista agrupada por Hoje/Amanhã), `1º TEMPO` e `2º TEMPO` com linhas derivadas, e seleção de odd alimentando o betslip (1 aposta, 1.53x).
- Preview de produção na 5181 com prefixo `/draftaco/`: Draftea localizado (PARTIDOS, 1ª MITAD, PASES, RECEPCIONES, CARRERA, 2ª MITAD, `Yardas de pase (gana si es mayor o igual)`).
- Detalhe do evento validado nas duas marcas: abertura pelo card e pela aba do jogo, `TODOS` voltando para a lista, troca de jogo pelas abas (PIT Steelers vs CIN Bengals com jogadores de PIT/CIN), odd do card e odd única de touchdown entrando no betslip (múltipla 3.89x).
- KC Chiefs x MIA Dolphins virou o jogo ao vivo da NFL (`nfl-1`): `Q2 07:32`, 14 x 10, `earlyPayout: false` (ao vivo não tem pagamento antecipado, então o selo `PA` some do card, como no futebol).
- `CompetitionEvent` e `LiveEventMatch` ganharam `footballSituation` (`down`, `distance`, `ballOn`, `possession`). É o único campo exclusivo de futebol americano nesses tipos; os outros esportes não o preenchem.
- Header ao vivo do futebol americano (Figma 1900-60934): indicador de posse com o ícone `ballAmericanFootball.svg` ao lado do time com a bola — sempre do lado do escudo, espelhado entre mandante e visitante — e faixa inferior com descida e posição da bola no lugar da linha de estatísticas do basquete. O basquete não mudou: segue com PTS/REB/AST e sem o quarter no relógio.
- O relógio do header passou a aceitar manter o período (`getInlineMatchHeaderClockLabel(time, keepPeriod)`), ligado só quando há `footballSituation`, porque o Figma da NFL mostra `Q2 07:32` e o basquete mostra só `8:19`.
- A faixa de situação é também o acesso ao bottom sheet de jogadas e estatísticas, com `Ver mais >` ancorado à direita (mesmo par label + chevron dos cards, então a Draftea traduz para `Ver más` pelo catálogo). A situação segue centrada como no Figma porque o `Ver mais` é posicionado absoluto, sem deslocá-la.
- A faixa abre o `NflPlaysStatsBottomSheet` (Figma 1869-59255): abas Jogadas/Estatísticas, placar por quarter, seletor de equipe, sete acordeões de estatística e comparação entre equipes com barras nas cores oficiais das franquias.
- **Dados reais**: `src/data/nflLiveGame.json` é um recorte do play-by-play do nflverse do wild card KC x MIA de 2024-01-13 (`2023_19_MIA_KC`), acumulado até a jogada 1520 (Q2 07:41, KC 10 x 7, 3ª & 8 na MIA 8). Gerado por `scripts/build-nfl-live-fixture.mjs`, que aceita `--game` e `--cutoff`. Não é busca em tempo de execução: o nflverse é arquivo de ~19 MB por temporada, não API.
- O evento `nfl-1` do CalendarSection lê placar, relógio e situação desse mesmo fixture, então header e bottom sheet não conseguem divergir. Antes dessa mudança o header mostrava um placar que eu tinha inventado (14 x 10) enquanto o BS mostrava o real.
- Conferência do cálculo: as agregações do gerador batem exatamente com `stats_team_week` do nflverse para o jogo completo (KC 262 passe / 147 corrida, MIA 199 / 76).
- Correção de reuso pedida pela pessoa usuária: o bottom sheet não pode ter elementos próprios onde já existe equivalente. Passaram a ser compartilhados: abas = `ContentFilterChips` com a classe `live-event-inline__market-chips` (a mesma dos mercados do evento), seletor de time = `ProductRail` (o mesmo trilho de esporte e competição), acordeões = novo `src/components/MarketAccordion`, e o brilho do topo copia `.deposit-panel--bottom-sheet::before`, do bottom sheet de perfil.
- `MarketAccordion` foi extraído de `LiveEventInlineMarketSection`, que morava dentro de `LiveEventPage.tsx`. A extração era necessária porque o bottom sheet é importado por `LiveEventPage`, e importar o acordeão de volta de lá criaria ciclo. As 17 regras de CSS foram movidas junto para `MarketAccordion.css`, mantendo os nomes de classe `live-event-inline__market-*` para não quebrar nada que já dependia delas.
- **Pendência**: a aba `Jogadas` está visível e desabilitada — o nó de Figma dela não foi fornecido, e o AGENTS.md proíbe inventar interface. O dado de jogadas já existe no pbp; falta só o desenho.
- **Pendência**: 12 dos 20 jogadores com estatística nesse jogo não têm foto no repo (Cedrick Wilson Jr., Clyde Edwards-Helaire, Durham Smythe, Harrison Butker, Jeff Wilson, Justin Watson, Marquez Valdes-Scantling, Mecole Hardman, Noah Gray, Raheem Mostert, Richie James, River Cracraft); caem no `playerAvatarNFL.svg`.
- O ordinal da descida é resolvido por marca em código (`1ª/2ª/3ª/4ª` no Pitaco, `1ra/2da/3ra/4ta` na Draftea) e não pelo catálogo de tradução: os ordinais em espanhol não têm sufixo único, e um token solto como `3ª` no catálogo pegaria qualquer texto igual em outras telas.

- Resumo da entrada conferido nas duas telas e nas duas marcas: a coluna de resultado aparece como `RESULTADO FINAL` no Pitaco e `Resultado final` na Draftea, com selo `PA`, e não mais como `RF`.
- Header ao vivo conferido nas duas marcas: `3ª & 8 · KC 25` no Pitaco e `3ra & 8 · KC 25` na Draftea, com a bola de posse no KC e relógio correndo (`Q2 07:31`). Regressão do basquete checada na mesma passagem: NBA segue com estatísticas, sem bola e sem quarter no relógio. Card da competição mostra `AO VIVO` com placar e o `PA` sumiu só no jogo ao vivo.
- Cache de pré-bundle do Vite em `node_modules/.vite` mantinha o catálogo de tradução antigo em memória no dev server, fazendo textos novos aparecerem em pt-BR na Draftea. Causa e correção estão em [AI_CONTEXT.md](AI_CONTEXT.md#localizacao-e-pre-bundle-do-vite). Em resumo: `@vitejs/plugin-react` injetava o runtime JSX em `optimizeDeps.include`, vencendo o `exclude`; o plugin `draftaco-i18n-source-runtime` do `vite.config.ts` agora remove essas entradas da config resolvida. Editar `src/brands/draftea/legacyCopy.ts` passou a refletir por HMR, verificado com marcador temporário aplicado e revertido no dev server em execução. O build de produção nunca foi afetado.

## Validações executadas

- `npm run build`: passou, inclusive com Node 20.20.2 via execução temporária; o Node padrão da máquina é 24.20.0.
- `npm run check:brands`: passou em Node 20; cobre `/` e `/draftaco/`, idioma, rota de cadastro bloqueada, troca de marca, storage isolado, JSX dev/produção, fallback createElement e valores de inputs intactos.
- `git diff --check`: passou.
- Navegador mobile 390 × 844: homes de ambas as marcas, cadastro Pitaco aberto e avançando até etapa 2 com dados mockados, login Draftea enviado e retornando à home autenticada.
- Draftea: botão de cadastro sem ação na home e dentro do login; acesso direto bloqueado no dev e no preview `/draftaco/`; es-MX confirmado no HTML.
- Antes da revisão que desativou cassino: navegação apostas/cassino e histórico voltar validados no preview com prefixo Draftea; navegação ida/volta e cadastro também validados no Pitaco.
- Após a revisão: contratos automatizados verificam redirecionamento das rotas de cassino em ambas as marcas/base paths; no navegador, Draftea (dev) e Pitaco (preview `/draftaco/`) sem botão de cassino e com URL direta redirecionada.
- Recarga e acesso direto de cassino/home verificados; screenshots inspecionados nas duas marcas. Foi identificado o overlay preexistente de localização negada como bloqueio a cliques; o botão de fallback simulado existente permitiu continuar sem conceder permissão real. Os textos desse overlay também foram traduzidos para Draftea. Erros de imports observados durante a movimentação foram resolvidos pelo build e recarga.
- Lint global não executado; permanece a ressalva documentada de erros preexistentes. `npm ci` fica obrigatório antes da futura PR.
- Servidor dev ativo na porta 5180; preview de produção na 5181 com prefixo `/draftaco/`.

## Preservação e pendências

- Arquivos preexistentes não rastreados preservados: `.pnpm-store/`, `.worktrees/`, `design-qa.md`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`. Não incluir em commit por engano.
- `.git/worktrees` desta cópia contém referências herdadas a pastas antigas/temporárias, inclusive `draftaco-v0`. Não executar prune/remove/repair sem revisar esses metadados. Nenhum worktree foi criado ou removido nesta tarefa.
- Mudanças locais não estão staged nem commitadas; Git mostrará movimentações como exclusões e arquivos novos até reconhecê-las ao preparar o commit.
- Permissões, proteção de main, publicação e previews remotos continuam para etapa posterior. Workflows herdados não foram alterados.
- Pendências da NFL: o `LiveEventPage` de tela cheia (hoje não renderizado em nenhuma rota) não tem ramo de NFL; só o `LiveEventInline` foi coberto. Os acordeões extras que o Figma mostra recolhidos não foram implementados porque não consegui ler os títulos (o MCP do Figma exige a aba do arquivo ativa e ela mudou no meio da tarefa). O bottom sheet `Mais` já tinha uma entrada inerte `futebol-americano` / `fa-nfl`, que continua sem ação. A coluna de total usa `41.5+` / `41.5-`, convenção atual do app e do card de NBA, no lugar das setas do Figma. O rodapé do card usa data relativa (`Hoje, 17:00`) e não `21/ago (15:00)`. Só 24 dos 48 jogadores aparecem hoje, porque `COMPETITION_PLAYER_PROPS_MAX_COUNT` limita cada acordeão a 8 cards; os demais assets já estão prontos caso o limite mude.
- Próximo passo: pessoa responsável validar `/pitaco` e `/draftea` no dev local; após aprovação explícita, preparar commits revisando somente este escopo, executar instalação reproduzível e abrir PR para o destino novo. A futura publicação deve preservar o histórico remoto quando possível, sem push para `draftaco-v0` e sem force push automático.

## Correção final da navbar

- Cassino restaurado visualmente na navbar de Pitaco e Draftea, sem handlers de clique/toque enquanto `features.casino` estiver false; `aria-disabled=true`. Rotas continuam bloqueadas.
- Build e diff check passaram. Navegador confirmou item visível e desativado nas duas marcas; clique no Pitaco manteve a rota de apostas.
