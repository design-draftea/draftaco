import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import connectionIcon from '../../../assets/iconsDraftaco/iconConexao.png'
import logoOpacity from '../../../assets/iconsDraftaco/iconLogoOpacity.png'
import { OfflineRetryButton } from '../../../components/OfflineRetryButton'
import './PongPage.css'

type GamePhase = 'ready' | 'playing' | 'point-pause' | 'match-over'
type PointWinner = 'player' | 'machine'

type ArenaBounds = {
  width: number
  height: number
}

type BallMotion = {
  x: number
  y: number
  velocityX: number
  velocityY: number
}

type PaddlePositions = {
  playerX: number
  machineX: number
}

type BallTrailSample = {
  x: number
  y: number
}

const WINNING_SCORE = 3
const BALL_SIZE_PX = 6
const PADDLE_WIDTH_PX = 54
const PADDLE_HEIGHT_PX = 6
const WALL_INSET_PX = 2
const MACHINE_PADDLE_TOP_PX = 30
const PLAYER_PADDLE_BOTTOM_PX = 38
const BALL_SERVE_DISTANCE_PX = 55
const INITIAL_BALL_SPEED_PX_PER_SECOND = 220
const BALL_SPEED_INCREASE_PER_LEVEL = 16
const MAXIMUM_BALL_SPEED_PX_PER_SECOND = 460
const BALL_TRAIL_PARTICLE_COUNT = 7
const BALL_TRAIL_SAMPLE_INTERVAL_MS = 18
const BALL_TRAIL_DURATION_MS = 420
const BALL_TRAIL_FADE_OUT_MS = 140
const MAX_FRAME_DELTA_SECONDS = 0.032
const POINT_PAUSE_MS = 650
const MATCH_RESET_MS = 1200
const INITIAL_ARENA_BOUNDS: ArenaBounds = { width: 335, height: 490 }

const clamp = (value: number, minimum: number, maximum: number) => (
  Math.min(Math.max(value, minimum), maximum)
)

const getPlayerPaddleY = ({ height }: ArenaBounds) => (
  Math.max(MACHINE_PADDLE_TOP_PX + PADDLE_HEIGHT_PX, height - PLAYER_PADDLE_BOTTOM_PX - PADDLE_HEIGHT_PX)
)

const getInitialPaddlePositions = ({ width }: ArenaBounds): PaddlePositions => {
  const centeredX = Math.max(WALL_INSET_PX, (width - PADDLE_WIDTH_PX) / 2)

  return {
    playerX: centeredX,
    machineX: centeredX,
  }
}

const getReadyBallMotion = (bounds: ArenaBounds): BallMotion => ({
  x: Math.max(WALL_INSET_PX, (bounds.width - BALL_SIZE_PX) / 2),
  y: Math.max(
    MACHINE_PADDLE_TOP_PX + PADDLE_HEIGHT_PX,
    getPlayerPaddleY(bounds) - BALL_SERVE_DISTANCE_PX,
  ),
  velocityX: 0,
  velocityY: 0,
})

const getBallSpeed = (level: number) => Math.min(
  MAXIMUM_BALL_SPEED_PX_PER_SECOND,
  INITIAL_BALL_SPEED_PX_PER_SECOND + (level - 1) * BALL_SPEED_INCREASE_PER_LEVEL,
)
const getMachineSpeed = (level: number) => Math.min(260, 76 + (level - 1) * 20)
const getMachineAimError = (level: number) => Math.max(2, 44 - (level - 1) * 6)

const getMachineAimOffset = (level: number) => {
  const maximumError = getMachineAimError(level)
  return (Math.random() * 2 - 1) * maximumError
}

const overlapsPaddle = (ballX: number, paddleX: number) => (
  ballX + BALL_SIZE_PX >= paddleX && ballX <= paddleX + PADDLE_WIDTH_PX
)

/** Full-screen Pong game used by the offline experience. */
export function PongPage() {
  const arenaRef = useRef<HTMLDivElement>(null)
  const playerPaddleRef = useRef<HTMLDivElement>(null)
  const machinePaddleRef = useRef<HTMLDivElement>(null)
  const ballRef = useRef<HTMLDivElement>(null)
  const trailParticleRefs = useRef<Array<HTMLSpanElement | null>>([])
  const trailActiveUntilRef = useRef(0)
  const trailLastSampleTimeRef = useRef(0)
  const trailSamplesRef = useRef<BallTrailSample[]>([])
  const animateRef = useRef<(timestamp: number) => void>(() => undefined)
  const animationFrameRef = useRef<number | null>(null)
  const resetTimerRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number | null>(null)
  const phaseRef = useRef<GamePhase>('ready')
  const levelRef = useRef(1)
  const playerScoreRef = useRef(0)
  const machineScoreRef = useRef(0)
  const boundsRef = useRef<ArenaBounds>(INITIAL_ARENA_BOUNDS)
  const paddlesRef = useRef<PaddlePositions>(getInitialPaddlePositions(INITIAL_ARENA_BOUNDS))
  const motionRef = useRef<BallMotion>(getReadyBallMotion(INITIAL_ARENA_BOUNDS))
  const machineAimOffsetRef = useRef(getMachineAimOffset(1))
  const [phase, setPhase] = useState<GamePhase>('ready')
  const [level, setLevel] = useState(1)
  const [playerScore, setPlayerScore] = useState(0)
  const [machineScore, setMachineScore] = useState(0)
  const [announcement, setAnnouncement] = useState(
    'Level 1. Toque e arraste para mover sua raquete e começar.',
  )

  const renderGameObjects = useCallback(() => {
    const ballElement = ballRef.current
    const playerPaddleElement = playerPaddleRef.current
    const machinePaddleElement = machinePaddleRef.current

    if (!ballElement || !playerPaddleElement || !machinePaddleElement) return

    const motion = motionRef.current
    const paddles = paddlesRef.current
    const bounds = boundsRef.current

    ballElement.style.transform = `translate3d(${motion.x}px, ${motion.y}px, 0)`
    playerPaddleElement.style.transform = `translate3d(${paddles.playerX}px, ${getPlayerPaddleY(bounds)}px, 0)`
    machinePaddleElement.style.transform = `translate3d(${paddles.machineX}px, ${MACHINE_PADDLE_TOP_PX}px, 0)`
  }, [])

  const clearBallTrail = useCallback(() => {
    trailActiveUntilRef.current = 0
    trailLastSampleTimeRef.current = 0
    trailSamplesRef.current = []

    trailParticleRefs.current.forEach((particle) => {
      if (!particle) return

      particle.style.opacity = '0'
    })
  }, [])

  const triggerBallTrail = useCallback((timestamp: number) => {
    const motion = motionRef.current

    trailActiveUntilRef.current = timestamp + BALL_TRAIL_DURATION_MS
    trailLastSampleTimeRef.current = timestamp
    trailSamplesRef.current = [{ x: motion.x, y: motion.y }]
  }, [])

  const renderBallTrail = useCallback((timestamp: number) => {
    if (trailActiveUntilRef.current <= timestamp) {
      if (trailSamplesRef.current.length > 0) clearBallTrail()
      return
    }

    const motion = motionRef.current

    if (timestamp - trailLastSampleTimeRef.current >= BALL_TRAIL_SAMPLE_INTERVAL_MS) {
      trailLastSampleTimeRef.current = timestamp
      trailSamplesRef.current.push({ x: motion.x, y: motion.y })

      if (trailSamplesRef.current.length > BALL_TRAIL_PARTICLE_COUNT + 2) {
        trailSamplesRef.current.shift()
      }
    }

    const fadeOut = clamp(
      (trailActiveUntilRef.current - timestamp) / BALL_TRAIL_FADE_OUT_MS,
      0,
      1,
    )

    trailParticleRefs.current.forEach((particle, index) => {
      if (!particle) return

      const sample = trailSamplesRef.current[trailSamplesRef.current.length - 2 - index]

      if (!sample) {
        particle.style.opacity = '0'
        return
      }

      const depth = 1 - index / BALL_TRAIL_PARTICLE_COUNT
      const scale = 0.48 + depth * 0.46

      particle.style.opacity = String(0.68 * depth * fadeOut)
      particle.style.transform = `translate3d(${sample.x}px, ${sample.y}px, 0) scale(${scale})`
    })
  }, [clearBallTrail])

  const resetGameObjects = useCallback((resetPaddles = true) => {
    if (resetPaddles) {
      paddlesRef.current = getInitialPaddlePositions(boundsRef.current)
    }

    motionRef.current = getReadyBallMotion(boundsRef.current)
    clearBallTrail()
    renderGameObjects()
  }, [clearBallTrail, renderGameObjects])

  const startAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
    }

    lastFrameTimeRef.current = null
    animationFrameRef.current = window.requestAnimationFrame((timestamp) => {
      animateRef.current(timestamp)
    })
  }, [])

  const launchBall = useCallback((verticalDirection: -1 | 1) => {
    const bounds = boundsRef.current
    const speed = getBallSpeed(levelRef.current)
    const horizontalVelocity = (Math.random() * 2 - 1) * speed * 0.34
    const verticalVelocity = Math.sqrt(Math.max(0, speed ** 2 - horizontalVelocity ** 2))
    const initialY = verticalDirection < 0
      ? getPlayerPaddleY(bounds) - BALL_SERVE_DISTANCE_PX
      : MACHINE_PADDLE_TOP_PX + PADDLE_HEIGHT_PX + BALL_SERVE_DISTANCE_PX

    motionRef.current = {
      x: Math.max(WALL_INSET_PX, (bounds.width - BALL_SIZE_PX) / 2),
      y: initialY,
      velocityX: horizontalVelocity,
      velocityY: verticalVelocity * verticalDirection,
    }
    machineAimOffsetRef.current = getMachineAimOffset(levelRef.current)
    phaseRef.current = 'playing'
    setPhase('playing')
    setAnnouncement(`Level ${levelRef.current}. Placar ${playerScoreRef.current} a ${machineScoreRef.current}.`)
    renderGameObjects()
    startAnimation()
  }, [renderGameObjects, startAnimation])

  const resetMatch = useCallback((nextLevel: number) => {
    levelRef.current = nextLevel
    playerScoreRef.current = 0
    machineScoreRef.current = 0
    setLevel(nextLevel)
    setPlayerScore(0)
    setMachineScore(0)
    machineAimOffsetRef.current = getMachineAimOffset(nextLevel)
    resetGameObjects()
    phaseRef.current = 'ready'
    setPhase('ready')
    setAnnouncement(`Level ${nextLevel}. Toque e arraste para começar.`)
  }, [resetGameObjects])

  const finishPoint = useCallback((winner: PointWinner) => {
    animationFrameRef.current = null
    motionRef.current.velocityX = 0
    motionRef.current.velocityY = 0
    clearBallTrail()

    const nextPlayerScore = playerScoreRef.current + (winner === 'player' ? 1 : 0)
    const nextMachineScore = machineScoreRef.current + (winner === 'machine' ? 1 : 0)

    playerScoreRef.current = nextPlayerScore
    machineScoreRef.current = nextMachineScore
    setPlayerScore(nextPlayerScore)
    setMachineScore(nextMachineScore)

    const matchWinner = nextPlayerScore === WINNING_SCORE
      ? 'player'
      : nextMachineScore === WINNING_SCORE
        ? 'machine'
        : null

    if (matchWinner) {
      phaseRef.current = 'match-over'
      setPhase('match-over')

      const nextLevel = matchWinner === 'player' ? levelRef.current + 1 : levelRef.current
      setAnnouncement(
        matchWinner === 'player'
          ? `Você venceu por ${nextPlayerScore} a ${nextMachineScore}. Level ${nextLevel} desbloqueado.`
          : `A máquina venceu por ${nextMachineScore} a ${nextPlayerScore}. Tente novamente no level ${nextLevel}.`,
      )

      resetTimerRef.current = window.setTimeout(() => {
        resetTimerRef.current = null
        resetMatch(nextLevel)
      }, MATCH_RESET_MS)
      return
    }

    phaseRef.current = 'point-pause'
    setPhase('point-pause')
    setAnnouncement(
      winner === 'player'
        ? `Seu ponto. Placar ${nextPlayerScore} a ${nextMachineScore}.`
        : `Ponto da máquina. Placar ${nextPlayerScore} a ${nextMachineScore}.`,
    )

    resetTimerRef.current = window.setTimeout(() => {
      resetTimerRef.current = null
      launchBall(winner === 'player' ? -1 : 1)
    }, POINT_PAUSE_MS)
  }, [clearBallTrail, launchBall, resetMatch])

  const bounceFromPaddle = useCallback((paddleX: number, verticalDirection: -1 | 1) => {
    const motion = motionRef.current
    const speed = getBallSpeed(levelRef.current)
    const ballCenterX = motion.x + BALL_SIZE_PX / 2
    const paddleCenterX = paddleX + PADDLE_WIDTH_PX / 2
    const normalizedHitPosition = clamp(
      (ballCenterX - paddleCenterX) / (PADDLE_WIDTH_PX / 2),
      -1,
      1,
    )
    const maximumHorizontalVelocity = speed * 0.72
    const nextHorizontalVelocity = clamp(
      normalizedHitPosition * maximumHorizontalVelocity + motion.velocityX * 0.28,
      -maximumHorizontalVelocity,
      maximumHorizontalVelocity,
    )

    motion.velocityX = nextHorizontalVelocity
    motion.velocityY = Math.sqrt(Math.max(0, speed ** 2 - nextHorizontalVelocity ** 2)) * verticalDirection
  }, [])

  const animate = useCallback((timestamp: number) => {
    if (phaseRef.current !== 'playing') {
      animationFrameRef.current = null
      return
    }

    const previousTimestamp = lastFrameTimeRef.current ?? timestamp
    const elapsedSeconds = Math.min(
      Math.max(0, (timestamp - previousTimestamp) / 1000),
      MAX_FRAME_DELTA_SECONDS,
    )
    lastFrameTimeRef.current = timestamp

    const bounds = boundsRef.current
    const paddles = paddlesRef.current
    const motion = motionRef.current
    const maximumPaddleX = Math.max(WALL_INSET_PX, bounds.width - WALL_INSET_PX - PADDLE_WIDTH_PX)
    const targetMachineCenter = motion.velocityY < 0
      ? motion.x + BALL_SIZE_PX / 2 + machineAimOffsetRef.current
      : bounds.width / 2
    const targetMachineX = clamp(
      targetMachineCenter - PADDLE_WIDTH_PX / 2,
      WALL_INSET_PX,
      maximumPaddleX,
    )
    const machineMovementLimit = getMachineSpeed(levelRef.current) * elapsedSeconds
    paddles.machineX += clamp(
      targetMachineX - paddles.machineX,
      -machineMovementLimit,
      machineMovementLimit,
    )

    const previousY = motion.y
    motion.x += motion.velocityX * elapsedSeconds
    motion.y += motion.velocityY * elapsedSeconds

    if (motion.x <= WALL_INSET_PX) {
      motion.x = WALL_INSET_PX
      motion.velocityX = Math.abs(motion.velocityX)
    } else if (motion.x + BALL_SIZE_PX >= bounds.width - WALL_INSET_PX) {
      motion.x = bounds.width - WALL_INSET_PX - BALL_SIZE_PX
      motion.velocityX = -Math.abs(motion.velocityX)
    }

    const machinePaddleBottom = MACHINE_PADDLE_TOP_PX + PADDLE_HEIGHT_PX
    if (
      motion.velocityY < 0 &&
      previousY >= machinePaddleBottom &&
      motion.y <= machinePaddleBottom &&
      overlapsPaddle(motion.x, paddles.machineX)
    ) {
      motion.y = machinePaddleBottom
      bounceFromPaddle(paddles.machineX, 1)
      triggerBallTrail(timestamp)
    }

    const playerPaddleY = getPlayerPaddleY(bounds)
    if (
      motion.velocityY > 0 &&
      previousY + BALL_SIZE_PX <= playerPaddleY &&
      motion.y + BALL_SIZE_PX >= playerPaddleY &&
      overlapsPaddle(motion.x, paddles.playerX)
    ) {
      motion.y = playerPaddleY - BALL_SIZE_PX
      bounceFromPaddle(paddles.playerX, -1)
      triggerBallTrail(timestamp)
      machineAimOffsetRef.current = getMachineAimOffset(levelRef.current)
    }

    renderBallTrail(timestamp)

    if (motion.y + BALL_SIZE_PX < 0) {
      renderGameObjects()
      finishPoint('player')
      return
    }

    if (motion.y > bounds.height) {
      renderGameObjects()
      finishPoint('machine')
      return
    }

    renderGameObjects()
    animationFrameRef.current = window.requestAnimationFrame((nextTimestamp) => {
      animateRef.current(nextTimestamp)
    })
  }, [bounceFromPaddle, finishPoint, renderBallTrail, renderGameObjects, triggerBallTrail])

  useEffect(() => {
    animateRef.current = animate
  }, [animate])

  const movePlayerPaddle = useCallback((clientX: number) => {
    const arenaElement = arenaRef.current
    if (!arenaElement) return

    const arenaRect = arenaElement.getBoundingClientRect()
    const maximumX = Math.max(
      WALL_INSET_PX,
      boundsRef.current.width - WALL_INSET_PX - PADDLE_WIDTH_PX,
    )

    paddlesRef.current.playerX = clamp(
      clientX - arenaRect.left - PADDLE_WIDTH_PX / 2,
      WALL_INSET_PX,
      maximumX,
    )
    renderGameObjects()
  }, [renderGameObjects])

  const handleArenaPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    movePlayerPaddle(event.clientX)

    if (phaseRef.current === 'ready') {
      launchBall(-1)
    }
  }, [launchBall, movePlayerPaddle])

  const handleArenaPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return

    event.preventDefault()
    movePlayerPaddle(event.clientX)
  }, [movePlayerPaddle])

  const handleArenaPointerEnd = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  const handleArenaKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const maximumX = Math.max(
      WALL_INSET_PX,
      boundsRef.current.width - WALL_INSET_PX - PADDLE_WIDTH_PX,
    )

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const direction = event.key === 'ArrowLeft' ? -1 : 1
      paddlesRef.current.playerX = clamp(
        paddlesRef.current.playerX + direction * 24,
        WALL_INSET_PX,
        maximumX,
      )
      renderGameObjects()
      return
    }

    if ((event.key === 'Enter' || event.key === ' ') && phaseRef.current === 'ready') {
      event.preventDefault()
      launchBall(-1)
    }
  }, [launchBall, renderGameObjects])

  useLayoutEffect(() => {
    const arenaElement = arenaRef.current
    if (!arenaElement) return undefined

    const updateBounds = () => {
      const nextBounds = {
        width: arenaElement.clientWidth,
        height: arenaElement.clientHeight,
      }

      if (nextBounds.width <= 0 || nextBounds.height <= 0) return

      boundsRef.current = nextBounds

      const maximumPaddleX = Math.max(
        WALL_INSET_PX,
        nextBounds.width - WALL_INSET_PX - PADDLE_WIDTH_PX,
      )
      paddlesRef.current.playerX = clamp(paddlesRef.current.playerX, WALL_INSET_PX, maximumPaddleX)
      paddlesRef.current.machineX = clamp(paddlesRef.current.machineX, WALL_INSET_PX, maximumPaddleX)

      if (phaseRef.current !== 'playing') {
        resetGameObjects()
        return
      }

      motionRef.current.x = clamp(
        motionRef.current.x,
        WALL_INSET_PX,
        Math.max(WALL_INSET_PX, nextBounds.width - WALL_INSET_PX - BALL_SIZE_PX),
      )
      motionRef.current.y = clamp(
        motionRef.current.y,
        -BALL_SIZE_PX,
        nextBounds.height,
      )
      renderGameObjects()
    }

    updateBounds()
    const resizeObserver = new ResizeObserver(updateBounds)
    resizeObserver.observe(arenaElement)

    return () => resizeObserver.disconnect()
  }, [renderGameObjects, resetGameObjects])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrameRef.current !== null) {
          window.cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
        lastFrameTimeRef.current = null
        return
      }

      if (phaseRef.current === 'playing' && animationFrameRef.current === null) {
        startAnimation()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [startAnimation])

  useEffect(() => () => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
    }

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current)
    }
  }, [])

  return (
    <main className="pong-page">
      <div className="pong-page__surface">
        <div className="pong-page__glow" aria-hidden="true" />
        <div className="pong-page__header-space" aria-hidden="true" />

        <div className="pong-page__content">
          <header className="pong-page__intro">
            <span className="pong-page__connection-icon" aria-hidden="true">
              <img src={connectionIcon} alt="" />
            </span>
            <h1>OPS, SEM CONEXÃO!</h1>
            <p>O VAR tá revisando a sua internet. Bora jogar Pong enquanto ela não volta?</p>
            <OfflineRetryButton />
          </header>

          <section
            className="pong-game"
            aria-label={`Jogo Pong, level ${level}. Você ${playerScore}, máquina ${machineScore}. Primeiro a 3 pontos vence.`}
            data-phase={phase}
            data-level={level}
            data-player-score={playerScore}
            data-machine-score={machineScore}
          >
            <div
              ref={arenaRef}
              className="pong-game__field"
              role="application"
              tabIndex={0}
              aria-label="Arena do Pong. Arraste para mover sua raquete. Use as setas no teclado."
              aria-describedby="pong-announcement"
              onPointerDown={handleArenaPointerDown}
              onPointerMove={handleArenaPointerMove}
              onPointerUp={handleArenaPointerEnd}
              onPointerCancel={handleArenaPointerEnd}
              onKeyDown={handleArenaKeyDown}
            >
              <div className="pong-game__center-line" aria-hidden="true" />

              <span className="pong-game__score pong-game__score--machine" aria-hidden="true">
                {machineScore}
              </span>
              <span className="pong-game__score pong-game__score--player" aria-hidden="true">
                {playerScore}
              </span>

              <span className="pong-game__level" aria-hidden="true">LEVEL {level}</span>

              <span className="pong-game__center-mark" aria-hidden="true">
                <img src={logoOpacity} alt="" draggable="false" />
              </span>

              <div
                ref={machinePaddleRef}
                className="pong-game__paddle pong-game__paddle--machine"
                aria-hidden="true"
              />
              <div
                ref={playerPaddleRef}
                className="pong-game__paddle pong-game__paddle--player"
                aria-hidden="true"
              />
              <span className="pong-game__ball-trail" aria-hidden="true">
                {Array.from({ length: BALL_TRAIL_PARTICLE_COUNT }, (_, index) => (
                  <span
                    key={index}
                    ref={(element) => {
                      trailParticleRefs.current[index] = element
                    }}
                    className="pong-game__trail-particle"
                  />
                ))}
              </span>
              <div ref={ballRef} className="pong-game__ball" aria-hidden="true" />
            </div>

            <p className="pong-game__announcement" id="pong-announcement" role="status" aria-live="polite">
              {announcement}
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
