import { useCallback, useState, type ButtonHTMLAttributes, type MouseEvent } from 'react'
import { BETSLIP_ODD_INTERACTION_EVENT, isSameBetslipSelection, type BetslipSelection } from './betslipUtils'
import { useBetslip } from './useBetslip'
import { requestLocationPermissionGate } from '../utils/locationPermissionGate'

type OddButtonProps = Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-pressed' | 'className' | 'onClick' | 'type'
>

export function useOddSelection(defaultClassName: string) {
  const [localSelectedOddsByGroup, setLocalSelectedOddsByGroup] = useState<Record<string, string>>({})
  const { selections, toggleSelection } = useBetslip()

  return useCallback((
    oddId: string,
    groupId = oddId,
    className = defaultClassName,
    betslipSelection?: BetslipSelection
  ): OddButtonProps => {
    const isSelected = betslipSelection
      ? selections.some((selection) => isSameBetslipSelection(selection, betslipSelection))
      : localSelectedOddsByGroup[groupId] === oddId

    return {
      type: 'button',
      className: `${className}${isSelected ? ' odd-button--selected' : ''}`,
      'aria-pressed': isSelected,
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()

        if (requestLocationPermissionGate()) return

        window.dispatchEvent(new CustomEvent(BETSLIP_ODD_INTERACTION_EVENT))

        if (betslipSelection) {
          toggleSelection(groupId, betslipSelection)
          return
        }

        setLocalSelectedOddsByGroup((current) => {
          if (current[groupId] === oddId) {
            const next = { ...current }
            delete next[groupId]
            return next
          }

          return {
            ...current,
            [groupId]: oddId,
          }
        })
      },
    }
  }, [defaultClassName, localSelectedOddsByGroup, selections, toggleSelection])
}
