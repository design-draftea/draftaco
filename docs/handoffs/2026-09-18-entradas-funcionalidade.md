# Entradas: funcionalidade, resultados e encerramento — detalhes (2026-09-18)

Relato completo da sessão entregue pela branch `feature/entradas-funcionalidade`. O estado atual e
o resumo ficam em [`docs/AI_HANDOFF.md`](../AI_HANDOFF.md). As seções estão da mais recente para a
mais antiga.

### Resultado nas escolhas: card recolhido e "Não ganhou" (2026-09-18, nó Figma 1993:6923)

- **"Não ganhou" (nó 1993:6923, arquivo Estudos):** a seleção errada tem a escolha e a barra em
  `fill-error` (`#F87171`) e o **`Bold/circle-x`** vermelho ao lado da odd, espelhando o check da
  certa; o PA fica neutro. Ícone copiado byte a byte para
  `src/assets/iconsDraftaco/iconCircleXError.svg`. Só as linhas **encerradas** trocam o vermelho
  (`--bet-success-live-miss` redefinido em `.bet-success__selection-row--result-final-finished`);
  o ao vivo da tela de sucesso continua com o vermelho de ao vivo. **Resolve a pendência do "Não
  ganhou"** registrada na seção do placar.
- **Card recolhido**, pelo print do app da Draftea: cada círculo de jogo encerrado ganha anel verde
  e selo com o check (acertou) ou anel vermelho e selo com o X (errou), no canto de cima à direita,
  com fundo escuro preenchendo o recorte do ícone. Cancelada: círculos a 0,4 de opacidade. A
  animação de entrada dos círculos passou a declarar só o ponto de partida, para terminar no valor
  de cada um (antes forçava opacidade 1 e anularia o apagado).
- A lógica de acerto/erro saiu de `betSuccessSelections.tsx` para
  `src/features/betslip/BetSuccessPage/selectionResult.ts` (funções puras; o arquivo de componentes
  só pode exportar componentes). As funções movidas foram conferidas idênticas às do commit
  anterior; `getFinishedSelectionResult` é a nova, usada pelo card.
- O exemplo "Não ganhou" ganhou uma segunda escolha, certa (São Paulo 1 × 0 Bahia), como no
  desenho — odds 5.51x e ganho R$165,30.
- Leitor de tela: cada círculo diz "(acertou)"/"(errou)"; Draftea `(acertó)`/`(falló)`, e o alt do X
  `Errou` → `Falló`.
- Visto no print e **não feito** (não pedido): odds riscadas quando mudam e a faixa "Tu
  multiplicador cambió — Ver detalles".
- **Conferido no navegador, viewport 375×812:** Anteriores recolhido com anéis e selos certos
  (`rgb(52,211,153)` / `rgb(248,113,113)`), cancelado a 0,4; "Não ganhou" aberto com `#F87171`, X e
  PA neutro na errada, check e PA verde na certa; Draftea traduzida. `tsc -b`, `eslint` dos
  arquivos tocados, `check:brands` e `npm run build` limpos. O lint da pasta `BetSuccessPage`
  acusa 2 erros em `BetSuccessPage.tsx`, arquivo que esta branch não altera.

### Encerrar aposta e aba Encerradas (2026-09-18)

- Referência: três prints do app da Draftea enviados na conversa (sem nó Figma). A tag branca
  segue o `textBadge` do nó 4125:63570.
- **Próximas:** só a primeira aposta nasce aberta; as demais, recolhidas (`defaultCollapsed` no
  `EntryCard`, calculado pela posição na aba).
- **Fluxo:** "Encerrar aposta: R$X" → **Cancelar** / **Confirmar: R$X** (Cancelar volta ao botão
  original) → Confirmar mostra o carregamento no botão por **2s**, com os dois travados → pílula
  "✓ Aposta encerrada por: R$X" e o cabeçalho troca para o valor recebido com a tag branca
  **ENCERRADA** → depois de **1,4s**, o card **se recolhe sozinho** (etapa `settled`, pedido da
  pessoa responsável) → **3s** depois (era 1,6s; pedido para ficar mais tempo), sai de Próximas numa animação de 360ms (altura e espaço
  fecham juntos) e entra no topo da aba nova **Encerradas**, sem botões e **recolhido** — em
  Encerradas todo card nasce recolhido. O recolher automático é feito durante a renderização
  (comparando a etapa anterior), não em efeito; a pessoa ainda pode abrir o card depois.
  Conferido: pílula ~2,2s, recolhido ~3,4s, removido ~6,8s; em Encerradas, recolhido.
- O valor de encerramento é o da entrada (antes do jogo, encerrar devolve o apostado), a mesma
  regra de `createEntryFromReceipt`.
- **Estado:** `src/features/entries/useMyEntries.ts` guarda as abertas e as encerradas e agenda as
  etapas (`cashOutStatus`: `processing` → `closed` → `settled` → `leaving` → move com
  `outcome: 'cashed-out'`).
  Fica no `App` para o encerramento terminar mesmo se a pessoa sair da tela no meio. Só a escolha
  Cancelar/Confirmar é estado local do card.
- O espaço entre os cards passou do `gap` da lista para dentro de `.entry-card-slot__inner`, para
  o vão fechar junto na saída. Com quatro abas, os chips voltaram a rolar na horizontal.
- Encerradas começa vazia, como Próximas. Draftea: `CERRADA`, `CERRADAS`, "Apuesta cerrada por:" e
  o estado vazio; "Cancelar" e "Confirmar:" são iguais.
- **Fora do escopo, visto nos prints:** aba ABIERTAS, "Inicia en: 1h:23m" no card recolhido, tag
  SGP ao lado das odds e o saldo — o protótipo não debita a aposta nem credita o encerramento.
- **Conferido no navegador, viewport 375×812:** duas apostas reais → a mais recente aberta e a outra
  recolhida; Cancelar volta; Confirmar → carregamento até ~2,0s → pílula e ENCERRADA → saída em
  ~5,0s e remoção em ~5,4s; Encerradas com a tag branca (fundo `rgb(251,251,251)`, texto preto) e
  sem botões. Draftea com os textos traduzidos. `tsc -b`, `eslint`, `check:brands` e `npm run
  build` limpos.

### Ícones da navbar e versões ativas (2026-09-18)

- A pessoa responsável deixou os ícones **na pasta principal** (`main`, sem commit):
  `src/assets/navApostas.svg` redesenhado e `navApostasActive.svg`, `navEntradaActive.svg`,
  `navCassinoActive.svg` novos. Foram **copiados** (byte a byte) para esta branch; os arquivos da
  pasta principal ficaram intactos. **Atenção no merge:** depois que esta branch entrar na `main`,
  essas cópias locais da pasta principal vão conflitar com o `git pull` (um arquivo modificado e
  três não rastreados). Como são idênticos aos da branch, podem ser descartados — com autorização.
- `NavItem` ganhou `activeIcon` opcional (`src/shared/types/home.ts`); `homeProducts.ts` liga as
  versões ativas de Apostas, Entradas e Cassino, e a `Navbar` usa a ativa no item selecionado.
  Busca e Pitaco Club não têm versão ativa. O Cassino está desabilitado nas duas marcas hoje, então
  a versão ativa dele só aparece quando ele for liberado.
- Conferido no navegador: na home, Apostas usa `navApostasActive`; em Entradas, `navEntradaActive`
  e os demais o contorno; Pitaco e Draftea.

### Accordion do card de Entradas (2026-09-18)

- Abrir e recolher deixou de ser seco. Os dois estados ficam montados em painéis
  (`.entry-card__panel`), e a altura anima por `grid-template-rows` 1fr ↔ 0fr — acompanha o
  conteúdo real, sem medir em JS. Enquanto um painel fecha, o outro abre: o card muda de altura num
  movimento só (360ms, `cubic-bezier(0.22, 1, 0.36, 1)`, a curva mais usada no projeto). O
  conteúdo desliza 6px e esmaece; a seta gira no mesmo tempo. Ao recolher, os círculos entram em
  sequência (45ms entre eles). O painel fechado fica `inert`.
- Medido no navegador pausando as transições: ao fechar, 324 → 205 → 152 → 133 → 127 → 125px em
  0/60/120/180/240/300ms; ao abrir, o inverso, com os dois painéis cruzando a opacidade. O painel do
  navegador estava oculto (`document.hidden`), por isso a medição foi por `getAnimations()` e não em
  tempo real — a fluidez vista a olho no aparelho continua a conferir pela pessoa responsável.
- Parlay recolhido: **um círculo por escolha**, na ordem da aposta, mesmo quando as escolhas são do
  mesmo jogo (o card aberto as agrupa numa linha). Conferido com uma aposta real de total de gols +
  Dembélé + PSG: os dois escudos, a foto e o escudo do PSG. O texto para leitor de tela de cada
  círculo passou a ser "Mercado: escolha" ou "Jogador valor" (antes saía só "2.5+").

### Card recolhido com as escolhas em círculos (2026-09-18, nó Figma 4125:63570)

- Referência: `newEntryCards` recolhido no arquivo **One App BR - WEB Design** (nó 4125:63570),
  indicado pela pessoa responsável como a melhor visão desse estado. O link do 1993:6893 que veio
  junto não pôde ser relido porque o Figma Desktop estava com o outro arquivo na aba ativa.
- Recolhido, o card mostra **só o cabeçalho e a fileira de escolhas** (58px); seleções, botão de
  encerrar e **rodapé** ficam escondidos, como no desenho.
- Um círculo de 38px por escolha, na ordem da aposta, ligados por um **traço tracejado de 12px**
  (2px de traço, 2px de espaço, `fill-opacity-tertiary`), feito com CSS. Time: anel
  `fill-opacity-tertiary` e escudo de 30px no centro; jogador: anel `fill-opacity-secondary` e
  foto de 34px encostada embaixo. Muitas escolhas rolam na horizontal.
- A imagem vem do `BetSuccessSelectionAvatar` (mesmo das linhas): foto do jogador, escudo do time
  escolhido ou os dois escudos no empate. O CSS de Entradas só muda as medidas.
- A máscara em degradê da foto no Figma não foi reproduzida: com `mask-size` de 52px numa caixa de
  34px, o degradê começa abaixo da borda e não tem efeito visível.
- Cada círculo leva o nome da escolha em texto só para leitor de tela; a lista tem o rótulo
  "Escolhas da aposta" (`Selecciones de la apuesta` na Draftea).
- **Conferido no navegador, viewport 375×812:** Anteriores na Pitaco com os quatro cards
  recolhidos (escudo, foto e empate), expandir de novo restaura seleções e rodapé; Draftea com os
  rótulos traduzidos. `tsc -b`, `check:brands`, auditoria local de textos e `npm run build` limpos.

### Placar de jogo encerrado em Vencedoras e Anteriores (2026-09-18, nó Figma 1993:6893)

- **Como o Figma foi lido:** o MCP remoto recusa o arquivo (assento View). O desktop
  (`127.0.0.1:3845`) foi chamado por um cliente MCP mínimo, fora do repositório. Atenção: ele só
  enxerga o arquivo da **aba ativa** do Figma Desktop; com outra aba na frente, responde "No node
  could be found" e os assets dão HTTP 500.
- **Status novo `finished`** em `BetslipEventStatus`, e campo opcional `playerStatValue` em
  `BetslipSelection` (`src/shared/hooks/betslipUtils.ts`). O fluxo de aposta nunca produz esse
  status; só os exemplos de Entradas o usam. Os builders de `src/data/entries.ts` recebem o
  resultado (placar e, para jogador, finalizações) e marcam o jogo como encerrado.
- **Linha de resultado final** (`betSuccessSelections.tsx`): encerrado usa a mesma linha do ao
  vivo, com placar, barras e acerto/erro, trocando "AO VIVO + relógio" por **"Final"**. Na seleção
  certa, o **check verde** (`src/assets/iconsDraftaco/iconCircleCheckSuccess.svg`, bytes exatos do
  Figma) entra ao lado da odd e o **selo PA fica verde** (decisão: sempre que a seleção acertou).
- **Linha de jogador:** meta "Final • FLA (3) vs (1) SAO" e a **barra da estatística** do
  componente "points" (nó 1993:6440): abaixo da linha, a bolinha avança na proporção valor/linha;
  acima, a barra enche até a marca e a bolinha fica depois dela. Verde no acerto, vermelha no erro.
  A escolha continua "2.5+" — a pessoa responsável recusou a seta "↑ 2.5" do Figma.
- **Divisor vertical** entre o recolher e o conteúdo do cabeçalho, em todos os cards (decisão).
- **Bolinhas do trilho do parlay (2026-09-18, relatado pela pessoa responsável com prints):** em
  Entradas, o tracejado atravessava a bolinha de cada perna do parlay agrupado, porque o fundo dela
  (`.bet-success__group-leg::before`) usa `--bet-success-background`, também definido só na raiz
  `.bet-success`. Passou a ser definido em `.bet-success__selection-row`, junto das cores abaixo,
  com o mesmo valor. Levantamento feito: das variáveis `--bet-success-*` usadas pelas linhas, essas
  três eram as únicas que dependiam da raiz; o gradiente promocional é definido na própria linha.
  Conferido: as três bolinhas com fundo sólido, igual ao recibo.
- **Correção encontrada no caminho:** as cores de acerto e erro (`--bet-success-live-hit/miss`)
  só existiam na raiz `.bet-success` da tela de sucesso. Fora dela, em Entradas, o time escolhido
  não ficava verde e a barra ao lado do placar sumia — valia também para o card ao vivo de
  Próximas. Agora são definidas em `.bet-success__selection-row`, com os mesmos valores; a tela de
  sucesso conferida no navegador continua igual.
- Exemplos: o segundo card ganho passou a ter as duas seleções em jogos diferentes, como no
  desenho; o "não ganhou" tem placar 2 × 1 contra o "Empate"; o cancelado continua sem placar.
- ~~Pendente: o card "Não ganhou"~~ — resolvido com o nó 1993:6923 (seção acima).
- Draftea: "Final" é igual; `Acertou` → `Acertó` (alt do check). "FINALIZAÇÕES AO GOL" já saía em
  português na Draftea antes desta mudança e continua assim.
- **Conferido no navegador, viewport 375×812:** Vencedoras e Anteriores na Pitaco (cores
  computadas do verde, barras, check, PA, barra do jogador) e na Draftea; tela de sucesso e card
  ao vivo de Próximas depois de uma aposta real. `tsc -b`, `eslint` dos arquivos tocados,
  `check:brands`, auditoria local de textos (nenhum vazamento novo) e `npm run build` limpos.

### Camada de funcionalidade de Entradas (2026-09-18)

- **Aposta feita vai para Próximas.** `handleBetSuccess` (`src/App.tsx`) converte o recibo com
  `createEntryFromReceipt` (`src/features/entries/createEntryFromReceipt.ts`) e põe a entrada no
  topo de `placedEntries`, que chega à tela pela prop `openEntries`. É o único ponto de sucesso de
  aposta do app (`onBetSuccess` só existe no `BetslipPageV2`). O estado fica só em memória, como o
  betslip e o login: recarregar zera Próximas.
- Da conversão: código `DRFT` + 11 caracteres aleatórios; data `dd/mm (HH:MM)`; entrada e valor de
  encerramento por `formatMoney` (o encerramento é igual à entrada); odds, ganho potencial e
  seleções copiados do recibo, então o card mostra o mesmo que a tela de sucesso, com agrupamento
  e jogo ao vivo. Recibos da Camisa Premiada também entram.
- Decisões da pessoa usuária: Próximas **começa vazia**; o fluxo depois da aposta **não muda**
  (sucesso → "Fazer outra aposta" → home); "Encerrar aposta" **continua sem ação**.
- `src/data/entries.ts`: saíram os mocks de Próximas e o `entriesByTab`. Vencedoras tem 2 cards (um
  novo, com Flamengo + prop de Pedro) e Anteriores tem 4, do mais recente para o mais antigo. Os
  valores passaram ao formato do `formatMoney` (`R$245,00`), igual ao das apostas reais.
- Os rótulos guardam só valores (`createdAtLabel` é a data, `cashOutValueLabel` o valor); "Criado:",
  "Encerrar aposta:", "Entrada:" e "Reembolso:" ficam no JSX do card, onde a tradução e a auditoria
  os enxergam.

### Jev: auditoria de textos da Draftea em Entradas (2026-09-18)

- **Dentro do app o Jev não vale:** nada na tela exige julgamento, e a chave ficaria exposta no
  protótipo público. Ele entrou só na auditoria de textos.
- `qa:copy:typesafe --dry-run --path=src/features/entries` acusou "Ganho potencial" em português
  na Draftea. Entraram no `exactDrafteaTranslations`: `Ganancia potencial`, `Monto:` (termo do
  Pulse), `Creado:`, `Cerrar apuesta:`, `Contraer apuesta`, `Expandir apuesta`. "Ganho potencial" e
  "Entrada:" também aparecem no recibo da tela de sucesso, com o mesmo sentido, e passaram a ser
  traduzidos lá também — conferido no navegador.
- O script do projeto não filtra por chave e, sem cache no worktree (nem na pasta principal),
  mandaria as 60 primeiras entradas do catálogo. Por isso as perguntas foram feitas por um script
  temporário (fora do repositório) com **as mesmas perguntas, critérios, lote de 6 e limiar de
  0,75**. Custo total: 5 chamadas, 24 perguntas, cerca de 5,5 mil tokens, modelo `jev-1.13.0`.
- Resultado e decisão:
  - ok: `Ganancia potencial` 0,97, `Creado:` 0,96, `Cerrar apuesta:` 0,94, `Expandir apuesta`
    0,93, `¡GANADOR!` 0,92.
  - `Monto:` 0,55 (REVISAR) — mantido: é o termo que o Pulse usa neste mesmo campo do card.
    `Apuesta:` deu 0,58.
  - `Contraer apuesta` 0,40–0,48 (REVISAR) — mantido. Todas as alternativas ficaram abaixo; o
    provável é que o português "Recolher aposta" seja ambíguo fora de contexto (pode soar como
    recolher o valor). É só `aria-label`.
  - `NO GANADOR` 0,67 (REVISAR) — mantido por ser o par do Pulse com `¡GANADOR!`. **`NO GANÓ` deu
    0,97** e é a alternativa se a pessoa responsável preferir o verbo, como no "Não ganhou".
  - `Odds:` 0,28 como vazamento — fora do escopo: é o termo usado no app inteiro da Draftea.
  - `CANCELADO`, `CANCELADA` e `Reembolso:` acusados como português — **falso positivo**: as
    palavras existem iguais em espanhol.
- **Conferido no navegador, viewport 375×812:** Próximas vazia → duas apostas pela home (simples ao
  vivo e combinada do mesmo jogo com prop de jogador) → os dois cards no topo, iguais aos recibos;
  trocar de aba e voltar mantém; recarregar zera; Vencedoras 2 e Anteriores 4; na Draftea o card
  sai em espanhol. `tsc -b`, `eslint` dos arquivos tocados, `check:brands` e `npm run build`
  limpos. Os erros de HMR sobre `entriesByTab` no console são da edição intermediária e não se
  repetem numa carga do zero.
- Visto de passagem e **não corrigido** (existe na `main`): a Pitaco mostra "Para ganar" e "Desliza
  para apostar" em espanhol no betslip (`BetslipPageV2.tsx`), e a Draftea mostra "APOSTA CRIADA!"
  em português na tela de sucesso.

### Item Entradas clicável de novo (2026-09-18)

- A pedido, o clique no item **Entradas** da navbar voltou a abrir `/<marca>/entradas`. Isso
  desfaz a parte "inerte" do commit `50f3a74`: `buildEntriesPath` e o ramo do
  `handleNavbarItemSelect` em `src/App.tsx` voltaram como eram antes dele.
- **Conferido no navegador, viewport 375×812:** clique real na navbar leva a `/pitaco/entradas` e a
  `/draftea/entradas`, com o item ativo (`Entradas` / `Mis entradas`) e sem erro no console.
  `tsc -b` limpo.
- **Ainda não commitado** na `feature/entradas-layout`.

### Card de Entradas sem preenchimento e com o brilho do Pulse (2026-09-18)

- A pedido, o `.entry-card` passou a ter fundo transparente (antes era `--ds-background-app`
  chapado; no Pulse era `rgb(0 0 0 / 24%)`).
- O cabeçalho voltou a ter o brilho do card do Pulse: o mesmo `entryCardLight.svg`, com a mesma
  geometria (`top: -96px`, centralizado, 449×164), atrás do conteúdo. Cabeçalho, seleções, ações
  e rodapé ganharam `position: relative; z-index: 1` para pintar por cima dele.
- **Conferido no navegador, viewport 375×812, `/pitaco/entradas`:** fundo computado
  `rgba(0,0,0,0)`, imagem carregada e posicionada a 95px acima da borda (96px + 1px de borda),
  sem erro no console. `tsc -b` limpo. Ainda não commitado.

### Espaço de 16px entre os chips e o primeiro card (2026-09-18)

- Era 8px — só o padding inferior da faixa de chips dentro do header. A nova variável
  `--entries-content-gap: 8px` soma os 8px que faltavam ao `padding-top` de `.open-entries` e
  também é descontada da `min-height` do estado vazio, para ele não passar a rolar.
- **Conferido no navegador, viewport 375×812:** base dos chips em 96px e topo do card em 112px,
  tanto em `/pitaco/entradas` quanto em `/draftea/entradas`. Ainda não commitado.

### Quem entra em Entradas já fica logado (2026-09-18)

- Pedido: "já deixe o usuário logado quando entra". Interpretado como entrar na **tela Entradas**
  (clique na navbar ou URL direta), não no app inteiro — as demonstrações de login e cadastro da
  home continuam partindo do estado deslogado. Se a intenção era o app todo, a troca é o valor
  inicial de `authVariant` em `src/App.tsx`.
- Em `src/App.tsx`, logo após `isEntriesPage`: se a tela é Entradas e `authVariant` está
  `logged-out`, passa a `logged-in` com `loggedInInitialWithdrawableBalanceCents`, o mesmo saldo
  do `handleLoginSuccess`. O ajuste é feito durante a renderização, não em efeito, para o header
  não piscar deslogado. Como o protótipo não tem logout, os demais estados de sessão já estão nos
  valores iniciais do login. A pessoa **continua logada** ao voltar para a home.
- **Conferido no navegador, viewport 375×812:** home deslogada → clique em Entradas → header com
  saldo R$ 20,00, depósito e perfil; volta para Apostas ainda logado; `/draftea/entradas` por URL
  direta já abre logado. Sem erro no console. `tsc -b` e `eslint src/App.tsx` limpos. Ainda não
  commitado.

### Tags de resultado nas abas Vencedoras e Anteriores (2026-09-18)

- As tags do card do Pulse (`LegacyEntryCards.tsx` no projeto `pulse`) tinham sumido com a troca
  pelo card do Figma. Voltaram: `EntrySummary.outcome` (`won | lost | canceled`) escolhe a
  tag, que substitui o "Ganho potencial" no cabeçalho, como no Pulse. **Não existe tag de venda**
  (a `VENTA`/`VENDIDA` do Pulse): decisão da pessoa responsável, então ela foi retirada.
- **Ganhou** usa a arte `src/assets/badgeGanhador.svg` por baixo do texto. O arquivo **já estava no
  projeto** e é byte a byte igual ao do Pulse (mesmo SHA-1), então não foi copiado de novo. As
  demais tags são a pílula neutra do Pulse. Medidas portadas de `.won-entry-card__badge` e
  `.won-entry-card__status-badge`; valor apagado em perdida e cancelada, e entrada em destaque na
  cancelada, também como no Pulse.
- Textos: Pitaco `GANHOU!`, `NÃO GANHOU`, `CANCELADO`; Draftea, pelo `exactDrafteaTranslations`,
  com os textos do Pulse: `¡GANADOR!`, `NO GANADOR`, `CANCELADO`.
- Não ganhou: além de apagado, o valor que a pessoa ia receber aparece **riscado**, com uma linha
  única de 1,5px na cor do texto (`::after` do `.entry-card__payout`). Não é `line-through` porque
  o símbolo (16px) e o número (18px) teriam o risco em alturas diferentes e partido no espaço
  entre eles. Conferido no navegador: risco com a largura exata do valor.
- **Cancelada**, pela imagem de referência enviada na conversa (sem nó Figma): valor riscado como
  no não ganhou; tag do cabeçalho `CANCELADO`; `Reembolso:` no lugar de `Entrada:`, com o valor em
  destaque; seleções com opacidade 0,4, e a tag `CANCELADA` no lugar da odd de cada seleção, sem
  opacidade. A opacidade 0,4 foi **estimada pela imagem** — se houver nó Figma, conferir.
- Para trocar a odd sem mexer na tela de sucesso, `betSuccessSelections.tsx` ganhou o provedor
  opcional `BetSuccessOddOverride`: as três odds do módulo (`bet-success__result-odd` no resultado
  final antes do jogo e ao vivo, `bet-success__selection-odd` na linha padrão) passam por
  `BetSuccessOdd`, que sem o provedor desenha o mesmo `<strong>` de antes. O recibo da tela de
  sucesso não usa o provedor, então não muda — conferido no código, não no navegador.
- A linha de mercado do resultado final tem 15px fixos para a odd; na cancelada ela passa a
  `height: auto` para caber a tag de 20px.
- Linhas de **empate** não mostram odd no módulo compartilhado, então uma seleção de empate
  cancelada ficaria sem a tag. O mock de cancelada é de resultado final comum.
- **Fora do escopo, visto na imagem de referência:** um divisor vertical entre o botão de recolher
  e o conteúdo do cabeçalho, que o card não tem hoje, e uma seleção de jogador com a tag
  `NÃO JOGOU` e barra de progresso. Nenhum dos dois foi pedido nem implementado.
- Mocks: Anteriores tem os três resultados — ganhou, perdeu e uma cancelada nova (`entry-past-2`).
- **Conferido no navegador, viewport 375×812:** Vencedoras e Anteriores nas duas marcas, com as
  tags e cores computadas certas; depois da retirada da venda, Anteriores mostra só as três tags
  na Pitaco. Sem erro no console. `tsc -b` e `check:brands` limpos.
  O lint dos arquivos tocados só acusa o erro preexistente da linha 571 de `legacyCopy.ts`
  (espaço irregular, de outro commit). Ainda não commitado.

### Observação de ambiente

- No navegador do painel, o `LocationPermissionGate` cobre a home porque a geolocalização vem
  negada; "Ativar localização" o dispensa para testar. Não tem relação com esta mudança.
