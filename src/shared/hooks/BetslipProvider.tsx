import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { BetslipContext, type BetslipContextValue } from './betslipContext'
import { requestLocationPermissionGate } from '../utils/locationPermissionGate'
import {
  BETSLIP_STAKE,
  EMPTY_BETSLIP_SUMMARY,
  formatBetslipCurrency,
  formatBetslipOdd,
  isSameBetslipSelection,
  type BetslipSelection,
  type BetslipSummary,
} from './betslipUtils'

interface BetslipState {
  selectionsById: Record<string, BetslipSelection>
  selectedSelectionIdsByGroup: Record<string, string>
}

interface BetslipSelectionEntry {
  groupId: string
  selection: BetslipSelection
}

const EMPTY_BETSLIP_STATE: BetslipState = {
  selectionsById: {},
  selectedSelectionIdsByGroup: {},
}

const addSelectionsToState = (
  current: BetslipState,
  entries: BetslipSelectionEntry[]
): BetslipState => {
  if (entries.length === 0) return current

  const selectedSelectionIdsByGroup = { ...current.selectedSelectionIdsByGroup }
  const selectionIdsToRemove = new Set<string>()
  const markSelectionForRemoval = (selectionId: string) => {
    const currentSelection = current.selectionsById[selectionId]

    if (!currentSelection?.comboId) {
      selectionIdsToRemove.add(selectionId)
      return
    }

    Object.values(current.selectionsById).forEach((selection) => {
      if (selection.comboId === currentSelection.comboId) {
        selectionIdsToRemove.add(selection.id)
      }
    })
  }

  Object.entries(selectedSelectionIdsByGroup).forEach(([currentGroupId, selectionId]) => {
    const currentSelection = current.selectionsById[selectionId]
    const shouldReplace = entries.some(({ selection }) => {
      const isSameMarket = currentSelection
        && currentSelection.eventId === selection.eventId
        && currentSelection.marketId === selection.marketId
      const isSameCombo = currentSelection?.comboId
        && selection.comboId
        && currentSelection.comboId === selection.comboId

      return selectionId === selection.id || isSameMarket || isSameCombo
    })

    if (shouldReplace) {
      delete selectedSelectionIdsByGroup[currentGroupId]
      markSelectionForRemoval(selectionId)
    }
  })

  Object.entries(selectedSelectionIdsByGroup).forEach(([currentGroupId, selectionId]) => {
    if (selectionIdsToRemove.has(selectionId)) delete selectedSelectionIdsByGroup[currentGroupId]
  })

  entries.forEach(({ groupId, selection }) => {
    selectedSelectionIdsByGroup[groupId] = selection.id
  })

  const activeSelectionIds = new Set(Object.values(selectedSelectionIdsByGroup))
  const entrySelectionIds = new Set(entries.map(({ selection }) => selection.id))
  const currentSelections = Object.values(current.selectionsById)
  const firstReplacedSelectionIndex = currentSelections.findIndex((selection) => (
    selectionIdsToRemove.has(selection.id)
  ))
  const remainingSelections = currentSelections.filter((selection) => (
    activeSelectionIds.has(selection.id)
    && !selectionIdsToRemove.has(selection.id)
    && !entrySelectionIds.has(selection.id)
  ))
  const insertionIndex = firstReplacedSelectionIndex === -1
    ? remainingSelections.length
    : Math.min(firstReplacedSelectionIndex, remainingSelections.length)
  const nextSelections = [
    ...remainingSelections.slice(0, insertionIndex),
    ...entries.map(({ selection }) => selection),
    ...remainingSelections.slice(insertionIndex),
  ]
  const selectionsById = Object.fromEntries(
    nextSelections.map((selection) => [selection.id, selection])
  )

  return {
    selectionsById,
    selectedSelectionIdsByGroup,
  }
}

const addSelectionToState = (
  current: BetslipState,
  groupId: string,
  selection: BetslipSelection
): BetslipState => addSelectionsToState(current, [{ groupId, selection }])

export function BetslipProvider({ children }: { children: ReactNode }) {
  const [{ selectionsById, selectedSelectionIdsByGroup }, setBetslipState] = useState<BetslipState>(EMPTY_BETSLIP_STATE)
  const [isTurboBoostEnabled, setTurboBoostEnabled] = useState(true)

  const addSelection = useCallback((groupId: string, selection: BetslipSelection) => {
    if (requestLocationPermissionGate()) return

    setBetslipState((current) => addSelectionToState(current, groupId, selection))
  }, [])

  const toggleSelections = useCallback((entries: BetslipSelectionEntry[]) => {
    if (requestLocationPermissionGate()) return

    setBetslipState((current) => {
      if (entries.length === 0) return current

      const selectedSelectionIds = new Set(Object.values(current.selectedSelectionIdsByGroup))
      const isRemoving = entries.every(({ selection }) => selectedSelectionIds.has(selection.id))

      if (!isRemoving) return addSelectionsToState(current, entries)

      const comboIdsToRemove = new Set(entries.map(({ selection }) => selection.comboId).filter(Boolean))
      const selectionIdsToRemove = new Set(entries.map(({ selection }) => selection.id))

      Object.values(current.selectionsById).forEach((selection) => {
        if (selection.comboId && comboIdsToRemove.has(selection.comboId)) {
          selectionIdsToRemove.add(selection.id)
        }
      })

      const selectedSelectionIdsByGroup = { ...current.selectedSelectionIdsByGroup }

      Object.entries(selectedSelectionIdsByGroup).forEach(([currentGroupId, selectionId]) => {
        if (selectionIdsToRemove.has(selectionId)) delete selectedSelectionIdsByGroup[currentGroupId]
      })

      const selectionsById = { ...current.selectionsById }
      selectionIdsToRemove.forEach((selectionId) => {
        delete selectionsById[selectionId]
      })

      return {
        selectionsById,
        selectedSelectionIdsByGroup,
      }
    })
  }, [])

  const toggleSelection = useCallback((groupId: string, selection: BetslipSelection) => {
    if (requestLocationPermissionGate()) return

    setBetslipState((current) => {
      const selectedEntries = Object.entries(current.selectedSelectionIdsByGroup)
      const isRemoving = selectedEntries.some(([, selectionId]) => (
        isSameBetslipSelection(current.selectionsById[selectionId], selection)
      ))

      if (isRemoving) {
        const selectedSelectionIdsByGroup = { ...current.selectedSelectionIdsByGroup }

        selectedEntries.forEach(([currentGroupId, selectionId]) => {
          if (isSameBetslipSelection(current.selectionsById[selectionId], selection)) {
            delete selectedSelectionIdsByGroup[currentGroupId]
          }
        })

        const selectionsById = { ...current.selectionsById }
        const activeSelectionIds = new Set(Object.values(selectedSelectionIdsByGroup))

        Object.keys(selectionsById).forEach((selectionId) => {
          if (!activeSelectionIds.has(selectionId)) delete selectionsById[selectionId]
        })

        return {
          selectionsById,
          selectedSelectionIdsByGroup,
        }
      }

      return addSelectionToState(current, groupId, selection)
    })
  }, [])

  const removeSelection = useCallback((selectionId: string) => {
    setBetslipState((current) => {
      const selectionIdsToRemove = new Set([selectionId])

      const selectedSelectionIdsByGroup = { ...current.selectedSelectionIdsByGroup }

      Object.entries(selectedSelectionIdsByGroup).forEach(([groupId, currentSelectionId]) => {
        if (selectionIdsToRemove.has(currentSelectionId)) delete selectedSelectionIdsByGroup[groupId]
      })

      const selectionsById = { ...current.selectionsById }
      selectionIdsToRemove.forEach((currentSelectionId) => {
        delete selectionsById[currentSelectionId]
      })

      return {
        selectionsById,
        selectedSelectionIdsByGroup,
      }
    })
  }, [])

  const clearSelections = useCallback(() => {
    setBetslipState(EMPTY_BETSLIP_STATE)
  }, [])

  const selections = useMemo(() => Object.values(selectionsById), [selectionsById])

  const summary = useMemo<BetslipSummary>(() => {
    if (selections.length === 0) return EMPTY_BETSLIP_SUMMARY

    const comboSelectionsById = new Map<string, BetslipSelection[]>()
    const standaloneSelections: BetslipSelection[] = []

    selections.forEach((selection) => {
      if (!selection.comboId) {
        standaloneSelections.push(selection)
        return
      }

      comboSelectionsById.set(selection.comboId, [
        ...(comboSelectionsById.get(selection.comboId) ?? []),
        selection,
      ])
    })

    let totalOdds = standaloneSelections.reduce((total, selection) => total * selection.oddValue, 1)

    comboSelectionsById.forEach((comboSelections) => {
      const firstSelection = comboSelections[0]
      const isCompleteCombo = Boolean(
        firstSelection?.comboTotalOddValue
        && firstSelection.comboLegCount
        && comboSelections.length >= firstSelection.comboLegCount
      )

      totalOdds *= isCompleteCombo
        ? firstSelection.comboTotalOddValue!
        : comboSelections.reduce((comboTotal, selection) => comboTotal * selection.oddValue, 1)
    })

    const potentialWin = BETSLIP_STAKE * totalOdds

    return {
      hasSelections: true,
      selectedOddsCount: selections.length,
      selectionCount: new Set(selections.map((selection) => selection.eventId)).size,
      totalOdds,
      totalOddsLabel: formatBetslipOdd(totalOdds),
      stake: BETSLIP_STAKE,
      stakeLabel: formatBetslipCurrency(BETSLIP_STAKE),
      potentialWin,
      potentialWinLabel: formatBetslipCurrency(potentialWin),
    }
  }, [selections])

  const value = useMemo<BetslipContextValue>(() => ({
    selections,
    selectedSelectionIdsByGroup,
    summary,
    isTurboBoostEnabled,
    addSelection,
    toggleSelections,
    toggleSelection,
    removeSelection,
    setTurboBoostEnabled,
    clearSelections,
  }), [addSelection, clearSelections, isTurboBoostEnabled, removeSelection, selections, selectedSelectionIdsByGroup, summary, toggleSelection, toggleSelections])

  return (
    <BetslipContext.Provider value={value}>
      {children}
    </BetslipContext.Provider>
  )
}
