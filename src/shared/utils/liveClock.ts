export interface ParsedLiveClock {
  period: number
  minutes: number
  seconds: number
  isQuarter: boolean
}

const staticLiveClockLabels = new Set(['Intervalo', 'INT', 'Ao vivo'])

export function parseLiveClock(time: string): ParsedLiveClock | null {
  const quarterMatch = time.match(/^Q(\d+)\s+(\d+):(\d+)$/)

  if (quarterMatch) {
    return {
      period: Number.parseInt(quarterMatch[1], 10),
      minutes: Number.parseInt(quarterMatch[2], 10),
      seconds: Number.parseInt(quarterMatch[3], 10),
      isQuarter: true,
    }
  }

  const halfMatch = time.match(/^(\d+)T\s+(\d+):(\d+)$/)

  if (halfMatch) {
    return {
      period: Number.parseInt(halfMatch[1], 10),
      minutes: Number.parseInt(halfMatch[2], 10),
      seconds: Number.parseInt(halfMatch[3], 10),
      isQuarter: false,
    }
  }

  return null
}

export function formatLiveClock({
  period,
  minutes,
  seconds,
  isQuarter,
}: ParsedLiveClock) {
  const formattedMinutes = minutes.toString().padStart(2, '0')
  const formattedSeconds = seconds.toString().padStart(2, '0')

  return isQuarter
    ? `Q${period} ${formattedMinutes}:${formattedSeconds}`
    : `${period}T ${formattedMinutes}:${formattedSeconds}`
}

export function advanceLiveClock(time: string, elapsedSeconds: number) {
  if (staticLiveClockLabels.has(time)) return time

  const parsed = parseLiveClock(time)
  if (!parsed) return time

  const safeElapsedSeconds = Math.max(0, Math.floor(elapsedSeconds))
  const initialTotalSeconds = parsed.minutes * 60 + parsed.seconds
  const nextTotalSeconds = parsed.isQuarter
    ? initialTotalSeconds - safeElapsedSeconds
    : initialTotalSeconds + safeElapsedSeconds

  if (parsed.isQuarter && nextTotalSeconds <= 0) return 'Intervalo'

  return formatLiveClock({
    ...parsed,
    minutes: Math.floor(Math.max(0, nextTotalSeconds) / 60),
    seconds: Math.max(0, nextTotalSeconds) % 60,
  })
}

export const updateLiveClock = (time: string) => advanceLiveClock(time, 1)
