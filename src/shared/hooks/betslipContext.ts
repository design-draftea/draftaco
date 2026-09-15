import { createContext } from 'react'

import type { BetslipSelection, BetslipSummary } from './betslipUtils'

export interface BetslipContextValue {
  selections: BetslipSelection[]
  selectedSelectionIdsByGroup: Record<string, string>
  summary: BetslipSummary
  isTurboBoostEnabled: boolean
  addSelection: (groupId: string, selection: BetslipSelection) => void
  toggleSelections: (entries: Array<{ groupId: string; selection: BetslipSelection }>) => void
  toggleSelection: (groupId: string, selection: BetslipSelection) => void
  removeSelection: (selectionId: string) => void
  setTurboBoostEnabled: (isEnabled: boolean) => void
  clearSelections: () => void
}

export const BetslipContext = createContext<BetslipContextValue | null>(null)
