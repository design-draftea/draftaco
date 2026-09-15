import { useEffect, useRef, useState } from 'react'

const animatedNumberDurationMs = 520

const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3
const shouldAnimateAnyNumberChange = () => true

export function useAnimatedBetslipNumber(
  targetValue: number,
  formatter: (value: number) => string,
  enabled: boolean,
  shouldAnimateChange: (startValue: number, targetValue: number) => boolean = shouldAnimateAnyNumberChange
) {
  const displayedValueRef = useRef(targetValue)
  const [displayedValue, setDisplayedValue] = useState(targetValue)

  useEffect(() => {
    let frameId: number | null = null
    const startValue = displayedValueRef.current
    const difference = targetValue - startValue

    if (
      !enabled
      || Math.abs(difference) < 0.005
      || !shouldAnimateChange(startValue, targetValue)
    ) {
      frameId = window.requestAnimationFrame(() => {
        displayedValueRef.current = targetValue
        setDisplayedValue(targetValue)
      })

      return () => {
        if (frameId !== null) window.cancelAnimationFrame(frameId)
      }
    }

    const startedAt = performance.now()

    const tick = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startedAt) / animatedNumberDurationMs)
      const easedProgress = easeOutCubic(progress)
      const jitter = progress < 0.72
        ? Math.sin(progress * Math.PI * 18) * difference * 0.012
        : 0
      const nextValue = startValue + difference * easedProgress + jitter

      displayedValueRef.current = progress >= 1 ? targetValue : nextValue
      setDisplayedValue(displayedValueRef.current)

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick)
      }
    }

    frameId = window.requestAnimationFrame(tick)

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)
    }
  }, [enabled, shouldAnimateChange, targetValue])

  return formatter(displayedValue)
}
