# Tela Entradas: card da aposta, atalho `/nfl` e ajustes de degradê e chips (2026-09-17)

Relato da branch `feature/entradas-layout`, incorporada na `main` pela
[PR #15](https://github.com/design-draftea/draftaco/pull/15) (commit `3871b85`). Movido do
`AI_HANDOFF.md` quando a entrega seguinte começou. Algumas decisões daqui foram revistas depois —
por exemplo, o item Entradas voltou a ser clicável; ver
[`2026-09-18-entradas-funcionalidade.md`](2026-09-18-entradas-funcionalidade.md).

### Atalho para o sheet da NFL
- Nova rota **`/<marca>/nfl`**: cai na **tela do jogo da NFL dentro da home** (modo evento inline,
  que é de onde o sheet é aberto de verdade), com a pessoa **logada** e o bottom sheet de Jogadas e
  Estatísticas já aberto por cima. Fechar o sheet deixa exatamente na tela do jogo.
- O caminho é o do próprio app: a `Home` já aceitava `initialActiveSport`, `initialCompetition` e
  `initialEventId`, e monta o evento inline por `getInitialLoadedEventContext`. O `App` passa
  `'nfl'`, `{ id: 'nfl', name: 'NFL' }` e `NFL_LIVE_EVENT_ID`, mais `authVariant: 'logged-in'`.
- Para o sheet nascer aberto, uma prop `initialStatsOpen` foi encadeada por
  `Home` → `LiveEventInlineHeader` → `LiveEventInlineScoreHeader`, que é quem tem o `isStatsOpen`.
  Nada mais mudou de comportamento: a prop é opcional e vale `false` em todos os usos existentes.
- **Duas tentativas anteriores foram descartadas** e ficam registradas para não se repetirem: uma
  página standalone só com o sheet (não tinha o app atrás), e montar o `LiveEventPage` cheio pelo
  estado de evento ao vivo do `App` (é outra variante — a página cheia não tem o sheet de jogadas, e
  fechar caía na home). O sheet de jogadas só existe na variante **inline**.


### Card de Entradas com o conteúdo da aposta (nó Figma 1993:6822)

O card do Pulse saiu; no lugar entra o do desenho. O miolo são as linhas do recibo da tela de
sucesso, via `BetSuccessSelectionGroupRow` do módulo compartilhado. O que é próprio deste card é a
moldura: cabeçalho com recolher e compartilhar, `Ganho potencial` com o símbolo em Bold 16 e o
número em Black 18, a linha `Entrada: … Odds: …`, o botão `Encerrar aposta` e o rodapé com data e
código do bilhete.

- `src/data/entries.ts` foi refeito: os mocks agora são `BetslipSelection[]` agrupados em
  `EntrySummary`, com valores em reais. O botão de encerrar só existe nas entradas em aberto.
- Assets: só o ícone de compartilhar veio do Figma (`iconEntryShare.svg`). O chevron exportado era
  o mesmo glifo do `chevronUp.svg` que o projeto já tinha — diferiam só no arredondamento da última
  casa decimal —, então reusei o existente em vez de duplicar.

**Como o Figma foi acessado:** o MCP configurado nesta sessão é o **remoto** do Figma, e ele recusa
o arquivo porque a conta tem assento View. O **desktop** (`127.0.0.1:3845`, "Figma Dev Mode MCP
Server") responde sem restrição. Enquanto o desktop não estiver registrado como servidor MCP da
sessão, o acesso é por HTTP direto nesse endereço.

**Conferido:** recolher leva o card de 467px para 101px e esconde as seleções; VENCEDORAS e
ANTERIORES renderizam sem o botão de encerrar. `build`, `check:brands` e lint limpos.


### Peças de seleção extraídas para uso compartilhado

`src/features/betslip/BetSuccessPage/betSuccessSelections.tsx` recebeu as peças puras de exibição
de seleção que estavam dentro de `BetSuccessPage.tsx`: as constantes de promo e mercado, os
auxiliares (`isResultFinalSelection`, `getOrderedResultFinalBadges`, `getResultFinalLiveStatus`,
`getGroupedHeaderSelection` etc.) e os 13 componentes, de `BetSuccessSelectionAvatar` a
`BetSuccessSelectionGroupRow`. Só os componentes são exportados — exportar as constantes quebrava
`react-refresh/only-export-components`.

As classes continuam `bet-success__*` e o módulo importa o mesmo `BetSuccessPage.css`, então o
visual não muda em lugar nenhum. Importar esse CSS noutra tela é seguro: conferido que todas as 187
regras de topo dele são prefixadas (`.bet-success*` ou `.camisa-premiada-static*`), sem nada global.

**Verificação:** comparei o corpo extraído contra os intervalos removidos do `HEAD` anterior. As
únicas diferenças são três linhas em branco nas junções dos quatro blocos — o código é byte a byte
idêntico, fora o prefixo `export`. Com `tsc -b` e `npm run build` limpos, a refatoração é
preservadora de comportamento.

**Pendência:** não consegui abrir a tela de sucesso no navegador automatizado — o betslip completo
(`.betslip-v2`) monta mas não fica visível ao clicar no bilhete compacto, com a sessão deslogada.
Isso é independente da extração (o caminho de abertura não foi tocado), mas a conferência visual da
tela de sucesso segue **pendente**.


- Atualizado em: 2026-09-17.
- Agente que entrega: Claude.
- Checkout: worktree `.worktrees/feature-entradas-layout`, branch `feature/entradas-layout`,
  criada de `origin/main` em `a4066a1`.
- Objetivo: trazer para o Draftaco o layout dos cards de Entradas desenhado no protótipo Pulse,
  nos três estados — abertas, ganhas e passadas. **Somente o layout**; a lógica será feita depois.
- Status: implementado e validado localmente. **Sem Pull Request e sem merge** — nenhuma
  autorização foi pedida ou concedida.

### Qual dos dois layouts veio

O Pulse tem duas gerações de card. A que veio é a **anterior** ao redesenho, que o Pulse
preservou em `src/components/OpenEntries/legacy/LegacyEntryCards.tsx` — seletores
`.open-entry-card` e `.won-entry-card`. A geração mais nova (`.entry-card-v2`, nós Figma
`856:7277`, `856:6341` e `856:7618`) **não** foi portada.

### Arquivos criados

- `src/features/entries/EntriesPage/` — `EntriesPage.tsx` (abas ABIERTAS/GANADAS/PASADAS e
  lista), `EntryCards.tsx` (card aberto e card liquidado), `EntriesPage.css`, `index.ts`.
- `src/components/LiveIndicator/` — ponto pulsante que o card aberto usa no rótulo `LIVE`.
- `src/data/entries.ts` — tipos e dados mockados, reproduzindo os previews do Pulse.
- `src/assets/` — sete SVGs vindos do Pulse: `arrowDownRed`, `badgeGanhador`, `entryCardLight`,
  `entryPriceUp`, `entrySeparator`, `iconDoubleChevronsDown`, `iconDoubleChevronsUp`.

### Arquivos alterados

- `src/App.tsx` — rota `/<marca>/entradas`: segmento, matcher, builder, memos de página, guarda
  na normalização de rota, ramo de render e ligação do item `entradas` da navbar, que já existia
  nas duas marcas e não tinha ação.

### Decisões

- **Conteúdo igual ao Pulse.** Os cards mantêm o vocabulário de mercado de previsão (`COMPRA EN
  UP/DOWN`, `Precio objetivo`, `participaciones`), em espanhol, com dados mockados. Decisão
  confirmada pela pessoa usuária: adaptar o conteúdo ao universo de apostas esportivas exigiria
  decisões de produto que ainda não existem, e virá junto com a lógica.
- **Tokens escopados, não globais.** Os 17 tokens de cor do Pulse (`--color-fill-*`,
  `--color-background-*`, `--color-action-*`) vivem na raiz `.entries-page`, não na camada global
  de tokens do Draftaco. O visual chega idêntico ao original e nenhuma outra tela muda de cor.
  Quando a lógica entrar, é nesse bloco que o mapeamento para os `--tokens-*` do Draftaco deve
  acontecer.
- **Header fixo muda duas coisas.** No Pulse o header rola embora; no Draftaco ele é `position:
  fixed` com 56px e `z-index: 200`. Então o conteúdo ganhou `padding-top` de 56px e as abas
  grudam em `top: 56px`, não em `0`. Como elas passam a ficar sempre na mesma altura, o estado
  `--pinned` do Pulse não teria o que observar: o listener de scroll e o estado foram removidos e
  o fundo opaco das abas virou constante no CSS.
- **Rolagem pela raiz da tela.** Em `≤499px` o Draftaco trava `html`, `body` e `#root` com
  `overflow: hidden`, e cada tela é o próprio container de rolagem. `.entries-page` recebeu o
  mesmo bloco que `.home` e `.promotions-page` já usam, com `--navbar-page-bottom-padding` no
  lugar da folga inferior que o Pulse calculava sozinho. Sem isso o conteúdo era cortado no
  viewport, sem rolagem.
- **Sem `prefers-reduced-motion`.** Os blocos que o Pulse usa para desligar animação sob essa
  preferência foram deixados de fora, e o `matchMedia` que pulava a transição de aba também,
  porque o AGENTS.md deste repositório proíbe reduzir animação por essa preferência.
- **Botões sem ação.** `Ver mercado` e `Vender` são apenas visuais. A animação de saída do card
  após uma venda não veio, porque depende da lógica.

### O que ficou deliberadamente de fora

- Carregamento incremental da lista liquidada (`useIncrementalList` e o spinner
  `.open-entries__more`): com dados mockados nunca dispararia, e é comportamento de lógica.
- Qualquer ligação com carteira, betslip, saldo ou estado real.

### Validações executadas

- `npm ci`, `npm run build` (`tsc -b && vite build`) e `npm run check:brands` — contratos OK em
  `/` e `/draftaco`. `git diff --check` limpo.
- `npm run lint`: 26 problemas (18 erros, 8 avisos), **todos preexistentes**. Nenhuma ocorrência
  em `src/features/entries`, `src/components/LiveIndicator`, `src/data/entries.ts` ou
  `src/App.tsx`.
- No navegador em execução, a `375×812`, nas duas marcas:
  - `/pitaco/entradas` e `/draftea/entradas` montam a tela; o item da navbar aparece ativo como
    `Entradas` na Pitaco e `Mis entradas` na Draftea.
  - Navegação pelo item da navbar: `/draftea/apostas` → `/draftea/entradas`, com a tela montada.
  - A rota sobrevive à normalização: `/pitaco/entradas` não é reescrita para `/pitaco/apostas`.
  - As três abas trocam: ABIERTAS mostra 2 cards abertos; GANADAS mostra 2 com o selo `¡GANADOR!`;
    PASADAS mostra os 4 estados liquidados — `¡GANADOR!`, `NO GANADOR`, `VENTA` e `CANCELADO`.
  - O card de venda não mostra preço final nem chevron de resultado, e a divisória vertical do
    preço objetivo some, como manda `.won-entry-card--sold`.
  - Rolagem conferida em PASADAS: `.entries-page` rola, as abas ficam em `top: 56px` coladas ao
    header, com fundo opaco, e o card passa por trás sem transparecer. O último card termina
    acima da navbar flutuante.
  - Console sem erro em nenhuma das duas marcas.
- Não conferido: comportamento com dedo/trackpad reais e a transição de aba em tempo real — a
  troca foi exercitada por clique programático e por clique no painel, e a posição de rolagem por
  atribuição direta.

### Segunda rodada — ajustes pedidos sobre o layout

Pedido com um link de Figma (nó `1993-6794` do arquivo `ENRUbTcNKoXvmuKprUu5CS`,
"Estudos-Fluxos-Draftea<>Pitaco"). **O Figma não pôde ser aberto**: o MCP do Figma respondeu
`Looks like you don't have edit access to this file` tanto em `get_design_context` quanto em
`get_screenshot`. O `whoami` mostra a conta `tiago.cramon@gmail.com` com assento **View** no time
`Pitaco`; as ferramentas de Dev Mode exigem acesso de edição. Nada do desenho foi interpretado por
suposição, como o AGENTS.md exige.

Feito, porque não depende do Figma:

- Aba `ABIERTAS` virou `PRÓXIMAS` e perdeu o ponto de ao vivo. O `LiveIndicator` continua no card
  aberto, no rótulo `LIVE` — só saiu da aba.
- As três abas e os estados vazios passaram a pt-BR (`PRÓXIMAS`, `GANHAS`, `PASSADAS`), com as
  traduções es-MX em `src/brands/draftea/legacyCopy.ts`, que é o mecanismo do projeto. `PRÓXIMAS`
  é igual nos dois idiomas e não precisa de entrada.
- A faixa de abas própria do Pulse foi removida por inteiro. Os chips agora são o
  `ContentFilterChips` do projeto — o mesmo componente da home, com o degradê, o indicador
  deslizante e a transição de `520ms cubic-bezier(0.2, 1, 0.28, 1)` dele. A tela não tem mais
  markup nem CSS de aba próprios.
- Os chips foram para **dentro** do `HeaderComponent`, como fazem a home e a `PromotionsPage`.
  Era isso que faltava para o header não cortar seco: a pilha do header passou de 56px para
  104px e o brilho passa por trás dos chips.
- O brilho do topo não termina mais na barra. A mesma imagem (`lightHeader.png`) é pintada duas
  vezes, com escala e origem idênticas (`center top`, `100% var(--entries-glow-height)`): o
  `::before` do header mostra os primeiros 104px e o `::before` da página continua o resto, até
  320px. Como as duas coincidem, não existe emenda nem corte para mascarar, e o brilho atravessa
  os chips e entra no primeiro card, como no desenho.
### Degradê descendo no Destaques e nas telas de esporte

Depois da máscara, Destaques e futebol ficaram com CSS de header idêntica — medido: 134px de pilha,
mesmo `::before`, mesma escala `100% 220px`, nenhuma camada extra e nenhum overlay dentro do header.
A diferença que se via era do **conteúdo logo abaixo**: no Destaques o primeiro elemento é
`.promo-draftaco`, com `background: rgb(0, 0, 0)` opaco, uma faixa preta encostada no header; no
futebol vem um carrossel transparente cujo card usa `bgSuperCombinada.png`, azul escuro, o que faz o
brilho parecer continuar.

A correção vale para o Destaques e para as telas de esporte (futebol, basquete, etc.): o seletor é
`.home--novo-trilho` excluindo `casino-active`, `competition-active` e `event-inline-active`, que
têm tratamento próprio — conferido que competição segue com a máscara pré-existente e sem a camada
nova. O brilho passa a continuar abaixo do header, numa camada de página
fixa de 220px com a mesma imagem, escala e origem do `::before` do header — as duas se encontram sem
emenda, e a máscara sai porque não há mais corte para esconder. A faixa `.promo-draftaco` ficou
transparente; a cor dela era a mesma do fundo do app, então isso não muda nada além de liberar o
degradê por trás. O header continua opaco (`rgb(0, 0, 0)`) e a faixa rola com o conteúdo, então não
há vazamento.

### Degradê cortado no header da home (Destaques e esporte)

Comportamento **pré-existente** do app, não introduzido nesta branch. `.header--v2` tem
`overflow: hidden` e renderiza `lightHeader.png` a `100% 220px`; nos estados Destaques e esporte a
pilha do header mede 134px, então a imagem é cortada numa linha onde ela ainda vale
`rgb(10, 4, 22)` — visível contra o preto. Ela só chega ao preto por volta de 180px (valores
amostrados decodificando o PNG).

O `Home.css` já trazia o remédio para isso — o bloco cujo comentário chama de "barra seca" — mas
aplicado só a `home--event-inline-active` e ao stack de competição. A correção estende o mesmo
tratamento aos estados que faltavam, com uma diferença importante: nos blocos existentes o fundo
opaco vai junto para o `::before`, que é mascarado, o que deixa os últimos 16px da barra
translúcidos. Aqui o fundo opaco **fica no próprio header** e só a imagem vai para o `::before`
mascarado. Assim o degradê dissolve, mas a barra continua opaca e nada de conteúdo passa por baixo
ao rolar. O `z-index: -1` põe o brilho acima do fundo do header e abaixo do logo, do rail e dos
chips, que não são afetados pela máscara.

Conferido nos três estados: Destaques (134px, regra nova), esporte simples (134px, regra nova) e
competição (222px, regra pré-existente).

### Respiro entre a faixa de chips e o primeiro mercado

Duas telas, medidas separadamente:

- **Evento ao vivo** (`LiveEventPage`): a folga entre a base do chip e o título do primeiro mercado
  era de **6px**. `.live-event-inline__market-chips` tem `padding: 0` por decisão registrada no
  próprio CSS — "o respiro abaixo dos chips é de quem vem depois" —, então o ajuste foi no
  `padding-top` de `.live-event-inline__markets`, de `0` para `16px`, levando a folga a 22px.
- **Home com esporte selecionado**: era de 14px, detalhado abaixo.

Na home com esporte selecionado, o conteúdo começava exatamente onde a faixa de chips terminava
(folga de 0px entre os dois elementos; 14px entre a base do chip e o texto do primeiro mercado).
O `padding-bottom` da faixa nesse estado passou de `8px` para `16px`, levando a folga até o texto
para 22px — o valor derivado da referência de desenho, tomando a altura do chip como escala. Isso
também acomoda os 16px de dissolução do fundo da faixa, que antes invadiam a área do chip.

### Chip inativo passa a ser o token puro, em todo o app

`.content-filter-chips__item:not(--active)` compunha `--ds-action-transparency-default` sobre
`--ds-background-app`, que é **opaco**. O resultado era um chip preto sempre que a faixa fica sobre
um degradê — na tela Entradas e também na de apostas com esporte selecionado. A regra base de
`src/components/ContentFilterChips/ContentFilterChips.css` passou a usar só o token
(`rgb(251 251 251 / 0.08)`), sem a camada opaca. A borda já vinha correta da regra base do
componente: `1px solid var(--ds-fill-opacity-tertiary)` = `rgb(251 251 251 / 0.16)`.

A mudança é no componente compartilhado, então vale para Home, Entradas, `SportsPageV2`,
`LiveEventPage` e o bottom sheet de NFL. A variante `content-filter-chips--competition-markets`
repetia o mesmo fundo opaco e virou duplicata da base; foi removida.

Risco verificado: a faixa `.content-filter-chips` mantém o fundo opaco próprio
(`linear-gradient(#000 0%, #000 calc(100% - 16px), transparent)`), então o conteúdo continua sendo
cortado antes dos chips ao rolar. Conferido na home com esporte ativo, rolando 320px: a faixa fica
sticky e nada transparece através dos chips.

### Correção do efeito do chip e do degradê

Duas coisas estavam erradas, e o diagnóstico inicial de uma delas foi **falso** — fica registrado
para não se repetir.

- **Chip — a animação de troca.** Medir o chip em repouso não bastava: ele era idêntico ao da home
  parado, e errado em movimento. `index.css` liga `sliding-chip-liquid-toggle-squish` e
  `sliding-chip-liquid-toggle-bubble` no `::before` do indicador durante os 520ms da troca, para
  qualquer grade de chips. A home desliga as duas (`animation: none`), a `.entries-page` não estava
  nesses grupos. Como os keyframes do `bubble` declaram `box-shadow` em todos os estágios, e animação
  vence declaração normal na cascata, o `box-shadow: none` do chip era anulado durante a troca.
  Medido ao vivo antes da correção: a partir de ~140ms entravam as duas animações, com sombras
  injetadas e escala oscilando entre `1.1/0.94` e `0.965/1.045`. `.entries-page` entrou nos dois
  grupos de `animation: none` e no grupo que dá `translateZ(0)` ao rótulo.
- **Degradê — a ilha preta dos chips.** A hipótese de "pintura dupla" que eu havia levantado é
  **falsa**: decodifiquei o `lightHeader.png` e o canal alpha tem um único valor, `255` — a imagem é
  totalmente opaca, e repintar o mesmo recorte no mesmo registro é neutro em pixel. A causa real é
  que `.content-filter-chips` pinta um fundo próprio **opaco**
  (`linear-gradient(#000 0%, #000 calc(100% - 16px), transparent 100%)`), feito para esconder
  conteúdo rolando sob a faixa sticky da home. Dentro deste header, que já é opaco, ele não tem o que
  esconder e só abre um buraco preto de y=56 a y=88 no meio do degradê, devolvendo o brilho de golpe
  numa rampa de 16px — o degrau na borda inferior dos chips. Resolvido com
  `.entries-page__chips.content-filter-chips { background: transparent }`.
- **Escala do brilho.** Estava em `100% 320px`, 1,45× a constante do app. `100% 220px` é o valor em
  todas as outras ocorrências de `lightHeader.png` no repositório. Esticar engorda o núcleo claro e
  arrasta o pico para baixo — era o "forte demais". Voltou para `220px`.
- A arquitetura de duas camadas em registro exato foi **mantida**, porque é o que o Pulse faz em
  `.open-entries__tabs--pinned` e, com asset opaco, é autocorretiva: as camadas coincidem qualquer
  que seja a altura real do header, sem emenda possível.

- Os chips receberam o tratamento `--v2` do design system, que é o da home: `.entries-page` foi
  incluída nos três grupos de `src/styles/index.css` que definem o indicador (`.home--v2`,
  `.promotions-page--v2`, e a variante de tema claro). O visual resultante foi conferido por
  medição contra o chip da tela de futebol da home e é idêntico: fundo do elemento é a borda em
  degradê, `::before` com `inset: 1px` e preenchimento de 24%, sem `::after`. Antes disso a tela
  caía no indicador padrão, de preenchimento sólido — que era a diferença visível.
- Rótulos vindos do Figma: `PRÓXIMAS`, `VENCEDORAS` e `ANTERIORES` (es-MX: `GANADORAS`,
  `ANTERIORES`).

Bloqueado no Figma:

- O conteúdo do card. O pedido é reaproveitar a base do recibo de aposta finalizada
  (`src/features/betslip/BetSuccessPage/`, tipo `BetSuccessReceipt`: seleções, valor apostado,
  odd total, retorno potencial). A montagem exata depende do desenho.
- Por consequência, a tradução do conteúdo do card: ele ainda está com o vocabulário de mercado de
  previsão em espanhol, herdado do Pulse. Traduzir agora seria trabalho jogado fora, já que esse
  conteúdo vai ser substituído.

### Pendências e próximo passo concreto

- **Bloqueio ativo:** acesso de edição/Dev Mode ao arquivo do Figma para a conta
  `tiago.cramon@gmail.com`, ou uma referência visual exportada do nó `1993-6794`.
- Próximo passo: destravar o Figma e então refazer o conteúdo do card sobre a base do
  `BetSuccessPage`. Pull Request e merge dependem de autorização explícita, que ainda não foi
  pedida.
- Depois do aceite do layout, a lógica: origem real dos dados, ação dos botões, animação de saída
  na venda, carregamento incremental e a decisão de conteúdo (manter o vocabulário do Pulse ou
  adaptar a apostas esportivas), além do mapeamento dos tokens escopados para os `--tokens-*`.
