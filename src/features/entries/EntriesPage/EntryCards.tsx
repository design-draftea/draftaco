// Card da tela Entradas, do nó Figma 1993:6822.
// O miolo — as linhas de seleção — é o mesmo do recibo da tela de sucesso, via
// `betSuccessSelections`. O que é próprio deste card é a moldura: o cabeçalho com
// recolher e compartilhar, o botão de encerrar e o rodapé com data e código.
import { useState } from 'react'

import chevronUp from '../../../assets/iconsDraftaco/chevronUp.svg'
import iconEntryShare from '../../../assets/iconsDraftaco/iconEntryShare.svg'
import { BetSuccessSelectionGroupRow } from '../../betslip/BetSuccessPage/betSuccessSelections'
import { groupSelectionsByEvent } from '../../betslip/BetslipPageV2/betslipDisplayUtils'
import type { EntrySummary } from '../../../data/entries'

// O desenho usa dois pesos no valor: o símbolo em Bold 16 e o número em Black 18.
const separarMoeda = (valor: string) => {
  const casado = valor.match(/^(\D+)\s*(.+)$/)

  return casado ? { simbolo: casado[1].trim(), numero: casado[2] } : { simbolo: '', numero: valor }
}

export function EntryCard({ entry }: { entry: EntrySummary }) {
  const [estaRecolhido, setEstaRecolhido] = useState(false)
  const { simbolo, numero } = separarMoeda(entry.potentialWinLabel)
  const grupos = groupSelectionsByEvent(entry.selections)

  return (
    <article
      className={`entry-card${estaRecolhido ? ' entry-card--collapsed' : ''}`}
      data-node-id="1993:6822"
    >
      <header className="entry-card__header">
        <button
          className="entry-card__collapse"
          type="button"
          aria-expanded={!estaRecolhido}
          aria-label={estaRecolhido ? 'Expandir aposta' : 'Recolher aposta'}
          onClick={() => setEstaRecolhido((anterior) => !anterior)}
        >
          <img src={chevronUp} alt="" aria-hidden="true" />
        </button>

        <div className="entry-card__header-body">
          <div className="entry-card__title">
            <span className="entry-card__payout">
              <span>{simbolo}</span>
              <strong>{numero}</strong>
            </span>
            <span className="entry-card__payout-label">Ganho potencial</span>
            <button className="entry-card__share" type="button" aria-label="Compartilhar aposta">
              <img src={iconEntryShare} alt="" aria-hidden="true" />
            </button>
          </div>

          <div className="entry-card__meta">
            <span>Entrada: <strong>{entry.stakeLabel}</strong></span>
            <span>Odds: <strong>{entry.totalOddsLabel}</strong></span>
          </div>
        </div>
      </header>

      <div className="entry-card__selections">
        {grupos.map((grupo) => (
          <BetSuccessSelectionGroupRow group={grupo} key={grupo.eventId} />
        ))}
      </div>

      {entry.cashOutLabel ? (
        <div className="entry-card__actions">
          <button className="entry-card__cash-out" type="button">
            {entry.cashOutLabel}
          </button>
        </div>
      ) : null}

      <footer className="entry-card__footer">
        <span>{entry.createdAtLabel}</span>
        <span className="entry-card__code">{entry.code}</span>
      </footer>
    </article>
  )
}
