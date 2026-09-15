import { useEffect, useState } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'
import { createBetslipSelection, getBetslipEventId, getBetslipMarketGroupId, normalizeBetslipIdPart } from '../../shared/hooks/betslipUtils'
import { useOddSelection } from '../../shared/hooks/useOddSelection'
import {
  createGarantidaLewandowskiSelection,
  GARANTIDA_LEWANDOWSKI_GROUP_ID,
} from '../../data/garantidaLewandowskiSelection'
import iconClock from '../../assets/iconsDraftaco/iconClock.svg'
import iconStatistic from '../../assets/iconsDraftaco/iconStatistic.svg'
import adebayoCard from '../../assets/iconsDraftaco/AdebayoCard.png'
import lewandowskiCard from '../../assets/iconsDraftaco/LewandowskiCard.png'
import './BasePromo.css'

const COUNTDOWN_TICK_MS = 1000
const MINUTE_MS = 60 * 1000
type BasePromoVariant = 'garantida' | 'super-aumentada'
type MatchHighlightedSide = 'home' | 'away'

interface BasePromoConfig {
  variant: BasePromoVariant
  sport: 'futebol' | 'basquete'
  tag: string
  playerName: string
  position: string
  market: string
  matchHome: string
  matchAway: string
  matchHighlightedSide?: MatchHighlightedSide
  eventTimeLabel: string
  value: string
  previousValue?: string
  odd: string
  playerImage: string
  countdownMinutes: number
}

const promos: Record<BasePromoVariant, BasePromoConfig> = {
  garantida: {
    variant: 'garantida',
    sport: 'futebol',
    tag: 'GARANTIDA',
    playerName: 'R. Lewandowski',
    position: 'ATA',
    market: 'Finalizações ao gol',
    matchHome: 'BAR',
    matchAway: 'INT',
    eventTimeLabel: 'Hoje, 20:00',
    value: '0.5+',
    previousValue: '3.5',
    odd: '1.85x',
    playerImage: lewandowskiCard,
    countdownMinutes: 137,
  },
  'super-aumentada': {
    variant: 'super-aumentada',
    sport: 'basquete',
    tag: 'SUPER AUMENTADA',
    playerName: 'B. Adebayo',
    position: 'ALA',
    market: 'Pontos',
    matchHome: 'CHI',
    matchAway: 'MIA',
    matchHighlightedSide: 'away',
    eventTimeLabel: 'Hoje, 20:00',
    value: '11.5+',
    odd: '1.85x',
    playerImage: adebayoCard,
    countdownMinutes: 76,
  },
}

function getCountdownParts(remainingMs: number) {
  const totalMinutes = Math.max(0, Math.ceil(remainingMs / MINUTE_MS))

  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  }
}

function formatCountdownSegment(value: number) {
  return String(value).padStart(2, '0')
}

function getMatchTeamClassName(promo: BasePromoConfig, side: MatchHighlightedSide) {
  const highlightedSide = promo.matchHighlightedSide ?? 'home'
  const colorTone = side === highlightedSide ? 'secondary' : 'tertiary'

  return `base-promo__match-team base-promo__match-team--${colorTone}`
}

function Countdown({ deadline, now }: { deadline: number; now: number }) {
  const countdown = getCountdownParts(deadline - now)

  return (
    <span className="base-promo__countdown" aria-label={`${countdown.hours} horas e ${countdown.minutes} minutos`}>
      <img className="base-promo__countdown-icon" src={iconClock} alt="" aria-hidden="true" />
      <span className="base-promo__countdown-text">
        <span>{formatCountdownSegment(countdown.hours)} h</span>
        <span className="base-promo__countdown-separator">:</span>
        <span>{formatCountdownSegment(countdown.minutes)} m</span>
      </span>
    </span>
  )
}

interface BasePromoProps {
  variant?: BasePromoVariant
}

export function BasePromo({ variant = 'garantida' }: BasePromoProps) {
  const promo = promos[variant]
  const [isOpen, setIsOpen] = useState(true)
  const [deadline] = useState(() => Date.now() + promo.countdownMinutes * MINUTE_MS)
  const [now, setNow] = useState(() => Date.now())
  const getOddButtonProps = useOddSelection('base-promo__odd')
  // The boosted promo odd, added to / removed from the real betslip on tap.
  const [oddSelection] = useState(() => (
    promo.variant === 'garantida'
      ? createGarantidaLewandowskiSelection()
      : createBetslipSelection({
        eventId: getBetslipEventId({ sport: promo.sport, homeTeam: promo.matchHome, awayTeam: promo.matchAway }),
        marketId: `${promo.variant}-${normalizeBetslipIdPart(promo.market)}-${normalizeBetslipIdPart(promo.playerName)}`,
        outcomeId: normalizeBetslipIdPart(promo.value),
        label: promo.value,
        odd: promo.odd,
        marketLabel: promo.market,
        selectionType: 'player',
        sport: promo.sport,
        playerName: promo.playerName,
        selectionTeamName: (promo.matchHighlightedSide ?? 'home') === 'away' ? promo.matchAway : promo.matchHome,
        eventName: `${promo.matchHome} vs ${promo.matchAway}`,
        eventTimeLabel: promo.eventTimeLabel,
        playerImage: promo.playerImage,
        badgeType: 'boost',
        promoVariant: promo.variant,
      })
  ))
  const oddGroupId = oddSelection
    ? getBetslipMarketGroupId({ eventId: oddSelection.eventId, marketId: oddSelection.marketId })
    : promo.variant === 'garantida' ? GARANTIDA_LEWANDOWSKI_GROUP_ID : `base-promo-${promo.variant}`
  const oddButtonProps = getOddButtonProps(
    oddSelection?.id ?? `base-promo-${promo.variant}`,
    oddGroupId,
    'base-promo__odd',
    oddSelection,
  )
  const isSelected = oddButtonProps['aria-pressed'] === true

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, COUNTDOWN_TICK_MS)

    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <section
      className={[
        'base-promo',
        `base-promo--${promo.variant}`,
      ].join(' ')}
      aria-label={`Promoção ${promo.tag.toLowerCase()}`}
    >
      <div
        className={[
          'base-promo__accordion',
          isOpen ? '' : 'base-promo__accordion--collapsed',
        ].filter(Boolean).join(' ')}
      >
        <button
          type="button"
          className="base-promo__header"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className="base-promo__badge">
            <strong>{promo.tag}</strong>
          </span>
          <span className="base-promo__toggle" aria-hidden="true">
            <CaretRightIcon className="base-promo__toggle-icon" weight="bold" />
          </span>
        </button>

        <div className="base-promo__body" aria-hidden={!isOpen}>
          <div className="base-promo__markets">
            <div className="base-promo__markets-inner">
              <article className="base-promo__card">
                <span className="base-promo__light" aria-hidden="true" />

                <div className="base-promo__profile" aria-hidden="true">
                  <span className="base-promo__stat-icon">
                    <img src={iconStatistic} alt="" />
                  </span>
                  <span className="base-promo__avatar-shell">
                    <img className="base-promo__avatar" src={promo.playerImage} alt="" />
                  </span>
                </div>

                <div className="base-promo__content">
                  <div className="base-promo__player">
                    <strong>{promo.playerName}</strong>
                    <span>{promo.position}</span>
                  </div>
                  <span className="base-promo__market">{promo.market}</span>
                  <div className="base-promo__match-row">
                    <span className="base-promo__match">
                      <span className={getMatchTeamClassName(promo, 'home')}>{promo.matchHome}</span>
                      <span>vs</span>
                      <span className={getMatchTeamClassName(promo, 'away')}>{promo.matchAway}</span>
                    </span>
                    <Countdown deadline={deadline} now={now} />
                  </div>
                </div>

                <div className="base-promo__boost">
                  {promo.previousValue && <span>{promo.previousValue}</span>}
                  <strong>{promo.value}</strong>
                </div>

                <button
                  type="button"
                  className={[
                    'base-promo__odd',
                    isSelected ? 'base-promo__odd--selected' : '',
                  ].filter(Boolean).join(' ')}
                  aria-pressed={isSelected}
                  tabIndex={isOpen ? undefined : -1}
                  onClick={oddButtonProps.onClick}
                >
                  {promo.odd}
                </button>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
