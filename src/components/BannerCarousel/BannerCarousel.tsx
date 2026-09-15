import { useState, useRef, useEffect, useLayoutEffect, useCallback, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, type TouchEvent, type WheelEvent } from 'react'
import { CaretRightIcon, CaretUpIcon } from '@phosphor-icons/react'
import './BannerCarousel.css'
import { Toast } from '../Toast'
import { TeamLogo } from '../TeamLogo'
import { getTeamLogo } from '../../data/teamLogos'
import { 
  BottomSheet, 
  MissionObjective, 
  MissionInfoRow, 
  MissionFaqItem,
  MissionTimer 
} from '../BottomSheet'
import { sportsBanners } from '../../data/homeProducts'
import { getLocalPlayerImage } from '../../data/playerImages'
import {
  BETSLIP_ODD_INTERACTION_EVENT,
  createBetslipSelection,
  getBetslipEventId,
  getBetslipMarketGroupId,
  getMatchOddBetslipKey,
  type BetslipPromoVariant,
  type BetslipSelection,
} from '../../shared/hooks/betslipUtils'
import { requestLocationPermissionGate } from '../../shared/utils/locationPermissionGate'
import { useBetslip } from '../../shared/hooks/useBetslip'
import { useOddSelection } from '../../shared/hooks/useOddSelection'
import { useSportsDbTeamLogo } from '../../shared/hooks/useSportsDbTeamLogo'
import type { Banner, MarketBanner, MarketBannerPlayerProp, MarketBannerTeam } from '../../shared/types/home'
import { updateLiveClock } from '../../shared/utils/liveClock'
import { getTeamAbbreviation } from '../../shared/utils/teamAbbreviations'

import iconSuperCombinada from '../../assets/iconSuperCombinada.png'
import iconAoVivo from '../../assets/iconAoVivo.png'
import iconTenis from '../../assets/iconSports/tennis.png'
import iconSaibaMais from '../../assets/iconSaibaMais.svg'
import iconBoostWhite from '../../assets/iconBoostWhite.svg'
import iconAumentada from '../../assets/iconAumentada.png'
import iconAtivo from '../../assets/iconAtivo.svg'
import iconVs from '../../assets/iconsDraftaco/vs.svg'
import iconEscanteios from '../../assets/iconsDraftaco/escanteios.svg'
import iconRedCard from '../../assets/iconsDraftaco/cartaoVermelho.svg'
import iconYellowCard from '../../assets/iconsDraftaco/cartaoAmarelo.svg'
import iconTotalGols from '../../assets/iconsDraftaco/iconTotalGols.png'
import imgMissaoRodadaGratis from '../../assets/imgMissaoRodadaGratis.png'
import pedroProps from '../../assets/pedroProps.png'

// Mission progress type
interface MissionProgress {
  current: number
  target: number
}

interface BannerCarouselProps {
  banners?: Banner[]
  disableInteractions?: boolean
  marketLayout?: 'expanded' | 'compact'
  onBannerClick?: (banner: Banner) => void
}

const AUTO_PLAY_INTERVAL = 10000 // 10 segundos
const LIVE_PROP_OPTION_MOUSE_SENSITIVITY = 1
const LIVE_PROP_OPTION_TOUCH_SENSITIVITY = 0.92
const LIVE_PROP_OPTION_VERTICAL_INTENT_THRESHOLD = 28
const LIVE_PROP_OPTION_HORIZONTAL_INTENT_THRESHOLD = 28
const LIVE_PROP_OPTION_CLICK_SUPPRESS_THRESHOLD = 28
const LIVE_PROP_OPTION_TAP_REPLAY_THRESHOLD = 28
const LIVE_PROP_OPTION_AXIS_RATIO = 1.15
const LIVE_PROP_OPTION_SWIPE_THRESHOLD = 12
const LIVE_PROP_OPTION_PROGRAMMATIC_MS = 220
const LIVE_PROP_OPTION_WHEEL_LOCK_MS = 220
const LIVE_PROP_OPTION_NATIVE_CLICK_SUPPRESS_MS = 450

interface BannerAutoPlayRefs {
  autoPlayRef: { current: ReturnType<typeof setInterval> | null }
  bannerCountRef: { current: number }
  scrollRef: { current: HTMLDivElement | null }
}

interface BannerMatchTeams {
  homeTeam?: string
  awayTeam?: string
}

interface BannerBetslipEntry {
  groupId: string
  selection: BetslipSelection
}

interface BannerOddSelectionContext {
  marketId?: string
  marketLabel?: string
  selectionLabel?: string
  selectionType?: BetslipSelection['selectionType']
  playerName?: string
  selectionTeamName?: string
  selectionIcon?: string
  promoVariant?: BetslipPromoVariant
}

interface MarketTeamEmblemProps {
  team: MarketBannerTeam
  sport: MarketBanner['sport']
  className: string
}

type BannerHighlightGlowStyle = CSSProperties & {
  '--banner-live-home-glow': string
  '--banner-live-away-glow': string
}

const getMarketTeamLogo = (team: MarketBannerTeam, sport: MarketBanner['sport']) => {
  if (team.image) return team.image
  if (sport === 'tenis') return undefined

  return getTeamLogo(team.imageSourceName ?? team.name)
}

const MarketTeamEmblem = ({ team, sport, className }: MarketTeamEmblemProps) => {
  const imageSourceName = team.imageSourceName ?? team.name
  const fallbackLogo = getMarketTeamLogo(team, sport)
  const logoUrl = useSportsDbTeamLogo(
    imageSourceName,
    team.image,
    sport,
    fallbackLogo,
    { useCurrentLogoFallback: sport === 'tenis' }
  )

  return (
    <span className={`banner-market__emblem ${className}`}>
      {logoUrl && <img src={logoUrl} alt="" />}
    </span>
  )
}

interface FootballLivePropOddsSliderProps {
  playerName: string
  odds: MarketBannerPlayerProp['odds']
  renderOddButton: (
    odd: MarketBannerPlayerProp['odds'][number],
    className: string,
    index: number
  ) => ReactNode
}

const getInitialFootballLivePropOptionIndex = (odds: MarketBannerPlayerProp['odds']) => (
  Math.floor(odds.length / 2)
)

const FootballLivePropOddsSlider = ({
  playerName,
  odds,
  renderOddButton,
}: FootballLivePropOddsSliderProps) => {
  const [activeOptionIndex, setActiveOptionIndex] = useState(() => getInitialFootballLivePropOptionIndex(odds))
  const [isDraggingOptions, setIsDraggingOptions] = useState(false)
  const activeOptionIndexRef = useRef(activeOptionIndex)
  const optionsScrollRef = useRef<HTMLDivElement | null>(null)
  const optionsScrollRafRef = useRef<number | null>(null)
  const lockedParentRef = useRef<HTMLElement | null>(null)
  const optionDrag = useRef<{
    startX: number
    startY: number
    scrollLeft: number
    startIndex: number
    moved: boolean
    direction: 'pending' | 'horizontal' | 'vertical'
    lastY: number
    pointerId?: number
    sensitivity: number
    tapTarget: HTMLButtonElement | null
  } | null>(null)
  const suppressOptionClick = useRef(false)
  const suppressOptionClickTimeout = useRef<number | null>(null)
  const fallbackTapRef = useRef<{
    startX: number
    startY: number
    tapTarget: HTMLButtonElement | null
  } | null>(null)
  const wheelLock = useRef(0)
  const programmaticOptionTarget = useRef<number | null>(null)
  const programmaticOptionTimeout = useRef<number | null>(null)

  const clearProgrammaticOptionTarget = useCallback(() => {
    if (programmaticOptionTimeout.current) {
      window.clearTimeout(programmaticOptionTimeout.current)
      programmaticOptionTimeout.current = null
    }

    programmaticOptionTarget.current = null
  }, [])

  const scrollOptionIntoCenter = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const containerEl = optionsScrollRef.current
    const optionEl = containerEl?.querySelectorAll<HTMLElement>('.banner-live-highlight__prop-odd-item').item(index)
    if (!containerEl || !optionEl) return

    const optionCenter = optionEl.offsetLeft + optionEl.offsetWidth / 2
    const targetScroll = Math.max(0, optionCenter - containerEl.clientWidth / 2)

    if (behavior === 'auto') {
      containerEl.scrollLeft = targetScroll
      return
    }

    containerEl.scrollTo({ left: targetScroll, behavior })
  }, [])

  const getCenteredOptionIndex = useCallback(() => {
    const containerEl = optionsScrollRef.current
    const optionEls = Array.from(containerEl?.querySelectorAll<HTMLElement>('.banner-live-highlight__prop-odd-item') ?? [])
    if (!containerEl || optionEls.length === 0) return -1

    const containerCenter = containerEl.scrollLeft + containerEl.clientWidth / 2
    let nearestIndex = 0
    let nearestDistance = Number.POSITIVE_INFINITY

    optionEls.forEach((optionEl, index) => {
      const optionCenter = optionEl.offsetLeft + optionEl.offsetWidth / 2
      const distance = Math.abs(optionCenter - containerCenter)

      if (distance < nearestDistance) {
        nearestIndex = index
        nearestDistance = distance
      }
    })

    return nearestIndex
  }, [])

  const clampOptionScroll = useCallback(() => {
    const containerEl = optionsScrollRef.current
    if (!containerEl) return

    const maxScroll = Math.max(0, containerEl.scrollWidth - containerEl.clientWidth)
    const nextScroll = Math.min(maxScroll, Math.max(0, containerEl.scrollLeft))

    if (Math.abs(containerEl.scrollLeft - nextScroll) > 0.5) {
      containerEl.scrollLeft = nextScroll
    }
  }, [])

  const setActiveOption = useCallback((index: number) => {
    if (activeOptionIndexRef.current === index) return

    activeOptionIndexRef.current = index
    setActiveOptionIndex(index)
  }, [])

  const centerOption = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const lastIndex = odds.length - 1
    const targetIndex = Math.max(0, Math.min(lastIndex, index))

    clearProgrammaticOptionTarget()
    programmaticOptionTarget.current = targetIndex
    setActiveOption(targetIndex)
    window.requestAnimationFrame(() => scrollOptionIntoCenter(targetIndex, behavior))

    if (behavior === 'auto') {
      programmaticOptionTarget.current = null
      return
    }

    programmaticOptionTimeout.current = window.setTimeout(() => {
      programmaticOptionTarget.current = null
      programmaticOptionTimeout.current = null
    }, LIVE_PROP_OPTION_PROGRAMMATIC_MS)
  }, [clearProgrammaticOptionTarget, odds.length, scrollOptionIntoCenter, setActiveOption])

  const stepOption = useCallback((direction: number) => {
    const currentIndex = activeOptionIndexRef.current ?? Math.max(0, getCenteredOptionIndex())
    const nextIndex = Math.min(odds.length - 1, Math.max(0, currentIndex + direction))

    if (currentIndex !== nextIndex) {
      centerOption(nextIndex)
    }
  }, [centerOption, getCenteredOptionIndex, odds.length])

  const updateCenteredOption = useCallback(() => {
    clampOptionScroll()

    if (programmaticOptionTarget.current !== null) return

    const centeredIndex = getCenteredOptionIndex()
    if (centeredIndex < 0) return
    setActiveOption(centeredIndex)
  }, [clampOptionScroll, getCenteredOptionIndex, setActiveOption])

  const handleOptionScroll = useCallback(() => {
    if (optionsScrollRafRef.current !== null) return

    optionsScrollRafRef.current = window.requestAnimationFrame(() => {
      optionsScrollRafRef.current = null
      updateCenteredOption()
    })
  }, [updateCenteredOption])

  const snapToNearestOption = useCallback((dragDelta = 0, startIndex?: number) => {
    const containerEl = optionsScrollRef.current
    if (!containerEl) return

    const nearestIndex = getCenteredOptionIndex()
    const lastIndex = odds.length - 1
    const initialIndex = startIndex ?? activeOptionIndexRef.current ?? nearestIndex
    let targetIndex = nearestIndex

    if (Math.abs(dragDelta) > LIVE_PROP_OPTION_SWIPE_THRESHOLD && nearestIndex === initialIndex) {
      targetIndex = initialIndex + (dragDelta > 0 ? 1 : -1)
    }

    centerOption(Math.max(0, Math.min(lastIndex, targetIndex)))
  }, [centerOption, getCenteredOptionIndex, odds.length])

  const getVerticalScrollContainer = (element: HTMLElement | null) => {
    let currentElement = element?.parentElement ?? null

    while (currentElement && currentElement !== document.body) {
      const style = window.getComputedStyle(currentElement)
      const canScrollY = /(auto|scroll)/.test(style.overflowY)

      if (canScrollY && currentElement.scrollHeight > currentElement.clientHeight) {
        return currentElement
      }

      currentElement = currentElement.parentElement
    }

    return (document.scrollingElement ?? document.documentElement) as HTMLElement
  }

  const getHorizontalScrollAncestor = (element: HTMLElement | null) => {
    let currentElement = element?.parentElement ?? null

    while (currentElement && currentElement !== document.body) {
      const style = window.getComputedStyle(currentElement)
      const canScrollX = /(auto|scroll)/.test(style.overflowX)

      if (canScrollX && currentElement.scrollWidth > currentElement.clientWidth) {
        return currentElement
      }

      currentElement = currentElement.parentElement
    }

    return null
  }

  const setParentScrollLocked = (locked: boolean) => {
    if (locked) {
      if (lockedParentRef.current) return

      const parent = getHorizontalScrollAncestor(optionsScrollRef.current)
      if (parent) {
        lockedParentRef.current = parent
        parent.style.overflowX = 'hidden'
      }

      return
    }

    if (lockedParentRef.current) {
      lockedParentRef.current.style.overflowX = ''
      lockedParentRef.current = null
    }
  }

  const setDraggingClass = (active: boolean) => {
    const containerEl = optionsScrollRef.current
    containerEl?.classList.toggle('banner-live-highlight__prop-odds-scroll--dragging', active)
    setIsDraggingOptions(active)
    setParentScrollLocked(active)
  }

  const clearDraggingClass = () => {
    optionsScrollRef.current?.classList.remove('banner-live-highlight__prop-odds-scroll--dragging')
    setIsDraggingOptions(false)
  }

  const applyVerticalPointerScroll = (event: PointerEvent<HTMLDivElement>) => {
    const drag = optionDrag.current
    const containerEl = optionsScrollRef.current
    if (!drag || !containerEl) return

    const verticalScrollEl = getVerticalScrollContainer(containerEl)
    verticalScrollEl.scrollTop += drag.lastY - event.clientY
    drag.lastY = event.clientY
  }

  const getOptionTapTarget = (target: EventTarget | null, x: number, y: number) => {
    const targetElement = target instanceof Element ? target : document.elementFromPoint(x, y)
    const directTarget = targetElement?.closest<HTMLButtonElement>('.banner-live-highlight__odd-btn--prop') ?? null

    return directTarget ?? document
      .elementFromPoint(x, y)
      ?.closest<HTMLButtonElement>('.banner-live-highlight__odd-btn--prop') ?? null
  }

  const isManualTapDistance = (deltaX: number, deltaY: number) => {
    const pointerDistance = Math.hypot(deltaX, deltaY)

    return pointerDistance <= LIVE_PROP_OPTION_TAP_REPLAY_THRESHOLD
  }

  const clearOptionClickSuppression = () => {
    if (suppressOptionClickTimeout.current !== null) {
      window.clearTimeout(suppressOptionClickTimeout.current)
      suppressOptionClickTimeout.current = null
    }

    suppressOptionClick.current = false
  }

  const suppressNextNativeOptionClick = () => {
    clearOptionClickSuppression()
    suppressOptionClick.current = true
    suppressOptionClickTimeout.current = window.setTimeout(() => {
      suppressOptionClick.current = false
      suppressOptionClickTimeout.current = null
    }, LIVE_PROP_OPTION_NATIVE_CLICK_SUPPRESS_MS)
  }

  const replayOptionTap = (tapTarget: HTMLButtonElement) => {
    suppressNextNativeOptionClick()
    tapTarget.click()
  }

  const supportsPointerEvents = () => (
    typeof window !== 'undefined' && 'PointerEvent' in window
  )

  const startFallbackTap = (target: EventTarget | null, x: number, y: number) => {
    if (supportsPointerEvents()) {
      fallbackTapRef.current = null
      return
    }

    if (optionDrag.current) {
      fallbackTapRef.current = null
      return
    }

    fallbackTapRef.current = {
      startX: x,
      startY: y,
      tapTarget: getOptionTapTarget(target, x, y),
    }
  }

  const finishFallbackTap = (
    event: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>,
    x: number,
    y: number
  ) => {
    event.stopPropagation()

    if (supportsPointerEvents()) {
      fallbackTapRef.current = null
      return
    }

    const fallbackTap = fallbackTapRef.current
    fallbackTapRef.current = null

    const tapTarget = fallbackTap?.tapTarget
    if (!fallbackTap || !tapTarget || tapTarget.disabled || !tapTarget.isConnected) return

    if (!isManualTapDistance(x - fallbackTap.startX, y - fallbackTap.startY)) return

    if (event.cancelable) event.preventDefault()
    replayOptionTap(tapTarget)
  }

  const handleOptionMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (event.button !== 0) return
    startFallbackTap(event.target, event.clientX, event.clientY)
  }

  const handleOptionMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const handleOptionMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    finishFallbackTap(event, event.clientX, event.clientY)
  }

  const handleOptionMouseLeave = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    fallbackTapRef.current = null
  }

  const handleOptionTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    event.stopPropagation()
    const touch = event.touches[0]
    if (!touch) return
    startFallbackTap(event.target, touch.clientX, touch.clientY)
  }

  const handleOptionTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const handleOptionTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0]
    if (!touch) {
      event.stopPropagation()
      fallbackTapRef.current = null
      return
    }

    finishFallbackTap(event, touch.clientX, touch.clientY)
  }

  const handleOptionTouchCancel = (event: TouchEvent<HTMLDivElement>) => {
    event.stopPropagation()
    fallbackTapRef.current = null
  }

  const captureOptionPointer = (containerEl: HTMLDivElement, pointerId: number) => {
    if (containerEl.hasPointerCapture?.(pointerId)) return
    containerEl.setPointerCapture?.(pointerId)
  }

  const handleOptionPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    const containerEl = optionsScrollRef.current
    if (!containerEl) return

    event.stopPropagation()
    clearProgrammaticOptionTarget()
    fallbackTapRef.current = null
    setDraggingClass(false)
    setParentScrollLocked(true)
    captureOptionPointer(containerEl, event.pointerId)

    optionDrag.current = {
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: containerEl.scrollLeft,
      startIndex: activeOptionIndexRef.current ?? getCenteredOptionIndex(),
      moved: false,
      direction: event.pointerType === 'mouse' ? 'horizontal' : 'pending',
      lastY: event.clientY,
      pointerId: event.pointerId,
      sensitivity: event.pointerType === 'touch'
        ? LIVE_PROP_OPTION_TOUCH_SENSITIVITY
        : LIVE_PROP_OPTION_MOUSE_SENSITIVITY,
      tapTarget: getOptionTapTarget(event.target, event.clientX, event.clientY),
    }

    if (event.pointerType === 'mouse') setDraggingClass(true)
  }

  const handleOptionPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = optionDrag.current
    const containerEl = optionsScrollRef.current
    if (!drag || !containerEl) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    event.stopPropagation()

    if (drag.direction === 'pending') {
      if (absY >= LIVE_PROP_OPTION_VERTICAL_INTENT_THRESHOLD && absY > absX * LIVE_PROP_OPTION_AXIS_RATIO) {
        drag.direction = 'vertical'
        clearDraggingClass()
        if (event.cancelable) event.preventDefault()
        applyVerticalPointerScroll(event)
        return
      }

      if (absX < LIVE_PROP_OPTION_HORIZONTAL_INTENT_THRESHOLD || absX <= absY * LIVE_PROP_OPTION_AXIS_RATIO) {
        return
      }

      drag.direction = 'horizontal'
      setDraggingClass(true)
    }

    if (event.cancelable) event.preventDefault()

    if (drag.direction === 'vertical') {
      applyVerticalPointerScroll(event)
      return
    }

    if (drag.direction !== 'horizontal') return

    const walk = deltaX * drag.sensitivity
    drag.moved = drag.moved || absX > LIVE_PROP_OPTION_CLICK_SUPPRESS_THRESHOLD
    containerEl.scrollLeft = drag.scrollLeft - walk
    clampOptionScroll()
  }

  const clearOptionDrag = () => {
    const drag = optionDrag.current
    const containerEl = optionsScrollRef.current

    if (containerEl && drag?.pointerId !== undefined && containerEl.hasPointerCapture?.(drag.pointerId)) {
      containerEl.releasePointerCapture(drag.pointerId)
    }

    optionDrag.current = null
    setDraggingClass(false)
  }

  const replayPendingOptionTap = (event: PointerEvent<HTMLDivElement>) => {
    const drag = optionDrag.current
    const tapTarget = drag?.tapTarget
    if (!drag || drag.direction === 'horizontal' || !tapTarget || tapTarget.disabled || !tapTarget.isConnected) return false

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!isManualTapDistance(deltaX, deltaY)) return false

    if (event.cancelable) event.preventDefault()
    clearOptionDrag()
    replayOptionTap(tapTarget)

    return true
  }

  const finishOptionDrag = () => {
    const drag = optionDrag.current
    const containerEl = optionsScrollRef.current
    if (!drag) return

    if (drag.direction !== 'horizontal') {
      clearOptionDrag()
      return
    }

    const dragDelta = containerEl ? containerEl.scrollLeft - drag.scrollLeft : 0

    if (containerEl && drag.pointerId !== undefined && containerEl.hasPointerCapture?.(drag.pointerId)) {
      containerEl.releasePointerCapture(drag.pointerId)
    }

    optionDrag.current = null
    setDraggingClass(false)

    if (drag.moved) {
      suppressNextNativeOptionClick()
    }

    if (containerEl) snapToNearestOption(dragDelta, drag.startIndex)
  }

  const handleOptionPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (replayPendingOptionTap(event)) return

    if (optionDrag.current?.direction === 'vertical') {
      suppressNextNativeOptionClick()
      clearOptionDrag()
      return
    }

    if (optionDrag.current?.direction === 'horizontal') {
      finishOptionDrag()
      return
    }

    clearOptionDrag()
  }

  const handleOptionPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    clearOptionDrag()
  }

  const handleOptionLostPointerCapture = () => {
    if (optionDrag.current?.direction === 'horizontal') finishOptionDrag()
  }

  const handleOptionWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.stopPropagation()
    const movement = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (Math.abs(movement) < 12) return

    event.preventDefault()

    const now = event.timeStamp
    if (now - wheelLock.current < LIVE_PROP_OPTION_WHEEL_LOCK_MS) return
    wheelLock.current = now

    stepOption(movement > 0 ? 1 : -1)
  }

  useEffect(() => {
    activeOptionIndexRef.current = activeOptionIndex
  }, [activeOptionIndex])

  useLayoutEffect(() => {
    const initialIndex = getInitialFootballLivePropOptionIndex(odds)
    activeOptionIndexRef.current = initialIndex

    const frame = window.requestAnimationFrame(() => {
      setActiveOptionIndex(initialIndex)
      scrollOptionIntoCenter(initialIndex, 'auto')
    })

    return () => window.cancelAnimationFrame(frame)
  }, [odds, scrollOptionIntoCenter])

  useEffect(() => () => {
    if (programmaticOptionTimeout.current) {
      window.clearTimeout(programmaticOptionTimeout.current)
    }

    if (optionsScrollRafRef.current !== null) {
      window.cancelAnimationFrame(optionsScrollRafRef.current)
    }

    if (suppressOptionClickTimeout.current !== null) {
      window.clearTimeout(suppressOptionClickTimeout.current)
      suppressOptionClickTimeout.current = null
    }
    suppressOptionClick.current = false

    if (lockedParentRef.current) {
      lockedParentRef.current.style.overflowX = ''
      lockedParentRef.current = null
    }
  }, [])

  return (
    <div className="banner-live-highlight__prop-odds" aria-label={`Odds de ${playerName}`} onWheel={handleOptionWheel}>
      <div
        ref={optionsScrollRef}
        className={`banner-live-highlight__prop-odds-scroll${isDraggingOptions ? ' banner-live-highlight__prop-odds-scroll--dragging' : ''}`}
        onScroll={handleOptionScroll}
        onPointerDown={handleOptionPointerDown}
        onPointerMove={handleOptionPointerMove}
        onPointerUp={handleOptionPointerUp}
        onPointerCancel={handleOptionPointerCancel}
        onLostPointerCapture={handleOptionLostPointerCapture}
        onMouseDown={handleOptionMouseDown}
        onMouseMove={handleOptionMouseMove}
        onMouseUp={handleOptionMouseUp}
        onMouseLeave={handleOptionMouseLeave}
        onTouchStart={handleOptionTouchStart}
        onTouchMove={handleOptionTouchMove}
        onTouchEnd={handleOptionTouchEnd}
        onTouchCancel={handleOptionTouchCancel}
      >
        {odds.map((odd, index) => {
          const isActive = index === activeOptionIndex
          const className = [
            'banner-live-highlight__odd-btn',
            'banner-live-highlight__odd-btn--prop',
            isActive ? 'banner-live-highlight__odd-btn--prop-active' : 'banner-live-highlight__odd-btn--prop-muted',
          ].join(' ')

          return (
            <span
              className="banner-live-highlight__prop-odd-item"
              key={`${odd.outcomeId}:${index}`}
              onClickCapture={(event) => {
                if (suppressOptionClick.current && event.nativeEvent.isTrusted) {
                  clearOptionClickSuppression()
                  event.preventDefault()
                  event.stopPropagation()
                  return
                }

                centerOption(index)
              }}
            >
              {renderOddButton(odd, className, index)}
            </span>
          )
        })}
      </div>
    </div>
  )
}

const isBannerBetslipEntry = (entry: BannerBetslipEntry | undefined): entry is BannerBetslipEntry => !!entry
const hasMarketBanner = (banner: Banner): banner is Banner & { marketBanner: NonNullable<Banner['marketBanner']> } => (
  banner.type === 'market' && !!banner.marketBanner
)

const getInitialMarketLiveTimes = (banners: Banner[]) => banners.reduce<Record<number, string>>((times, banner) => {
  if (hasMarketBanner(banner) && banner.marketBanner.live) {
    times[banner.id] = banner.marketBanner.liveClock ?? banner.marketBanner.footerLabel
  }

  return times
}, {})

const getMarketBulletDistanceClass = (index: number, activeIndex: number) => {
  const distance = Math.abs(index - activeIndex)

  if (distance === 0) return 'banner-carousel__bullet--active'
  if (distance === 1) return 'banner-carousel__bullet--near'

  return 'banner-carousel__bullet--far'
}

const resultMarketGroupIds = new Set(['regular', 'live', 'tennis-live', 'resultado-final', '1x2'])
const marketStatIcons = {
  corner: iconEscanteios,
  'red-card': iconRedCard,
  'yellow-card': iconYellowCard,
  goal: iconTotalGols,
} satisfies Record<string, string>

const getReactNodeText = (node: ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(getReactNodeText).join('')

  return ''
}

const getBannerMatchTeamsFromLabel = (label?: string): BannerMatchTeams | null => {
  if (!label) return null

  const parts = label.split(/\s+(?:vs|x)\s+/i).map((part) => part.trim()).filter(Boolean)
  if (parts.length !== 2) return null

  return {
    homeTeam: parts[0],
    awayTeam: parts[1],
  }
}

const getBannerMatchTeams = (banner: Banner): BannerMatchTeams => {
  if (hasMarketBanner(banner)) {
    return {
      homeTeam: banner.marketBanner.teams[0].name,
      awayTeam: banner.marketBanner.teams[1].name,
    }
  }

  if (banner.tennisMatch) {
    return {
      homeTeam: banner.tennisMatch.player1.name,
      awayTeam: banner.tennisMatch.player2.name,
    }
  }

  if (banner.liveMatch) {
    return {
      homeTeam: banner.liveMatch.homeTeam.name,
      awayTeam: banner.liveMatch.awayTeam.name,
    }
  }

  const headerTeams = getBannerMatchTeamsFromLabel(banner.headerRight)
  if (headerTeams) return headerTeams

  const regularTeams = banner.odds?.filter((odd) => odd.team !== 'Empate').map((odd) => odd.team) ?? []

  return {
    homeTeam: regularTeams[0] ?? banner.headerLeft,
    awayTeam: regularTeams[regularTeams.length - 1] ?? banner.headerRight,
  }
}

const getBannerSport = (banner: Banner) => {
  if (hasMarketBanner(banner)) return banner.marketBanner.sport
  if (banner.tennisMatch) return 'tenis'
  if (banner.liveMatch) return 'basquete'

  return 'futebol'
}

const getBannerEventName = (banner: Banner, { homeTeam, awayTeam }: BannerMatchTeams) => {
  if (homeTeam && awayTeam) return `${homeTeam} x ${awayTeam}`

  return banner.headerRight
}

const getBannerHomeTeamIcon = (banner: Banner) => {
  if (hasMarketBanner(banner)) return getMarketTeamLogo(banner.marketBanner.teams[0], banner.marketBanner.sport)

  return (
    banner.tennisMatch?.player1.flag
      ?? banner.liveMatch?.homeTeam.badge
      ?? banner.odds?.find((odd) => odd.team !== 'Empate')?.badge
  )
}

const getBannerAwayTeamIcon = (banner: Banner) => {
  if (hasMarketBanner(banner)) return getMarketTeamLogo(banner.marketBanner.teams[1], banner.marketBanner.sport)
  if (banner.tennisMatch?.player2.flag) return banner.tennisMatch.player2.flag
  if (banner.liveMatch?.awayTeam.badge) return banner.liveMatch.awayTeam.badge

  const regularTeamsWithBadges = banner.odds?.filter((odd) => odd.team !== 'Empate' && odd.badge) ?? []
  return regularTeamsWithBadges[regularTeamsWithBadges.length - 1]?.badge
}

const getBannerOutcomeIcon = (banner: Banner, outcomeId: string, label: ReactNode) => {
  const labelText = getReactNodeText(label)

  if (hasMarketBanner(banner)) {
    if (outcomeId === 'home' || outcomeId === 'player-1') return getMarketTeamLogo(banner.marketBanner.teams[0], banner.marketBanner.sport)
    if (outcomeId === 'away' || outcomeId === 'player-2') return getMarketTeamLogo(banner.marketBanner.teams[1], banner.marketBanner.sport)
  }

  if (banner.tennisMatch) {
    if (outcomeId === 'player-1' || labelText === banner.tennisMatch.player1.name) {
      return banner.tennisMatch.player1.flag
    }

    if (outcomeId === 'player-2' || labelText === banner.tennisMatch.player2.name) {
      return banner.tennisMatch.player2.flag
    }
  }

  if (banner.liveMatch) {
    if (outcomeId === 'home' || labelText === banner.liveMatch.homeTeam.name) {
      return banner.liveMatch.homeTeam.badge
    }

    if (outcomeId === 'away' || labelText === banner.liveMatch.awayTeam.name) {
      return banner.liveMatch.awayTeam.badge
    }
  }

  return banner.odds?.find((odd) => odd.team === labelText)?.badge
}

const getBannerLiveTimeLabel = (
  banner: Banner,
  liveMatchTime: string,
  marketLiveTimes: Record<number, string> = {}
) => {
  if (hasMarketBanner(banner)) {
    if (!banner.marketBanner.live) return banner.marketBanner.footerLabel

    return marketLiveTimes[banner.id] ?? banner.marketBanner.liveClock ?? banner.marketBanner.footerLabel
  }

  if (banner.type === 'aoVivo') return liveMatchTime
  if (banner.type === 'aoVivoTenis') return banner.tennisMatch?.currentSet ?? 'Ao vivo'

  return banner.headerLeft
}

const getBannerMarketInfo = (banner: Banner, groupId: string) => {
  if (resultMarketGroupIds.has(groupId) || banner.type === '1x2') {
    return {
      marketId: 'resultado-final',
      marketLabel: 'Resultado Final',
    }
  }

  if (groupId.endsWith('total-escanteios')) {
    return {
      marketId: groupId,
      marketLabel: 'Total de Escanteios',
    }
  }

  if (groupId.endsWith('total-gols')) {
    return {
      marketId: groupId,
      marketLabel: 'Total de Gols',
    }
  }

  if (groupId.endsWith('total-pontos')) {
    return {
      marketId: groupId,
      marketLabel: 'Total de Pontos',
    }
  }

  if (groupId === 'finalizacoes-ao-gol') {
    return {
      marketId: groupId,
      marketLabel: 'Finalizações ao Gol',
    }
  }

  return {
    marketId: groupId,
    marketLabel: groupId,
  }
}

const getBannerAumentadaDetails = (banner: Banner) => {
  if (banner.type !== 'aumentada') return null

  const [playerName, rawStatValue, rawMarketLabel] = banner.description
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (!playerName || !rawStatValue || !rawMarketLabel) return null

  const overValueMatch = rawStatValue.match(/^mais\s+de\s+(\d+(?:[,.]\d+)?)$/i)
  const statValue = overValueMatch ? `${overValueMatch[1].replace(',', '.')}+` : rawStatValue
  const marketLabel = rawMarketLabel.replace(/\bao gol\b/i, 'ao Gol')

  return {
    playerName,
    statValue,
    marketLabel,
    label: `${playerName} ${statValue}`,
  }
}

const getBannerTeamCode = (teamName?: string) => (
  teamName ? getTeamAbbreviation(teamName) : undefined
)

const getBannerShortLiveTime = (timeLabel: string) => timeLabel.replace(/^\d+T\s+/, '')

const getBannerLeagueShortLabel = (league: string) => league.split(/\s+/)[0] ?? league

const getFootballLivePropTeam = (marketBanner: MarketBanner, teamName: string) => (
  marketBanner.teams.find((team) => (
    team.name === teamName || team.imageSourceName === teamName
  )) ?? marketBanner.teams[0]
)

const getBannerHighlightGlowStyle = (
  homeTeam: MarketBannerTeam,
  awayTeam: MarketBannerTeam
): BannerHighlightGlowStyle => ({
  '--banner-live-home-glow': homeTeam.glowColor ?? '37 68 134',
  '--banner-live-away-glow': awayTeam.glowColor ?? '98 134 99',
})

const expandBannerComboStatValue = (
  value: string,
  { homeTeam, awayTeam }: BannerMatchTeams
) => {
  const prefixMatch = value.match(/^([a-z]{2,4})(.*)$/i)
  if (!prefixMatch) return value

  const [, rawPrefix, suffix = ''] = prefixMatch
  const prefix = rawPrefix.toUpperCase()
  const homeCode = getBannerTeamCode(homeTeam)
  const awayCode = getBannerTeamCode(awayTeam)

  if (homeTeam && prefix === homeCode) return `${homeTeam}${suffix}`
  if (awayTeam && prefix === awayCode) return `${awayTeam}${suffix}`

  return value
}

function startBannerAutoPlay({ autoPlayRef, bannerCountRef, scrollRef }: BannerAutoPlayRefs) {
  if (autoPlayRef.current) {
    clearInterval(autoPlayRef.current)
  }

  autoPlayRef.current = setInterval(() => {
    const bannerCount = bannerCountRef.current
    if (!scrollRef.current || bannerCount <= 0) return

    const cardWidth = scrollRef.current.offsetWidth - 24 + 20
    const currentScroll = scrollRef.current.scrollLeft
    const currentIndex = Math.round(currentScroll / cardWidth)
    const nextIndex = (currentIndex + 1) % bannerCount

    scrollRef.current.scrollTo({
      left: nextIndex * cardWidth,
      behavior: 'smooth',
    })
  }, AUTO_PLAY_INTERVAL)
}

// Helper function to parse match time string
function parseMatchTime(timeStr: string): { period: number; minutes: number; seconds: number; isQuarter: boolean } {
  // Check for quarter format (basketball) - Q2 07:12
  const quarterMatch = timeStr.match(/Q(\d) (\d+):(\d+)/)
  if (quarterMatch) {
    return {
      period: parseInt(quarterMatch[1]),
      minutes: parseInt(quarterMatch[2]),
      seconds: parseInt(quarterMatch[3]),
      isQuarter: true,
    }
  }
  // Check for half format (football) - 2T 22:12
  const halfMatch = timeStr.match(/(\d)T (\d+):(\d+)/)
  if (halfMatch) {
    return {
      period: parseInt(halfMatch[1]),
      minutes: parseInt(halfMatch[2]),
      seconds: parseInt(halfMatch[3]),
      isQuarter: false,
    }
  }
  return { period: 1, minutes: 0, seconds: 0, isQuarter: false }
}

// Helper function to format time back to string
function formatMatchTime(period: number, minutes: number, seconds: number, isQuarter: boolean): string {
  const mins = minutes.toString().padStart(2, '0')
  const secs = seconds.toString().padStart(2, '0')
  // Basketball: Q1 07:12, Football: 1T 22:12
  return isQuarter ? `Q${period} ${mins}:${secs}` : `${period}T ${mins}:${secs}`
}

// Helper function to update time by 1 second (basketball: countdown, football: count up)
function updateMatchTime(timeStr: string): string {
  if (timeStr === 'Intervalo' || timeStr === 'INT') {
    return timeStr
  }

  const { period, minutes, seconds, isQuarter } = parseMatchTime(timeStr)

  if (isQuarter) {
    // Basketball: countdown (regressive)
    let newSeconds = seconds - 1
    let newMinutes = minutes

    if (newSeconds < 0) {
      newSeconds = 59
      newMinutes -= 1
    }

    // If time reaches 0:00, change to Intervalo
    if (newMinutes <= 0 && newSeconds <= 0) {
      return 'Intervalo'
    }

    return formatMatchTime(period, newMinutes, newSeconds, isQuarter)
  } else {
    // Football: count up (progressive)
    let newSeconds = seconds + 1
    let newMinutes = minutes

    if (newSeconds >= 60) {
      newSeconds = 0
      newMinutes += 1
    }

    return formatMatchTime(period, newMinutes, newSeconds, isQuarter)
  }
}

const getBannerBetslipEventId = (banner: Banner) => {
  if (hasMarketBanner(banner)) {
    return getBetslipEventId({
      sport: banner.marketBanner.sport,
      homeTeam: banner.marketBanner.teams[0].name,
      awayTeam: banner.marketBanner.teams[1].name,
      fallbackId: `banner-${banner.id}`,
    })
  }

  if (banner.tennisMatch) {
    return getBetslipEventId({
      sport: 'tenis',
      homeTeam: banner.tennisMatch.player1.name,
      awayTeam: banner.tennisMatch.player2.name,
      fallbackId: `banner-${banner.id}`,
    })
  }

  if (banner.liveMatch) {
    return getBetslipEventId({
      sport: 'basquete',
      homeTeam: banner.liveMatch.homeTeam.name,
      awayTeam: banner.liveMatch.awayTeam.name,
      fallbackId: `banner-${banner.id}`,
    })
  }

  const { homeTeam, awayTeam } = getBannerMatchTeams(banner)

  return getBetslipEventId({
    sport: 'futebol',
    homeTeam,
    awayTeam,
    fallbackId: `banner-${banner.id}`,
  })
}

export function BannerCarousel({
  banners = sportsBanners,
  disableInteractions = false,
  marketLayout = 'expanded',
  onBannerClick,
}: BannerCarouselProps = {}) {
  const isMarketBannerSet = banners.length > 0 && banners.every(hasMarketBanner)
  const isFootballLiveHighlightSet = marketLayout === 'expanded' && banners.length > 0 && banners.every((banner) => (
    hasMarketBanner(banner) && (
      banner.marketBanner.variant === 'football-live'
      || banner.marketBanner.variant === 'football-pre'
      || banner.marketBanner.variant === 'basketball-live'
      || banner.marketBanner.variant === 'basketball-pre'
    )
  ))
  const [activeIndex, setActiveIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [activatedMissions, setActivatedMissions] = useState<Record<number, MissionProgress>>({})
  const [showToast, setShowToast] = useState(false)
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null)
  const [liveMatchTime, setLiveMatchTime] = useState("Q2 05:00")
  const [marketLiveTimes, setMarketLiveTimes] = useState<Record<number, string>>(() => getInitialMarketLiveTimes(banners))
  const getOddButtonProps = useOddSelection('banner-card__odd-btn')
  const { selectedSelectionIdsByGroup, toggleSelections } = useBetslip()
  const scrollRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const scrollLeft = useRef(0)
  const dragDistance = useRef(0)
  const touchStartScrollLeft = useRef(0)
  const bannerCountRef = useRef(banners.length)
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleActivateMission = (bannerId: number, target: number) => {
    if (activatedMissions[bannerId]) return // Already activated
    
    setActivatedMissions(prev => ({
      ...prev,
      [bannerId]: { current: 0, target }
    }))
    setShowToast(true)
  }

  const isMissionActivated = (bannerId: number) => {
    return bannerId in activatedMissions
  }

  const getMissionProgress = (bannerId: number) => {
    return activatedMissions[bannerId]
  }

  const handleOpenMissionInfo = (banner: Banner) => {
    setSelectedBanner(banner)
    setIsBottomSheetOpen(true)
  }

  const closeBottomSheet = () => {
    setIsBottomSheetOpen(false)
    setTimeout(() => {
      setSelectedBanner(null)
    }, 350)
  }

  const handleActivateMissionFromBS = () => {
    if (selectedBanner) {
      const bannerId = selectedBanner.id
      const isAlreadyActivated = isMissionActivated(bannerId)
      
      setIsBottomSheetOpen(false)
      
      if (isAlreadyActivated) {
        setTimeout(() => {
          setSelectedBanner(null)
        }, 350)
        return
      }
      
      // Atualiza o estado imediatamente para o banner mudar
      setActivatedMissions(prev => ({
        ...prev,
        [bannerId]: { current: 0, target: 100 }
      }))
      setShowToast(true)
      
      setTimeout(() => {
        setSelectedBanner(null)
      }, 350)
    }
  }

  // Auto-play: inicia quando o componente monta
  useEffect(() => {
    bannerCountRef.current = banners.length
    startBannerAutoPlay({ autoPlayRef, bannerCountRef, scrollRef })

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current)
      }
    }
  }, [banners.length])

  // Atualiza o tempo do jogo ao vivo a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveMatchTime(prev => updateMatchTime(prev))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setMarketLiveTimes(getInitialMarketLiveTimes(banners))
  }, [banners])

  useEffect(() => {
    if (!banners.some((banner) => hasMarketBanner(banner) && banner.marketBanner.live)) return

    const interval = setInterval(() => {
      setMarketLiveTimes((prevTimes) => {
        const nextTimes = { ...prevTimes }

        banners.forEach((banner) => {
          if (!hasMarketBanner(banner) || !banner.marketBanner.live) return

          const currentTime = prevTimes[banner.id] ?? banner.marketBanner.liveClock ?? banner.marketBanner.footerLabel
          nextTimes[banner.id] = updateLiveClock(currentTime)
        })

        return nextTimes
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [banners])

  // Pausa o auto-play durante o drag
  const pauseAutoPlay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current)
      autoPlayRef.current = null
    }
  }

  // Reinicia o auto-play após interação manual - reseta completamente o timer
  const resetAutoPlay = () => {
    // Primeiro limpa qualquer intervalo existente
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current)
      autoPlayRef.current = null
    }
    // Inicia um novo ciclo de autoplay
    startBannerAutoPlay({ autoPlayRef, bannerCountRef, scrollRef })
  }

  const handleScroll = () => {
    if (scrollRef.current) {
      const currentScrollLeft = scrollRef.current.scrollLeft
      const cardWidth = scrollRef.current.offsetWidth - 24 + 20
      const newIndex = Math.round(currentScrollLeft / cardWidth)
      setActiveIndex(Math.min(newIndex, banners.length - 1))
    }
  }

  // Centraliza no banner mais próximo com sensibilidade ao arraste
  const snapToNearestBanner = (dragDelta: number = 0) => {
    if (!scrollRef.current) return
    const cardWidth = scrollRef.current.offsetWidth - 24 + 20
    const currentScroll = scrollRef.current.scrollLeft
    const currentIndex = currentScroll / cardWidth
    
    let targetIndex: number
    // Se arrastou mais que 30px, muda para o próximo/anterior
    if (dragDelta > 30) {
      targetIndex = Math.ceil(currentIndex)
    } else if (dragDelta < -30) {
      targetIndex = Math.floor(currentIndex)
    } else {
      targetIndex = Math.round(currentIndex)
    }
    
    // Limita ao range válido
    const maxIndex = Math.max(0, Math.ceil((scrollRef.current.scrollWidth - scrollRef.current.clientWidth) / cardWidth))
    targetIndex = Math.max(0, Math.min(targetIndex, maxIndex))
    
    const targetScroll = targetIndex * cardWidth
    
    scrollRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    })
  }

  // Drag to scroll para mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    setIsDragging(true)
    pauseAutoPlay()
    dragDistance.current = 0
    startX.current = e.pageX - scrollRef.current.offsetLeft
    scrollLeft.current = scrollRef.current.scrollLeft
  }

  const handleMouseUp = () => {
    if (!isDragging) return
    const delta = dragDistance.current
    setIsDragging(false)
    snapToNearestBanner(delta)
    resetAutoPlay()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX.current) * 1.5
    if (Math.abs(walk) > 4) e.preventDefault()
    dragDistance.current = -walk // Negativo porque walk é invertido
    scrollRef.current.scrollLeft = scrollLeft.current - walk
  }

  const handleMouseLeave = () => {
    if (isDragging) {
      const delta = dragDistance.current
      setIsDragging(false)
      snapToNearestBanner(delta)
      resetAutoPlay()
    }
  }

  // Touch events para mobile
  const handleTouchStart = () => {
    pauseAutoPlay()
    dragDistance.current = 0
    touchStartScrollLeft.current = scrollRef.current?.scrollLeft ?? 0
  }

  const handleTouchEnd = () => {
    dragDistance.current = (scrollRef.current?.scrollLeft ?? 0) - touchStartScrollLeft.current
    // Aguarda o scroll terminar antes de reiniciar o autoplay
    setTimeout(() => {
    resetAutoPlay()
    }, 300)
  }

  const handleBannerClick = (banner: Banner) => {
    if (disableInteractions) return
    if ((!banner.casinoGameId && !banner.eventLink) || Math.abs(dragDistance.current) > 8) return

    onBannerClick?.(banner)
  }

  const handleBannerKeyDown = (event: KeyboardEvent<HTMLDivElement>, banner: Banner) => {
    if (disableInteractions) return
    if (event.target !== event.currentTarget) return
    if ((!banner.casinoGameId && !banner.eventLink) || !onBannerClick) return
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    onBannerClick(banner)
  }

  const getDisabledButtonProps = (className: string) => ({
    type: 'button' as const,
    className,
    disabled: true,
    'aria-disabled': true,
  })

  const getBannerOddButtonProps = (
    banner: Banner,
    groupId: string,
    outcomeId: string,
    className: string,
    label: ReactNode,
    value: ReactNode,
    selectionContext: BannerOddSelectionContext = {}
  ) => {
    if (disableInteractions) return getDisabledButtonProps(className)

    const matchTeams = getBannerMatchTeams(banner)
    const { homeTeam, awayTeam } = matchTeams
    const isLive = banner.type === 'aoVivo'
      || banner.type === 'aoVivoTenis'
      || (hasMarketBanner(banner) && Boolean(banner.marketBanner.live))
    const marketInfo = getBannerMarketInfo(banner, groupId)
    const aumentadaDetails = groupId === 'boosted' ? getBannerAumentadaDetails(banner) : null
    const marketId = selectionContext.marketId ?? aumentadaDetails?.marketLabel ?? marketInfo.marketId
    const marketLabel = selectionContext.marketLabel ?? aumentadaDetails?.marketLabel ?? marketInfo.marketLabel
    const labelText = getReactNodeText(label)
    const playerName = selectionContext.playerName ?? aumentadaDetails?.playerName
    const selectionLabel = selectionContext.selectionLabel ?? playerName ?? labelText
    const sport = getBannerSport(banner)
    const eventTimeLabel = getBannerLiveTimeLabel(banner, liveMatchTime, marketLiveTimes)
    const selectionType = selectionContext.selectionType
      ?? (aumentadaDetails
        ? 'player'
        : selectionLabel === homeTeam || selectionLabel === awayTeam ? 'team' : 'market')
    const matchOddKey = selectionType === 'player'
      ? null
      : getMatchOddBetslipKey({
        sport,
        homeTeam,
        awayTeam,
        marketId,
        outcomeId,
        label,
      })
    const eventId = matchOddKey?.eventId ?? getBannerBetslipEventId(banner)
    const betslipMarketId = matchOddKey?.marketId ?? marketId
    const betslipOutcomeId = matchOddKey?.outcomeId ?? outcomeId
    const betslipGroupId = matchOddKey?.groupId ?? `banner:${banner.id}:${marketId}`

    return getOddButtonProps(
      `${betslipGroupId}:${betslipOutcomeId}`,
      betslipGroupId,
      className,
      createBetslipSelection({
        eventId,
        marketId: betslipMarketId,
        outcomeId: betslipOutcomeId,
        label: aumentadaDetails?.label ?? label,
        selectionLabel,
        odd: value,
        marketLabel,
        eventStatus: isLive ? 'live' : 'prematch',
        selectionType,
        sport,
        homeTeam,
        awayTeam,
        eventName: getBannerEventName(banner, matchTeams),
        eventTimeLabel,
        liveClock: isLive ? eventTimeLabel : undefined,
        homeScore: banner.tennisMatch?.player1.games ?? banner.liveMatch?.homeTeam.score ?? banner.marketBanner?.teams[0].score,
        awayScore: banner.tennisMatch?.player2.games ?? banner.liveMatch?.awayTeam.score ?? banner.marketBanner?.teams[1].score,
        homeTeamIcon: getBannerHomeTeamIcon(banner),
        awayTeamIcon: getBannerAwayTeamIcon(banner),
        selectionIcon: selectionContext.selectionIcon ?? (aumentadaDetails ? undefined : getBannerOutcomeIcon(banner, outcomeId, label)),
        playerName,
        selectionTeamName: selectionContext.selectionTeamName,
        playerImage: playerName === 'Pedro' ? pedroProps : undefined,
        badgeType: 'boost',
        promoVariant: selectionContext.promoVariant ?? (banner.type === 'aumentada' ? 'aumentada' : undefined),
      })
    )
  }

  const getBannerComboBetslipEntries = (banner: Banner): BannerBetslipEntry[] => {
    if (banner.type !== 'combinada' || !banner.comboStats?.length || !banner.oddBoosted) return []

    const oddBoosted = banner.oddBoosted
    const matchTeams = getBannerMatchTeams(banner)
    const { homeTeam, awayTeam } = matchTeams
    const eventId = getBannerBetslipEventId(banner)
    const comboId = `banner-${banner.id}-combo`
    const comboLegCount = banner.comboStats.length
    const comboProps = {
      comboId,
      comboTitle: banner.title,
      comboTypeLabel: banner.title,
      comboTotalOddLabel: oddBoosted.new,
      comboLegCount,
    }

    return banner.comboStats.map((stat, index) => {
      const selectionLabel = expandBannerComboStatValue(stat.value, matchTeams)
      const marketId = `${stat.label}-${selectionLabel}-${index}`
      const selection = createBetslipSelection({
        eventId,
        marketId,
        outcomeId: `combo-${index}-${selectionLabel}`,
        label: selectionLabel,
        selectionLabel,
        odd: oddBoosted.new,
        marketLabel: stat.label,
        eventStatus: 'prematch',
        selectionType: selectionLabel === homeTeam || selectionLabel === awayTeam ? 'team' : 'market',
        sport: getBannerSport(banner),
        homeTeam,
        awayTeam,
        eventName: getBannerEventName(banner, matchTeams),
        eventTimeLabel: banner.headerLeft,
        homeTeamIcon: getBannerHomeTeamIcon(banner),
        awayTeamIcon: getBannerAwayTeamIcon(banner),
        badgeType: 'boost',
        comboLegIndex: index,
        ...comboProps,
      })

      return selection ? {
        groupId: getBetslipMarketGroupId({ eventId: selection.eventId, marketId: selection.marketId }),
        selection,
      } : undefined
    }).filter(isBannerBetslipEntry)
  }

  const getBannerComboOddButtonProps = (banner: Banner) => {
    if (disableInteractions) return getDisabledButtonProps('banner-card__combinada-btn')

    const comboEntries = getBannerComboBetslipEntries(banner)
    const selectedSelectionIds = new Set(Object.values(selectedSelectionIdsByGroup))
    const isSelected = comboEntries.length > 0 && comboEntries.every(({ selection }) => selectedSelectionIds.has(selection.id))

    return {
      type: 'button' as const,
      className: `banner-card__combinada-btn${isSelected ? ' odd-button--selected' : ''}`,
      'aria-pressed': isSelected,
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()

        if (requestLocationPermissionGate()) return

        window.dispatchEvent(new CustomEvent(BETSLIP_ODD_INTERACTION_EVENT))
        toggleSelections(comboEntries)
      },
    }
  }
  const renderBannerOddButton = (
    banner: Banner,
    groupId: string,
    outcomeId: string,
    className: string,
    labelClassName: string,
    valueClassName: string,
    label: ReactNode,
    value: ReactNode
  ) => (
    <button key={`banner:${banner.id}:${groupId}:${outcomeId}`} {...getBannerOddButtonProps(banner, groupId, outcomeId, className, label, value)}>
      <span className={labelClassName}>{label}</span>
      <span className={valueClassName}>{value}</span>
    </button>
  )

  const renderMarketMatchup = (banner: Banner & { marketBanner: NonNullable<Banner['marketBanner']> }) => {
    const { marketBanner } = banner
    const isPreMatch = marketBanner.variant === 'football-pre' || marketBanner.variant === 'basketball-pre'

    return (
      <div className={`banner-market__matchup${isPreMatch ? ' banner-market__matchup--pre' : ' banner-market__matchup--live'}`}>
        <MarketTeamEmblem team={marketBanner.teams[0]} sport={marketBanner.sport} className="banner-market__emblem--home" />
        <span className="banner-market__versus" aria-hidden="true">
          <span className="banner-market__versus-line banner-market__versus-line--left" />
          <img src={iconVs} alt="" className="banner-market__versus-icon" />
          <span className="banner-market__versus-line banner-market__versus-line--right" />
        </span>
        <MarketTeamEmblem team={marketBanner.teams[1]} sport={marketBanner.sport} className="banner-market__emblem--away" />
      </div>
    )
  }

  const renderMarketTeams = (banner: Banner & { marketBanner: NonNullable<Banner['marketBanner']> }) => {
    const { marketBanner } = banner

    if (marketBanner.variant === 'tennis-live') {
      return (
        <div className="banner-market__tennis-teams">
          {marketBanner.teams.map((team, teamIndex) => (
            <div
              key={`${banner.id}:team:${teamIndex}`}
              className={`banner-market__tennis-row${teamIndex === 1 ? ' banner-market__tennis-row--muted' : ''}`}
            >
              <span className="banner-market__team-name">{team.name}</span>
              <span className="banner-market__serve-slot">
                {team.isServing && <img src={iconTenis} alt="" className="banner-market__serve-icon" />}
              </span>
              <span className="banner-market__sets">
                {team.sets?.map((set, setIndex) => (
                  <span key={`${banner.id}:team:${teamIndex}:set:${setIndex}`}>{set}</span>
                ))}
              </span>
              <span className="banner-market__current-score">{team.currentScore}</span>
            </div>
          ))}
        </div>
      )
    }

    if (marketBanner.variant === 'football-pre' || marketBanner.variant === 'basketball-pre') {
      return (
        <div className="banner-market__pre-teams">
          {marketBanner.teams.map((team, teamIndex) => (
            <span key={`${banner.id}:team:${teamIndex}`} className="banner-market__team-name">{team.name}</span>
          ))}
        </div>
      )
    }

    return (
      <div className="banner-market__scoreboard">
        {marketBanner.teams.map((team, teamIndex) => (
          <div key={`${banner.id}:team:${teamIndex}`} className="banner-market__score-row">
            <span className="banner-market__team-name">{team.name}</span>
            <span className="banner-market__score">{team.score}</span>
          </div>
        ))}
      </div>
    )
  }

  const renderFootballLiveStat = (
    stat: NonNullable<MarketBannerTeam['stats']>[number],
    teamIndex: number,
    statIndex: number
  ) => (
    <span className="banner-live-highlight__team-stat" key={`${teamIndex}:stat:${statIndex}`}>
      <img src={marketStatIcons[stat.icon]} alt="" />
      <span>{stat.value}</span>
    </span>
  )

  const renderFootballLiveTeamSummary = (
    team: MarketBannerTeam,
    teamIndex: number,
    options: { showStats?: boolean } = {}
  ) => (
    <div
      className="banner-live-highlight__team-summary"
      key={`${team.name}:${teamIndex}`}
    >
      <span className="banner-live-highlight__team-name">{team.name}</span>
      {options.showStats !== false && (
        <span className="banner-live-highlight__team-stats">
          {team.stats?.map((stat, statIndex) => renderFootballLiveStat(stat, teamIndex, statIndex))}
        </span>
      )}
    </div>
  )

  const renderFootballLiveOddButton = (
    banner: Banner & { marketBanner: NonNullable<Banner['marketBanner']> },
    groupId: string,
    odd: NonNullable<MarketBanner['odds']>[number],
    className = 'banner-live-highlight__odd-btn',
    selectionContext?: BannerOddSelectionContext
  ) => {
    const oddLabel = odd.trend ? `${getReactNodeText(odd.label)}${odd.trend === 'up' ? '+' : '-'}` : odd.label

    return (
      <button
        key={`${banner.id}:${groupId}:${odd.outcomeId}`}
        {...getBannerOddButtonProps(banner, groupId, odd.outcomeId, className, oddLabel, odd.value, selectionContext)}
      >
        <span className="banner-live-highlight__odd-label">{oddLabel}</span>
        <span className="banner-live-highlight__odd-value">{odd.value}</span>
      </button>
    )
  }

  const renderFootballLiveBanner = (banner: Banner & { marketBanner: NonNullable<Banner['marketBanner']> }) => {
    const { marketBanner } = banner
    const isPreMatch = marketBanner.variant === 'football-pre' || marketBanner.variant === 'basketball-pre'
    const liveTimeLabel = getBannerLiveTimeLabel(banner, liveMatchTime, marketLiveTimes)
    const homeTeam = marketBanner.teams[0]
    const awayTeam = marketBanner.teams[1]
    const playerProps = marketBanner.playerProps ?? []
    const glowStyle = getBannerHighlightGlowStyle(homeTeam, awayTeam)

    return (
      <section
        className={`banner-live-highlight${isPreMatch ? ' banner-live-highlight--prematch' : ''}`}
        data-node-id={isPreMatch ? '757:11849' : '727:30801'}
        style={glowStyle}
      >
        <div className="banner-live-highlight__floating">
          <MarketTeamEmblem team={homeTeam} sport={marketBanner.sport} className="banner-live-highlight__floating-emblem banner-live-highlight__floating-emblem--home" />
          <div className="banner-live-highlight__score-time">
            <div className={`banner-live-highlight__scoreline${isPreMatch ? ' banner-live-highlight__scoreline--versus' : ''}`}>
              {isPreMatch ? (
                <img src={iconVs} alt="vs" />
              ) : (
                <>
                  <strong>{homeTeam.score ?? 0}</strong>
                  <span>:</span>
                  <strong>{awayTeam.score ?? 0}</strong>
                </>
              )}
            </div>
            <div className="banner-live-highlight__live-time">
              {!isPreMatch && <span className="banner-live-highlight__live-dot" />}
              <span>{isPreMatch ? liveTimeLabel : getBannerShortLiveTime(liveTimeLabel)}</span>
            </div>
          </div>
          <MarketTeamEmblem team={awayTeam} sport={marketBanner.sport} className="banner-live-highlight__floating-emblem banner-live-highlight__floating-emblem--away" />
        </div>

        <div className="banner-live-highlight__match">
          <div className="banner-live-highlight__header">
            {renderFootballLiveTeamSummary(homeTeam, 0, { showStats: !isPreMatch })}

            <span
              className="banner-live-highlight__header-spacer"
              aria-label={isPreMatch ? `${homeTeam.name} vs ${awayTeam.name}` : `${homeTeam.name} ${homeTeam.score ?? 0}, ${awayTeam.name} ${awayTeam.score ?? 0}`}
            />

            {renderFootballLiveTeamSummary(awayTeam, 1, { showStats: !isPreMatch })}
          </div>

          <div className="banner-live-highlight__moneyline" aria-label="Resultado final">
            {marketBanner.odds.map((odd) => renderFootballLiveOddButton(banner, '1x2', odd))}
          </div>

          {marketBanner.alternativeMarkets && (
            <div className="banner-live-highlight__alternatives">
              {marketBanner.alternativeMarkets.map((market) => (
                <div className="banner-live-highlight__alternative" key={market.id}>
                  <span className="banner-live-highlight__alternative-title">{market.label}</span>
                  <div className="banner-live-highlight__alternative-odds">
                    {market.odds.map((odd) => renderFootballLiveOddButton(
                      banner,
                      market.id,
                      odd,
                      'banner-live-highlight__odd-btn banner-live-highlight__odd-btn--small',
                      {
                        marketId: market.id,
                        marketLabel: market.label,
                        selectionType: 'market',
                      }
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {playerProps.length > 0 && (
          <div className="banner-live-highlight__props" aria-label="Player props em destaque">
            {playerProps.map((prop) => {
              const localPlayerImage = getLocalPlayerImage(prop.teamName, prop.playerName)

              return (
              <div className="banner-live-highlight__prop" key={prop.id}>
                <span className={`banner-live-highlight__prop-avatar-shell${localPlayerImage ? ' banner-live-highlight__prop-avatar-shell--real' : ''}`}>
                  {localPlayerImage ? (
                    <img className="banner-live-highlight__prop-avatar-photo" src={localPlayerImage} alt="" />
                  ) : (
                    <span className={`banner-live-highlight__prop-avatar banner-live-highlight__prop-avatar--${marketBanner.sport === 'basquete' ? 'basketball' : 'football'}`} />
                  )}
                </span>
                <span className="banner-live-highlight__prop-stat-icon" />
                <span className="banner-live-highlight__prop-team-code">{getBannerTeamCode(prop.teamName)}</span>

                <div className="banner-live-highlight__prop-body">
                  <span className="banner-live-highlight__prop-copy">
                    <span className="banner-live-highlight__prop-name-row">
                      <strong>{prop.playerName}</strong>
                      {prop.position && <em>{prop.position}</em>}
                    </span>
                    <small>{prop.subtitle}</small>
                  </span>

                  <FootballLivePropOddsSlider
                    playerName={prop.playerName}
                    odds={prop.odds}
                    renderOddButton={(odd, className) => (
                      renderFootballLiveOddButton(
                        banner,
                        `player-prop:${prop.id}`,
                        odd,
                        className,
                        {
                          marketId: `${prop.subtitle}-${prop.id}`,
                          marketLabel: prop.subtitle,
                          selectionLabel: prop.playerName,
                          selectionType: 'player',
                          playerName: prop.playerName,
                          selectionTeamName: prop.teamName,
                          selectionIcon: getMarketTeamLogo(getFootballLivePropTeam(marketBanner, prop.teamName), marketBanner.sport),
                        }
                      )
                    )}
                  />
                </div>
              </div>
              )
            })}
          </div>
        )}

        <div className="banner-live-highlight__footer">
          <span className="banner-live-highlight__league-link">
            {getBannerLeagueShortLabel(marketBanner.league)}
            <CaretRightIcon size={12} weight="bold" />
          </span>
          <span className="banner-live-highlight__more">
            Ver mais
            <CaretRightIcon size={14} weight="bold" />
          </span>
        </div>
      </section>
    )
  }

  const renderMarketBanner = (banner: Banner & { marketBanner: NonNullable<Banner['marketBanner']> }) => {
    const { marketBanner } = banner

    if (
      marketLayout === 'expanded'
      && (
        marketBanner.variant === 'football-live'
        || marketBanner.variant === 'football-pre'
        || marketBanner.variant === 'basketball-live'
        || marketBanner.variant === 'basketball-pre'
      )
    ) {
      return renderFootballLiveBanner(banner)
    }

    return (
      <section
        className={`banner-market banner-market--${marketBanner.variant}`}
        data-node-id={
          marketBanner.variant === 'tennis-live'
            ? '457:13361'
            : '457:13528'
        }
      >
        {renderMarketMatchup(banner)}

        <div className="banner-market__box">
          <div className="banner-market__header">
            <span className="banner-market__league">{marketBanner.league}</span>
          </div>

          {renderMarketTeams(banner)}

          <div className="banner-market__odds">
            {marketBanner.odds.map((odd) => (
              <button
                key={`${banner.id}:market:${odd.outcomeId}`}
                {...getBannerOddButtonProps(banner, '1x2', odd.outcomeId, 'banner-market__odd-btn', odd.label, odd.value)}
              >
                <span className="banner-market__odd-label">{odd.label}</span>
                <span className="banner-market__odd-value">{odd.value}</span>
              </button>
            ))}
          </div>

          <div className="banner-market__footer">
            <div className="banner-market__status">
              {marketBanner.live && (
                <span className="banner-market__live-badge">
                  <span className="banner-market__live-dot" />
                  AO VIVO
                </span>
              )}
              <span className="banner-market__footer-label">{getBannerLiveTimeLabel(banner, liveMatchTime, marketLiveTimes)}</span>
            </div>

            <div className="banner-market__more" aria-hidden="true">
              <span>Ver mais</span>
              <CaretRightIcon size={14} weight="bold" />
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div
      className={[
        'banner-carousel',
        isMarketBannerSet ? 'banner-carousel--market' : '',
        marketLayout === 'compact' ? 'banner-carousel--compact-market' : '',
        isFootballLiveHighlightSet ? 'banner-carousel--football-live-highlight' : '',
      ].filter(Boolean).join(' ')}
    >
      <div 
        className={`banner-carousel__list ${isDragging ? 'banner-carousel__list--dragging' : ''}`}
        ref={scrollRef}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {banners.map((banner) => {
          const isClickableBanner = !disableInteractions
            && (!!banner.casinoGameId || !!banner.eventLink)
            && !!onBannerClick

          if (hasMarketBanner(banner)) {
            return (
              <div
                key={banner.id}
                className={`banner-card banner-card--market${isClickableBanner ? ' banner-card--clickable' : ''}${marketLayout === 'expanded' && (banner.marketBanner.variant === 'football-live' || banner.marketBanner.variant === 'football-pre' || banner.marketBanner.variant === 'basketball-live' || banner.marketBanner.variant === 'basketball-pre') ? ' banner-card--football-live-highlight' : ''}`}
                role={isClickableBanner ? 'button' : undefined}
                tabIndex={isClickableBanner ? 0 : undefined}
                onClick={isClickableBanner ? () => handleBannerClick(banner) : undefined}
                onKeyDown={isClickableBanner ? (event) => handleBannerKeyDown(event, banner) : undefined}
              >
                {renderMarketBanner(banner)}
              </div>
            )
          }

          return (
          <div
            key={banner.id}
            className={`banner-card${isClickableBanner ? ' banner-card--clickable' : ''}`}
            role={isClickableBanner ? 'button' : undefined}
            tabIndex={isClickableBanner ? 0 : undefined}
            onClick={isClickableBanner ? () => handleBannerClick(banner) : undefined}
            onKeyDown={isClickableBanner ? (event) => handleBannerKeyDown(event, banner) : undefined}
          >
            {/* Header */}
            <div className="banner-card__header">
              {banner.type === 'aoVivo' || banner.type === 'aoVivoTenis' ? (
                <>
                  <div className="banner-card__header-left-live">
                    <div className="banner-card__tag-aovivo">
                      <div className="banner-card__tag-icon-wrapper">
                        <img src={iconAoVivo} alt="" className="banner-card__tag-icon" />
                      </div>
                      <span>Ao Vivo</span>
                    </div>
                    {banner.type === 'aoVivoTenis' ? (
                      <>
                        <span className="banner-card__match-time">{banner.tennisMatch?.currentSet}</span>
                        <span className="banner-card__header-dot" />
                        <span className="banner-card__match-time">{banner.tennisMatch?.setScore}</span>
                      </>
                    ) : (
                      <span className="banner-card__match-time">{liveMatchTime}</span>
                    )}
                  </div>
                  <span className="banner-card__header-right-text">{banner.headerRight}</span>
                </>
              ) : (
                <>
              <span className="banner-card__header-left">{banner.headerLeft}</span>
              <div className="banner-card__header-right">
                {banner.showTimer && <span className="banner-card__timer-dot" />}
                <span>{banner.headerRight}</span>
              </div>
                </>
              )}
            </div>

            {/* Content */}
            <div 
              className={`banner-card__content ${banner.type === 'aoVivo' || banner.type === 'aoVivoTenis' ? 'banner-card__content--live' : ''}`}
              style={{ backgroundImage: `url(${banner.background})` }}
            >
              {/* Ao Vivo Tennis Content */}
              {banner.type === 'aoVivoTenis' && banner.tennisMatch && (
                <div className="banner-card__live-content">
                  <div className="banner-card__tennis-scores">
                    <div className="banner-card__tennis-player">
                      <div className="banner-card__tennis-score-group">
                        <div className="banner-card__tennis-score-box banner-card__tennis-score-box--filled">
                          {banner.tennisMatch.player1.isServing && (
                            <img src={iconTenis} alt="" className="banner-card__tennis-serve" />
                          )}
                          <span>{banner.tennisMatch.player1.games}</span>
                        </div>
                        <div className="banner-card__tennis-score-box">
                          <span>{banner.tennisMatch.player1.points}</span>
                        </div>
                      </div>
                      <span className="banner-card__tennis-dot" />
                      {banner.tennisMatch.player1.flag && (
                        <img src={banner.tennisMatch.player1.flag} alt="" className="banner-card__tennis-flag" />
                      )}
                      <span className="banner-card__tennis-player-name">{banner.tennisMatch.player1.name}</span>
                    </div>
                    <div className="banner-card__tennis-player">
                      <div className="banner-card__tennis-score-group">
                        <div className="banner-card__tennis-score-box banner-card__tennis-score-box--filled">
                          {banner.tennisMatch.player2.isServing && (
                            <img src={iconTenis} alt="" className="banner-card__tennis-serve" />
                          )}
                          <span>{banner.tennisMatch.player2.games}</span>
                        </div>
                        <div className="banner-card__tennis-score-box">
                          <span>{banner.tennisMatch.player2.points}</span>
                        </div>
                      </div>
                      <span className="banner-card__tennis-dot" />
                      {banner.tennisMatch.player2.flag && (
                        <img src={banner.tennisMatch.player2.flag} alt="" className="banner-card__tennis-flag" />
                      )}
                      <span className="banner-card__tennis-player-name">{banner.tennisMatch.player2.name}</span>
                    </div>
                  </div>
                  <div className="banner-card__live-odds">
                    {renderBannerOddButton(banner, 'tennis-live', 'player-1', 'banner-card__live-odd-btn', 'banner-card__live-odd-team', 'banner-card__live-odd-value', banner.tennisMatch.player1.name, banner.tennisMatch.odds.player1)}
                    {renderBannerOddButton(banner, 'tennis-live', 'player-2', 'banner-card__live-odd-btn', 'banner-card__live-odd-team', 'banner-card__live-odd-value', banner.tennisMatch.player2.name, banner.tennisMatch.odds.player2)}
                  </div>
                </div>
              )}

              {/* Ao Vivo Content */}
              {banner.type === 'aoVivo' && banner.liveMatch && (
                <div className="banner-card__live-content">
                  <div className="banner-card__live-scores">
                    <div className="banner-card__live-team">
                      <span className="banner-card__live-score">{banner.liveMatch.homeTeam.score}</span>
                      <span className="banner-card__live-dot" />
                      <TeamLogo
                        teamName={banner.liveMatch.homeTeam.name}
                        currentLogo={banner.liveMatch.homeTeam.badge}
                        sport="basquete"
                        className="banner-card__live-badge"
                        fallbackClassName="banner-card__live-badge--sport"
                        placeholderClassName="banner-card__live-badge banner-card__live-badge--placeholder"
                      />
                      <span className="banner-card__live-team-name">{banner.liveMatch.homeTeam.name}</span>
                    </div>
                    <div className="banner-card__live-team">
                      <span className="banner-card__live-score">{banner.liveMatch.awayTeam.score}</span>
                      <span className="banner-card__live-dot" />
                      <TeamLogo
                        teamName={banner.liveMatch.awayTeam.name}
                        currentLogo={banner.liveMatch.awayTeam.badge}
                        sport="basquete"
                        className="banner-card__live-badge"
                        fallbackClassName="banner-card__live-badge--sport"
                        placeholderClassName="banner-card__live-badge banner-card__live-badge--placeholder"
                      />
                      <span className="banner-card__live-team-name">{banner.liveMatch.awayTeam.name}</span>
                    </div>
                  </div>
                  <div className="banner-card__live-odds">
                    {renderBannerOddButton(banner, 'live', 'home', 'banner-card__live-odd-btn', 'banner-card__live-odd-team', 'banner-card__live-odd-value', banner.liveMatch.homeTeam.name, banner.liveMatch.odds.home)}
                    {banner.liveMatch.odds.draw && (
                      renderBannerOddButton(banner, 'live', 'draw', 'banner-card__live-odd-btn', 'banner-card__live-odd-team', 'banner-card__live-odd-value', 'Empate', banner.liveMatch.odds.draw)
                    )}
                    {renderBannerOddButton(banner, 'live', 'away', 'banner-card__live-odd-btn', 'banner-card__live-odd-team', 'banner-card__live-odd-value', banner.liveMatch.awayTeam.name, banner.liveMatch.odds.away)}
                  </div>
                </div>
              )}

              {/* Combinada Content */}
              {banner.type === 'combinada' && banner.comboStats && (
                <div className="banner-card__combinada">
                  <div className="banner-card__combinada-text">
                    <div className="banner-card__combinada-title">
                      <img src={iconSuperCombinada} alt="" className="banner-card__combinada-icon" />
                      <span>{banner.title}</span>
                    </div>
                    <div className="banner-card__combinada-stats">
                      {banner.comboStats.map((stat, i) => (
                        <div key={i} className="banner-card__combinada-stat">
                          <span className="banner-card__combinada-stat-value">{stat.value}</span>
                          <span className="banner-card__combinada-stat-dot"> - </span>
                          <span className="banner-card__combinada-stat-label">{stat.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {banner.oddBoosted && (
                    <button {...getBannerComboOddButtonProps(banner)}>
                      <span className="banner-card__combinada-old-odd">{banner.oddBoosted.old}</span>
                      <img src={iconBoostWhite} alt="" className="banner-card__combinada-arrow" />
                      <span className="banner-card__combinada-new-odd">{banner.oddBoosted.new}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Regular Content */}
              {!banner.hideContent && banner.type !== 'aoVivo' && banner.type !== 'aoVivoTenis' && banner.type !== 'combinada' && (
              <div className={`banner-card__info ${banner.odds ? 'banner-card__info--full' : ''}`}>

                {/* Times com escudo (1x2) */}
                {banner.type === '1x2' && banner.odds ? (
                  <div className="banner-card__teams">
                    {banner.odds.filter(o => o.badge).map((odd, i) => (
                      <div key={i} className="banner-card__live-team">
                        <TeamLogo
                          teamName={odd.team}
                          currentLogo={odd.badge}
                          sport="futebol"
                          className="banner-card__live-badge"
                          fallbackClassName="banner-card__live-badge--sport"
                          placeholderClassName="banner-card__live-badge banner-card__live-badge--placeholder"
                        />
                        <span className="banner-card__live-team-name">{odd.team}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                <div className="banner-card__text">
                  <h3
                    className={[
                      'banner-card__title',
                      ['aumentada', 'virtuais'].includes(banner.type) ? 'banner-card__title--aumentada' : '',
                      banner.noWrapTitle ? 'banner-card__title--nowrap' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {banner.type === 'aumentada' && (
                      <img src={iconAumentada} alt="" className="banner-card__boost-icon" />
                    )}
                    {banner.title}
                  </h3>
                  <p className="banner-card__description">
                    {banner.description.split('\n').map((line, i) => (
                      <span key={i}>{line}<br /></span>
                    ))}
                  </p>
                </div>
                )}

                {/* Botões padrão */}
                {banner.buttonText && (
                  <div className="banner-card__buttons">
                    {banner.type === 'missao' && isMissionActivated(banner.id) ? (
                      <button 
                        className="banner-card__btn-activated"
                        disabled={disableInteractions}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (disableInteractions) return
                          handleOpenMissionInfo(banner)
                        }}
                      >
                        <div className="banner-card__btn-activated-left">
                          <img src={iconAtivo} alt="" className="banner-card__btn-activated-icon" />
                          <span>Acompanhar</span>
                        </div>
                        <div className="banner-card__btn-activated-divider" />
                        <div className="banner-card__btn-activated-right">
                          <span className="banner-card__btn-activated-label">Progresso</span>
                          <span className="banner-card__btn-activated-value">
                            R${getMissionProgress(banner.id)?.current || 0} de R${getMissionProgress(banner.id)?.target || 100}
                          </span>
                        </div>
                      </button>
                    ) : (
                      <>
                        <button 
                          className="banner-card__btn"
                          disabled={disableInteractions}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (disableInteractions) return
                            if (banner.type === 'missao') {
                              handleActivateMission(banner.id, 100)
                            }
                          }}
                        >
                          {banner.buttonText}
                        </button>
                        {banner.showInfoBtn && (
                          <button 
                            className="banner-card__btn banner-card__btn--icon"
                            disabled={disableInteractions}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (disableInteractions) return
                              if (banner.type === 'missao') {
                                handleOpenMissionInfo(banner)
                              }
                            }}
                          >
                            <img src={iconSaibaMais} alt="Saiba mais" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Odds 1x2 */}
                {banner.odds && (
                  <div className="banner-card__odds">
                    {banner.odds.map((odd, i) => (
                      renderBannerOddButton(banner, 'regular', `${odd.team}-${i}`, 'banner-card__odd-btn', 'banner-card__odd-team', 'banner-card__odd-value', odd.team, odd.value)
                    ))}
                  </div>
                )}

                {/* Odd aumentada */}
                {banner.oddBoosted && (
                  <button {...getBannerOddButtonProps(banner, 'boosted', 'boosted', 'banner-card__boosted-btn', banner.title, banner.oddBoosted.new)}>
                    <span className="banner-card__old-odd">{banner.oddBoosted.old}</span>
                    <img src={iconBoostWhite} alt="" className="banner-card__arrow" />
                    <span className="banner-card__new-odd">{banner.oddBoosted.new}</span>
                  </button>
                )}
              </div>
              )}
            </div>
          </div>
          )
        })}
      </div>

      {/* Bullets */}
      <div className="banner-carousel__bullets">
        {banners.map((_, index) => (
          <span 
            key={index} 
            className={`banner-carousel__bullet ${isMarketBannerSet ? getMarketBulletDistanceClass(index, activeIndex) : index === activeIndex ? 'banner-carousel__bullet--active' : ''}`}
          >
            {!isMarketBannerSet && index === activeIndex && (
              <span 
                key={activeIndex}
                className="banner-carousel__bullet-progress" 
              />
            )}
          </span>
        ))}
      </div>

      {/* Success Toast */}
      <Toast
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        title="Missão Ativada"
        message="Cumpra os objetivos para ganhar o seu bônus!"
      />

      {/* Mission Bottom Sheet */}
      {selectedBanner && selectedBanner.type === 'missao' && (
        <BottomSheet
          isOpen={isBottomSheetOpen}
          onClose={closeBottomSheet}
          title={selectedBanner.title}
          titleIcon={imgMissaoRodadaGratis}
          footerContent={
            <button className="bottom-sheet__btn-primary" onClick={handleActivateMissionFromBS}>
              <span>{isMissionActivated(selectedBanner.id) ? 'Jogar' : 'Ativar Missão'}</span>
            </button>
          }
        >
          {/* Mission Description */}
          <p className="mission-description">{selectedBanner.description}</p>

          {/* Mission Box */}
          <div className="mission-box">
            <div className="mission-box__header">
              <MissionTimer text={selectedBanner.headerRight} />
            </div>
            <div className="mission-box__content">
              {isMissionActivated(selectedBanner.id) && (
                <div className="mission-progress">
                  <div className="mission-progress__header">
                    <span className="mission-progress__label">Progresso:</span>
                    <span className="mission-progress__value">
                      R${getMissionProgress(selectedBanner.id)?.current || 0} de R${getMissionProgress(selectedBanner.id)?.target || 100}
                    </span>
                  </div>
                  <div className="mission-progress__bar">
                    <div 
                      className="mission-progress__fill"
                      style={{ 
                        width: `${((getMissionProgress(selectedBanner.id)?.current || 0) / (getMissionProgress(selectedBanner.id)?.target || 100)) * 100}%` 
                      }}
                    />
                    <div 
                      className="mission-progress__dot"
                      style={{ 
                        left: `${((getMissionProgress(selectedBanner.id)?.current || 0) / (getMissionProgress(selectedBanner.id)?.target || 100)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}
              <p className="mission-box__title">Objetivos da missão</p>
              <MissionObjective text="Apostar R$100 no jogo SpaceMan" />
            </div>
          </div>

          {/* Mission Info Section */}
          <div className="mission-info-section">
            <div className="mission-info-header">
              <span className="mission-info-header__title">Informações sobre a Missão</span>
              <CaretUpIcon aria-hidden="true" className="mission-info-header__icon" weight="bold" />
            </div>
            <div className="mission-info-rows">
              <MissionInfoRow label="Tipo de Aposta" value="Jogo Crash" />
              <MissionInfoRow label="Valor Mínimo por Aposta" value="Pelo menos R$100" />
              <MissionInfoRow label="Valor do Bônus" value="40" />
              <MissionInfoRow label="Forma de Recebimento" value="Giros Grátis" />
              <MissionInfoRow label="Validade do Bônus" value="7 dias após o recebimento" />
            </div>

            {/* FAQ Section */}
            <div className="mission-faq">
              <MissionFaqItem question="Como posso participar da missão" />
              <MissionFaqItem question="Preciso ativar a missão para participar?" />
              <MissionFaqItem question="Quais jogos participam da promoção?" />
              <MissionFaqItem question="Quando recebo meu bônus?" />
              <MissionFaqItem question="Posso acumular essa missão com outras?" />
              <MissionFaqItem question="Termos e Condições" />
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
