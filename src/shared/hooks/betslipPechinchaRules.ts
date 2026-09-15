import { normalizeBetslipIdPart, type BetslipSelection } from './betslipUtils'
import { getBetslipSelectionGroupOddsValue } from './betslipTurboBonus'

export const BETSLIP_PECHINCHA_MIN_SELECTION_COUNT = 3
export const BETSLIP_PECHINCHA_MIN_SELECTION_ODD_VALUE = 1.2
export const BETSLIP_PECHINCHA_MIN_TOTAL_ODDS = 3.5

export const BETSLIP_PECHINCHA_MAX_STAKE_RULE_LABEL = 'Entrada max. R$300'
export const BETSLIP_PECHINCHA_SELECTION_RULE_LABEL = 'Min. 3+ seleções de 1.20+'
export const BETSLIP_PECHINCHA_TOTAL_ODDS_RULE_LABEL = 'Odd total mín. 3.50x'
const BETSLIP_PECHINCHA_MESSAGE_MAX_STAKE_RULE_LABEL = 'entrada max. R$300'
const BETSLIP_PECHINCHA_MESSAGE_SELECTION_RULE_LABEL = 'min. 3+ seleções de 1.20+'
const BETSLIP_PECHINCHA_MESSAGE_TOTAL_ODDS_RULE_LABEL = 'odd total mín. 3.50x'
export const BETSLIP_PECHINCHA_RULE_MESSAGE = `Ofertas com Pechincha precisam de ${BETSLIP_PECHINCHA_MESSAGE_MAX_STAKE_RULE_LABEL}, ${BETSLIP_PECHINCHA_MESSAGE_SELECTION_RULE_LABEL} e ${BETSLIP_PECHINCHA_MESSAGE_TOTAL_ODDS_RULE_LABEL}.`

export interface BetslipPechinchaRuleStatus {
  eligibleSelectionCount: number
  hasPechincha: boolean
  isEligible: boolean
  isSelectionCountEligible: boolean
  isTotalOddsEligible: boolean
}

export const isBetslipPechinchaSelection = (selection: BetslipSelection) => {
  const marketId = normalizeBetslipIdPart(selection.marketId)
  const comboTypeLabel = selection.comboTypeLabel
    ? normalizeBetslipIdPart(selection.comboTypeLabel)
    : ''

  return marketId === 'pechincha' || comboTypeLabel === 'pechincha'
}

export const getBetslipPechinchaEligibleSelectionCount = (selections: BetslipSelection[]) => (
  Array.from(
    selections.reduce((groupsByEventId, selection) => {
      groupsByEventId.set(selection.eventId, [
        ...(groupsByEventId.get(selection.eventId) ?? []),
        selection,
      ])

      return groupsByEventId
    }, new Map<string, BetslipSelection[]>()).values()
  ).filter((groupSelections) => (
    getBetslipSelectionGroupOddsValue(groupSelections) > BETSLIP_PECHINCHA_MIN_SELECTION_ODD_VALUE
  )).length
)

export const getBetslipPechinchaRuleStatus = (
  selections: BetslipSelection[],
  totalOdds: number
): BetslipPechinchaRuleStatus => {
  const hasPechincha = selections.some(isBetslipPechinchaSelection)
  const eligibleSelectionCount = getBetslipPechinchaEligibleSelectionCount(selections)
  const isSelectionCountEligible = eligibleSelectionCount >= BETSLIP_PECHINCHA_MIN_SELECTION_COUNT
  const isTotalOddsEligible = totalOdds >= BETSLIP_PECHINCHA_MIN_TOTAL_ODDS

  return {
    eligibleSelectionCount,
    hasPechincha,
    isEligible: hasPechincha && isSelectionCountEligible && isTotalOddsEligible,
    isSelectionCountEligible,
    isTotalOddsEligible,
  }
}
