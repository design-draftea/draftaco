import {
  getCalendarDisplayedEventGroups,
  getCalendarPlayerPropsForEvent,
  type CompetitionEvent,
  type DisplayedCompetitionEvent,
} from '../../../components/CalendarSection'
import { homeCompetitionHighlight, nbaCompetitionHighlight } from '../../../data/homeProducts'
import type {
  Banner,
  HomeCompetitionHighlight,
  HomeCompetitionMatch,
  HomeCompetitionOdd,
  HomeCompetitionPlayerProp,
} from '../../../shared/types/home'
import { getCompetitionLinkTarget } from '../../../shared/utils/competitionNavigation'
import { getTeamLogo } from '../../../data/teamLogos'

export type SportsPageV2Sport = 'futebol' | 'basquete'

export interface SportsPageV2Competition {
  id: string
  label: string
  name: string
}

export const sportsPageV2Competitions: Record<SportsPageV2Sport, SportsPageV2Competition[]> = {
  futebol: [
    { id: 'fut-champions', label: 'CHAMPIONS LEAGUE', name: 'Champions League' },
    { id: 'fut-premier-league', label: 'PREMIER LEAGUE', name: 'Premier League' },
    { id: 'fut-brasileiro', label: 'BRASILEIRÃO', name: 'Brasileirão' },
    { id: 'fut-laliga', label: 'LA LIGA', name: 'La Liga' },
    { id: 'fut-bundesliga', label: 'BUNDESLIGA', name: 'Bundesliga' },
    { id: 'fut-mls', label: 'MLS', name: 'MLS' },
  ],
  basquete: [
    { id: 'bsq-nba', label: 'NBA', name: 'NBA' },
    { id: 'bsq-ncaab', label: 'NCAAB', name: 'NCAAB' },
    { id: 'bsq-nbb', label: 'NBB', name: 'NBB' },
    { id: 'bsq-euro-cup', label: 'EURO CUP', name: 'Euro Cup' },
  ],
}

export const getDefaultSportsPageV2Competition = (sport: SportsPageV2Sport) => (
  sportsPageV2Competitions[sport][0]
)

const getTeamCode = (teamName: string) => {
  const words = teamName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter(Boolean)

  if (words.length > 1) {
    return words.map((word) => word[0]).join('').slice(0, 3).toUpperCase()
  }

  return teamName.slice(0, 3).toUpperCase()
}

const getEventOdds = (event: CompetitionEvent, sport: SportsPageV2Sport): HomeCompetitionMatch['odds'] => {
  const homeOdd: HomeCompetitionOdd = { label: getTeamCode(event.homeName), value: event.odds.home }
  const awayOdd: HomeCompetitionOdd = { label: getTeamCode(event.awayName), value: event.odds.away }
  const middleOdd: HomeCompetitionOdd = sport === 'basquete'
    ? { label: 'TOTAL', value: event.totalPointsOdds?.over ?? '1.90x' }
    : { label: 'EMPATE', value: event.odds.draw ?? '3.20x' }

  return sport === 'basquete'
    ? [homeOdd, awayOdd, middleOdd]
    : [homeOdd, middleOdd, awayOdd]
}

const getBasketballMarketColumns = (event: CompetitionEvent): HomeCompetitionMatch['marketColumns'] => [
  {
    label: 'Vencer',
    tag: event.earlyPayout ? 'PA' : undefined,
    homeOdd: { label: getTeamCode(event.homeName), value: event.odds.home },
    awayOdd: { label: getTeamCode(event.awayName), value: event.odds.away },
  },
  {
    label: 'Handicap',
    homeOdd: {
      label: `${getTeamCode(event.homeName)} ${event.handicapOdds?.line ?? 4.5}+`,
      value: event.handicapOdds?.home ?? '1.91x',
    },
    awayOdd: {
      label: `${getTeamCode(event.awayName)} ${event.handicapOdds?.line ?? 4.5}-`,
      value: event.handicapOdds?.away ?? '1.91x',
    },
  },
  {
    label: 'Total',
    homeOdd: {
      label: `${event.totalPointsOdds?.line ?? 218.5}+`,
      value: event.totalPointsOdds?.over ?? '1.90x',
    },
    awayOdd: {
      label: `${event.totalPointsOdds?.line ?? 218.5}-`,
      value: event.totalPointsOdds?.under ?? '1.90x',
    },
  },
]

const getCompetitionMatch = (
  event: CompetitionEvent,
  leagueName: string,
  sport: SportsPageV2Sport
): HomeCompetitionMatch => ({
  id: event.id,
  homeTeam: event.homeName,
  awayTeam: event.awayName,
  sport,
  homeScore: event.homeScore === undefined ? undefined : String(event.homeScore),
  awayScore: event.awayScore === undefined ? undefined : String(event.awayScore),
  leagueLabel: leagueName,
  marketLabel: 'RESULTADO FINAL',
  tags: [
    ...(event.earlyPayout ? ['PA'] : []),
    ...(sport === 'futebol' ? ['90’'] : []),
  ],
  footerLabel: event.dateTime,
  live: Boolean(event.isLive),
  liveClock: event.isLive ? event.dateTime : undefined,
  marketColumns: sport === 'basquete' ? getBasketballMarketColumns(event) : undefined,
  doubleChanceOdds: event.doubleChanceOdds,
  bothTeamsScoreOdds: event.bothTeamsScoreOdds,
  totalGoalsOdds: event.totalGoalsOdds,
  totalCornersOdds: event.totalCornersOdds,
  totalPointsOdds: event.totalPointsOdds,
  handicapOdds: event.handicapOdds,
  q3TotalOdds: event.q3TotalOdds,
  q4TotalOdds: event.q4TotalOdds,
  odds: getEventOdds(event, sport),
})

const getPlayerPropOdds = (
  options: ReturnType<typeof getCalendarPlayerPropsForEvent>[number]['options']
): HomeCompetitionPlayerProp['odds'] => {
  const fallback = options[0] ?? { label: '-', odd: '-' }
  const odds = options.slice(0, 3).map((option) => ({ label: option.label, value: option.odd }))

  while (odds.length < 3) {
    odds.push({ label: fallback.label, value: fallback.odd })
  }

  return odds as HomeCompetitionPlayerProp['odds']
}

const getEventPlayerProps = (
  event: CompetitionEvent,
  sport: SportsPageV2Sport,
  leagueId: string,
  marketId: string,
  marketLabel: string
): HomeCompetitionPlayerProp[] => (
  getCalendarPlayerPropsForEvent(event, sport, marketId).map((player) => ({
    id: `${leagueId}:${player.id}`,
    marketId,
    homeTeam: event.homeName,
    awayTeam: event.awayName,
    playerName: player.playerName,
    playerImage: player.image,
    position: player.position,
    marketLabel,
    matchLabel: `${getTeamCode(event.homeName)} vs ${getTeamCode(event.awayName)}`,
    timeLabel: event.isLive ? 'AO VIVO' : event.dateTime.replace(',', '').toUpperCase(),
    teamName: player.teamName,
    teamAbbreviation: getTeamCode(player.teamName),
    sport,
    odds: getPlayerPropOdds(player.options),
  }))
)

const getFallbackPlayerProps = (
  sport: SportsPageV2Sport,
  competition: SportsPageV2Competition,
  matches: HomeCompetitionMatch[],
  count: number
) => {
  const fallbackSource = sport === 'basquete'
    ? nbaCompetitionHighlight.playerProps
    : homeCompetitionHighlight.playerProps

  return fallbackSource.slice(0, count).map((prop, index) => {
    const match = matches[index % Math.max(matches.length, 1)]
    const fallbackHome = match?.homeTeam ?? prop.homeTeam ?? prop.teamName
    const fallbackAway = match?.awayTeam ?? prop.awayTeam ?? prop.teamName
    const teamName = index % 2 === 0 ? fallbackHome : fallbackAway

    return {
      ...prop,
      id: `${competition.id}:fallback:${prop.id}`,
      homeTeam: fallbackHome,
      awayTeam: fallbackAway,
      matchLabel: `${getTeamCode(fallbackHome)} vs ${getTeamCode(fallbackAway)}`,
      teamName,
      teamAbbreviation: getTeamCode(teamName),
      sport,
    }
  })
}

const hasFeaturedTeam = (event: CompetitionEvent, sport: SportsPageV2Sport) => {
  const featuredTeams = featuredTeamsBySport[sport]
  return featuredTeams.has(event.homeName) || featuredTeams.has(event.awayName)
}

export const getSportsPageV2CompetitionHighlight = (
  sport: SportsPageV2Sport,
  competition: SportsPageV2Competition
): HomeCompetitionHighlight => {
  const { groups } = getCalendarDisplayedEventGroups({
    sportFilter: sport,
    competitionId: competition.id,
  })
  const displayedEvents = groups
    .flatMap(({ league, events }) => events.map((event) => ({ league, event })))
    .filter(({ event }) => !hasFeaturedTeam(event, sport))
    .slice(0, 3)
  const matches = displayedEvents.map(({ league, event }) => getCompetitionMatch(event, league.name, sport))
  const marketId = sport === 'basquete' ? 'pontos-jogador' : 'finalizacao-gol'
  const marketLabel = sport === 'basquete' ? 'Pontos' : 'Finalizações no Gol'
  const playerProps = displayedEvents
    .flatMap(({ league, event }) => getEventPlayerProps(event, sport, league.id, marketId, marketLabel))
    .slice(0, 3)

  if (playerProps.length < 3) {
    playerProps.push(...getFallbackPlayerProps(sport, competition, matches, 3 - playerProps.length))
  }

  return {
    title: competition.name,
    sportLabel: sport === 'basquete' ? 'Basquete' : 'Futebol',
    matches,
    playerProps: playerProps.slice(0, 3),
  }
}

const getFootballHighlightEvents = (): DisplayedCompetitionEvent[] => {
  const eventsById = new Map(
    getCalendarDisplayedEventGroups({ sportFilter: 'futebol' }).groups
      .flatMap(({ league, events }) => events.map((event) => [event.id, { league, event }] as const))
  )

  return [
    eventsById.get('ucl-psg-city-live'),
    eventsById.get('1'),
    eventsById.get('premier-live-1'),
  ]
    .filter((event): event is DisplayedCompetitionEvent => !!event)
}

const getBasketballHighlightEvents = (): DisplayedCompetitionEvent[] => {
  const eventsById = new Map(
    getCalendarDisplayedEventGroups({ sportFilter: 'basquete' }).groups
      .flatMap(({ league, events }) => events.map((event) => [event.id, { league, event }] as const))
  )

  return [
    eventsById.get('nba-1'),
    eventsById.get('nba-live-3'),
    eventsById.get('cal-b-10'),
  ]
    .filter((event): event is DisplayedCompetitionEvent => !!event)
}

const highlightEventsBySport: Record<SportsPageV2Sport, DisplayedCompetitionEvent[]> = {
  futebol: getFootballHighlightEvents(),
  basquete: getBasketballHighlightEvents(),
}

const featuredTeamsBySport: Record<SportsPageV2Sport, Set<string>> = {
  futebol: new Set(
    highlightEventsBySport.futebol.flatMap(({ event }) => [event.homeName, event.awayName])
  ),
  basquete: new Set(
    highlightEventsBySport.basquete.flatMap(({ event }) => [event.homeName, event.awayName])
  ),
}

const getHighlightBanner = (
  { league, event }: DisplayedCompetitionEvent,
  sport: SportsPageV2Sport,
  index: number
): Banner => {
  const competitionTarget = getCompetitionLinkTarget(league.id)

  return {
    id: (sport === 'basquete' ? 200 : 100) + index,
    type: 'market',
    headerLeft: '',
    headerRight: '',
    background: '',
    title: '',
    description: '',
    eventLink: competitionTarget && (competitionTarget.sport === 'futebol' || competitionTarget.sport === 'basquete')
      ? {
          eventId: event.id,
          competitionId: competitionTarget.id,
          competitionName: competitionTarget.name,
          sport: competitionTarget.sport,
        }
      : undefined,
    marketBanner: {
      variant: sport === 'basquete'
        ? event.isLive ? 'basketball-live' : 'basketball-pre'
        : event.isLive ? 'football-live' : 'football-pre',
      sport,
      league: league.name,
      footerLabel: event.dateTime,
      live: Boolean(event.isLive),
      liveClock: event.isLive ? event.dateTime : undefined,
      teams: [
        {
          name: event.homeName,
          image: getTeamLogo(event.homeName, event.homeIcon),
          score: event.homeScore === undefined ? undefined : String(event.homeScore),
        },
        {
          name: event.awayName,
          image: getTeamLogo(event.awayName, event.awayIcon),
          score: event.awayScore === undefined ? undefined : String(event.awayScore),
        },
      ],
      odds: [
        { label: getTeamCode(event.homeName), value: event.odds.home, outcomeId: 'home' },
        ...(sport === 'futebol' ? [{ label: 'EMPATE', value: event.odds.draw ?? '3.20x', outcomeId: 'draw' }] : []),
        { label: getTeamCode(event.awayName), value: event.odds.away, outcomeId: 'away' },
      ],
    },
  }
}

export const sportsPageV2Banners: Record<SportsPageV2Sport, Banner[]> = {
  futebol: highlightEventsBySport.futebol.map((event, index) => getHighlightBanner(event, 'futebol', index)),
  basquete: highlightEventsBySport.basquete.map((event, index) => getHighlightBanner(event, 'basquete', index)),
}
