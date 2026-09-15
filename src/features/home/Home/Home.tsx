import { Fragment, Suspense, lazy, useCallback, useEffect, useRef, useState, useLayoutEffect, useMemo, type ComponentType, type ReactNode } from 'react'
import { HeaderV2 } from '../../../components/HeaderV2'
import { BannerHighlight } from '../../../components/BannerHighlight'
import { ContentFilterChips, type ContentFilterId } from '../../../components/ContentFilterChips'
import { HomeCompetitionSection } from '../../../components/HomeCompetitionSection'
import { HomeOfferCarousel } from '../../../components/HomeOfferCarousel'
import { PromoDraftaco } from '../../promotions/PromoDraftaco'
import { PromotionSection } from '../../../components/PromotionSection'
import {
  getCalendarMarketChipsForSport,
  getCalendarDisplayedEventGroups,
  getCalendarDisplayedEvents,
  getCalendarPlayerPropsForEvent,
  getCompetitionLiveEventOpenPayload,
  getCompetitionPageEvents,
  isCalendarPlayerPropsMarketForSport,
  updateCompetitionMatchTime,
  type CalendarMarketChip,
  type DisplayedCompetitionEvent,
  type DisplayedCompetitionEventGroup,
} from '../../../components/CalendarSection'
import { SportsMatchCarousel } from '../../../components/SportsMatchCarousel'
import { CompetitionPage, useCompetitionMarketSelection } from '../../../components/CompetitionPage'
import { SportRail } from '../../../components/SportRail'
import { CasinoRail } from '../../../components/CasinoRail'
import { CasinoContent, casinoCarouselSections } from '../../../components/CasinoContent'
import { casinoBanners, casinoPromotions, drafteaSportHomeOfferCarouselItemsBySport, sportHomeOfferCarouselItemsBySport } from '../../../data/homeProducts'
import { useFeatureFlags } from '../../../shared/hooks/useFeatureFlags'
import { LiveEventInline, LiveEventInlineHeader } from '../../sports/LiveEventPage'
import type { LiveEventOpenPayload } from '../../sports/LiveEventPage'
import type { CasinoGameOpenPayload } from '../../../components/CasinoContent'
import type { Banner, CasinoCategoryId, HomeCompetitionHighlight, HomeCompetitionMatch, HomeCompetitionOdd, HomeCompetitionPlayerProp, ProductMode } from '../../../shared/types/home'
import { getTeamAbbreviation } from '../../../shared/utils/teamAbbreviations'
import { getRailCompetitionId, type CompetitionLinkTarget } from '../../../shared/utils/competitionNavigation'
import './Home.css'

const CasinoGamePage = lazy(() => import('../../casino/CasinoGamePage').then((m) => ({ default: m.CasinoGamePage })))

const HEADER_COMPACT_SCROLL_TOP = 28
const HEADER_EXPAND_SCROLL_TOP = 4
const HEADER_MORPH_SCROLL_START = 64
const HEADER_EVENT_RAIL_MORPH_SCROLL_START = 0
const HEADER_MORPH_SCROLL_END = 190
const HEADER_COMPETITION_MORPH_SCROLL_END = 112
const HEADER_SNAP_IDLE_MS = 160
const HEADER_SNAP_SETTLE_MS = 420
const HEADER_CONTENT_GAP = 24
const HEADER_CONTENT_GAP_NOVO_TRILHO_HOME = 8
const HEADER_CONTENT_GAP_NOVO_TRILHO_SPORT = 0
const HEADER_CONTENT_GAP_INLINE_EVENT = 0
const EVENT_RAIL_HEIGHT = 112
const EVENT_RAIL_PADDING_BOTTOM = 24
const COMPETITION_EVENT_RAIL_HEIGHT = 48
const COMPETITION_SPORT_RAIL_COLLAPSE_PROGRESS_END = 0.52
const EVENT_RAIL_COLLAPSE_TRANSLATE_Y = -28
const EVENT_RAIL_VISUAL_COLLAPSE_SCROLL_END = 72
const EVENT_RAIL_DISABLE_INTERACTION_PROGRESS = 0.9
const HEADER_TOP_EXPANDED_PADDING_Y = 20
const HEADER_TOP_COMPACT_PADDING_Y = 12
const SPORT_RAIL_EXPANDED_PADDING_BOTTOM = 24
const SPORT_RAIL_COMPACT_PADDING_BOTTOM = 10
const SPORTS_CAROUSEL_EXPANDED_TEAMS_GAP = 4
const SPORTS_CAROUSEL_COMPACT_TEAMS_GAP = 3
const SPORTS_CAROUSEL_EXPANDED_TEAMS_MIN_HEIGHT = 40
const SPORTS_CAROUSEL_COMPACT_TEAMS_MIN_HEIGHT = 34
const SPORTS_CAROUSEL_EXPANDED_TEAM_ROW_HEIGHT = 13
const SPORTS_CAROUSEL_COMPACT_TEAM_ROW_HEIGHT = 12
const MARKET_STICKY_GAP = 12
const MARKET_STICKY_ROW_HEIGHT = 24
const MARKET_STICKY_BG_GAP = 16
const HEADER_BG_TOP_OFFSET = 72
const HIGHLIGHT_HEADER_SCROLLED_BG_HEIGHT = 210

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const smoothStep = (value: number) => value * value * (3 - 2 * value)
const roundCssNumber = (value: number) => Math.round(value * 1000) / 1000
const getScrollProgress = (scrollTop: number, start: number, end: number) =>
  clamp((scrollTop - start) / (end - start), 0, 1)
const interpolate = (from: number, to: number, progress: number) => from + (to - from) * progress
const getStackedHeaderContentOffset = (
  homeEl: HTMLElement,
  headerEl: HTMLElement,
  headerStackSelector: string
) => {
  const headerTopEl = headerEl.querySelector<HTMLElement>('.header__top')
  const sportRailShellEl = headerEl.querySelector<HTMLElement>('.sport-rail-shell')
  const headerStackEl = headerEl.querySelector<HTMLElement>(headerStackSelector)

  if (!headerTopEl || !sportRailShellEl || !headerStackEl) return null

  const homeTop = homeEl.getBoundingClientRect().top
  const headerTopBottom = headerTopEl.getBoundingClientRect().bottom - homeTop
  const sportRailNaturalHeight = Math.max(
    sportRailShellEl.scrollHeight,
    sportRailShellEl.getBoundingClientRect().height
  )
  const headerStackNaturalHeight = Math.max(
    headerStackEl.scrollHeight,
    headerStackEl.getBoundingClientRect().height
  )

  return headerTopBottom +
    sportRailNaturalHeight +
    headerStackNaturalHeight +
    getHeaderContentGap(homeEl)
}
const getInlineEventHeaderContentOffset = (homeEl: HTMLElement, headerEl: HTMLElement) => {
  if (!homeEl.classList.contains('home--event-inline-active')) return null

  const stackedHeaderContentOffset = getStackedHeaderContentOffset(
    homeEl,
    headerEl,
    '.live-event-inline__header-stack'
  )
  if (stackedHeaderContentOffset !== null) return stackedHeaderContentOffset

  const headerTopEl = headerEl.querySelector<HTMLElement>('.header__top')
  const sportRailShellEl = headerEl.querySelector<HTMLElement>('.sport-rail-shell')
  const eventRailEl = headerEl.querySelector<HTMLElement>('.live-event-inline__event-rail')

  if (!headerTopEl || !sportRailShellEl || !eventRailEl) return null

  const homeTop = homeEl.getBoundingClientRect().top
  const headerTopBottom = headerTopEl.getBoundingClientRect().bottom - homeTop
  const sportRailHeight = Math.max(
    sportRailShellEl.scrollHeight,
    sportRailShellEl.getBoundingClientRect().height
  )
  const eventRailHeight = Math.max(
    eventRailEl.scrollHeight,
    eventRailEl.getBoundingClientRect().height
  )

  return headerTopBottom + sportRailHeight + eventRailHeight + getHeaderContentGap(homeEl)
}
const getHeaderContentGap = (homeEl: HTMLElement) => {
  if (homeEl.classList.contains('home--event-inline-active')) {
    return HEADER_CONTENT_GAP_INLINE_EVENT
  }

  if (
    homeEl.classList.contains('home--novo-trilho') &&
    homeEl.classList.contains('home--competition-active') &&
    homeEl.classList.contains('home--content-event-rail-active') &&
    !homeEl.classList.contains('home--casino-active')
  ) {
    return HEADER_CONTENT_GAP_NOVO_TRILHO_SPORT
  }

  if (
    homeEl.classList.contains('home--novo-trilho') &&
    (
      homeEl.classList.contains('home--sport-active') ||
      homeEl.classList.contains('home--competition-active')
    ) &&
    !homeEl.classList.contains('home--casino-active') &&
    !homeEl.classList.contains('home--content-event-rail-active')
  ) {
    return HEADER_CONTENT_GAP_NOVO_TRILHO_SPORT
  }

  if (
    homeEl.classList.contains('home--novo-trilho') &&
    !homeEl.classList.contains('home--casino-active') &&
    !homeEl.classList.contains('home--content-event-rail-active')
  ) {
    return HEADER_CONTENT_GAP_NOVO_TRILHO_HOME
  }

  return HEADER_CONTENT_GAP
}
const marketStickySelector = [
  '.live-section__chips--sticky:not([data-market-sticky-visible="false"])',
  '.prematch-section__chips--sticky:not([data-market-sticky-visible="false"])',
].join(', ')

const SPORT_HEADER_EXPANDED_BG_HEIGHT_SHORTCUT = 210
const SPORT_HEADER_COMPACT_BG_HEIGHT_SHORTCUT = 182
const SHOW_TOP_GAMES_RAIL = false
const ENABLE_HOME_PRODUCT_TOGGLE = false
const ENABLE_HOME_RAIL_LINKS = true
const ENABLE_HOME_RAIL_COMPETITION_LINKS = true
const ENABLE_HOME_TIP_CLICKS = false
const SPORT_FEATURED_PLAYER_PROPS_PER_MARKET = 12
const supportedSportFeaturedIds = new Set(['futebol', 'basquete'])
const supportedSportFeaturedMarketIds = new Set([
  'resultado-final',
  'finalizacao-gol',
  'dupla-chance',
  'assistencias',
  'ambos-marcam',
  'total-gols',
  'escanteios',
  'vencedor',
  'pontos-jogador',
  'total-pontos',
  'handicap',
  'q3-total',
  'q4-total',
])
const basketballSportFeaturedMarketChips: CalendarMarketChip[] = [
  { id: 'principais', label: 'Principais' },
  { id: 'pontos-jogador', label: 'Pontos de jogador' },
  { id: 'q1', label: '1º Quarto' },
  { id: 'q2', label: '2º Quarto' },
  { id: 'assistencias', label: 'Assistências' },
]

const getTeamOddLabel = getTeamAbbreviation

const getCompetitionEventRailKey = (events: DisplayedCompetitionEvent[]) =>
  events.map(({ league, event }) => `${league.id}:${event.id}:${event.dateTime}`).join('|')

const getInitialCompetitionEventRailTimes = (events: DisplayedCompetitionEvent[]) =>
  events.reduce<Record<string, string>>((times, { event }) => {
    if (event.isLive) times[event.id] = event.dateTime
    return times
  }, {})

const getCompetitionEventRailLiveClockLabel = (time: string) => {
  const clockMatch = time.match(/(?:\dT|Q\d)\s+(\d{1,2}:\d{2})/)
  return clockMatch?.[1] ?? time
}

const getCompetitionEventRailPreMatchLabel = (dateTime: string) => {
  const [datePart, timePart] = dateTime.split(',').map((part) => part.trim())
  if (!timePart) return datePart
  return `${datePart} (${timePart})`
}

interface CompetitionEventRailProps {
  events: DisplayedCompetitionEvent[]
  selectedIndex: number | null
  resetKey: string
  onSelectedIndexChange: (index: number | null) => void
  onEventClick?: (index: number, liveTimes: Record<string, string>) => void
}

function CompetitionEventRail({
  events,
  selectedIndex,
  resetKey,
  onSelectedIndexChange,
  onEventClick,
}: CompetitionEventRailProps) {
  const railRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const eventsKey = useMemo(() => getCompetitionEventRailKey(events), [events])
  const initialLiveTimes = useMemo(() => getInitialCompetitionEventRailTimes(events), [events])
  const [liveTimesState, setLiveTimesState] = useState(() => ({
    key: eventsKey,
    times: initialLiveTimes,
  }))
  const liveTimes = liveTimesState.key === eventsKey ? liveTimesState.times : initialLiveTimes
  const activeIndex = selectedIndex === null
    ? -1
    : Math.min(Math.max(selectedIndex, 0), Math.max(events.length - 1, 0))
  const [railFade, setRailFade] = useState({ left: false, right: false })
  const updateRailFadeState = useCallback(() => {
    const railEl = railRef.current
    if (!railEl) {
      setRailFade((current) => (current.left || current.right ? { left: false, right: false } : current))
      return
    }

    const maxScrollLeft = Math.max(0, railEl.scrollWidth - railEl.clientWidth)
    const next = {
      left: railEl.scrollLeft > 1,
      right: railEl.scrollLeft < maxScrollLeft - 1,
    }

    setRailFade((current) => (
      current.left === next.left && current.right === next.right ? current : next
    ))
  }, [])

  useEffect(() => {
    if (events.length === 0) return

    const interval = window.setInterval(() => {
      setLiveTimesState((current) => {
        const sourceTimes = current.key === eventsKey ? current.times : initialLiveTimes
        const next: Record<string, string> = {}

        events.forEach(({ event }) => {
          if (event.isLive) {
            next[event.id] = updateCompetitionMatchTime(sourceTimes[event.id] ?? event.dateTime)
          }
        })

        return { key: eventsKey, times: next }
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [events, eventsKey, initialLiveTimes])

  useLayoutEffect(() => {
    onSelectedIndexChange(null)
    railRef.current?.scrollTo({ left: 0, top: 0, behavior: 'auto' })
    window.requestAnimationFrame(updateRailFadeState)
  }, [onSelectedIndexChange, resetKey, updateRailFadeState])

  useLayoutEffect(() => {
    if (events.length === 0 || activeIndex < 0) return

    const railEl = railRef.current
    const itemEl = itemRefs.current[activeIndex]
    if (!railEl || !itemEl) return

    const maxScrollLeft = Math.max(0, railEl.scrollWidth - railEl.clientWidth)
    const centeredLeft = itemEl.offsetLeft - (railEl.clientWidth - itemEl.offsetWidth) / 2
    const targetLeft = activeIndex === 0
      ? 0
      : activeIndex === events.length - 1
        ? maxScrollLeft
        : Math.min(maxScrollLeft, Math.max(0, centeredLeft))

    railEl.scrollTo({ left: targetLeft, top: 0, behavior: 'smooth' })
    window.requestAnimationFrame(updateRailFadeState)
    window.setTimeout(updateRailFadeState, 260)
  }, [activeIndex, events.length, updateRailFadeState])

  useLayoutEffect(() => {
    updateRailFadeState()
  }, [events.length, updateRailFadeState])

  useEffect(() => {
    const railEl = railRef.current
    if (!railEl) return undefined

    let animationFrame = 0
    const scheduleRailFadeUpdate = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      animationFrame = window.requestAnimationFrame(updateRailFadeState)
    }

    railEl.addEventListener('scroll', scheduleRailFadeUpdate, { passive: true })
    window.addEventListener('resize', scheduleRailFadeUpdate)
    updateRailFadeState()

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      railEl.removeEventListener('scroll', scheduleRailFadeUpdate)
      window.removeEventListener('resize', scheduleRailFadeUpdate)
    }
  }, [eventsKey, updateRailFadeState])

  if (events.length === 0) return null

  return (
    <div className="competition-event-rail">
      <button
        type="button"
        className={[
          'competition-event-rail__all',
          selectedIndex === null ? 'competition-event-rail__all--active' : '',
        ].filter(Boolean).join(' ')}
        onClick={() => onSelectedIndexChange(null)}
        aria-pressed={selectedIndex === null}
      >
        <span className="competition-event-rail__all-label">TODOS</span>
      </button>
      <div
        className={[
          'competition-event-rail__scroll',
          railFade.left ? 'competition-event-rail__scroll--fade-left' : '',
          railFade.right ? 'competition-event-rail__scroll--fade-right' : '',
        ].filter(Boolean).join(' ')}
        ref={railRef}
        aria-label="Jogos do campeonato"
      >
        <div className="competition-event-rail__track">
          {events.map(({ event }, index) => {
            const isActive = index === activeIndex
            const matchup = `${getTeamOddLabel(event.homeName)} vs ${getTeamOddLabel(event.awayName)}`
            const displayTime = liveTimes[event.id] ?? event.dateTime

            return (
              <button
                key={event.id}
                ref={(element) => { itemRefs.current[index] = element }}
                type="button"
                className={[
                  'competition-event-rail__item',
                  event.isLive ? 'competition-event-rail__item--live' : 'competition-event-rail__item--prematch',
                  isActive ? 'competition-event-rail__item--active' : '',
                ].filter(Boolean).join(' ')}
                aria-label={`${event.homeName} contra ${event.awayName}`}
                aria-pressed={isActive}
                onClick={() => {
                  onSelectedIndexChange(index)
                  onEventClick?.(index, liveTimes)
                }}
              >
                <span className="competition-event-rail__label">{matchup}</span>
                {event.isLive ? (
                  <span
                    className={[
                      'competition-event-rail__meta',
                      isActive ? 'competition-event-rail__meta--active' : '',
                      isActive ? 'competition-event-rail__meta--active-live' : 'competition-event-rail__meta--live',
                    ].filter(Boolean).join(' ')}
                  >
                    <span className="competition-event-rail__live-dot" aria-hidden="true" />
                    {isActive ? 'Ao Vivo' : getCompetitionEventRailLiveClockLabel(displayTime)}
                  </span>
                ) : (
                  <span
                    className={[
                      'competition-event-rail__meta',
                      'competition-event-rail__meta--prematch',
                      isActive ? 'competition-event-rail__meta--active competition-event-rail__meta--active-prematch' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {getCompetitionEventRailPreMatchLabel(event.dateTime)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const getBasketballMarketColumns = (
  event: DisplayedCompetitionEventGroup['events'][number]
): HomeCompetitionMatch['marketColumns'] => {
  const homeLabel = getTeamOddLabel(event.homeName)
  const awayLabel = getTeamOddLabel(event.awayName)
  const fallbackHandicapLine = Math.max(1.5, Math.abs((event.homeScore ?? 0) - (event.awayScore ?? 0)) + 1.5)
  const handicapLine = Math.abs(event.handicapOdds?.line ?? fallbackHandicapLine)
  const totalPointsLine = event.totalPointsOdds?.line ?? 212.5
  const columns: NonNullable<HomeCompetitionMatch['marketColumns']> = [
    {
      label: 'Vencer',
      homeOdd: { label: homeLabel, value: event.odds.home },
      awayOdd: { label: awayLabel, value: event.odds.away },
    },
  ]

  columns.push({
    label: 'Handicap',
    homeOdd: { label: `${homeLabel} +${handicapLine}`, value: event.handicapOdds?.home ?? '1.87x' },
    awayOdd: { label: `${awayLabel} -${handicapLine}`, value: event.handicapOdds?.away ?? '1.94x' },
  })

  columns.push({
    label: 'Total',
    homeOdd: { label: `${totalPointsLine}+`, value: event.totalPointsOdds?.over ?? '1.89x' },
    awayOdd: { label: `${totalPointsLine}-`, value: event.totalPointsOdds?.under ?? '1.92x' },
  })

  return columns
}

const getHomeCompetitionMatchFromCalendarEvent = (
  eventGroup: DisplayedCompetitionEventGroup,
  event: DisplayedCompetitionEventGroup['events'][number],
  isLive: boolean
): HomeCompetitionMatch | null => {
  if (eventGroup.league.sport !== 'futebol' && eventGroup.league.sport !== 'basquete') return null

  const homeOdd: HomeCompetitionOdd = {
    label: getTeamOddLabel(event.homeName),
    value: event.odds.home,
  }
  const awayOdd: HomeCompetitionOdd = {
    label: getTeamOddLabel(event.awayName),
    value: event.odds.away,
  }
  const fallbackHandicapLine = Math.max(1.5, Math.abs((event.homeScore ?? 0) - (event.awayScore ?? 0)) + 1.5)
  const totalPointsLine = event.totalPointsOdds?.line ?? 212.5
  const basketballHandicapOdds = eventGroup.league.sport === 'basquete'
    ? event.handicapOdds ?? {
        line: fallbackHandicapLine,
        home: '1.87x',
        away: '1.94x',
      }
    : undefined
  const basketballTotalPointsOdds = eventGroup.league.sport === 'basquete'
    ? event.totalPointsOdds ?? {
        line: totalPointsLine,
        under: '1.92x',
        over: '1.89x',
      }
    : undefined
  const middleOdd: HomeCompetitionOdd = eventGroup.league.sport === 'basquete'
    ? {
        label: 'TOTAL',
        value: basketballTotalPointsOdds?.over ?? '-',
      }
    : {
        label: 'EMPATE',
        value: event.odds.draw ?? '-',
      }

  return {
    id: event.id,
    homeTeam: event.homeName,
    awayTeam: event.awayName,
    sport: eventGroup.league.sport,
    marketLabel: eventGroup.league.sport === 'basquete' ? eventGroup.league.name : 'RESULTADO FINAL',
    tags: eventGroup.league.sport === 'futebol'
      ? isLive
        ? ["90'"]
        : event.earlyPayout !== false
          ? ['PA', "90'"]
          : ["90'"]
      : [],
    footerLabel: event.dateTime,
    ...(isLive ? {
      homeScore: String(event.homeScore ?? 0),
      awayScore: String(event.awayScore ?? 0),
      live: true,
      liveClock: event.dateTime,
    } : {}),
    marketColumns: eventGroup.league.sport === 'basquete' ? getBasketballMarketColumns(event) : undefined,
    doubleChanceOdds: event.doubleChanceOdds,
    bothTeamsScoreOdds: event.bothTeamsScoreOdds,
    totalGoalsOdds: event.totalGoalsOdds,
    totalCornersOdds: event.totalCornersOdds,
    totalPointsOdds: basketballTotalPointsOdds ?? event.totalPointsOdds,
    handicapOdds: basketballHandicapOdds ?? event.handicapOdds,
    q3TotalOdds: event.q3TotalOdds,
    q4TotalOdds: event.q4TotalOdds,
    odds: eventGroup.league.sport === 'basquete'
      ? [homeOdd, awayOdd, middleOdd]
      : [homeOdd, middleOdd, awayOdd],
  }
}

const highlightedMatchIds = new Set(['ucl-psg-city-live'])

type HomeFeaturedCompetitionConfig = {
  id: string
  limit: number
  filter?: (event: DisplayedCompetitionEventGroup['events'][number]) => boolean
}

const homeFeaturedCompetitionConfig: HomeFeaturedCompetitionConfig[] = [
  {
    id: 'brasil-serie-a',
    limit: 1,
    filter: (event) => (
      event.homeName === 'Flamengo' && event.awayName === 'Cruzeiro' && Boolean(event.isLive)
    ),
  },
  { id: 'champions-league', limit: 2 },
  { id: 'premier-league', limit: 2 },
  { id: 'nba', limit: 3 },
] as const

const getHomeFeaturedCompetitionMatches = (): HomeCompetitionMatch[] => {
  return homeFeaturedCompetitionConfig.flatMap(({ id, limit, filter }) => {
    const { groups } = getCalendarDisplayedEventGroups({ competitionId: id })
    const eventGroup = groups[0]
    if (!eventGroup) return []

    return eventGroup.events
      .filter((event) => !highlightedMatchIds.has(event.id))
      .filter((event) => !filter || filter(event))
      .slice(0, limit)
      .flatMap((event) => {
        const match = getHomeCompetitionMatchFromCalendarEvent(eventGroup, event, !!event.isLive)

        return match ? [{ ...match, leagueLabel: eventGroup.league.name }] : []
      })
  })
}

const homeFeaturedCompetitionHighlight: HomeCompetitionHighlight = {
  title: 'Outras partidas em destaque',
  sportLabel: '',
  matches: getHomeFeaturedCompetitionMatches(),
  playerProps: [],
}

const getSportFeaturedMarketChips = (sport: string): CalendarMarketChip[] => {
  if (!supportedSportFeaturedIds.has(sport)) return []
  if (sport === 'basquete') return basketballSportFeaturedMarketChips

  return getCalendarMarketChipsForSport(sport).filter((chip) => (
    supportedSportFeaturedMarketIds.has(chip.id)
  ))
}

const getHomePlayerPropOdds = (
  options: ReturnType<typeof getCalendarPlayerPropsForEvent>[number]['options']
): HomeCompetitionPlayerProp['odds'] => {
  const fallbackOption = options[0] ?? { label: '-', odd: '-' }
  const odds = options.slice(0, 3).map((option) => ({
    label: option.label,
    value: option.odd,
  }))

  while (odds.length < 3) {
    odds.push({ label: fallbackOption.label, value: fallbackOption.odd })
  }

  return odds as HomeCompetitionPlayerProp['odds']
}

const getSportFeaturedPlayerProps = (
  groups: DisplayedCompetitionEventGroup[],
  marketChips: CalendarMarketChip[]
): HomeCompetitionPlayerProp[] => (
  marketChips.flatMap((marketChip) => {
    const propsForMarket = groups.flatMap((eventGroup) => {
      const sport = eventGroup.league.sport
      if (!isCalendarPlayerPropsMarketForSport(sport, marketChip.id)) return []

      return eventGroup.events.flatMap((event) => (
        getCalendarPlayerPropsForEvent(event, sport, marketChip.id).map((player) => ({
          id: `featured:${marketChip.id}:${player.id}`,
          marketId: marketChip.id,
          homeTeam: event.homeName,
          awayTeam: event.awayName,
          playerName: player.playerName,
          position: player.position,
          marketLabel: marketChip.label,
          matchLabel: `${getTeamOddLabel(event.homeName)} vs ${getTeamOddLabel(event.awayName)}`,
          timeLabel: event.isLive ? 'AO VIVO' : event.dateTime.replace(',', '').toUpperCase(),
          teamName: player.teamName,
          teamAbbreviation: getTeamOddLabel(player.teamName),
          sport: sport as HomeCompetitionPlayerProp['sport'],
          odds: getHomePlayerPropOdds(player.options),
        }))
      ))
    })

    return propsForMarket.slice(0, SPORT_FEATURED_PLAYER_PROPS_PER_MARKET)
  })
)

const getSportFeaturedCompetitionHighlights = (sport: string): HomeCompetitionHighlight[] => {
  if (!supportedSportFeaturedIds.has(sport)) return []

  const { groups } = getCalendarDisplayedEventGroups({ sportFilter: sport })
  const marketChips = getSportFeaturedMarketChips(sport)

  return groups.flatMap((eventGroup) => {
    const matches = eventGroup.events
      .map((event) => (
        getHomeCompetitionMatchFromCalendarEvent(eventGroup, event, !!event.isLive)
      ))
      .filter((match): match is HomeCompetitionMatch => !!match)
    const playerProps = getSportFeaturedPlayerProps([eventGroup], marketChips)

    if (matches.length === 0 && playerProps.length === 0) return []

    return [{
      title: eventGroup.league.name,
      sportLabel: '',
      marketChips,
      matches,
      playerProps,
    }]
  })
}

const getHomeCompetitionCalendarMatchTimes = (
  eventGroup: DisplayedCompetitionEventGroup,
  liveTimes: Record<string, string>
) => eventGroup.league.events.reduce<Record<string, string>>((times, event) => {
  times[event.id] = liveTimes[event.id] ?? event.dateTime

  return times
}, {})

const applyHomeCompetitionTitleToEventPayload = (
  payload: LiveEventOpenPayload,
  title: string
): LiveEventOpenPayload => ({
  ...payload,
  leagueName: title,
  matches: payload.matches.map((payloadMatch) => ({
    ...payloadMatch,
    leagueName: title,
  })),
  railEvents: payload.railEvents?.map((railEvent) => ({
    ...railEvent,
    leagueName: title,
  })),
})

interface HeaderComponentProps {
  activeProduct?: ProductMode
  activeSport?: string | null
  rail?: ReactNode
  authVariant?: 'logged-in' | 'logged-out'
  balanceCents?: number
  depositStatus?: 'deposit-pending' | 'identity-pending' | 'limits-pending'
  disableProductToggle?: boolean
  disableMenuButton?: boolean
  isProfileOpen?: boolean
  onProductChange?: (product: ProductMode) => void
  onLogoClick?: () => void
  onLogoDoubleClick?: () => void
  onLoginClick?: () => void
  onCreateAccountClick?: () => void
  onDepositOpen?: () => void
  onIdentityOpen?: () => void
  onLimitsOpen?: () => void
  onProfileOpen?: () => void
  children?: ReactNode
}

interface HomeProps {
  activeProduct?: ProductMode
  authVariant?: 'logged-in' | 'logged-out'
  balanceCents?: number
  depositStatus?: 'deposit-pending' | 'identity-pending' | 'limits-pending'
  HeaderComponent?: ComponentType<HeaderComponentProps>
  initialActiveSport?: string | null
  initialCompetition?: { id: string; name: string } | null
  initialEventId?: string
  isLiveEventSuppressed?: boolean
  onProductChange?: (product: ProductMode) => void
  onLogoDoubleClick?: () => void
  onLoginClick?: () => void
  onCreateAccountClick?: () => void
  onDepositOpen?: () => void
  onIdentityOpen?: () => void
  onLimitsOpen?: () => void
  isProfileOpen?: boolean
  onProfileOpen?: () => void
  onLiveEventOpenChange?: (isOpen: boolean) => void
  onLiveEventOpenSettled?: () => void
  onLiveEventCloseStart?: () => void
  onSportsOverviewChange?: (sportId: string) => void
}

interface LoadedEventReturnState {
  activeSport: string | null
  selectedCompetition: { id: string; name: string } | null
  activeContentFilter: ContentFilterId
  activeSportMarket: string | undefined
  scrollTop: number
}

interface LoadedEventContext {
  payload: LiveEventOpenPayload
  selectedIndex: number
  competitionId?: string
  competitionName: string
  returnState?: LoadedEventReturnState
}

const getInitialLoadedEventContext = ({
  activeSport,
  competition,
  eventId,
}: {
  activeSport: string | null
  competition: { id: string; name: string } | null
  eventId?: string
}): LoadedEventContext | null => {
  if (!activeSport || !competition || !eventId) return null

  const events = getCompetitionPageEvents(activeSport, competition.id)
  const selectedEvent = events.find(({ event }) => event.id === eventId)
  if (!selectedEvent) return null

  const matchTimes = selectedEvent.league.events.reduce<Record<string, string>>((times, event) => {
    times[event.id] = event.dateTime
    return times
  }, {})
  const payload = getCompetitionLiveEventOpenPayload({
    league: selectedEvent.league,
    selectedEventId: eventId,
    matchTimes,
  })
  if (!payload) return null

  return {
    payload,
    selectedIndex: payload.selectedIndex,
    competitionId: selectedEvent.league.id,
    competitionName: competition.name,
    returnState: {
      activeSport,
      selectedCompetition: competition,
      activeContentFilter: 'populares',
      activeSportMarket: undefined,
      scrollTop: 0,
    },
  }
}

export function Home({
  activeProduct = 'apostas',
  authVariant = 'logged-out',
  balanceCents,
  depositStatus,
  HeaderComponent = HeaderV2,
  initialActiveSport = null,
  initialCompetition = null,
  initialEventId,
  onProductChange,
  onLogoDoubleClick,
  onLoginClick,
  onCreateAccountClick,
  onDepositOpen,
  onIdentityOpen,
  onLimitsOpen,
  isProfileOpen,
  onProfileOpen,
  onLiveEventOpenChange,
  onSportsOverviewChange,
}: HomeProps = {}) {
  const { brandMode } = useFeatureFlags()
  const homeRef = useRef<HTMLDivElement>(null)
  const contentFilterStickyTopRef = useRef<HTMLDivElement>(null)
  const contentFilterContentTopRef = useRef<HTMLDivElement>(null)
  const previousProductRef = useRef(activeProduct)
  const sportHeaderExpandedBgHeight = SPORT_HEADER_EXPANDED_BG_HEIGHT_SHORTCUT
  const sportHeaderCompactBgHeight = SPORT_HEADER_COMPACT_BG_HEIGHT_SHORTCUT
  const [activeSport, setActiveSport] = useState<string | null>(initialActiveSport)
  const [activeCasinoCategory, setActiveCasinoCategory] = useState<CasinoCategoryId>('destaques')
  const [isSportHeaderCompact, setIsSportHeaderCompact] = useState(false)
  const [isSportsMatchCarouselCollapsed, setIsSportsMatchCarouselCollapsed] = useState(false)
  const [contentResetKey, setContentResetKey] = useState(0)
  const [selectedCompetition, setSelectedCompetition] = useState<{ id: string; name: string } | null>(initialCompetition)
  const [competitionRailSelectedIndex, setCompetitionRailSelectedIndex] = useState<number | null>(null)
  const [extraRailCompetitions, setExtraRailCompetitions] = useState<CompetitionLinkTarget[]>([])
  const [loadedEventContext, setLoadedEventContext] = useState<LoadedEventContext | null>(() => (
    getInitialLoadedEventContext({
      activeSport: initialActiveSport,
      competition: initialCompetition,
      eventId: initialEventId,
    })
  ))
  const [isInlineEventCompact, setIsInlineEventCompact] = useState(false)
  const [selectedCasinoGame, setSelectedCasinoGame] = useState<CasinoGameOpenPayload | null>(null)
  const [activeContentFilter, setActiveContentFilter] = useState<ContentFilterId>('populares')
  const [activeSportMarket, setActiveSportMarket] = useState<string | undefined>()
  const screenStateRef = useRef<Omit<LoadedEventReturnState, 'scrollTop'>>({
    activeSport,
    selectedCompetition,
    activeContentFilter,
    activeSportMarket,
  })
  const pendingScrollRestoreRef = useRef<number | null>(null)
  const isBetsProduct = activeProduct === 'apostas'
  const isCasinoCrashPage = !isBetsProduct && activeCasinoCategory === 'crash'
  const isInlineEventMode = isBetsProduct && !!loadedEventContext
  const shouldHideInlineEventHeaderRail = isInlineEventMode && isInlineEventCompact
  const displayActiveSport = isBetsProduct ? activeSport : null
  const sportsCarouselEvents = useMemo(
    () => isBetsProduct && activeSport
      ? getCalendarDisplayedEvents({
          sportFilter: activeSport,
          competitionId: selectedCompetition?.id ?? null,
        })
      : [],
    [activeSport, isBetsProduct, selectedCompetition?.id]
  )
  const sportsCarouselResetKey = `${activeSport ?? 'destaques'}:${selectedCompetition?.id ?? 'todas'}`
  const isCompetitionMode = isBetsProduct && !!selectedCompetition
  const competitionRailEvents = useMemo(
    () => isCompetitionMode && activeSport && selectedCompetition
      ? getCompetitionPageEvents(activeSport, selectedCompetition.id)
      : [],
    [activeSport, isCompetitionMode, selectedCompetition]
  )
  const topGamesRailEvents = isCompetitionMode ? competitionRailEvents : sportsCarouselEvents
  const hasSportsCarouselEvents = isBetsProduct && !!activeSport && topGamesRailEvents.length > 0
  const shouldRenderCompetitionEventRail = isCompetitionMode && hasSportsCarouselEvents
  const shouldRenderTopGamesRail = (SHOW_TOP_GAMES_RAIL || shouldRenderCompetitionEventRail) && hasSportsCarouselEvents
  const usesContentEventRail = shouldRenderTopGamesRail
  const usesHeaderEventRail = shouldRenderTopGamesRail && !usesContentEventRail
  // Competition renders its rail + market chips as a header stack inside the
  // header (mirroring the live-event inline header), instead of the content rail.
  const competitionMarketSelection = useCompetitionMarketSelection({
    sport: displayActiveSport ?? '',
    competitionId: selectedCompetition?.id ?? '',
    liveOnly: false,
  })
  const usesCompetitionHeaderStack = isCompetitionMode
    && (hasSportsCarouselEvents || competitionMarketSelection.marketFilters.length > 0)
  const shouldHideBetsBanner = isBetsProduct && (!!displayActiveSport || isInlineEventMode)
  const sportFeaturedCompetitionHighlights = useMemo(
    () => displayActiveSport ? getSportFeaturedCompetitionHighlights(displayActiveSport) : [],
    [displayActiveSport]
  )
  const sportFeaturedMarketFilters = useMemo(
    () => displayActiveSport ? getSportFeaturedMarketChips(displayActiveSport) : [],
    [displayActiveSport]
  )
  const activeSportMarketId = sportFeaturedMarketFilters.some((filter) => filter.id === activeSportMarket)
    ? activeSportMarket
    : sportFeaturedMarketFilters[0]?.id
  const sportHomeOfferCarouselItems = displayActiveSport
    ? brandMode === 'draftea'
      ? drafteaSportHomeOfferCarouselItemsBySport[displayActiveSport]
      : sportHomeOfferCarouselItemsBySport[displayActiveSport]
    : undefined
  const headerSelectedCompetition = useMemo(() => {
    const sourceCompetition = isInlineEventMode && loadedEventContext?.competitionId
      ? {
          id: loadedEventContext.competitionId,
          name: loadedEventContext.competitionName,
        }
      : selectedCompetition

    if (!sourceCompetition) return null

    const railCompetitionId = getRailCompetitionId(sourceCompetition.id)
    return railCompetitionId && railCompetitionId !== sourceCompetition.id
      ? { ...sourceCompetition, id: railCompetitionId }
      : sourceCompetition
  }, [
    isInlineEventMode,
    loadedEventContext?.competitionId,
    loadedEventContext?.competitionName,
    selectedCompetition,
  ])

  const handleCasinoGameOpen = (payload: CasinoGameOpenPayload) => {
    setSelectedCasinoGame(payload)
  }

  const handleCasinoBannerClick = (banner: Banner) => {
    if (!banner.casinoGameId) return

    const popularSection = casinoCarouselSections.find((section) => section.id === '10-mais-populares')
    const selectedIndex = popularSection?.games.findIndex((game) => game.id === banner.casinoGameId) ?? -1

    if (!popularSection || selectedIndex < 0) return

    handleCasinoGameOpen({ section: popularSection, selectedIndex })
  }

  const syncCurrentHeaderContentPaddingTop = useCallback(() => {
    const homeEl = homeRef.current
    const headerEl = homeEl?.querySelector<HTMLElement>('.header')
    const headerContentEndEl =
      headerEl?.querySelector<HTMLElement>('.live-event-inline__header-stack') ??
      headerEl?.querySelector<HTMLElement>('.sport-rail-shell') ??
      headerEl?.querySelector<HTMLElement>('.sport-rail__list') ??
      headerEl?.querySelector<HTMLElement>('.sport-rail') ??
      headerEl?.querySelector<HTMLElement>('.header__top')

    if (!homeEl || !headerEl || !headerContentEndEl) return

    const contentOffset = getInlineEventHeaderContentOffset(homeEl, headerEl) ??
      headerContentEndEl.getBoundingClientRect().bottom -
        homeEl.getBoundingClientRect().top +
        getHeaderContentGap(homeEl)

    homeEl.style.setProperty(
      '--home-header-content-padding-top',
      `${roundCssNumber(Math.max(contentOffset, 0))}px`
    )
  }, [])

  const resetEventRailCollapse = useCallback(() => {
    const homeEl = homeRef.current
    if (!homeEl) return

    homeEl.style.setProperty('--sports-carousel-collapse-max-height', `${EVENT_RAIL_HEIGHT}px`)
    homeEl.style.setProperty('--sports-carousel-collapse-padding-bottom', `${EVENT_RAIL_PADDING_BOTTOM}px`)
    homeEl.style.setProperty('--sports-carousel-collapse-opacity', '1')
    homeEl.style.setProperty('--sports-carousel-collapse-translate-y', '0px')
    homeEl.style.removeProperty('--highlight-header-bg-height')
    homeEl.style.removeProperty('--header-top-padding-y')
    homeEl.style.removeProperty('--sport-header-bg-height')
    homeEl.style.removeProperty('--sport-rail-padding-bottom')
    homeEl.removeAttribute('data-header-morph-complete')
    homeEl.style.removeProperty('--sports-carousel-teams-gap')
    homeEl.style.removeProperty('--sports-carousel-teams-min-height')
    homeEl.style.removeProperty('--sports-carousel-team-row-height')
    homeEl.style.removeProperty('--home-competition-header-rail-visible-height')
    homeEl.style.removeProperty('--home-competition-header-rail-opacity')
    homeEl.style.removeProperty('--home-competition-header-rail-translate-y')
    homeEl.style.removeProperty('--home-competition-event-rail-sticky-top')
    homeEl.style.removeProperty('--home-competition-market-chips-sticky-top')
    syncCurrentHeaderContentPaddingTop()
  }, [syncCurrentHeaderContentPaddingTop])

  const scrollToTop = useCallback(() => {
    setIsSportHeaderCompact(false)
    setIsSportsMatchCarouselCollapsed(false)
    resetEventRailCollapse()

    window.requestAnimationFrame(() => {
      homeRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      syncCurrentHeaderContentPaddingTop()
    })
  }, [resetEventRailCollapse, syncCurrentHeaderContentPaddingTop])

  // Mantém o snapshot da "tela anterior" (sport/competição/filtro) sempre atualizado,
  // exceto enquanto um evento está aberto — assim o fechar volta para onde o usuário estava.
  useEffect(() => {
    if (isInlineEventMode) return
    screenStateRef.current = {
      activeSport,
      selectedCompetition,
      activeContentFilter,
      activeSportMarket,
    }
  })

  const handleLiveMatchClick = useCallback((payload: LiveEventOpenPayload) => {
    const homeEl = homeRef.current
    const capturedScrollTop = Math.max(
      homeEl?.scrollTop ?? 0,
      window.scrollY,
      document.documentElement.scrollTop
    )
    const returnState: LoadedEventReturnState = { ...screenStateRef.current, scrollTop: capturedScrollTop }
    const payloadSelectedIndex = Math.min(Math.max(payload.selectedIndex, 0), Math.max(payload.matches.length - 1, 0))
    const selectedMatch = payload.matches[payloadSelectedIndex]
    const competitionId = selectedMatch?.leagueId
    const railCompetitionId = getRailCompetitionId(competitionId)
    const competitionName = selectedMatch?.leagueName ?? payload.leagueName

    setActiveSport(payload.sport)
    setSelectedCompetition(railCompetitionId ? { id: railCompetitionId, name: competitionName } : null)
    setLoadedEventContext({
      payload,
      selectedIndex: payloadSelectedIndex,
      competitionId,
      competitionName,
      returnState,
    })
    setActiveContentFilter('populares')
    setIsInlineEventCompact(false)
    onLiveEventOpenChange?.(false)
    scrollToTop()
  }, [onLiveEventOpenChange, scrollToTop])

  const handleHomeCompetitionMatchClick = useCallback((
    match: HomeCompetitionMatch,
    _competition: HomeCompetitionHighlight,
    liveTimes: Record<string, string>
  ) => {
    const { groups } = getCalendarDisplayedEventGroups({ sportFilter: match.sport })
    const eventGroup = groups.find(({ league }) => league.events.some((event) => event.id === match.id))
    const selectedCalendarEvent = eventGroup?.league.events.find((event) => event.id === match.id)
    if (!eventGroup || !selectedCalendarEvent) return

    const payload = getCompetitionLiveEventOpenPayload({
      league: eventGroup.league,
      selectedEventId: selectedCalendarEvent.id,
      matchTimes: getHomeCompetitionCalendarMatchTimes(eventGroup, liveTimes),
    })
    if (!payload) return

    handleLiveMatchClick(applyHomeCompetitionTitleToEventPayload(payload, eventGroup.league.name))
  }, [handleLiveMatchClick])

  const handleCompetitionRailEventClick = useCallback((
    index: number,
    liveTimes: Record<string, string>
  ) => {
    const displayedEvent = topGamesRailEvents[index]
    if (!displayedEvent) return

    const payload = getCompetitionLiveEventOpenPayload({
      league: displayedEvent.league,
      selectedEventId: displayedEvent.event.id,
      matchTimes: liveTimes,
    })

    if (payload) handleLiveMatchClick(payload)
  }, [handleLiveMatchClick, topGamesRailEvents])

  const handleInlineMatchSelect = useCallback((index: number) => {
    setLoadedEventContext((currentContext) => {
      if (!currentContext) return currentContext
      const selectedIndex = Math.min(Math.max(index, 0), Math.max(currentContext.payload.matches.length - 1, 0))
      return {
        ...currentContext,
        selectedIndex,
      }
    })
    setIsInlineEventCompact(false)
    scrollToTop()
  }, [scrollToTop])

  const handleCloseInlineEvent = useCallback(() => {
    const currentContext = loadedEventContext
    const returnState = currentContext?.returnState
    setIsInlineEventCompact(false)
    setLoadedEventContext(null)

    if (currentContext?.competitionId) {
      const railCompetitionId = getRailCompetitionId(currentContext.competitionId)

      setActiveSport(currentContext.payload.sport)
      setSelectedCompetition(railCompetitionId
        ? { id: railCompetitionId, name: currentContext.competitionName }
        : null
      )
      setCompetitionRailSelectedIndex(null)
      setActiveContentFilter(returnState?.selectedCompetition ? returnState.activeContentFilter : 'populares')
      setActiveSportMarket(returnState?.selectedCompetition ? returnState.activeSportMarket : undefined)
      scrollToTop()
      return
    }

    if (!returnState) {
      scrollToTop()
      return
    }

    setActiveSport(returnState.activeSport)
    setSelectedCompetition(returnState.selectedCompetition)
    if (returnState.selectedCompetition) setCompetitionRailSelectedIndex(null)
    setActiveContentFilter(returnState.activeContentFilter)
    setActiveSportMarket(returnState.activeSportMarket)
    // Restaura a posição de scroll após a lista voltar a renderizar (ver useLayoutEffect abaixo).
    pendingScrollRestoreRef.current = returnState.scrollTop
  }, [loadedEventContext, scrollToTop])

  // Aplica o scroll pendente assim que saímos do modo evento e a lista é remontada.
  useLayoutEffect(() => {
    if (isInlineEventMode) return
    if (pendingScrollRestoreRef.current === null) return

    const targetScrollTop = pendingScrollRestoreRef.current
    pendingScrollRestoreRef.current = null
    homeRef.current?.scrollTo({ top: targetScrollTop, left: 0, behavior: 'auto' })
    window.scrollTo({ top: targetScrollTop, left: 0, behavior: 'auto' })
    syncCurrentHeaderContentPaddingTop()
  }, [isInlineEventMode, syncCurrentHeaderContentPaddingTop])

  useEffect(() => {
    if (isInlineEventMode) return

    setIsInlineEventCompact(false)
  }, [isInlineEventMode])

  useLayoutEffect(() => {
    if (!isInlineEventMode || !loadedEventContext) return

    let nextFrame: number | null = null
    const frame = window.requestAnimationFrame(() => {
      nextFrame = window.requestAnimationFrame(syncCurrentHeaderContentPaddingTop)
    })

    return () => {
      window.cancelAnimationFrame(frame)
      if (nextFrame !== null) window.cancelAnimationFrame(nextFrame)
    }
  }, [isInlineEventMode, loadedEventContext, syncCurrentHeaderContentPaddingTop])

  useLayoutEffect(() => {
    if (previousProductRef.current === activeProduct) return

    previousProductRef.current = activeProduct
    const timer = window.setTimeout(() => {
      setActiveSport(null)
      setSelectedCompetition(null)
      setLoadedEventContext(null)
      setSelectedCasinoGame(null)
      setActiveContentFilter('populares')
      setActiveSportMarket(undefined)
      setActiveCasinoCategory('destaques')
      scrollToTop()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [activeProduct, scrollToTop])

  useLayoutEffect(() => () => {
    onLiveEventOpenChange?.(false)
  }, [onLiveEventOpenChange])

  useLayoutEffect(() => {
    const homeEl = homeRef.current
    if (!homeEl) return

    const getScrollTop = () =>
      Math.max(
        homeEl.scrollTop,
        window.scrollY,
        document.documentElement.scrollTop,
        document.body.scrollTop
      )

    let frame: number | null = null
    let headerSnapTimer: number | null = null
    let headerSnapSettleTimer: number | null = null
    let isHeaderSnapScrolling = false
    const headerEl = homeEl.querySelector<HTMLElement>('.header')

    const clearHeaderSnapTimer = () => {
      if (headerSnapTimer === null) return
      window.clearTimeout(headerSnapTimer)
      headerSnapTimer = null
    }

    const clearHeaderSnapSettleTimer = () => {
      if (headerSnapSettleTimer === null) return
      window.clearTimeout(headerSnapSettleTimer)
      headerSnapSettleTimer = null
    }

    const hasEventRailHeader = () => !!displayActiveSport && shouldRenderTopGamesRail && !usesContentEventRail
    const canSnapHeaderMorph = () => {
      if (!displayActiveSport) return false
      if (usesContentEventRail) return false
      return hasEventRailHeader()
    }
    const getHeaderMorphScrollStart = () => {
      if (usesContentEventRail) return HEADER_EVENT_RAIL_MORPH_SCROLL_START
      if (hasEventRailHeader()) return HEADER_EVENT_RAIL_MORPH_SCROLL_START
      return HEADER_MORPH_SCROLL_START
    }
    const getHeaderMorphScrollEnd = () => {
      if (isCompetitionMode) return HEADER_COMPETITION_MORPH_SCROLL_END
      return HEADER_MORPH_SCROLL_END
    }

    const scrollToHeaderMorphTarget = (targetScrollTop: number) => {
      homeEl.scrollTo({ top: targetScrollTop, left: 0, behavior: 'smooth' })
      window.scrollTo({ top: targetScrollTop, left: 0, behavior: 'smooth' })
    }

    const scheduleHeaderMorphSnap = () => {
      clearHeaderSnapTimer()

      if (!canSnapHeaderMorph()) return

      headerSnapTimer = window.setTimeout(() => {
        headerSnapTimer = null

        if (!canSnapHeaderMorph()) return

        const scrollTop = getScrollTop()
        const morphProgress = getScrollProgress(
          scrollTop,
          getHeaderMorphScrollStart(),
          getHeaderMorphScrollEnd()
        )

        if (morphProgress <= 0 || morphProgress >= 1) return

        const targetScrollTop = getHeaderMorphScrollEnd()

        if (Math.abs(scrollTop - targetScrollTop) < 1) return

        isHeaderSnapScrolling = true
        clearHeaderSnapSettleTimer()
        scrollToHeaderMorphTarget(targetScrollTop)

        headerSnapSettleTimer = window.setTimeout(() => {
          headerSnapSettleTimer = null
          isHeaderSnapScrolling = false
          scheduleUpdate()
          scheduleHeaderMorphSnap()
        }, HEADER_SNAP_SETTLE_MS)
      }, HEADER_SNAP_IDLE_MS)
    }

    const syncMarketStickyTop = () => {
      if (!headerEl) return
      const stickyAnchorEl =
        headerEl.querySelector<HTMLElement>('.sport-rail__item--active') ??
        headerEl.querySelector<HTMLElement>('.sport-rail__item') ??
        headerEl
      const desiredStickyTop = stickyAnchorEl.getBoundingClientRect().bottom + MARKET_STICKY_GAP
      const homeStyle = window.getComputedStyle(homeEl)
      const homePaddingTop = parseFloat(homeStyle.paddingTop) || 0
      const usesHomeScroll = (
        homeStyle.position === 'fixed' &&
        (homeStyle.overflowY === 'auto' || homeStyle.overflowY === 'scroll')
      )
      const stickyTop = usesHomeScroll
        ? isCompetitionMode
          ? MARKET_STICKY_GAP - HEADER_CONTENT_GAP
          : desiredStickyTop -
            homeEl.getBoundingClientRect().top -
            homePaddingTop
        : desiredStickyTop

      homeEl.style.setProperty(
        '--home-market-sticky-top',
        `${roundCssNumber(stickyTop)}px`
      )
      homeEl.style.setProperty(
        '--home-market-sticky-bg-height',
        `${roundCssNumber(desiredStickyTop + MARKET_STICKY_ROW_HEIGHT + MARKET_STICKY_BG_GAP + HEADER_BG_TOP_OFFSET)}px`
      )
    }

    const getVisibleMarketStickyEl = (stuckOnly = false) => {
      const stickyEls = Array.from(homeEl.querySelectorAll<HTMLElement>(marketStickySelector))
      const visibleStickyEls = stickyEls
        .map((stickyEl) => ({
          stickyEl,
          rect: stickyEl.getBoundingClientRect(),
          style: window.getComputedStyle(stickyEl),
        }))
        .filter(({ rect, stickyEl, style }) => (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          (!stuckOnly || stickyEl.getAttribute('data-market-sticky-stuck') === 'true') &&
          rect.width > 0 &&
          rect.height > 1
        ))
        .sort((first, second) => first.rect.top - second.rect.top)

      return visibleStickyEls[0] ?? null
    }

    const getFirstVisibleContentEl = () => {
      const contentEls = Array.from(homeEl.children)
        .filter((child): child is HTMLElement => child instanceof HTMLElement)
        .filter((child) => !child.classList.contains('header'))
        .map((contentEl) => ({
          contentEl,
          rect: contentEl.getBoundingClientRect(),
          style: window.getComputedStyle(contentEl),
        }))
        .filter(({ rect, style }) => (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 0 &&
          rect.height > 1
        ))

      return contentEls[0] ?? null
    }

    const getSportsCarouselMetrics = (naturalMaxHeight: number, naturalPaddingBottom: number) => {
      const carouselEl = headerEl?.querySelector<HTMLElement>('.sports-match-carousel')
      const clipTarget = isCompetitionMode
        ? getVisibleMarketStickyEl()
        : getFirstVisibleContentEl()

      if (!carouselEl || !clipTarget) {
        return {
          maxHeight: naturalMaxHeight,
          paddingBottom: naturalPaddingBottom,
          isClipped: false,
        }
      }

      const carouselRect = carouselEl.getBoundingClientRect()
      const clipHeight = clamp(
        clipTarget.rect.top - carouselRect.top,
        0,
        naturalMaxHeight
      )
      const trackRect = carouselEl
        .querySelector<HTMLElement>('.sports-match-carousel__track')
        ?.getBoundingClientRect()
      const clippedPaddingBottom = trackRect
        ? clamp(clipHeight - trackRect.height, 0, naturalPaddingBottom)
        : Math.min(clipHeight, naturalPaddingBottom)

      return {
        maxHeight: clipHeight,
        paddingBottom: clippedPaddingBottom,
        isClipped: clipHeight < naturalMaxHeight,
      }
    }

    const getSportRailHeaderBgHeight = () => {
      if (!headerEl) return sportHeaderCompactBgHeight

      const sportHeaderAnchorEl =
        headerEl.querySelector<HTMLElement>('.sport-rail') ??
        headerEl

      return Math.max(
        sportHeaderCompactBgHeight,
        sportHeaderAnchorEl.getBoundingClientRect().bottom + HEADER_BG_TOP_OFFSET
      )
    }

    const syncContentEventRailHeader = (morphProgress: number) => {
      if (!usesContentEventRail || !isCompetitionMode || !headerEl) return false

      const homeTop = homeEl.getBoundingClientRect().top
      const headerTopEl = headerEl.querySelector<HTMLElement>('.header__top')
      const sportRailShellEl = headerEl.querySelector<HTMLElement>('.sport-rail-shell')
      const headerTopBottom = headerTopEl
        ? headerTopEl.getBoundingClientRect().bottom - homeTop
        : 56
      const sportRailExpandedHeight = sportRailShellEl
        ? Math.max(
            sportRailShellEl.scrollHeight,
            sportRailShellEl.getBoundingClientRect().height
          )
        : 0
      const sportRailCollapseProgress = smoothStep(
        clamp(morphProgress / COMPETITION_SPORT_RAIL_COLLAPSE_PROGRESS_END, 0, 1)
      )
      const sportRailVisibleHeight = sportRailExpandedHeight * (1 - sportRailCollapseProgress)
      const eventRailStickyTop = -sportRailVisibleHeight
      const marketChipsStickyTop = COMPETITION_EVENT_RAIL_HEIGHT - sportRailVisibleHeight

      homeEl.style.setProperty(
        '--home-header-content-padding-top',
        `${roundCssNumber(headerTopBottom + sportRailVisibleHeight)}px`
      )
      homeEl.style.setProperty(
        '--home-competition-header-rail-visible-height',
        `${roundCssNumber(sportRailVisibleHeight)}px`
      )
      homeEl.style.setProperty(
        '--home-competition-header-rail-opacity',
        `${roundCssNumber(1 - sportRailCollapseProgress)}`
      )
      homeEl.style.setProperty(
        '--home-competition-header-rail-translate-y',
        `${roundCssNumber(interpolate(0, -8, sportRailCollapseProgress))}px`
      )
      homeEl.style.setProperty(
        '--home-competition-event-rail-sticky-top',
        `${roundCssNumber(eventRailStickyTop)}px`
      )
      homeEl.style.setProperty(
        '--home-competition-market-chips-sticky-top',
        `${roundCssNumber(marketChipsStickyTop)}px`
      )

      return true
    }

    const syncHomeHeaderContentPaddingTop = ({
      eventRailMaxHeight = 0,
      eventRailPaddingBottom = 0,
      hasEventRail,
    }: {
      eventRailMaxHeight?: number
      eventRailPaddingBottom?: number
      hasEventRail: boolean
    }) => {
      if (!headerEl) return

      const homeTop = homeEl.getBoundingClientRect().top

      if (usesCompetitionHeaderStack && !isInlineEventMode) {
        const contentOffset = getStackedHeaderContentOffset(
          homeEl,
          headerEl,
          '.home__competition-header-stack'
        )

        if (contentOffset !== null) {
          // Keep the page flow anchored to the expanded header height. The fixed
          // header may compact visually without pulling the scrolled content up.
          homeEl.style.setProperty(
            '--home-header-content-padding-top',
            `${roundCssNumber(Math.max(contentOffset, 0))}px`
          )
          return
        }
      }

      if (hasEventRail) {
        const carouselEl = headerEl.querySelector<HTMLElement>('.sports-match-carousel')
        if (carouselEl) {
          const trackHeight = carouselEl
            .querySelector<HTMLElement>('.sports-match-carousel__track')
            ?.getBoundingClientRect()
            .height ?? eventRailMaxHeight
          const visibleEventRailHeight = Math.min(trackHeight, eventRailMaxHeight)
          const contentOffset = carouselEl.getBoundingClientRect().top - homeTop +
            visibleEventRailHeight +
            eventRailPaddingBottom

          homeEl.style.setProperty(
            '--home-header-content-padding-top',
            `${roundCssNumber(Math.max(contentOffset, 0))}px`
          )
          return
        }
      }

      const headerContentEndEl =
        headerEl.querySelector<HTMLElement>('.live-event-inline__header-stack') ??
        headerEl.querySelector<HTMLElement>('.sport-rail-shell') ??
        headerEl.querySelector<HTMLElement>('.sport-rail__list') ??
        headerEl.querySelector<HTMLElement>('.sport-rail') ??
        headerEl.querySelector<HTMLElement>('.header__top')

      if (!headerContentEndEl) return

      const contentOffset = getInlineEventHeaderContentOffset(homeEl, headerEl) ??
        headerContentEndEl.getBoundingClientRect().bottom - homeTop + getHeaderContentGap(homeEl)
      homeEl.style.setProperty(
        '--home-header-content-padding-top',
        `${roundCssNumber(Math.max(contentOffset, 0))}px`
      )
    }

    const syncHeaderMorph = (scrollTop: number) => {
      const hasHeaderEventRail = hasEventRailHeader()
      const morphScrollStart = hasHeaderEventRail
        ? HEADER_EVENT_RAIL_MORPH_SCROLL_START
        : usesContentEventRail
          ? HEADER_EVENT_RAIL_MORPH_SCROLL_START
          : HEADER_MORPH_SCROLL_START
      const morphScrollEnd = getHeaderMorphScrollEnd()
      const requestedMorphProgress = smoothStep(
        getScrollProgress(scrollTop, morphScrollStart, morphScrollEnd)
      )
      const morphProgress = requestedMorphProgress
      homeEl.toggleAttribute('data-header-morph-complete', morphProgress >= 1)
      homeEl.dispatchEvent(new CustomEvent('home-header-morph-change'))
      const sportRailPaddingBottom = interpolate(
        SPORT_RAIL_EXPANDED_PADDING_BOTTOM,
        SPORT_RAIL_COMPACT_PADDING_BOTTOM,
        morphProgress
      )
      const headerTopPaddingY = interpolate(
        HEADER_TOP_EXPANDED_PADDING_Y,
        HEADER_TOP_COMPACT_PADDING_Y,
        morphProgress
      )
      const sportRailHeaderBgHeight = getSportRailHeaderBgHeight()
      const highlightHeaderBgHeight = hasHeaderEventRail || usesContentEventRail
        ? scrollTop > HEADER_EXPAND_SCROLL_TOP
          ? HIGHLIGHT_HEADER_SCROLLED_BG_HEIGHT
          : sportRailHeaderBgHeight
        : HIGHLIGHT_HEADER_SCROLLED_BG_HEIGHT
      const hasMarketStickyEngaged = homeEl.getAttribute('data-market-sticky-engaged') === 'true'
      const sportHeaderBgHeight = hasHeaderEventRail || usesContentEventRail
        ? sportRailHeaderBgHeight
        : hasMarketStickyEngaged
          ? interpolate(sportHeaderExpandedBgHeight, sportHeaderCompactBgHeight, morphProgress)
          : sportHeaderExpandedBgHeight
      const eventRailVisualStart = HEADER_EVENT_RAIL_MORPH_SCROLL_START
      const eventRailVisualProgress = hasHeaderEventRail
        ? smoothStep(
            getScrollProgress(
              scrollTop,
              eventRailVisualStart,
              eventRailVisualStart + EVENT_RAIL_VISUAL_COLLAPSE_SCROLL_END
            )
          )
        : morphProgress

      homeEl.style.setProperty(
        '--highlight-header-bg-height',
        `${roundCssNumber(highlightHeaderBgHeight)}px`
      )
      homeEl.style.setProperty(
        '--header-top-padding-y',
        `${roundCssNumber(headerTopPaddingY)}px`
      )
      homeEl.style.setProperty(
        '--sport-rail-padding-bottom',
        `${roundCssNumber(sportRailPaddingBottom)}px`
      )
      homeEl.style.setProperty(
        '--sport-header-bg-height',
        `${roundCssNumber(sportHeaderBgHeight)}px`
      )
      homeEl.style.setProperty(
        '--sports-carousel-teams-gap',
        `${roundCssNumber(interpolate(SPORTS_CAROUSEL_EXPANDED_TEAMS_GAP, SPORTS_CAROUSEL_COMPACT_TEAMS_GAP, morphProgress))}px`
      )
      homeEl.style.setProperty(
        '--sports-carousel-teams-min-height',
        `${roundCssNumber(interpolate(SPORTS_CAROUSEL_EXPANDED_TEAMS_MIN_HEIGHT, SPORTS_CAROUSEL_COMPACT_TEAMS_MIN_HEIGHT, morphProgress))}px`
      )
      homeEl.style.setProperty(
        '--sports-carousel-team-row-height',
        `${roundCssNumber(interpolate(SPORTS_CAROUSEL_EXPANDED_TEAM_ROW_HEIGHT, SPORTS_CAROUSEL_COMPACT_TEAM_ROW_HEIGHT, morphProgress))}px`
      )

      syncMarketStickyTop()

      if (hasHeaderEventRail) {
        const naturalMaxHeight = EVENT_RAIL_HEIGHT * (1 - morphProgress)
        const naturalPaddingBottom = EVENT_RAIL_PADDING_BOTTOM * (1 - morphProgress)
        syncHomeHeaderContentPaddingTop({
          eventRailMaxHeight: naturalMaxHeight,
          eventRailPaddingBottom: naturalPaddingBottom,
          hasEventRail: hasHeaderEventRail,
        })
        const sportsCarouselMetrics = getSportsCarouselMetrics(naturalMaxHeight, naturalPaddingBottom)

        homeEl.style.setProperty(
          '--sports-carousel-collapse-max-height',
          `${roundCssNumber(sportsCarouselMetrics.maxHeight)}px`
        )
        homeEl.style.setProperty(
          '--sports-carousel-collapse-padding-bottom',
          `${roundCssNumber(sportsCarouselMetrics.paddingBottom)}px`
        )
        homeEl.style.setProperty(
          '--sports-carousel-collapse-opacity',
          `${roundCssNumber(1 - eventRailVisualProgress)}`
        )
        homeEl.style.setProperty(
          '--sports-carousel-collapse-translate-y',
          `${roundCssNumber(interpolate(0, EVENT_RAIL_COLLAPSE_TRANSLATE_Y, eventRailVisualProgress))}px`
        )
        homeEl.toggleAttribute('data-market-sticky-rail-clipped', sportsCarouselMetrics.isClipped)
      } else {
        homeEl.style.setProperty('--sports-carousel-collapse-max-height', `${EVENT_RAIL_HEIGHT}px`)
        homeEl.style.setProperty('--sports-carousel-collapse-padding-bottom', `${EVENT_RAIL_PADDING_BOTTOM}px`)
        homeEl.style.setProperty('--sports-carousel-collapse-opacity', '1')
        homeEl.style.setProperty('--sports-carousel-collapse-translate-y', '0px')
        homeEl.removeAttribute('data-market-sticky-rail-clipped')
        if (!isInlineEventMode && !usesCompetitionHeaderStack && syncContentEventRailHeader(morphProgress)) {
          return
        }

        syncHomeHeaderContentPaddingTop({ hasEventRail: hasHeaderEventRail })
      }

      setIsSportsMatchCarouselCollapsed((isCollapsed) => {
        const shouldCollapse = hasHeaderEventRail && morphProgress >= EVENT_RAIL_DISABLE_INTERACTION_PROGRESS
        return isCollapsed === shouldCollapse ? isCollapsed : shouldCollapse
      })
    }

    const updateCompactState = () => {
      frame = null
      const scrollTop = getScrollTop()

      syncHeaderMorph(scrollTop)

      setIsSportHeaderCompact((isCompact) => {
        if (usesContentEventRail && isCompetitionMode) {
          const shouldBeCompact = scrollTop >= getHeaderMorphScrollEnd()
          return isCompact === shouldBeCompact ? isCompact : shouldBeCompact
        }

        if (!isCompact && scrollTop > HEADER_COMPACT_SCROLL_TOP) return true
        if (isCompact && scrollTop < HEADER_EXPAND_SCROLL_TOP) return false
        return isCompact
      })
    }

    const scheduleUpdate = () => {
      if (frame !== null) return
      frame = window.requestAnimationFrame(updateCompactState)
    }

    const handleScroll = () => {
      scheduleUpdate()
      if (!isHeaderSnapScrolling) scheduleHeaderMorphSnap()
    }

    scheduleUpdate()
    homeEl.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', scheduleUpdate, { passive: true })

    const resizeObserver = headerEl && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(scheduleUpdate)
      : null

    if (headerEl) resizeObserver?.observe(headerEl)

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      clearHeaderSnapTimer()
      clearHeaderSnapSettleTimer()
      homeEl.removeAttribute('data-market-sticky-rail-clipped')
      homeEl.removeAttribute('data-header-morph-complete')
      homeEl.style.removeProperty('--home-competition-header-rail-visible-height')
      homeEl.style.removeProperty('--home-competition-header-rail-opacity')
      homeEl.style.removeProperty('--home-competition-header-rail-translate-y')
      homeEl.style.removeProperty('--home-competition-event-rail-sticky-top')
      homeEl.style.removeProperty('--home-competition-market-chips-sticky-top')
      homeEl.removeEventListener('scroll', handleScroll)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', scheduleUpdate)
      resizeObserver?.disconnect()
    }
  }, [
    displayActiveSport,
    isCompetitionMode,
    resetEventRailCollapse,
    shouldHideInlineEventHeaderRail,
    sportHeaderCompactBgHeight,
    sportHeaderExpandedBgHeight,
    shouldRenderTopGamesRail,
    topGamesRailEvents.length,
    usesContentEventRail,
    usesCompetitionHeaderStack,
  ])

  const handleSportChange = (sportId: string) => {
    if (onSportsOverviewChange) {
      onSportsOverviewChange(sportId)
      return
    }

    setContentResetKey((current) => current + 1)
    setSelectedCompetition(null)
    setCompetitionRailSelectedIndex(null)
    setLoadedEventContext(null)
    setIsInlineEventCompact(false)
    setActiveContentFilter('populares')
    setActiveSportMarket(undefined)

    if (sportId === 'destaques') {
      setActiveSport(null)
    } else {
      setActiveSport(sportId)
    }

    scrollToTop()
  }

  const handleReturnToHighlights = () => {
    handleSportChange('destaques')
  }

  const handleSportMarketChange = (filterId: string) => {
    setActiveSportMarket(filterId)
  }

  const handleOpenCompetition = (target: CompetitionLinkTarget) => {
    setExtraRailCompetitions((currentCompetitions) => {
      const existingIndex = currentCompetitions.findIndex((competition) => competition.id === target.id)
      if (existingIndex < 0) return [...currentCompetitions, target]

      const existingCompetition = currentCompetitions[existingIndex]
      if (
        existingCompetition.name === target.name &&
        existingCompetition.sport === target.sport
      ) {
        return currentCompetitions
      }

      const nextCompetitions = [...currentCompetitions]
      nextCompetitions[existingIndex] = target
      return nextCompetitions
    })
    setActiveSport(target.sport)
    setSelectedCompetition({ id: target.id, name: target.name })
    setCompetitionRailSelectedIndex(null)
    setLoadedEventContext(null)
    setIsInlineEventCompact(false)
    setActiveSportMarket(undefined)
    setContentResetKey((c) => c + 1)
    scrollToTop()
  }

  const handleCasinoCategoryChange = (categoryId: CasinoCategoryId) => {
    setActiveCasinoCategory(categoryId)
    setLoadedEventContext(null)
    setIsInlineEventCompact(false)
    setContentResetKey((current) => current + 1)
    scrollToTop()
  }

  const handleInlineCompactChange = useCallback((isCompact: boolean) => {
    setIsInlineEventCompact(isCompact)
  }, [])

  const headerRail = isBetsProduct ? (
    <SportRail
      activeSport={displayActiveSport}
      selectedCompetitionId={headerSelectedCompetition?.id ?? null}
      selectedCompetitionName={headerSelectedCompetition?.name ?? null}
      extraCompetitions={extraRailCompetitions}
      disableInteractions={!ENABLE_HOME_RAIL_LINKS}
      allowHighlightsInteraction={isInlineEventMode || !!onSportsOverviewChange}
      allowCompetitionInteraction={ENABLE_HOME_RAIL_COMPETITION_LINKS}
      onSportChange={ENABLE_HOME_RAIL_LINKS || isInlineEventMode ? handleSportChange : undefined}
      onOpenCompetition={ENABLE_HOME_RAIL_LINKS || ENABLE_HOME_RAIL_COMPETITION_LINKS ? handleOpenCompetition : undefined}
    />
  ) : (
    <CasinoRail
      activeCategory={activeCasinoCategory}
      disableInteractions={!ENABLE_HOME_RAIL_LINKS}
      onCategoryChange={ENABLE_HOME_RAIL_LINKS ? handleCasinoCategoryChange : undefined}
    />
  )

  const homeClasses = [
    'home',
    'home--header-morph-active',
    'home--novo-trilho',
    'home--no-dividers',
    'home--liquid-glass-new',
    'home--v2',
    activeProduct === 'cassino' ? 'home--casino-active' : '',
    isInlineEventMode ? 'home--event-inline-active' : '',
    shouldHideInlineEventHeaderRail ? 'home--event-inline-compact' : '',
    displayActiveSport ? 'home--sport-active' : '',
    usesHeaderEventRail ? 'home--event-rail-active' : '',
    usesContentEventRail ? 'home--content-event-rail-active' : '',
    isCompetitionMode ? 'home--competition-active' : '',
    usesCompetitionHeaderStack ? 'home--competition-header-active' : '',
    isSportHeaderCompact ? 'home--header-compact' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={homeClasses} ref={homeRef}>
      <HeaderComponent
        activeProduct={activeProduct}
        activeSport={displayActiveSport}
        authVariant={authVariant}
        balanceCents={balanceCents}
        depositStatus={depositStatus}
        disableProductToggle={!ENABLE_HOME_PRODUCT_TOGGLE}
        isProfileOpen={isProfileOpen}
        onDepositOpen={onDepositOpen}
        onIdentityOpen={onIdentityOpen}
        onLimitsOpen={onLimitsOpen}
        onProfileOpen={onProfileOpen}
        onLogoClick={isInlineEventMode ? handleReturnToHighlights : undefined}
        onLogoDoubleClick={onLogoDoubleClick}
        onLoginClick={onLoginClick}
        onCreateAccountClick={onCreateAccountClick}
        onProductChange={onProductChange}
        rail={headerRail}
      >
        {displayActiveSport && shouldRenderTopGamesRail && (
          <>
            {!usesContentEventRail && (
              <SportsMatchCarousel
                events={topGamesRailEvents}
                resetKey={sportsCarouselResetKey}
                competitionMode={isCompetitionMode}
                isCollapsed={isSportsMatchCarouselCollapsed}
                onLiveMatchClick={handleLiveMatchClick}
              />
            )}
          </>
        )}
        {isInlineEventMode && loadedEventContext && (
          <Suspense fallback={null}>
            <LiveEventInlineHeader
              matches={loadedEventContext.payload.matches}
              railEvents={loadedEventContext.payload.railEvents}
              selectedIndex={loadedEventContext.selectedIndex}
              currentTimes={loadedEventContext.payload.currentTimes}
              leagueName={loadedEventContext.payload.leagueName}
              leagueFlag={loadedEventContext.payload.leagueFlag}
              sport={loadedEventContext.payload.sport}
              isCompact={isInlineEventCompact}
              onSelectedIndexChange={handleInlineMatchSelect}
              onLayoutReady={syncCurrentHeaderContentPaddingTop}
              onClose={handleCloseInlineEvent}
              closeControl="all"
            />
          </Suspense>
        )}
        {usesCompetitionHeaderStack && !isInlineEventMode && (
          <div className="live-event-inline__header-stack home__competition-header-stack">
            <CompetitionEventRail
              events={topGamesRailEvents}
              selectedIndex={competitionRailSelectedIndex}
              resetKey={sportsCarouselResetKey}
              onSelectedIndexChange={setCompetitionRailSelectedIndex}
              onEventClick={handleCompetitionRailEventClick}
            />
            {competitionMarketSelection.marketFilters.length > 0 && (
              <ContentFilterChips
                filters={competitionMarketSelection.marketFilters}
                activeFilter={competitionMarketSelection.selectedMarketId}
                ariaLabel="Mercados da competição"
                className="content-filter-chips--competition-markets"
                onFilterChange={competitionMarketSelection.handleMarketChange}
                scrollMode="top"
              />
            )}
          </div>
        )}
      </HeaderComponent>
      {shouldRenderTopGamesRail && usesContentEventRail && !isInlineEventMode && !usesCompetitionHeaderStack && (
        <div className="home__content-event-rail">
          <SportsMatchCarousel
            events={topGamesRailEvents}
            resetKey={sportsCarouselResetKey}
            competitionMode={isCompetitionMode}
            isCollapsed={false}
            onLiveMatchClick={handleLiveMatchClick}
          />
        </div>
      )}
      {isBetsProduct && !displayActiveSport && !isInlineEventMode && (
        <PromoDraftaco />
      )}
      <BannerHighlight
        hideBanner={shouldHideBetsBanner || isCasinoCrashPage}
        banners={isBetsProduct ? undefined : casinoBanners}
        disableInteractions={!isBetsProduct && !ENABLE_HOME_TIP_CLICKS}
        onBannerClick={!ENABLE_HOME_TIP_CLICKS || isBetsProduct ? undefined : handleCasinoBannerClick}
      />
      {isBetsProduct && !displayActiveSport && !isInlineEventMode && (
        <div className="home__content-filter-anchor" ref={contentFilterStickyTopRef} aria-hidden="true" />
      )}
      {isBetsProduct && !displayActiveSport && !isInlineEventMode && (
        <div className="home__content-filter-content" ref={contentFilterContentTopRef}>
          <HomeCompetitionSection
            competition={homeFeaturedCompetitionHighlight}
            hideTitleChevron
            titleVariant="compact"
            onMatchClick={handleHomeCompetitionMatchClick}
          />
        </div>
      )}
      {!isBetsProduct ? (
        <Fragment key={`casino-${activeCasinoCategory}-${contentResetKey}`}>
          {!isCasinoCrashPage && <PromotionSection promotions={casinoPromotions} />}
          <CasinoContent
            activeCategory={activeCasinoCategory}
            onGameOpen={handleCasinoGameOpen}
          />
        </Fragment>
      ) : isInlineEventMode && loadedEventContext ? (
        <Suspense fallback={null}>
          <LiveEventInline
            matches={loadedEventContext.payload.matches}
            railEvents={loadedEventContext.payload.railEvents}
            selectedIndex={loadedEventContext.selectedIndex}
            currentTimes={loadedEventContext.payload.currentTimes}
            leagueName={loadedEventContext.payload.leagueName}
            leagueFlag={loadedEventContext.payload.leagueFlag}
            sport={loadedEventContext.payload.sport}
            onSelectedIndexChange={handleInlineMatchSelect}
            onCompactChange={handleInlineCompactChange}
          />
        </Suspense>
      ) : displayActiveSport ? (
        <Fragment key={`sport-${activeSport}-${contentResetKey}`}>
          {selectedCompetition ? (
            <CompetitionPage
              sport={displayActiveSport}
              competitionId={selectedCompetition.id}
              marketSelection={competitionMarketSelection}
              onLiveMatchClick={handleLiveMatchClick}
              onOpenCompetition={ENABLE_HOME_RAIL_LINKS ? handleOpenCompetition : undefined}
            />
          ) : (
            <>
              {sportHomeOfferCarouselItems && (
                <HomeOfferCarousel offers={sportHomeOfferCarouselItems} />
              )}
              {sportFeaturedMarketFilters.length > 0 && (
                <>
                  <div className="home__content-filter-anchor home__sport-market-anchor" aria-hidden="true" />
                  <ContentFilterChips
                    filters={sportFeaturedMarketFilters}
                    activeFilter={activeSportMarketId}
                    ariaLabel="Mercados do esporte"
                    className="content-filter-chips--sport-markets"
                    onFilterChange={handleSportMarketChange}
                  />
                </>
              )}
              {sportFeaturedCompetitionHighlights.length > 0 && (
                <div className="home__sport-featured-content">
                  {sportFeaturedCompetitionHighlights.map((competition) => (
                    <HomeCompetitionSection
                      activeMarketId={activeSportMarketId}
                      competition={competition}
                      hideMarketChips
                      showPlayerPropsWithMatches
                      onMatchClick={handleHomeCompetitionMatchClick}
                      key={competition.title}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </Fragment>
      ) : (
        <Fragment key={`destaques-${contentResetKey}`} />
      )}
      {selectedCasinoGame && (
        <Suspense fallback={null}>
          <CasinoGamePage
            isOpen={true}
            onClose={() => setSelectedCasinoGame(null)}
            games={selectedCasinoGame.section.games}
            selectedIndex={selectedCasinoGame.selectedIndex}
            sectionTitle={selectedCasinoGame.section.title}
          />
        </Suspense>
      )}
    </div>
  )
}
