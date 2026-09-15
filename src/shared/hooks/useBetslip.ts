import { useContext } from 'react'

import { BetslipContext } from './betslipContext'

export function useBetslip() {
  const value = useContext(BetslipContext)
  if (!value) throw new Error('useBetslip must be used within BetslipProvider')

  return value
}
