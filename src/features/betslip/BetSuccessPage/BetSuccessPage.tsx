import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import confetti from 'canvas-confetti'
import './BetSuccessPage.css'

import backgroundTextPitaco from '../../../assets/iconsDraftaco/backgroundTextPitaco.svg'
import camisaFrente from '../../../assets/iconsDraftaco/camisaFrente.png'
import camisaVersoGanhou from '../../../assets/iconsDraftaco/camisaVersoGanhou.png'
import camisaVersoPerdeu from '../../../assets/iconsDraftaco/camisaVersoPerdeu.png'
import camisaPremiadaIcon from '../../../assets/iconsDraftaco/iconeCamisaPremiada.png'
import futebolPremiadoIcon from '../../../assets/iconeFutebolPremiado.png'
import lightCamisaPremiada from '../../../assets/iconsDraftaco/lightCamisaPremiada.png'
import ilustraApostaCriada from '../../../assets/iconsDraftaco/ilustraApostaCriada.png'
import logoPitacoApostaCriada from '../../../assets/iconsDraftaco/logoPitacoApostaCriada.svg'
import penaltiPremiadoErrouVideo from '../../../assets/videoErrou.mp4'
import penaltiPremiadoGanhouVideo from '../../../assets/videoGanhou.mp4'
import {
  type BetslipSelection,
} from '../../../shared/hooks/betslipUtils'
import {
  formatMoney,
  groupSelectionsByEvent,
} from '../BetslipPageV2/betslipDisplayUtils'
import { BetSuccessSelectionGroupRow } from './betSuccessSelections'

export interface BetSuccessReceipt {
  selections: BetslipSelection[]
  stakeCents: number
  totalOddsLabel: string
  potentialWinLabel: string
  turboBoost?: {
    bonusPercent: number
    originalTotalOddsLabel: string
  }
  camisaPremiada?: {
    entryFeeCents: number
    featureName?: string
    jackpotCents: number
    selectedShirtIndex: 0 | 1 | 2
    winningShirtIndex: 0 | 1 | 2
  }
  createdAtMs: number
}

interface BetSuccessPageProps {
  receipt: BetSuccessReceipt
  onNewBet: () => void
  onShare?: () => void
}

const pullDismissThresholdPx = 96
const pullDismissAnimationMs = 260
const pullMaxPreviewOffsetPx = 180
const ticketFrameCornerRadiusPx = 24
const ticketFrameNotchCenterYPx = 122
const ticketFrameNotchRadiusPx = 20
const ticketFrameStrokeWidthPx = 4
const betSuccessEnterDurationMs = 360
const camisaPremiadaIntroDurationMs = 1700
const camisaPremiadaIntroExitDurationMs = 800
const camisaPremiadaRevealDurationMs = 700
const camisaPremiadaRevealBackSwapDurationMs = 350
const camisaPremiadaRevealHoldDurationMs = 1000
const camisaPremiadaFocusDurationMs = 600
const camisaPremiadaResultDurationMs = 5000
const camisaPremiadaExitDurationMs = 620
const camisaPremiadaSequenceLength = 17
const camisaPremiadaSequenceIntervalsMs = [85, 90, 100, 110, 120, 135, 155, 180, 210, 250, 300, 350, 400, 460, 520, 575] as const
const camisaPremiadaStopSettleDurationMs = 305

interface BetSuccessPullState {
  hasMoved: boolean
  pointerId: number
  startY: number
}

interface BetSuccessTicketFrameSize {
  height: number
  width: number
}

const getTicketFramePath = ({ height, width }: BetSuccessTicketFrameSize) => {
  if (height <= 0 || width <= 0) return ''

  const inset = ticketFrameStrokeWidthPx / 2
  const left = inset
  const top = inset
  const right = width - inset
  const bottom = height - inset
  const cornerRadius = Math.min(
    ticketFrameCornerRadiusPx,
    (right - left) / 2,
    (bottom - top) / 2
  )
  const notchRadius = Math.min(
    ticketFrameNotchRadiusPx,
    Math.max(0, (bottom - top - (cornerRadius * 2)) / 2)
  )
  const notchCenterY = Math.min(
    Math.max(ticketFrameNotchCenterYPx, top + cornerRadius + notchRadius),
    bottom - cornerRadius - notchRadius
  )
  const notchTop = notchCenterY - notchRadius
  const notchBottom = notchCenterY + notchRadius

  return [
    `M ${left + cornerRadius} ${top}`,
    `H ${right - cornerRadius}`,
    `Q ${right} ${top} ${right} ${top + cornerRadius}`,
    `V ${notchTop}`,
    `A ${notchRadius} ${notchRadius} 0 0 0 ${right} ${notchBottom}`,
    `V ${bottom - cornerRadius}`,
    `Q ${right} ${bottom} ${right - cornerRadius} ${bottom}`,
    `H ${left + cornerRadius}`,
    `Q ${left} ${bottom} ${left} ${bottom - cornerRadius}`,
    `V ${notchBottom}`,
    `A ${notchRadius} ${notchRadius} 0 0 0 ${left} ${notchTop}`,
    `V ${top + cornerRadius}`,
    `Q ${left} ${top} ${left + cornerRadius} ${top}`,
    'Z',
  ].join(' ')
}


const getPullPreviewOffset = (deltaY: number) => {
  if (deltaY <= 0) return 0
  if (deltaY <= pullDismissThresholdPx) return deltaY

  return Math.min(
    pullMaxPreviewOffsetPx,
    pullDismissThresholdPx + ((deltaY - pullDismissThresholdPx) * 0.38)
  )
}


function BetSuccessTicketFrame({ isBoosted }: { isBoosted: boolean }) {
  const frameRef = useRef<SVGSVGElement | null>(null)
  const [frameSize, setFrameSize] = useState<BetSuccessTicketFrameSize>({ height: 0, width: 0 })
  const path = getTicketFramePath(frameSize)

  useEffect(() => {
    const node = frameRef.current
    if (!node) return undefined

    const updateFrameSize = () => {
      const rect = node.getBoundingClientRect()
      const nextSize = {
        height: Math.round(rect.height),
        width: Math.round(rect.width),
      }

      setFrameSize((currentSize) => (
        currentSize.height === nextSize.height && currentSize.width === nextSize.width
          ? currentSize
          : nextSize
      ))
    }

    updateFrameSize()

    if (!window.ResizeObserver) {
      window.addEventListener('resize', updateFrameSize)
      return () => window.removeEventListener('resize', updateFrameSize)
    }

    const observer = new ResizeObserver(updateFrameSize)
    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  return (
    <svg
      ref={frameRef}
      className={`bet-success__ticket-frame${isBoosted ? ' bet-success__ticket-frame--boosted' : ''}`}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
      viewBox={`0 0 ${Math.max(frameSize.width, 1)} ${Math.max(frameSize.height, 1)}`}
    >
      {isBoosted ? (
        <defs>
          <linearGradient
            id="bet-success-booster-stroke"
            x1="0"
            y1="0"
            x2={Math.max(frameSize.width, 1)}
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="var(--ds-booster-grad-start, #ffa65b)" />
            <stop offset="100%" stopColor="var(--ds-booster-grad-end, #f0abfc)" />
          </linearGradient>
        </defs>
      ) : null}
      {path ? <path d={path} /> : null}
    </svg>
  )
}


type CamisaPremiadaShirtIndex = 0 | 1 | 2
type CamisaPremiadaBannerStage = 'intro' | 'intro-exit' | 'chase' | 'reveal' | 'reveal-hold' | 'focus' | 'result' | 'exit'

const createCamisaPremiadaLightSequence = (
  selectedShirtIndex: CamisaPremiadaShirtIndex
): CamisaPremiadaShirtIndex[] => {
  const sequence: CamisaPremiadaShirtIndex[] = [selectedShirtIndex]
  let currentPosition = selectedShirtIndex
  let direction = selectedShirtIndex === 2 ? -1 : 1

  while (sequence.length < camisaPremiadaSequenceLength) {
    if (currentPosition + direction < 0 || currentPosition + direction > 2) {
      direction *= -1
    }

    currentPosition = (currentPosition + direction) as CamisaPremiadaShirtIndex
    sequence.push(currentPosition)
  }

  return sequence
}

interface CamisaPremiadaBannerVisualProps {
  activeShirtIndex: CamisaPremiadaShirtIndex | null
  confettiCanvasRef?: { current: HTMLCanvasElement | null }
  featureName?: string
  hideOptions?: boolean
  introIconSrc?: string
  introSubtitle?: string
  isRevealBackVisible: boolean
  isStatic?: boolean
  jackpotLabel: string
  selectedShirtIndex: CamisaPremiadaShirtIndex
  stage: CamisaPremiadaBannerStage
  statusLabel: string
  winningShirtIndex: CamisaPremiadaShirtIndex
}

function CamisaPremiadaBannerVisual({
  activeShirtIndex,
  confettiCanvasRef,
  featureName = 'Camisa Premiada',
  hideOptions = false,
  introIconSrc = camisaPremiadaIcon,
  introSubtitle = 'será que a sua é premiada?',
  isRevealBackVisible,
  isStatic = false,
  jackpotLabel,
  selectedShirtIndex,
  stage,
  statusLabel,
  winningShirtIndex,
}: CamisaPremiadaBannerVisualProps) {
  const hasWon = selectedShirtIndex === winningShirtIndex
  const isShowingIntro = stage === 'intro' || stage === 'intro-exit'
  const isShowingOptions = !hideOptions && stage !== 'intro'
  const isRevealing = stage === 'reveal' || stage === 'reveal-hold' || stage === 'focus' || stage === 'result' || stage === 'exit'
  const isFocusedResult = stage === 'focus' || stage === 'result' || stage === 'exit'
  const focusedShirtOffsetPx = (1 - selectedShirtIndex) * 64

  return (
    <section
      className={[
        'bet-success__camisa-banner',
        `bet-success__camisa-banner--${stage}`,
        isStatic ? 'bet-success__camisa-banner--static' : '',
      ].filter(Boolean).join(' ')}
      role="status"
      aria-live={isStatic ? undefined : 'polite'}
      aria-label={statusLabel}
    >
      {confettiCanvasRef ? (
        <canvas ref={confettiCanvasRef} className="bet-success__camisa-confetti" aria-hidden="true" />
      ) : null}
      <img className="bet-success__camisa-light" src={lightCamisaPremiada} alt="" aria-hidden="true" draggable="false" />

      <div className="bet-success__camisa-stage" aria-hidden="true">
        {isShowingIntro ? (
          <div className="bet-success__camisa-intro">
            <img src={introIconSrc} alt="" draggable="false" />
            <span>
              <strong>{featureName}:</strong>
              <small>{introSubtitle}</small>
            </span>
          </div>
        ) : null}

        {isShowingOptions ? (
          <div
            className={[
              'bet-success__camisa-options',
              isRevealing ? 'bet-success__camisa-options--revealed' : '',
              stage === 'focus' ? 'bet-success__camisa-options--focus' : '',
              stage === 'result' || stage === 'exit' ? 'bet-success__camisa-options--result' : '',
            ].filter(Boolean).join(' ')}
          >
            <div className="bet-success__camisa-indicators-row">
              {isFocusedResult ? (
                <div className={`bet-success__camisa-result${hasWon ? ' bet-success__camisa-result--won' : ''}`}>
                  {hasWon ? (
                    <strong>Você ganhou! {jackpotLabel}</strong>
                  ) : (
                    <span>Não foi dessa vez</span>
                  )}
                </div>
              ) : (
                ([0, 1, 2] as const).map((shirtIndex) => (
                  <span className="bet-success__camisa-indicator-slot" key={shirtIndex}>
                    <span
                      className={`bet-success__camisa-indicator${activeShirtIndex === shirtIndex || (isRevealing && selectedShirtIndex === shirtIndex) ? ' bet-success__camisa-indicator--active' : ''}`}
                    />
                  </span>
                ))
              )}
            </div>

            <div className="bet-success__camisa-shirts-row">
              {([0, 1, 2] as const).map((shirtIndex) => {
                const isSelected = selectedShirtIndex === shirtIndex
                const exitDirection = shirtIndex < selectedShirtIndex ? -1 : 1
                const shirtStyle = isFocusedResult
                  ? {
                    '--camisa-focus-offset': `${focusedShirtOffsetPx}px`,
                    '--camisa-exit-offset': `${exitDirection * 16}px`,
                  } as CSSProperties
                  : undefined

                return (
                  <div
                    className={[
                      'bet-success__camisa-shirt-slot',
                      activeShirtIndex === shirtIndex ? 'bet-success__camisa-shirt-slot--active' : '',
                      isRevealing && isSelected ? 'bet-success__camisa-shirt-slot--selected' : '',
                      isRevealing && !isSelected ? 'bet-success__camisa-shirt-slot--non-selected' : '',
                    ].filter(Boolean).join(' ')}
                    key={shirtIndex}
                    style={shirtStyle}
                  >
                    <div
                      className={[
                        'bet-success__camisa-shirt-flipper',
                        stage === 'reveal' ? 'bet-success__camisa-shirt-flipper--flipping' : '',
                        stage !== 'reveal' && isRevealing && isRevealBackVisible
                          ? 'bet-success__camisa-shirt-flipper--flipped'
                          : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <img
                        className="bet-success__camisa-shirt-face bet-success__camisa-shirt-face--front"
                        src={camisaFrente}
                        alt=""
                        draggable="false"
                      />
                      <img
                        className="bet-success__camisa-shirt-face bet-success__camisa-shirt-face--back"
                        src={winningShirtIndex === shirtIndex ? camisaVersoGanhou : camisaVersoPerdeu}
                        alt=""
                        draggable="false"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function CamisaPremiadaResultBanner({
  receipt,
  onFinished,
}: {
  receipt: NonNullable<BetSuccessReceipt['camisaPremiada']>
  onFinished: () => void
}) {
  const [stage, setStage] = useState<CamisaPremiadaBannerStage>('intro')
  const [sequenceStep, setSequenceStep] = useState(0)
  const [isRevealBackVisible, setIsRevealBackVisible] = useState(false)
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const hasWon = receipt.selectedShirtIndex === receipt.winningShirtIndex
  const featureName = receipt.featureName ?? 'Camisa Premiada'
  const jackpotLabel = formatMoney(receipt.jackpotCents).replace(/^R\$/, 'R$ ')
  const lightSequence = useMemo(
    () => createCamisaPremiadaLightSequence(receipt.selectedShirtIndex),
    [receipt.selectedShirtIndex]
  )
  const activeShirtIndex = stage === 'chase'
    ? lightSequence[Math.min(sequenceStep, lightSequence.length - 1)]
    : null
  const statusLabel = stage === 'intro' || stage === 'intro-exit'
    ? `${featureName}: será que a sua é premiada?`
    : stage === 'chase'
      ? `Sorteando ${featureName}`
      : stage === 'reveal' || stage === 'reveal-hold'
        ? 'Revelando a camisa vencedora'
        : hasWon
          ? `Você ganhou ${jackpotLabel}`
          : 'Não foi dessa vez'

  useEffect(() => {
    const introTimer = window.setTimeout(() => {
      setStage('intro-exit')
    }, betSuccessEnterDurationMs + camisaPremiadaIntroDurationMs)

    return () => window.clearTimeout(introTimer)
  }, [])

  useEffect(() => {
    if (stage !== 'intro-exit') return undefined

    const optionsEntranceTimer = window.setTimeout(() => {
      setStage('chase')
    }, camisaPremiadaIntroExitDurationMs)

    return () => window.clearTimeout(optionsEntranceTimer)
  }, [stage])

  useEffect(() => {
    if (stage !== 'chase') return undefined

    let chaseTimer: number | null = null
    let isCancelled = false

    setSequenceStep(0)

    const scheduleNextStep = (currentStep: number) => {
      if (isCancelled) return
      if (currentStep === lightSequence.length - 1) {
        chaseTimer = window.setTimeout(() => {
          if (!isCancelled) setStage('reveal')
        }, camisaPremiadaStopSettleDurationMs)
        return
      }

      chaseTimer = window.setTimeout(() => {
        const nextStep = currentStep + 1
        setSequenceStep(nextStep)
        scheduleNextStep(nextStep)
      }, camisaPremiadaSequenceIntervalsMs[currentStep])
    }

    scheduleNextStep(0)

    return () => {
      isCancelled = true
      if (chaseTimer !== null) window.clearTimeout(chaseTimer)
    }
  }, [lightSequence, stage])

  useEffect(() => {
    if (stage !== 'reveal') return undefined

    setIsRevealBackVisible(false)
    const revealBackSwapTimer = window.setTimeout(() => {
      setIsRevealBackVisible(true)
    }, camisaPremiadaRevealBackSwapDurationMs)
    const revealTimer = window.setTimeout(() => {
      setStage('reveal-hold')
    }, camisaPremiadaRevealDurationMs)

    return () => {
      window.clearTimeout(revealBackSwapTimer)
      window.clearTimeout(revealTimer)
    }
  }, [stage])

  useEffect(() => {
    if (stage !== 'reveal-hold') return undefined

    const revealHoldTimer = window.setTimeout(() => {
      setStage('focus')
    }, camisaPremiadaRevealHoldDurationMs)

    return () => window.clearTimeout(revealHoldTimer)
  }, [stage])

  useEffect(() => {
    if (stage !== 'focus') return undefined

    const focusTimer = window.setTimeout(() => {
      setStage('result')
    }, camisaPremiadaFocusDurationMs)

    return () => window.clearTimeout(focusTimer)
  }, [stage])

  useEffect(() => {
    if (stage !== 'result') return undefined

    const resultTimer = window.setTimeout(() => {
      setStage('exit')
    }, camisaPremiadaResultDurationMs)

    return () => window.clearTimeout(resultTimer)
  }, [stage])

  useEffect(() => {
    if (stage !== 'exit') return undefined

    const exitTimer = window.setTimeout(onFinished, camisaPremiadaExitDurationMs)

    return () => window.clearTimeout(exitTimer)
  }, [onFinished, stage])

  useEffect(() => {
    if (stage !== 'result' || !hasWon || !confettiCanvasRef.current) return undefined

    const fireConfetti = confetti.create(confettiCanvasRef.current, {
      resize: true,
      useWorker: true,
    })
    const defaults = {
      colors: ['#5228FF', '#7A35FF', '#AE18FF'],
      origin: { y: 0.82 },
      ticks: 70,
    }

    fireConfetti({ ...defaults, particleCount: 50, spread: 38, startVelocity: 34 })
    fireConfetti({ ...defaults, particleCount: 70, spread: 82, startVelocity: 24, scalar: 0.8 })
    fireConfetti({ ...defaults, particleCount: 35, spread: 110, startVelocity: 20, decay: 0.92, scalar: 1.1 })

    return () => fireConfetti.reset()
  }, [hasWon, stage])

  return (
    <CamisaPremiadaBannerVisual
      activeShirtIndex={activeShirtIndex}
      confettiCanvasRef={confettiCanvasRef}
      featureName={featureName}
      isRevealBackVisible={isRevealBackVisible}
      jackpotLabel={jackpotLabel}
      selectedShirtIndex={receipt.selectedShirtIndex}
      stage={stage}
      statusLabel={statusLabel}
      winningShirtIndex={receipt.winningShirtIndex}
    />
  )
}

type PenaltiPremiadoResultStage = 'intro' | 'intro-exit' | 'video' | 'result' | 'exit' | 'complete'
const penaltiPremiadoWinningTitle = 'GOOOLLL'

function PenaltiPremiadoResultSequence({
  onFinished,
  receipt,
}: {
  onFinished: () => void
  receipt: NonNullable<BetSuccessReceipt['camisaPremiada']>
}) {
  const [stage, setStage] = useState<PenaltiPremiadoResultStage>('intro')
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const hasWon = receipt.selectedShirtIndex === receipt.winningShirtIndex
  const featureName = receipt.featureName ?? 'Pênalti Premiado'
  const jackpotLabel = formatMoney(receipt.jackpotCents).replace(/^R\$/, 'R$ ')
  const resultVideo = hasWon ? penaltiPremiadoGanhouVideo : penaltiPremiadoErrouVideo

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStage('intro-exit')
    }, betSuccessEnterDurationMs + camisaPremiadaIntroDurationMs)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (stage !== 'intro-exit') return undefined

    const timer = window.setTimeout(() => {
      setStage('video')
    }, camisaPremiadaIntroExitDurationMs)

    return () => window.clearTimeout(timer)
  }, [stage])

  useEffect(() => {
    if (stage !== 'result') return undefined

    const timer = window.setTimeout(() => {
      setStage('exit')
    }, camisaPremiadaResultDurationMs)

    return () => window.clearTimeout(timer)
  }, [stage])

  useEffect(() => {
    if (stage !== 'exit') return undefined

    const timer = window.setTimeout(() => {
      setStage('complete')
      onFinished()
    }, camisaPremiadaExitDurationMs)

    return () => window.clearTimeout(timer)
  }, [onFinished, stage])

  useEffect(() => {
    if (stage !== 'result' || !hasWon || !confettiCanvasRef.current) return undefined

    const fireConfetti = confetti.create(confettiCanvasRef.current, {
      resize: true,
      useWorker: true,
    })
    const defaults = {
      colors: ['#5228FF', '#7A35FF', '#AE18FF'],
      origin: { y: 0.82 },
      ticks: 70,
    }

    fireConfetti({ ...defaults, particleCount: 50, spread: 38, startVelocity: 34 })
    fireConfetti({ ...defaults, particleCount: 70, spread: 82, startVelocity: 24, scalar: 0.8 })
    fireConfetti({ ...defaults, particleCount: 35, spread: 110, startVelocity: 20, decay: 0.92, scalar: 1.1 })

    return () => fireConfetti.reset()
  }, [hasWon, stage])

  if (stage === 'complete') return null

  const isShowingIntro = stage === 'intro' || stage === 'intro-exit'
  const isShowingVideo = stage === 'video' || stage === 'result' || stage === 'exit'
  const isShowingResult = stage === 'result' || stage === 'exit'
  const statusLabel = isShowingIntro
    ? `${featureName}: Trave ou Gol`
    : isShowingResult
      ? hasWon
        ? `${penaltiPremiadoWinningTitle}. Ganhou! ${jackpotLabel}`
        : 'Na trave!!! Não foi dessa vez'
      : 'Resultado do Pênalti Premiado'

  return (
    <section
      className={[
        'bet-success__camisa-banner',
        'bet-success__penalti-banner',
        isShowingIntro ? `bet-success__camisa-banner--${stage}` : '',
        `bet-success__penalti-banner--${stage}`,
      ].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
      aria-label={statusLabel}
    >
      {hasWon ? (
        <canvas ref={confettiCanvasRef} className="bet-success__camisa-confetti" aria-hidden="true" />
      ) : null}
      <img
        className="bet-success__camisa-light"
        src={lightCamisaPremiada}
        alt=""
        aria-hidden="true"
        draggable="false"
      />

      <div className="bet-success__camisa-stage" aria-hidden="true">
        {isShowingIntro ? (
          <div className="bet-success__camisa-intro">
            <img src={futebolPremiadoIcon} alt="" draggable="false" />
            <span>
              <strong>{featureName}:</strong>
              <small>Trave ou Gol</small>
            </span>
          </div>
        ) : null}

        {isShowingVideo ? (
          <video
            className="bet-success__penalti-banner-video"
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={() => setStage('result')}
          >
            <source src={resultVideo} type="video/mp4" />
          </video>
        ) : null}

        {isShowingResult ? (
          <div
            className={`bet-success__penalti-result-message${hasWon ? ' bet-success__penalti-result-message--won' : ''}`}
          >
            {hasWon ? (
              <strong
                className="bet-success__penalti-goal-title"
                aria-label={penaltiPremiadoWinningTitle}
              >
                {Array.from(penaltiPremiadoWinningTitle).map((letter, index) => (
                  <span
                    key={`${letter}-${index}`}
                    className="bet-success__penalti-goal-letter"
                    style={{
                      '--penalti-goal-enter-delay': `${180 + index * 80}ms`,
                      '--penalti-goal-bounce-delay': `${800 + index * 80}ms`,
                    } as CSSProperties}
                    aria-hidden="true"
                  >
                    {letter}
                  </span>
                ))}
              </strong>
            ) : (
              <strong>Na trave!!!</strong>
            )}
            <span className="bet-success__penalti-result-subtitle">
              {hasWon ? `Ganhou! ${jackpotLabel}` : 'Não foi dessa vez'}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  )
}

const camisaPremiadaStaticJackpotLabel = formatMoney(349899).replace(/^R\$/, 'R$ ')

const camisaPremiadaStaticScenarios: Array<{
  activeShirtIndex: CamisaPremiadaShirtIndex | null
  label: string
  selectedShirtIndex: CamisaPremiadaShirtIndex
  stage: CamisaPremiadaBannerStage
  statusLabel: string
  winningShirtIndex: CamisaPremiadaShirtIndex
}> = [
  {
    activeShirtIndex: null,
    label: '1. Introdução',
    selectedShirtIndex: 0,
    stage: 'intro',
    statusLabel: 'Camisa Premiada: será que a sua é premiada?',
    winningShirtIndex: 2,
  },
  {
    activeShirtIndex: 0,
    label: '2. Seleção',
    selectedShirtIndex: 0,
    stage: 'chase',
    statusLabel: 'Sorteando a Camisa Premiada',
    winningShirtIndex: 2,
  },
  {
    activeShirtIndex: 0,
    label: '3. Revelação — derrota',
    selectedShirtIndex: 0,
    stage: 'reveal-hold',
    statusLabel: 'Revelando a camisa vencedora',
    winningShirtIndex: 2,
  },
  {
    activeShirtIndex: null,
    label: '4. Resultado — derrota',
    selectedShirtIndex: 0,
    stage: 'result',
    statusLabel: 'Não foi dessa vez',
    winningShirtIndex: 2,
  },
  {
    activeShirtIndex: 0,
    label: '5. Revelação — vitória',
    selectedShirtIndex: 0,
    stage: 'reveal-hold',
    statusLabel: 'Revelando a camisa vencedora',
    winningShirtIndex: 0,
  },
  {
    activeShirtIndex: null,
    label: '6. Resultado — vitória',
    selectedShirtIndex: 0,
    stage: 'result',
    statusLabel: `Você ganhou ${camisaPremiadaStaticJackpotLabel}`,
    winningShirtIndex: 0,
  },
]

export function CamisaPremiadaStaticPreviewPage() {
  return (
    <main className="camisa-premiada-static">
      <header className="camisa-premiada-static__header">
        <h1>Camisa Premiada — estados estáticos</h1>
        <p>Luz/texto: 16px · Espaço: 4px · Camisa: 56px</p>
      </header>

      <div className="camisa-premiada-static__gallery">
        {camisaPremiadaStaticScenarios.map((scenario) => (
          <article className="camisa-premiada-static__item" key={scenario.label}>
            <h2>{scenario.label}</h2>
            <CamisaPremiadaBannerVisual
              activeShirtIndex={scenario.activeShirtIndex}
              isRevealBackVisible={scenario.stage === 'reveal-hold' || scenario.stage === 'result'}
              isStatic={true}
              jackpotLabel={camisaPremiadaStaticJackpotLabel}
              selectedShirtIndex={scenario.selectedShirtIndex}
              stage={scenario.stage}
              statusLabel={scenario.statusLabel}
              winningShirtIndex={scenario.winningShirtIndex}
            />
          </article>
        ))}
      </div>
    </main>
  )
}

export function BetSuccessPage({ receipt, onNewBet, onShare }: BetSuccessPageProps) {
  const stakeLabel = formatMoney(receipt.stakeCents)
  const hasTurboBoost = receipt.turboBoost !== undefined
  const isPenaltiPremiado = receipt.camisaPremiada?.featureName === 'Pênalti Premiado'
  const hasWonCamisaPremiada = receipt.camisaPremiada !== undefined
    && receipt.camisaPremiada.selectedShirtIndex === receipt.camisaPremiada.winningShirtIndex
  const [isPenaltiPremiadoResultVisible, setIsPenaltiPremiadoResultVisible] = useState(
    isPenaltiPremiado && receipt.camisaPremiada !== undefined
  )
  const [isCamisaPremiadaBannerVisible, setIsCamisaPremiadaBannerVisible] = useState(
    receipt.camisaPremiada !== undefined && !isPenaltiPremiado
  )
  const isPrizeDepositMessageVisible = hasWonCamisaPremiada && (
    isPenaltiPremiado
      ? !isPenaltiPremiadoResultVisible
      : !isCamisaPremiadaBannerVisible
  )
  const selectionGroups = useMemo(() => groupSelectionsByEvent(receipt.selections), [receipt.selections])
  const [pullOffset, setPullOffset] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const pullRef = useRef<BetSuccessPullState | null>(null)
  const dismissTimerRef = useRef<number | null>(null)
  const dragFrameStyle = {
    '--bet-success-pull-offset': `${pullOffset}px`,
  } as CSSProperties

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current === null) return

    window.clearTimeout(dismissTimerRef.current)
    dismissTimerRef.current = null
  }, [])

  const dismissWithPullAnimation = useCallback(() => {
    if (isDismissing) return

    clearDismissTimer()
    pullRef.current = null
    setIsPulling(false)
    setIsDismissing(true)
    setPullOffset(window.innerHeight + 120)
    dismissTimerRef.current = window.setTimeout(() => {
      dismissTimerRef.current = null
      onNewBet()
    }, pullDismissAnimationMs)
  }, [clearDismissTimer, isDismissing, onNewBet])

  const resetPullPosition = useCallback(() => {
    pullRef.current = null
    setIsPulling(false)
    setPullOffset(0)
  }, [])

  const handlePullPointerDown = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (isDismissing) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    pullRef.current = {
      hasMoved: false,
      pointerId: event.pointerId,
      startY: event.clientY,
    }
    setIsPulling(true)
    setPullOffset(0)
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [isDismissing])

  const handlePullPointerMove = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const pullState = pullRef.current

    if (!pullState || pullState.pointerId !== event.pointerId || isDismissing) return

    const offset = getPullPreviewOffset(event.clientY - pullState.startY)
    pullState.hasMoved = pullState.hasMoved || offset > 4
    setPullOffset(offset)

    if (offset > 0) event.preventDefault()
  }, [isDismissing])

  const finishPullGesture = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const pullState = pullRef.current

    if (!pullState || pullState.pointerId !== event.pointerId) return

    const deltaY = event.clientY - pullState.startY
    const shouldDismiss = deltaY >= pullDismissThresholdPx

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (shouldDismiss) {
      dismissWithPullAnimation()
      return
    }

    resetPullPosition()
  }, [dismissWithPullAnimation, resetPullPosition])

  const cancelPullGesture = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const pullState = pullRef.current

    if (pullState && event.currentTarget.hasPointerCapture(pullState.pointerId)) {
      event.currentTarget.releasePointerCapture(pullState.pointerId)
    }

    resetPullPosition()
  }, [resetPullPosition])

  const handleNewBetClick = useCallback(() => {
    dismissWithPullAnimation()
  }, [dismissWithPullAnimation])

  const handleCamisaPremiadaBannerFinished = useCallback(() => {
    setIsCamisaPremiadaBannerVisible(false)
  }, [])

  const handlePenaltiPremiadoResultFinished = useCallback(() => {
    setIsPenaltiPremiadoResultVisible(false)
  }, [])

  useEffect(() => () => {
    clearDismissTimer()
  }, [clearDismissTimer])

  return (
    <main
      className={[
        'bet-success',
        hasTurboBoost ? 'bet-success--boosted' : '',
        isCamisaPremiadaBannerVisible ? 'bet-success--camisa-banner-visible' : '',
        isPenaltiPremiadoResultVisible ? 'bet-success--penalti-result-visible' : '',
        isPrizeDepositMessageVisible ? 'bet-success--camisa-deposit-message-visible' : '',
        isPulling ? 'bet-success--pulling' : '',
        isDismissing ? 'bet-success--dismissing' : '',
      ].filter(Boolean).join(' ')}
      aria-labelledby="bet-success-title"
    >
      <div className="bet-success__backdrop" aria-hidden="true" />
      <div className="bet-success__drag-frame" style={dragFrameStyle}>
        <div className="bet-success__top-light" aria-hidden="true" />
        <div className="bet-success__background-text" aria-hidden="true">
          <img src={backgroundTextPitaco} alt="" draggable="false" />
        </div>
        <button
          type="button"
          className="bet-success__pull-handle"
          aria-label="Puxar para fechar"
          onPointerCancel={cancelPullGesture}
          onPointerDown={handlePullPointerDown}
          onPointerMove={handlePullPointerMove}
          onPointerUp={finishPullGesture}
        >
          <span aria-hidden="true" />
        </button>

        <div className="bet-success__scroll">
          <section className="bet-success__surface" aria-label="Aposta criada">
            <div className="bet-success__ticket">
              <BetSuccessTicketFrame isBoosted={hasTurboBoost} />
              <header className="bet-success__overview">
                <div className="bet-success__overview-copy">
                  <h1 id="bet-success-title">APOSTA CRIADA!</h1>
                  <div className="bet-success__win-row">
                    <strong>{receipt.potentialWinLabel}</strong>
                    <span>Ganho potencial</span>
                  </div>
                  <div className="bet-success__overview-meta">
                    <span>Entrada: <strong>{stakeLabel}</strong></span>
                    {receipt.turboBoost ? (
                      <span
                        className="bet-success__boost-meta"
                        role="group"
                        aria-label={`Booster ${receipt.turboBoost.bonusPercent}%, odd turbinada ${receipt.totalOddsLabel}, odd original ${receipt.turboBoost.originalTotalOddsLabel}`}
                      >
                        <span className="bet-success__boost-badge" aria-hidden="true">
                          Booster {receipt.turboBoost.bonusPercent}%
                        </span>
                        <strong className="bet-success__boosted-odd" aria-hidden="true">
                          {receipt.totalOddsLabel}
                        </strong>
                        <span className="bet-success__original-odd" aria-hidden="true">
                          {receipt.turboBoost.originalTotalOddsLabel}
                        </span>
                      </span>
                    ) : (
                      <span>Odds: <strong>{receipt.totalOddsLabel}</strong></span>
                    )}
                  </div>
                </div>
                <img className="bet-success__success-art" src={ilustraApostaCriada} alt="" draggable="false" />
              </header>

              <div className="bet-success__separator" aria-hidden="true">
                <span />
                <img src={logoPitacoApostaCriada} alt="" draggable="false" />
                <span />
              </div>

              <section className="bet-success__selections" aria-label="Seleções da aposta">
                {selectionGroups.map((group) => (
                  <BetSuccessSelectionGroupRow key={group.eventId} group={group} />
                ))}
              </section>
            </div>
          </section>
        </div>

        <footer className="bet-success__footer">
          {isCamisaPremiadaBannerVisible && receipt.camisaPremiada ? (
            <CamisaPremiadaResultBanner
              receipt={receipt.camisaPremiada}
              onFinished={handleCamisaPremiadaBannerFinished}
            />
          ) : null}
          {isPenaltiPremiadoResultVisible && receipt.camisaPremiada ? (
            <PenaltiPremiadoResultSequence
              receipt={receipt.camisaPremiada}
              onFinished={handlePenaltiPremiadoResultFinished}
            />
          ) : null}
          {isPrizeDepositMessageVisible ? (
            <p className="bet-success__camisa-deposit-message" role="status">
              O valor será depositado dentro de 24horas
            </p>
          ) : null}
          <button
            type="button"
            className="bet-success__button bet-success__button--primary"
            disabled={isDismissing}
            onClick={onShare}
          >
            Compartilhar
          </button>
          <button
            type="button"
            className="bet-success__button bet-success__button--secondary"
            disabled={isDismissing}
            onClick={handleNewBetClick}
          >
            Fazer outra aposta
          </button>
        </footer>
      </div>
    </main>
  )
}
