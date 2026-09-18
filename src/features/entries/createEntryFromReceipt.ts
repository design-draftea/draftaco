// Transforma o recibo de uma aposta confirmada na entrada que aparece em Próximas.
// O recibo é o mesmo que a tela de sucesso mostra, então as seleções chegam como
// ela as desenha — incluindo odds com turbo aplicado.
import type { EntrySummary } from '../../data/entries'
import type { BetSuccessReceipt } from '../betslip/BetSuccessPage'
import { formatMoney } from '../betslip/BetslipPageV2/betslipDisplayUtils'

const caracteresDoCodigo = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

// Mesmo formato dos bilhetes de exemplo: DRFT seguido de 11 caracteres.
const gerarCodigoDoBilhete = () => {
  let codigo = 'DRFT'

  for (let indice = 0; indice < 11; indice += 1) {
    codigo += caracteresDoCodigo[Math.floor(Math.random() * caracteresDoCodigo.length)]
  }

  return codigo
}

const doisDigitos = (valor: number) => String(valor).padStart(2, '0')

const formatarCriadoEm = (ms: number) => {
  const data = new Date(ms)

  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)} (${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())})`
}

export function createEntryFromReceipt(receipt: BetSuccessReceipt): EntrySummary {
  const stakeLabel = formatMoney(receipt.stakeCents)

  return {
    id: `entry-${receipt.createdAtMs}`,
    code: gerarCodigoDoBilhete(),
    createdAtLabel: formatarCriadoEm(receipt.createdAtMs),
    stakeLabel,
    totalOddsLabel: receipt.totalOddsLabel,
    potentialWinLabel: receipt.potentialWinLabel,
    // Antes do jogo, encerrar devolve o valor apostado.
    cashOutValueLabel: stakeLabel,
    selections: receipt.selections,
  }
}
