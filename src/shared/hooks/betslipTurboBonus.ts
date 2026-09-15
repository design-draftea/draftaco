import { normalizeBetslipIdPart, type BetslipSelection } from './betslipUtils'

const turboBonusMinSelectionCount = 3
const turboBonusLinearStartSelectionCount = 6
const turboBonusMaxSelectionCount = 20
const turboBonusLinearStartPercent = 20
const turboBonusMaxPercent = 200
export const BETSLIP_TURBO_MIN_ODD_VALUE = 1.3
const turboBlockedPromotionalMarketIds = new Set([
  'aumentada',
  'pechincha',
  'super-aumentada',
])

const roundToNearestFive = (value: number) => Math.round(value / 5) * 5

export const getBetslipSelectionGroupOddsValue = (selections: BetslipSelection[]) => {
  const firstSelection = selections[0]
  const isCompleteCombo = Boolean(
    firstSelection?.comboId
    && firstSelection.comboTotalOddValue
    && firstSelection.comboLegCount
    && selections.length >= firstSelection.comboLegCount
    && selections.every((selection) => selection.comboId === firstSelection.comboId)
  )

  if (isCompleteCombo) {
    return firstSelection.comboTotalOddValue ?? selections.reduce((total, selection) => total * selection.oddValue, 1)
  }

  return selections.reduce((total, selection) => total * selection.oddValue, 1)
}

export const isBetslipTurboSelectionGroupEligible = (selections: BetslipSelection[]) => (
  getBetslipSelectionGroupOddsValue(selections) >= BETSLIP_TURBO_MIN_ODD_VALUE
)

export const isBetslipTurboBlockedByPromotionSelection = (selection: BetslipSelection) => (
  turboBlockedPromotionalMarketIds.has(normalizeBetslipIdPart(selection.marketId))
  || (
    selection.comboTypeLabel
      ? turboBlockedPromotionalMarketIds.has(normalizeBetslipIdPart(selection.comboTypeLabel))
      : false
  )
)

export const hasBetslipTurboBlockedByPromotionSelection = (selections: BetslipSelection[]) => (
  selections.some(isBetslipTurboBlockedByPromotionSelection)
)

export const getBetslipTurboEligibleSelectionCountIgnoringPromotions = (selections: BetslipSelection[]) => {
  const selectionGroupsByEventId = new Map<string, BetslipSelection[]>()

  selections.forEach((selection) => {
    selectionGroupsByEventId.set(selection.eventId, [
      ...(selectionGroupsByEventId.get(selection.eventId) ?? []),
      selection,
    ])
  })

  return Array.from(selectionGroupsByEventId.values()).filter(isBetslipTurboSelectionGroupEligible).length
}

export const getBetslipTurboEligibleSelectionCount = (selections: BetslipSelection[]) => (
  hasBetslipTurboBlockedByPromotionSelection(selections)
    ? 0
    : getBetslipTurboEligibleSelectionCountIgnoringPromotions(selections)
)

export const getBetslipTurboBonusPercent = (selectionCount: number) => {
  const normalizedSelectionCount = Math.floor(selectionCount)

  if (normalizedSelectionCount < turboBonusMinSelectionCount) return null
  if (normalizedSelectionCount <= turboBonusLinearStartSelectionCount) {
    return (normalizedSelectionCount - 2) * 5
  }

  const cappedSelectionCount = Math.min(normalizedSelectionCount, turboBonusMaxSelectionCount)
  const progress = (
    (cappedSelectionCount - turboBonusLinearStartSelectionCount)
    / (turboBonusMaxSelectionCount - turboBonusLinearStartSelectionCount)
  )

  return roundToNearestFive(
    turboBonusLinearStartPercent
    + progress * (turboBonusMaxPercent - turboBonusLinearStartPercent)
  )
}

export const getBetslipTurboBonusCents = ({
  bonusPercent,
  potentialWinCents,
  stakeCents,
}: {
  bonusPercent: number | null
  potentialWinCents: number
  stakeCents: number
}) => {
  if (!bonusPercent || stakeCents <= 0 || potentialWinCents <= 0) return 0

  const boostedPotentialWinCents = Math.round(
    potentialWinCents * (1 + bonusPercent / 100)
  )

  return Math.max(0, boostedPotentialWinCents - potentialWinCents)
}

export const getBetslipTurboMaxSelectionCount = () => turboBonusMaxSelectionCount
