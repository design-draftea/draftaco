import { useCallback, useEffect, useLayoutEffect, useRef, useState, type TransitionEvent } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'
import './Betslip.css'

import apostaGratisIcon from '../../assets/iconSports/aposta-gratis.png'
import {
  formatBetslipCurrency,
  formatBetslipOdd,
  type BetslipSummary,
} from '../../shared/hooks/betslipUtils'
import {
  getBetslipTurboBonusCents,
  getBetslipTurboBonusPercent,
} from '../../shared/hooks/betslipTurboBonus'
import { useAnimatedBetslipNumber } from '../../shared/hooks/useAnimatedBetslipNumber'
import { useFeatureFlags } from '../../shared/hooks/useFeatureFlags'

interface BetslipProps {
  summary?: BetslipSummary
  visible?: boolean
  compactOnly?: boolean
  showFreeBetTag?: boolean
  suppressTurboBoost?: boolean
  turboEligibleSelectionCount?: number
  presentationKey?: string | number
  onOpen?: () => void
}

type CountMotionDirection = 'idle' | 'add' | 'remove'

const formatBetslipTurboBonus = (value: number) => `+${Math.max(0, Math.round(value))}%`
const shouldAnimateTurboBonusChange = (startValue: number, targetValue: number) => (
  startValue > 0 && targetValue > 0
)
const betslipCompactLabels = {
  pitaco: {
    bets: 'Apostas',
    odds: 'Odds',
    stake: 'Entrada',
    payout: 'Para ganhar',
  },
  draftea: {
    bets: 'Bets',
    odds: 'Momio',
    stake: 'Monto',
    payout: 'Gana',
  },
}

export function Betslip({
  summary,
  visible = false,
  compactOnly = false,
  showFreeBetTag = false,
  suppressTurboBoost = false,
  turboEligibleSelectionCount,
  presentationKey = 'default',
  onOpen,
}: BetslipProps) {
  const { brandMode } = useFeatureFlags()
  const compactLabels = betslipCompactLabels[brandMode]
  const shouldShow = visible && !!summary
  const [isRendered, setIsRendered] = useState(shouldShow)
  const [isPresented, setIsPresented] = useState(false)
  const [presentationCycle, setPresentationCycle] = useState(0)
  const [isFreeBetTagRendered, setIsFreeBetTagRendered] = useState(false)
  const [isFreeBetTagPresented, setIsFreeBetTagPresented] = useState(false)
  const [isFreeBetTagExiting, setIsFreeBetTagExiting] = useState(false)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const presentationStateFrameRef = useRef<number | null>(null)
  const enterFrameRef = useRef<number | null>(null)
  const exitTimeoutRef = useRef<number | null>(null)
  const freeBetTagFrameRef = useRef<number | null>(null)
  const freeBetTagExitTimeoutRef = useRef<number | null>(null)
  const previousPresentationKeyRef = useRef(presentationKey)
  const shouldShowRef = useRef(shouldShow)
  const isRenderedRef = useRef(isRendered)
  const isPresentedRef = useRef(isPresented)
  const [lastVisibleSummary, setLastVisibleSummary] = useState<BetslipSummary | undefined>(
    summary?.hasSelections ? summary : undefined
  )
  const [lastVisibleTurboEligibleSelectionCount, setLastVisibleTurboEligibleSelectionCount] = useState(
    turboEligibleSelectionCount ?? summary?.selectionCount ?? 0
  )
  const [selectionMotion, setSelectionMotion] = useState({
    direction: 'idle' as CountMotionDirection,
    motionKey: 0,
    selectedOddsCount: summary?.selectedOddsCount ?? 0,
  })

  useLayoutEffect(() => {
    shouldShowRef.current = shouldShow
    isRenderedRef.current = isRendered
    isPresentedRef.current = isPresented
  }, [isPresented, isRendered, shouldShow])

  useEffect(() => {
    const hasPresentationKeyChanged = previousPresentationKeyRef.current !== presentationKey
    previousPresentationKeyRef.current = presentationKey

    if (presentationStateFrameRef.current !== null) {
      window.cancelAnimationFrame(presentationStateFrameRef.current)
      presentationStateFrameRef.current = null
    }

    if (exitTimeoutRef.current !== null) {
      window.clearTimeout(exitTimeoutRef.current)
      exitTimeoutRef.current = null
    }

    if (shouldShow && summary) {
      const shouldRestartPresentation = (
        hasPresentationKeyChanged
        || !isRenderedRef.current
        || !isPresentedRef.current
      )

      presentationStateFrameRef.current = window.requestAnimationFrame(() => {
        presentationStateFrameRef.current = null
        setLastVisibleSummary(summary)
        setLastVisibleTurboEligibleSelectionCount(turboEligibleSelectionCount ?? summary.selectionCount)

        if (shouldRestartPresentation) {
          if (enterFrameRef.current !== null) {
            window.cancelAnimationFrame(enterFrameRef.current)
            enterFrameRef.current = null
          }

          setIsRendered(true)
          setIsPresented(false)
          setPresentationCycle((current) => current + 1)
        }
      })

      return
    }

    if (enterFrameRef.current !== null) {
      window.cancelAnimationFrame(enterFrameRef.current)
      enterFrameRef.current = null
    }

    if (isRenderedRef.current || isPresentedRef.current) {
      presentationStateFrameRef.current = window.requestAnimationFrame(() => {
        presentationStateFrameRef.current = null
        setIsPresented(false)

        exitTimeoutRef.current = window.setTimeout(() => {
          if (!shouldShowRef.current) {
            setIsRendered(false)
          }

          exitTimeoutRef.current = null
        }, 420)
      })
    }
  }, [presentationKey, shouldShow, summary, turboEligibleSelectionCount])

  useLayoutEffect(() => {
    if (!isRendered || !shouldShow || isPresented) return undefined

    const surface = surfaceRef.current
    if (!surface) return undefined

    if (enterFrameRef.current !== null) {
      window.cancelAnimationFrame(enterFrameRef.current)
      enterFrameRef.current = null
    }

    surface.getBoundingClientRect()
    enterFrameRef.current = window.requestAnimationFrame(() => {
      enterFrameRef.current = null

      if (shouldShowRef.current) {
        setIsPresented(true)
      }
    })

    return () => {
      if (enterFrameRef.current !== null) {
        window.cancelAnimationFrame(enterFrameRef.current)
        enterFrameRef.current = null
      }
    }
  }, [isRendered, isPresented, presentationCycle, shouldShow])

  useEffect(() => {
    return () => {
      if (presentationStateFrameRef.current !== null) {
        window.cancelAnimationFrame(presentationStateFrameRef.current)
      }

      if (enterFrameRef.current !== null) {
        window.cancelAnimationFrame(enterFrameRef.current)
      }

      if (exitTimeoutRef.current !== null) {
        window.clearTimeout(exitTimeoutRef.current)
      }

      if (freeBetTagFrameRef.current !== null) {
        window.cancelAnimationFrame(freeBetTagFrameRef.current)
      }

      if (freeBetTagExitTimeoutRef.current !== null) {
        window.clearTimeout(freeBetTagExitTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const shouldPresentFreeBetTag = showFreeBetTag && shouldShow

    if (freeBetTagFrameRef.current !== null) {
      window.cancelAnimationFrame(freeBetTagFrameRef.current)
      freeBetTagFrameRef.current = null
    }

    if (freeBetTagExitTimeoutRef.current !== null) {
      window.clearTimeout(freeBetTagExitTimeoutRef.current)
      freeBetTagExitTimeoutRef.current = null
    }

    if (shouldPresentFreeBetTag) {
      freeBetTagFrameRef.current = window.requestAnimationFrame(() => {
        setIsFreeBetTagRendered(true)
        setIsFreeBetTagPresented(false)
        setIsFreeBetTagExiting(false)
        freeBetTagFrameRef.current = window.requestAnimationFrame(() => {
          freeBetTagFrameRef.current = null
          setIsFreeBetTagPresented(true)
        })
      })
      return
    }

    freeBetTagFrameRef.current = window.requestAnimationFrame(() => {
      freeBetTagFrameRef.current = null
      setIsFreeBetTagPresented(false)
      setIsFreeBetTagExiting(isFreeBetTagRendered)

      freeBetTagExitTimeoutRef.current = window.setTimeout(() => {
        setIsFreeBetTagRendered(false)
        setIsFreeBetTagExiting(false)
        freeBetTagExitTimeoutRef.current = null
      }, 260)
    })
  }, [isFreeBetTagRendered, shouldShow, showFreeBetTag])

  const handleSurfaceTransitionEnd = useCallback((event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.propertyName !== 'transform') return
    if (shouldShowRef.current) return

    if (exitTimeoutRef.current !== null) {
      window.clearTimeout(exitTimeoutRef.current)
      exitTimeoutRef.current = null
    }

    setIsRendered(false)
  }, [])

  const renderedSummary = shouldShow ? summary : lastVisibleSummary
  const renderedTurboEligibleSelectionCount = shouldShow
    ? turboEligibleSelectionCount ?? summary?.selectionCount ?? 0
    : lastVisibleTurboEligibleSelectionCount
  const visibleSelectedOddsCount = shouldShow ? summary?.selectedOddsCount ?? 0 : 0
  const animatedTotalOddsLabel = useAnimatedBetslipNumber(
    renderedSummary?.totalOdds ?? 0,
    formatBetslipOdd,
    isPresented && !!renderedSummary
  )
  const turboBonusPercent = suppressTurboBoost
    ? null
    : getBetslipTurboBonusPercent(renderedTurboEligibleSelectionCount)
  const turboBonusCents = renderedSummary
    ? getBetslipTurboBonusCents({
        bonusPercent: turboBonusPercent,
        potentialWinCents: Math.round(renderedSummary.potentialWin * 100),
        stakeCents: Math.round(renderedSummary.stake * 100),
      })
    : 0
  const boostedPotentialWin = (renderedSummary?.potentialWin ?? 0) + (turboBonusCents / 100)
  const boostedPotentialWinLabel = formatBetslipCurrency(boostedPotentialWin)
  const boostedTotalOdds = renderedSummary?.stake
    ? boostedPotentialWin / renderedSummary.stake
    : renderedSummary?.totalOdds ?? 0
  const animatedBoostedTotalOddsLabel = useAnimatedBetslipNumber(
    boostedTotalOdds,
    formatBetslipOdd,
    isPresented && !!renderedSummary && !!turboBonusPercent
  )
  const animatedPotentialWinLabel = useAnimatedBetslipNumber(
    boostedPotentialWin,
    formatBetslipCurrency,
    isPresented && !!renderedSummary
  )
  const animatedTurboBonusLabel = useAnimatedBetslipNumber(
    turboBonusPercent ?? 0,
    formatBetslipTurboBonus,
    isPresented && !!renderedSummary && !!turboBonusPercent,
    shouldAnimateTurboBonusChange
  )
  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setSelectionMotion((current) => {
        if (!shouldShow || visibleSelectedOddsCount === 0) {
          if (
            current.selectedOddsCount === 0
            && current.motionKey === 0
            && current.direction === 'idle'
          ) {
            return current
          }

          return {
            direction: 'idle',
            motionKey: 0,
            selectedOddsCount: 0,
          }
        }

        if (current.selectedOddsCount === visibleSelectedOddsCount) return current

        const direction = visibleSelectedOddsCount > current.selectedOddsCount
          ? 'add'
          : 'remove'
        const shouldAnimate = current.selectedOddsCount > 0

        return {
          direction: shouldAnimate ? direction : 'idle',
          motionKey: shouldAnimate ? current.motionKey + 1 : current.motionKey,
          selectedOddsCount: visibleSelectedOddsCount,
        }
      })
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [shouldShow, visibleSelectedOddsCount])

  if (!isRendered || !renderedSummary) return null

  const turboAssistiveLabel = turboBonusPercent
    ? ` Múltipla Turbinada aumenta a odd em ${turboBonusPercent} por cento se a aposta vencer.`
    : ''
  const oddsAssistiveLabel = turboBonusPercent
    ? `Odd turbinada ${formatBetslipOdd(boostedTotalOdds)}. Odd original ${renderedSummary.totalOddsLabel}`
    : `${compactLabels.odds} ${renderedSummary.totalOddsLabel}`

  const presentationClassName = isPresented
    ? 'betslip--visible'
    : shouldShow
      ? 'betslip--pre-enter'
      : 'betslip--hidden'
  const shouldRenderCountBurst = shouldShow
    && selectionMotion.motionKey > 0
    && selectionMotion.direction !== 'idle'
    && selectionMotion.selectedOddsCount === visibleSelectedOddsCount
  const countNumberClassName = [
    'betslip__count-number',
    shouldRenderCountBurst ? `betslip__count-number--${selectionMotion.direction}` : '',
  ]
    .filter(Boolean)
    .join(' ')
  const className = [
    'betslip',
    presentationClassName,
    compactOnly ? 'betslip--compact-only' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      {isFreeBetTagRendered ? (
        <button
          type="button"
          className={[
            'betslip__free-bet-tag',
            isFreeBetTagPresented ? 'betslip__free-bet-tag--visible' : '',
            isFreeBetTagExiting ? 'betslip__free-bet-tag--exiting' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label="Abrir betslip. Aposta grátis disponível"
          onClick={onOpen}
        >
          <span className="betslip__free-bet-icon-wrap" aria-hidden="true">
            <img src={apostaGratisIcon} alt="" className="betslip__free-bet-icon" draggable="false" />
          </span>
          <span className="betslip__free-bet-label">Aposta grátis disponível</span>
        </button>
      ) : null}
      <div className="betslip__surface" ref={surfaceRef} onTransitionEnd={handleSurfaceTransitionEnd}>
        <button
          type="button"
          className="betslip__compact"
          aria-label={`Bilhete com ${renderedSummary.selectionCount} seleções. ${oddsAssistiveLabel}. ${compactLabels.stake} ${renderedSummary.stakeLabel}. ${compactLabels.payout} ${boostedPotentialWinLabel}.${turboAssistiveLabel}`}
          onClick={onOpen}
        >
          <span className="betslip__metrics" aria-hidden="true">
            <span className="betslip__metric betslip__metric--bets">
              <strong className="betslip__value betslip__value--rolling betslip__count-value">
                <span className="betslip__count-anchor">
                  {shouldRenderCountBurst ? (
                    <span
                      key={`orb-${selectionMotion.motionKey}-${selectionMotion.direction}`}
                      className={`betslip__count-orb betslip__count-orb--${selectionMotion.direction}`}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span
                    key={`count-${selectionMotion.motionKey}-${renderedSummary.selectionCount}`}
                    className={countNumberClassName}
                  >
                    {renderedSummary.selectionCount}
                  </span>
                </span>
              </strong>
              <span className="betslip__label">{compactLabels.bets}</span>
            </span>
            <span className="betslip__metric betslip__metric--odds">
              <strong className="betslip__value betslip__value--rolling betslip__odds-value">
                <span>{turboBonusPercent ? animatedBoostedTotalOddsLabel : animatedTotalOddsLabel}</span>
                {turboBonusPercent ? (
                  <span className="betslip__odds-original">{animatedTotalOddsLabel}</span>
                ) : null}
              </strong>
              <span className={`betslip__label${turboBonusPercent ? ' betslip__label--boost' : ''}`}>
                {turboBonusPercent ? `BOOST ${animatedTurboBonusLabel}` : compactLabels.odds}
              </span>
            </span>
            <span className="betslip__metric betslip__metric--stake">
              <strong className="betslip__value betslip__value--rolling">{renderedSummary.stakeLabel}</strong>
              <span className="betslip__label">{compactLabels.stake}</span>
            </span>
          </span>
          <span className="betslip__payout">
            <span className="betslip__payout-button">
              <strong className="betslip__value betslip__value--rolling betslip__value--potential-win" aria-hidden="true">{animatedPotentialWinLabel}</strong>
              <span className="betslip__payout-label">
                <span aria-hidden="true">{compactLabels.payout}</span>
                <CaretRightIcon aria-hidden="true" className="betslip__icon" weight="bold" />
              </span>
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}
