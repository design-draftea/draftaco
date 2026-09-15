import { useState, useRef, useEffect, type MouseEvent } from 'react'
import { CaretDownIcon } from '@phosphor-icons/react'
import './OffersSection.css'
import { TeamLogo } from '../TeamLogo'
import {
  BETSLIP_ODD_INTERACTION_EVENT,
  createBetslipSelection,
  getBetslipEventId,
  getBetslipMarketGroupId,
  normalizeBetslipIdPart,
  type BetslipPromoVariant,
  type BetslipSelection,
} from '../../shared/hooks/betslipUtils'
import { requestLocationPermissionGate } from '../../shared/utils/locationPermissionGate'
import { useBetslip } from '../../shared/hooks/useBetslip'
import { useOddSelection } from '../../shared/hooks/useOddSelection'
import { useSlidingActiveIndicator } from '../../shared/hooks/useSlidingActiveIndicator'
import {
  BETSLIP_PECHINCHA_MAX_STAKE_RULE_LABEL,
  BETSLIP_PECHINCHA_SELECTION_RULE_LABEL,
  BETSLIP_PECHINCHA_TOTAL_ODDS_RULE_LABEL,
} from '../../shared/hooks/betslipPechinchaRules'
import { getTennisPlayerCountryIcon } from '../../data/tennisCountryIcons'

import iconCombinada from '../../assets/iconCombinada.png'
import iconSuperCombinada from '../../assets/iconSuperCombinada.png'
import iconSuperAumentada from '../../assets/iconSuperAumentada.png'
import iconAumentada from '../../assets/iconAumentada.png'
import iconPechincha from '../../assets/iconPechincha.png'
import iconBoost from '../../assets/iconBoost.png'
import escudoBayerLeverkusen from '../../assets/escudoBayerLeverkusen.png'
import escudoBayerMunique from '../../assets/escudoBayerMunique.png'
import escudoPSG from '../../assets/escudoPSG.png'
import escudoLyon from '../../assets/escudoLyon.png'
import escudoCruzeiro from '../../assets/escudoCruzeiro.png'
import escudoPalmeiras from '../../assets/escudoPalmeiras.png'
import escudoFluminense from '../../assets/escudoFluminense.png'
import escudoBotafogo from '../../assets/escudoBotafogo.png'
import escudoBahia from '../../assets/escudoBahia.png'
import escudoManchesterCity from '../../assets/escudomanchesterCity.png'
import escudoLiverpool from '../../assets/escudoLiverpool.png'
import escudoBarcelonaGde from '../../assets/escudoBarcelonaGde.png'
import escudoBotafogoGde from '../../assets/escudoBotafogoGde.png'
import escudoFlamengoGde from '../../assets/escudoFlamengoGde.png'
import escudo76ersGde from '../../assets/escudo76ersGde.png'
import escudoWarriorsGde from '../../assets/escudoWarriosGde.png'
import escudoBullsGde from '../../assets/escudoBullsGde.png'
import escudoPistonsGde from '../../assets/escudoPistonsGde.png'
import escudoMiami from '../../assets/escudoMiami.png'
import escudoLakers from '../../assets/escudoLakers.png'
import escudoCavaliers from '../../assets/escudoMagic.png' // Using Magic as placeholder for Cavaliers
import iconBasquete from '../../assets/iconSports/basketball.png'
import iconFutebol from '../../assets/iconSports/soccer.png'
import iconTenis from '../../assets/iconSports/tennis.png'
import playerJimmyButler from '../../assets/playerJimmyButler.png'
import playerLeBronJames from '../../assets/playerLeBronJames.png'
import playerLukaDoncic from '../../assets/playerLukaDoncic.png'
import playerStephenCurry from '../../assets/playerStephenCurry.png'
import playerRaphinha from '../../assets/playerRaphinha.png'
import playerArrascaeta from '../../assets/playerArrascaeta.png'
import playerLewa from '../../assets/playerLewa.png'
import playerYamal from '../../assets/playerYamal.png'
import iconBoostWhite from '../../assets/iconBoostWhite.svg'

interface FilterChip {
  id: string
  label: string
}

const filterChips: FilterChip[] = [
  { id: 'melhores', label: 'As melhores' },
  { id: 'pechinchas', label: 'Pechinchas' },
  { id: 'super-combinadas', label: 'Super Combinadas' },
  { id: 'combinadas', label: 'Combinadas' },
  { id: 'super-aumentada', label: 'Super Aumentada' },
  { id: 'aumentada', label: 'Aumentada' },
]

const offerPechinchaRuleLabels = [
  BETSLIP_PECHINCHA_MAX_STAKE_RULE_LABEL,
  BETSLIP_PECHINCHA_SELECTION_RULE_LABEL,
  BETSLIP_PECHINCHA_TOTAL_ODDS_RULE_LABEL,
]

const offerAumentadaRuleLabels = [
  'Entrada max. R$350',
  'Min. 3+ seleções de 1.40+',
  'Odd total mín. 4.00x',
]

const showSuperCombinadaOffers = false

const getOfferPromoVariant = (offer: Pick<OfferCard, 'category' | 'type'>): BetslipPromoVariant | undefined => {
  if (offer.category === 'super-aumentada' || offer.type === 'super_aumentada') return 'super-aumentada'
  if (offer.category === 'aumentada' || offer.type === 'aumentada') return 'aumentada'

  return undefined
}

const offerTeamNameByLogo: Record<string, string> = {
  [escudoBayerLeverkusen]: 'B. Leverkusen',
  [escudoBayerMunique]: 'Bayern',
  [escudoPSG]: 'PSG',
  [escudoLyon]: 'Lyon',
  [escudoCruzeiro]: 'Cruzeiro',
  [escudoPalmeiras]: 'Palmeiras',
  [escudoFluminense]: 'Fluminense',
  [escudoBotafogo]: 'Botafogo',
  [escudoBahia]: 'Bahia',
  [escudoManchesterCity]: 'Man. City',
  [escudoLiverpool]: 'Liverpool',
  [escudoBarcelonaGde]: 'Barcelona',
  [escudoBotafogoGde]: 'Botafogo',
  [escudoFlamengoGde]: 'Flamengo',
  [escudo76ersGde]: '76ers',
  [escudoWarriorsGde]: 'Warriors',
  [escudoBullsGde]: 'Bulls',
  [escudoPistonsGde]: 'Pistons',
  [escudoMiami]: 'Heat',
  [escudoLakers]: 'Lakers',
  [escudoCavaliers]: 'Cavaliers',
}

interface OfferTeamLogoProps {
  teamName: string
  currentLogo: string
  sport: string
  className: string
}

function OfferTeamLogo({ teamName, currentLogo, sport, className }: OfferTeamLogoProps) {
  return (
    <TeamLogo
      teamName={teamName}
      currentLogo={currentLogo}
      sport={sport}
      className={className}
      fallbackClassName={`${className}--sport`}
      placeholderClassName={`${className} ${className}--placeholder`}
    />
  )
}

const getOfferTeamName = (label: string, logo: string) =>
  offerTeamNameByLogo[logo] ?? label

const offerTeamAliasByKey: Record<string, string> = {
  'chicago-bulls': 'bulls',
  'miami-heat': 'heat',
  'golden-state': 'warriors',
  'golden-state-warriors': 'warriors',
  'la-lakers': 'lakers',
  'los-angeles-lakers': 'lakers',
  'detroit-pistons': 'pistons',
  'cleveland-cavaliers': 'cavaliers',
}

const getOfferTeamKey = (teamName = '') => {
  const normalizedTeam = normalizeBetslipIdPart(
    teamName
      .replace(/\b\d+(?:[,.]\d+)?\+?\b/g, ' ')
      .replace(/\b(?:mais|menos|de|over|under)\b/gi, ' ')
  )

  return offerTeamAliasByKey[normalizedTeam] ?? normalizedTeam
}

const isSameOfferTeam = (firstTeam: string | undefined, secondTeam: string | undefined) => (
  Boolean(firstTeam && secondTeam && getOfferTeamKey(firstTeam) === getOfferTeamKey(secondTeam))
)

interface OfferCard {
  id: string
  type: 'combinada' | 'super_combinada' | 'super_aumentada' | 'aumentada' | 'pechincha'
  category: 'melhores' | 'combinadas' | 'super-combinadas' | 'super-aumentada' | 'aumentada' | 'pechinchas'
  sport?: string
  sportOnly?: boolean
  title: string
  tagLabel: string
  tagColor: string
  tagIcon: string
  subtitle?: string
  date?: string
  oldOdd?: string
  newOdd: string
  // Para cards de combinada simples (times)
  events?: {
    team1: string
    team1Icon: string
    team2Icon: string
    market: string
  }[]
  // Para cards de combinada com jogadores
  playerEvents?: {
    icon: string
    name: string
    value?: string
    market: string
  }[]
  // Mostrar "Ver todos"
  showViewAll?: number
  // Para cards de jogador
  player?: {
    name: string
    team: string
    image: string
    stat: string
    statValue: string
    oldStatValue?: string // For pechincha cards (crossed out value)
    sportIcon?: string
  }
  // Para cards de time (super aumentada de time)
  teamStat?: {
    teamName: string
    teamIcon: string
    sportIcon?: string
    stat: string
    statValue: string
  }
}

interface LiveOfferFixture {
  home: string
  away: string
  time: string
  homeScore: number
  awayScore: number
}

interface LiveOfferDetails {
  time: string
  homeScore: number
  awayScore: number
}

interface OfferMatchFixture {
  sport: string
  homeTeam: string
  awayTeam: string
  homeIcon?: string
  awayIcon?: string
  dateTime?: string
}

const offerMatchFixtures: OfferMatchFixture[] = [
  {
    sport: 'basquete',
    homeTeam: 'Bulls',
    awayTeam: 'Heat',
    homeIcon: escudoBullsGde,
    awayIcon: escudoMiami,
    dateTime: 'Hoje, 22:00',
  },
  {
    sport: 'basquete',
    homeTeam: 'Warriors',
    awayTeam: 'Lakers',
    homeIcon: escudoWarriorsGde,
    awayIcon: escudoLakers,
    dateTime: 'Amanhã, 21:30',
  },
  {
    sport: 'basquete',
    homeTeam: 'Pistons',
    awayTeam: 'Cavaliers',
    homeIcon: escudoPistonsGde,
    awayIcon: escudoCavaliers,
    dateTime: 'Amanhã, 23:00',
  },
]

const findOfferMatchFixture = (teamName: string | undefined, sport: string | undefined, opponentName?: string) => {
  if (!teamName) return undefined

  return offerMatchFixtures.find((fixture) => {
    if (sport && fixture.sport !== sport) return false

    const hasTeam = isSameOfferTeam(fixture.homeTeam, teamName) || isSameOfferTeam(fixture.awayTeam, teamName)
    const hasOpponent = !opponentName
      || isSameOfferTeam(fixture.homeTeam, opponentName)
      || isSameOfferTeam(fixture.awayTeam, opponentName)

    return hasTeam && hasOpponent
  })
}

const resolveOfferMatch = ({
  sport,
  teamName,
  opponentName,
  fallbackHomeTeam,
  fallbackAwayTeam,
  fallbackHomeIcon,
  fallbackAwayIcon,
  fallbackDate,
}: {
  sport?: string
  teamName?: string
  opponentName?: string
  fallbackHomeTeam?: string
  fallbackAwayTeam?: string
  fallbackHomeIcon?: string
  fallbackAwayIcon?: string
  fallbackDate?: string
}): OfferMatchFixture => {
  const fixture = findOfferMatchFixture(teamName, sport, opponentName)
  if (fixture) return fixture

  return {
    sport: sport ?? 'ofertas',
    homeTeam: fallbackHomeTeam || teamName || 'Evento',
    awayTeam: fallbackAwayTeam || opponentName || '',
    homeIcon: fallbackHomeIcon,
    awayIcon: fallbackAwayIcon,
    dateTime: fallbackDate,
  }
}

const getLiveOfferDetailsForMatch = (
  detailsByMatch: Record<string, LiveOfferDetails>,
  match: OfferMatchFixture,
  fallbackDetails?: LiveOfferDetails
) => (
  detailsByMatch[`${match.homeTeam} vs ${match.awayTeam}`]
    ?? detailsByMatch[`${match.awayTeam} vs ${match.homeTeam}`]
    ?? fallbackDetails
)

const parseOfferOddValue = (oddLabel: string) => {
  const oddValue = Number.parseFloat(oddLabel.replace(',', '.').replace(/[^0-9.]/g, ''))
  return Number.isFinite(oddValue) && oddValue > 0 ? oddValue : null
}

const getOfferComboLegOddLabel = (totalOddLabel: string, legCount: number) => {
  const totalOddValue = parseOfferOddValue(totalOddLabel)
  if (!totalOddValue || legCount <= 0) return totalOddLabel

  return `${Math.pow(totalOddValue, 1 / legCount).toFixed(2)}x`
}

interface OfferBetslipEntry {
  groupId: string
  selection: BetslipSelection
}

const isBetslipEntry = (entry: OfferBetslipEntry | undefined): entry is OfferBetslipEntry => !!entry

const getOfferMatchTeams = (label?: string) => {
  if (!label) return null

  const parts = label.split(/\s+(?:vs|x)\s+/i).map((part) => part.trim()).filter(Boolean)
  if (parts.length !== 2) return null

  return {
    homeTeam: parts[0],
    awayTeam: parts[1],
  }
}

const getOfferComboLegCount = (offer: OfferCard) => (
  (offer.events?.length ?? 0) + (offer.playerEvents?.length ?? 0)
)

const getOfferComboBetslipEntries = (
  offer: OfferCard,
  liveDetailsByMatch: Record<string, LiveOfferDetails>
): OfferBetslipEntry[] => {
  const legCount = getOfferComboLegCount(offer)
  if (offer.player || offer.teamStat || legCount === 0) return []

  const offerLiveDetails = offer.subtitle ? liveDetailsByMatch[offer.subtitle] : undefined
  const comboLegOddLabel = getOfferComboLegOddLabel(offer.newOdd, legCount)
  const comboId = `offer-${offer.id}`
  const comboProps = {
    comboId,
    comboTitle: offer.title,
    comboTypeLabel: offer.tagLabel,
    comboTotalOddLabel: offer.newOdd,
    comboLegCount: legCount,
    promoVariant: getOfferPromoVariant(offer),
  }

  if (offer.events?.length) {
    return offer.events.map((event, index) => {
      const selectedTeamName = getOfferTeamName(event.team1, event.team1Icon) || event.team1
      const opponentTeamName = getOfferTeamName('', event.team2Icon)
      const resolvedMatch = resolveOfferMatch({
        sport: offer.sport,
        teamName: selectedTeamName,
        opponentName: opponentTeamName,
        fallbackHomeTeam: selectedTeamName,
        fallbackAwayTeam: opponentTeamName,
        fallbackHomeIcon: event.team1Icon,
        fallbackAwayIcon: event.team2Icon,
        fallbackDate: offer.date,
      })
      const liveDetails = getLiveOfferDetailsForMatch(liveDetailsByMatch, resolvedMatch, offerLiveDetails)
      const eventName = resolvedMatch.awayTeam
        ? `${resolvedMatch.homeTeam} x ${resolvedMatch.awayTeam}`
        : resolvedMatch.homeTeam
      const marketId = `${event.market}-${selectedTeamName}-${resolvedMatch.homeTeam}-${resolvedMatch.awayTeam || index}`
      const isTeamSelection = normalizeBetslipIdPart(event.team1) === normalizeBetslipIdPart(selectedTeamName)
        && (isSameOfferTeam(selectedTeamName, resolvedMatch.homeTeam) || isSameOfferTeam(selectedTeamName, resolvedMatch.awayTeam))
      const selection = createBetslipSelection({
        eventId: getBetslipEventId({
          sport: offer.sport ?? 'ofertas',
          homeTeam: resolvedMatch.homeTeam,
          awayTeam: resolvedMatch.awayTeam,
          fallbackId: `${offer.id}-event-${index}`,
        }),
        marketId,
        outcomeId: `${offer.id}-${index}-${event.team1}`,
        label: event.team1,
        selectionLabel: event.team1,
        odd: comboLegOddLabel,
        marketLabel: event.market,
        eventStatus: liveDetails ? 'live' : 'prematch',
        selectionType: isTeamSelection ? 'team' : 'market',
        sport: offer.sport,
        homeTeam: resolvedMatch.homeTeam,
        awayTeam: resolvedMatch.awayTeam,
        eventName,
        eventTimeLabel: liveDetails?.time ?? resolvedMatch.dateTime ?? offer.date,
        liveClock: liveDetails?.time,
        homeScore: liveDetails?.homeScore,
        awayScore: liveDetails?.awayScore,
        homeTeamIcon: resolvedMatch.homeIcon,
        awayTeamIcon: resolvedMatch.awayIcon,
        selectionIcon: event.team1Icon,
        badgeType: 'boost',
        comboLegIndex: index,
        ...comboProps,
      })

      return selection ? {
        groupId: getBetslipMarketGroupId({ eventId: selection.eventId, marketId: selection.marketId }),
        selection,
      } : undefined
    }).filter(isBetslipEntry)
  }

  const offerMatchTeams = getOfferMatchTeams(offer.subtitle)

  return (offer.playerEvents ?? []).map((playerEvent, index) => {
    const eventMatchTeams = getOfferMatchTeams(playerEvent.name) ?? offerMatchTeams
    const iconTeamName = getOfferTeamName('', playerEvent.icon)
    const resolvedMatch = resolveOfferMatch({
      sport: offer.sport,
      teamName: iconTeamName || eventMatchTeams?.homeTeam,
      opponentName: eventMatchTeams?.awayTeam,
      fallbackHomeTeam: eventMatchTeams?.homeTeam ?? iconTeamName,
      fallbackAwayTeam: eventMatchTeams?.awayTeam,
      fallbackHomeIcon: eventMatchTeams ? undefined : playerEvent.icon,
      fallbackDate: offer.date,
    })
    const liveDetails = getLiveOfferDetailsForMatch(liveDetailsByMatch, resolvedMatch, offerLiveDetails)
    const eventName = resolvedMatch.awayTeam
      ? `${resolvedMatch.homeTeam} x ${resolvedMatch.awayTeam}`
      : resolvedMatch.homeTeam || offer.subtitle || offer.title
    const isMatchName = !!getOfferMatchTeams(playerEvent.name)
    const isTeamSelection = !!iconTeamName && playerEvent.name === iconTeamName
    const isPlayerSelection = !!playerEvent.value
      && !isMatchName
      && !isTeamSelection
      && !/^(mais|menos|ambas|total)\b/i.test(playerEvent.name)
    const selectionLabel = isMatchName && playerEvent.value ? playerEvent.value : playerEvent.name
    const label = playerEvent.value
      ? isMatchName ? playerEvent.value : `${playerEvent.name} ${playerEvent.value}`
      : playerEvent.name
    const marketLabel = !isPlayerSelection && playerEvent.value
      ? `${playerEvent.value} ${playerEvent.market}`
      : playerEvent.market
    const marketId = `${playerEvent.market}-${selectionLabel}-${index}`
    const selection = createBetslipSelection({
      eventId: getBetslipEventId({
        sport: offer.sport ?? 'ofertas',
        homeTeam: resolvedMatch.homeTeam,
        awayTeam: resolvedMatch.awayTeam,
        fallbackId: `${offer.id}-event-${index}`,
      }),
      marketId,
      outcomeId: `${offer.id}-${index}-${selectionLabel}`,
      label,
      selectionLabel,
      odd: comboLegOddLabel,
      marketLabel,
      eventStatus: liveDetails ? 'live' : 'prematch',
      selectionType: isPlayerSelection ? 'player' : isTeamSelection ? 'team' : 'market',
      sport: offer.sport,
      homeTeam: resolvedMatch.homeTeam,
      awayTeam: resolvedMatch.awayTeam,
      eventName,
      eventTimeLabel: liveDetails?.time ?? resolvedMatch.dateTime ?? offer.date,
      liveClock: liveDetails?.time,
      homeScore: liveDetails?.homeScore,
      awayScore: liveDetails?.awayScore,
      playerName: isPlayerSelection ? playerEvent.name : undefined,
      selectionIcon: playerEvent.icon,
      homeTeamIcon: resolvedMatch.homeIcon,
      awayTeamIcon: resolvedMatch.awayIcon,
      badgeType: 'boost',
      comboLegIndex: index,
      ...comboProps,
    })

    return selection ? {
      groupId: getBetslipMarketGroupId({ eventId: selection.eventId, marketId: selection.marketId }),
      selection,
    } : undefined
  }).filter(isBetslipEntry)
}

const liveOfferFixtures: LiveOfferFixture[] = [
  { home: 'Flamengo', away: 'Cruzeiro', time: '2T 22:12', homeScore: 2, awayScore: 1 },
  { home: 'Internacional', away: 'Bragantino', time: '1T 38:45', homeScore: 1, awayScore: 1 },
  { home: 'Mirassol', away: 'São Paulo', time: 'Intervalo', homeScore: 0, awayScore: 1 },
  { home: 'Atlético Madrid', away: 'Inter', time: '1T 12:23', homeScore: 0, awayScore: 0 },
  { home: 'PSG', away: 'Lyon', time: '2T 34:15', homeScore: 2, awayScore: 2 },
  { home: 'Newcastle', away: 'Napoli', time: '1T 08:47', homeScore: 0, awayScore: 0 },
  { home: 'Boca Juniors', away: 'Argentinos Jrs', time: '2T 18:32', homeScore: 3, awayScore: 0 },
  { home: 'Racing', away: 'River Plate', time: '2T 05:47', homeScore: 0, awayScore: 0 },
  { home: 'San Lorenzo', away: 'Córdoba', time: '1T 25:18', homeScore: 1, awayScore: 0 },
  { home: 'Inter Miami', away: 'Whitecaps', time: '1T 28:14', homeScore: 1, awayScore: 0 },
  { home: 'Cincinnati', away: 'Chicago Fire', time: '1T 03:22', homeScore: 0, awayScore: 0 },
  { home: 'Nashville', away: 'New York City', time: '1T 32:05', homeScore: 2, awayScore: 1 },
  { home: 'Dinamo', away: 'Aston Villa', time: '1T 15:08', homeScore: 0, awayScore: 1 },
  { home: 'Fenerbahçe', away: 'Porto', time: '2T 12:45', homeScore: 2, awayScore: 1 },
  { home: 'Panathinaikos', away: 'Nottingham', time: '1T 18:33', homeScore: 0, awayScore: 0 },
  { home: 'Jazz', away: 'Thunder', time: 'Q1 08:22', homeScore: 8, awayScore: 11 },
  { home: 'Knicks', away: 'Magic', time: 'Q2 05:00', homeScore: 42, awayScore: 38 },
  { home: 'AEPS Machitis', away: 'ASA Koroivos', time: 'Q3 06:43', homeScore: 38, awayScore: 46 },
  { home: 'Southern Wesleyan', away: 'Kennesaw State', time: 'Q1 00:21', homeScore: 22, awayScore: 65 },
  { home: 'Vanoli Cremona', away: 'Varese', time: 'Q3 08:32', homeScore: 42, awayScore: 41 },
  { home: 'Virtus Bologna', away: 'Tortona', time: 'Q1 03:24', homeScore: 11, awayScore: 12 },
  { home: 'Beroe', away: 'Balkan Botevgrad', time: 'Q2 04:43', homeScore: 21, awayScore: 34 },
]

const buildLiveOfferDetails = () => liveOfferFixtures.reduce<Record<string, LiveOfferDetails>>((details, fixture) => {
  details[`${fixture.home} vs ${fixture.away}`] = {
    time: fixture.time,
    homeScore: fixture.homeScore,
    awayScore: fixture.awayScore,
  }
  details[`${fixture.away} vs ${fixture.home}`] = {
    time: fixture.time,
    homeScore: fixture.awayScore,
    awayScore: fixture.homeScore,
  }
  return details
}, {})

const updateLiveOfferTime = (time: string): string => {
  if (time === 'Intervalo' || time === 'INT') return time

  const basketballMatch = time.match(/^Q(\d) (\d+):(\d+)$/)
  const footballMatch = time.match(/^(\d)T (\d+):(\d+)$/)
  const match = basketballMatch || footballMatch
  if (!match) return time

  const period = Number(match[1])
  let minutes = Number(match[2])
  let seconds = Number(match[3])

  if (basketballMatch) {
    seconds -= 1
    if (seconds < 0) {
      seconds = 59
      minutes -= 1
    }
    if (minutes <= 0 && seconds <= 0) return 'Intervalo'
  } else {
    seconds += 1
    if (seconds >= 60) {
      seconds = 0
      minutes += 1
    }
  }

  return `${basketballMatch ? `Q${period}` : `${period}T`} ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const allOffers: OfferCard[] = [
  // === AS MELHORES (default) ===
  {
    id: 'ten-melh-roma-masters',
    type: 'super_combinada',
    category: 'melhores',
    sport: 'tenis',
    sportOnly: true,
    title: 'Roma no saque!',
    tagLabel: 'Super Combinada',
    tagColor: '#9730FF',
    tagIcon: iconSuperCombinada,
    subtitle: 'Roma Masters',
    date: 'Hoje',
    oldOdd: '6.10x',
    newOdd: '8.25x',
    playerEvents: [
      { icon: getTennisPlayerCountryIcon('Basilashvili', iconTenis), name: 'Rublev x Basilashvili', value: 'Basilashvili', market: 'Vencedor' },
      { icon: getTennisPlayerCountryIcon('Medjedovic', iconTenis), name: 'Medjedovic x Landaluce', value: 'Medjedovic', market: 'Vencedor' },
      { icon: getTennisPlayerCountryIcon('Medvedev', iconTenis), name: 'Tirante x Medvedev', value: 'Medvedev', market: 'Vencedor' },
    ],
  },
  {
    id: 'ten-melh-roma-f',
    type: 'combinada',
    category: 'melhores',
    sport: 'tenis',
    sportOnly: true,
    title: 'Elas em Roma!',
    tagLabel: 'Combinadas',
    tagColor: '#DC2626',
    tagIcon: iconCombinada,
    subtitle: 'Roma (F)',
    oldOdd: '5.75x',
    newOdd: '7.10x',
    playerEvents: [
      { icon: getTennisPlayerCountryIcon('Gauff', iconTenis), name: 'Gauff x Andreeva', value: 'Mais de 21.5', market: 'Games' },
      { icon: getTennisPlayerCountryIcon('Swiatek', iconTenis), name: 'Pegula x Swiatek', value: 'Swiatek', market: 'Vencedor' },
      { icon: getTennisPlayerCountryIcon('Rybakina', iconTenis), name: 'Svitolina x Rybakina', value: 'Rybakina', market: 'Vencedor' },
    ],
  },
  {
    id: 'ten-melh-parma-f',
    type: 'aumentada',
    category: 'melhores',
    sport: 'tenis',
    sportOnly: true,
    title: 'Parma acelerada!',
    tagLabel: 'Aumentada',
    tagColor: '#EAB308',
    tagIcon: iconAumentada,
    subtitle: 'Parma (F)',
    oldOdd: '4.40x',
    newOdd: '5.60x',
    playerEvents: [
      { icon: getTennisPlayerCountryIcon('Sherif', iconTenis), name: 'Yue Yuan x Sherif', value: 'Sherif', market: 'Vencedor' },
      { icon: getTennisPlayerCountryIcon('Krejcikova', iconTenis), name: 'Krejcikova x Friedsam', value: 'Krejcikova', market: 'Vencedor' },
      { icon: getTennisPlayerCountryIcon('Sierra', iconTenis), name: 'Sierra x Juvan', value: 'Sierra', market: 'Vencedor' },
    ],
  },
  {
    id: 'ten-melh-bordeaux',
    type: 'pechincha',
    category: 'melhores',
    sport: 'tenis',
    sportOnly: true,
    title: 'Bordeaux quente!',
    tagLabel: 'Pechincha',
    tagColor: '#9730FF',
    tagIcon: iconPechincha,
    subtitle: 'Bordeaux',
    newOdd: '3.95x',
    playerEvents: [
      { icon: getTennisPlayerCountryIcon('Bonzi', iconTenis), name: 'Kouame x Bonzi', value: 'Bonzi', market: 'Vencedor' },
      { icon: getTennisPlayerCountryIcon('Shevchenko', iconTenis), name: 'Shevchenko x Gaston', value: 'Shevchenko', market: 'Vencedor' },
      { icon: getTennisPlayerCountryIcon('Virtanen', iconTenis), name: 'Virtanen x Perricard', value: 'Mais de 23.5', market: 'Games' },
    ],
  },
  {
    id: '5',
    type: 'pechincha',
    category: 'melhores',
    sport: 'futebol',
    title: 'Craque demais.',
    tagLabel: 'Pechincha',
    tagColor: '#9730FF',
    tagIcon: iconPechincha,
    subtitle: 'Barcelona vs Real Madrid',
    date: '11/09, 16:00',
    newOdd: '1.72x',
    player: {
      name: 'L. Yamal',
      team: 'Barcelona',
      image: playerYamal,
      stat: 'Finalizações ao gol',
      statValue: 'Mais de 0.5',
      oldStatValue: '3.5',
    },
  },
  {
    id: '1',
    type: 'super_combinada',
    category: 'melhores',
    sport: 'basquete',
    title: 'Favoritos!',
    tagLabel: 'Super Combinada',
    tagColor: '#9730FF',
    tagIcon: iconSuperCombinada,
    subtitle: 'NBA está fervendo',
    oldOdd: '5.90x',
    newOdd: '8.50x',
    events: [
      { team1: 'Heat', team1Icon: escudoMiami, team2Icon: escudoBullsGde, market: 'Resultado Final' },
      { team1: 'Lakers', team1Icon: escudoLakers, team2Icon: escudoWarriorsGde, market: 'Resultado Final' },
      { team1: 'Pistons', team1Icon: escudoPistonsGde, team2Icon: escudoCavaliers, market: 'Resultado Final' },
    ],
  },
  {
    id: 'melh-bask-2',
    type: 'super_aumentada',
    category: 'melhores',
    sport: 'basquete',
    sportOnly: true,
    title: 'O Rei domina!',
    tagLabel: 'Super aumentada',
    tagColor: '#60A5FA',
    tagIcon: iconSuperAumentada,
    subtitle: 'Warriors vs Lakers',
    date: '14/09, 22:30',
    oldOdd: '2.60x',
    newOdd: '3.40x',
    player: {
      name: 'LeBron James',
      team: 'LA Lakers',
      image: playerLeBronJames,
      stat: 'Pontos',
      statValue: 'Mais de 29.5',
      sportIcon: iconBasquete,
    },
  },
  {
    id: 'melh-bask-3',
    type: 'aumentada',
    category: 'melhores',
    sport: 'basquete',
    sportOnly: true,
    title: 'Splash Brothers!',
    tagLabel: 'Aumentada',
    tagColor: '#EAB308',
    tagIcon: iconAumentada,
    subtitle: 'Warriors vs Lakers',
    date: '14/09, 22:30',
    oldOdd: '2.10x',
    newOdd: '2.70x',
    teamStat: {
      teamName: 'Warriors',
      teamIcon: escudoWarriorsGde,
      sportIcon: iconBasquete,
      stat: 'cestas de 3',
      statValue: 'Mais de 14.5',
    },
  },
  {
    id: 'melh-bask-4',
    type: 'pechincha',
    category: 'melhores',
    sport: 'basquete',
    sportOnly: true,
    title: 'Chef Curry!',
    tagLabel: 'Pechincha',
    tagColor: '#9730FF',
    tagIcon: iconPechincha,
    subtitle: 'Warriors vs Lakers',
    date: '14/09, 22:30',
    newOdd: '1.88x',
    player: {
      name: 'Stephen Curry',
      team: 'Golden State',
      image: playerStephenCurry,
      stat: 'Cestas de 3',
      statValue: 'Mais de 4.5',
      oldStatValue: '6.5',
      sportIcon: iconBasquete,
    },
  },
  {
    id: 'melh-bask-5',
    type: 'combinada',
    category: 'melhores',
    sport: 'basquete',
    sportOnly: true,
    title: 'Noite de pontos!',
    tagLabel: 'Combinadas',
    tagColor: '#DC2626',
    tagIcon: iconCombinada,
    subtitle: 'NBA — rodada completa',
    oldOdd: '6.10x',
    newOdd: '7.80x',
    playerEvents: [
      { icon: escudoLakers, name: 'LeBron James', value: '30+', market: 'Pontos' },
      { icon: escudoLakers, name: 'Luka Dončić', value: '28+', market: 'Pontos' },
      { icon: escudoMiami, name: 'Jimmy Butler', value: '22+', market: 'Pontos' },
    ],
    showViewAll: 5,
  },
  {
    id: 'melh-fut-5',
    type: 'super_aumentada',
    category: 'melhores',
    sport: 'futebol',
    sportOnly: true,
    title: 'Mengão avassalador!',
    tagLabel: 'Super aumentada',
    tagColor: '#60A5FA',
    tagIcon: iconSuperAumentada,
    subtitle: 'Flamengo vs Cruzeiro',
    oldOdd: '2.70x',
    newOdd: '3.40x',
    teamStat: {
      teamName: 'Flamengo',
      teamIcon: escudoFlamengoGde,
      stat: 'gols',
      statValue: 'Mais de 2.5',
    },
  },
  {
    id: '2',
    type: 'super_aumentada',
    category: 'melhores',
    sport: 'futebol',
    title: 'Tá voando!',
    tagLabel: 'Super aumentada',
    tagColor: '#60A5FA',
    tagIcon: iconSuperAumentada,
    subtitle: 'Barcelona vs Real Madrid',
    date: '11/09, 16:00',
    oldOdd: '2.85x',
    newOdd: '3.50x',
    player: {
      name: 'Raphinha',
      team: 'Barcelona',
      image: playerRaphinha,
      stat: 'Finalizações ao gol',
      statValue: 'Mais de 1.5',
    },
  },
  {
    id: '3',
    type: 'aumentada',
    category: 'melhores',
    sport: 'futebol',
    title: 'Artilheiro na área.',
    tagLabel: 'Aumentada',
    tagColor: '#EAB308',
    tagIcon: iconAumentada,
    subtitle: 'Barcelona vs Real Madrid',
    date: '11/09, 16:00',
    oldOdd: '1.75x',
    newOdd: '2.10x',
    player: {
      name: 'R. Lewandowski',
      team: 'Barcelona',
      image: playerLewa,
      stat: 'Marcar a qualquer momento',
      statValue: 'Sim',
    },
  },
  {
    id: '4',
    type: 'combinada',
    category: 'melhores',
    sport: 'futebol',
    title: 'Jogo quente!',
    tagLabel: 'Combinadas',
    tagColor: '#DC2626',
    tagIcon: iconCombinada,
    subtitle: 'Flamengo vs Cruzeiro',
    newOdd: '4.25x',
    playerEvents: [
      { icon: iconPechincha, name: 'M. Pereira', value: '7+ → 0.5+', market: 'Passes Certos' },
      { icon: escudoCruzeiro, name: 'Kaio Jorge', value: 'Sim', market: 'Para Marcar Gol' },
      { icon: escudoCruzeiro, name: 'Cruzeiro', value: '4.5+', market: 'Total de Escanteios' },
    ],
    showViewAll: 4,
  },
  // === COMBINADAS ===
  {
    id: 'comb-0a',
    type: 'combinada',
    category: 'combinadas',
    sport: 'futebol',
    title: 'Chuva de gols!',
    tagLabel: 'Combinadas',
    tagColor: '#DC2626',
    tagIcon: iconCombinada,
    subtitle: 'Equipes matadoras',
    oldOdd: '5.82x',
    newOdd: '6.75x',
    events: [
      { team1: 'Mais de 2.5', team1Icon: escudoManchesterCity, team2Icon: escudoLiverpool, market: 'Total de Gols' },
      { team1: 'Mais de 1.5', team1Icon: escudoBayerLeverkusen, team2Icon: escudoBayerMunique, market: 'Total de Gols' },
      { team1: 'Mais de 2.5', team1Icon: escudoPSG, team2Icon: escudoLyon, market: 'Total de Gols' },
    ],
  },
  {
    id: 'comb-0b',
    type: 'combinada',
    category: 'combinadas',
    sport: 'futebol',
    title: 'Jogo quente!',
    tagLabel: 'Combinadas',
    tagColor: '#DC2626',
    tagIcon: iconCombinada,
    subtitle: 'Flamengo vs Cruzeiro',
    newOdd: '4.25x',
    playerEvents: [
      { icon: iconPechincha, name: 'M. Pereira', value: '7+ → 0.5+', market: 'Passes Certos' },
      { icon: escudoCruzeiro, name: 'Kaio Jorge', value: 'Sim', market: 'Para Marcar Gol' },
      { icon: escudoCruzeiro, name: 'Cruzeiro', value: '4.5+', market: 'Total de Escanteios' },
    ],
    showViewAll: 4,
  },
  {
    id: 'comb-1',
    type: 'combinada',
    category: 'combinadas',
    sport: 'futebol',
    title: 'Clássico francês!',
    tagLabel: 'Combinadas',
    tagColor: '#DC2626',
    tagIcon: iconCombinada,
    subtitle: 'PSG vs Lyon',
    oldOdd: '6.35x',
    newOdd: '7.50x',
    playerEvents: [
      { icon: escudoPSG, name: 'PSG', value: 'Sim', market: 'Resultado Final' },
      { icon: escudoPSG, name: 'Mais de 2.5', market: 'Total de Gols' },
      { icon: escudoLyon, name: 'Lyon', value: '3.5+', market: 'Total de Escanteios' },
    ],
  },
  {
    id: 'comb-2',
    type: 'combinada',
    category: 'combinadas',
    sport: 'futebol',
    title: 'Duelo brasileiro!',
    tagLabel: 'Combinadas',
    tagColor: '#DC2626',
    tagIcon: iconCombinada,
    subtitle: 'Palmeiras vs Fluminense',
    date: '12/09, 21:30',
    oldOdd: '5.15x',
    newOdd: '6.20x',
    playerEvents: [
      { icon: escudoPalmeiras, name: 'Palmeiras', value: 'Sim', market: 'Resultado Final' },
      { icon: escudoPalmeiras, name: 'Mais de 1.5', market: 'Total de Gols' },
      { icon: escudoFluminense, name: 'Ambas Marcam', value: 'Sim', market: 'Gols' },
    ],
  },
  {
    id: 'comb-3',
    type: 'combinada',
    category: 'combinadas',
    sport: 'futebol',
    title: 'Tripla campeã!',
    tagLabel: 'Combinadas',
    tagColor: '#DC2626',
    tagIcon: iconCombinada,
    subtitle: 'Os favoritos para ganhar',
    oldOdd: '4.85x',
    newOdd: '5.75x',
    events: [
      { team1: 'Palmeiras', team1Icon: escudoPalmeiras, team2Icon: escudoFluminense, market: 'Resultado Final' },
      { team1: 'Botafogo', team1Icon: escudoBotafogo, team2Icon: escudoBahia, market: 'Resultado Final' },
      { team1: 'Man. City', team1Icon: escudoManchesterCity, team2Icon: escudoLiverpool, market: 'Resultado Final' },
    ],
  },

  // === SUPER AUMENTADA ===
  {
    id: 'super-0',
    type: 'super_aumentada',
    category: 'super-aumentada',
    sport: 'futebol',
    title: 'Tá voando!',
    tagLabel: 'Super aumentada',
    tagColor: '#60A5FA',
    tagIcon: iconSuperAumentada,
    subtitle: 'Barcelona vs Real Madrid',
    date: '11/09, 16:00',
    oldOdd: '2.85x',
    newOdd: '3.50x',
    player: {
      name: 'Raphinha',
      team: 'Barcelona',
      image: playerRaphinha,
      stat: 'Finalizações ao gol',
      statValue: 'Mais de 1.5',
    },
  },
  {
    id: 'super-1',
    type: 'super_aumentada',
    category: 'super-aumentada',
    sport: 'futebol',
    title: 'El Clásico!',
    tagLabel: 'Super aumentada',
    tagColor: '#60A5FA',
    tagIcon: iconSuperAumentada,
    subtitle: 'Barcelona vs Real Madrid',
    date: '11/09, 16:00',
    oldOdd: '2.45x',
    newOdd: '3.10x',
    teamStat: {
      teamName: 'Barcelona',
      teamIcon: escudoBarcelonaGde,
      stat: 'escanteios',
      statValue: 'Mais de 4.5',
    },
  },
  {
    id: 'super-2',
    type: 'super_aumentada',
    category: 'super-aumentada',
    sport: 'futebol',
    title: 'Fogão em chamas!',
    tagLabel: 'Super aumentada',
    tagColor: '#60A5FA',
    tagIcon: iconSuperAumentada,
    subtitle: 'Botafogo vs Bahia',
    date: '12/09, 21:00',
    oldOdd: '1.55x',
    newOdd: '2.05x',
    teamStat: {
      teamName: 'Botafogo',
      teamIcon: escudoBotafogoGde,
      stat: 'gols',
      statValue: 'Mais de 1.5',
    },
  },
  {
    id: 'super-3',
    type: 'super_aumentada',
    category: 'super-aumentada',
    sport: 'futebol',
    title: 'Mengão avassalador!',
    tagLabel: 'Super aumentada',
    tagColor: '#60A5FA',
    tagIcon: iconSuperAumentada,
    subtitle: 'Flamengo vs Cruzeiro',
    oldOdd: '2.70x',
    newOdd: '3.40x',
    teamStat: {
      teamName: 'Flamengo',
      teamIcon: escudoFlamengoGde,
      stat: 'gols',
      statValue: 'Mais de 2.5',
    },
  },
  {
    id: 'super-4',
    type: 'super_aumentada',
    category: 'super-aumentada',
    sport: 'futebol',
    title: 'Craque em ação!',
    tagLabel: 'Super aumentada',
    tagColor: '#60A5FA',
    tagIcon: iconSuperAumentada,
    subtitle: 'Flamengo vs Cruzeiro',
    oldOdd: '3.20x',
    newOdd: '4.00x',
    player: {
      name: 'Arrascaeta',
      team: 'Flamengo',
      image: playerArrascaeta,
      stat: 'Finalizações ao gol',
      statValue: 'Mais de 4.5',
    },
  },

  // === AUMENTADA ===
  {
    id: 'aum-arrascaeta',
    type: 'aumentada',
    category: 'aumentada',
    sport: 'futebol',
    sportOnly: true,
    title: 'Maestro em campo!',
    tagLabel: 'Aumentada',
    tagColor: '#EAB308',
    tagIcon: iconAumentada,
    subtitle: 'Flamengo vs Cruzeiro',
    oldOdd: '2.20x',
    newOdd: '2.90x',
    player: {
      name: 'Arrascaeta',
      team: 'Flamengo',
      image: playerArrascaeta,
      stat: 'Finalizações ao gol',
      statValue: 'Mais de 2.5',
    },
  },
  {
    id: 'aum-1',
    type: 'aumentada',
    category: 'aumentada',
    sport: 'futebol',
    title: 'Artilheiro na área.',
    tagLabel: 'Aumentada',
    tagColor: '#EAB308',
    tagIcon: iconAumentada,
    subtitle: 'Barcelona vs Real Madrid',
    date: '11/09, 16:00',
    oldOdd: '1.75x',
    newOdd: '2.10x',
    player: {
      name: 'R. Lewandowski',
      team: 'Barcelona',
      image: playerLewa,
      stat: 'Marcar a qualquer momento',
      statValue: 'Sim',
    },
  },
  {
    id: 'aum-2',
    type: 'aumentada',
    category: 'aumentada',
    sport: 'basquete',
    title: 'Cestinha garantido!',
    tagLabel: 'Aumentada',
    tagColor: '#EAB308',
    tagIcon: iconAumentada,
    subtitle: '76ers vs Celtics',
    date: '13/09, 21:00',
    oldOdd: '1.85x',
    newOdd: '2.30x',
    teamStat: {
      teamName: '76ers',
      teamIcon: escudo76ersGde,
      sportIcon: iconBasquete,
      stat: 'pontos',
      statValue: 'Mais de 110.5',
    },
  },
  {
    id: 'aum-3',
    type: 'aumentada',
    category: 'aumentada',
    sport: 'basquete',
    title: 'Splash Brothers!',
    tagLabel: 'Aumentada',
    tagColor: '#EAB308',
    tagIcon: iconAumentada,
    subtitle: 'Warriors vs Lakers',
    date: '14/09, 22:30',
    oldOdd: '2.10x',
    newOdd: '2.65x',
    teamStat: {
      teamName: 'Warriors',
      teamIcon: escudoWarriorsGde,
      sportIcon: iconBasquete,
      stat: 'cestas de 3',
      statValue: 'Mais de 14.5',
    },
  },
  {
    id: 'aum-4',
    type: 'aumentada',
    category: 'aumentada',
    sport: 'basquete',
    title: 'Chicago Fire!',
    tagLabel: 'Aumentada',
    tagColor: '#EAB308',
    tagIcon: iconAumentada,
    subtitle: 'Bulls vs Heat',
    date: '15/09, 20:00',
    oldOdd: '1.65x',
    newOdd: '2.15x',
    teamStat: {
      teamName: 'Bulls',
      teamIcon: escudoBullsGde,
      sportIcon: iconBasquete,
      stat: 'rebotes',
      statValue: 'Mais de 42.5',
    },
  },
  {
    id: 'aum-5',
    type: 'aumentada',
    category: 'aumentada',
    sport: 'basquete',
    title: 'Motor City!',
    tagLabel: 'Aumentada',
    tagColor: '#EAB308',
    tagIcon: iconAumentada,
    subtitle: 'Pistons vs Cavaliers',
    date: '16/09, 19:30',
    oldOdd: '1.90x',
    newOdd: '2.45x',
    teamStat: {
      teamName: 'Pistons',
      teamIcon: escudoPistonsGde,
      sportIcon: iconBasquete,
      stat: 'assistências',
      statValue: 'Mais de 24.5',
    },
  },

  // === SUPER COMBINADAS ===
  {
    id: 'scomb-1',
    type: 'super_combinada',
    category: 'super-combinadas',
    sport: 'basquete',
    title: 'Favoritos!',
    tagLabel: 'Super Combinada',
    tagColor: '#9730FF',
    tagIcon: iconSuperCombinada,
    subtitle: 'NBA está fervendo',
    oldOdd: '5.90x',
    newOdd: '8.50x',
    events: [
      { team1: 'Heat', team1Icon: escudoMiami, team2Icon: escudoBullsGde, market: 'Resultado Final' },
      { team1: 'Lakers', team1Icon: escudoLakers, team2Icon: escudoWarriorsGde, market: 'Resultado Final' },
      { team1: 'Pistons', team1Icon: escudoPistonsGde, team2Icon: escudoCavaliers, market: 'Resultado Final' },
    ],
  },
  {
    id: 'scomb-2',
    type: 'super_combinada',
    category: 'super-combinadas',
    sport: 'basquete',
    title: 'Muitos pontos!',
    tagLabel: 'Super Combinada',
    tagColor: '#9730FF',
    tagIcon: iconSuperCombinada,
    subtitle: 'Warrios vs Lakers',
    date: 'Amanhã, 21:30',
    oldOdd: '7.40x',
    newOdd: '10.90x',
    playerEvents: [
      { icon: escudoWarriorsGde, name: 'Stephen Curry', value: '30+', market: 'Pontos' },
      { icon: escudoWarriorsGde, name: 'Jimmy Butler', value: '22+', market: 'Pontos' },
      { icon: escudoLakers, name: 'LeBron James', value: '40+', market: 'Pontos' },
    ],
  },
  {
    id: 'scomb-3',
    type: 'super_combinada',
    category: 'super-combinadas',
    sport: 'basquete',
    title: 'Rebotes!',
    tagLabel: 'Super Combinada',
    tagColor: '#9730FF',
    tagIcon: iconSuperCombinada,
    subtitle: 'Warrios vs Lakers',
    date: 'Amanhã, 21:30',
    oldOdd: '6.20x',
    newOdd: '9.30x',
    playerEvents: [
      { icon: escudoLakers, name: 'LeBron James', value: '10+', market: 'Rebotes' },
      { icon: escudoLakers, name: 'Luka Dončić', value: '10+', market: 'Rebotes' },
      { icon: escudoWarriorsGde, name: 'Stephen Curry', value: '10+', market: 'Rebotes' },
    ],
  },
  {
    id: 'scomb-4',
    type: 'super_combinada',
    category: 'super-combinadas',
    sport: 'basquete',
    title: 'Total de Pontos!',
    tagLabel: 'Super Combinadas',
    tagColor: '#9730FF',
    tagIcon: iconSuperCombinada,
    subtitle: 'Só que faz mais de 100',
    oldOdd: '9.30x',
    newOdd: '12.80x',
    events: [
      { team1: 'Heat 110+', team1Icon: escudoMiami, team2Icon: escudoBullsGde, market: 'Total de Pontos' },
      { team1: 'Lakers 110+', team1Icon: escudoLakers, team2Icon: escudoWarriorsGde, market: 'Total de Pontos' },
      { team1: 'Pistons 110+', team1Icon: escudoPistonsGde, team2Icon: escudoCavaliers, market: 'Total de Pontos' },
    ],
    showViewAll: 5,
  },
  {
    id: 'scomb-5',
    type: 'super_combinada',
    category: 'super-combinadas',
    sport: 'basquete',
    title: 'Garçom!',
    tagLabel: 'Super Combinadas',
    tagColor: '#9730FF',
    tagIcon: iconSuperCombinada,
    subtitle: 'Warrios vs Lakers',
    date: 'Amanhã, 21:30',
    oldOdd: '8.80x',
    newOdd: '11.50x',
    playerEvents: [
      { icon: escudoLakers, name: 'LeBron James', value: '7+', market: 'Assistências' },
      { icon: escudoLakers, name: 'Luka Dončić', value: '8+', market: 'Assistências' },
      { icon: escudoLakers, name: 'Austin Reaves', value: '7+', market: 'Assistências' },
    ],
    showViewAll: 5,
  },

  // === PECHINCHAS ===
  {
    id: 'pech-arrascaeta',
    type: 'pechincha',
    category: 'pechinchas',
    sport: 'futebol',
    sportOnly: true,
    title: 'Uruguaio brilhando.',
    tagLabel: 'Pechincha',
    tagColor: '#9730FF',
    tagIcon: iconPechincha,
    subtitle: 'Flamengo vs Cruzeiro',
    newOdd: '1.68x',
    player: {
      name: 'Arrascaeta',
      team: 'Flamengo',
      image: playerArrascaeta,
      stat: 'Assistências',
      statValue: 'Mais de 0.5',
      oldStatValue: '2.5',
    },
  },
  {
    id: 'pech-1',
    type: 'pechincha',
    category: 'pechinchas',
    sport: 'futebol',
    title: 'Craque demais.',
    tagLabel: 'Pechincha',
    tagColor: '#9730FF',
    tagIcon: iconPechincha,
    subtitle: 'Barcelona vs Real Madrid',
    date: '11/09, 16:00',
    newOdd: '1.72x',
    player: {
      name: 'L. Yamal',
      team: 'Barcelona',
      image: playerYamal,
      stat: 'Finalizações ao gol',
      statValue: 'Mais de 0.5',
      oldStatValue: '3.5',
    },
  },
  {
    id: 'pech-2',
    type: 'pechincha',
    category: 'pechinchas',
    sport: 'basquete',
    title: 'Bucket garantido!',
    tagLabel: 'Pechincha',
    tagColor: '#9730FF',
    tagIcon: iconPechincha,
    subtitle: 'Bulls vs Heat',
    date: '15/09, 20:00',
    newOdd: '1.65x',
    player: {
      name: 'Jimmy Butler',
      team: 'Miami Heat',
      image: playerJimmyButler,
      stat: 'Pontos',
      statValue: 'Mais de 19.5',
      oldStatValue: '24.5',
      sportIcon: iconBasquete,
    },
  },
  {
    id: 'pech-3',
    type: 'pechincha',
    category: 'pechinchas',
    sport: 'basquete',
    title: 'O Rei em quadra!',
    tagLabel: 'Pechincha',
    tagColor: '#9730FF',
    tagIcon: iconPechincha,
    subtitle: 'Warriors vs Lakers',
    date: '14/09, 22:30',
    newOdd: '1.58x',
    player: {
      name: 'LeBron James',
      team: 'LA Lakers',
      image: playerLeBronJames,
      stat: 'Rebotes',
      statValue: 'Mais de 6.5',
      oldStatValue: '9.5',
      sportIcon: iconBasquete,
    },
  },
  {
    id: 'pech-4',
    type: 'pechincha',
    category: 'pechinchas',
    sport: 'basquete',
    title: 'Mágica eslovena!',
    tagLabel: 'Pechincha',
    tagColor: '#9730FF',
    tagIcon: iconPechincha,
    subtitle: 'Warriors vs Lakers',
    date: '14/09, 22:30',
    newOdd: '1.75x',
    player: {
      name: 'Luka Dončić',
      team: 'LA Lakers',
      image: playerLukaDoncic,
      stat: 'Assistências',
      statValue: 'Mais de 7.5',
      oldStatValue: '10.5',
      sportIcon: iconBasquete,
    },
  },
  {
    id: 'pech-5',
    type: 'pechincha',
    category: 'pechinchas',
    sport: 'basquete',
    title: 'Chef Curry!',
    tagLabel: 'Pechincha',
    tagColor: '#9730FF',
    tagIcon: iconPechincha,
    subtitle: 'Warriors vs Lakers',
    date: '14/09, 22:30',
    newOdd: '1.88x',
    player: {
      name: 'Stephen Curry',
      team: 'Golden State',
      image: playerStephenCurry,
      stat: 'Cestas de 3',
      statValue: 'Mais de 4.5',
      oldStatValue: '6.5',
      sportIcon: iconBasquete,
    },
  },
]

interface OffersSectionProps {
  sportFilter?: string | null
  liveOnly?: boolean
  disableInteractions?: boolean
}

export function OffersSection({
  sportFilter,
  liveOnly = false,
  disableInteractions = false,
}: OffersSectionProps = {}) {
  const [isDragging, setIsDragging] = useState(false)
  const [activeFilter, setActiveFilter] = useState('melhores')
  const [liveOfferDetailsByMatch, setLiveOfferDetailsByMatch] = useState<Record<string, LiveOfferDetails>>(buildLiveOfferDetails)
  const getOddButtonProps = useOddSelection('offer-card__button')
  const { selectedSelectionIdsByGroup, toggleSelections } = useBetslip()
  const scrollRef = useRef<HTMLDivElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([])
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  const matchesSportFilter = (offer: OfferCard) => {
    if (offer.sportOnly && !sportFilter) return false
    if (sportFilter && offer.sport && offer.sport !== sportFilter) return false
    return true
  }

  const matchesLiveFilter = (offer: OfferCard) =>
    !liveOnly || !!(offer.subtitle && liveOfferDetailsByMatch[offer.subtitle])

  const visibleOffers = allOffers.filter((offer) => (
    showSuperCombinadaOffers || offer.type !== 'super_combinada'
  ))

  const visibleChips = filterChips.filter(chip =>
    visibleOffers.some(offer => offer.category === chip.id && matchesSportFilter(offer) && matchesLiveFilter(offer))
  )
  const selectedFilter = visibleChips.some((chip) => chip.id === activeFilter)
    ? activeFilter
    : visibleChips[0]?.id ?? activeFilter
  const activeFilterIndex = visibleChips.findIndex((chip) => chip.id === selectedFilter)
  const activeFilterIndicatorKey = `${selectedFilter}:${visibleChips.map((chip) => chip.id).join('|')}`

  const filteredOffers = visibleOffers.filter(offer => {
    if (offer.category !== selectedFilter) return false
    return matchesSportFilter(offer)
      && matchesLiveFilter(offer)
  })

  const getOfferLiveTime = (offer: OfferCard) => {
    if (!offer.subtitle) return undefined
    return liveOfferDetailsByMatch[offer.subtitle]?.time
  }

  const getOfferLiveDetails = (offer: OfferCard) => {
    if (!offer.subtitle) return undefined
    return liveOfferDetailsByMatch[offer.subtitle]
  }

  const getDisabledOfferButtonProps = (offer: OfferCard) => ({
    type: 'button' as const,
    className: `offer-card__button${offer.type === 'pechincha' ? ' offer-card__button--pechincha' : ''}`,
    disabled: true,
    'aria-disabled': true,
  })

  const getOfferOddButtonProps = (offer: OfferCard) => {
    if (disableInteractions) return getDisabledOfferButtonProps(offer)

    const liveDetails = getOfferLiveDetails(offer)
    const liveTime = liveDetails?.time
    const comboEntries = getOfferComboBetslipEntries(offer, liveOfferDetailsByMatch)

    if (comboEntries.length > 0) {
      const selectedSelectionIds = new Set(Object.values(selectedSelectionIdsByGroup))
      const isSelected = comboEntries.every(({ selection }) => selectedSelectionIds.has(selection.id))
      const buttonClassName = [
        'offer-card__button',
        offer.type === 'pechincha' ? 'offer-card__button--pechincha' : '',
        isSelected ? 'odd-button--selected' : '',
      ].filter(Boolean).join(' ')

      return {
        type: 'button' as const,
        className: buttonClassName,
        'aria-pressed': isSelected,
        onClick: (event: MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation()

          if (requestLocationPermissionGate()) return

          window.dispatchEvent(new CustomEvent(BETSLIP_ODD_INTERACTION_EVENT))
          toggleSelections(comboEntries)
        },
      }
    }

    const [homeTeam, awayTeam] = offer.subtitle?.split(/\s+(?:vs|x)\s+/i) ?? []
    const marketLabel = offer.player?.stat
      ?? (offer.teamStat ? `${offer.teamStat.statValue} ${offer.teamStat.stat}` : undefined)
      ?? offer.events?.[0]?.market
      ?? offer.type.replace(/_/g, ' ')
    const label = offer.player
      ? `${offer.player.name} ${offer.player.statValue}`
      : offer.teamStat?.teamName ?? offer.title

    return getOddButtonProps(
      `offer:${offer.id}:odd`,
      `offer:${offer.id}`,
      `offer-card__button${offer.type === 'pechincha' ? ' offer-card__button--pechincha' : ''}`,
      createBetslipSelection({
        eventId: getBetslipEventId({
          sport: offer.sport ?? 'ofertas',
          homeTeam,
          awayTeam,
          fallbackId: `offer-${offer.id}`,
        }),
        marketId: offer.type,
        outcomeId: offer.id,
        label,
        odd: offer.newOdd,
        marketLabel,
        eventStatus: liveTime ? 'live' : 'prematch',
        selectionType: offer.player ? 'player' : offer.teamStat ? 'team' : 'market',
        sport: offer.sport,
        homeTeam,
        awayTeam,
        eventName: offer.subtitle,
        eventTimeLabel: liveTime ?? offer.date,
        liveClock: liveTime,
        homeScore: liveDetails?.homeScore,
        awayScore: liveDetails?.awayScore,
        playerName: offer.player?.name,
        playerImage: offer.player?.image,
        selectionIcon: offer.teamStat?.teamIcon,
        badgeType: 'boost',
        promoVariant: getOfferPromoVariant(offer),
      })
    )
  }

  // Reset scroll position quando mudar o filtro
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0
    }
  }, [selectedFilter, sportFilter, liveOnly])

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveOfferDetailsByMatch((currentDetails) => Object.fromEntries(
        Object.entries(currentDetails).map(([matchLabel, details]) => [
          matchLabel,
          {
            ...details,
            time: updateLiveOfferTime(details.time),
          },
        ])
      ))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  useSlidingActiveIndicator({
    activeKey: activeFilterIndicatorKey,
    containerRef: filtersRef,
    getActiveElement: () => chipRefs.current[activeFilterIndex],
  })

  if (filteredOffers.length === 0) {
    return null
  }

  // Centraliza no card mais próximo com sensibilidade ao arraste
  const snapToNearestCard = (dragDelta: number = 0) => {
    if (!scrollRef.current) return
    const cardWidth = 304 + 8 // width + gap
    const currentScroll = scrollRef.current.scrollLeft
    const currentIndex = currentScroll / cardWidth
    
    let targetIndex: number
    // Se arrastou mais que 30px, muda para o próximo/anterior
    if (dragDelta > 30) {
      targetIndex = Math.ceil(currentIndex)
    } else if (dragDelta < -30) {
      targetIndex = Math.floor(currentIndex)
    } else {
      targetIndex = Math.round(currentIndex)
    }
    
    // Limita ao range válido
    const maxIndex = Math.max(0, Math.ceil((scrollRef.current.scrollWidth - scrollRef.current.clientWidth) / cardWidth))
    targetIndex = Math.max(0, Math.min(targetIndex, maxIndex))
    
    const targetScroll = targetIndex * cardWidth
    
    scrollRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    })
  }

  // Drag to scroll para mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    setIsDragging(true)
    startX.current = e.pageX - scrollRef.current.offsetLeft
    scrollLeft.current = scrollRef.current.scrollLeft
  }

  const handleMouseUp = () => {
    const delta = scrollRef.current ? scrollRef.current.scrollLeft - scrollLeft.current : 0
    setIsDragging(false)
    snapToNearestCard(delta)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX.current) * 1.5
    scrollRef.current.scrollLeft = scrollLeft.current - walk
  }

  const handleMouseLeave = () => {
    if (isDragging) {
      const delta = scrollRef.current ? scrollRef.current.scrollLeft - scrollLeft.current : 0
      setIsDragging(false)
      snapToNearestCard(delta)
    }
  }

  // Touch events removidos para usar scroll nativo

  return (
    <section id="section-ofertas" className="offers-section">
      {/* Header */}
      <div className="offers-section__header">
        <div className="offers-section__title">
          <span>Ofertas Imperdíveis</span>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="offers-section__filters sliding-chip-group" ref={filtersRef}>
        <span className="sliding-chip-indicator" aria-hidden="true" />
        {visibleChips.map((chip, index) => (
          <button
            key={chip.id}
            ref={(el) => { chipRefs.current[index] = el }}
            className={`offers-section__chip sliding-chip ${selectedFilter === chip.id ? 'offers-section__chip--active' : ''}`}
            disabled={disableInteractions}
            aria-disabled={disableInteractions}
            onClick={() => {
              if (disableInteractions) return

              setActiveFilter(chip.id)
              // Scroll para deixar o chip selecionado visível
              const chipEl = chipRefs.current[index]
              const containerEl = filtersRef.current
              if (chipEl && containerEl) {
                const chipLeft = chipEl.offsetLeft
                const chipWidth = chipEl.offsetWidth
                const containerWidth = containerEl.offsetWidth
                const containerScroll = containerEl.scrollLeft
                const padding = 12

                // Se o chip está fora da view à direita
                if (chipLeft + chipWidth > containerScroll + containerWidth - padding) {
                  containerEl.scrollTo({
                    left: chipLeft - padding,
                    behavior: 'smooth'
                  })
                }
                // Se o chip está fora da view à esquerda
                else if (chipLeft < containerScroll + padding) {
                  containerEl.scrollTo({
                    left: chipLeft - padding,
                    behavior: 'smooth'
                  })
                }
              }
            }}
          >
            <span>{chip.label}</span>
          </button>
        ))}
      </div>

      {/* Cards List */}
      <div 
        className={`offers-section__list ${isDragging ? 'offers-section__list--dragging' : ''}`}
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {filteredOffers.map((offer) => {
          const liveTime = getOfferLiveTime(offer)

          const offerRuleLabels = offer.type === 'pechincha'
            ? offerPechinchaRuleLabels
            : offer.type === 'aumentada'
              ? offerAumentadaRuleLabels
              : undefined
          const offerRulesId = offerRuleLabels ? `offer-${offer.id}-rules` : undefined
          const footerClassName = [
            'offer-card__footer',
            offer.showViewAll ? 'offer-card__footer--with-viewall' : '',
            offerRuleLabels ? 'offer-card__footer--with-rules' : '',
          ].filter(Boolean).join(' ')

          return (
          <div key={offer.id} className={`offer-card offer-card--${offer.type.replace('_', '-')}`}>
            {/* Card Header */}
            <div className="offer-card__header">
              <h3 className="offer-card__title">{offer.title}</h3>
              <div className="offer-card__tag" style={{ color: offer.tagColor }}>
                <img src={offer.tagIcon} alt="" className="offer-card__tag-icon" />
                <span>{offer.tagLabel}</span>
              </div>
            </div>

            {/* Card Subheader */}
            <div className="offer-card__subheader">
              <span className="offer-card__subtitle">{offer.subtitle}</span>
              {liveTime ? (
                <span className="offer-card__live-time" aria-label={`Ao vivo, ${liveTime}`}>
                  <span>{liveTime}</span>
                </span>
              ) : offer.date ? (
                <span className="offer-card__date">{offer.date}</span>
              ) : null}
            </div>

            {/* Card Content - Events (for combinada type with teams) */}
            {offer.events && (
              <div className="offer-card__events">
                {offer.events.map((event, index) => (
                  <div key={index} className="offer-card__event">
                    <OfferTeamLogo
                      teamName={getOfferTeamName(event.team1, event.team1Icon)}
                      currentLogo={event.team1Icon}
                      sport={offer.sport ?? ''}
                      className="offer-card__event-icon"
                    />
                    <div className="offer-card__event-info">
                      <span className="offer-card__event-team">{event.team1}</span>
                      <span className="offer-card__event-dot">•</span>
                      <span className="offer-card__event-market">{event.market}</span>
                    </div>
                    <div className="offer-card__event-vs">
                      <span>vs</span>
                      <OfferTeamLogo
                        teamName={getOfferTeamName('', event.team2Icon)}
                        currentLogo={event.team2Icon}
                        sport={offer.sport ?? ''}
                        className="offer-card__event-icon"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Card Content - Player Events (for combinada type with players) */}
            {offer.playerEvents && (
              <div className="offer-card__player-events">
                {offer.playerEvents.map((pEvent, index) => (
                  <div key={index} className="offer-card__player-event">
                    {offerTeamNameByLogo[pEvent.icon] ? (
                      <OfferTeamLogo
                        teamName={offerTeamNameByLogo[pEvent.icon]}
                        currentLogo={pEvent.icon}
                        sport={offer.sport ?? ''}
                        className="offer-card__player-event-icon"
                      />
                    ) : (
                      <img src={pEvent.icon} alt="" className="offer-card__player-event-icon" />
                    )}
                    <div className="offer-card__player-event-info">
                      <span className="offer-card__player-event-name">{pEvent.name}</span>
                      <span className="offer-card__player-event-dot">•</span>
                      {pEvent.value && (
                        <>
                          <span className="offer-card__player-event-value">
                            {pEvent.value.includes('→') ? (
                              <>
                                <span className="offer-card__player-event-old-value">{pEvent.value.split('→')[0].trim()}</span>
                                <img src={iconBoostWhite} alt="" className="offer-card__player-event-arrow" />
                                <span className="offer-card__player-event-new-value">{pEvent.value.split('→')[1].trim()}</span>
                              </>
                            ) : (
                              pEvent.value
                            )}
                          </span>
                          <span className="offer-card__player-event-dot">•</span>
                        </>
                      )}
                      <span className="offer-card__player-event-market">{pEvent.market}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Card Content - Player (for player type) */}
            {offer.player && (
              <div className="offer-card__player">
                <div className="offer-card__player-row">
                  <div className="offer-card__player-avatar">
                    <img src={offer.player.image} alt={offer.player.name} className="offer-card__player-img" />
                    <div className="offer-card__player-badge offer-card__player-badge--sport">
                      <img src={offer.player.sportIcon || iconFutebol} alt="" />
                    </div>
                    <div className="offer-card__player-badge offer-card__player-badge--stat">
                      <span aria-hidden="true" className="offer-card__player-stat-icon" />
                    </div>
                  </div>
                  <div className="offer-card__player-main">
                    <div className="offer-card__player-info">
                      <span className="offer-card__player-name">{offer.player.name}</span>
                      <span className="offer-card__player-team">{offer.player.team}</span>
                    </div>
                    <div className="offer-card__player-stat">
                      <span className="offer-card__player-stat-value">
                        {offer.player.oldStatValue ? (
                          <>
                            {offer.player.statValue.replace(/[\d.]+$/, '')}<span className="offer-card__player-stat-old">{offer.player.oldStatValue}</span> » {offer.player.statValue.match(/[\d.]+$/)?.[0]}
                          </>
                        ) : (
                          offer.player.statValue
                        )}
                      </span>
                      <span className="offer-card__player-stat-label">{offer.player.stat}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Card Content - Team Stat (for team-based super aumentada) */}
            {offer.teamStat && (
              <div className="offer-card__team-stat">
                <div className="offer-card__team-stat-avatar">
                  <OfferTeamLogo
                    teamName={offer.teamStat.teamName}
                    currentLogo={offer.teamStat.teamIcon}
                    sport={offer.sport ?? ''}
                    className="offer-card__team-stat-icon"
                  />
                  <div className="offer-card__team-stat-badge">
                    <img src={offer.teamStat.sportIcon || iconFutebol} alt="" />
                  </div>
                </div>
                <div className="offer-card__team-stat-info">
                  <span className="offer-card__team-stat-value">{offer.teamStat.statValue} {offer.teamStat.stat}</span>
                  <span className="offer-card__team-stat-name">{offer.teamStat.teamName}</span>
                </div>
              </div>
            )}

            {/* Card Footer */}
            <div className={footerClassName}>
              {offer.showViewAll && (
                <button className="offer-card__viewall" disabled={disableInteractions}>
                  <span>Ver todos ({offer.showViewAll})</span>
                  <CaretDownIcon aria-hidden="true" className="offer-card__viewall-icon" weight="bold" />
                </button>
              )}
              {offerRuleLabels && (
                <ul id={offerRulesId} className="offer-card__rules">
                  {offerRuleLabels.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              )}
              <button
                {...getOfferOddButtonProps(offer)}
                aria-label={`Selecionar oferta ${offer.title} com odd ${offer.newOdd}`}
                aria-describedby={offerRulesId}
              >
                <div className="offer-card__odds">
                  {offer.oldOdd && (
                    <>
                      <span className="offer-card__old-odd">{offer.oldOdd}</span>
                      <img src={iconBoost} alt="" className="offer-card__boost-icon" />
                    </>
                  )}
                  <span className="offer-card__new-odd">{offer.newOdd}</span>
                </div>
              </button>
            </div>
          </div>
          )
        })}
      </div>
    </section>
  )
}
