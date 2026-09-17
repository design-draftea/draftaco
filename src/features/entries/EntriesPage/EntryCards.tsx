// Cards da tela Entradas, portados do protótipo Pulse.
// Esta é a implementação ANTERIOR ao redesenho — o layout que o Pulse guardou
// em src/components/OpenEntries/legacy/LegacyEntryCards.tsx. Só o layout veio:
// os botões não têm ação e nada aqui está ligado a dados reais.
import arrowDownRed from '../../../assets/arrowDownRed.svg'
import badgeGanhador from '../../../assets/badgeGanhador.svg'
import entryCardLight from '../../../assets/entryCardLight.svg'
import entryPriceUp from '../../../assets/entryPriceUp.svg'
import entrySeparator from '../../../assets/entrySeparator.svg'
import iconDoubleChevronsDown from '../../../assets/iconDoubleChevronsDown.svg'
import iconDoubleChevronsUp from '../../../assets/iconDoubleChevronsUp.svg'
import { LiveIndicator } from '../../../components/LiveIndicator'
import type {
  EntrySide,
  OpenEntrySummary,
  SettledEntrySummary,
} from '../../../data/entries'

const payoutFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
})
const amountFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2,
})
const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
})
const deltaFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
})
const participationFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0, maximumFractionDigits: 2,
})
const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit', month: '2-digit', year: 'numeric',
})
const timeFormatter = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit', minute: '2-digit', hour12: false,
})
const formatPrice = (value: number | null) => (
  value === null ? '—' : priceFormatter.format(value)
)

export interface OpenEntryCardProps {
  entry: OpenEntrySummary
  startTime: string
  endTime: string
  minutes: string
  seconds: string
  targetPrice: number | null
  currentPrice: number | null
}

export function OpenEntryCard({
  entry,
  startTime,
  endTime,
  minutes,
  seconds,
  targetPrice,
  currentPrice,
}: OpenEntryCardProps) {
  const priceDelta = targetPrice === null || currentPrice === null
    ? null
    : currentPrice - targetPrice
  const hasPriceDirection = priceDelta !== null && priceDelta !== 0
  const isPriceUp = priceDelta !== null && priceDelta > 0

  return (
    <article className="open-entry-card" data-entry-side={entry.side}>
      <img className="open-entry-card__light" src={entryCardLight} alt="" aria-hidden="true" />
      <header className="open-entry-card__summary">
        <div className="open-entry-card__potential">
          <strong>{payoutFormatter.format(entry.potentialPayoutCents / 100)}</strong>
          <span>Ganancia potencial</span>
        </div>
        <div className="open-entry-card__summary-details">
          <span>Monto: {amountFormatter.format(entry.amountCents / 100)}</span>
          <span>Precio promedio {Math.round(entry.averagePriceCents)}¢</span>
        </div>
      </header>
      <div className="open-entry-card__body">
        <div className="open-entry-card__meta">
          <span className="open-entry-card__live"><LiveIndicator />LIVE</span>
          <img className="open-entry-card__separator" src={entrySeparator} alt="" aria-hidden="true" />
          <span>{startTime} - {endTime}</span>
          <img className="open-entry-card__separator" src={entrySeparator} alt="" aria-hidden="true" />
          <span className="open-entry-card__countdown">Termina en: {minutes}:{seconds}</span>
        </div>
        <div className="open-entry-card__position">
          <strong>
            COMPRA EN{' '}
            <span className={`open-entry-card__side open-entry-card__side--${entry.side}`}>
              {entry.side.toUpperCase()}
            </span>
          </strong>
          <span>{participationFormatter.format(entry.participations)} participaciones</span>
        </div>
        <div className="open-entry-card__prices">
          <div className="open-entry-card__target-price">
            <span>Precio objetivo</span><strong>{formatPrice(targetPrice)}</strong>
          </div>
          <div className="open-entry-card__current-price">
            <div className="open-entry-card__current-title">
              <span>Precio actual</span>
              {hasPriceDirection && (
                <span className={`open-entry-card__delta open-entry-card__delta--${isPriceUp ? 'up' : 'down'}`}>
                  <img src={isPriceUp ? entryPriceUp : arrowDownRed} alt="" aria-hidden="true" />
                  {deltaFormatter.format(Math.abs(priceDelta ?? 0))}
                </span>
              )}
            </div>
            <strong>{formatPrice(currentPrice)}</strong>
          </div>
        </div>
      </div>
      <footer className="open-entry-card__actions">
        <button className="open-entry-card__button open-entry-card__button--secondary" type="button">
          Ver mercado
        </button>
        <button className="open-entry-card__button open-entry-card__button--primary" type="button">
          Vender
        </button>
      </footer>
    </article>
  )
}

export function SettledEntryCard({ entry }: { entry: SettledEntrySummary }) {
  const headlineValue = entry.outcome === 'sold'
    ? entry.payoutCents / 100
    : entry.participations
  const potentialPayout = payoutFormatter.format(headlineValue).replace('$', '')
  const averagePriceCents = entry.participations > 0
    ? entry.amountCents / entry.participations
    : 0
  const resultSide: EntrySide = entry.targetPrice !== null && entry.finalPrice !== null
    ? entry.finalPrice > entry.targetPrice ? 'up' : 'down'
    : entry.outcome === 'lost'
      ? entry.side === 'up' ? 'down' : 'up'
      : entry.side
  const isSold = entry.outcome === 'sold'
  const salePriceCents = isSold && entry.participations > 0
    ? entry.payoutCents / entry.participations
    : 0
  const statusLabel = entry.outcome === 'lost'
    ? 'NO GANADOR'
    : isSold ? 'VENTA' : 'CANCELADO'

  return (
    <article
      className={`won-entry-card won-entry-card--${entry.outcome}`}
      data-entry-side={entry.side}
      data-result-side={resultSide}
    >
      <img className="won-entry-card__light" src={entryCardLight} alt="" aria-hidden="true" />
      <header className="won-entry-card__summary">
        <div className="won-entry-card__payout-row">
          <span className="won-entry-card__payout"><span>$</span><strong>{potentialPayout}</strong></span>
          {entry.outcome === 'won' ? (
            <span className="won-entry-card__badge" aria-label="¡GANADOR!">
              <img src={badgeGanhador} alt="" aria-hidden="true" /><strong>¡GANADOR!</strong>
            </span>
          ) : <span className="won-entry-card__status-badge">{statusLabel}</span>}
        </div>
        <div className="won-entry-card__summary-details">
          <span>Monto: <strong>{amountFormatter.format(entry.amountCents / 100)}</strong></span>
          <span>{isSold ? `Precio de venta ${Math.round(salePriceCents)}¢` : `Precio promedio ${Math.round(averagePriceCents)}¢`}</span>
        </div>
      </header>
      <div className="won-entry-card__body">
        <div className="won-entry-card__meta">
          <span>{dateFormatter.format(entry.roundStart)}</span>
          <img src={entrySeparator} alt="" aria-hidden="true" />
          <span>{timeFormatter.format(entry.roundStart)} - {timeFormatter.format(entry.roundEnd)}</span>
        </div>
        <div className="won-entry-card__position">
          <strong>
            {isSold ? 'VENTA EN' : 'COMPRA EN'}{' '}
            <span className={`open-entry-card__side--${entry.side}`}>{entry.side.toUpperCase()}</span>
          </strong>
          <span>{participationFormatter.format(entry.participations)} participaciones</span>
        </div>
        <div className="won-entry-card__prices">
          <div className="won-entry-card__target-price">
            <span>Precio objetivo</span><strong>{formatPrice(entry.targetPrice)}</strong>
          </div>
          {!isSold && (
            <div className="won-entry-card__final-price">
              <span>Precio final</span><strong>{formatPrice(entry.finalPrice)}</strong>
            </div>
          )}
          {!isSold && (
            <span className={`won-entry-card__result won-entry-card__result--${resultSide}`}>
              <img src={resultSide === 'up' ? iconDoubleChevronsUp : iconDoubleChevronsDown} alt={resultSide === 'up' ? 'Resultado arriba' : 'Resultado abajo'} />
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
