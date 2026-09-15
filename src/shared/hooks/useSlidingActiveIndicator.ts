import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

interface UseSlidingActiveIndicatorOptions {
  activeKey: string | null | undefined
  refreshKey?: unknown
  containerRef: RefObject<HTMLElement | null>
  getActiveElement: () => HTMLElement | null | undefined
  readyClassName?: string
  switchingClassName?: string | null
  switchingDurationMs?: number
  clippedClassName?: string | null
  variablePrefix?: string
}

export function setSlidingActiveIndicator(
  containerEl: HTMLElement | null,
  activeEl: HTMLElement | null | undefined,
  readyClassName = 'sliding-chip-group--indicator-ready',
  variablePrefix = 'sliding-chip'
) {
  const indicatorEl = containerEl?.querySelector<HTMLElement>('.sliding-chip-indicator')

  if (!containerEl || !activeEl) {
    containerEl?.style.setProperty(`--${variablePrefix}-indicator-opacity`, '0')
    containerEl?.style.setProperty(`--${variablePrefix}-indicator-scale`, '0.98')
    if (indicatorEl) {
      indicatorEl.style.width = '0px'
      indicatorEl.style.opacity = '0'
      indicatorEl.style.transform = 'translate3d(0, 0, 0)'
    }
    containerEl?.classList.remove(readyClassName)
    return
  }

  const containerRect = containerEl.getBoundingClientRect()
  const activeRect = activeEl.getBoundingClientRect()
  const activeX = activeRect.left - containerRect.left + containerEl.scrollLeft
  const activeY = activeRect.top - containerRect.top + containerEl.scrollTop

  containerEl.style.setProperty(`--${variablePrefix}-active-x`, `${activeX}px`)
  containerEl.style.setProperty(`--${variablePrefix}-active-y`, `${activeY}px`)
  containerEl.style.setProperty(`--${variablePrefix}-active-width`, `${activeRect.width}px`)
  containerEl.style.setProperty(`--${variablePrefix}-active-height`, `${activeRect.height}px`)
  containerEl.style.setProperty(`--${variablePrefix}-indicator-opacity`, '1')
  containerEl.style.setProperty(`--${variablePrefix}-indicator-scale`, '1')
  if (indicatorEl) {
    indicatorEl.style.width = `${activeRect.width}px`
    indicatorEl.style.height = `${activeRect.height}px`
    indicatorEl.style.opacity = '1'
    indicatorEl.style.transform = `translate3d(${activeX}px, ${activeY}px, 0)`
  }
  containerEl.classList.add(readyClassName)
}

export function useSlidingActiveIndicator({
  activeKey,
  refreshKey,
  containerRef,
  getActiveElement,
  readyClassName = 'sliding-chip-group--indicator-ready',
  switchingClassName,
  switchingDurationMs = 520,
  clippedClassName,
  variablePrefix = 'sliding-chip',
}: UseSlidingActiveIndicatorOptions) {
  const getActiveElementRef = useRef(getActiveElement)
  const previousActiveKeyRef = useRef(activeKey)
  const switchingFrameRef = useRef<number | null>(null)
  const switchingResetTimerRef = useRef<number | null>(null)
  const switchingTargetRef = useRef<{ element: HTMLElement; className: string } | null>(null)
  const resolvedSwitchingClassName = switchingClassName === undefined && variablePrefix === 'sliding-chip'
    ? 'sliding-chip-group--indicator-switching'
    : switchingClassName
  const resolvedClippedClassName = clippedClassName === undefined && variablePrefix === 'sliding-chip'
    ? 'sliding-chip-group--indicator-clipped'
    : clippedClassName

  const clearSwitchingMotion = useCallback(() => {
    if (switchingFrameRef.current !== null) {
      window.cancelAnimationFrame(switchingFrameRef.current)
      switchingFrameRef.current = null
    }

    if (switchingResetTimerRef.current !== null) {
      window.clearTimeout(switchingResetTimerRef.current)
      switchingResetTimerRef.current = null
    }

    const target = switchingTargetRef.current
    if (target) {
      target.element.classList.remove(target.className)
      switchingTargetRef.current = null
    }
  }, [])

  useLayoutEffect(() => {
    getActiveElementRef.current = getActiveElement
  }, [getActiveElement])

  useLayoutEffect(() => {
    const containerEl = containerRef.current
    const activeEl = getActiveElementRef.current()

    if (resolvedClippedClassName) {
      containerEl?.classList.remove(resolvedClippedClassName)
    }

    const previousActiveKey = previousActiveKeyRef.current
    const isLayoutRefresh = previousActiveKey === activeKey

    if (containerEl && isLayoutRefresh) {
      containerEl.classList.add('sliding-chip-group--indicator-instant')
    }

    setSlidingActiveIndicator(
      containerEl,
      activeEl,
      readyClassName,
      variablePrefix
    )

    previousActiveKeyRef.current = activeKey

    if (containerEl && isLayoutRefresh) {
      void containerEl.offsetWidth
      containerEl.classList.remove('sliding-chip-group--indicator-instant')
    }

    if (
      !resolvedSwitchingClassName ||
      !containerEl ||
      !activeEl ||
      previousActiveKey === activeKey ||
      previousActiveKey == null ||
      activeKey == null
    ) {
      if (resolvedClippedClassName && containerEl && activeEl) {
        containerEl.classList.add(resolvedClippedClassName)
      }
      return
    }

    clearSwitchingMotion()
    containerEl.classList.remove(resolvedSwitchingClassName)
    switchingTargetRef.current = {
      element: containerEl,
      className: resolvedSwitchingClassName,
    }

    switchingFrameRef.current = window.requestAnimationFrame(() => {
      switchingFrameRef.current = window.requestAnimationFrame(() => {
        switchingFrameRef.current = null
        containerEl.classList.add(resolvedSwitchingClassName)

        switchingResetTimerRef.current = window.setTimeout(() => {
          containerEl.classList.remove(resolvedSwitchingClassName)
          if (resolvedClippedClassName) {
            containerEl.classList.add(resolvedClippedClassName)
          }
          switchingResetTimerRef.current = null
          switchingTargetRef.current = null
        }, switchingDurationMs)
      })
    })
  }, [
    activeKey,
    clearSwitchingMotion,
    containerRef,
    refreshKey,
    readyClassName,
    resolvedClippedClassName,
    resolvedSwitchingClassName,
    switchingDurationMs,
    variablePrefix,
  ])

  useEffect(() => () => {
    clearSwitchingMotion()
  }, [clearSwitchingMotion])

  useEffect(() => {
    const containerEl = containerRef.current
    if (!containerEl) return
    let updateFrame: number | null = null

    const updateIndicator = () => {
      updateFrame = null
      setSlidingActiveIndicator(
        containerEl,
        getActiveElementRef.current(),
        readyClassName,
        variablePrefix
      )
    }
    const scheduleUpdateIndicator = () => {
      if (updateFrame !== null) return
      updateFrame = window.requestAnimationFrame(updateIndicator)
    }
    const activeEl = getActiveElementRef.current()
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(scheduleUpdateIndicator)
      : null

    resizeObserver?.observe(containerEl)
    if (activeEl) resizeObserver?.observe(activeEl)
    window.addEventListener('resize', scheduleUpdateIndicator)
    window.addEventListener('scroll', scheduleUpdateIndicator, true)
    containerEl.addEventListener('transitionend', scheduleUpdateIndicator)

    return () => {
      if (updateFrame !== null) {
        window.cancelAnimationFrame(updateFrame)
      }
      resizeObserver?.disconnect()
      window.removeEventListener('resize', scheduleUpdateIndicator)
      window.removeEventListener('scroll', scheduleUpdateIndicator, true)
      containerEl.removeEventListener('transitionend', scheduleUpdateIndicator)
    }
  }, [activeKey, containerRef, readyClassName, variablePrefix])
}
