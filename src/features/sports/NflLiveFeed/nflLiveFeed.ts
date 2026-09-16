import { useSyncExternalStore } from 'react'
import { advanceLiveClock, formatLiveClock } from '../../../shared/utils/liveClock'
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
  /** O jogo AGORA, inteiro: placar, situação, campanhas, estatística, comparação. */
  step: NflFeedStep
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
 * O relógio é DERIVADO dos lances, e não uma contagem independente.
 *
 * Entre um lance e o seguinte ele interpola do relógio de um até o relógio do outro, ao longo
 * do intervalo real. Com isso ele nunca deriva — cai sempre exatamente no relógio do próximo
 * lance — e reproduz de graça as paradas do jogo real: no ponto extra e no kickoff o
 * cronômetro está parado, e os dois lances têm o mesmo relógio no dado, então ele simplesmente
 * não anda. Nenhum caso especial aqui dentro.
 *
 * `advanceLiveClock` é o relógio compartilhado do app, e é ele que devolve `Intervalo` quando o
 * quarter zera. O último passo tem `gapSeconds` igual ao que falta para 00:00, então o fim do
 * horizonte é o fim do primeiro tempo — o protótipo TERMINA em vez de congelar outra vez.
 */
const clockAt = (step: NflFeedStep, progress: number) => advanceLiveClock(
  quarterClock(step.live.quarter, step.live.clock),
  step.gapSeconds * progress,
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

const stateAt = (index: number, progress: number): NflLiveFeedState => {
  const step = STEPS[index]

  return {
    index,
    step,
    clock: clockAt(step, progress),
    plays: playsAt(step),
    arrival: index > 0 ? nflLiveGame.plays[step.playCount - 1] : null,
    isOver: step.endsPeriod && progress >= 1,
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
  if (next.index === state.index && next.clock === state.clock && next.isOver === state.isOver) return

  state = next
  for (const listener of listeners) listener()
}

const tick = () => {
  if (elapsedWhenHidden !== null) return

  const step = STEPS[index]
  const elapsed = Date.now() - startedAt
  const interval = intervalOf(step)
  const progress = Math.min(1, elapsed / interval)

  if (progress >= 1 && index < STEPS.length - 1) {
    index += 1
    startedAt = Date.now()
    emit(stateAt(index, 0))

    return
  }

  emit(stateAt(index, progress))
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
