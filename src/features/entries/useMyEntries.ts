// Entradas da pessoa nesta sessão: as apostas feitas (Próximas) e as que ela encerrou
// (Encerradas). Fica no App, e não na tela Entradas, para o encerramento continuar
// mesmo se a pessoa sair da tela no meio dele. Só em memória, como o betslip e o login.
import { useCallback, useEffect, useRef, useState } from 'react'

import type { EntryCashOutStatus, EntrySummary } from '../../data/entries'
import type { BetSuccessReceipt } from '../betslip/BetSuccessPage'
import { createEntryFromReceipt } from './createEntryFromReceipt'

// Tempos do encerramento: carregamento no botão, confirmação visível no card aberto, o
// card recolhido antes de sair e a saída animada de Próximas (a mesma duração do
// accordion do card).
const CASH_OUT_PROCESSING_MS = 2000
const CASH_OUT_CONFIRMED_MS = 1400
// Recolhida, a encerrada fica um tempo parada em Próximas antes de sair e os cards de
// baixo subirem — pedido da pessoa responsável (era 1,6s).
const CASH_OUT_SETTLED_MS = 3000
const CASH_OUT_LEAVING_MS = 360

interface MyEntries {
  open: EntrySummary[]
  cashedOut: EntrySummary[]
}

export function useMyEntries() {
  const [entries, setEntries] = useState<MyEntries>({ open: [], cashedOut: [] })
  const timersRef = useRef<number[]>([])

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const addFromReceipt = useCallback((receipt: BetSuccessReceipt) => {
    setEntries((atual) => ({ ...atual, open: [createEntryFromReceipt(receipt), ...atual.open] }))
  }, [])

  const setCashOutStatus = useCallback((entryId: string, status: EntryCashOutStatus) => {
    setEntries((atual) => ({
      ...atual,
      open: atual.open.map((entry) => (entry.id === entryId ? { ...entry, cashOutStatus: status } : entry)),
    }))
  }, [])

  // Uma atualização só tira de Próximas e põe no topo de Encerradas.
  const moveToCashedOut = useCallback((entryId: string) => {
    setEntries((atual) => {
      const entry = atual.open.find((item) => item.id === entryId)
      if (!entry) return atual

      return {
        open: atual.open.filter((item) => item.id !== entryId),
        cashedOut: [{ ...entry, outcome: 'cashed-out', cashOutStatus: undefined }, ...atual.cashedOut],
      }
    })
  }, [])

  const cashOut = useCallback((entryId: string) => {
    const agendar = (delay: number, action: () => void) => {
      timersRef.current.push(window.setTimeout(action, delay))
    }

    const fimDoCarregamento = CASH_OUT_PROCESSING_MS
    const fimDaConfirmacao = fimDoCarregamento + CASH_OUT_CONFIRMED_MS
    const inicioDaSaida = fimDaConfirmacao + CASH_OUT_SETTLED_MS

    setCashOutStatus(entryId, 'processing')
    agendar(fimDoCarregamento, () => setCashOutStatus(entryId, 'closed'))
    // Encerrada, o card se recolhe e sai de Próximas já recolhido.
    agendar(fimDaConfirmacao, () => setCashOutStatus(entryId, 'settled'))
    agendar(inicioDaSaida, () => setCashOutStatus(entryId, 'leaving'))
    agendar(inicioDaSaida + CASH_OUT_LEAVING_MS, () => moveToCashedOut(entryId))
  }, [moveToCashedOut, setCashOutStatus])

  return {
    openEntries: entries.open,
    cashedOutEntries: entries.cashedOut,
    addFromReceipt,
    cashOut,
  }
}
