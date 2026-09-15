import { brandStorage } from '../../../shared/brand/storage'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import ballImage from '../../../assets/iconsDraftaco/bola.png'
import connectionIcon from '../../../assets/iconsDraftaco/iconConexao.png'
import { OfflineRetryButton } from '../../../components/OfflineRetryButton'
import './EmbaixadinhaPage.css'

type GamePhase = 'idle' | 'playing' | 'game-over'

type BallMotion = {
  x: number
  y: number
  velocityX: number
  velocityY: number
  rotation: number
  angularVelocity: number
}

type ArenaBounds = {
  width: number
  height: number
}

const BALL_SIZE_PX = 62
const BALL_RADIUS_PX = BALL_SIZE_PX / 2
const RADIANS_TO_DEGREES = 180 / Math.PI
const DEGREES_TO_RADIANS = Math.PI / 180
const IDLE_GROUP_HEIGHT_PX = 107
const IDLE_BOTTOM_RESERVE_PX = 59
const GRAVITY_PX_PER_SECOND = 1120
const KICK_VELOCITY_PX_PER_SECOND = -575
const MAX_HORIZONTAL_VELOCITY_PX_PER_SECOND = 180
const CENTER_TOUCH_DEAD_ZONE_PX = 8
const CENTER_TOUCH_DEAD_ZONE_RATIO = CENTER_TOUCH_DEAD_ZONE_PX / BALL_RADIUS_PX
const CENTER_KICK_SPIN_RETENTION = 0.8
const OFF_CENTER_KICK_SPIN_RETENTION = 0.45
const MAX_KICK_ANGULAR_VELOCITY = 680
const KICK_SPIN_PER_HORIZONTAL_VELOCITY = 2.4
const AIR_ANGULAR_FRICTION = 0.998
const WALL_RESTITUTION = 0.72
const CEILING_RESTITUTION = 0.35
const FLOOR_RESTITUTION = 0.55
const FLOOR_IMPACT_FRICTION = 0.88
const FLOOR_ANGULAR_FRICTION = 0.94
const GROUND_ROLL_FRICTION = 0.965
const GROUND_ANGULAR_FRICTION = 0.97
const GROUND_ROLL_COUPLING = 0.12
const MIN_FLOOR_BOUNCE_VELOCITY = 95
const MIN_GROUND_VELOCITY = 6
const MIN_GROUND_ANGULAR_VELOCITY = 10
const MAX_FRAME_DELTA_SECONDS = 0.032
const MIN_KICK_INTERVAL_MS = 100
const POST_SETTLE_RESET_DELAY_MS = 260
const RECORD_STORAGE_KEY = 'draftaco-embaixadinha-record'
const INITIAL_ARENA_BOUNDS: ArenaBounds = { width: 375, height: 555 }

let memoryRecord = 0

const clamp = (value: number, minimum: number, maximum: number) => (
  Math.min(Math.max(value, minimum), maximum)
)

const formatScore = (score: number) => String(score).padStart(2, '0')

const getEffectiveHorizontalOffset = (normalizedHorizontalOffset: number) => {
  const clampedOffset = clamp(normalizedHorizontalOffset, -1, 1)
  const offsetMagnitude = Math.abs(clampedOffset)

  if (offsetMagnitude <= CENTER_TOUCH_DEAD_ZONE_RATIO) return 0

  const remappedMagnitude = (
    (offsetMagnitude - CENTER_TOUCH_DEAD_ZONE_RATIO) /
    (1 - CENTER_TOUCH_DEAD_ZONE_RATIO)
  )

  return Math.sign(clampedOffset) * remappedMagnitude
}

const getRollingAngularVelocity = (linearVelocity: number) => (
  (linearVelocity / BALL_RADIUS_PX) * RADIANS_TO_DEGREES
)

const getRollingLinearVelocity = (angularVelocity: number) => (
  angularVelocity * DEGREES_TO_RADIANS * BALL_RADIUS_PX
)

const getInitialPosition = ({ width, height }: ArenaBounds) => ({
  x: Math.max(0, (width - BALL_SIZE_PX) / 2),
  y: Math.max(
    0,
    (height - IDLE_BOTTOM_RESERVE_PX - IDLE_GROUP_HEIGHT_PX) / 2,
  ),
})

const readRecord = () => {
  try {
    const storedRecord = Number.parseInt(brandStorage.getItem(RECORD_STORAGE_KEY) ?? '', 10)

    if (Number.isInteger(storedRecord) && storedRecord >= 0) {
      memoryRecord = storedRecord
    }
  } catch {
    // The in-memory record remains available when local storage is blocked.
  }

  return memoryRecord
}

const writeRecord = (record: number) => {
  memoryRecord = record

  try {
    brandStorage.setItem(RECORD_STORAGE_KEY, String(record))
  } catch {
    // The current session still keeps the record in memory.
  }
}

const createBallMotion = (bounds: ArenaBounds): BallMotion => {
  const position = getInitialPosition(bounds)

  return {
    ...position,
    velocityX: 0,
    velocityY: 0,
    rotation: 0,
    angularVelocity: 0,
  }
}

/** Full-screen keepy-uppy game used by the offline experience. */
export function EmbaixadinhaPage() {
  const arenaRef = useRef<HTMLDivElement>(null)
  const ballRef = useRef<HTMLButtonElement>(null)
  const animateRef = useRef<(timestamp: number) => void>(() => undefined)
  const animationFrameRef = useRef<number | null>(null)
  const resetTimerRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number | null>(null)
  const lastKickTimeRef = useRef(-MIN_KICK_INTERVAL_MS)
  const phaseRef = useRef<GamePhase>('idle')
  const scoreRef = useRef(0)
  const recordRef = useRef(0)
  const boundsRef = useRef<ArenaBounds>(INITIAL_ARENA_BOUNDS)
  const motionRef = useRef<BallMotion>(createBallMotion(INITIAL_ARENA_BOUNDS))
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [score, setScore] = useState(0)
  const [record, setRecord] = useState(readRecord)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    recordRef.current = record
  }, [record])

  const renderBall = useCallback(() => {
    const ballElement = ballRef.current
    if (!ballElement) return

    const { x, y, rotation } = motionRef.current
    ballElement.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`
  }, [])

  const resetBall = useCallback(() => {
    motionRef.current = createBallMotion(boundsRef.current)
    renderBall()
  }, [renderBall])

  const scheduleIdleReset = useCallback(() => {
    if (resetTimerRef.current !== null) return

    resetTimerRef.current = window.setTimeout(() => {
      resetTimerRef.current = null

      if (phaseRef.current !== 'game-over') return

      scoreRef.current = 0
      setScore(0)
      resetBall()
      phaseRef.current = 'idle'
      setPhase('idle')
    }, POST_SETTLE_RESET_DELAY_MS)
  }, [resetBall])

  const endRound = useCallback(() => {
    phaseRef.current = 'game-over'
    setPhase('game-over')

    const finalScore = scoreRef.current
    const nextRecord = Math.max(recordRef.current, finalScore)

    if (nextRecord !== recordRef.current) {
      recordRef.current = nextRecord
      setRecord(nextRecord)
      writeRecord(nextRecord)
    }

    setAnnouncement(
      `Fim da rodada. Você fez ${finalScore} ${finalScore === 1 ? 'embaixadinha' : 'embaixadinhas'}. Recorde: ${nextRecord}.`,
    )
  }, [])

  const animate = useCallback((timestamp: number) => {
    if (phaseRef.current === 'idle') return

    const previousTimestamp = lastFrameTimeRef.current ?? timestamp
    const elapsedSeconds = Math.min(
      Math.max(0, (timestamp - previousTimestamp) / 1000),
      MAX_FRAME_DELTA_SECONDS,
    )
    lastFrameTimeRef.current = timestamp

    const motion = motionRef.current
    const bounds = boundsRef.current
    const maximumX = Math.max(0, bounds.width - BALL_SIZE_PX)
    const maximumY = Math.max(0, bounds.height - BALL_SIZE_PX)

    motion.velocityY += GRAVITY_PX_PER_SECOND * elapsedSeconds
    motion.x += motion.velocityX * elapsedSeconds
    motion.y += motion.velocityY * elapsedSeconds
    motion.rotation += motion.angularVelocity * elapsedSeconds
    motion.angularVelocity *= Math.pow(AIR_ANGULAR_FRICTION, elapsedSeconds * 60)

    if (motion.x <= 0) {
      motion.x = 0
      motion.velocityX = Math.abs(motion.velocityX) * WALL_RESTITUTION
      motion.angularVelocity = Math.abs(motion.angularVelocity)
    } else if (motion.x >= maximumX) {
      motion.x = maximumX
      motion.velocityX = -Math.abs(motion.velocityX) * WALL_RESTITUTION
      motion.angularVelocity = -Math.abs(motion.angularVelocity)
    }

    if (motion.y <= 0) {
      motion.y = 0
      motion.velocityY = Math.abs(motion.velocityY) * CEILING_RESTITUTION
    }

    if (motion.y >= maximumY) {
      motion.y = maximumY

      const impactVelocity = Math.max(0, motion.velocityY)

      if (phaseRef.current === 'playing') {
        endRound()
      }

      if (impactVelocity >= MIN_FLOOR_BOUNCE_VELOCITY) {
        motion.velocityY = -impactVelocity * FLOOR_RESTITUTION
        motion.velocityX *= FLOOR_IMPACT_FRICTION
        motion.angularVelocity = (
          motion.angularVelocity * FLOOR_ANGULAR_FRICTION +
          getRollingAngularVelocity(motion.velocityX) * (1 - FLOOR_ANGULAR_FRICTION)
        )
      } else {
        motion.velocityY = 0

        const rollingLinearVelocity = getRollingLinearVelocity(motion.angularVelocity)
        const sharedSurfaceVelocity = (motion.velocityX + rollingLinearVelocity) / 2
        const rollCoupling = 1 - Math.pow(
          1 - GROUND_ROLL_COUPLING,
          elapsedSeconds * 60,
        )

        motion.velocityX += (sharedSurfaceVelocity - motion.velocityX) * rollCoupling
        motion.angularVelocity += (
          getRollingAngularVelocity(sharedSurfaceVelocity) - motion.angularVelocity
        ) * rollCoupling
        motion.velocityX *= Math.pow(GROUND_ROLL_FRICTION, elapsedSeconds * 60)
        motion.angularVelocity *= Math.pow(GROUND_ANGULAR_FRICTION, elapsedSeconds * 60)

        if (
          Math.abs(motion.velocityX) < MIN_GROUND_VELOCITY &&
          Math.abs(motion.angularVelocity) < MIN_GROUND_ANGULAR_VELOCITY
        ) {
          motion.velocityX = 0
          motion.angularVelocity = 0
          renderBall()
          animationFrameRef.current = null
          scheduleIdleReset()
          return
        }
      }
    }

    renderBall()
    animationFrameRef.current = window.requestAnimationFrame((nextTimestamp) => {
      animateRef.current(nextTimestamp)
    })
  }, [endRound, renderBall, scheduleIdleReset])

  useEffect(() => {
    animateRef.current = animate
  }, [animate])

  const startAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
    }

    lastFrameTimeRef.current = null
    animationFrameRef.current = window.requestAnimationFrame((timestamp) => {
      animateRef.current(timestamp)
    })
  }, [])

  const kickBall = useCallback((normalizedHorizontalOffset: number) => {
    if (phaseRef.current === 'game-over') return

    const timestamp = window.performance.now()

    if (
      phaseRef.current === 'playing' &&
      timestamp - lastKickTimeRef.current < MIN_KICK_INTERVAL_MS
    ) {
      return
    }

    lastKickTimeRef.current = timestamp

    if (phaseRef.current !== 'playing') {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
        resetTimerRef.current = null
      }

      resetBall()
      scoreRef.current = 0
      setScore(0)
      setAnnouncement('')
      phaseRef.current = 'playing'
      setPhase('playing')
    }

    const horizontalOffset = getEffectiveHorizontalOffset(normalizedHorizontalOffset)
    const horizontalImpulse = -horizontalOffset * MAX_HORIZONTAL_VELOCITY_PX_PER_SECOND
    const motion = motionRef.current

    motion.velocityX = clamp(
      motion.velocityX * 0.35 + horizontalImpulse,
      -MAX_HORIZONTAL_VELOCITY_PX_PER_SECOND,
      MAX_HORIZONTAL_VELOCITY_PX_PER_SECOND,
    )
    motion.velocityY = KICK_VELOCITY_PX_PER_SECOND

    const contactSpin = horizontalImpulse * KICK_SPIN_PER_HORIZONTAL_VELOCITY
    const spinRetention = horizontalOffset === 0
      ? CENTER_KICK_SPIN_RETENTION
      : OFF_CENTER_KICK_SPIN_RETENTION

    motion.angularVelocity = clamp(
      motion.angularVelocity * spinRetention + contactSpin,
      -MAX_KICK_ANGULAR_VELOCITY,
      MAX_KICK_ANGULAR_VELOCITY,
    )

    scoreRef.current += 1
    setScore(scoreRef.current)
    renderBall()

    if (animationFrameRef.current === null) {
      startAnimation()
    }
  }, [renderBall, resetBall, startAnimation])

  const handleBallPointerDown = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    event.preventDefault()
    const ballBounds = event.currentTarget.getBoundingClientRect()
    const horizontalOffset = (
      event.clientX - (ballBounds.left + ballBounds.width / 2)
    ) / (ballBounds.width / 2)

    kickBall(horizontalOffset)
  }, [kickBall])

  const handleBallKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    kickBall(0)
  }, [kickBall])

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

      if (phaseRef.current !== 'playing') {
        resetBall()
        return
      }

      const motion = motionRef.current
      motion.x = clamp(motion.x, 0, Math.max(0, nextBounds.width - BALL_SIZE_PX))
      motion.y = clamp(motion.y, 0, Math.max(0, nextBounds.height - BALL_SIZE_PX))
      renderBall()
    }

    updateBounds()
    const resizeObserver = new ResizeObserver(updateBounds)
    resizeObserver.observe(arenaElement)

    return () => resizeObserver.disconnect()
  }, [renderBall, resetBall])

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

      if (
        phaseRef.current !== 'idle' &&
        resetTimerRef.current === null &&
        animationFrameRef.current === null
      ) {
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

  const instructionsVisible = phase === 'idle'

  return (
    <main className="embaixadinha-page">
      <div className="embaixadinha-page__surface">
        <div className="embaixadinha-page__glow" aria-hidden="true" />
        <div className="embaixadinha-page__header-space" aria-hidden="true" />

        <div className="embaixadinha-page__content">
          <header className="embaixadinha-page__intro">
            <span className="embaixadinha-page__connection-icon" aria-hidden="true">
              <img src={connectionIcon} alt="" />
            </span>
            <h1>OPS, SEM CONEXÃO!</h1>
            <p>O VAR tá revisando a sua internet. Enquanto isso, mostra que é craque nas embaixadinhas:</p>
            <OfflineRetryButton />
          </header>

          <section className="embaixadinha-game" aria-label="Jogo de embaixadinhas">
            <div className="embaixadinha-game__scoreboard">
              <div className="embaixadinha-game__score-pair">
                <span className="embaixadinha-game__tag embaixadinha-game__tag--label">EMBAIXADINHAS</span>
                <span
                  className="embaixadinha-game__tag embaixadinha-game__tag--score"
                  aria-label={`${score} ${score === 1 ? 'embaixadinha' : 'embaixadinhas'}`}
                >
                  <span className="embaixadinha-game__score-value">{formatScore(score)}</span>
                </span>
              </div>

              <div className="embaixadinha-game__score-pair">
                <span
                  className="embaixadinha-game__tag embaixadinha-game__tag--score"
                  aria-label={`Recorde: ${record}`}
                >
                  <span className="embaixadinha-game__score-value">{formatScore(record)}</span>
                </span>
                <span className="embaixadinha-game__tag embaixadinha-game__tag--label">RECORDE</span>
              </div>
            </div>

            <div className="embaixadinha-game__arena" ref={arenaRef}>
              <button
                ref={ballRef}
                className={`embaixadinha-game__ball${instructionsVisible ? ' embaixadinha-game__ball--idle' : ''}`}
                type="button"
                aria-label={phase === 'playing' ? 'Dar embaixadinha' : phase === 'game-over' ? 'Rodada encerrada' : 'Começar embaixadinhas'}
                aria-disabled={phase === 'game-over'}
                aria-describedby={instructionsVisible ? 'embaixadinha-instructions' : undefined}
                onPointerDown={handleBallPointerDown}
                onKeyDown={handleBallKeyDown}
              >
                <img src={ballImage} alt="" draggable="false" />
              </button>

              {instructionsVisible ? (
                <div className="embaixadinha-game__instructions" id="embaixadinha-instructions">
                  <p>Toque para começar!</p>
                  <p>Assim que o sinal voltar, seguimos o jogo.</p>
                </div>
              ) : null}
            </div>

            <p className="embaixadinha-game__announcement" role="status" aria-live="polite">
              {announcement}
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
