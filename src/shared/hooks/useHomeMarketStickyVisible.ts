import { useEffect, useRef, useState, type RefObject } from 'react'

interface HomeMarketStickyState {
  isStuck: boolean
  isVisible: boolean
}

const stuckMarketChipsByHome = new WeakMap<HTMLElement, Set<HTMLElement>>()

const isScrollableHome = (style: CSSStyleDeclaration) => (
  style.position === 'fixed' &&
  (style.overflowY === 'auto' || style.overflowY === 'scroll')
)

const getCssNumber = (style: CSSStyleDeclaration, property: string) => (
  parseFloat(style.getPropertyValue(property)) || 0
)

const isVisibleElement = (element: HTMLElement | null) => {
  if (!element) return false

  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    rect.width > 0 &&
    rect.height > 1
  )
}

const STICKY_ENGAGED_TOLERANCE = 12
const STICKY_RELEASE_BUFFER = 72
const STICKY_FAST_SCROLL_DELTA = 48
const STICKY_FAST_SCROLL_MAX_BUFFER = 120

const setHomeMarketStickyEngaged = (homeEl: HTMLElement | null, stickyEl: HTMLElement, isEngaged: boolean) => {
  if (!homeEl) return

  let stuckMarketChips = stuckMarketChipsByHome.get(homeEl)
  if (!stuckMarketChips) {
    stuckMarketChips = new Set<HTMLElement>()
    stuckMarketChipsByHome.set(homeEl, stuckMarketChips)
  }

  if (isEngaged) {
    stuckMarketChips.add(stickyEl)
  } else {
    stuckMarketChips.delete(stickyEl)
  }

  const hasStuckMarketChips = stuckMarketChips.size > 0
  homeEl.classList.toggle('home--market-sticky-engaged', hasStuckMarketChips)

  if (hasStuckMarketChips) {
    homeEl.setAttribute('data-market-sticky-engaged', 'true')
  } else {
    homeEl.removeAttribute('data-market-sticky-engaged')
  }
}

const setHomeMarketStickyRailProtection = (homeEl: HTMLElement | null, isProtected: boolean) => {
  if (!homeEl) return

  if (isProtected) {
    homeEl.setAttribute('data-market-sticky-rail-protection', 'true')
  } else {
    homeEl.removeAttribute('data-market-sticky-rail-protection')
  }
}

export function useHomeMarketStickyState<TSection extends HTMLElement, TSticky extends HTMLElement>(
  sectionRef: RefObject<TSection | null>,
  stickyRef: RefObject<TSticky | null>
) {
  const initialStickyState: HomeMarketStickyState = {
    isStuck: false,
    isVisible: true,
  }
  const stickyStateRef = useRef(initialStickyState)
  const lastScrollTopRef = useRef<number | null>(null)
  const [stickyState, setStickyState] = useState<HomeMarketStickyState>(initialStickyState)

  useEffect(() => {
    const sectionEl = sectionRef.current
    const stickyEl = stickyRef.current
    if (!sectionEl || !stickyEl) return

    const homeEl = sectionEl.closest<HTMLElement>('.home')
    let frame: number | null = null

    const getScrollTop = () => Math.max(
      homeEl?.scrollTop ?? 0,
      window.scrollY,
      document.documentElement.scrollTop,
      document.body.scrollTop
    )

    const update = () => {
      frame = null

      const scrollTop = getScrollTop()
      const lastScrollTop = lastScrollTopRef.current
      const scrollDelta = lastScrollTop === null ? 0 : scrollTop - lastScrollTop
      const fastScrollBuffer = scrollDelta > STICKY_FAST_SCROLL_DELTA
        ? Math.min(scrollDelta - STICKY_FAST_SCROLL_DELTA, STICKY_FAST_SCROLL_MAX_BUFFER)
        : 0
      const sectionRect = sectionEl.getBoundingClientRect()
      const stickyRect = stickyEl.getBoundingClientRect()
      const stickyTop = parseFloat(window.getComputedStyle(stickyEl).top) || 0
      const homeRect = homeEl?.getBoundingClientRect()
      const homeStyle = homeEl ? window.getComputedStyle(homeEl) : null
      const homePaddingTop = homeStyle ? getCssNumber(homeStyle, 'padding-top') : 0
      const nextSectionTop = sectionEl.nextElementSibling instanceof HTMLElement
        ? sectionEl.nextElementSibling.getBoundingClientRect().top
        : sectionRect.bottom
      const hasVisibleEventRail = isVisibleElement(
        homeEl?.querySelector<HTMLElement>('.header .sports-match-carousel:not(.sports-match-carousel--collapsed)') ?? null
      )
      const scrollRootTop = homeRect?.top ?? 0
      const stickyViewportTop = scrollRootTop + (homeStyle && isScrollableHome(homeStyle) ? homePaddingTop : 0) + stickyTop
      const hasReachedStickyViewport = stickyRect.top <= stickyViewportTop + STICKY_ENGAGED_TOLERANCE
      const isStickyEngaged = hasReachedStickyViewport
      const releaseLine = stickyViewportTop + stickyRect.height + STICKY_RELEASE_BUFFER + fastScrollBuffer
      const restoreLine = releaseLine + stickyRect.height
      const endBoundary = stickyStateRef.current.isVisible ? releaseLine : restoreLine
      const wouldHideAtStickyBoundary = hasReachedStickyViewport && nextSectionTop <= endBoundary
      const shouldHide = (
        isStickyEngaged &&
        wouldHideAtStickyBoundary
      )
      const nextState = {
        isStuck: isStickyEngaged && !shouldHide,
        isVisible: !shouldHide,
      }
      const hasRailProtection = hasVisibleEventRail && nextState.isVisible
      const shouldStackWithEventRail = hasVisibleEventRail
      const layerProtectionBuffer = fastScrollBuffer > 0
        ? fastScrollBuffer
        : 0
      const shouldKeepLayerLowDuringProtectedScroll = (
        layerProtectionBuffer > 0 &&
        nextSectionTop <= releaseLine + layerProtectionBuffer
      )
      const shouldLayerSticky = nextState.isVisible &&
        nextState.isStuck &&
        !shouldKeepLayerLowDuringProtectedScroll

      stickyEl.setAttribute('data-market-sticky-stuck', nextState.isStuck ? 'true' : 'false')
      stickyEl.setAttribute('data-market-sticky-visible', nextState.isVisible ? 'true' : 'false')
      stickyEl.setAttribute('data-market-sticky-event-rail', shouldStackWithEventRail ? 'true' : 'false')
      stickyEl.setAttribute('data-market-sticky-layered', shouldLayerSticky ? 'true' : 'false')
      lastScrollTopRef.current = scrollTop
      stickyStateRef.current = nextState
      setHomeMarketStickyRailProtection(homeEl, hasRailProtection)
      setHomeMarketStickyEngaged(homeEl, stickyEl, nextState.isStuck)
      setStickyState((current) => (
        current.isStuck === nextState.isStuck && current.isVisible === nextState.isVisible
          ? current
          : nextState
      ))
    }

    const scheduleUpdate = () => {
      if (frame !== null) return
      frame = window.requestAnimationFrame(update)
    }

    const handleScroll = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame)
        frame = null
      }
      update()
    }

    scheduleUpdate()
    homeEl?.addEventListener('scroll', handleScroll, { passive: true })
    homeEl?.addEventListener('home-header-morph-change', scheduleUpdate)
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', scheduleUpdate, { passive: true })

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(scheduleUpdate)
      : null

    resizeObserver?.observe(sectionEl)
    resizeObserver?.observe(stickyEl)

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      setHomeMarketStickyEngaged(homeEl, stickyEl, false)
      setHomeMarketStickyRailProtection(homeEl, false)
      stickyEl.removeAttribute('data-market-sticky-stuck')
      stickyEl.removeAttribute('data-market-sticky-visible')
      stickyEl.removeAttribute('data-market-sticky-event-rail')
      stickyEl.removeAttribute('data-market-sticky-layered')
      homeEl?.removeEventListener('scroll', handleScroll)
      homeEl?.removeEventListener('home-header-morph-change', scheduleUpdate)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', scheduleUpdate)
      resizeObserver?.disconnect()
    }
  }, [sectionRef, stickyRef])

  return stickyState
}
