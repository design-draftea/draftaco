import type { ReactNode } from 'react'
import { getTeamAbbreviationAlias } from '../utils/teamAbbreviations'

export type BetslipEventStatus = 'prematch' | 'live'
export type BetslipSelectionType = 'team' | 'player' | 'market'
export type BetslipBadgeType = 'boost' | 'substitution'
export type BetslipPromoVariant = 'garantida' | 'aumentada' | 'super-aumentada'

export const BETSLIP_ODD_INTERACTION_EVENT = 'betslip:odd-interaction'

export interface BetslipSelection {
  id: string
  eventId: string
  marketId: string
  outcomeId: string
  label: string
  selectionLabel: string
  oddLabel: string
  oddValue: number
  marketLabel: string
  eventStatus: BetslipEventStatus
  selectionType: BetslipSelectionType
  sport?: string
  leagueId?: string
  leagueName?: string
  homeTeam?: string
  awayTeam?: string
  eventName?: string
  eventTimeLabel?: string
  liveClock?: string
  createdAtMs: number
  homeScore?: string | number
  awayScore?: string | number
  playerName?: string
  selectionTeamName?: string
  homeTeamIcon?: string
  awayTeamIcon?: string
  selectionIcon?: string
  playerImage?: string
  badgeType?: BetslipBadgeType
  marketTags?: string[]
  promoVariant?: BetslipPromoVariant
  comboId?: string
  comboTitle?: string
  comboTypeLabel?: string
  comboTotalOddLabel?: string
  comboTotalOddValue?: number
  comboLegIndex?: number
  comboLegCount?: number
}

export interface BetslipSelectionInput {
  eventId: string
  marketId: string
  outcomeId: string
  label: ReactNode
  selectionLabel?: string
  odd: ReactNode
  marketLabel?: string
  eventStatus?: BetslipEventStatus
  selectionType?: BetslipSelectionType
  sport?: string
  leagueId?: string
  leagueName?: string
  homeTeam?: string
  awayTeam?: string
  eventName?: string
  eventTimeLabel?: string
  liveClock?: string
  createdAtMs?: number
  homeScore?: string | number
  awayScore?: string | number
  playerName?: string
  selectionTeamName?: string
  homeTeamIcon?: string
  awayTeamIcon?: string
  selectionIcon?: string
  playerImage?: string
  badgeType?: BetslipBadgeType
  marketTags?: string[]
  promoVariant?: BetslipPromoVariant
  comboId?: string
  comboTitle?: string
  comboTypeLabel?: string
  comboTotalOddLabel?: string
  comboLegIndex?: number
  comboLegCount?: number
}

export interface BetslipSummary {
  hasSelections: boolean
  selectedOddsCount: number
  selectionCount: number
  totalOdds: number
  totalOddsLabel: string
  stake: number
  stakeLabel: string
  potentialWin: number
  potentialWinLabel: string
}

export const isSameBetslipSelection = (
  first: BetslipSelection | undefined,
  second: BetslipSelection | undefined
) => {
  if (!first || !second) return false
  if (first.id === second.id) return true

  return first.eventId === second.eventId
    && first.marketId === second.marketId
    && first.outcomeId === second.outcomeId
}

export const BETSLIP_STAKE = 10

const betslipDecimalFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
})

export const formatBetslipOdd = (odd: number) => `${odd.toFixed(2)}x`

export const formatBetslipCurrency = (value: number) => `R$${betslipDecimalFormatter.format(value)}`

export const EMPTY_BETSLIP_SUMMARY: BetslipSummary = {
  hasSelections: false,
  selectedOddsCount: 0,
  selectionCount: 0,
  totalOdds: 0,
  totalOddsLabel: formatBetslipOdd(0),
  stake: BETSLIP_STAKE,
  stakeLabel: formatBetslipCurrency(BETSLIP_STAKE),
  potentialWin: 0,
  potentialWinLabel: formatBetslipCurrency(0),
}

const getNodeText = (node: ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(getNodeText).join('')

  return ''
}

export const normalizeBetslipIdPart = (value: string) => (
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item'
)

export const getCanonicalBetslipTeamId = (teamName?: string) => {
  if (!teamName) return ''

  const alias = getTeamAbbreviationAlias(teamName)
  return normalizeBetslipIdPart(alias || teamName)
}

export const getBetslipMarketGroupId = ({
  eventId,
  marketId,
}: {
  eventId: string
  marketId: string
}) => `${eventId}:${normalizeBetslipIdPart(marketId)}`

export const getBetslipEventId = ({
  sport,
  homeTeam,
  awayTeam,
  fallbackId,
}: {
  sport: string
  homeTeam?: string
  awayTeam?: string
  fallbackId?: string
}) => {
  const homePart = getCanonicalBetslipTeamId(homeTeam)
  const awayPart = getCanonicalBetslipTeamId(awayTeam)

  if (homePart || awayPart) {
    return [
      normalizeBetslipIdPart(sport),
      homePart || 'home',
      awayPart || 'away',
    ].join(':')
  }

  return [
    normalizeBetslipIdPart(sport),
    normalizeBetslipIdPart(fallbackId ?? 'event'),
  ].join(':')
}

const resultMarketIds = new Set([
  '1x2',
  'partidas',
  'resultado',
  'resultado-final',
])

const winnerMarketIds = new Set([
  'principais',
  'vencedor',
  'vencer',
])

const getCanonicalMatchMarketId = (marketId: string, sport: string) => {
  const normalizedMarketId = normalizeBetslipIdPart(marketId)

  if (normalizedMarketId === 'q3-total' || normalizedMarketId === 'q4-total') {
    return normalizedMarketId
  }

  if (resultMarketIds.has(normalizedMarketId)) return sport === 'basquete' ? 'vencedor' : 'resultado-final'
  if (winnerMarketIds.has(normalizedMarketId) || /(^|-)vencer$/.test(normalizedMarketId)) return 'vencedor'
  if (normalizedMarketId === 'handicap' || /(^|-)handicap$/.test(normalizedMarketId)) return 'handicap'
  if (normalizedMarketId === 'total' || /(^|-)total$/.test(normalizedMarketId)) {
    return sport === 'basquete' ? 'total-pontos' : normalizedMarketId
  }
  if (normalizedMarketId === 'total-de-pontos') return 'total-pontos'
  if (normalizedMarketId === 'total-de-gols') return 'total-gols'
  if (normalizedMarketId === 'total-escanteios' || normalizedMarketId === 'total-de-escanteios') return 'escanteios'

  return normalizedMarketId
}

const normalizeOutcomeText = (value: ReactNode) => normalizeBetslipIdPart(getNodeText(value))

const getOutcomeNumberLine = (value: ReactNode) => {
  const match = getNodeText(value).match(/[+-]?\d+(?:[.,]\d+)?/)
  return match ? match[0].replace(',', '.') : ''
}

const getSignedLineId = (value: ReactNode) => {
  const line = getOutcomeNumberLine(value)
  if (!line) return ''

  if (line.startsWith('+')) return `plus-${normalizeBetslipIdPart(line.slice(1))}`
  if (line.startsWith('-')) return `minus-${normalizeBetslipIdPart(line.slice(1))}`

  const text = getNodeText(value)
  if (/\s\+\d|^\+\d/.test(text)) return `plus-${normalizeBetslipIdPart(line)}`
  if (/\s-\d|^-\d/.test(text)) return `minus-${normalizeBetslipIdPart(line)}`

  return normalizeBetslipIdPart(line)
}

const getSideOutcomeId = ({
  outcomeId,
  label,
  homeTeam,
  awayTeam,
}: {
  outcomeId: string
  label: ReactNode
  homeTeam?: string
  awayTeam?: string
}) => {
  const normalizedOutcomeId = normalizeBetslipIdPart(outcomeId)
  const normalizedLabel = normalizeOutcomeText(label)
  const homeId = getCanonicalBetslipTeamId(homeTeam)
  const awayId = getCanonicalBetslipTeamId(awayTeam)

  if (normalizedOutcomeId === 'home' || normalizedOutcomeId.startsWith('home-')) return 'home'
  if (normalizedOutcomeId === 'away' || normalizedOutcomeId.startsWith('away-')) return 'away'
  if (normalizedOutcomeId === 'player-1') return 'home'
  if (normalizedOutcomeId === 'player-2') return 'away'
  if (normalizedOutcomeId === 'draw' || normalizedOutcomeId === 'empate') return 'draw'
  if (normalizedLabel === 'empate' || normalizedLabel === 'draw' || normalizedLabel === 'x') return 'draw'
  if (homeId && getCanonicalBetslipTeamId(getNodeText(label)) === homeId) return 'home'
  if (awayId && getCanonicalBetslipTeamId(getNodeText(label)) === awayId) return 'away'
  if (homeId && normalizedLabel.startsWith(`${homeId}-`)) return 'home'
  if (awayId && normalizedLabel.startsWith(`${awayId}-`)) return 'away'

  return ''
}

const getDirectionOutcomeId = ({
  outcomeId,
  label,
}: {
  outcomeId: string
  label: ReactNode
}) => {
  const normalizedOutcomeId = normalizeBetslipIdPart(outcomeId)
  const normalizedLabel = normalizeOutcomeText(label)
  const rawLabel = getNodeText(label).trim()
  const line = getOutcomeNumberLine(label)
  const lineId = line ? normalizeBetslipIdPart(line) : ''
  const isOver = /(^|-)over(-|$)|(^|-)mais(-|$)|(^|-)up(-|$)/.test(normalizedOutcomeId)
    || /(^|-)over(-|$)|(^|-)mais(-|$)/.test(normalizedLabel)
    || /^\s*\u2191/.test(rawLabel)
    || /^\+/.test(rawLabel)
    || /\+$/.test(rawLabel)
  const isUnder = /(^|-)under(-|$)|(^|-)menos(-|$)|(^|-)down(-|$)/.test(normalizedOutcomeId)
    || /(^|-)under(-|$)|(^|-)menos(-|$)/.test(normalizedLabel)
    || /^\s*\u2193/.test(rawLabel)
    || /^-/.test(rawLabel)
    || /-$/.test(rawLabel)

  if (isOver) return lineId ? `over-${lineId}` : 'over'
  if (isUnder) return lineId ? `under-${lineId}` : 'under'

  return ''
}

const getCanonicalMatchOutcomeId = ({
  marketId,
  outcomeId,
  label,
  homeTeam,
  awayTeam,
}: {
  marketId: string
  outcomeId: string
  label: ReactNode
  homeTeam?: string
  awayTeam?: string
}) => {
  const normalizedOutcomeId = normalizeBetslipIdPart(outcomeId)

  if (marketId === 'resultado-final' || marketId === 'vencedor') {
    return getSideOutcomeId({ outcomeId, label, homeTeam, awayTeam }) || normalizedOutcomeId
  }

  if (marketId === 'total-gols' || marketId === 'total-pontos' || marketId === 'q3-total' || marketId === 'q4-total' || marketId === 'escanteios') {
    return getDirectionOutcomeId({ outcomeId, label }) || normalizedOutcomeId
  }

  if (marketId === 'handicap') {
    const side = getSideOutcomeId({ outcomeId, label, homeTeam, awayTeam })
    const line = getSignedLineId(label)

    return [side || normalizedOutcomeId, line].filter(Boolean).join('-')
  }

  return normalizedOutcomeId
}

export const getMatchOddBetslipKey = ({
  sport,
  homeTeam,
  awayTeam,
  marketId,
  outcomeId,
  label,
}: {
  sport: string
  homeTeam?: string
  awayTeam?: string
  marketId: string
  outcomeId: string
  label: ReactNode
}) => {
  const eventId = getBetslipEventId({ sport, homeTeam, awayTeam })
  const canonicalMarketId = getCanonicalMatchMarketId(marketId, sport)
  const canonicalOutcomeId = getCanonicalMatchOutcomeId({
    marketId: canonicalMarketId,
    outcomeId,
    label,
    homeTeam,
    awayTeam,
  })

  return {
    eventId,
    marketId: canonicalMarketId,
    outcomeId: canonicalOutcomeId,
    groupId: getBetslipMarketGroupId({ eventId, marketId: canonicalMarketId }),
  }
}

// Canonical betslip key for a player-prop odd, shared by every screen (sport,
// competition, live event / pre-match) so the SAME bet produces the SAME id and
// stays correlated. Each player is its own market (multi-selectable); lines of
// the same player are mutually exclusive. The match is keyed by full team names
// (the form already used by match odds and the live event), the line by its label.
export const getPlayerPropBetslipKey = ({
  sport,
  homeTeam,
  awayTeam,
  marketId,
  playerName,
  lineLabel,
}: {
  sport: string
  homeTeam?: string
  awayTeam?: string
  marketId: string
  playerName: string
  lineLabel: ReactNode
}) => {
  const eventId = getBetslipEventId({ sport, homeTeam, awayTeam })
  const playerMarketId = `${normalizeBetslipIdPart(marketId)}-${normalizeBetslipIdPart(playerName)}`
  const outcomeId = normalizeBetslipIdPart(getNodeText(lineLabel))

  return {
    eventId,
    marketId: playerMarketId,
    outcomeId,
    groupId: getBetslipMarketGroupId({ eventId, marketId: playerMarketId }),
  }
}

export const parseBetslipOdd = (odd: ReactNode) => {
  const oddLabel = getNodeText(odd).trim()
  const normalizedOddLabel = oddLabel.includes(',')
    ? oddLabel.replace(/\./g, '').replace(',', '.')
    : oddLabel
  const oddValue = Number.parseFloat(normalizedOddLabel.replace(/[^0-9.]/g, ''))

  return Number.isFinite(oddValue) && oddValue > 0 ? oddValue : null
}

const formatBetslipMarketLabel = (marketId: string) => (
  marketId
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Mercado'
)

const getBetslipEventName = ({
  eventName,
  homeTeam,
  awayTeam,
  fallbackId,
}: {
  eventName?: string
  homeTeam?: string
  awayTeam?: string
  fallbackId: string
}) => {
  if (eventName) return eventName
  if (homeTeam && awayTeam) return `${homeTeam} x ${awayTeam}`
  if (homeTeam) return homeTeam
  if (awayTeam) return awayTeam

  return fallbackId
    .split(':')
    .slice(-2)
    .map((part) => part.replace(/-/g, ' '))
    .join(' x ')
}

const getBetslipSelectionType = ({
  selectionType,
  playerName,
  label,
  homeTeam,
  awayTeam,
}: {
  selectionType?: BetslipSelectionType
  playerName?: string
  label: string
  homeTeam?: string
  awayTeam?: string
}): BetslipSelectionType => {
  if (selectionType) return selectionType
  if (playerName) return 'player'
  if (label === homeTeam || label === awayTeam) return 'team'

  return 'market'
}

export const createBetslipSelection = ({
  eventId,
  marketId,
  outcomeId,
  label,
  selectionLabel,
  odd,
  marketLabel,
  eventStatus = 'prematch',
  selectionType,
  sport,
  leagueId,
  leagueName,
  homeTeam,
  awayTeam,
  eventName,
  eventTimeLabel,
  liveClock,
  createdAtMs,
  homeScore,
  awayScore,
  playerName,
  selectionTeamName,
  homeTeamIcon,
  awayTeamIcon,
  selectionIcon,
  playerImage,
  badgeType,
  marketTags,
  promoVariant,
  comboId,
  comboTitle,
  comboTypeLabel,
  comboTotalOddLabel,
  comboLegIndex,
  comboLegCount,
}: BetslipSelectionInput): BetslipSelection | undefined => {
  const oddValue = parseBetslipOdd(odd)
  if (!oddValue) return undefined

  const comboTotalOddValue = comboTotalOddLabel ? parseBetslipOdd(comboTotalOddLabel) : null
  const normalizedEventId = eventId || getBetslipEventId({ sport: 'unknown' })
  const normalizedMarketId = normalizeBetslipIdPart(marketId)
  const normalizedOutcomeId = normalizeBetslipIdPart(outcomeId)
  const normalizedComboId = comboId ? normalizeBetslipIdPart(comboId) : undefined
  const labelText = getNodeText(label)

  return {
    id: `${normalizedEventId}:${normalizedMarketId}:${normalizedOutcomeId}`,
    eventId: normalizedEventId,
    marketId: normalizedMarketId,
    outcomeId: normalizedOutcomeId,
    label: labelText,
    selectionLabel: selectionLabel ?? playerName ?? labelText,
    oddLabel: formatBetslipOdd(oddValue),
    oddValue,
    marketLabel: marketLabel ?? formatBetslipMarketLabel(marketId),
    eventStatus,
    selectionType: getBetslipSelectionType({
      selectionType,
      playerName,
      label: labelText,
      homeTeam,
      awayTeam,
    }),
    sport,
    leagueId,
    leagueName,
    homeTeam,
    awayTeam,
    eventName: getBetslipEventName({
      eventName,
      homeTeam,
      awayTeam,
      fallbackId: normalizedEventId,
    }),
    eventTimeLabel,
    liveClock,
    createdAtMs: createdAtMs ?? Date.now(),
    homeScore,
    awayScore,
    playerName,
    selectionTeamName,
    homeTeamIcon,
    awayTeamIcon,
    selectionIcon,
    playerImage,
    badgeType,
    marketTags,
    promoVariant,
    comboId: normalizedComboId,
    comboTitle,
    comboTypeLabel,
    comboTotalOddLabel,
    comboTotalOddValue: comboTotalOddValue ?? undefined,
    comboLegIndex,
    comboLegCount,
  }
}
