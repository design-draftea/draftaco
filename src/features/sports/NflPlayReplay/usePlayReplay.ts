import { useCallback, useEffect, useRef, useState } from 'react'

// Estado de reprodução de um lance.
//
// Um único `requestAnimationFrame` dentro de um efeito, e não uma corrente de `setTimeout`
// por fase: com timers independentes, pausar, trocar de lance ou fechar o sheet deixa
// disparos órfãos que atualizam o resultado depois que a tela já mudou. Aqui o laço é dono
// do efeito, então a limpeza cancela o quadro em qualquer um desses casos, e as fases são
// derivadas do tempo acumulado em vez de guardadas em estado espalhado.
//
// As durações abaixo NÃO são medições do Twitter: não consegui cronometrar o replay de lá
// (o navegador limitou a amostragem). São propostas, reunidas neste bloco para ajuste
// numa única leitura durante a validação.

export const REPLAY_TIMING = {
  /** Pausa inicial para ler a situação antes de a bola sair. */
  prepare: 450,
  /** Voo: base + proporcional à distância aérea, dentro dos limites. */
  airBase: 620,
  airPerYard: 24,
  airMin: 780,
  airMax: 1700,
  /** Pulso de confirmação da recepção. */
  catchPulse: 460,
  /** Avanço rasteiro depois da recepção. */
  runBase: 320,
  runPerYard: 28,
  runMax: 950,
  /**
   * A bola some depois de assentar: espera, e depois apaga. Sem isso ela fica um objeto
   * solto no gramado enquanto a pessoa lê o resultado. Não vale para touchdown nem chute ao
   * gol, onde a posição final da bola É a informação do lance.
   */
  ballFadeDelay: 180,
  ballFadeDuration: 420,
  /**
   * Saída do palco ao encadear uma campanha. Entra depois do fadeOut da bola, para a
   * sequência ser: bola assenta -> bola apaga -> o resto do lance apaga -> próximo entra.
   * Antes disso o palco antigo sumia num quadro só e a troca parecia um corte.
   *
   * Esta espera é também O TEMPO EM QUE O LANCE TERMINADO FICA INTEIRO NA TELA, e é ela — não
   * o `SEQUENCE_PAUSE` — que se mexe para dar mais respiro de leitura antes da troca: a
   * pausa depois da saída é campo vazio, e esticá-la só atrasa o próximo lance. Saiu de 620
   * para 1020 a pedido da pessoa responsável pelo protótipo, com o respiro entre lances
   * acompanhando os mesmos 400ms.
   */
  stageExitDelay: 1020,
  /**
   * Quando a placa gira mostrando as jardas, o palco só pode começar a sair DEPOIS de o
   * número estar legível. Com os 620ms de antes o fade começava no meio do giro e o número
   * apagava enquanto aparecia. Leva os mesmos 400ms a mais do caso sem placa.
   */
  stageExitDelayGain: 1680,
  stageExitDuration: 380,
  /**
   * Palavra TOUCHDOWN sobre o campo. Primeiro cada letra nasce grande e assenta no tamanho
   * certo, uma atrás da outra; só depois de a palavra estar formada a onda percorre as
   * letras aumentando e diminuindo. A última letra entra em 8*70+420 = 980ms, então a onda
   * começa em 1020 — as duas fases não se sobrepõem.
   *
   * A onda fica em laço até o lance trocar (a troca desmonta o elemento e leva a animação
   * junto). `touchdownWave` é o CICLO inteiro, não o movimento: o keyframe faz a letra subir
   * e voltar nos primeiros 37% e descansar no resto, senão a palavra ficaria pulsando sem
   * parar. Com 1400ms, são ~520ms de onda e ~880ms de descanso entre as passadas.
   */
  touchdownLetterStep: 70,
  touchdownLetterIn: 420,
  touchdownWaveStart: 1020,
  touchdownWaveStep: 55,
  touchdownWave: 1400,
  /**
   * Giro da placa do jogador no fim do lance, revelando as jardas. A espera é o respiro
   * entre a bola assentar e a placa virar.
   *
   * O total (220 + 200 + 280 = 700ms) tem de caber no respiro entre lances (`SEQUENCE_PAUSE`,
   * 1500ms), senão a placa viraria com o lance já trocando.
   */
  badgeFlipDelay: 220,
  /**
   * As duas metades são ASSIMÉTRICAS de propósito: a ida é mais curta que a volta. Um giro
   * real sai rápido e tem um assentamento mais demorado do que a partida — é a volta que
   * precisa de espaço para o excesso de curso e a acomodação.
   */
  badgeFlipOut: 200,
  badgeFlipIn: 280,
  /** Tempo que um lance sem animação fica na tela durante a reprodução de uma campanha. */
  staticHold: 1500,
  /**
   * Espera antes de começar na primeira abertura do sheet. O sheet sobe em 300ms
   * (`slideUp` em BottomSheet.css) e a preparação dura 450ms: sem esta espera sobravam
   * 150ms de preparação com a tela já parada, e a bola saía quase junto com a abertura.
   * O +60 é o assentamento.
   */
  openDelay: 360,
} as const

export const REPLAY_SPEEDS = [0.5, 1, 1.5, 2, 3] as const
export type ReplaySpeed = typeof REPLAY_SPEEDS[number]

/**
 * Duração já escalada pela velocidade, no formato que o CSS espera.
 *
 * Toda animação declarada em CSS — voo, recolhimento da bola, giro da placa, saída do
 * palco, fogos, letras do touchdown — precisa da mesma divisão para as velocidades
 * diferentes de 1x continuarem sincronizadas entre si. Isso estava escrito à mão em 15
 * lugares, e esquecer um fazia aquela animação sozinha descolar do resto.
 *
 * Uso: `const ms = timeScaler(speed)` e depois `ms(REPLAY_TIMING.badgeFlipDelay)`.
 */
export const timeScaler = (speed: ReplaySpeed) => (ms: number) => `${ms / speed}ms`

export type ReplayPhase = 'idle' | 'preparing' | 'air' | 'catch' | 'run' | 'result'

export interface ReplaySegments {
  /** Jardas aéreas, para dimensionar o voo. */
  airYards: number
  /** Jardas rasteiras: avanço após a recepção, ou a corrida inteira. Zero se não houve. */
  runYards: number
  /**
   * Se a bola voa. Falso numa corrida, e aí as fases de voo e de recepção somem: sem isto,
   * uma corrida ficaria 780ms parada "no ar" (o piso de `airMin`) antes de andar, e ainda
   * daria um pulso de recepção que não existe em corrida.
   *
   * É um campo próprio, e não `airYards === 0`, porque passe também pode ter zero jarda
   * aérea — um passe na linha voa, só que curto.
   */
  hasFlight: boolean
}

export interface ReplayState {
  phase: ReplayPhase
  /** Progresso 0..1 dentro da fase atual. */
  progress: number
  /** Progresso 0..1 do lance inteiro. */
  elapsedRatio: number
}

const durations = ({ airYards, runYards, hasFlight }: ReplaySegments) => {
  const air = hasFlight
    ? Math.max(
      REPLAY_TIMING.airMin,
      Math.min(REPLAY_TIMING.airMax, REPLAY_TIMING.airBase + Math.abs(airYards) * REPLAY_TIMING.airPerYard),
    )
    : 0
  const catchPulse = hasFlight ? REPLAY_TIMING.catchPulse : 0
  const run = runYards > 0
    ? Math.min(REPLAY_TIMING.runMax, REPLAY_TIMING.runBase + runYards * REPLAY_TIMING.runPerYard)
    : 0

  return { prepare: REPLAY_TIMING.prepare, air, catchPulse, run }
}

export const replayTotalDuration = (segments: ReplaySegments) => {
  const { prepare, air, catchPulse, run } = durations(segments)

  return prepare + air + catchPulse + run
}

/** Fase e progresso a partir do tempo decorrido — sem estado escondido entre timers. */
const phaseAt = (elapsed: number, segments: ReplaySegments): ReplayState => {
  const { prepare, air, catchPulse, run } = durations(segments)
  const total = prepare + air + catchPulse + run
  const elapsedRatio = total > 0 ? Math.min(1, elapsed / total) : 1

  if (elapsed < prepare) return { phase: 'preparing', progress: elapsed / prepare, elapsedRatio }

  const afterPrepare = elapsed - prepare
  if (afterPrepare < air) return { phase: 'air', progress: afterPrepare / air, elapsedRatio }

  const afterAir = afterPrepare - air
  if (afterAir < catchPulse) return { phase: 'catch', progress: afterAir / catchPulse, elapsedRatio }

  const afterCatch = afterAir - catchPulse
  if (run > 0 && afterCatch < run) return { phase: 'run', progress: afterCatch / run, elapsedRatio }

  return { phase: 'result', progress: 1, elapsedRatio: 1 }
}

const PREPARING: ReplayState = { phase: 'preparing', progress: 0, elapsedRatio: 0 }
const FINISHED: ReplayState = { phase: 'result', progress: 1, elapsedRatio: 1 }

interface UsePlayReplayOptions {
  segments: ReplaySegments
  speed: ReplaySpeed
  /** Falso para lances sem animação: entra direto no estado final. */
  autoPlay: boolean
  /** Espera antes de começar, para não disputar com a animação de abertura do sheet. */
  startDelay?: number
  onEnded?: () => void
}

/**
 * O hook não sabe de troca de lance: quem o usa monta o componente com `key` por lance,
 * então trocar de lance remonta e zera tudo de uma vez — sem efeito de sincronização e
 * sem chance de sobrar rastro, pulso ou resultado atrasado do lance anterior. É também o
 * que a referência do Twitter faz: o SVG da jogada é reconstruído a cada lance.
 */
export function usePlayReplay({ segments, speed, autoPlay, startDelay = 0, onEnded }: UsePlayReplayOptions) {
  const [state, setState] = useState<ReplayState>(autoPlay ? PREPARING : FINISHED)
  const [isPlaying, setIsPlaying] = useState(autoPlay && startDelay === 0)

  const elapsedRef = useRef(0)
  const onEndedRef = useRef(onEnded)

  useEffect(() => {
    onEndedRef.current = onEnded
  }, [onEnded])

  const { airYards, runYards, hasFlight } = segments

  // Começa depois da espera. A limpeza cancela o disparo se a pessoa trocar de lance ou
  // fechar o sheet antes da hora.
  useEffect(() => {
    if (!autoPlay || startDelay === 0) return

    const timer = window.setTimeout(() => setIsPlaying(true), startDelay)

    return () => window.clearTimeout(timer)
  }, [autoPlay, startDelay])

  // O laço é dono deste efeito: a limpeza cancela o quadro ao pausar, ao desmontar (troca
  // de lance ou fechamento do sheet) e ao mudar a velocidade.
  useEffect(() => {
    if (!isPlaying) return

    let frame = 0
    let last = performance.now()
    const segmentsNow = { airYards, runYards, hasFlight }

    const loop = (now: number) => {
      elapsedRef.current += (now - last) * speed
      last = now

      const next = phaseAt(elapsedRef.current, segmentsNow)
      setState(next)

      if (next.phase === 'result') {
        setIsPlaying(false)
        onEndedRef.current?.()
        return
      }

      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(frame)
  }, [isPlaying, speed, airYards, runYards, hasFlight])

  const pause = useCallback(() => setIsPlaying(false), [])
  const resume = useCallback(() => setIsPlaying(true), [])

  const restart = useCallback(() => {
    elapsedRef.current = 0
    setState(PREPARING)
    setIsPlaying(true)
  }, [])

  return { ...state, isPlaying, pause, resume, restart, isEnded: state.phase === 'result' }
}
