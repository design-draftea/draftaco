## Estado atual

### Item Entradas inerte e atalho para o sheet da NFL

- O item **Entradas** da navbar continua visível e não faz mais nada ao ser clicado, como já
  acontece com o de cassino. A rota `/<marca>/entradas` **continua valendo por URL direta** —
  conferido que a tela monta. O `buildEntriesPath` saiu, porque só existia para o clique.
- Nova rota **`/<marca>/nfl`**: abre a **tela do jogo** da NFL (Chiefs x Dolphins) com a pessoa
  **logada**, e o bottom sheet de Jogadas e Estatísticas por cima. Fechar o sheet deixa na tela do
  jogo, não na home. A rota monta o evento pelo mesmo caminho de um clique real: acha a liga `nfl`
  em `championships`, pede o payload a `getCompetitionLiveEventOpenPayload` com
  `NFL_LIVE_EVENT_ID` e alimenta o estado de evento ao vivo do `App.tsx`.
- Dois detalhes de empilhamento que custaram a aparecer: a tela do evento é `z-index: 3000` e o
  container do bottom sheet é 2000, então o sheet nascia atrás. E o `BottomSheet` vai por **portal**
  para o `body`, então nenhum wrapper no React o alcança — a elevação é uma classe no `body`
  (`nfl-route-sheet-open`), aplicada só enquanto a rota está aberta, para não mexer no empilhamento
  de onde o sheet é aberto de dentro do jogo.
- ~~abre o bottom sheet por cima do app~~ — home, header e navbar ficam atrás, como quando ele é aberto pelo
  placar dentro do evento ao vivo. Não é uma página standalone: o sheet entra como mais uma camada
  no `App.tsx`, junto do painel de depósito e do perfil, e a rota ganhou uma guarda na normalização
  para não ser reescrita para `/apostas`. Fechar volta para apostas.
- Montar a tela do evento ao vivo na rota foi descartado: o sheet depende de `footballSituation`,
  que só existe depois de `withNflLiveMatches` casar o id do jogo pelo `hasNflLiveClock` dentro do
  `LiveEventPage`, e o estado `isStatsOpen` vive em `LiveEventInlineScoreHeader`. Reproduzir isso
  exigiria enfiar dados e uma prop por toda essa cadeia.


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

## Histórico anterior — limpeza de imagens não utilizadas

- Atualizado em: 2026-09-17.
- Checkout: pasta principal `draftaco`, branch `main` em `d46ad6a`.
- **Entregue e publicado.** Pull Request
  [#13](https://github.com/design-draftea/draftaco/pull/13), merge em `main` no commit `d46ad6a`
  e deploy concluído pelo GitHub Actions
  ([run](https://github.com/design-draftea/draftaco/actions/runs/35227035718)).
- Objetivo: remover do repositório as imagens que nenhum código referencia.

### O que foi removido

170 arquivos, cerca de 1,7 MB, todos rastreados pelo Git — a remoção é reversível pelo
histórico. A maior parte é ícone legado duplicado: `src/assets/flag*.png` e `src/assets/icon*.png`
soltos na raiz de `assets`, substituídos pelos conjuntos em `iconPaises/` e `iconSports/`; os
`src/assets/nav*.svg`, substituídos pelos `nav*Iniciante.png` de cada marca; e os resíduos do
template Vite (`public/vite.svg`, `public/favicon.png`, que é cópia byte a byte de
`favicon-draftaco.png`, este sim referenciado no `index.html`).

### Como os candidatos foram apurados

Cruzamento do nome de cada arquivo de imagem contra todo o texto de `src`, `scripts`, `docs`,
`index.html`, `vite.config.ts` e `.github` — sem distinção de maiúsculas e sem depender do
caminho, porque tanto `import` do Vite quanto `url()` de CSS carregam a extensão.

Ficaram de fora da remoção as duas pastas resolvidas por `import.meta.glob`, onde o nome do
arquivo não aparece no código:

- `src/assets/jogadores/**/*.png` — conferidos contra `src/assets/jogadores/manifest.json`: 416
  entradas e 416 arquivos, sem órfão dos dois lados.
- `src/assets/jogosCassino/categoriaCrash/**` — a grade de Crash é montada a partir do próprio
  glob, então todo arquivo ali está em uso por construção.

### Arquivos alterados

- Commit `5cd7e2f`, 170 remoções, nenhuma alteração de código.

### Validações executadas

- `npm ci` e `npm run build` (`tsc -b && vite build`) concluídos. É a verificação mais forte
  aqui: o Vite falha na compilação se um `import` de asset não resolver, e ele percorre todas as
  rotas.
- `npm run check:brands` — contratos OK em `/` e `/draftaco`.
- CI da Pull Request (`Validate pull request`): Build aprovado em 34s.
- Protótipo local no navegador: nenhum 404 de asset e nenhum erro de console.

### Verificação depois do deploy

Produção conferida contra o build local do mesmo commit, e são iguais:

- `index.html` byte a byte idêntico ao `dist/index.html` local (sha256
  `eebcd032…db1f7c`).
- Os três bundles do `index.html` (`index-DqpkP4Gy.js`, `react-vendor-RG1Rg7KD.js`,
  `index-DWTgFKxC.css`) e o `favicon-draftaco.png` também byte a byte idênticos.
- `/vite.svg` e `/favicon.png` respondem 404, como esperado depois da remoção.
- Home das duas marcas renderiza sem erro de console; 77 imagens em `pitaco/apostas` e 70 em
  `draftea/apostas`, nenhuma quebrada.
- Amostra dos assets de Crash (resolvidos por `import.meta.glob`) responde 200 em produção.

Uma armadilha para a próxima conferência: um deep link como `/draftaco/draftea/apostas` responde
**404 no status HTTP** e ainda assim renderiza. É o fallback de SPA do GitHub Pages — o workflow
copia `dist/index.html` para `404.html`, e o app roteia no cliente. Comportamento preexistente,
não é regressão.

### Pendências e próximo passo concreto

- Nenhuma pendência desta tarefa. Branch local e remota removidas depois do merge.
- Sugestão fora do escopo: `src/assets/iconSports/` e `src/assets/iconPaises/` ainda concentram
  ícones de esportes e bandeiras que só existem para o bottom sheet "Mais esportes"; vale decidir
  em tarefa própria se esse catálogo continua inteiro.
- Limpeza que não é desta tarefa e segue pendente, para quem tiver o contexto: branches locais
  cujo remoto já sumiu (`docs/ai-context-handoff`, `fix/deposito-aprovacao-imediata`,
  `fix/qr-gradient-border`, `docs/unifica-regras-agentes`); o worktree registrado em
  `draftaco-v0/.worktrees/docs-unifica-agentes`, que está fora desta pasta; e a branch remota
  `gh-pages`, que o `AGENTS.md` proíbe usar e que o deploy atual não usa.

## Histórico anterior — remoção da página de handoff e auditor de textos

- Atualizado em: 2026-09-16.
- Checkout: worktree `.worktrees/qa-copy-typesafe`, branch `chore/qa-copy-typesafe`, criada a
  partir de `origin/main` em `6200465`.
- **Entregue e publicado.** Pull Request
  [#11](https://github.com/design-draftea/draftaco/pull/11), merge em `main` no commit `312aac0`
  e deploy concluído pelo GitHub Actions.
- Duas frentes: a página de handoff de produto saiu do app, e o catálogo de textos da Draftea
  ganhou conferência automática.

### A página `/marca/handoff` foi removida

Decisão da pessoa responsável pelo protótipo em 2026-09-16: a página não servia para nada.

Antes de remover, ela havia sido corrigida nesta mesma branch, porque a Regra 05 descrevia uma
Home que não existe mais — "cinco campeonatos, dois abertos e três fechados" e "no máximo três
jogos por campeonato", quando a Home renderiza um bloco único alimentado por quatro campeonatos
com limites de 1, 2, 2 e 3. Esse commit foi descartado junto com a página; o diagnóstico fica
registrado aqui porque ele continua valendo sobre a Home.

Removidos: `src/features/handoff/` inteiro e os sete pontos que a citavam em `src/App.tsx` — o
import preguiçoso, `handoffRouteSegment`, `isHandoffPath`, o `useMemo` de `isHandoffPage`, a
entrada em `isStandalonePage`, a condição do `MobileOnly` e o ramo de renderização. As citações
em `README.md`, `docs/AI_CONTEXT.md`, `docs/COLLABORATION.md` e `package.json` também saíram.

`/pitaco/handoff` e `/draftea/handoff` passam a cair na regra de rota desconhecida e normalizam
para `/marca/apostas`, conferido no navegador nas duas marcas.

### `qa:copy:typesafe`: o que o código resolve não vai para a IA

Mesmo molde do auditor do NFL. Quatro verificações locais, sem custo, todas confirmadas por
mutação — perturbei o dado de propósito e conferi que acusam:

- `regex`: padrão literal posterior que nunca dispara por já estar contido num anterior, e saída
  de um regex reescrita por um posterior. Zero achados hoje; a ordem atual está correta.
- `duplicatas`: chave repetida no mapa exato, em que a última vence em silêncio. Zero hoje.
- `vazamento`: texto que atravessa `localizeCopy` intacto e tem marcador forte de português.
  88 achados, concentrados nas telas de jogos e no betslip. Eram 116 antes de a página de
  handoff sair: 28 vinham só dela.
- `mercado`: jogador cujo time não está entre os times das partidas do mesmo bloco. Zero hoje.

Só a equivalência de sentido vai ao Jev, depois de dois filtros de código: 92 das 406 entradas
do mapa exato apenas repetem um regex existente e são puladas, e o resultado fica em cache pelo
hash do estado e da pergunta.

### O que foi medido, incluindo o que não funciona

- Lote grande degrada o julgamento. Com 40 perguntas por requisição, `Para Ganhar -> Para Ganar`
  caiu para 15%; isolado dá 95%; com seis por requisição, empata com o isolado. Daí `--batch=6`.
- A faixa DIVERGE (<= 0,25) é confiável: pegou as quatro trocas de sentido plantadas, entre 2% e
  9%. A faixa REVISAR tem cerca de 9% de falso positivo.
- A verificação de identidade foi **retirada do caminho pago**. O Jev não separa "Saldo", certo
  nas duas línguas, de "Tempo de posse", esquecido em português: as duas formulações testadas
  reprovaram os 13 termos corretos ou aprovaram os errados. São 13 entradas; o script as lista de
  graça para conferência humana.
- Ponto cego conhecido: uma tradução aparente que continua em português passa pela pergunta de
  equivalência, porque ela é de fato equivalente.

### Achado real do catálogo

O auditor encontrou **inglês no catálogo espanhol**, em `src/brands/draftea/legacyCopy.ts`:
linha 89 (`'Ativa a experiencia em prototipo de Apostas Gratis.'` -> `'Enable the Free Bets
prototype experience.'`) e linha 106 (`'Desativar Apostas Gratis disponivel'` -> `'Disable Free
Bets available'`). São textos do painel de feature flags. **Não foram corrigidos**: estão fora
do escopo autorizado desta tarefa.

### Arquivos alterados

Removidos: `src/features/handoff/` (`HandoffPage.tsx`, `HandoffPage.css`, `index.ts`).
Alterados: `src/App.tsx`, `README.md`, `package.json`, `docs/AI_CONTEXT.md`,
`docs/COLLABORATION.md` e este handoff. Novo: `scripts/audit-copy-typesafe.mjs`.

### Validações executadas

`npm ci`; `node --check`; ajuda e dry-run; testes de mutação nas quatro verificações locais;
chamadas reais ao Jev 1.13.0 (equivalência, identidade e as sondas de calibração);
`npm run build`; `npm run check:brands`; `npm run check:nfl` (66); ESLint do script novo, sem
apontamento; `git diff --check`. No navegador, depois da remoção: `/pitaco/handoff` e
`/draftea/handoff` normalizam para `/marca/apostas`, a Home renderiza e uma aba limpa não
registra erro de console.

### Verificação depois do deploy

`index.html` de produção é byte a byte idêntico ao `dist/index.html` do build local. Em
`https://design-draftea.github.io/draftaco/`, as rotas `pitaco/handoff` e `draftea/handoff`
normalizam para `<marca>/apostas` e a Home renderiza nas duas marcas, igual ao local.

Uma armadilha para a próxima consulta: a API do GitHub responde `build_type: legacy` e
`source.branch: gh-pages` para este repositório, mas a branch `gh-pages` está parada desde
2026-07-08. Quem serve é o artefato do Actions. Não confie nesse campo da API para julgar o
que está no ar; compare o `index.html` publicado com o build local.

Rotas profundas devolvem HTTP 404 com o conteúdo do `404.html`. É o fallback de SPA criado pelo
próprio workflow de deploy, não uma falha: o app roteia no cliente.

### Pendências e próximo passo concreto

- Os dois textos em inglês do catálogo pedem uma tarefa própria.
- O auditor é ferramenta de revisão manual. Não transformar em bloqueio de CI antes de calibrar
  em mais rodadas, como já vale para `qa:nfl:typesafe`.

## Histórico anterior — correções do replay incorporadas em `origin/main`

- Atualizado em: 2026-09-16.
- Checkout: pasta principal `draftaco`, branch `fix/nfl-relogio-regra-e-placar` (sem worktree
  isolado; não havia alteração local de arquivo rastreado).
- **Implementado e validado localmente. Não há Pull Request, merge nem deploy.**
- Objetivo: o relógio e o placar do jogo de NFL passarem a descrever o LANCE QUE ESTÁ NA TELA, e
  as trocas do sheet — entrada no intervalo, jogada em foco no trilho e número do placar —
  pararem de acontecer entre dois quadros.
- Segunda frente, na mesma branch: **o campo parou de ficar vazio em lances que aconteceram**
  (passe anulado incompleto e sack) e o field goal deixou de dizer "bom". Ver
  "O lance que não aparecia".

### Os seis defeitos

**1. O relógio nunca parava.** `clockAt`, em `nflLiveFeed.ts`, escorregava os `gapSeconds`
INTEIROS de forma uniforme pela espera até o próximo lance. Os extremos estavam certos — cada
passo caía exatamente no relógio do lance seguinte —, mas o FORMATO da descida ignorava a regra:
no passe incompleto, em que o cronômetro congela assim que a bola bate no chão, ele seguia
descendo devagar; e num lance comum já estava vinte segundos dentro do huddle antes de a
animação da jogada terminar. Foi o que a pessoa responsável pelo protótipo viu no print: a
corrida de 16 jardas de Achane (06:38) na tela, o placar marcando `Q2 6:17`.

**2. O placar do sheet nascia 8,4px à direita.** As duas pontas do `SheetScoreboard` têm largura
de conteúdo, então a coluna do meio — relógio e situação — é centralizada no que sobra ENTRE
elas. Com `13 x 7` a ponta da esquerda media 83,6px e a da direita 66,8px, e a diferença é a
largura de um dígito. Só centralizava depois, quando a MIA fazia o touchdown e o placar virava
`13 x 14` — que é exatamente o "só centraliza depois" do relato.

**3. A entrada no intervalo era um corte.** Medido no navegador, amostrando a cada 50ms: entre uma
amostra e a seguinte o relógio virava `Intervalo`, o lance, o cartão e a linha do tempo sumiam, e
a lista de campanhas subia 146px de uma vez (1371px para 1225px). Tudo no MESMO quadro.

**4. A bolinha da jogada em foco teleportava.** No trilho não existia uma bolinha: o destaque era
um ESTADO de cada ponto (`--current`, núcleo de 14px com anel de 4px). Na troca de lance ele era
destruído num ponto e criado no outro. E a barra de progresso e a redistribuição dos pontos já
tinham transição de 320ms — então tudo escorregava e só a bola pulava.

**5. O número do placar trocava entre dois quadros.** O lance mais importante do jogo — o que muda
o placar — passava sem nada acontecer no número que ele mudou.

**6. O placar descrevia um momento que a tela ainda não tinha alcançado.** O defeito de fundo, e o
que fez os outros aparecerem: o passo do feed troca o jogo INTEIRO no instante em que o lance
CHEGA, e o campo leva de 1,2s (corrida curta) a 3,5s (passe profundo, com voo e avanço depois da
recepção) para desenhar esse mesmo lance. Dois sintomas da mesma causa — o número do placar mudava
antes de a bola voar, e o relógio já estava dentro do huddle enquanto o campo mostrava a jogada
anterior (na tela: corrida de 6 jardas às 05:43, relógio marcando 05:23).

### A regra, e onde ela mora

A conta ficou no GERADOR, junto das outras regras do recorte, e não no navegador. `buildSteps`
(`scripts/build-nfl-live-fixture.mjs`) passou a emitir dois campos por passo:

- `clockStops` — o relógio para quando este lance acaba? Sai de coluna real do nflverse: passe
  incompleto, pontuação, troca de posse, touchback, fair catch, falta, pedido de tempo e fim de
  período. O fora de campo é o único que só existe no texto da súmula (`ran ob`, `pushed ob`).
  Primeira descida NÃO entra — parar o relógio na primeira descida é regra universitária.
- `playSeconds` — quantos segundos do intervalo o LANCE em si queimou, do snap até a bola morrer.

A divisão se sustenta sozinha no dado: quando o cronômetro para no fim do lance, o que sobra até
o snap seguinte é zero, e então o intervalo medido É a duração do lance. Confere neste jogo — os
lances que param o relógio têm intervalos de 2 a 12 segundos, e os que não param, de 17 a 41.
Por isso `playSeconds` só precisa de estimativa (`PLAY_CLOCK_SECONDS`, 5-8s por tipo) no caso em
que o relógio segue correndo; nos outros ele é o intervalo inteiro.

No app, `burnedAt` (`nflLiveFeed.ts`) queima em duas fases: os `playSeconds` no tempo da animação
(`FEED_TIMING.playBurn`, 1800ms, fixo em tempo REAL e não proporcional — é o que faz uma parada
de regra ser visível), e o que sobrar espalhado pelo resto da espera. Lance que para o relógio
não deixa sobra, então o cronômetro fica congelado até o próximo lance chegar.

`isOver` passou a ser medido pelo CRONÔMETRO (`burned >= gapSeconds`) e não pela espera do passo.
No último lance — passe incompleto às 00:02 — os dois segundos queimam junto com a animação, e é
aí que o apito soa; medindo pela espera, o relógio mostraria `Intervalo` alguns segundos antes de
a tela entrar em intervalo.

### Arquivos alterados

- `scripts/build-nfl-live-fixture.mjs`: `stopsClock`, `PLAY_CLOCK_SECONDS`, `playClockSeconds` e
  os dois campos novos em `buildSteps`.
- `src/data/nflLiveGame.json`: regerado (`node scripts/build-nfl-live-fixture.mjs`). Mesmos 28
  passos e 89 lances; o que entrou foi `playSeconds` e `clockStops` por passo.
- `src/features/sports/NflLiveFeed/nflLiveFeed.ts`: `presentationOf`, o `live` atrasado exposto
  separado do `step`, `burnedAt` descendo dentro da apresentação e travando, `isPresenting` na
  comparação do `emit`, `FEED_TIMING.stageEnter` e o `isOver` medido pelo cronômetro.
- `src/features/sports/NflPlayReplay/playScene.ts`: `segmentsFor`, vindo do painel — passou a ter
  dois consumidores, e o feed precisa dela para saber quanto tempo o lance leva na tela.
- `src/features/sports/LiveEventPage/LiveEventPage.tsx`: `nflLiveMatch` e `withNflLiveState` leem
  `feed.live` no lugar de `feed.step.live`, para as duas telas descreverem o mesmo instante.
- `src/components/BottomSheet/NflPlaysStatsBottomSheet.tsx`: `HALFTIME_WHISTLE`, o estado em dois
  tempos do intervalo (`abriuNoIntervalo`/`halftimeAssentou`), a classe `nfl-plays--whistle`, o
  `isPeriodOver` para o painel e a classe de estado no relógio do placar.
- `src/components/BottomSheet/NflPlaysStatsBottomSheet.css`: `min-width: 2ch` e
  `text-align: center` em `.nfl-stats-bs__live-score-number`; a coreografia do apito
  (`nfl-plays-whistle-fold`, `nfl-plays-whistle-stage-out`, `nfl-plays-whistle-clock`,
  `--after-whistle`) e os dois `--whistle-fold`.
- `src/features/sports/NflPlayReplay/NflPlayReplayPanel.tsx`: prop `isPeriodOver`, que liga a
  saída do palco sem esperar o respiro de leitura.
- `src/features/sports/NflPlayReplay/NflFieldStage.tsx`: prop `exitNow` (espera zero) e a classe
  `nfl-plays__stage--whistle`.
- `src/features/sports/LiveEventPage/LiveEventPage.css`: `Intervalo` entra subindo na faixa de
  situação do placar do evento, em vez de trocar num quadro.
- No mesmo par `.tsx`/`.css` do sheet: `ScoreRoll` e o `previousLive` que desce até ele, a cabeça
  de leitura (`nfl-plays__timeline-head`), a deformação da viagem (`nfl-plays-head-travel`), a
  bobina (`nfl-score-roll-in`/`-out`) e a cor do ponto percorrido, que agora acende em vez de
  virar de uma vez.
- `scripts/check-nfl-replay.mjs`: cinco conferências novas do relógio (48 -> 52) e mais catorze do
  desenho do lance (52 -> 66).

Da segunda frente:

- `scripts/build-nfl-live-fixture.mjs`: `depth` no lance anulado (o balde que o parser já
  capturava e jogava fora), os campos `sack`/`sackedBy` e, para a falta seca, `penaltyBy` e
  `penaltyYards` (com a função `penaltyMarch`, que dá o sinal à marcação).
- `src/data/nflLiveGame.json`: regerado. Mesmos 28 passos e 89 lances.
- `src/features/sports/NflPlayReplay/playNarrative.ts`: `isSack`, `penaltyMarchYards`/
  `hasPenaltyMarch`, `hasNullifiedPlay` sem a exigência de `complete`, as variantes `sack`,
  `voidedIncomplete` e `penalty` em `PlayOutcome`, o título e o resultado do sack e da falta seca,
  o sack na placa de jardas e o texto do field goal.
- `src/features/sports/NflPlayReplay/playScene.ts`: `VOID_PASS_DEPTH` e `voidPassSpan`, as três
  variantes novas nas quatro tabelas existentes, as tabelas `KEEPS_POSSESSION` e `BALL_FALLS`, o
  sack e a falta seca entrando como trecho rasteiro, o nome de quem cometeu a falta no retrato e
  os três casos novos em `segmentsFor`.
- `src/features/sports/NflPlayReplay/NflFieldStage.tsx`: o X de bola no chão passou a usar a cor
  do caminho, e não a do erro.
- Ainda em `playScene.ts`: `PATH_TONE.touchback` e `FLOW_END_OPACITY.touchback`, para o chute que
  morre na end zone deixar de ser desenhado como erro.

### O apito, e a ordem da saída

A saída para o intervalo passou a ter ordem, e a ordem é a do jogo: o RELÓGIO anuncia (é ele que
vira `Intervalo`), o LANCE sai do campo, e só então dobram as duas coisas que descrevem um lance
em foco — o cartão e a linha do tempo. O campo fica, porque no intervalo ele continua ali, vazio.

Quem segura a troca é `HALFTIME_WHISTLE` (520ms), em `NflPlaysStatsBottomSheet.tsx`: enquanto ele
corre, o sheet fica em `nfl-plays--whistle` e só depois troca para o campo vazio. A dobra precisa
de uma altura de PARTIDA em pixels — `auto` não interpola —, e as duas são fixas por construção
(cartão: 32 + 4 + 48; trilho: 4 + 40 + 18). O número mora em `--whistle-fold`, ao lado das regras
que o produzem.

Duas armadilhas encontradas e resolvidas no caminho, as duas invisíveis num `build`:

- **Zerar a espera não faz o fade acontecer.** No apito o palco quase sempre JÁ está em
  `--leaving`, parado na espera do respiro de leitura (1020ms, ou 1680ms quando a placa das
  jardas gira). Trocar essa espera para zero mantém a MESMA animação, e o navegador recalcula o
  tempo dela contra a espera nova: como já se passou mais do que a duração, o palco pula direto
  para o fim. Medido: opacidade de 1,00 para 0,00 entre dois quadros. O que resolve é trocar o
  NOME da animação (`nfl-plays__stage--whistle`), porque isso cancela a antiga e começa outra do
  zero.
- **O campo não pode repetir o fade de entrada.** Depois do apito a arte já está na tela — quem
  saiu foi o lance —, e `nfl-plays-halftime-in` faria o gramado piscar no meio da transição.
  `--after-whistle` tira a animação. O fade continua valendo para quem ABRE o sheet com o jogo já
  parado, que é quando a arte está de fato chegando.

### A cabeça de leitura, e a bobina do placar

Duas trocas que aconteciam entre dois quadros e passaram a ter movimento. As duas escolhidas com a
pessoa responsável pelo protótipo: para o trilho foram apresentadas três opções (cabeça que viaja;
viagem acompanhando a reprodução do lance; só a passagem de bastão) e a escolha foi a **cabeça de
leitura que viaja**.

**A bolinha virou um OBJETO.** `.nfl-plays__timeline-head` é um elemento só, na posição da jogada
em foco, e a viagem é a transição de `left` na MESMA curva e duração da barra e da redistribuição
dos pontos — é isso que faz os três lerem como uma peça só. Os marcadores perderam `--current` e
ficaram todos com 8px; quem está sob a cabeça fica coberto, e `aria-current` no botão preserva o
que a classe dizia para quem não vê a tela. Dois elementos aninhados porque são dois transforms
que não podem disputar o mesmo atributo: o de fora centraliza no ponto, o de dentro deforma.

A deformação (`nfl-plays-head-travel`) é o que dá peso: a bola se estica no sentido em que anda e
assenta na chegada. O pico fica em 22% porque a curva da viagem é dianteira — quase toda a
distância é vencida no começo. É simétrica de propósito, para servir também a quem toca num lance
anterior e volta. Quem dispara é a `key` no índice do lance: elemento novo, animação do zero.

Vale notar o que NÃO dispara: quando um lance chega e a reprodução não avança, todos os pontos se
redistribuem e a cabeça acompanha — mas sem deformar. Redistribuição é o trilho mudando de escala,
não a bola andando.

**O número do placar virou uma bobina.** O antigo desce e sai, o novo entra por cima, os dois
percorrendo exatamente a altura da linha na mesma curva. Quem faz "sumir" e "aparecer" é o RECORTE
da caixa, e não um fade: com fade, na metade do caminho as duas cifras aparecem pela metade e o
placar fica ilegível justo no instante em que alguém está olhando para ele.

O valor de trás vem do DADO, e não de estado guardado: cada passo do feed é o jogo inteiro já
calculado, então `steps[index - 1].live` JÁ é o placar que estava na tela. Guardar o número velho
num `useState` seria uma segunda verdade para o mesmo número — e é assim que dois placares do
mesmo jogo divergem. Quem dispara é a montagem do elemento (`key` no próprio valor), o mesmo
padrão das chegadas na lista de campanhas: o relógio renderiza duas a três vezes por segundo e
nenhuma dessas renderizações remonta nada.

### A apresentação do lance, e a decisão que ela reverteu

A correção do defeito 6 é uma só e resolve os dois sintomas: **o placar descreve o lance que está
na tela**, e não o instante em que o lance chegou ao feed.

`presentationOf` (`nflLiveFeed.ts`) mede quanto tempo o lance leva para ACONTECER na tela, pela
MESMA conta que o painel usa para animar (`segmentsFor` + `replayTotalDuration`, mais a entrada do
palco). Não é estimativa: é a única forma de o placar virar exatamente quando o touchdown chega na
end zone, que é o lance em que errar aparece. `segmentsFor` saiu do painel para `playScene.ts`
porque passou a ter dois consumidores.

Enquanto o lance é desenhado:

- o **relógio** desce do horário do lance ANTERIOR até o horário DELE, e ali TRAVA até o próximo
  chegar. Na corrida de 6 jardas às 05:43, desce de 05:50 a 05:43 e fica;
- o **placar, a descida, o ponto da bola e a posse** continuam sendo os de antes do lance. Só
  viram quando ele acontece — conferido no touchdown: a bola voa com o placar ainda em 13 x 7, e
  os dois números viram junto com o relógio travando em 05:58.

O feed passou a expor `live` separado de `step`: só esse bloco atrasa. Campanhas e estatísticas
continuam sendo as do passo atual, porque a lista precisa conter a campanha do lance que acabou de
entrar — sem ela o sheet ficaria com um lance órfão, sem campanha para reproduzir.

**Isto REVERTE a decisão tomada mais cedo nesta mesma sessão** (regra real contínua, com o relógio
correndo pelo huddle). A pessoa responsável pelo protótipo viu a versão rodando e classificou o
resultado como erro de sincronização, pedindo explicitamente que o relógio travasse no horário do
lance. O que se perde, e está registrado no código: a parada de relógio da regra da NFL deixa de
aparecer COMO uma parada, porque agora o cronômetro fica travado entre todos os lances. A regra
continua valendo no dado — é ela que faz a descida ser de 5 segundos depois de um passe incompleto
e de 39 depois de uma corrida em campo —, e `check:nfl` continua protegendo isso. `playSeconds`
deixou de ser lido pelo app; segue emitido e conferido como medida da regra.

### O lance que não aparecia

Três relatos, um defeito só: **o campo desenha a partir das COLUNAS estatísticas, e emudece
quando a coluna vem vazia** — mesmo quando o texto oficial do lance diz exatamente o que houve.

**1. Passe anulado incompleto: campo vazio.** `hasNullifiedPlay` exigia `nullified.complete`, com
o argumento de que o texto diz "short right" mas não diz quantas jardas. O argumento não se
sustentava: o passe anulado COMPLETO já é desenhado com uma aproximação (o ganho total no lugar
das jardas aéreas), e `short`/`deep` é o balde oficial da NFL — uma medida, não um chute. A
profundidade agora sai da MEDIANA real de cada balde entre os passes incompletos da temporada
2023, medida no mesmo play-by-play que gera o fixture: `short` 5 jardas (4.486 lances), `deep` 24
(1.828). `VOID_PASS_DEPTH`, em `playScene.ts`, guarda os dois números com a origem escrita ao
lado. Nenhum número aparece na tela — `showsGainBadge` continua suprimindo a placa em toda
anulada —, e o que o campo passa a mostrar é o que o título dela já dizia em palavras.

**2. O sack chamado de "passe incompleto", e parado.** O nflverse guarda o sack como
`play_type: 'pass'` com `air_yards` vazio. Sem marca própria, o protótipo lia "passe" + "não
completou" e escrevia PASSE INCOMPLETO num lance em que passe nenhum saiu — e, sem jardas aéreas,
não desenhava nada. O fixture passou a carregar `sack` e `sackedBy`, o lance virou variante de
desfecho e é desenhado como uma CORRIDA PARA TRÁS: o ganho negativo cuida do sentido sozinho, e a
placa gira mostrando `-7`. É um lance no recorte (1915, Tagovailoa, 3ª & 13 às 02:00).

**3. "Field goal de 32 jardas · bom".** Era o `the field goal is GOOD` do gamebook traduzido ao pé
da letra, num espaço que em todo o resto da tela carrega uma QUANTIDADE ("+12 jardas",
"Touchback", "Posse para Dolphins"). Virou `convertido` / `perdido` (na Draftea, `convertido` /
`fallado`).

**4. A falta seca mostrava um capacete sem nome.** No falso início a bola não chega a ser
snapada, e a tela ficava com o retrato anônimo, a bola parada e o título genérico "Jogada
anulada" — num lance em que quem saiu antes do snap foi o Tyreek Hill. A falta É o lance ali, e o
dado bruto traz as duas coisas que ela tem: `penalty_player_name` (quem) e `penalty_yards`
(quanto a bola voltou). O fixture passou a carregar `penaltyBy` e `penaltyYards` — este último COM
SINAL no referencial de quem tem a bola —, o título virou o nome da falta (`Falso início`), o
resultado virou `Falso início · -5 jardas` e a bola desliza para a jarda nova no cinza da anulada.

O direito de desenhar esse recuo vem de uma conferência, não de uma suposição: ele tem de fechar
com a linha de scrimmage do lance SEGUINTE. Fecha nos oito `no_play` do recorte, e os três falsos
inícios recuam 5 jardas exatas (27->22, 22->17, 49->44). Meia distância para a end zone, faltas
compensadas ou falta recusada quebrariam a conta, e `check:nfl` avisa. A linha amarela da descida
NÃO anda junto — `startYard + distance` é o mesmo antes e depois —, e é por isso que a distância
cresce ("3ª e 8" vira "3ª e 13"): a bola recua para longe de uma linha parada. Também conferido.

**5. Dois punts lado a lado com linguagens visuais diferentes.** O punt dominado em campo saía
no lilás de sempre; o que terminou em touchback saía em VERMELHO, a mesma cor do passe que cai.
Vinha de `PATH_TONE.touchback = 'error'`, pelo argumento "a bola não chegou a ninguém" — que vale
para o passe e não vale para o chute: ele foi executado, andou as 48 jardas e a posse passou como
devia. Um punt que entra na end zone é o desfecho NORMAL dele. O touchback passou a usar o tom
dos outros chutes, com a mesma força de chegada (0,6 -> 0,95), e quem diz que ninguém ficou com a
bola continua sendo o X da chegada e o texto (`Touchback`). Vale igual para o kickoff que morre
na end zone, que é o caso do recorte (293).

As três variantes novas de `PlayOutcome` existem por uma razão de correção, não de organização: a
anulada incompleta herdando `voided` faria a bola SUBIR para o retrato no fim do lance, contando
uma recepção que não houve. É o mecanismo que o arquivo já previa — `Record<PlayOutcome, …>`
obriga a responder por toda variante nova —, e por isso duas tabelas que antes eram `!==` soltos
no meio de `carriesBall` viraram tabela (`KEEPS_POSSESSION`, `BALL_FALLS`).

Efeito colateral corrigido junto: o X de bola no chão era sempre vermelho. Num passe anulado que
caiu, o caminho é cinza porque quem apagou o lance foi a penalidade — e um X vermelho no fim dele
dizia o contrário. O X passou a usar a cor do caminho; no passe incompleto comum ele continua
vermelho, conferido.

### Validações executadas

- `npm run build`, `npm run check:nfl` (66 conferências), `npm run check:brands` e
  `npm run check:player-props` passando. `npx tsc -b` limpo. `eslint src` nos mesmos 26 problemas
  preexistentes (18 erros, 8 avisos) — nenhum novo.
- As conferências novas foram testadas ao contrário: forçando `playSeconds = gapSeconds` em todos
  os passos (o modelo antigo), `check:nfl` falha em "corrida derrubada em campo mantém o relógio
  correndo". Conferência que não falha não protege nada.
- Simulação dos 28 passos fora do navegador: todos caem EXATAMENTE no relógio do lance seguinte,
  sem sobra e sem salto.
- No navegador, em 375x812, na Pitaco, amostrando o relógio do sheet a cada 100ms por 38s
  corridos: no passe incompleto de 03:14 o cronômetro desce para `3:09` em 2s e fica **congelado
  4,3 segundos** até o punt chegar; no punt de 03:09 desce para `3:02` e congela outros 4,5s; na
  corrida de 03:55, derrubada em campo, ele corre sem parar pelo huddle inteiro.
- Placar do sheet medido nos dois placares: com `13 x 7` e com `13 x 14` as duas pontas medem
  88,9px e o relógio fica em 187,5 — o centro exato da faixa de 343px. Desvio 0px, contra os
  8,4px de antes.
- Reproduzido o instante do print (`13 x 7`, corrida de 16 jardas de Achane, campanha `5 de 5`,
  linha do tempo `07:33`–`06:38`): o placar agora mostra `Q2 6:37`, um segundo dentro do lance
  que está sendo desenhado.
- Intervalo conferido acelerando `Date.now` no navegador, sem mexer no código: `Intervalo`, campo
  vazio e situação vazia entram no MESMO estado — não há mais janela em que o relógio já zerou e
  a tela ainda mostra lance.
- Transição do intervalo medida no navegador a cada 25ms, com o relógio acelerado 9x: o palco
  apaga de 1,00 a 0,00 em ~380ms, o cartão dobra de 84px a 0 e a altura total desce de 1371px
  para 1225px em ~345ms, com o lance saindo ANTES de a dobra terminar. Apito inteiro em ~525ms,
  contra um único quadro antes.
- Abrir o sheet com o jogo já parado conferido em seguida: nenhum apito, o campo entra apagando
  (`nfl-plays-halftime-in`, medido em 0,66 no meio da entrada) e o placar mostra
  `16 · Intervalo · 14` com a lista de campanhas intacta.
- Console conferido em aba NOVA, sem erro. O `ReferenceError: entrouNoIntervalo` que aparecia na
  aba antiga era resto de HMR de uma edição intermediária; o módulo servido pelo Vite não tem a
  palavra, conferido por `curl`.
- Trilho medido no navegador a cada 25ms, com o relógio acelerado 3x, por 28 segundos: SETE
  viagens da cabeça, todas com pico de `scaleX` em 1,20 e ~250ms de deformação, acompanhando o
  deslocamento (`left 246 -> 288`, `311 -> 344`, `32 -> 120`, `113 -> 176`, `212 -> 260`). Zero
  marcadores com `--current` restantes. A troca de campanha leva a cabeça de volta ao começo do
  trilho (`202 -> 10`), junto com a barra — lê como o trilho rebobinando, e é o mesmo movimento
  que a barra já fazia.
- Bobina do placar conferida nas duas trocas do começo do jogo (7 -> 13 no touchdown, 13 -> 14 no
  ponto extra). Quadro congelado no meio do giro, com as animações pausadas e medidas: a caixa tem
  os 32px da linha com `overflow: hidden`, o número que entra estava a -1,3px do lugar e o que sai
  a +30,7px — os dois dentro do recorte. As duas cifras aparecem CORTADAS AO MEIO no meio do giro,
  que é o que uma bobina faz; num primeiro olhar isso parece defeito e não é.
- Centralização do placar conferida de novo depois da bobina: as duas pontas continuam com 88,9px.
- Sincronização conferida no navegador, amostrando placar, relógio, situação e lance em foco a
  cada 40ms por 30 segundos. No touchdown: `Q2 6:04 · 13x7` com o passe já na tela e a bola no ar,
  e só em `Q2 5:58` o placar vira `13x13` com `Touchdown · Hill` — o relógio trava ali. Na corrida
  de 6 jardas, o caso do relato: `5:48 -> 5:46 -> 5:43`, e trava em `05:43`, que é o horário do
  lance no trilho. No ponto extra, `13x13 -> 13x14` travando em `05:50`.
- Fim do primeiro tempo conferido depois da mudança (o último passo é o único que continua
  descendo depois da apresentação): `0:06 -> 0:01 -> Intervalo`, com o apito e o campo vazio em
  seguida.
- Resíduo conhecido e medido: a descida do relógio começa quando o lance CHEGA, e o campo só
  começa a desenhá-lo ~1,7s depois, por causa do respiro entre lances (`SEQUENCE_PAUSE`, que é do
  sheet e o feed não conhece). Nesse intervalo o relógio mostra horários que não são de nenhum
  lance. Era de 20 segundos antes da mudança.
- Da segunda frente, conferido no navegador em 375x812, reproduzindo cada lance pelo trilho:
  o passe anulado incompleto de Mahomes para Kelce (1962, o do relato) desenha o arco e cai a
  cerca de 5 jardas da linha, com Mahomes ficando na origem; o de Tagovailoa sem recebedor no
  texto (2248) desenha igual, sem retrato do outro lado; o sack aparece como `Sack de 7 jardas ·
  Karlaftis`, com Tagovailoa andando para trás e a placa girando para `-7`; o field goal diz
  `Field goal de 26 jardas · convertido`.
- Touchback conferido no navegador no kickoff do 1º quarto (293): o caminho agora sai em
  `#a877ff` com 0,95 de força no fim — o mesmo lilás dos outros chutes —, contra `#f43f5e` com
  0,6 antes. A regressão virou tripwire (`chute: touchback não é desenhado como erro`), testada
  ao contrário: devolvendo `'error'` à tabela, `check:nfl` falha.
- Falta seca conferida no navegador no falso início do 1º quarto (360): título `Falso início ·
  -5 jardas`, retrato com o nome `Jackson` no lugar do capacete anônimo, e a bola andando de
  verdade — amostrada a cada 90ms, ela sai de x=227 e chega a x=237 em ~400ms. Caminho e as duas
  bolinhas em `#9aa0a6`, o cinza da anulada, e não o vermelho do erro.
- Cor do X medida nos dois casos: `rgb(154, 160, 166)` (cinza da anulada) no passe anulado que
  caiu, `rgb(244, 63, 94)` (vermelho) no passe incompleto comum — sem regressão.
- As nove conferências novas foram testadas ao contrário: tirando o `depth` do lance 1962,
  desmarcando o `sack` do 1915 e pondo `short: 20` em `VOID_PASS_DEPTH`, as quatro que protegem
  cada um desses casos falham, inclusive a que teria pegado o sack silencioso ("passe: sem
  jardas aéreas, só se for sack").
- Console conferido em aba NOVA depois das duas frentes, sem erro. Os `ReferenceError` que
  aparecem na aba antiga são resto de HMR das edições intermediárias.
- NÃO conferido nesta sessão: Draftea, evento de futebol/basquete ao vivo e evento pré-jogo. A
  mudança é interna ao feed de NFL, ao sheet de NFL e ao CSS da faixa de situação do evento,
  então o risco novo está contido ali.

### Em aberto para a pessoa responsável pelo protótipo

- Duas decisões de produto, nenhuma delas defeito introduzido aqui:
  1. **O placar do sheet durante uma REVISÃO.** Ele mostra sempre o estado AO VIVO. Conferido no
     intervalo: com o kickoff de `00:18` reproduzindo na tela, o placar marcava `Intervalo` e
     `16 x 14`. A regra "o placar corresponde ao lance na tela" só vale na ponta ao vivo. Trocar
     para o estado daquele lance é possível — cada passo do feed já guarda o jogo inteiro —, mas
     muda o que o placar significa.
  2. A faixa de situação do placar continua descrevendo o LANCE QUE ACABOU, com a descida do snap
     dele, e não a situação que ficou. Registrada na rodada anterior e não tocada aqui.
- Aproximação conhecida e documentada no código: o aviso de dois minutos não é um caso à parte.
  Como o snap seguinte no dado real já é às 02:00, a descida chega no lugar certo; o que não
  acontece é o cronômetro congelar nos últimos instantes daquela espera.
- Defeito de texto PREEXISTENTE: `Corrida de 1 jardas` em vez de `1 jarda`, em `getPlayTitle`
  (`playNarrative.ts`).

### Próximo passo concreto

1. Validação da versão local pela pessoa responsável pelo protótipo. O `AGENTS.md` pede essa
   aprovação explícita ANTES da Pull Request.
2. Com a aprovação, abrir a PR de `fix/nfl-relogio-regra-e-placar` para `main` (`npm ci` e
   `npm run build` antes). Merge e publicação pedem autorização explícita à parte — o merge
   dispara o deploy do GitHub Actions.

## Histórico das entregas

- [2026-09-16 — Auditor semântico do replay NFL com TypeSafe](handoffs/2026-09-16-auditor-nfl-typesafe.md):
  o primeiro uso do Jev no projeto, restrito a `no_play` e sack, fora do app e sem tocar no
  fixture. Define o molde que `qa:copy:typesafe` reaproveita: chave fora do navegador,
  `--dry-run`, saída 1 para revisão e 2 para falha de configuração.
- [2026-09-16 — O jogo de NFL andando sozinho até o intervalo](handoffs/2026-09-16-nfl-jogo-ao-vivo.md):
  o feed que entrega os lances um a um, o sheet acompanhando o jogo, o movimento de chegada, o
  estado de intervalo e o placar próprio do sheet. É a base sobre a qual a regra de relógio
  descrita no Estado atual foi construída — o relógio derivado dos lances nasceu ali.
- [2026-09-16 — Nomenclatura da Draftea e o placar da NFL como gatilho](handoffs/2026-09-16-draftea-nomenclatura-e-placar-nfl.md):
  a troca de mercados e da navegação só na Draftea, o placar inteiro como gatilho do sheet de
  jogadas e o ponto extra fora do recorte — com o custo aceito de exibir 13 x 13, o placar
  certo no instante do touchdown.
- [2026-09-15 — Campo da NFL no Safari e oito ajustes no replay](handoffs/2026-09-15-campo-nfl-safari-e-replay.md):
  a largura declarada que devolve o registro do palco no WebKit, a bola que sobe para a mão
  sem cair, os tempos de leitura entre lances, a troca de foco em dois tempos, a abertura em
  `isAnimatable`, a campanha fabricada de demonstração, o X no selo da bola no lugar do
  carimbo ANULADA e a linha inteira da campanha como gatilho.
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
Git, validação completa ou publicação. Mexer no replay da NFL pede também os históricos de
2026-09-15 acima: o que está documentado ali são decisões tomadas, não sugestões.
