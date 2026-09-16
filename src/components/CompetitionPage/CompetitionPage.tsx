import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type UIEvent } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'
import {
  CalendarSection,
  getCalendarDisplayedEventGroups,
  getCalendarPlayerPropsForEvent,
  getCompetitionLiveEventMatch,
  getCompetitionLiveEventOpenPayload,
  isCalendarPlayerPropsMarketForSport,
  updateCompetitionMatchTime,
  type CompetitionEvent,
  type DisplayedCompetitionEventGroup,
} from '../CalendarSection'
import {
  HomeCompetitionSection,
  HomeCompetitionMarketColumnsMatchCard,
  HomeCompetitionOddButton,
  HomeCompetitionPlayerPropCard,
  type HomeCompetitionMatchGroup,
  type HomeCompetitionMatchOddRenderer,
  type HomeCompetitionPlayerPropOddRenderer,
} from '../HomeCompetitionSection'
import { BasePromo } from '../BasePromo'
import { TeamLogo } from '../TeamLogo'
import type { LiveEventOpenPayload } from '../../features/sports/LiveEventPage'
import type {
  HomeCompetitionHighlight,
  HomeCompetitionMarketChip,
  HomeCompetitionMatch,
  HomeCompetitionOdd,
  HomeCompetitionPlayerProp,
} from '../../shared/types/home'
import type { CompetitionLinkTarget } from '../../shared/utils/competitionNavigation'
import {
  formatNflLine,
  getNflMarketColumns,
} from '../../shared/utils/nflMarkets'
import { getTeamAbbreviation } from '../../shared/utils/teamAbbreviations'
import {
  createBetslipSelection,
  getMatchOddBetslipKey,
  getPlayerPropBetslipKey,
  normalizeBetslipIdPart,
} from '../../shared/hooks/betslipUtils'
import { useOddSelection } from '../../shared/hooks/useOddSelection'
import { hasNflLiveClock, useNflLiveFeed } from '../../features/sports/NflLiveFeed'
import chevronRight from '../../assets/iconsDraftaco/chevronRight.svg'
import chevronDown from '../../assets/iconsDraftaco/chevronDown.svg'
import './CompetitionPage.css'

interface CompetitionPageProps {
  sport: string
  competitionId: string
  liveOnly?: boolean
  marketSelection: CompetitionMarketSelection
  onLiveMatchClick?: (payload: LiveEventOpenPayload) => void
  onOpenCompetition?: (target: CompetitionLinkTarget) => void
}

type SupportedCompetitionSport = HomeCompetitionMatch['sport']

type CompetitionCarouselMarket = {
  id: string
  label: string
  odds: HomeCompetitionOdd[]
}

type CompetitionPlayerPropMarketGroup = {
  id: string
  title: string
  subtitle?: string
  props: HomeCompetitionPlayerProp[]
}

interface CompetitionHighlightView {
  competition: HomeCompetitionHighlight
  matchGroups: HomeCompetitionMatchGroup[]
}

const supportedCompetitionSports = new Set<string>(['futebol', 'basquete', 'nfl'])
const COMPETITION_PLAYER_PROPS_INITIAL_COUNT = 4
const COMPETITION_PLAYER_PROPS_MAX_COUNT = 8
const COMPETITION_PLAYER_PROPS_LOAD_STEP = 2
const COMPETITION_PLAYER_PROPS_ACCORDION_DURATION_MS = 900
const COMPETITION_MATCH_CAROUSEL_MAX_BULLETS = 5
const COMPETITION_MATCHES_MARKET_ID = 'resultado-final'
const COMPETITION_MATCH_LIST_MARKET_IDS = new Set([COMPETITION_MATCHES_MARKET_ID, 'dupla-chance'])

const isSupportedCompetitionSport = (sport?: string | null): sport is SupportedCompetitionSport => (
  !!sport && supportedCompetitionSports.has(sport)
)

const getSportLabel = (sport: SupportedCompetitionSport) => {
  if (sport === 'basquete') return 'Basquete'
  if (sport === 'nfl') return 'NFL'

  return 'Futebol'
}

const getTeamOddLabel = getTeamAbbreviation

const getCompetitionOddOutcomeId = (label: HomeCompetitionOdd['label'], index: number) => (
  `${index}-${normalizeBetslipIdPart(String(label))}`
)

const getCompetitionLiveFooterClock = (clock: string) => (
  clock.match(/(?:\dT|Q\d)\s+(\d{1,2}:\d{2})/)?.[1] ?? clock
)

const getFootballCarouselMarket = (
  match: HomeCompetitionMatch,
  marketId?: string,
  marketLabel = 'Resultado Final'
): CompetitionCarouselMarket => {
  if (marketId === 'dupla-chance' && match.doubleChanceOdds) {
    return {
      id: marketId,
      label: marketLabel,
      odds: [
        { label: '1X', value: match.doubleChanceOdds.homeOrDraw },
        { label: '12', value: match.doubleChanceOdds.homeOrAway },
        { label: 'X2', value: match.doubleChanceOdds.awayOrDraw },
      ],
    }
  }

  if (marketId === 'ambos-marcam' && match.bothTeamsScoreOdds) {
    return {
      id: marketId,
      label: marketLabel,
      odds: [
        { label: 'SIM', value: match.bothTeamsScoreOdds.yes },
        { label: 'NÃO', value: match.bothTeamsScoreOdds.no },
      ],
    }
  }

  if (marketId === 'total-gols' && match.totalGoalsOdds) {
    const line = formatNflLine(match.totalGoalsOdds.line)

    return {
      id: marketId,
      label: marketLabel,
      odds: [
        { label: `${line}+`, value: match.totalGoalsOdds.over },
        { label: `${line}-`, value: match.totalGoalsOdds.under },
      ],
    }
  }

  if (marketId === 'total-escanteios' && match.totalCornersOdds) {
    const line = formatNflLine(match.totalCornersOdds.line)

    return {
      id: marketId,
      label: marketLabel,
      odds: [
        { label: `${line}+`, value: match.totalCornersOdds.over },
        { label: `${line}-`, value: match.totalCornersOdds.under },
      ],
    }
  }

  return {
    id: COMPETITION_MATCHES_MARKET_ID,
    label: 'Resultado Final',
    odds: match.odds,
  }
}

const getBasketballCarouselMarket = (
  match: HomeCompetitionMatch,
  marketId?: string,
  marketLabel = 'Vencer'
): CompetitionCarouselMarket => {
  if ((marketId === 'handicap' || marketLabel.toLowerCase() === 'handicap') && match.handicapOdds) {
    const homeLabel = getTeamOddLabel(match.homeTeam)
    const awayLabel = getTeamOddLabel(match.awayTeam)
    const line = formatNflLine(Math.abs(match.handicapOdds.line))

    return {
      id: 'handicap',
      label: marketLabel,
      odds: [
        { label: `${homeLabel} +${line}`, value: match.handicapOdds.home },
        { label: `${awayLabel} -${line}`, value: match.handicapOdds.away },
      ],
    }
  }

  if ((marketId === 'total-pontos' || marketLabel.toLowerCase().includes('total')) && match.totalPointsOdds) {
    const line = formatNflLine(match.totalPointsOdds.line)

    return {
      id: 'total-pontos',
      label: marketLabel,
      odds: [
        { label: `${line}+`, value: match.totalPointsOdds.over },
        { label: `${line}-`, value: match.totalPointsOdds.under },
      ],
    }
  }

  const marketColumn = match.marketColumns?.[0]

  return {
    id: 'principais',
    label: marketColumn?.label ?? 'Vencer',
    odds: marketColumn ? [marketColumn.homeOdd, marketColumn.awayOdd] : match.odds.slice(0, 2),
  }
}

const getCompetitionCarouselMarket = (
  match: HomeCompetitionMatch,
  marketId?: string,
  marketLabel?: string
) => (
  match.sport === 'basquete'
    ? getBasketballCarouselMarket(match, marketId, marketLabel)
    : getFootballCarouselMarket(match, marketId, marketLabel)
)

// Subtítulo dos mercados de linha (“ganha se for maior ou igual”), conforme o Figma da NFL.
const playerPropMarketSubtitles = new Map<string, string>([
  ['jardas-passe', '(ganha se for maior ou igual)'],
  ['recepcoes', '(ganha se for maior ou igual)'],
  ['touchdowns', '(ganha se for maior ou igual)'],
  ['jardas-corrida', '(ganha se for maior ou igual)'],
])

const getCompetitionPlayerPropMarketGroups = (
  competition: HomeCompetitionHighlight,
  activeMarketId?: string
): CompetitionPlayerPropMarketGroup[] => {
  const marketChips = competition.marketChips ?? []
  const marketOrder = new Map(marketChips.map((chip, index) => [chip.id, index]))
  const marketLabels = new Map(marketChips.map((chip) => [chip.id, chip.label]))
  const groupsById = new Map<string, CompetitionPlayerPropMarketGroup>()
  const playerPropMarketTitles = new Map<string, string>([
    ['finalizacao-gol', 'Finalizações ao Gol'],
    ['gols', 'Gols'],
    ['assistencias', 'Assistências'],
    ['pontos-jogador', 'Pontos de jogador'],
    ['jardas-passe', 'Jardas de passe'],
    ['recepcoes', 'Recepções'],
    ['touchdowns', 'Touchdowns'],
    ['jardas-corrida', 'Jardas de corrida'],
  ])

  competition.playerProps.forEach((prop) => {
    const marketId = prop.marketId ?? normalizeBetslipIdPart(prop.marketLabel)
    if (activeMarketId && marketId !== activeMarketId) return

    const existingGroup = groupsById.get(marketId)
    if (existingGroup) {
      existingGroup.props.push(prop)
      return
    }

    groupsById.set(marketId, {
      id: marketId,
      title: playerPropMarketTitles.get(marketId) ?? marketLabels.get(marketId) ?? prop.marketLabel,
      subtitle: playerPropMarketSubtitles.get(marketId),
      props: [prop],
    })
  })

  return Array.from(groupsById.values()).sort((first, second) => (
    (marketOrder.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
    (marketOrder.get(second.id) ?? Number.MAX_SAFE_INTEGER)
  ))
}

const footballCompetitionMarketChips: HomeCompetitionMarketChip[] = [
  { id: 'populares', label: 'POPULARES' },
  { id: 'resultado-final', label: 'PARTIDAS' },
  { id: 'gols', label: 'GOLS' },
  { id: 'dupla-chance', label: 'DUPLA CHANCE' },
  { id: 'finalizacao-gol', label: 'FINALIZAÇÕES AO GOL' },
  { id: 'assistencias', label: 'ASSISTÊNCIAS' },
]

const basketballCompetitionMarketChips: HomeCompetitionMarketChip[] = [
  { id: 'principais', label: 'Principais' },
  { id: 'pontos-jogador', label: 'Pontos de jogador' },
  { id: 'q1', label: '1º Quarto' },
  { id: 'q2', label: '2º Quarto' },
  { id: 'assistencias', label: 'Assistências' },
]

// Pills da NFL conforme o Figma (POPULARES, PARTIDAS, 1º TEMPO, PASSES, RECEPÇÕES,
// TOUCHDOWNS, CORRIDA, 2º TEMPO).
const nflCompetitionMarketChips: HomeCompetitionMarketChip[] = [
  { id: 'populares', label: 'POPULARES' },
  { id: 'resultado-final', label: 'PARTIDAS' },
  { id: 'h1', label: '1º TEMPO' },
  { id: 'jardas-passe', label: 'PASSES' },
  { id: 'recepcoes', label: 'RECEPÇÕES' },
  { id: 'touchdowns', label: 'TOUCHDOWNS' },
  { id: 'jardas-corrida', label: 'CORRIDA' },
  { id: 'h2', label: '2º TEMPO' },
]

const getCompetitionMarketChips = (
  sport: SupportedCompetitionSport,
  liveOnly: boolean
): HomeCompetitionMarketChip[] => {
  const sourceChips = sport === 'basquete'
    ? basketballCompetitionMarketChips
    : sport === 'nfl'
      ? nflCompetitionMarketChips
      : footballCompetitionMarketChips

  return sourceChips
    .filter((chip) => !liveOnly || !isCalendarPlayerPropsMarketForSport(sport, chip.id))
    .map((chip) => (
      sport === 'basquete' && chip.id === 'vencedor'
        ? { id: 'principais', label: 'Principais' }
        : chip
    ))
}

const getCompetitionPlayerPropOdds = (
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

const getInitialMatchTimes = (groups: DisplayedCompetitionEventGroup[]) =>
  groups.reduce<Record<string, string>>((times, { events }) => {
    events.forEach((event) => {
      if (event.isLive) times[event.id] = event.dateTime
    })

    return times
  }, {})

const getBasketballMarketColumns = (
  event: CompetitionEvent,
  match: ReturnType<typeof getCompetitionLiveEventMatch>
): HomeCompetitionMatch['marketColumns'] => {
  const homeLabel = getTeamOddLabel(event.homeName)
  const awayLabel = getTeamOddLabel(event.awayName)
  const totalPointsLine = match.totalPointsOdds?.line ?? 212.5
  const fallbackHandicapLine = Math.max(1.5, Math.abs((event.homeScore ?? 0) - (event.awayScore ?? 0)) + 1.5)
  const handicapLine = Math.abs(match.handicapOdds?.line ?? fallbackHandicapLine)

  return [
    {
      label: 'Vencer',
      homeOdd: { label: homeLabel, value: event.odds.home },
      awayOdd: { label: awayLabel, value: event.odds.away },
    },
    {
      label: 'Handicap',
      homeOdd: { label: `${homeLabel} +${handicapLine}`, value: match.handicapOdds?.home ?? '1.87x' },
      awayOdd: { label: `${awayLabel} -${handicapLine}`, value: match.handicapOdds?.away ?? '1.94x' },
    },
    {
      label: 'Total',
      homeOdd: { label: `${totalPointsLine}+`, value: match.totalPointsOdds?.over ?? '1.89x' },
      awayOdd: { label: `${totalPointsLine}-`, value: match.totalPointsOdds?.under ?? '1.92x' },
    },
  ]
}

const getNflEventMarketColumns = (
  event: CompetitionEvent,
  match: ReturnType<typeof getCompetitionLiveEventMatch>,
  marketId?: string
) => getNflMarketColumns({
  homeLabel: getTeamOddLabel(event.homeName),
  awayLabel: getTeamOddLabel(event.awayName),
  homeOdd: event.odds.home,
  awayOdd: event.odds.away,
  hasEarlyPayout: event.earlyPayout !== false,
  totalLine: match.totalPointsOdds?.line,
  totalOver: match.totalPointsOdds?.over,
  totalUnder: match.totalPointsOdds?.under,
  handicapLine: match.handicapOdds?.line,
  handicapHome: match.handicapOdds?.home,
  handicapAway: match.handicapOdds?.away,
}, marketId)

// Recalcula as colunas a partir do match já montado, para os mercados de tempo.
const getNflMatchMarketColumns = (match: HomeCompetitionMatch, marketId?: string) => (
  getNflMarketColumns({
    homeLabel: String(match.odds[0]?.label ?? match.homeTeam),
    awayLabel: String(match.odds[1]?.label ?? match.awayTeam),
    homeOdd: match.odds[0]?.value ?? '-',
    awayOdd: match.odds[1]?.value ?? '-',
    hasEarlyPayout: match.tags.includes('PA'),
    totalLine: match.totalPointsOdds?.line,
    totalOver: match.totalPointsOdds?.over,
    totalUnder: match.totalPointsOdds?.under,
    handicapLine: match.handicapOdds?.line,
    handicapHome: match.handicapOdds?.home,
    handicapAway: match.handicapOdds?.away,
  }, marketId)
)

const getCompetitionHomeMatch = (
  eventGroup: DisplayedCompetitionEventGroup,
  event: CompetitionEvent,
  matchTimes: Record<string, string>
): HomeCompetitionMatch | null => {
  if (!isSupportedCompetitionSport(eventGroup.league.sport)) return null

  const sport = eventGroup.league.sport
  const match = getCompetitionLiveEventMatch(event, sport, matchTimes, eventGroup.league)
  const homeOdd: HomeCompetitionOdd = {
    label: getTeamOddLabel(event.homeName),
    value: event.odds.home,
  }
  const awayOdd: HomeCompetitionOdd = {
    label: getTeamOddLabel(event.awayName),
    value: event.odds.away,
  }
  const isTwoWaySport = sport === 'basquete' || sport === 'nfl'
  const middleOdd: HomeCompetitionOdd = isTwoWaySport
    ? {
        label: 'TOTAL',
        value: match.totalPointsOdds?.over ?? '-',
      }
    : {
        label: 'EMPATE',
        value: event.odds.draw ?? '-',
      }

  return {
    id: event.id,
    homeTeam: event.homeName,
    awayTeam: event.awayName,
    sport,
    leagueLabel: sport === 'nfl' ? eventGroup.league.name : undefined,
    marketLabel: isTwoWaySport ? eventGroup.league.name : 'RESULTADO FINAL',
    tags: sport === 'futebol'
      ? event.isLive
        ? ["90'"]
        : event.earlyPayout !== false
          ? ['PA', "90'"]
          : ["90'"]
      : sport === 'nfl' && event.earlyPayout !== false
        ? ['PA']
        : [],
    footerLabel: event.dateTime,
    ...(event.isLive ? {
      homeScore: String(event.homeScore ?? 0),
      awayScore: String(event.awayScore ?? 0),
      live: true,
      liveClock: matchTimes[event.id] ?? event.dateTime,
    } : {}),
    marketColumns: sport === 'basquete'
      ? getBasketballMarketColumns(event, match)
      : sport === 'nfl'
        ? getNflEventMarketColumns(event, match)
        : undefined,
    doubleChanceOdds: match.doubleChanceOdds,
    bothTeamsScoreOdds: match.bothTeamsScoreOdds,
    totalGoalsOdds: match.totalGoalsOdds,
    totalCornersOdds: match.totalCornersOdds,
    totalPointsOdds: match.totalPointsOdds,
    handicapOdds: match.handicapOdds,
    q3TotalOdds: match.q3TotalOdds,
    q4TotalOdds: match.q4TotalOdds,
    odds: isTwoWaySport
      ? [homeOdd, awayOdd, middleOdd]
      : [homeOdd, middleOdd, awayOdd],
  }
}

const getCompetitionPlayerProps = (
  groups: DisplayedCompetitionEventGroup[],
  marketChips: HomeCompetitionMarketChip[]
): HomeCompetitionPlayerProp[] => (
  marketChips.flatMap((marketChip) => (
    groups.flatMap((eventGroup) => {
      if (!isSupportedCompetitionSport(eventGroup.league.sport)) return []
      const sport = eventGroup.league.sport
      if (!isCalendarPlayerPropsMarketForSport(sport, marketChip.id)) return []

      return eventGroup.events.flatMap((event) => (
        getCalendarPlayerPropsForEvent(event, sport, marketChip.id).map((player) => ({
          id: `competition:${marketChip.id}:${player.id}`,
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
          sport,
          odds: getCompetitionPlayerPropOdds(player.options),
        }))
      ))
    })
  ))
)

const getMatchDateGroupTitle = (match: HomeCompetitionMatch) => {
  if (match.live) return 'Ao vivo'

  const [dateLabel = ''] = match.footerLabel.split(',').map((part) => part.trim())
  const compactDateMatch = dateLabel.match(/^\d{1,2}\/[a-zç]{3}/i)

  return (compactDateMatch?.[0] ?? dateLabel) || 'Próximos'
}

const getMatchGroupId = (title: string) => (
  title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'proximos'
)

const getCompetitionMatchGroups = (matches: HomeCompetitionMatch[]): HomeCompetitionMatchGroup[] => {
  const groups: HomeCompetitionMatchGroup[] = []
  const groupsByTitle = new Map<string, HomeCompetitionMatchGroup>()
  const groupOrder = new Map([
    ['Ao vivo', 0],
    ['Hoje', 1],
    ['Amanhã', 2],
  ])

  matches.forEach((match) => {
    const title = getMatchDateGroupTitle(match)
    const existingGroup = groupsByTitle.get(title)

    if (existingGroup) {
      existingGroup.matches.push(match)
      return
    }

    const group = {
      id: getMatchGroupId(title),
      title,
      matches: [match],
    }

    groupsByTitle.set(title, group)
    groups.push(group)
  })

  return groups.sort((first, second) => {
    const firstOrder = groupOrder.get(first.title) ?? Number.MAX_SAFE_INTEGER
    const secondOrder = groupOrder.get(second.title) ?? Number.MAX_SAFE_INTEGER

    return firstOrder - secondOrder
  })
}

const getCompetitionHighlight = (
  groups: DisplayedCompetitionEventGroup[],
  liveOnly: boolean
): CompetitionHighlightView | null => {
  const league = groups[0]?.league
  if (!isSupportedCompetitionSport(league?.sport)) return null

  const marketChips = getCompetitionMarketChips(league.sport, liveOnly)
  const matchTimes = getInitialMatchTimes(groups)
  const matches = groups
    .flatMap((eventGroup) => (
      eventGroup.events.map((event) => getCompetitionHomeMatch(eventGroup, event, matchTimes))
    ))
    .filter((match): match is HomeCompetitionMatch => !!match)

  if (matches.length === 0) return null

  return {
    competition: {
      title: league.name,
      sportLabel: getSportLabel(league.sport),
      marketChips,
      matches,
      playerProps: getCompetitionPlayerProps(groups, marketChips),
    },
    matchGroups: getCompetitionMatchGroups(matches),
  }
}

function CompetitionMatchCarousel({
  competition,
  activeMarketId,
  activeMarketLabel,
  onMatchClick,
}: {
  competition: HomeCompetitionHighlight
  activeMarketId?: string
  activeMarketLabel?: string
  onMatchClick?: (match: HomeCompetitionMatch, liveTimes: Record<string, string>) => void
}) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const getOddButtonProps = useOddSelection('')
  const [activeIndex, setActiveIndex] = useState(0)
  const matches = competition.matches
  const [liveTimes, setLiveTimes] = useState<Record<string, string>>(() => (
    matches.reduce<Record<string, string>>((times, match) => {
      if (match.live) times[match.id] = match.liveClock ?? match.footerLabel
      return times
    }, {})
  ))

  useEffect(() => {
    setLiveTimes(matches.reduce<Record<string, string>>((times, match) => {
      if (match.live) times[match.id] = match.liveClock ?? match.footerLabel
      return times
    }, {}))
  }, [matches])

  // Assina o jogo de NFL que acontece sozinho: sem isto a tela leria o placar certo e só
  // renderizaria de novo quando outro relógio a acordasse, atrasando o lance que chegou.
  useNflLiveFeed()
  useEffect(() => {
    if (!matches.some((match) => match.live)) return

    const interval = window.setInterval(() => {
      setLiveTimes((currentTimes) => {
        const nextTimes = { ...currentTimes }

        matches.forEach((match) => {
          if (!match.live) return
          // O jogo de NFL tem relógio próprio. Ver `hasNflLiveClock`.
          if (hasNflLiveClock(match.id)) {
            delete nextTimes[match.id]
            return
          }

          const currentTime = currentTimes[match.id] ?? match.liveClock ?? match.footerLabel
          nextTimes[match.id] = updateCompetitionMatchTime(currentTime)
        })

        return nextTimes
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [matches])

  const getBulletClassName = (index: number) => {
    const distance = Math.abs(index - activeIndex)

    if (distance === 0) return 'competition-match-carousel__bullet--active'
    if (distance === 1) return 'competition-match-carousel__bullet--near'

    return 'competition-match-carousel__bullet--far'
  }

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const trackEl = event.currentTarget
    const firstCard = trackEl.firstElementChild as HTMLElement | null
    if (!firstCard) return

    const gap = 12
    const cardStep = firstCard.offsetWidth + gap
    if (cardStep <= 0) return

    setActiveIndex(Math.max(0, Math.min(matches.length - 1, Math.round(trackEl.scrollLeft / cardStep))))
  }

  const renderOddButton = (
    match: HomeCompetitionMatch,
    market: Pick<CompetitionCarouselMarket, 'id' | 'label'>,
    odd: HomeCompetitionOdd,
    index: number
  ) => {
    const outcomeId = getCompetitionOddOutcomeId(odd.label, index)
    const betslipKey = getMatchOddBetslipKey({
      sport: match.sport,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      marketId: market.id,
      outcomeId,
      label: odd.label,
    })
    const eventId = betslipKey.eventId
    const groupId = betslipKey.groupId
    const eventTimeLabel = match.live ? liveTimes[match.id] ?? match.liveClock ?? match.footerLabel : match.footerLabel

    return (
      <HomeCompetitionOddButton
        odd={odd}
        {...getOddButtonProps(
          `${groupId}:${betslipKey.outcomeId}`,
          groupId,
          'competition-match-carousel__odd',
          createBetslipSelection({
            eventId,
            marketId: betslipKey.marketId,
            outcomeId: betslipKey.outcomeId,
            label: odd.label,
            odd: odd.value,
            marketLabel: market.label,
            eventStatus: match.live ? 'live' : 'prematch',
            sport: match.sport,
            leagueId: normalizeBetslipIdPart(competition.title),
            leagueName: competition.title,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            eventName: `${match.homeTeam} x ${match.awayTeam}`,
            eventTimeLabel,
            liveClock: match.live ? eventTimeLabel : undefined,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            selectionLabel: String(odd.label),
            marketTags: match.tags,
          })
        )}
        key={`${match.id}-${market.id}-${outcomeId}`}
      />
    )
  }

  // Adapta o renderer do carrossel para a assinatura do card de colunas de mercado.
  const renderMarketColumnOddButton: HomeCompetitionMatchOddRenderer = (odd, {
    match,
    index,
    marketId,
    marketLabel,
  }) => renderOddButton(
    match,
    { id: marketId, label: marketLabel },
    { label: String(odd.label ?? ''), value: String(odd.value ?? '') },
    index
  )

  if (matches.length === 0) return null

  const firstVisibleBulletIndex = matches.length > COMPETITION_MATCH_CAROUSEL_MAX_BULLETS
    ? Math.min(
        Math.max(activeIndex - Math.floor(COMPETITION_MATCH_CAROUSEL_MAX_BULLETS / 2), 0),
        matches.length - COMPETITION_MATCH_CAROUSEL_MAX_BULLETS
      )
    : 0
  const visibleBulletIndexes = Array.from(
    { length: Math.min(matches.length, COMPETITION_MATCH_CAROUSEL_MAX_BULLETS) },
    (_, index) => firstVisibleBulletIndex + index
  )

  return (
    <section className="competition-match-carousel" aria-label={`Jogos em destaque de ${competition.title}`}>
      <div
        ref={trackRef}
        className="competition-match-carousel__track"
        onScroll={handleScroll}
      >
        {matches.map((match) => {
          const market = getCompetitionCarouselMarket(match, activeMarketId, activeMarketLabel)
          const isClickable = !!onMatchClick

          // NFL reaproveita o card de colunas de mercado (mesmo layout do card de NBA
          // na home), que é o leagueMarkets do Figma: RF/PA, Handicap e Total.
          if (match.sport === 'nfl') {
            return (
              <HomeCompetitionMarketColumnsMatchCard
                match={{ ...match, marketColumns: getNflMatchMarketColumns(match, activeMarketId) }}
                liveTime={liveTimes[match.id]}
                activeMarket={activeMarketId}
                renderOddButton={renderMarketColumnOddButton}
                onClick={onMatchClick ? () => onMatchClick(match, liveTimes) : undefined}
                key={match.id}
              />
            )
          }

          return (
            <article
              className={[
                'competition-match-carousel__card',
                isClickable ? 'competition-match-carousel__card--clickable' : '',
              ].filter(Boolean).join(' ')}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onClick={isClickable ? () => onMatchClick(match, liveTimes) : undefined}
              onKeyDown={isClickable ? (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                onMatchClick(match, liveTimes)
              } : undefined}
              key={match.id}
            >
              <div className="competition-match-carousel__header">
                <span className="competition-match-carousel__league">{competition.title.toUpperCase()}</span>
                <div className="competition-match-carousel__market">
                  <span>{market.label}</span>
                  {match.tags.map((tag) => (
                    <strong key={`${match.id}-${tag}`}>{tag}</strong>
                  ))}
                </div>
              </div>
              <div className="competition-match-carousel__body">
                <div className="competition-match-carousel__teams">
                  {[{
                    name: match.homeTeam,
                    score: match.homeScore,
                  }, {
                    name: match.awayTeam,
                    score: match.awayScore,
                  }].map((team) => (
                    <div className="competition-match-carousel__team-row" key={`${match.id}-${team.name}`}>
                      <span className="competition-match-carousel__team-info">
                        <TeamLogo
                          teamName={team.name}
                          sport={match.sport}
                          className="competition-match-carousel__team-logo"
                          fallbackClassName="competition-match-carousel__team-logo--fallback"
                          placeholderClassName="competition-match-carousel__team-logo-placeholder"
                        />
                        <span className="competition-match-carousel__team-name">{team.name}</span>
                      </span>
                      {team.score !== undefined && (
                        <span className="competition-match-carousel__score">{team.score}</span>
                      )}
                    </div>
                  ))}
                </div>
                <div
                  className={`competition-match-carousel__odds${market.odds.length === 2 ? ' competition-match-carousel__odds--two' : ''}`}
                  aria-label={`Odds de ${match.homeTeam} contra ${match.awayTeam}`}
                >
                  {market.odds.map((odd, index) => renderOddButton(match, market, odd, index))}
                </div>
              </div>
              <div className="competition-match-carousel__footer">
                {match.live ? (
                  <span className="competition-match-carousel__live-summary">
                    <span className="competition-match-carousel__live-primary">
                      <span className="competition-match-carousel__live-badge">
                        <span className="competition-match-carousel__live-dot" />
                        AO VIVO
                      </span>
                      <span className="competition-match-carousel__live-time">
                        {getCompetitionLiveFooterClock(liveTimes[match.id] ?? match.liveClock ?? match.footerLabel)}
                      </span>
                    </span>
                  </span>
                ) : (
                  <span className="competition-match-carousel__time">
                    {match.live ? getCompetitionLiveFooterClock(liveTimes[match.id] ?? match.liveClock ?? match.footerLabel) : match.footerLabel}
                  </span>
                )}
                <span className="competition-match-carousel__more">
                  Ver mais
                  <img src={chevronRight} alt="" />
                </span>
              </div>
            </article>
          )
        })}
      </div>
      {matches.length > 1 && (
        <div className="competition-match-carousel__bullets" aria-hidden="true">
          {visibleBulletIndexes.map((matchIndex) => (
            <span
              className={`competition-match-carousel__bullet ${getBulletClassName(matchIndex)}`}
              key={`${matches[matchIndex].id}-bullet`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function CompetitionPlayerPropMarketSection({
  competition,
  group,
}: {
  competition: HomeCompetitionHighlight
  group: CompetitionPlayerPropMarketGroup
}) {
  const getOddButtonProps = useOddSelection('')
  const gridRef = useRef<HTMLDivElement | null>(null)
  const animationRef = useRef<{ fromHeight: number } | null>(null)
  const animationStartTimerRef = useRef<number | null>(null)
  const animationTimerRef = useRef<number | null>(null)
  const [isOpen, setIsOpen] = useState(true)
  const [visibleCount, setVisibleCount] = useState(COMPETITION_PLAYER_PROPS_INITIAL_COUNT)
  const [enteringPropIds, setEnteringPropIds] = useState<Set<string>>(() => new Set())
  const visibleMaxCount = Math.min(COMPETITION_PLAYER_PROPS_MAX_COUNT, group.props.length)
  const visibleProps = group.props.slice(0, Math.min(visibleCount, visibleMaxCount))
  const canLoadMore = visibleProps.length < visibleMaxCount

  const clearAnimation = useCallback(() => {
    if (animationStartTimerRef.current !== null) {
      window.clearTimeout(animationStartTimerRef.current)
      animationStartTimerRef.current = null
    }

    if (animationTimerRef.current !== null) {
      window.clearTimeout(animationTimerRef.current)
      animationTimerRef.current = null
    }
  }, [])

  const handleLoadMore = useCallback(() => {
    const currentCount = Math.min(visibleCount, visibleMaxCount)
    const nextCount = Math.min(
      currentCount + COMPETITION_PLAYER_PROPS_LOAD_STEP,
      visibleMaxCount
    )

    if (nextCount <= currentCount) return

    const gridEl = gridRef.current
    if (gridEl) {
      clearAnimation()
      animationRef.current = { fromHeight: gridEl.getBoundingClientRect().height }
      gridEl.classList.add('home-competition__players--accordion')
      gridEl.style.height = `${animationRef.current.fromHeight}px`
      gridEl.style.overflow = 'hidden'
    }

    setEnteringPropIds(new Set(
      group.props.slice(currentCount, nextCount).map((prop) => prop.id)
    ))
    setVisibleCount(nextCount)
  }, [clearAnimation, group.props, visibleCount, visibleMaxCount])

  useLayoutEffect(() => {
    const animation = animationRef.current
    const gridEl = gridRef.current

    if (!animation || !gridEl) return

    animationRef.current = null
    const fromHeight = animation.fromHeight
    gridEl.classList.remove('home-competition__players--accordion')
    gridEl.style.height = `${fromHeight}px`
    gridEl.style.overflow = 'hidden'
    void gridEl.offsetHeight

    const toHeight = gridEl.scrollHeight

    if (Math.abs(toHeight - fromHeight) < 1) {
      gridEl.style.height = ''
      gridEl.style.overflow = ''
      animationStartTimerRef.current = window.setTimeout(() => {
        animationStartTimerRef.current = null
        setEnteringPropIds(new Set())
      }, 0)
      return
    }

    gridEl.classList.add('home-competition__players--accordion')
    animationStartTimerRef.current = window.setTimeout(() => {
      animationStartTimerRef.current = null
      gridEl.style.height = `${toHeight}px`

      animationTimerRef.current = window.setTimeout(() => {
        gridEl.style.height = ''
        gridEl.style.overflow = ''
        gridEl.classList.remove('home-competition__players--accordion')
        setEnteringPropIds(new Set())
        animationTimerRef.current = null
      }, COMPETITION_PLAYER_PROPS_ACCORDION_DURATION_MS)
    }, 24)

    return clearAnimation
  }, [clearAnimation, visibleProps.length])

  useEffect(() => () => {
    clearAnimation()
  }, [clearAnimation])

  const renderPlayerPropOddButton: HomeCompetitionPlayerPropOddRenderer = (odd, {
    prop,
    className,
  }) => {
    // Canonical key shared with the sport screen and the event so the SAME bet
    // (match + player + line) yields the SAME betslip id on every screen. A per-player
    // market id keeps players independent (multi-select); the line is the outcome.
    const { eventId, marketId, outcomeId, groupId: oddGroupId } = getPlayerPropBetslipKey({
      sport: prop.sport,
      homeTeam: prop.homeTeam,
      awayTeam: prop.awayTeam,
      marketId: prop.marketId ?? prop.marketLabel,
      playerName: prop.playerName || prop.id,
      lineLabel: odd.label,
    })

    return (
      <HomeCompetitionOddButton
        odd={odd}
        {...getOddButtonProps(
          `${oddGroupId}:${outcomeId}`,
          oddGroupId,
          className,
          createBetslipSelection({
            eventId,
            marketId,
            outcomeId,
            label: odd.label,
            odd: odd.value,
            marketLabel: prop.marketLabel,
            eventStatus: /ao vivo/i.test(prop.timeLabel) ? 'live' : 'prematch',
            selectionType: 'player',
            sport: prop.sport,
            leagueId: normalizeBetslipIdPart(competition.title),
            leagueName: competition.title,
            eventName: prop.matchLabel,
            eventTimeLabel: prop.timeLabel,
            playerName: prop.playerName,
            selectionTeamName: prop.teamName,
            selectionLabel: `${prop.playerName} ${odd.label}`,
          })
        )}
      />
    )
  }

  return (
    <section
      className={[
        'competition-player-props__market',
        isOpen ? '' : 'competition-player-props__market--collapsed',
      ].filter(Boolean).join(' ')}
      aria-label={group.title}
    >
      <header className="competition-player-props__market-header">
        <h3>
          {group.title}
          {group.subtitle && (
            <span className="competition-player-props__market-subtitle">{group.subtitle}</span>
          )}
        </h3>
        <button
          type="button"
          className="competition-player-props__market-toggle"
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Recolher' : 'Expandir'} ${group.title}`}
          onClick={() => setIsOpen((current) => !current)}
        >
          <CaretRightIcon aria-hidden="true" className="competition-player-props__market-chevron" weight="bold" />
        </button>
      </header>
      <div className="competition-player-props__market-body" aria-hidden={!isOpen}>
        <div className="competition-player-props__market-body-inner">
          <div
            ref={gridRef}
            className="home-competition__players home-competition__players--grid competition-player-props__grid"
            aria-label={`Cards de ${group.title}`}
          >
            {visibleProps.map((prop) => (
              <HomeCompetitionPlayerPropCard
                prop={prop}
                className={enteringPropIds.has(prop.id) ? 'home-competition__player-card--entering' : ''}
                showMarketLabel={false}
                renderOddButton={renderPlayerPropOddButton}
                key={prop.id}
              />
            ))}
          </div>
          {canLoadMore && (
            <button
              type="button"
              className="home-competition__load-more competition-player-props__load-more"
              onClick={handleLoadMore}
            >
              <span>Carregar mais</span>
              <img src={chevronDown} alt="" className="home-competition__load-more-icon" />
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function CompetitionPlayerPropsMarkets({
  competition,
  activeMarketId,
  noTopPadding = false,
}: {
  competition: HomeCompetitionHighlight
  activeMarketId?: string
  noTopPadding?: boolean
}) {
  const marketGroups = useMemo(() => (
    getCompetitionPlayerPropMarketGroups(competition, activeMarketId)
  ), [activeMarketId, competition])

  if (marketGroups.length === 0) return null

  return (
    <section
      className={[
        'competition-player-props',
        noTopPadding ? 'competition-player-props--no-top-padding' : '',
      ].filter(Boolean).join(' ')}
      aria-label="Player props"
    >
      {marketGroups.map((group) => (
        <CompetitionPlayerPropMarketSection
          competition={competition}
          group={group}
          key={group.id}
        />
      ))}
    </section>
  )
}

export interface CompetitionMarketSelection {
  competitionView: CompetitionHighlightView | null
  groups: DisplayedCompetitionEventGroup[]
  marketFilters: { id: string; label: string }[]
  selectedMarketId?: string
  selectedMarketLabel?: string
  handleMarketChange: (marketId: string) => void
  isSelectedPlayerPropsMarket: boolean
  shouldShowMatchList: boolean
  carouselMarketId?: string
  carouselMarketLabel?: string
  activePlayerPropMarketId?: string
  shouldShowPlayerPropsOnly: boolean
  basePromoVariant?: 'garantida' | 'super-aumentada'
  matchListCompetition?: HomeCompetitionHighlight
}

export function useCompetitionMarketSelection({
  sport,
  competitionId,
  liveOnly = false,
}: {
  sport: string
  competitionId: string
  liveOnly?: boolean
}): CompetitionMarketSelection {
  const marketScopeKey = `${sport}:${competitionId}:${liveOnly ? 'live' : 'all'}`
  const [activeMarketState, setActiveMarketState] = useState<{ scopeKey: string; marketId?: string }>()
  // Este hook é quem MONTA o card da competição na lista, e o card do jogo de NFL é o único que
  // muda sozinho. Assinar o feed não basta: a lista abaixo é um `useMemo` com escopo de
  // competição, então sem o feed nas dependências o hook renderizaria de novo a cada lance e
  // devolveria sempre o instantâneo do cache — o placar parado num lance que já passou,
  // enquanto a tela do evento e o sheet de jogadas seguem em frente.
  const nflLiveFeed = useNflLiveFeed()
  const { groups } = useMemo(() => (
    competitionId
      ? getCalendarDisplayedEventGroups({
          sportFilter: sport,
          competitionId,
          liveOnly,
        })
      : { groups: [] as DisplayedCompetitionEventGroup[] }
  ), [competitionId, liveOnly, nflLiveFeed, sport])
  const competitionView = useMemo(() => (
    getCompetitionHighlight(groups, liveOnly)
  ), [groups, liveOnly])
  const marketFilters = useMemo(() => (
    competitionView?.competition.marketChips?.map((chip) => ({
      id: chip.id,
      label: chip.label,
    })) ?? []
  ), [competitionView])
  const defaultMarketId = marketFilters[0]?.id
  const activeMarketId = activeMarketState?.scopeKey === marketScopeKey
    ? activeMarketState.marketId
    : undefined
  const selectedMarketId = activeMarketId && marketFilters.some((filter) => filter.id === activeMarketId)
    ? activeMarketId
    : defaultMarketId
  const isSelectedPlayerPropsMarket = selectedMarketId
    ? isCalendarPlayerPropsMarketForSport(sport, selectedMarketId)
    : false
  const shouldShowMatchList = selectedMarketId
    ? COMPETITION_MATCH_LIST_MARKET_IDS.has(selectedMarketId)
    : false
  const selectedMarketLabel = marketFilters.find((filter) => filter.id === selectedMarketId)?.label
  const carouselMarketId = selectedMarketId && !isSelectedPlayerPropsMarket
    ? selectedMarketId
    : defaultMarketId
  const carouselMarketLabel = marketFilters.find((filter) => filter.id === carouselMarketId)?.label
  const activePlayerPropMarketId = selectedMarketId && isSelectedPlayerPropsMarket
    ? selectedMarketId
    : undefined
  const shouldShowPlayerPropsOnly = !!activePlayerPropMarketId
  const handleMarketChange = useCallback((marketId: string) => {
    setActiveMarketState({ scopeKey: marketScopeKey, marketId })
  }, [marketScopeKey])
  const basePromoVariant = competitionView?.competition.title === 'Champions League'
    ? 'garantida'
    : competitionView?.competition.title === 'NBA'
      ? 'super-aumentada'
      : undefined
  const matchListCompetition = competitionView && shouldShowMatchList
    ? {
        ...competitionView.competition,
        marketChips: competitionView.competition.marketChips?.map((chip) => (
          chip.id === COMPETITION_MATCHES_MARKET_ID
            ? { ...chip, label: 'Resultado Final' }
            : chip
        )),
      }
    : competitionView?.competition

  return {
    competitionView,
    groups,
    marketFilters,
    selectedMarketId,
    selectedMarketLabel,
    handleMarketChange,
    isSelectedPlayerPropsMarket,
    shouldShowMatchList,
    carouselMarketId,
    carouselMarketLabel,
    activePlayerPropMarketId,
    shouldShowPlayerPropsOnly,
    basePromoVariant,
    matchListCompetition,
  }
}

export function CompetitionPage({
  sport,
  competitionId,
  liveOnly = false,
  marketSelection,
  onLiveMatchClick,
  onOpenCompetition,
}: CompetitionPageProps) {
  const {
    competitionView,
    groups,
    selectedMarketId,
    selectedMarketLabel,
    shouldShowMatchList,
    shouldShowPlayerPropsOnly,
    carouselMarketId,
    carouselMarketLabel,
    activePlayerPropMarketId,
    basePromoVariant,
    matchListCompetition,
  } = marketSelection
  const handleMatchClick = useCallback((
    match: HomeCompetitionMatch,
    _competition: HomeCompetitionHighlight,
    liveTimes: Record<string, string>
  ) => {
    const eventGroup = groups.find(({ events }) => events.some((event) => event.id === match.id))
    if (!eventGroup) return

    const matchTimes = eventGroup.league.events.reduce<Record<string, string>>((times, event) => {
      times[event.id] = liveTimes[event.id] ?? event.dateTime
      return times
    }, {})
    const payload = getCompetitionLiveEventOpenPayload({
      league: eventGroup.league,
      selectedEventId: match.id,
      matchTimes,
    })

    if (payload) onLiveMatchClick?.(payload)
  }, [groups, onLiveMatchClick])

  if (competitionView) {
    return (
      <>
        {shouldShowMatchList && matchListCompetition ? (
          <HomeCompetitionSection
            activeMarketId={selectedMarketId}
            className="home-competition--competition-match-list"
            competition={matchListCompetition}
            hideMarketChips
            hideTitleRow
            matchGroups={competitionView.matchGroups}
            onMatchClick={onLiveMatchClick ? (match, _competition, liveTimes) => (
              handleMatchClick(match, competitionView.competition, liveTimes)
            ) : undefined}
          />
        ) : shouldShowPlayerPropsOnly ? (
          <CompetitionPlayerPropsMarkets
            activeMarketId={activePlayerPropMarketId}
            competition={competitionView.competition}
          />
        ) : (
          <>
            <CompetitionMatchCarousel
              competition={competitionView.competition}
              activeMarketId={carouselMarketId}
              activeMarketLabel={carouselMarketLabel ?? selectedMarketLabel}
              onMatchClick={onLiveMatchClick ? (match, liveTimes) => handleMatchClick(match, competitionView.competition, liveTimes) : undefined}
            />
            {basePromoVariant && <BasePromo key={basePromoVariant} variant={basePromoVariant} />}
            <CompetitionPlayerPropsMarkets
              activeMarketId={activePlayerPropMarketId}
              competition={competitionView.competition}
              noTopPadding={!basePromoVariant}
            />
          </>
        )}
      </>
    )
  }

  return (
    <CalendarSection
      sportFilter={sport}
      competitionId={competitionId}
      liveOnly={liveOnly}
      onLiveMatchClick={onLiveMatchClick}
      onOpenCompetition={onOpenCompetition}
    />
  )
}
