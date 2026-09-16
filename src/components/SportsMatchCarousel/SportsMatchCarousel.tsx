import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { MonitorPlayIcon } from '@phosphor-icons/react'
import './SportsMatchCarousel.css'
import {
  getCompetitionLiveEventMatch,
  updateCompetitionMatchTime,
  type DisplayedCompetitionEvent,
} from '../CalendarSection'
import type { LiveEventOpenPayload, LiveEventRailItem } from '../../features/sports/LiveEventPage'
import { hasNflLiveClock, useNflLiveFeed } from '../../features/sports/NflLiveFeed'
import { getTeamLogo } from '../../data/teamLogos'
import { TeamLogo } from '../TeamLogo'
import iconAoVivo from '../../assets/iconAoVivo.png'

interface SportsMatchCarouselProps {
  events: DisplayedCompetitionEvent[]
  matchTimes?: Record<string, string>
  resetKey?: string
  competitionMode?: boolean
  isCollapsed?: boolean
  onLiveMatchClick?: (payload: LiveEventOpenPayload) => void
}

const getEventsKey = (events: DisplayedCompetitionEvent[]) =>
  events.map(({ league, event }) => `${league.id}:${event.id}:${event.dateTime}`).join('|')

const getInitialLiveTimes = (events: DisplayedCompetitionEvent[]) =>
  events.reduce<Record<string, string>>((times, { event }) => {
    if (event.isLive) times[event.id] = event.dateTime
    return times
  }, {})

const SPORTS_MATCH_VISIBLE_CARDS = 2.5
const liveEventSports = new Set(['futebol', 'basquete'])

const readCssPixelValue = (styles: CSSStyleDeclaration, property: string, fallback: number) => {
  const value = Number.parseFloat(styles.getPropertyValue(property))
  return Number.isFinite(value) ? value : fallback
}

const getShortLeagueName = (name: string) => {
  const withoutCountry = name
    .replace(/^Brasil - /, '')
    .replace(/^Inglaterra - /, '')
    .replace(/^Espanha - /, '')
    .replace(/^Alemanha - /, '')
    .replace(/^Europa - /, '')

  return withoutCountry === 'Serie A' || withoutCountry === 'Série A'
    ? 'Brasileirão'
    : withoutCountry
}

const getPreMatchLabel = (dateTime: string) => {
  const [datePart, timePart] = dateTime.split(',').map((part) => part.trim())

  if (datePart === 'Hoje' || datePart === 'Amanhã') return datePart
  return timePart || datePart
}

const getCompetitionPreMatchHeader = (dateTime: string) => {
  const [datePart, timePart] = dateTime.split(',').map((part) => part.trim())
  return {
    primary: timePart || datePart,
    secondary: datePart,
  }
}

const getLiveEventRailItem = (
  { league, event }: DisplayedCompetitionEvent,
  currentTimes: Record<string, string>,
  competitionMode: boolean
): LiveEventRailItem => {
  const leagueName = getShortLeagueName(league.name)
  const preMatchHeader = competitionMode
    ? getCompetitionPreMatchHeader(event.dateTime)
    : { primary: getPreMatchLabel(event.dateTime), secondary: leagueName }

  return {
    id: event.id,
    leagueId: league.id,
    leagueName: league.name,
    leagueFlag: league.flag,
    sport: league.sport,
    isLive: !!event.isLive,
    dateTime: event.dateTime,
    currentTime: currentTimes[event.id] ?? event.dateTime,
    headerPrimary: event.isLive ? currentTimes[event.id] ?? event.dateTime : preMatchHeader.primary,
    headerSecondary: event.isLive ? undefined : preMatchHeader.secondary,
    homeTeam: {
      name: event.homeName,
      icon: getTeamLogo(event.homeName),
      score: event.homeScore,
    },
    awayTeam: {
      name: event.awayName,
      icon: getTeamLogo(event.awayName),
      score: event.awayScore,
    },
    odds: event.odds,
  }
}

interface SportsMatchTeamLogoProps {
  teamName: string
  currentLogo: string
  sport: string
  side: 'home' | 'away'
}

function SportsMatchTeamLogo({ teamName, currentLogo, sport, side }: SportsMatchTeamLogoProps) {
  const fallbackModifier = sport === 'basquete' ? 'basketball' : 'sport'

  return (
    <TeamLogo
      teamName={teamName}
      currentLogo={currentLogo}
      sport={sport}
      className="sports-match-carousel__team-icon"
      fallbackClassName={`sports-match-carousel__team-icon--${fallbackModifier}-${side}`}
      placeholderClassName="sports-match-carousel__team-icon sports-match-carousel__team-icon--placeholder"
    />
  )
}

export function SportsMatchCarousel({
  events,
  matchTimes,
  resetKey,
  competitionMode = false,
  isCollapsed = false,
  onLiveMatchClick,
}: SportsMatchCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null)
  const eventsKey = useMemo(() => getEventsKey(events), [events])
  const initialLiveTimes = useMemo(() => getInitialLiveTimes(events), [events])
  const [localLiveTimesState, setLocalLiveTimesState] = useState(() => ({
    key: eventsKey,
    times: initialLiveTimes,
  }))
  // Assina o jogo de NFL que acontece sozinho: sem isto a tela leria o placar certo e só
  // renderizaria de novo quando outro relógio a acordasse, atrasando o lance que chegou.
  useNflLiveFeed()
  const localLiveTimes = localLiveTimesState.key === eventsKey
    ? localLiveTimesState.times
    : initialLiveTimes
  const currentTimes = matchTimes ?? localLiveTimes

  useEffect(() => {
    if (matchTimes || events.length === 0) return

    const interval = setInterval(() => {
      setLocalLiveTimesState((current) => {
        const sourceTimes = current.key === eventsKey ? current.times : initialLiveTimes
        const next: Record<string, string> = {}
        events.forEach(({ event }) => {
          // O jogo de NFL tem relógio próprio. Ver `hasNflLiveClock`.
          if (event.isLive && !hasNflLiveClock(event.id)) {
            next[event.id] = updateCompetitionMatchTime(sourceTimes[event.id] ?? event.dateTime)
          }
        })
        return { key: eventsKey, times: next }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [events, eventsKey, initialLiveTimes, matchTimes])

  useLayoutEffect(() => {
    carouselRef.current?.scrollTo({ left: 0, top: 0, behavior: 'auto' })
  }, [resetKey])

  useLayoutEffect(() => {
    if (events.length === 0) return

    const carouselEl = carouselRef.current
    if (!carouselEl) return

    const updateCardWidth = () => {
      const styles = window.getComputedStyle(carouselEl)
      const sidePadding = readCssPixelValue(styles, '--sports-carousel-track-padding-x', 12)
      const cardGap = readCssPixelValue(styles, '--sports-carousel-card-gap', 8)
      const cardWidth = (carouselEl.clientWidth - sidePadding - cardGap * 2) / SPORTS_MATCH_VISIBLE_CARDS

      carouselEl.style.setProperty('--sports-carousel-card-width', `${Math.max(0, cardWidth)}px`)
    }

    updateCardWidth()

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateCardWidth)
      : null

    resizeObserver?.observe(carouselEl)
    window.addEventListener('resize', updateCardWidth)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateCardWidth)
    }
  }, [events.length])

  if (events.length === 0) return null

  return (
    <div
      className={[
        'sports-match-carousel',
        isCollapsed ? 'sports-match-carousel--collapsed' : '',
      ].filter(Boolean).join(' ')}
      ref={carouselRef}
      aria-label="Jogos"
      aria-hidden={isCollapsed}
    >
      <div className="sports-match-carousel__track">
        {events.map(({ league, event }) => {
          const currentTime = currentTimes[event.id] ?? event.dateTime
          const leagueName = getShortLeagueName(league.name)
          const showLiveScore = event.isLive && league.sport !== 'tenis'
          const preMatchHeader = competitionMode
            ? getCompetitionPreMatchHeader(event.dateTime)
            : { primary: getPreMatchLabel(event.dateTime), secondary: leagueName }
          const canOpenLiveEvent = !isCollapsed && !!onLiveMatchClick && liveEventSports.has(league.sport)
          const openLiveEvent = () => {
            const railEvents = events.map((displayedEvent) => (
              getLiveEventRailItem(displayedEvent, currentTimes, competitionMode)
            ))
            const eventMatches = events.filter(({ league: itemLeague }) => (
              itemLeague.sport === league.sport && liveEventSports.has(itemLeague.sport)
            ))
            const selectedIndex = eventMatches.findIndex(({ league: itemLeague, event: itemEvent }) => (
              itemLeague.id === league.id && itemEvent.id === event.id
            ))
            const payload: LiveEventOpenPayload | null = eventMatches.length > 0
              ? {
                  matches: eventMatches.map(({ league: itemLeague, event: itemEvent }) => (
                    getCompetitionLiveEventMatch(itemEvent, itemLeague.sport, currentTimes, itemLeague)
                  )),
                  selectedIndex: Math.max(0, selectedIndex),
                  leagueName: league.name,
                  leagueFlag: league.flag,
                  sport: league.sport,
                  currentTimes: eventMatches.reduce<Record<string, string>>((times, { event: itemEvent }) => {
                    times[itemEvent.id] = currentTimes[itemEvent.id] ?? itemEvent.dateTime
                    return times
                  }, {}),
                  railEvents,
                }
              : null

            if (payload) onLiveMatchClick?.(payload)
          }
          const handleLiveEventKeyDown = (keyEvent: KeyboardEvent<HTMLElement>) => {
            if (keyEvent.key !== 'Enter' && keyEvent.key !== ' ') return
            keyEvent.preventDefault()
            openLiveEvent()
          }

          return (
            <article
              key={`${league.id}-${event.id}`}
              className={[
                'sports-match-carousel__card',
                event.isLive ? 'sports-match-carousel__card--live' : '',
                canOpenLiveEvent ? 'sports-match-carousel__card--clickable' : '',
              ].filter(Boolean).join(' ')}
              onClick={canOpenLiveEvent ? openLiveEvent : undefined}
              onKeyDown={canOpenLiveEvent ? handleLiveEventKeyDown : undefined}
              role={canOpenLiveEvent ? 'button' : undefined}
              tabIndex={canOpenLiveEvent ? 0 : undefined}
              aria-label={canOpenLiveEvent ? `Abrir ${event.homeName} contra ${event.awayName}` : undefined}
            >
              <div className="sports-match-carousel__card-header">
                {event.isLive ? (
                  <>
                    <div className="sports-match-carousel__live-meta">
                      <span className="sports-match-carousel__live-icon-wrap" aria-hidden="true">
                        <img src={iconAoVivo} alt="" className="sports-match-carousel__live-icon" />
                      </span>
                      <span className="sports-match-carousel__header-primary">{currentTime}</span>
                    </div>
                    <MonitorPlayIcon aria-hidden="true" className="sports-match-carousel__stream-icon" weight="bold" />
                  </>
                ) : (
                  <>
                    <span className="sports-match-carousel__header-primary">{preMatchHeader.primary}</span>
                    <span className="sports-match-carousel__header-secondary">{preMatchHeader.secondary}</span>
                  </>
                )}
              </div>

              <div className="sports-match-carousel__teams">
                  <div className="sports-match-carousel__team-list">
                  <div className="sports-match-carousel__team-row">
                    <SportsMatchTeamLogo
                      teamName={event.homeName}
                      currentLogo={event.homeIcon}
                      sport={league.sport}
                      side="home"
                    />
                    <span className="sports-match-carousel__team-name">{event.homeName}</span>
                  </div>
                  <div className="sports-match-carousel__team-row">
                    <SportsMatchTeamLogo
                      teamName={event.awayName}
                      currentLogo={event.awayIcon}
                      sport={league.sport}
                      side="away"
                    />
                    <span className="sports-match-carousel__team-name">{event.awayName}</span>
                  </div>
                </div>
                {showLiveScore && (
                  <div className="sports-match-carousel__score-column" aria-label="Placar">
                    <span className="sports-match-carousel__team-score">{event.homeScore ?? 0}</span>
                    <span className="sports-match-carousel__team-score">{event.awayScore ?? 0}</span>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
