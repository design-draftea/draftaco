export interface PromoCountdownParts {
  hours: number
  minutes: number
}

export const PROMO_COUNTDOWN_TICK_MS = 1000
export const PROMO_MINUTE_MS = 60 * 1000
export const GARANTIDA_PROMO_COUNTDOWN_MINUTES = 137

let garantidaPromoDeadline: number | null = null

export const getGarantidaPromoDeadline = () => {
  if (garantidaPromoDeadline === null) {
    garantidaPromoDeadline = Date.now() + GARANTIDA_PROMO_COUNTDOWN_MINUTES * PROMO_MINUTE_MS
  }

  return garantidaPromoDeadline
}

export const getPromoCountdownParts = (remainingMs: number): PromoCountdownParts => {
  const totalMinutes = Math.max(0, Math.ceil(remainingMs / PROMO_MINUTE_MS))

  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  }
}

export const formatPromoCountdownSegment = (value: number) => String(value).padStart(2, '0')
