import { brandStorage } from '../../../shared/brand/storage'
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent, type TouchEvent, type WheelEvent } from 'react'
import { ArrowSquareDownRightIcon, ArrowSquareUpRightIcon, CrownIcon } from '@phosphor-icons/react'
import { createPortal, flushSync } from 'react-dom'
import type { CasinoCarouselGame } from '../../../components/CasinoContent/CasinoContent'
import type { CasinoGameMetadata } from '../../../services/casinoGameMetadata'
import {
  formatCasinoGameMaxWin,
  formatCasinoGamePercent,
  getFallbackCasinoGameMetadata,
  loadCasinoGameMetadata,
} from '../../../services/casinoGameMetadata'
import './CasinoGamePage.css'

interface CasinoGamePageProps {
  isOpen: boolean
  onClose: () => void
  games: CasinoCarouselGame[]
  selectedIndex: number
  sectionTitle: string
}

interface CasinoGameCloseOptions {
  force?: boolean
}

type CasinoGameSwitchDirection = 'next' | 'previous'

interface CasinoGameContentTransition {
  gamesKey: string
  previousIndex: number
  activeIndex: number
  direction: CasinoGameSwitchDirection
}

interface SheetMetrics {
  viewportWidth: number
  viewportHeight: number
  compactWidth: number
  compactHeight: number
  compactTop: number
  railHeight: number
  posterWidth: number
  activePosterWidth: number
}

interface TouchGesture {
  startX: number
  startY: number
  startProgress: number
  lastProgress: number
  pullDistance: number
  isDragging: boolean
  horizontalLocked: boolean
  startedAt: number
  lastX: number
  lastT: number
  canCloseFromPull: boolean
}

interface CasinoGameSwipeState {
  direction: CasinoGameSwitchDirection
  isSnapping: boolean
}

const CASINO_GAME_COMPACT_SIDE_MARGIN = 24
const CASINO_GAME_RAIL_TOP = 0
const CASINO_GAME_RAIL_GAP = 0
const CASINO_GAME_COMPACT_BOTTOM_MARGIN = 24
const CASINO_GAME_POSTER_TRACK_PADDING_X = 24
const CASINO_GAME_POSTER_GAP = 12
const CASINO_GAME_POSTER_ACTIVE_RATIO = 140 / 118
const CASINO_GAME_POSTER_ASPECT_HEIGHT = 202 / 140
const CASINO_GAME_POSTER_VISIBLE_INACTIVE = 1.5
const CASINO_GAME_POSTER_TOP_PADDING = 24
const CASINO_GAME_POSTER_BOTTOM_GAP = 24
const CASINO_GAME_PREFERRED_COMPACT_HEIGHT = 480
const CASINO_GAME_MIN_ACTIVE_POSTER_WIDTH = 112
const CASINO_GAME_TRANSITION_MS = 360
const CASINO_GAME_COLLAPSE_RAIL_REVEAL_MS = 260
const CASINO_GAME_POSTER_SELECTION_ANIMATION_MS = 320
const CASINO_GAME_CONTENT_SWITCH_MS = 380
const CASINO_GAME_EXPANSION_TOUCH_DISTANCE = 180
const CASINO_GAME_EXPANSION_WHEEL_DISTANCE = 260
const CASINO_GAME_EXPANSION_SETTLE_THRESHOLD = 0.5
const CASINO_GAME_WHEEL_SETTLE_DELAY_MS = 140
const CASINO_GAME_PULL_START_THRESHOLD = 6
const CASINO_GAME_PULL_RESISTANCE = 0.56
const CASINO_GAME_MAX_COMPACT_PULL = 132
const CASINO_GAME_CLOSE_PULL_THRESHOLD = 72
const CASINO_GAME_DIRECT_LAUNCH_STORAGE_PREFIX = 'draftaco:casino-game-direct-launch:'
const CASINO_GAME_SWIPE_INTENT_THRESHOLD = 8
const CASINO_GAME_SWIPE_COMMIT_RATIO = 0.25
const CASINO_GAME_SWIPE_COMMIT_VELOCITY = 0.45
const CASINO_GAME_SWIPE_SNAP_MS = 220
const CASINO_GAME_SWIPE_EDGE_RESISTANCE = 0.28
const CASINO_GAME_SWIPE_PAGE_GAP = 24
const CASINO_GAME_CLOSE_GUARD_MS = 900

const clampProgress = (progress: number) => Math.min(1, Math.max(0, progress))

const easeCasinoPosterSelection = (progress: number) => {
  const clampedProgress = clampProgress(progress)

  return clampedProgress < 0.5
    ? 4 * clampedProgress ** 3
    : 1 - ((-2 * clampedProgress + 2) ** 3) / 2
}

const getCompactPullDistance = (distance: number) => (
  Math.min(CASINO_GAME_MAX_COMPACT_PULL, Math.max(0, distance * CASINO_GAME_PULL_RESISTANCE))
)

const getCasinoGameDirectLaunchPreference = (gameId: string | undefined) => {
  if (!gameId || typeof window === 'undefined') return false

  try {
    return brandStorage.getItem(`${CASINO_GAME_DIRECT_LAUNCH_STORAGE_PREFIX}${gameId}`) === 'true'
  } catch {
    return false
  }
}

const setCasinoGameDirectLaunchPreference = (gameId: string, shouldLaunchDirectly: boolean) => {
  if (typeof window === 'undefined') return

  try {
    const storageKey = `${CASINO_GAME_DIRECT_LAUNCH_STORAGE_PREFIX}${gameId}`

    if (shouldLaunchDirectly) {
      brandStorage.setItem(storageKey, 'true')
    } else {
      brandStorage.removeItem(storageKey)
    }
  } catch {
    // Ignore storage failures so the checkbox remains non-blocking.
  }
}

const isCasinoGameTopCloseAreaTarget = (target: EventTarget | null) => (
  typeof Element !== 'undefined'
  && target instanceof Element
  && Boolean(target.closest('.casino-game-page__top-close-area'))
)

function measureSheetMetrics(): SheetMetrics {
  if (typeof window === 'undefined') {
    return {
      viewportWidth: 390,
      viewportHeight: 844,
      compactWidth: 342,
      compactHeight: 550,
      compactTop: 270,
      railHeight: 250,
      posterWidth: 118,
      activePosterWidth: 140,
    }
  }

  const viewportWidth = window.visualViewport?.width ?? window.innerWidth ?? 390
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight ?? 844
  const widthConstrainedInactivePosterWidth = (
    viewportWidth
    - CASINO_GAME_POSTER_TRACK_PADDING_X
    - CASINO_GAME_POSTER_GAP * 2
  ) / (CASINO_GAME_POSTER_ACTIVE_RATIO + CASINO_GAME_POSTER_VISIBLE_INACTIVE)
  const widthConstrainedActivePosterWidth = widthConstrainedInactivePosterWidth * CASINO_GAME_POSTER_ACTIVE_RATIO
  const preferredRailHeight = Math.max(
    0,
    viewportHeight - CASINO_GAME_COMPACT_BOTTOM_MARGIN - CASINO_GAME_PREFERRED_COMPACT_HEIGHT
  )
  const heightConstrainedActivePosterWidth = (
    preferredRailHeight
    - CASINO_GAME_POSTER_TOP_PADDING
    - CASINO_GAME_POSTER_BOTTOM_GAP
  ) / CASINO_GAME_POSTER_ASPECT_HEIGHT
  const activePosterWidth = Math.min(
    widthConstrainedActivePosterWidth,
    Math.max(CASINO_GAME_MIN_ACTIVE_POSTER_WIDTH, heightConstrainedActivePosterWidth)
  )
  const inactivePosterWidth = activePosterWidth / CASINO_GAME_POSTER_ACTIVE_RATIO
  const activePosterHeight = activePosterWidth * CASINO_GAME_POSTER_ASPECT_HEIGHT
  const railHeight = CASINO_GAME_POSTER_TOP_PADDING + activePosterHeight + CASINO_GAME_POSTER_BOTTOM_GAP
  const compactTop = CASINO_GAME_RAIL_TOP + railHeight + CASINO_GAME_RAIL_GAP
  const compactHeight = Math.max(360, viewportHeight - compactTop - CASINO_GAME_COMPACT_BOTTOM_MARGIN)

  return {
    viewportWidth,
    viewportHeight,
    compactWidth: Math.max(1, viewportWidth - CASINO_GAME_COMPACT_SIDE_MARGIN * 2),
    compactHeight,
    compactTop,
    railHeight,
    posterWidth: inactivePosterWidth,
    activePosterWidth,
  }
}

interface CasinoGameContentProps {
  game: CasinoCarouselGame
  isExpanded: boolean
  expansionProgress: number
  onRequestClose: (options?: CasinoGameCloseOptions) => void
  onRequestExpand: () => void
  onRequestCollapse: () => void
  onExpansionProgressChange: (progress: number, options?: { deferSettle?: boolean }) => void
  onExpansionGestureEnd: (progress: number) => void
  onCompactPullChange: (distance: number) => void
  onCompactPullEnd: (distance: number) => void
  onSwipeStart: () => void
  onSwipeMove: (dx: number) => void
  onSwipeEnd: (dx: number, velocity: number) => void
  onBlockNextClose: () => void
}

function CasinoGameContent({
  game,
  isExpanded,
  expansionProgress,
  onRequestClose,
  onRequestExpand,
  onRequestCollapse,
  onExpansionProgressChange,
  onExpansionGestureEnd,
  onCompactPullChange,
  onCompactPullEnd,
  onSwipeStart,
  onSwipeMove,
  onSwipeEnd,
  onBlockNextClose,
}: CasinoGameContentProps) {
  const touchGestureRef = useRef<TouchGesture | null>(null)
  const pointerGestureRef = useRef<TouchGesture | null>(null)
  const handleDragStartYRef = useRef<number | null>(null)
  const suppressTopCloseClickRef = useRef(false)
  const expansionProgressRef = useRef(expansionProgress)
  const settleTimerRef = useRef<number | null>(null)
  const [shouldLaunchDirectly, setShouldLaunchDirectly] = useState(() => (
    getCasinoGameDirectLaunchPreference(game.id)
  ))
  const fallbackGameMetadata = getFallbackCasinoGameMetadata(game)
  const [loadedGameMetadata, setLoadedGameMetadata] = useState<{
    gameId: string
    metadata: CasinoGameMetadata
  } | null>(null)
  const gameMetadata = loadedGameMetadata?.gameId === game.id
    ? loadedGameMetadata.metadata
    : fallbackGameMetadata
  const returnMetrics = [
    { label: '24 horas', value: gameMetadata.last24HoursRtp, kind: 'rtp' },
    { label: '1 hora', value: gameMetadata.lastHourRtp, kind: 'rtp' },
    { label: 'Ganho Max.', value: gameMetadata.maxWin, kind: 'maxWin' },
  ]

  useLayoutEffect(() => {
    expansionProgressRef.current = expansionProgress
  }, [expansionProgress])

  useEffect(() => {
    let isCurrentGame = true

    loadCasinoGameMetadata(game).then((metadata) => {
      if (isCurrentGame) setLoadedGameMetadata({ gameId: game.id, metadata })
    })

    return () => {
      isCurrentGame = false
    }
  }, [game])

  useEffect(() => () => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current)
      settleTimerRef.current = null
    }
  }, [])

  const detailsOpacity = 1 - expansionProgress
  const loadingOpacity = isExpanded ? 1 : 0
  const compactContentStyle = {
    opacity: detailsOpacity,
    pointerEvents: expansionProgress > 0 ? 'none' : 'auto',
  } as CSSProperties

  const settleExpansionProgress = useCallback((progress: number) => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current)
      settleTimerRef.current = null
    }

    const nextProgress = clampProgress(progress)
    onExpansionGestureEnd(nextProgress >= CASINO_GAME_EXPANSION_SETTLE_THRESHOLD ? 1 : 0)
  }, [onExpansionGestureEnd])

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    const verticalDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : 0
    if (verticalDelta === 0) return

    const currentProgress = expansionProgressRef.current
    const shouldExpand = verticalDelta > 0 && currentProgress < 1
    const shouldCollapse = verticalDelta < 0 && currentProgress > 0

    if (!shouldExpand && !shouldCollapse) return
    if (shouldCollapse && currentProgress >= 1 && !isCasinoGameTopCloseAreaTarget(event.target)) return

    event.preventDefault()
    event.stopPropagation()

    onCompactPullChange(0)

    const nextProgress = clampProgress(currentProgress + verticalDelta / CASINO_GAME_EXPANSION_WHEEL_DISTANCE)
    expansionProgressRef.current = nextProgress
    onExpansionProgressChange(nextProgress, { deferSettle: true })

    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current)
    }
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null
      settleExpansionProgress(nextProgress)
    }, CASINO_GAME_WHEEL_SETTLE_DELAY_MS)
  }, [onCompactPullChange, onExpansionProgressChange, settleExpansionProgress])

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) {
      touchGestureRef.current = null
      return
    }

    const touch = event.touches[0]
    if (!touch) return
    const currentProgress = expansionProgressRef.current
    if (currentProgress > 0) onBlockNextClose()
    if (currentProgress >= 1 && !isCasinoGameTopCloseAreaTarget(event.target)) {
      touchGestureRef.current = null
      return
    }
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()

    touchGestureRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startProgress: currentProgress,
      lastProgress: currentProgress,
      pullDistance: 0,
      isDragging: false,
      horizontalLocked: false,
      startedAt: now,
      lastX: touch.clientX,
      lastT: now,
      canCloseFromPull: currentProgress <= 0 && !isExpanded,
    }
  }

  const updateVerticalGesture = (gesture: TouchGesture, dy: number) => {
    const nextProgress = clampProgress(
      gesture.startProgress - dy / CASINO_GAME_EXPANSION_TOUCH_DISTANCE
    )
    const distanceToCompact = gesture.startProgress * CASINO_GAME_EXPANSION_TOUCH_DISTANCE
    const compactPullDistance = dy > distanceToCompact
      ? getCompactPullDistance(dy - distanceToCompact)
      : 0

    gesture.isDragging = true
    gesture.lastProgress = nextProgress
    gesture.pullDistance = nextProgress <= 0 ? compactPullDistance : 0
    expansionProgressRef.current = nextProgress

    onExpansionProgressChange(nextProgress)
    onCompactPullChange(gesture.pullDistance)
  }

  const finishVerticalGesture = (gesture: TouchGesture | null) => {
    if (!gesture) return

    if (gesture.horizontalLocked) {
      const dx = gesture.lastX - gesture.startX
      const dt = Math.max(1, gesture.lastT - gesture.startedAt)
      onSwipeEnd(dx, dx / dt)
      return
    }

    if (!gesture.isDragging) return

    if (gesture.pullDistance > 0) {
      const didPullPastCloseThreshold = gesture.pullDistance >= CASINO_GAME_CLOSE_PULL_THRESHOLD

      if (gesture.canCloseFromPull || didPullPastCloseThreshold) {
        onCompactPullEnd(gesture.pullDistance)
        if (didPullPastCloseThreshold) return
      } else {
        onCompactPullChange(0)
      }
    } else {
      onCompactPullChange(0)
    }

    settleExpansionProgress(gesture.lastProgress)
  }

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const gesture = touchGestureRef.current
    const touch = event.touches[0]
    if (!gesture || !touch) return

    const dx = touch.clientX - gesture.startX
    const dy = touch.clientY - gesture.startY
    const currentProgress = expansionProgressRef.current
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()

    if (gesture.startProgress > 0) onBlockNextClose()

    gesture.lastX = touch.clientX
    gesture.lastT = now

    if (gesture.horizontalLocked) {
      if (event.cancelable) event.preventDefault()
      event.stopPropagation()
      onSwipeMove(dx)
      return
    }

    const hasVerticalIntent = Math.abs(dy) >= CASINO_GAME_PULL_START_THRESHOLD && Math.abs(dy) > Math.abs(dx)
    const hasHorizontalIntent = currentProgress < 1
      && Math.abs(dx) >= CASINO_GAME_SWIPE_INTENT_THRESHOLD
      && Math.abs(dx) > Math.abs(dy)

    if (!gesture.isDragging) {
      if (hasHorizontalIntent) {
        gesture.horizontalLocked = true
        if (event.cancelable) event.preventDefault()
        event.stopPropagation()
        onCompactPullChange(0)
        onSwipeStart()
        onSwipeMove(dx)
        return
      }

      if (!hasVerticalIntent) return
    }

    if (event.cancelable) event.preventDefault()
    event.stopPropagation()

    updateVerticalGesture(gesture, dy)
  }

  const handleTouchEnd = () => {
    const gesture = touchGestureRef.current
    touchGestureRef.current = null
    finishVerticalGesture(gesture)
  }

  const handleContentPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    const currentProgress = expansionProgressRef.current
    if (currentProgress > 0) onBlockNextClose()
    if (currentProgress >= 1 && !isCasinoGameTopCloseAreaTarget(event.target)) return
    if ((event.target as Element | null)?.closest('button, a')) return
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()

    pointerGestureRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startProgress: currentProgress,
      lastProgress: currentProgress,
      pullDistance: 0,
      isDragging: false,
      horizontalLocked: false,
      startedAt: now,
      lastX: event.clientX,
      lastT: now,
      canCloseFromPull: currentProgress <= 0 && !isExpanded,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleContentPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = pointerGestureRef.current
    if (!gesture) return

    const dx = event.clientX - gesture.startX
    const dy = event.clientY - gesture.startY
    const currentProgress = expansionProgressRef.current
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()

    if (gesture.startProgress > 0) onBlockNextClose()

    gesture.lastX = event.clientX
    gesture.lastT = now

    if (gesture.horizontalLocked) {
      event.preventDefault()
      event.stopPropagation()
      onSwipeMove(dx)
      return
    }

    const hasVerticalIntent = Math.abs(dy) >= CASINO_GAME_PULL_START_THRESHOLD && Math.abs(dy) > Math.abs(dx)
    const hasHorizontalIntent = currentProgress < 1
      && Math.abs(dx) >= CASINO_GAME_SWIPE_INTENT_THRESHOLD
      && Math.abs(dx) > Math.abs(dy)

    if (!gesture.isDragging) {
      if (hasHorizontalIntent) {
        gesture.horizontalLocked = true
        event.preventDefault()
        event.stopPropagation()
        onCompactPullChange(0)
        onSwipeStart()
        onSwipeMove(dx)
        return
      }

      if (!hasVerticalIntent) return
    }

    event.preventDefault()
    event.stopPropagation()
    updateVerticalGesture(gesture, dy)
  }

  const handleContentPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = pointerGestureRef.current
    pointerGestureRef.current = null
    if (!gesture) return

    if (gesture.horizontalLocked) {
      event.preventDefault()
      event.stopPropagation()
      finishVerticalGesture(gesture)
      return
    }

    if (!gesture.isDragging) return

    event.preventDefault()
    event.stopPropagation()
    finishVerticalGesture(gesture)
  }

  const handleContentPointerCancel = () => {
    const gesture = pointerGestureRef.current
    pointerGestureRef.current = null
    finishVerticalGesture(gesture)
  }

  const handleCloseHandlePointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    event.stopPropagation()

    const currentProgress = expansionProgressRef.current
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()

    if (currentProgress > 0) onBlockNextClose()

    handleDragStartYRef.current = event.clientY
    pointerGestureRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startProgress: currentProgress,
      lastProgress: currentProgress,
      pullDistance: 0,
      isDragging: false,
      horizontalLocked: false,
      startedAt: now,
      lastX: event.clientX,
      lastT: now,
      canCloseFromPull: currentProgress <= 0 && !isExpanded,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleCloseHandlePointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    const gesture = pointerGestureRef.current
    if (!gesture) return

    const dy = event.clientY - gesture.startY
    if (!gesture.isDragging && Math.abs(dy) < CASINO_GAME_PULL_START_THRESHOLD) return
    suppressTopCloseClickRef.current = true
    if (gesture.startProgress > 0) onBlockNextClose()

    event.preventDefault()
    event.stopPropagation()

    gesture.lastX = event.clientX
    gesture.lastT = typeof performance !== 'undefined' ? performance.now() : Date.now()
    updateVerticalGesture(gesture, dy)
  }

  const handleCloseHandlePointerUp = (event: PointerEvent<HTMLSpanElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const startY = handleDragStartYRef.current
    const gesture = pointerGestureRef.current
    handleDragStartYRef.current = null
    pointerGestureRef.current = null
    const dragDistance = startY === null ? 0 : event.clientY - startY

    if (Math.abs(dragDistance) > 8) {
      suppressTopCloseClickRef.current = true
    }

    if (gesture?.isDragging) {
      finishVerticalGesture(gesture)
      return
    }

    if (Math.abs(dragDistance) <= 8) {
      suppressTopCloseClickRef.current = true

      if (isExpanded) {
        onRequestCollapse()
      } else {
        onRequestClose({ force: true })
      }
      return
    }

    if (dragDistance <= -32) {
      onRequestExpand()
    } else if (dragDistance >= 32) {
      if (isExpanded) onRequestCollapse()
      else onRequestClose({ force: true })
    }
  }

  const handleCloseHandlePointerCancel = () => {
    const gesture = pointerGestureRef.current
    handleDragStartYRef.current = null
    pointerGestureRef.current = null
    finishVerticalGesture(gesture)
  }

  const handleTopCloseAreaClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()

    if (suppressTopCloseClickRef.current) {
      event.preventDefault()
      suppressTopCloseClickRef.current = false
      return
    }

    if (isExpanded || expansionProgressRef.current > 0) {
      onRequestCollapse()
      return
    }

    onRequestClose({ force: true })
  }

  const handleDirectLaunchPreferenceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.currentTarget.checked

    setShouldLaunchDirectly(isChecked)
    setCasinoGameDirectLaunchPreference(game.id, isChecked)
  }

  return (
    <div
      className="casino-game-page__content"
      onClick={(event) => event.stopPropagation()}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onPointerDown={handleContentPointerDown}
      onPointerMove={handleContentPointerMove}
      onPointerUp={handleContentPointerUp}
      onPointerCancel={handleContentPointerCancel}
    >
      <div className="casino-game-page__info-stage">
        <div className="casino-game-page__compact-view">
          <div className="casino-game-page__info-panel header--gradient-v3">
            <div className="header__bg-light" aria-hidden="true" />
            <div className="header__bg-dark" aria-hidden="true" />
            <div className="header__bg-gradient" aria-hidden="true" />
            <button
              type="button"
              className="casino-game-page__top-close-area"
              aria-label={isExpanded ? 'Recolher jogo' : 'Fechar jogo'}
              onClick={handleTopCloseAreaClick}
            >
              <span
                className="casino-game-page__drag-handle"
                onPointerDown={handleCloseHandlePointerDown}
                onPointerMove={handleCloseHandlePointerMove}
                onPointerUp={handleCloseHandlePointerUp}
                onPointerCancel={handleCloseHandlePointerCancel}
              >
                <span />
              </span>
            </button>

            <div
              className="casino-game-page__compact-content"
              aria-hidden={isExpanded}
              style={compactContentStyle}
            >
              <div className="casino-game-page__details">
                <div className="casino-game-page__summary">
                  <h2 className="casino-game-page__title">{game.name}</h2>
                  <div className="casino-game-page__tags" aria-label="Informações do jogo">
                    <span>{gameMetadata.provider}</span>
                    <span>{gameMetadata.categoryLabel}</span>
                  </div>
                  <p className="casino-game-page__description">
                    {gameMetadata.description}
                  </p>
                </div>

                <div className="casino-game-page__metrics">
                  <h3 className="casino-game-page__return-title">Retorno do Jogador</h3>
                  <div className="casino-game-page__return-list">
                    {returnMetrics.map((metric) => {
                      if (metric.value === undefined) return null

                      const isMaxWin = metric.kind === 'maxWin'
                      const isPositiveRtp = isMaxWin || metric.value >= 100
                      const MetricIcon = isMaxWin
                        ? CrownIcon
                        : isPositiveRtp
                          ? ArrowSquareUpRightIcon
                          : ArrowSquareDownRightIcon

                      return (
                        <div className="casino-game-page__return-card" key={metric.label}>
                          <MetricIcon
                            aria-hidden="true"
                            className={[
                              'casino-game-page__return-icon',
                              isMaxWin
                                ? 'casino-game-page__return-icon--max'
                                : isPositiveRtp
                                  ? 'casino-game-page__return-icon--up'
                                  : 'casino-game-page__return-icon--down',
                            ].join(' ')}
                            weight="fill"
                          />
                          <span className="casino-game-page__metric-text">
                            <span>{metric.label}</span>
                            <strong>
                              {metric.kind === 'maxWin'
                                ? formatCasinoGameMaxWin(metric.value)
                                : `${formatCasinoGamePercent(metric.value)}%`}
                            </strong>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <label className="casino-game-page__direct-open">
                <input
                  type="checkbox"
                  checked={shouldLaunchDirectly}
                  onChange={handleDirectLaunchPreferenceChange}
                />
                <span className="casino-game-page__direct-open-check" aria-hidden="true" />
                <span>Abrir direto este jogo nas próximas vezes</span>
              </label>

              <button
                type="button"
                className="casino-game-page__cta"
                onClick={onRequestExpand}
              >
                Jogue Agora
              </button>
            </div>
          </div>
        </div>

        <div
          className="casino-game-page__game-view"
          aria-hidden={!isExpanded}
          style={{ opacity: loadingOpacity }}
        >
          <div className="casino-game-page__loading">
            <span className="casino-game-page__spinner" aria-hidden="true" />
            <span>Carregando jogo</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface CasinoGameRailProps {
  games: CasinoCarouselGame[]
  activeIndex: number
  sectionTitle: string
  onSelectGame: (index: number) => void
}

function CasinoGameRail({
  games,
  activeIndex,
  sectionTitle,
  onSelectGame,
}: CasinoGameRailProps) {
  const railRef = useRef<HTMLDivElement>(null)
  const railItemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const previousActiveIndexRef = useRef(activeIndex)
  const skipNextCenterEffectRef = useRef<number | null>(null)
  const scrollAnimationFrameRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (scrollAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollAnimationFrameRef.current)
      scrollAnimationFrameRef.current = null
    }
  }, [])

  const getCenteredRailItemScrollLeft = useCallback((index: number) => {
    const railEl = railRef.current
    const itemEl = railItemRefs.current[index]
    if (!railEl || !itemEl) return null

    const itemRect = itemEl.getBoundingClientRect()
    const railStyle = window.getComputedStyle(railEl)
    const inactivePosterWidth = parseFloat(railStyle.getPropertyValue('--casino-game-poster-width')) || itemRect.width
    const activePosterWidth = parseFloat(railStyle.getPropertyValue('--casino-game-poster-active-width')) || itemRect.width
    const posterGap = parseFloat(railStyle.getPropertyValue('--casino-game-poster-gap')) || CASINO_GAME_POSTER_GAP
    const trackPaddingX = (
      parseFloat(railStyle.getPropertyValue('--casino-game-poster-track-padding-x'))
      || CASINO_GAME_POSTER_TRACK_PADDING_X
    )
    const finalScrollWidth = (
      trackPaddingX * 2
      + activePosterWidth
      + Math.max(0, games.length - 1) * inactivePosterWidth
      + Math.max(0, games.length - 1) * posterGap
    )
    const maxScrollLeft = Math.max(0, finalScrollWidth - railEl.clientWidth)
    const itemCenter = trackPaddingX + index * (inactivePosterWidth + posterGap) + activePosterWidth / 2
    const targetLeft = itemCenter - railEl.clientWidth / 2
    return Math.min(maxScrollLeft, Math.max(0, targetLeft))
  }, [games.length])

  const animateRailScrollLeft = useCallback((targetScrollLeft: number) => {
    const railEl = railRef.current
    if (!railEl) return

    if (scrollAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollAnimationFrameRef.current)
      scrollAnimationFrameRef.current = null
    }

    const startScrollLeft = railEl.scrollLeft
    const scrollDistance = targetScrollLeft - startScrollLeft

    if (Math.abs(scrollDistance) < 0.5) {
      railEl.scrollLeft = targetScrollLeft
      return
    }

    const startedAt = window.performance.now()

    const tick = (timestamp: number) => {
      const progress = (timestamp - startedAt) / CASINO_GAME_POSTER_SELECTION_ANIMATION_MS
      const easedProgress = easeCasinoPosterSelection(progress)

      railEl.scrollLeft = startScrollLeft + scrollDistance * easedProgress

      if (progress < 1) {
        scrollAnimationFrameRef.current = window.requestAnimationFrame(tick)
        return
      }

      railEl.scrollLeft = targetScrollLeft
      scrollAnimationFrameRef.current = null
    }

    scrollAnimationFrameRef.current = window.requestAnimationFrame(tick)
  }, [])

  const centerRailItem = useCallback((index: number) => {
    const railEl = railRef.current
    const nextScrollLeft = getCenteredRailItemScrollLeft(index)
    if (!railEl || nextScrollLeft === null) return false

    railEl.scrollTo({
      left: nextScrollLeft,
      top: 0,
      behavior: 'auto',
    })

    return true
  }, [getCenteredRailItemScrollLeft])

  useLayoutEffect(() => {
    const previousActiveIndex = previousActiveIndexRef.current

    if (skipNextCenterEffectRef.current === activeIndex) {
      skipNextCenterEffectRef.current = null
      previousActiveIndexRef.current = activeIndex
      return
    }

    if (previousActiveIndex !== activeIndex) {
      const nextScrollLeft = getCenteredRailItemScrollLeft(activeIndex)

      if (nextScrollLeft !== null) {
        animateRailScrollLeft(nextScrollLeft)
      }
    } else {
      centerRailItem(activeIndex)
    }

    previousActiveIndexRef.current = activeIndex
  }, [activeIndex, animateRailScrollLeft, centerRailItem, games.length, getCenteredRailItemScrollLeft])

  const handlePosterClick = (index: number) => {
    if (index === activeIndex) return

    const nextScrollLeft = getCenteredRailItemScrollLeft(index)

    if (nextScrollLeft !== null) {
      animateRailScrollLeft(nextScrollLeft)
      skipNextCenterEffectRef.current = index
    }

    onSelectGame(index)
  }

  return (
    <div className="casino-game-page__poster-rail-shell" onClick={(event) => event.stopPropagation()}>
      <div className="casino-game-page__poster-rail" ref={railRef} aria-label={sectionTitle}>
        <div className="casino-game-page__poster-track">
          {games.map((railGame, index) => {
            const isActive = index === activeIndex

            return (
              <button
                key={railGame.id}
                ref={(element) => { railItemRefs.current[index] = element }}
                type="button"
                className={[
                  'casino-game-page__poster-card',
                  isActive ? 'casino-game-page__poster-card--active' : '',
                ].filter(Boolean).join(' ')}
                aria-label={railGame.name}
                aria-pressed={isActive}
                onClick={() => handlePosterClick(index)}
              >
                <img src={railGame.image} alt="" className="casino-game-page__poster-img" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const MemoCasinoGameContent = memo(CasinoGameContent, (previous, next) => (
  previous.game === next.game
  && previous.isExpanded === next.isExpanded
  && previous.expansionProgress === next.expansionProgress
))

const MemoCasinoGameRail = memo(CasinoGameRail, (previous, next) => (
  previous.games === next.games
  && previous.activeIndex === next.activeIndex
  && previous.sectionTitle === next.sectionTitle
))

export function CasinoGamePage({
  isOpen,
  onClose,
  games,
  selectedIndex,
  sectionTitle,
}: CasinoGamePageProps) {
  const safeSelectedIndex = Math.min(Math.max(selectedIndex, 0), Math.max(games.length - 1, 0))
  const safeSelectedGameId = games[safeSelectedIndex]?.id
  const gamesKey = games.map((game) => game.id).join('|')
  const [activeIndex, setActiveIndex] = useState(safeSelectedIndex)
  const [contentTransition, setContentTransition] = useState<CasinoGameContentTransition | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const [expansionProgress, setExpansionProgress] = useState(0)
  const [isExpansionGestureActive, setIsExpansionGestureActive] = useState(false)
  const [isCollapseSettling, setIsCollapseSettling] = useState(false)
  const [compactPullY, setCompactPullY] = useState(0)
  const [isCompactPulling, setIsCompactPulling] = useState(false)
  const [sheetMetrics, setSheetMetrics] = useState<SheetMetrics>(() => measureSheetMetrics())
  const [swipeState, setSwipeState] = useState<CasinoGameSwipeState | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const switchTimerRef = useRef<number | null>(null)
  const swipeSnapTimerRef = useRef<number | null>(null)
  const collapseSettleTimerRef = useRef<number | null>(null)
  const compactCloseGuardTimerRef = useRef<number | null>(null)
  const compactCloseGuardRef = useRef(false)
  const pageRootRef = useRef<HTMLDivElement | null>(null)
  const swipeRuntimeRef = useRef({
    activeIndex,
    gamesLength: games.length,
    sheetMetrics,
    expansionProgress,
  })
  const activeContentTransition = contentTransition?.gamesKey === gamesKey ? contentTransition : null
  const selectedGame = games[activeIndex]
  const previousTransitionGame = activeContentTransition
    ? games[activeContentTransition.previousIndex]
    : undefined
  const isExpanded = expansionProgress >= 1
  const sheetOffsetY = sheetMetrics.compactTop * (1 - expansionProgress) + compactPullY
  const sheetWidth = sheetMetrics.compactWidth + (sheetMetrics.viewportWidth - sheetMetrics.compactWidth) * expansionProgress
  const sheetHeight = sheetMetrics.compactHeight + (sheetMetrics.viewportHeight - sheetMetrics.compactHeight) * expansionProgress
  const sheetRadius = 28 * (1 - expansionProgress)
  const dragHandleScale = sheetMetrics.viewportWidth > 0 ? sheetWidth / sheetMetrics.viewportWidth : 1

  const rootStyle = {
    ['--casino-game-sheet-width' as string]: `${sheetWidth}px`,
    ['--casino-game-sheet-height' as string]: `${sheetHeight}px`,
    ['--casino-game-sheet-offset-y' as string]: `${sheetOffsetY}px`,
    ['--casino-game-sheet-radius' as string]: `${sheetRadius}px`,
    ['--casino-game-viewport-width' as string]: `${sheetMetrics.viewportWidth}px`,
    ['--casino-game-viewport-height' as string]: `${sheetMetrics.viewportHeight}px`,
    ['--casino-game-compact-width' as string]: `${sheetMetrics.compactWidth}px`,
    ['--casino-game-compact-height' as string]: `${sheetMetrics.compactHeight}px`,
    ['--casino-game-compact-content-y' as string]: `${sheetMetrics.compactTop * expansionProgress}px`,
    ['--casino-game-rail-height' as string]: `${sheetMetrics.railHeight}px`,
    ['--casino-game-poster-width' as string]: `${sheetMetrics.posterWidth}px`,
    ['--casino-game-poster-active-width' as string]: `${sheetMetrics.activePosterWidth}px`,
    ['--casino-game-compact-pull-y' as string]: `${compactPullY}px`,
    ['--casino-game-expansion-progress' as string]: String(expansionProgress),
    ['--casino-game-swipe-page-gap' as string]: `${CASINO_GAME_SWIPE_PAGE_GAP}px`,
    ['--casino-game-drag-handle-scale' as string]: String(dragHandleScale),
  } as CSSProperties

  const pageClasses = [
    'casino-game-page',
    isClosing ? 'casino-game-page--closing' : '',
    isExpanded ? 'casino-game-page--expanded' : '',
    expansionProgress > 0 ? 'casino-game-page--expansion-started' : '',
    isExpansionGestureActive ? 'casino-game-page--gesture-resizing' : '',
    isCollapseSettling ? 'casino-game-page--collapse-settling' : '',
    isCompactPulling ? 'casino-game-page--compact-pulling' : '',
    activeContentTransition ? 'casino-game-page--content-switching' : '',
    swipeState ? 'casino-game-page--swiping' : '',
    swipeState?.isSnapping ? 'casino-game-page--swipe-snapping' : '',
  ].filter(Boolean).join(' ')

  useLayoutEffect(() => {
    swipeRuntimeRef.current = {
      activeIndex,
      gamesLength: games.length,
      sheetMetrics,
      expansionProgress,
    }
  }, [activeIndex, expansionProgress, games.length, sheetMetrics])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (isOpen && !isClosing) {
        if (closeTimerRef.current !== null) {
          window.clearTimeout(closeTimerRef.current)
          closeTimerRef.current = null
        }
        const shouldOpenDirectly = getCasinoGameDirectLaunchPreference(safeSelectedGameId)

        setSheetMetrics(measureSheetMetrics())
        setActiveIndex(safeSelectedIndex)
        setContentTransition(null)
        setExpansionProgress(shouldOpenDirectly ? 1 : 0)
        setIsExpansionGestureActive(false)
        setIsCollapseSettling(false)
        setCompactPullY(0)
        setIsCompactPulling(false)
        setSwipeState(null)
        pageRootRef.current?.style.setProperty('--casino-game-swipe-x', '0px')
        setShouldRender(true)
        setIsClosing(false)
      } else if (shouldRender && !isClosing) {
        setIsClosing(true)
        setContentTransition(null)
        setIsExpansionGestureActive(false)
        setIsCollapseSettling(false)
        setSwipeState(null)
        pageRootRef.current?.style.setProperty('--casino-game-swipe-x', '0px')
        closeTimerRef.current = window.setTimeout(() => {
          setShouldRender(false)
          setIsClosing(false)
          closeTimerRef.current = null
        }, CASINO_GAME_TRANSITION_MS)
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [isOpen, isClosing, safeSelectedGameId, safeSelectedIndex, shouldRender])

  useEffect(() => () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (switchTimerRef.current !== null) {
      window.clearTimeout(switchTimerRef.current)
      switchTimerRef.current = null
    }
    if (swipeSnapTimerRef.current !== null) {
      window.clearTimeout(swipeSnapTimerRef.current)
      swipeSnapTimerRef.current = null
    }
    if (collapseSettleTimerRef.current !== null) {
      window.clearTimeout(collapseSettleTimerRef.current)
      collapseSettleTimerRef.current = null
    }
    if (compactCloseGuardTimerRef.current !== null) {
      window.clearTimeout(compactCloseGuardTimerRef.current)
      compactCloseGuardTimerRef.current = null
    }
  }, [])

  const holdRailUntilCollapseSettles = useCallback(() => {
    setIsCollapseSettling(true)

    if (collapseSettleTimerRef.current !== null) {
      window.clearTimeout(collapseSettleTimerRef.current)
    }

    collapseSettleTimerRef.current = window.setTimeout(() => {
      setIsCollapseSettling(false)
      collapseSettleTimerRef.current = null
    }, CASINO_GAME_COLLAPSE_RAIL_REVEAL_MS)
  }, [])

  const armCompactCloseGuard = useCallback(() => {
    compactCloseGuardRef.current = true

    if (compactCloseGuardTimerRef.current !== null) {
      window.clearTimeout(compactCloseGuardTimerRef.current)
    }

    compactCloseGuardTimerRef.current = window.setTimeout(() => {
      compactCloseGuardRef.current = false
      compactCloseGuardTimerRef.current = null
    }, CASINO_GAME_CLOSE_GUARD_MS)
  }, [])

  const clearCompactCloseGuard = useCallback(() => {
    compactCloseGuardRef.current = false

    if (compactCloseGuardTimerRef.current !== null) {
      window.clearTimeout(compactCloseGuardTimerRef.current)
      compactCloseGuardTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!shouldRender) return

    const scrollY = window.scrollY
    const previousBodyOverflow = document.body.style.overflow
    const previousBodyPosition = document.body.style.position
    const previousBodyTop = document.body.style.top
    const previousBodyWidth = document.body.style.width
    const previousHtmlOverflow = document.documentElement.style.overflow

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
      document.body.style.position = previousBodyPosition
      document.body.style.top = previousBodyTop
      document.body.style.width = previousBodyWidth
      window.scrollTo(0, scrollY)
    }
  }, [shouldRender])

  useEffect(() => {
    if (!shouldRender) return

    const updateSheetMetrics = () => setSheetMetrics(measureSheetMetrics())

    updateSheetMetrics()
    window.addEventListener('resize', updateSheetMetrics)
    window.visualViewport?.addEventListener('resize', updateSheetMetrics)

    return () => {
      window.removeEventListener('resize', updateSheetMetrics)
      window.visualViewport?.removeEventListener('resize', updateSheetMetrics)
    }
  }, [shouldRender])

  const requestClose = useCallback((options: CasinoGameCloseOptions = {}) => {
    if (isClosing) return
    const shouldForceClose = options.force === true

    if (!shouldForceClose && expansionProgress > 0) {
      armCompactCloseGuard()
      holdRailUntilCollapseSettles()
      setContentTransition(null)
      setExpansionProgress(0)
      setIsExpansionGestureActive(false)
      setCompactPullY(0)
      setIsCompactPulling(false)
      setSwipeState(null)
      pageRootRef.current?.style.setProperty('--casino-game-swipe-x', '0px')
      return
    }
    if (!shouldForceClose && compactCloseGuardRef.current) return

    if (shouldForceClose) clearCompactCloseGuard()

    setIsClosing(true)
    setContentTransition(null)
    setIsExpansionGestureActive(false)
    setIsCollapseSettling(false)
    setSwipeState(null)
    pageRootRef.current?.style.setProperty('--casino-game-swipe-x', '0px')

    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
    }

    closeTimerRef.current = window.setTimeout(() => {
      setShouldRender(false)
      setIsClosing(false)
      closeTimerRef.current = null
      onClose()
    }, CASINO_GAME_TRANSITION_MS)
  }, [armCompactCloseGuard, clearCompactCloseGuard, expansionProgress, holdRailUntilCollapseSettles, isClosing, onClose])

  const requestExpand = useCallback(() => {
    if (collapseSettleTimerRef.current !== null) {
      window.clearTimeout(collapseSettleTimerRef.current)
      collapseSettleTimerRef.current = null
    }
    setIsCollapseSettling(false)
    setIsExpansionGestureActive(false)
    setCompactPullY(0)
    setIsCompactPulling(false)
    setSwipeState(null)
    pageRootRef.current?.style.setProperty('--casino-game-swipe-x', '0px')
    setExpansionProgress(1)
  }, [])

  const requestCollapse = useCallback(() => {
    armCompactCloseGuard()
    holdRailUntilCollapseSettles()
    setIsExpansionGestureActive(false)
    setCompactPullY(0)
    setIsCompactPulling(false)
    setSwipeState(null)
    pageRootRef.current?.style.setProperty('--casino-game-swipe-x', '0px')
    setExpansionProgress(0)
  }, [armCompactCloseGuard, holdRailUntilCollapseSettles])

  const handleExpansionProgressChange = useCallback((progress: number) => {
    const nextProgress = clampProgress(progress)

    setIsExpansionGestureActive(true)
    setIsCollapseSettling(false)
    setExpansionProgress(nextProgress)

    if (nextProgress > 0) {
      setCompactPullY(0)
      setIsCompactPulling(false)
    }
  }, [])

  const handleExpansionGestureEnd = useCallback((progress: number) => {
    const nextProgress = clampProgress(progress)
    if (nextProgress <= 0) armCompactCloseGuard()
    setExpansionProgress(nextProgress)
    setIsExpansionGestureActive(false)
    setIsCollapseSettling(false)
    setCompactPullY(0)
    setIsCompactPulling(false)
  }, [armCompactCloseGuard])

  const handleSelectGame = useCallback((index: number) => {
    if (index === activeIndex) return

    if (switchTimerRef.current !== null) {
      window.clearTimeout(switchTimerRef.current)
      switchTimerRef.current = null
    }
    if (swipeSnapTimerRef.current !== null) {
      window.clearTimeout(swipeSnapTimerRef.current)
      swipeSnapTimerRef.current = null
    }
    setSwipeState(null)
    pageRootRef.current?.style.setProperty('--casino-game-swipe-x', '0px')

    const direction: CasinoGameSwitchDirection = index > activeIndex ? 'next' : 'previous'

    setContentTransition((current) => {
      const canContinueTransition = current?.gamesKey === gamesKey

      return {
        gamesKey,
        previousIndex: canContinueTransition ? current.activeIndex : activeIndex,
        activeIndex: index,
        direction,
      }
    })
    setCompactPullY(0)
    setIsCompactPulling(false)
    setActiveIndex(index)

    switchTimerRef.current = window.setTimeout(() => {
      setContentTransition(null)
      switchTimerRef.current = null
    }, CASINO_GAME_CONTENT_SWITCH_MS)
  }, [activeIndex, gamesKey])

  const handleSwipeStart = useCallback(() => {
    if (swipeSnapTimerRef.current !== null) return

    setContentTransition(null)
    pageRootRef.current?.style.setProperty('--casino-game-swipe-x', '0px')
    setSwipeState({ direction: 'next', isSnapping: false })
  }, [])

  const handleSwipeMove = useCallback((dx: number) => {
    if (swipeSnapTimerRef.current !== null) return

    const {
      activeIndex: currentIndex,
      gamesLength,
    } = swipeRuntimeRef.current
    const direction: CasinoGameSwitchDirection = dx < 0 ? 'next' : 'previous'
    const hasNeighbor = direction === 'next'
      ? currentIndex < gamesLength - 1
      : currentIndex > 0
    const adjustedDx = hasNeighbor ? dx : dx * CASINO_GAME_SWIPE_EDGE_RESISTANCE

    pageRootRef.current?.style.setProperty('--casino-game-swipe-x', `${adjustedDx}px`)

    setSwipeState((current) => {
      if (current && current.direction === direction && !current.isSnapping) return current
      return { direction, isSnapping: false }
    })
  }, [])

  const handleSwipeEnd = useCallback((dx: number, velocity: number) => {
    if (swipeSnapTimerRef.current !== null) return

    const {
      activeIndex: currentIndex,
      gamesLength,
      sheetMetrics: currentSheetMetrics,
      expansionProgress: currentExpansionProgress,
    } = swipeRuntimeRef.current
    const direction: CasinoGameSwitchDirection = dx < 0 ? 'next' : 'previous'
    const hasNeighbor = direction === 'next'
      ? currentIndex < gamesLength - 1
      : currentIndex > 0
    const sheetWidth = currentSheetMetrics.compactWidth
      + (currentSheetMetrics.viewportWidth - currentSheetMetrics.compactWidth) * currentExpansionProgress
    const swipePageDistance = sheetWidth + CASINO_GAME_SWIPE_PAGE_GAP
    const passedDistance = Math.abs(dx) >= swipePageDistance * CASINO_GAME_SWIPE_COMMIT_RATIO
    const passedVelocity = Math.abs(velocity) >= CASINO_GAME_SWIPE_COMMIT_VELOCITY
      && Math.abs(dx) >= CASINO_GAME_SWIPE_INTENT_THRESHOLD * 2
    const shouldCommit = hasNeighbor && (passedDistance || passedVelocity)

    if (shouldCommit) {
      const nextIndex = currentIndex + (direction === 'next' ? 1 : -1)
      const targetPx = (direction === 'next' ? -1 : 1) * swipePageDistance

      pageRootRef.current?.style.setProperty('--casino-game-swipe-x', `${targetPx}px`)
      setSwipeState({ direction, isSnapping: true })

      swipeSnapTimerRef.current = window.setTimeout(() => {
        flushSync(() => {
          setActiveIndex(nextIndex)
          setContentTransition(null)
          setSwipeState(null)
          setCompactPullY(0)
          setIsCompactPulling(false)
        })
        pageRootRef.current?.style.setProperty('--casino-game-swipe-x', '0px')
        swipeSnapTimerRef.current = null
      }, CASINO_GAME_SWIPE_SNAP_MS)
      return
    }

    pageRootRef.current?.style.setProperty('--casino-game-swipe-x', '0px')
    setSwipeState({ direction, isSnapping: true })
    swipeSnapTimerRef.current = window.setTimeout(() => {
      setSwipeState(null)
      swipeSnapTimerRef.current = null
    }, CASINO_GAME_SWIPE_SNAP_MS)
  }, [])

  const handleCompactPullChange = useCallback((distance: number) => {
    if (isClosing) return
    if (distance <= 0) {
      setIsCompactPulling(false)
      setCompactPullY(0)
      return
    }

    setIsCompactPulling(true)
    setCompactPullY(distance)
  }, [isClosing])

  const handleCompactPullEnd = useCallback((distance: number) => {
    if (distance >= CASINO_GAME_CLOSE_PULL_THRESHOLD) {
      requestClose({ force: true })
      return
    }

    setIsCompactPulling(false)
    setCompactPullY(0)
  }, [requestClose])

  if (!shouldRender || !selectedGame) return null

  const swipeNeighborIndex = swipeState
    ? (swipeState.direction === 'next'
        ? (activeIndex < games.length - 1 ? activeIndex + 1 : null)
        : (activeIndex > 0 ? activeIndex - 1 : null))
    : null
  const swipeNeighborGame = swipeNeighborIndex !== null ? games[swipeNeighborIndex] : null
  const showSwipeNeighbor = !!swipeState
    && swipeNeighborGame !== null
    && swipeNeighborGame !== undefined
    && !activeContentTransition

  return createPortal(
    <div ref={pageRootRef} className={pageClasses} style={rootStyle} onClick={() => requestClose()}>
      <div className="casino-game-page__overlay" />
      <MemoCasinoGameRail
        games={games}
        activeIndex={activeIndex}
        sectionTitle={sectionTitle}
        onSelectGame={handleSelectGame}
      />
      <div className="casino-game-page__sheet-slide">
        <div className="casino-game-page__sheet-center">
          <div className="casino-game-page__sheet-scale">
            <div className="casino-game-page__content-stage">
              {activeContentTransition && previousTransitionGame && (
                <div
                  key={`${previousTransitionGame.id}-${activeContentTransition.previousIndex}`}
                  className={[
                    'casino-game-page__content-pane',
                    'casino-game-page__content-pane--previous',
                    `casino-game-page__content-pane--exit-${activeContentTransition.direction}`,
                  ].join(' ')}
                >
                  <MemoCasinoGameContent
                    game={previousTransitionGame}
                    isExpanded={isExpanded}
                    expansionProgress={expansionProgress}
                    onRequestClose={requestClose}
                    onRequestExpand={requestExpand}
                    onRequestCollapse={requestCollapse}
                    onExpansionProgressChange={handleExpansionProgressChange}
                    onExpansionGestureEnd={handleExpansionGestureEnd}
                    onCompactPullChange={handleCompactPullChange}
                    onCompactPullEnd={handleCompactPullEnd}
                    onSwipeStart={handleSwipeStart}
                    onSwipeMove={handleSwipeMove}
                    onSwipeEnd={handleSwipeEnd}
                    onBlockNextClose={armCompactCloseGuard}
                  />
                </div>
              )}
              <div
                key={`${selectedGame.id}-${activeIndex}`}
                className={[
                  'casino-game-page__content-pane',
                  'casino-game-page__content-pane--active',
                  activeContentTransition ? `casino-game-page__content-pane--enter-${activeContentTransition.direction}` : '',
                ].filter(Boolean).join(' ')}
              >
                <MemoCasinoGameContent
                  game={selectedGame}
                  isExpanded={isExpanded}
                  expansionProgress={expansionProgress}
                  onRequestClose={requestClose}
                  onRequestExpand={requestExpand}
                  onRequestCollapse={requestCollapse}
                  onExpansionProgressChange={handleExpansionProgressChange}
                  onExpansionGestureEnd={handleExpansionGestureEnd}
                  onCompactPullChange={handleCompactPullChange}
                  onCompactPullEnd={handleCompactPullEnd}
                  onSwipeStart={handleSwipeStart}
                  onSwipeMove={handleSwipeMove}
                  onSwipeEnd={handleSwipeEnd}
                  onBlockNextClose={armCompactCloseGuard}
                />
              </div>
              {showSwipeNeighbor && swipeNeighborGame && swipeState && (
                <div
                  key={`${swipeNeighborGame.id}-${swipeNeighborIndex}`}
                  className={[
                    'casino-game-page__content-pane',
                    'casino-game-page__content-pane--swipe-neighbor',
                    `casino-game-page__content-pane--swipe-neighbor-${swipeState.direction}`,
                  ].join(' ')}
                  aria-hidden
                >
                  <MemoCasinoGameContent
                    game={swipeNeighborGame}
                    isExpanded={isExpanded}
                    expansionProgress={expansionProgress}
                    onRequestClose={requestClose}
                    onRequestExpand={requestExpand}
                    onRequestCollapse={requestCollapse}
                    onExpansionProgressChange={handleExpansionProgressChange}
                    onExpansionGestureEnd={handleExpansionGestureEnd}
                    onCompactPullChange={handleCompactPullChange}
                    onCompactPullEnd={handleCompactPullEnd}
                    onSwipeStart={handleSwipeStart}
                    onSwipeMove={handleSwipeMove}
                    onSwipeEnd={handleSwipeEnd}
                    onBlockNextClose={armCompactCloseGuard}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
