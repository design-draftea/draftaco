import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'
import '../PreMatchSection/PreMatchSection.css'
import '../CalendarSection/CalendarSection.css'
import './CompetitionCalendar.css'
import { useHomeMarketStickyState } from '../../shared/hooks/useHomeMarketStickyVisible'
import { createBetslipSelection, getBetslipEventId, getMatchOddBetslipKey } from '../../shared/hooks/betslipUtils'
import { useOddSelection } from '../../shared/hooks/useOddSelection'
import { useSlidingActiveIndicator } from '../../shared/hooks/useSlidingActiveIndicator'

import iconAoVivo from '../../assets/iconAoVivo.png'
import pagamentoAntecipado from '../../assets/pagamentoAntecipado.png'
import { TeamLogo } from '../TeamLogo'

import type { CompetitionMatch } from './competitionData'

const footballMarketChips = [
  { id: 'resultado-final', label: 'Resultado Final' },
  { id: 'dupla-chance', label: 'Dupla Chance' },
  { id: 'ambos-marcam', label: 'Ambos Marcam' },
  { id: 'total-gols', label: 'Total de Gols' },
]

const basketballMarketChips = [
  { id: 'vencedor', label: 'Resultado Final' },
  { id: 'total-pontos', label: 'Total de Pontos' },
  { id: 'handicap', label: 'Handicap' },
]

interface CompetitionCalendarProps {
  sport: string
  competitionId?: string
  competitionName?: string
  matches: CompetitionMatch[]
}

const tickLive = (time: string) => {
  const halfMatch = time.match(/(\d)T (\d+):(\d+)/)
  if (halfMatch) {
    let mm = Number(halfMatch[2])
    let ss = Number(halfMatch[3]) + 1
    if (ss >= 60) { ss = 0; mm += 1 }
    return `${halfMatch[1]}T ${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }
  const qMatch = time.match(/Q(\d) (\d+):(\d+)/)
  if (qMatch) {
    let mm = Number(qMatch[2])
    let ss = Number(qMatch[3]) - 1
    if (ss < 0) { ss = 59; mm = Math.max(0, mm - 1) }
    return `Q${qMatch[1]} ${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }
  return time
}

export function CompetitionCalendar({ sport, competitionId, competitionName, matches }: CompetitionCalendarProps) {
  const marketChips = sport === 'basquete' ? basketballMarketChips : footballMarketChips

  const [activeMarket, setActiveMarket] = useState(marketChips[0].id)
  const getOddButtonProps = useOddSelection('prematch-section__odd-btn')

  const sectionRef = useRef<HTMLElement>(null)
  const marketChipsRef = useRef<HTMLDivElement>(null)
  const marketChipRefs = useRef<(HTMLButtonElement | null)[]>([])
  const marketStickyState = useHomeMarketStickyState(sectionRef, marketChipsRef)
  const activeMarketChipIndex = marketChips.findIndex((chip) => chip.id === activeMarket)
  const marketIndicatorKey = `${sport}:${activeMarket}:${marketChips.map((chip) => chip.id).join('|')}`

  const [liveTimes, setLiveTimes] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    matches.forEach((m) => {
      if (m.isLive && m.liveTime) map[m.id] = m.liveTime
    })
    return map
  })

  useEffect(() => {
    const i = setInterval(() => {
      setLiveTimes((current) => {
        const next: Record<string, string> = {}
        Object.keys(current).forEach((k) => { next[k] = tickLive(current[k]) })
        return next
      })
    }, 1000)
    return () => clearInterval(i)
  }, [])

  useSlidingActiveIndicator({
    activeKey: marketIndicatorKey,
    containerRef: marketChipsRef,
    getActiveElement: () => marketChipRefs.current[activeMarketChipIndex],
  })

  const live = matches.filter((m) => m.isLive).slice(0, 3)
  const preMatch = matches.filter((m) => !m.isLive).slice(0, 5)
  const ordered = [...live, ...preMatch]

  const scrollChipIntoView = (chipsRef: RefObject<HTMLDivElement | null>, chipEl: HTMLButtonElement | null) => {
    const containerEl = chipsRef.current
    if (!chipEl || !containerEl) return
    const chipLeft = chipEl.offsetLeft
    const chipWidth = chipEl.offsetWidth
    const containerWidth = containerEl.offsetWidth
    const containerScroll = containerEl.scrollLeft
    const padding = 20
    if (chipLeft + chipWidth > containerScroll + containerWidth - padding) {
      containerEl.scrollTo({ left: chipLeft - padding, behavior: 'smooth' })
    } else if (chipLeft < containerScroll + padding) {
      containerEl.scrollTo({ left: chipLeft - padding, behavior: 'smooth' })
    }
  }

  const renderOdds = (m: CompetitionMatch) => {
    const eventId = getBetslipEventId({
      sport,
      homeTeam: m.homeName,
      awayTeam: m.awayName,
    })
    const marketLabel = marketChips.find((chip) => chip.id === activeMarket)?.label
    const liveClock = liveTimes[m.id] ?? m.liveTime
    const renderOddButton = (outcomeId: string, label: ReactNode, value: ReactNode) => {
      const betslipKey = getMatchOddBetslipKey({
        sport,
        homeTeam: m.homeName,
        awayTeam: m.awayName,
        marketId: activeMarket,
        outcomeId,
        label,
      })

      return (
        <button
          {...getOddButtonProps(
            `${betslipKey.groupId}:${betslipKey.outcomeId}`,
            betslipKey.groupId,
            'prematch-section__odd-btn',
            createBetslipSelection({
              eventId,
              marketId: betslipKey.marketId,
              outcomeId: betslipKey.outcomeId,
              label,
              odd: value,
              marketLabel,
              eventStatus: m.isLive ? 'live' : 'prematch',
              sport,
              leagueId: competitionId,
              leagueName: competitionName,
              homeTeam: m.homeName,
              awayTeam: m.awayName,
              eventTimeLabel: m.isLive ? liveClock : m.dateTime,
              liveClock,
              homeScore: m.homeScore,
              awayScore: m.awayScore,
              badgeType: m.earlyPayout ? 'boost' : undefined,
            })
          )}
        >
          <span className="prematch-section__odd-team">{label}</span>
          <span className="prematch-section__odd-value">{value}</span>
        </button>
      )
    }

    if (sport === 'basquete' || activeMarket === 'vencedor') {
      return (
        <>
          {renderOddButton('home', m.homeName, m.odds.home)}
          {renderOddButton('away', m.awayName, m.odds.away)}
        </>
      )
    }
    return (
      <>
        {renderOddButton('home', m.homeName, m.odds.home)}
        {renderOddButton('draw', 'Empate', m.odds.draw ?? '-')}
        {renderOddButton('away', m.awayName, m.odds.away)}
      </>
    )
  }

  const renderTeamLogo = (teamName: string, currentLogo: string, side: 'home' | 'away') => {
    const fallbackModifier = sport === 'basquete' ? 'basketball' : 'sport'

    return (
      <TeamLogo
        teamName={teamName}
        currentLogo={currentLogo}
        sport={sport}
        className="prematch-section__team-icon"
        fallbackClassName={`prematch-section__team-icon--${fallbackModifier}-${side}`}
        placeholderClassName="prematch-section__team-icon--placeholder"
      />
    )
  }

  return (
    <section className="prematch-section calendar-section competition-calendar" ref={sectionRef}>
      <div className="prematch-section__header">
        <div className="prematch-section__title">
          <span>Jogos em destaque</span>
        </div>
      </div>

      <div
        className={[
          'prematch-section__chips',
          'prematch-section__chips--sticky',
          'sliding-chip-group',
          'sliding-chip-group--indicator-ready',
          marketStickyState.isStuck ? 'prematch-section__chips--sticky-stuck' : '',
          marketStickyState.isVisible ? '' : 'prematch-section__chips--sticky-hidden',
        ].filter(Boolean).join(' ')}
        ref={marketChipsRef}
      >
        <span className="sliding-chip-indicator" aria-hidden="true" />
        {marketChips.map((chip, index) => (
          <button
            key={chip.id}
            ref={(el) => { marketChipRefs.current[index] = el }}
            className={`prematch-section__chip prematch-section__chip--market sliding-chip ${activeMarket === chip.id ? 'prematch-section__chip--active' : ''}`}
            onClick={() => {
              setActiveMarket(chip.id)
              scrollChipIntoView(marketChipsRef, marketChipRefs.current[index])
            }}
          >
            <span data-text={chip.label}>{chip.label}</span>
          </button>
        ))}
      </div>

      <div className="competition-calendar__matches">
        {ordered.map((m) => (
          <div key={m.id} className={`prematch-section__match ${m.isLive ? 'competition-calendar__match--live' : ''}`}>
            <div className="prematch-section__match-header">
              <div className="prematch-section__teams-compact">
                {m.isLive && (
                  <div className="competition-calendar__live-row">
                    <div className="calendar-section__tag-aovivo">
                      <div className="calendar-section__tag-icon-wrapper">
                        <img src={iconAoVivo} alt="" className="calendar-section__tag-icon" />
                      </div>
                      <span>Ao Vivo</span>
                    </div>
                    <span className="competition-calendar__live-time">{liveTimes[m.id] ?? m.liveTime}</span>
                  </div>
                )}
                <div className="prematch-section__team-row">
                  {renderTeamLogo(m.homeName, m.homeIcon, 'home')}
                  <span className="prematch-section__team-name">{m.homeName}</span>
                  {m.isLive && (
                    <span className="competition-calendar__score">{m.homeScore ?? 0}</span>
                  )}
                </div>
                <div className="prematch-section__team-row">
                  {renderTeamLogo(m.awayName, m.awayIcon, 'away')}
                  <span className="prematch-section__team-name">{m.awayName}</span>
                  {m.isLive && (
                    <span className="competition-calendar__score">{m.awayScore ?? 0}</span>
                  )}
                </div>
              </div>
              {!m.isLive && (
                <div className="prematch-section__match-info">
                  <div className="prematch-section__match-info-content">
                    {m.earlyPayout && (
                      <div className="prematch-section__pag-antecipado">
                        <span className="prematch-section__pag-antecipado-label">Pag. Antecipado</span>
                        <img src={pagamentoAntecipado} alt="" className="prematch-section__rei-antecipa" />
                      </div>
                    )}
                    <span className="prematch-section__match-datetime">{m.dateTime}</span>
                  </div>
                  <CaretRightIcon aria-hidden="true" className="prematch-section__match-arrow" weight="bold" />
                </div>
              )}
              {m.isLive && (
                <CaretRightIcon aria-hidden="true" className="prematch-section__match-arrow competition-calendar__live-arrow" weight="bold" />
              )}
            </div>

            <div className="prematch-section__odds">
              {renderOdds(m)}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
