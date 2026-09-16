import { useSyncExternalStore } from 'react'
import { advanceLiveClock, formatLiveClock } from '../../../shared/utils/liveClock'
import { segmentsFor } from '../NflPlayReplay/playScene'
import { replayTotalDuration } from '../NflPlayReplay/usePlayReplay'
import nflLiveGame from '../../../data/nflLiveGame.json'

// Jogo de NFL acontecendo sozinho.
//
// O protótipo mostrava um INSTANTE congelado do jogo — o touchdown de 47 jardas — enquanto o
// relógio do placar corria. Relógio andando com o campo morto é a assinatura de um replay em
// laço: o tempo passa e nada acontece. Aqui os lances seguintes chegam sozinhos, um a um.
//
// De onde vem cada instante: do gerador, não daqui. `scripts/build-nfl-live-fixture.mjs` roda
// as MESMAS contas do recorte estático uma vez por lance do horizonte e emite `feed.steps` com
// o jogo inteiro já calculado — placar, situação de campo, campanhas, estatística de jogador e
// comparação entre equipes. Este módulo só escolhe qual passo está valendo agora. Refazer as
// contas no navegador seria repetir cada regra daquele arquivo, e cada repetição é uma chance
// de o placar da tela não bater com o das jogadas.
//
// Por que um store de módulo e não um `useState` por componente: três árvores diferentes leem
// o mesmo jogo — o card da lista em `CalendarSection`, o placar da `LiveEventPage` e o sheet de
// jogadas. Com um relógio por componente elas divergiriam em segundos, e quem voltasse da
// página para a lista veria dois placares diferentes do mesmo jogo.

type NflLiveGame = typeof nflLiveGame

export type NflFeedStep = NflLiveGame['feed']['steps'][number]

const STEPS = nflLiveGame.feed.steps as readonly NflFeedStep[]

/** O evento do calendário que este feed comanda. */
export const NFL_LIVE_EVENT_ID = 'nfl-1'

/**
 * O relógio deste jogo é do feed — nenhum tique genérico de 1 segundo pode avançá-lo.
 *
 * O app tem seis relógios independentes que, a cada segundo, descontam um segundo de todo
 * evento ao vivo da tela (home, calendário, página de competição, trilho de jogos). Eles são o
 * que faz os jogos MOCKADOS parecerem vivos, e continuam valendo para todos eles.
 *
 * Só que este jogo não é mockado: o relógio dele é derivado dos lances e anda comprimido, cerca
 * de três vezes mais rápido. Deixar os dois correndo juntos faria o placar mostrar um horário e
 * o feed entregar outro — a distância entre os dois chega a três minutos de jogo até o
 * intervalo, e a tela corrigiria a diferença num salto a cada lance.
 *
 * O jeito de desligar é OMITIR a chave do mapa de relógios, e não congelá-la: sem a chave, todo
 * consumidor cai no `dateTime` do evento, que é onde `withNflLiveState` põe o relógio do feed.
 *
 * Aceita tanto o id do evento (`nfl-1`) quanto a identidade composta do trilho (`nfl:nfl-1`).
 */
export const hasNflLiveClock = (key: string | undefined | null) => (
  key === NFL_LIVE_EVENT_ID || !!key?.endsWith(`:${NFL_LIVE_EVENT_ID}`)
)

/**
 * Ritmo. Estão todos neste bloco para serem ajustados numa leitura só, durante a validação.
 *
 * O intervalo entre um lance e o outro é PROPORCIONAL ao intervalo real entre eles no jogo
 * (`gapSeconds`, medido pelo gerador), comprimido e limitado. Intervalo fixo seria um
 * metrônomo, e metrônomo lê como animação em laço — não como jogo.
 *
 * Os limites importam mais do que a escala. O piso existe porque o jogo real tem rajadas: o
 * ponto extra e o kickoff saem no mesmo segundo de relógio, e uma penalidade acontece em cima
 * do lance anulado. Sem piso esses lances chegariam empilhados, sem tempo de leitura. O teto
 * existe porque uma queima de 40 segundos de relógio, mesmo comprimida, é tempo demais parado
 * numa demonstração.
 *
 * O primeiro lance do horizonte é o TOUCHDOWN, e ele chega pelo mesmo cálculo de todos os
 * outros: entre a corrida de abertura (06:38) e ele (05:58) o jogo real queimou 40 segundos, e
 * 40 segundos comprimidos em 3x dão ~13s de espera. É a maior espera do horizonte, e é
 * deliberadamente o preço de abrir num lance comum em vez de abrir no touchdown. Quem quiser
 * encurtá-la mexe em `maxInterval`, e o custo é o relógio andar mais rápido que 3x nas queimas
 * longas — o teto já faz isso acima de 42 segundos de gap.
 */
export const FEED_TIMING = {
  /** Segundos de relógio de jogo por segundo real. */
  scale: 3,
  minInterval: 6000,
  maxInterval: 14000,
  /**
   * Entrada do palco antes de a bola sair, em `nfl-plays-stage-in` (480ms no CSS do sheet).
   *
   * Entra na conta da APRESENTAÇÃO porque o lance só começa a acontecer na tela depois dela:
   * entre a chegada do lance e o primeiro movimento da bola existe esse respiro.
   */
  stageEnter: 480,
  /** De quanto em quanto o relógio é recalculado. Meio segundo não deixa dígito atrasado. */
  tick: 500,
} as const

const clockSeconds = (clock: string) => {
  const [minutes, seconds] = clock.split(':').map(Number)

  return minutes * 60 + seconds
}

/** `"05:58"` do fixture no formato que o app usa no placar: `Q2 05:58`. */
const quarterClock = (quarter: number, clock: string) => formatLiveClock({
  period: quarter,
  minutes: Math.floor(clockSeconds(clock) / 60),
  seconds: clockSeconds(clock) % 60,
  isQuarter: true,
})

const intervalOf = (step: NflFeedStep) => Math.min(
  FEED_TIMING.maxInterval,
  Math.max(FEED_TIMING.minInterval, (step.gapSeconds * 1000) / FEED_TIMING.scale),
)

export interface NflLiveFeedState {
  /** Posição no horizonte. 0 é o jogo no instante em que o protótipo abre. */
  index: number
  /** O jogo AGORA, inteiro: campanhas, estatística de jogador, comparação entre equipes. */
  step: NflFeedStep
  /**
   * O instante que o placar deve MOSTRAR: relógio, números, descida, ponto da bola, posse.
   *
   * Separado do passo porque atrasa em relação a ele. Enquanto o campo desenha o lance que
   * acabou de chegar, o que vale na tela ainda é o instante ANTERIOR — a jogada nova não
   * aconteceu. Ver `presentationOf`.
   *
   * Só este bloco atrasa. Campanhas e estatísticas continuam sendo as do passo atual: elas não
   * descrevem um instante, e a lista de campanhas precisa conter a campanha do lance que acabou
   * de entrar — sem ela o sheet ficaria com um lance órfão, sem campanha para reproduzir.
   */
  live: NflFeedStep['live']
  /** O campo ainda está desenhando o lance que chegou. O placar espera por ele. */
  isPresenting: boolean
  /** Relógio de jogo, no formato do placar. Vira `Intervalo` quando o quarter zera. */
  clock: string
  /** Os lances que já aconteceram. O que vem depois ainda não é público. */
  plays: NflLiveGame['plays']
  /** O lance que ACABOU de chegar, ou `null` no estado de abertura. */
  arrival: NflLiveGame['plays'][number] | null
  /** O relógio chegou ao fim do período e nada mais chega. */
  isOver: boolean
}

/**
 * Quanto tempo o lance leva para ACONTECER NA TELA, do instante em que chega até a bola assentar.
 *
 * Existe porque o feed e o campo andavam em tempos diferentes: o passo trocava o jogo inteiro no
 * instante da CHEGADA, e o campo levava de 1,2s (corrida curta) a 3,5s (passe profundo, com voo e
 * avanço depois da recepção) para desenhar o mesmo lance. O placar ficava descrevendo um momento
 * que a tela ainda não tinha alcançado — o número mudava antes de a bola voar, e o relógio já
 * estava dentro do huddle enquanto o campo mostrava a jogada anterior.
 *
 * A duração sai da MESMA conta que o painel usa para animar (`segmentsFor` + `replayTotalDuration`),
 * e não de uma estimativa: é a única forma de o placar virar exatamente quando o touchdown chega
 * na end zone, que é o lance em que errar aparece.
 */
const presentationByIndex = new Map<number, number>()

const presentationOf = (index: number) => {
  const cached = presentationByIndex.get(index)
  if (cached !== undefined) return cached

  const play = nflLiveGame.plays[STEPS[index].playCount - 1]
  const total = FEED_TIMING.stageEnter + replayTotalDuration(segmentsFor(play))
  presentationByIndex.set(index, total)

  return total
}

/**
 * Quantos segundos de relógio DE JOGO já correram dentro do passo.
 *
 * O relógio é derivado dos lances, e nunca deriva: cada passo parte do relógio do lance ANTERIOR
 * e chega exatamente no relógio do SEU lance — o `gapSeconds` do passo de trás é, por construção
 * do gerador, a distância entre os dois.
 *
 * A descida acontece toda dentro da apresentação, e depois o relógio TRAVA. É isso que faz o
 * número do placar ser sempre o número do lance que está na tela: na corrida de 6 jardas às
 * 05:43, o relógio desce de 05:50 até 05:43 enquanto a jogada é desenhada e fica ali até o
 * próximo lance chegar.
 *
 * O que se perde com isso, e é bom saber: a parada de relógio da regra da NFL deixa de aparecer
 * como uma parada, porque agora o cronômetro fica travado entre TODOS os lances. A regra continua
 * valendo no dado — é ela que faz a descida ser de 5 segundos depois de um passe incompleto e de
 * 39 depois de uma corrida em campo —, e `check:nfl` continua protegendo isso.
 *
 * O ÚLTIMO passo é o único que continua descendo depois da apresentação: ali não há próximo snap,
 * e o relógio simplesmente corre até zerar. É esse zero que leva o protótipo ao intervalo em vez
 * de congelar no 00:02 do último lance.
 */
const burnedAt = (index: number, elapsed: number) => {
  const step = STEPS[index]
  const previous = index > 0 ? STEPS[index - 1] : null
  const incoming = previous?.gapSeconds ?? 0
  const presentation = presentationOf(index)

  if (elapsed < presentation) return incoming * (elapsed / presentation)
  if (!step.endsPeriod) return incoming

  const runout = Math.max(1, intervalOf(step) - presentation)

  return incoming + step.gapSeconds * Math.min(1, (elapsed - presentation) / runout)
}

/**
 * `advanceLiveClock` é o relógio compartilhado do app, e é ele que devolve `Intervalo` quando o
 * quarter zera.
 */
const clockAt = (live: NflFeedStep['live'], burnedSeconds: number) => advanceLiveClock(
  quarterClock(live.quarter, live.clock),
  burnedSeconds,
)

/**
 * Os lances visíveis de cada passo, com identidade ESTÁVEL.
 *
 * O relógio é recalculado duas a três vezes por segundo, e cada recálculo passa por aqui. Sem o
 * cache, cada um devolvia um array novo com exatamente o mesmo conteúdo — e quem depende dele no
 * React (`useMemo`, efeito, agrupamento por campanha) recalculava no mesmo ritmo, sem ter nada
 * novo para mostrar. Pior: um efeito que agenda algo para depois, como a marca de "acabou de
 * chegar" na lista de campanhas, tinha o próprio agendamento cancelado na limpeza do render
 * seguinte, meio segundo depois, e nunca chegava a disparar.
 *
 * A chave é o `playCount`: dois passos com o mesmo número de lances mostram os mesmos lances.
 */
const playsByCount = new Map<number, NflLiveGame['plays']>()

const playsAt = (step: NflFeedStep) => {
  const cached = playsByCount.get(step.playCount)
  if (cached) return cached

  const plays = nflLiveGame.plays.slice(0, step.playCount)
  playsByCount.set(step.playCount, plays)

  return plays
}

const stateAt = (index: number, elapsed: number): NflLiveFeedState => {
  const step = STEPS[index]
  const isPresenting = index > 0 && elapsed < presentationOf(index)
  const live = isPresenting ? STEPS[index - 1].live : step.live
  const burnedSeconds = burnedAt(index, elapsed)

  return {
    index,
    step,
    live,
    isPresenting,
    // A descida SEMPRE parte do relógio do lance anterior — é de lá que ela vem. Depois da
    // apresentação o `live` já é o deste passo, e aí `burnedSeconds` vale o intervalo inteiro:
    // a conta cai exatamente no relógio dele, que é onde o cronômetro trava.
    clock: clockAt(STEPS[index - 1]?.live ?? step.live, burnedSeconds),
    plays: playsAt(step),
    arrival: index > 0 ? nflLiveGame.plays[step.playCount - 1] : null,
    // O primeiro tempo acaba quando o CRONÔMETRO zera, e não quando a espera do passo termina.
    // No último passo o relógio ainda desce depois da apresentação, até 00:00, e é aí que o
    // apito soa. Medir pela espera deixaria o relógio mostrando `Intervalo` antes da tela.
    isOver: step.endsPeriod && burnedSeconds >= (STEPS[index - 1]?.gapSeconds ?? 0) + step.gapSeconds,
  }
}

let state = stateAt(0, 0)
let index = 0
let startedAt = 0
let elapsedWhenHidden: number | null = null
let timer: number | null = null
const listeners = new Set<() => void>()

const emit = (next: NflLiveFeedState) => {
  // `useSyncExternalStore` compara por identidade, então o objeto só pode ser trocado quando
  // algo que a tela mostra mudou. Trocá-lo a cada tique faria as três árvores renderizarem
  // duas vezes por segundo sem nada novo na tela.
  if (
    next.index === state.index
    && next.clock === state.clock
    && next.isOver === state.isOver
    // A virada da apresentação troca o placar, a descida e o ponto da bola de uma vez, e pode
    // cair num quadro em que o relógio já mostrava o horário do lance. Sem ela na comparação, o
    // número do placar só mudaria no segundo seguinte.
    && next.isPresenting === state.isPresenting
  ) return

  state = next
  for (const listener of listeners) listener()
}

const tick = () => {
  if (elapsedWhenHidden !== null) return

  const step = STEPS[index]
  const elapsed = Date.now() - startedAt

  if (elapsed >= intervalOf(step) && index < STEPS.length - 1) {
    index += 1
    startedAt = Date.now()
    emit(stateAt(index, 0))

    return
  }

  emit(stateAt(index, elapsed))
}

/**
 * Aba escondida não acumula lances. Sem isto, quem troca de aba por dois minutos volta para
 * uma tela que pulou o jogo inteiro de uma vez — e o que ficou para trás é justamente o que o
 * protótipo quer mostrar acontecendo.
 */
const handleVisibility = () => {
  if (document.hidden) {
    elapsedWhenHidden = Date.now() - startedAt

    return
  }

  if (elapsedWhenHidden === null) return
  startedAt = Date.now() - elapsedWhenHidden
  elapsedWhenHidden = null
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)

  if (timer === null) {
    // A cada carregamento da página o jogo recomeça no touchdown: a demonstração é repetível,
    // e quem for apresentar a tela não precisa esperar o primeiro tempo acabar para mostrá-la
    // de novo.
    startedAt = Date.now()
    timer = window.setInterval(tick, FEED_TIMING.tick)
    document.addEventListener('visibilitychange', handleVisibility)
  }

  return () => {
    listeners.delete(listener)

    if (listeners.size > 0 || timer === null) return
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', handleVisibility)
    timer = null
  }
}

const getSnapshot = () => state

/**
 * O instante atual, fora do React.
 *
 * Existe para `getCalendarChampionships`, que monta a lista de eventos numa função pura e não
 * pode chamar hook. Quem MOSTRA o jogo continua precisando de `useNflLiveFeed` — sem a
 * assinatura o componente lê o valor certo e não renderiza de novo quando ele muda.
 */
export const getNflLiveFeed = () => state

export function useNflLiveFeed() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** O jogo sem o feed, para quem só precisa do time, da arte ou dos tipos. */
export { nflLiveGame }
