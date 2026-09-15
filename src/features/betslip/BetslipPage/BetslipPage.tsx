import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import {
  CaretRightIcon,
  CheckIcon,
  FileTextIcon,
  GearSixIcon,
  ShareIcon,
  TrashIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import confetti from 'canvas-confetti'
import './BetslipPage.css'

import iconMultiplaGde from '../../../assets/iconMultiplaGde.png'
import multiplaTurbinadaIcon from '../../../assets/multiplaTurbinada.png'
import pagamentoAntecipado from '../../../assets/pagamentoAntecipado.png'
import iconAumentada from '../../../assets/iconAumentada.png'
import iconPechincha from '../../../assets/iconPechincha.png'
import iconSuperAumentada from '../../../assets/iconSuperAumentada.png'
import {
  BeneficiosApostaBottomSheet,
  MultiplaTurbinadaBottomSheet,
  PagamentoAntecipadoBottomSheet,
  type BetslipBenefitSheetItem,
  type PagamentoAntecipadoSport,
} from '../../../components/BottomSheet'
import { StakeKeyboard, type StakeKeyboardKey } from '../../../components/StakeKeyboard'
import substituicaoGarantida from '../../../assets/substituicaoGarantida.png'
import {
  BETSLIP_TURBO_MIN_ODD_VALUE,
  getBetslipTurboBonusCents,
  getBetslipTurboEligibleSelectionCountIgnoringPromotions,
  getBetslipTurboBonusPercent,
  hasBetslipTurboBlockedByPromotionSelection,
  isBetslipTurboSelectionGroupEligible,
} from '../../../shared/hooks/betslipTurboBonus'
import {
  BETSLIP_PECHINCHA_RULE_MESSAGE,
  getBetslipPechinchaRuleStatus,
} from '../../../shared/hooks/betslipPechinchaRules'
import { getTeamLogo } from '../../../data/teamLogos'
import { useBetslip } from '../../../shared/hooks/useBetslip'
import type { LiveEventMatch, LiveEventOpenPayload, LiveEventRailItem } from '../../sports/LiveEventPage'
import {
  BETSLIP_ODD_INTERACTION_EVENT,
  createBetslipSelection,
  formatBetslipOdd,
  getBetslipMarketGroupId,
  normalizeBetslipIdPart,
  type BetslipSelection,
} from '../../../shared/hooks/betslipUtils'
import { BETSLIP_LIVE_EVENT_OPEN_EVENT } from '../../../shared/utils/betslipLiveEvent'
import { advanceLiveClock } from '../../../shared/utils/liveClock'
import { TEAM_LOGO_FALLBACK, normalizeTeamLogoSource } from '../../../shared/utils/teamLogoFallback'
import { getBetslipPlayerImage, getPlayerAvatarFallbackSrc } from '../BetslipPageV2/betslipDisplayUtils'

interface BetslipPageProps {
  isCoveredByEvent?: boolean
  onClose?: () => void
  onSelectionsEmptyExitStart?: () => void
}

interface BetslipSuccessSelectionItem {
  id: string
  title: string
  subtitle: string
  oddLabel: string
  marketLabel?: string
  selectionLabel?: string
}

interface BetslipSuccessSummary {
  selectionCount: number
  selectionTitle: string
  selectionSubtitle: string
  stakeCents: number
  potentialWinCents: number
  totalOddsLabel: string
  selectionItems?: BetslipSuccessSelectionItem[]
}

const PITACOINS_CENTS = 30000
const BALANCE_CENTS = 240000
const WALLET_STAKE_LIMIT_CENTS = PITACOINS_CENTS + BALANCE_CENTS
const BET_CREDIT_CENTS = 2000
const DEFAULT_BETSLIP_STAKE_CENTS = 1000
const DEFAULT_SIMPLE_STAKE_CENTS = 0
const animatedFooterValueDurationMs = 520
const quickStakeFeedbackClassName = 'betslip-page__quick-stake--feedback'
const betslipTabIndicatorAnimationDurationMs = 360
const betslipPageEnterDurationMs = 360
const betslipConfirmDelayMs = 3000
const betslipConfirmDragThreshold = 0.6
const betslipConfirmCompleteAnimationMs = 180
const betslipConfirmKnobSizePx = 40
const betslipConfirmTrackPaddingPx = 4
const betslipExitDelayMs = 320
const betslipCardRemoveDelayMs = 280
const betslipBuilderLegRemoveDelayMs = 220
const betslipCardUpdateDelayMs = 320
const betslipSuccessVisibleDelayMs = 10000
const betslipSuccessConfettiZIndex = 3400
const betslipTurboMinSelectionCount = 3
const betslipLiveEventSupportedSports = new Set(['futebol', 'basquete'])
const offerAdvantageByMarketId = {
  aumentada: {
    icon: iconAumentada,
    label: 'Aumentada',
  },
  pechincha: {
    icon: iconPechincha,
    label: 'Pechincha',
  },
  'super-aumentada': {
    icon: iconSuperAumentada,
    label: 'Super Aumentada',
  },
}

type ConfettiOptions = NonNullable<Parameters<typeof confetti>[0]>
type BetMode = 'multiple' | 'simple'
type StakeTarget = { type: 'multiple' } | { type: 'simple'; groupId: string }
type StakeCentsUpdater = number | ((current: number) => number)

const getTranslateXFromTransform = (transform: string) => {
  if (!transform || transform === 'none') return 0

  try {
    return new DOMMatrixReadOnly(transform).m41
  } catch {
    const matrixValues = transform.match(/matrix\(([^)]+)\)/)?.[1]?.split(',') ?? []
    return Number(matrixValues[4]) || 0
  }
}

const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3

function fireBetslipSuccessConfetti() {
  const count = 200
  const defaults: ConfettiOptions = {
    origin: { y: 0.9 },
    zIndex: betslipSuccessConfettiZIndex,
    colors: ['#5228FF', '#7A35FF', '#AE18FF'],
  }

  function fire(particleRatio: number, opts: ConfettiOptions) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
      ticks: 70,
    })
  }

  fire(0.25, { spread: 26, startVelocity: 55, ticks: 50 })
  fire(0.2, { spread: 60, ticks: 60 })
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, ticks: 80 })
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, ticks: 65 })
  fire(0.1, { spread: 120, startVelocity: 45, ticks: 65 })
}

function formatCurrency(cents: number) {
  return `R$${(cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatConfirmCurrency(cents: number) {
  return formatCurrency(cents).replace('R$', 'R$ ')
}

function formatStakeInput(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const formatOddsLabel = formatBetslipOdd

const formatOddsProduct = (selections: BetslipSelection[]) => (
  formatOddsLabel(selections.reduce((total, selection) => total * selection.oddValue, 1))
)

const getSelectionGroupOddsValue = (selections: BetslipSelection[]) => {
  const firstSelection = selections[0]
  const isCompleteCombo = Boolean(
    firstSelection?.comboId
    && firstSelection.comboTotalOddValue
    && firstSelection.comboLegCount
    && selections.length >= firstSelection.comboLegCount
    && selections.every((selection) => selection.comboId === firstSelection.comboId)
  )

  if (isCompleteCombo) {
    return firstSelection.comboTotalOddValue ?? selections.reduce((total, selection) => total * selection.oddValue, 1)
  }

  return selections.reduce((total, selection) => total * selection.oddValue, 1)
}

const getSelectionGroupOddsLabel = (selections: BetslipSelection[]) => {
  const firstSelection = selections[0]
  const isCompleteCombo = Boolean(
    firstSelection?.comboId
    && firstSelection.comboTotalOddLabel
    && firstSelection.comboLegCount
    && selections.length >= firstSelection.comboLegCount
    && selections.every((selection) => selection.comboId === firstSelection.comboId)
  )

  if (isCompleteCombo) {
    return firstSelection.comboTotalOddLabel ?? formatOddsProduct(selections)
  }

  return formatOddsProduct(selections)
}

const parseBetslipScore = (score: BetslipSelection['homeScore'] | BetslipSelection['awayScore']) => {
  const numericScore = Number(score)

  return Number.isFinite(numericScore) ? numericScore : 0
}

const getBetslipLiveEventSport = (selection: BetslipSelection) => {
  const sport = selection.sport ? normalizeBetslipIdPart(selection.sport) : 'futebol'

  return betslipLiveEventSupportedSports.has(sport) ? sport : 'futebol'
}

const getTeamIconSource = (teamName: string | undefined, icon?: string) => (
  normalizeTeamLogoSource(icon)
  ?? normalizeTeamLogoSource(teamName ? getTeamLogo(teamName) : undefined)
  ?? (teamName ? TEAM_LOGO_FALLBACK : '')
)

const getBetslipTeamIcon = (
  selection: BetslipSelection,
  teamName: string | undefined,
  side: 'home' | 'away'
) => {
  const icon = side === 'home' ? selection.homeTeamIcon : selection.awayTeamIcon
  return getTeamIconSource(teamName, icon)
}

const getBetslipEventOddLabel = (
  selections: BetslipSelection[],
  predicate: (selection: BetslipSelection) => boolean,
  fallback: string
) => selections.find(predicate)?.oddLabel ?? fallback

const buildLiveEventMatchFromBetslipGroup = (
  group: BetslipSelectionGroup,
  nowMs: number
): { match: LiveEventMatch; railItem: LiveEventRailItem; currentTime: string } | null => {
  const [firstSelection] = group.selections
  if (!firstSelection?.homeTeam || !firstSelection.awayTeam) return null

  const sport = getBetslipLiveEventSport(firstSelection)
  const isLive = firstSelection.eventStatus === 'live'
  const currentTime = getSelectionTimeLabel(firstSelection, nowMs)
  const dateTime = firstSelection.eventTimeLabel ?? currentTime
  const homeTeamName = firstSelection.homeTeam
  const awayTeamName = firstSelection.awayTeam
  const homeTeam = {
    name: homeTeamName,
    icon: getBetslipTeamIcon(firstSelection, homeTeamName, 'home'),
    score: parseBetslipScore(firstSelection.homeScore),
  }
  const awayTeam = {
    name: awayTeamName,
    icon: getBetslipTeamIcon(firstSelection, awayTeamName, 'away'),
    score: parseBetslipScore(firstSelection.awayScore),
  }
  const homeTeamSignature = normalizeBetslipIdPart(homeTeamName)
  const awayTeamSignature = normalizeBetslipIdPart(awayTeamName)
  const odds = {
    home: getBetslipEventOddLabel(
      group.selections,
      (selection) => normalizeBetslipIdPart(getSelectionTitle(selection)) === homeTeamSignature,
      '1.90x'
    ),
    draw: sport === 'futebol'
      ? getBetslipEventOddLabel(
          group.selections,
          (selection) => normalizeBetslipIdPart(getSelectionTitle(selection)) === 'empate',
          '3.20x'
        )
      : undefined,
    away: getBetslipEventOddLabel(
      group.selections,
      (selection) => normalizeBetslipIdPart(getSelectionTitle(selection)) === awayTeamSignature,
      '1.90x'
    ),
  }
  const match: LiveEventMatch = {
    id: group.eventId,
    leagueName: 'Betslip',
    sport,
    isLive,
    time: dateTime,
    dateTime,
    currentTime,
    homeTeam,
    awayTeam,
    odds,
  }
  const railItem: LiveEventRailItem = {
    id: group.eventId,
    leagueName: 'Betslip',
    sport,
    isLive,
    dateTime,
    currentTime,
    headerPrimary: isLive ? currentTime : undefined,
    homeTeam,
    awayTeam,
    odds,
  }

  return { match, railItem, currentTime }
}

const buildBetslipLiveEventOpenPayload = (
  groups: BetslipSelectionGroup[],
  selectedEventId: string,
  nowMs: number
): LiveEventOpenPayload | null => {
  const eventEntries = groups
    .map((group) => ({
      eventId: group.eventId,
      event: buildLiveEventMatchFromBetslipGroup(group, nowMs),
    }))
    .filter((entry): entry is {
      eventId: string
      event: { match: LiveEventMatch; railItem: LiveEventRailItem; currentTime: string }
    } => entry.event !== null)
  const selectedIndex = eventEntries.findIndex((entry) => entry.eventId === selectedEventId)
  if (selectedIndex < 0) return null

  const selectedEvent = eventEntries[selectedIndex].event

  return {
    matches: eventEntries.map((entry) => entry.event.match),
    railEvents: eventEntries.map((entry) => entry.event.railItem),
    selectedIndex,
    leagueName: selectedEvent.match.leagueName ?? 'Betslip',
    leagueFlag: selectedEvent.match.leagueFlag,
    sport: selectedEvent.match.sport ?? 'futebol',
    currentTimes: Object.fromEntries(
      eventEntries.map((entry) => [entry.event.match.id ?? entry.eventId, entry.event.currentTime])
    ),
  }
}

const getSelectionEventName = (selection: BetslipSelection) => (
  selection.eventName
    ?? (selection.homeTeam && selection.awayTeam ? `${selection.homeTeam} x ${selection.awayTeam}` : selection.eventId)
)

const getSelectionTimeLabel = (selection: BetslipSelection, nowMs = Date.now()) => {
  if (selection.eventStatus !== 'live') return selection.eventTimeLabel ?? 'Hoje'

  const initialLiveClock = selection.liveClock ?? selection.eventTimeLabel ?? 'Ao vivo'
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - selection.createdAtMs) / 1000))

  return advanceLiveClock(initialLiveClock, elapsedSeconds)
}

const normalizeSelectionLineValue = (value: string) => (
  value
    .trim()
    .split(/\s*(?:→|»)\s*/)
    .pop()
    ?.trim()
    .replace(/^mais\s+de\s+(\d+(?:[,.]\d+)?)(.*)$/i, '+$1$2')
    .replace(/^menos\s+de\s+(\d+(?:[,.]\d+)?)(.*)$/i, '-$1$2')
    .replace(/\b(\d+)\.0\+/g, '$1+') ?? ''
)

const getSelectionTitle = (selection: BetslipSelection) => {
  const title = selection.selectionType === 'player'
    ? selection.playerName ?? selection.selectionLabel
    : selection.selectionLabel

  return selection.selectionType === 'player' ? title : normalizeSelectionLineValue(title)
}

const getSelectionMarketLabel = (selection: BetslipSelection) => selection.marketLabel || selection.label

const normalizeSelectionMarketDisplayLabel = (marketLabel: string) => {
  const displayLabel = normalizeSelectionLineValue(
    marketLabel.replace(/\s*[-–—]\s*Pagamento Antecipado\s*$/i, '')
  )

  if (normalizeBetslipIdPart(displayLabel) === 'resultado-final') return 'Resultado Final'

  return displayLabel
}

const getPlayerSelectionValueLabel = (selection: BetslipSelection) => {
  const rawValue = selection.label.trim()
  const title = getSelectionTitle(selection).trim()

  if (!rawValue || rawValue === title) return ''

  const valueWithoutTitle = rawValue.toLowerCase().startsWith(title.toLowerCase())
    ? rawValue.slice(title.length).trim()
    : rawValue

  return normalizeSelectionLineValue(valueWithoutTitle)
}

const getSelectionMarketDisplayLabel = (selection: BetslipSelection) => {
  const marketLabel = normalizeSelectionMarketDisplayLabel(getSelectionMarketLabel(selection))
  if (selection.selectionType !== 'player') return marketLabel

  const valueLabel = getPlayerSelectionValueLabel(selection)
  if (!valueLabel || valueLabel === marketLabel) return marketLabel

  return `${valueLabel} ${marketLabel}`
}

const getSelectionExactSignature = (selection: BetslipSelection) => [
  selection.eventId,
  normalizeBetslipIdPart(getSelectionMarketLabel(selection)),
  normalizeBetslipIdPart(getSelectionTitle(selection)),
].join(':')

const getSelectionMarketSignature = (selection: BetslipSelection) => [
  selection.eventId,
  normalizeBetslipIdPart(getSelectionMarketLabel(selection)),
].join(':')

const isResultMarketSelection = (selection: BetslipSelection) => (
  ['resultado-final', 'resultado-final-pagamento-antecipado', '1x2', 'vencedor', 'vencedor-pagamento-antecipado'].includes(
    normalizeBetslipIdPart(getSelectionMarketLabel(selection))
  )
  || ['resultado-final', '1x2', 'vencedor'].includes(selection.marketId)
)

const isDrawResultSelection = (selection: BetslipSelection) => {
  const selectionTitle = normalizeBetslipIdPart(getSelectionTitle(selection))
  const outcomeId = normalizeBetslipIdPart(selection.outcomeId)

  return selectionTitle === 'empate' || outcomeId === 'draw' || outcomeId === 'empate'
}

const isEarlyPayoutSelection = (selection: BetslipSelection) => (
  selection.eventStatus !== 'live'
  && isResultMarketSelection(selection)
  && !isDrawResultSelection(selection)
)

type OfferAdvantageMarketId = keyof typeof offerAdvantageByMarketId

const getSelectionOfferAdvantage = (selection: BetslipSelection) => (
  offerAdvantageByMarketId[normalizeBetslipIdPart(selection.marketId) as OfferAdvantageMarketId]
  ?? (
    selection.comboTypeLabel
      ? offerAdvantageByMarketId[normalizeBetslipIdPart(selection.comboTypeLabel) as OfferAdvantageMarketId]
      : undefined
  )
)

const getSelectionSecondaryBenefitItem = (
  selection: BetslipSelection
): BetslipBenefitSheetItem | null => {
  if (selection.badgeType === 'substitution' && selection.selectionType === 'player') {
    return { id: 'substitution' }
  }

  if (isEarlyPayoutSelection(selection)) {
    return {
      id: 'early-payout',
      sport: getBetslipLiveEventSport(selection) as PagamentoAntecipadoSport,
    }
  }

  return null
}

const getBetslipBenefitItemKey = (item: BetslipBenefitSheetItem) => {
  if (item.id === 'early-payout') return `${item.id}:${item.sport ?? 'futebol'}`
  return item.id
}

const dedupeBetslipBenefitItems = (items: BetslipBenefitSheetItem[]) => {
  const seenItems = new Set<string>()

  return items.filter((item) => {
    const key = getBetslipBenefitItemKey(item)
    if (seenItems.has(key)) return false

    seenItems.add(key)
    return true
  })
}

const getSelectionBenefitItems = (
  selection: BetslipSelection,
  currentTurboSelectionCount: number,
  includeTurbo = true
) => {
  if (getSelectionOfferAdvantage(selection)) return []

  const hasTurboBenefit = includeTurbo && selection.oddValue >= BETSLIP_TURBO_MIN_ODD_VALUE
  const items: BetslipBenefitSheetItem[] = hasTurboBenefit
    ? [{ id: 'turbo', currentSelectionCount: currentTurboSelectionCount }]
    : []
  const secondaryBenefit = getSelectionSecondaryBenefitItem(selection)

  if (secondaryBenefit) items.push(secondaryBenefit)

  return dedupeBetslipBenefitItems(items)
}

const getSuccessMarketSubtitle = (selection: BetslipSelection) => {
  const selectionTitle = getSelectionTitle(selection)
  const marketLabel = getSelectionMarketDisplayLabel(selection)

  if (normalizeBetslipIdPart(selectionTitle) === normalizeBetslipIdPart(marketLabel)) {
    return marketLabel
  }

  return `${selectionTitle} ${marketLabel}`
}

const getSuccessSingleSelectionCopy = (selection: BetslipSelection) => {
  if (selection.selectionType === 'market' && !isResultMarketSelection(selection)) {
    return {
      title: selection.homeTeam ?? getSelectionEventName(selection),
      subtitle: getSuccessMarketSubtitle(selection),
    }
  }

  return {
    title: getSelectionTitle(selection),
    subtitle: getSelectionMarketDisplayLabel(selection),
  }
}

const getSuccessSelectionLineLabel = (selection: BetslipSelection) => {
  const copy = getSuccessSingleSelectionCopy(selection)

  return `${copy.title} ${copy.subtitle}`
}

interface BetslipSelectionGroup {
  eventId: string
  selections: BetslipSelection[]
}

const getSelectionGroupBenefitItems = (
  group: BetslipSelectionGroup,
  currentTurboSelectionCount: number,
  includeTurbo = true
) => {
  const hasOfferAdvantage = group.selections.some((selection) => Boolean(getSelectionOfferAdvantage(selection)))
  const items: BetslipBenefitSheetItem[] = includeTurbo
    && !hasOfferAdvantage
    && isBetslipTurboSelectionGroupEligible(group.selections)
    ? [{ id: 'turbo', currentSelectionCount: currentTurboSelectionCount }]
    : []

  items.push(
    ...group.selections
      .map(getSelectionSecondaryBenefitItem)
      .filter((item): item is BetslipBenefitSheetItem => item !== null)
  )

  return dedupeBetslipBenefitItems(items)
}

const groupSelectionsByEvent = (selections: BetslipSelection[]) => {
  const groups = new Map<string, BetslipSelection[]>()

  selections.forEach((selection) => {
    const groupId = `event:${selection.eventId}`

    groups.set(groupId, [...(groups.get(groupId) ?? []), selection])
  })

  return Array.from(groups.entries()).map(([groupId, groupSelections]): BetslipSelectionGroup => ({
    eventId: groupId.replace(/^event:/, ''),
    selections: groupSelections,
  }))
}

const getSuccessSelectionItemFromGroup = (
  group: BetslipSelectionGroup
): BetslipSuccessSelectionItem => {
  if (group.selections.length === 1) {
    const [selection] = group.selections
    const copy = getSuccessSingleSelectionCopy(selection)

    return {
      id: selection.id,
      title: 'Simples',
      subtitle: `${copy.title} ${copy.subtitle}`,
      oddLabel: getSelectionGroupOddsLabel(group.selections),
      marketLabel: copy.subtitle,
      selectionLabel: copy.title,
    }
  }

  return {
    id: group.eventId,
    title: `Criar Aposta (${group.selections.length})`,
    subtitle: group.selections.map((selection) => (
      getSuccessSelectionLineLabel(selection)
    )).join(', '),
    oddLabel: getSelectionGroupOddsLabel(group.selections),
  }
}

const getSuccessSimpleSelectionItems = (selectionGroups: BetslipSelectionGroup[]) => (
  selectionGroups.map(getSuccessSelectionItemFromGroup)
)

const getSuccessSelectionCopy = (
  selectionGroups: BetslipSelectionGroup[],
  selectionCount: number
) => {
  if (selectionGroups.length === 1) {
    const [group] = selectionGroups

    if (group.selections.length === 1) {
      const [selection] = group.selections

      return getSuccessSingleSelectionCopy(selection)
    }

    return {
      title: `Criar Aposta (${group.selections.length})`,
      subtitle: group.selections.map((selection) => (
        getSuccessSelectionLineLabel(selection)
      )).join(', '),
    }
  }

  return {
    title: `Múltipla (${selectionCount})`,
    subtitle: selectionGroups.map((group) => (
      group.selections.length > 1
        ? `Criar Aposta (${group.selections.length})`
        : getSuccessSelectionLineLabel(group.selections[0])
    )).join(', '),
  }
}

const createRelatedRecommendation = (
  baseSelection: BetslipSelection | undefined,
  index: number,
  nowMs = Date.now()
) => {
  const homeTeam = baseSelection?.homeTeam ?? 'Palmeiras'
  const awayTeam = baseSelection?.awayTeam ?? 'Santos'
  const sport = baseSelection?.sport ?? 'futebol'
  const eventStatus = baseSelection?.eventStatus ?? 'prematch'
  const eventId = baseSelection?.eventId ?? `recommendation:${index}`
  const eventName = baseSelection ? getSelectionEventName(baseSelection) : `${homeTeam} x ${awayTeam}`
  const eventTimeLabel = baseSelection ? getSelectionTimeLabel(baseSelection, nowMs) : 'Hoje, 19h30'
  const liveClock = eventStatus === 'live' ? eventTimeLabel : undefined
  const homeTeamIcon = getTeamIconSource(homeTeam, baseSelection?.homeTeamIcon)
  const awayTeamIcon = getTeamIconSource(awayTeam, baseSelection?.awayTeamIcon)
  const variants = sport === 'basquete'
    ? [
      { marketId: 'total-pontos', outcomeId: `over-${index}`, label: 'Mais de 218.5', marketLabel: 'Total de Pontos', odd: '1.91x' },
      { marketId: 'handicap', outcomeId: `home-handicap-${index}`, label: `${homeTeam} -4.5`, marketLabel: 'Handicap', odd: '1.88x' },
      { marketId: 'rebotes-jogador', outcomeId: `rebounds-${index}`, label: 'Mais de 8.5', marketLabel: 'Rebotes do Jogador', odd: '1.82x' },
      { marketId: 'assistencias-jogador', outcomeId: `assists-${index}`, label: 'Mais de 5.5', marketLabel: 'Assistências do Jogador', odd: '1.76x' },
      { marketId: 'pontos-equipe', outcomeId: `team-points-${index}`, label: `${homeTeam} mais de 109.5`, marketLabel: 'Pontos da Equipe', odd: '1.89x' },
    ]
    : [
      { marketId: 'total-gols', outcomeId: `over-${index}`, label: 'Mais de 2.5', marketLabel: 'Total de Gols', odd: '1.92x' },
      { marketId: 'ambos-marcam', outcomeId: `yes-${index}`, label: 'Ambas marcam', marketLabel: 'Ambos Marcam', odd: '1.70x' },
      { marketId: 'escanteios', outcomeId: `corners-${index}`, label: 'Mais de 8.5', marketLabel: 'Total de Escanteios', odd: '1.86x' },
      { marketId: 'cartoes', outcomeId: `cards-${index}`, label: 'Mais de 4.5', marketLabel: 'Total de Cartões', odd: '1.95x' },
      { marketId: 'dupla-chance', outcomeId: `double-chance-${index}`, label: `${homeTeam} ou Empate`, marketLabel: 'Dupla Chance', odd: '1.45x' },
    ]
  const variant = variants[index % variants.length]

  return createBetslipSelection({
    eventId,
    marketId: `recomendado-${variant.marketId}-${index}`,
    outcomeId: variant.outcomeId,
    label: variant.label,
    odd: variant.odd,
    marketLabel: variant.marketLabel,
    eventStatus,
    selectionType: variant.label === homeTeam || variant.label === awayTeam ? 'team' : 'market',
    sport,
    homeTeam,
    awayTeam,
    eventName,
    eventTimeLabel,
    liveClock,
    createdAtMs: nowMs,
    homeScore: baseSelection?.homeScore,
    awayScore: baseSelection?.awayScore,
    homeTeamIcon,
    awayTeamIcon,
    selectionIcon: baseSelection?.selectionIcon ?? homeTeamIcon,
    badgeType: baseSelection?.badgeType ?? 'boost',
  })
}

const getRelatedRecommendations = (selections: BetslipSelection[]) => {
  const selectedIds = new Set(selections.map((selection) => selection.id))
  const selectedExactSignatures = new Set(selections.map(getSelectionExactSignature))
  const selectedMarketSignatures = new Set(selections.map(getSelectionMarketSignature))
  const recommendations: BetslipSelection[] = []
  const sourceSelections = selections.length > 0 ? selections : [undefined]
  const nowMs = Date.now()
  const addRecommendation = (recommendation: BetslipSelection | undefined) => {
    if (!recommendation) return
    if (selectedIds.has(recommendation.id)) return
    if (selectedExactSignatures.has(getSelectionExactSignature(recommendation))) return
    if (selectedMarketSignatures.has(getSelectionMarketSignature(recommendation))) return
    if (recommendations.some((item) => item.id === recommendation.id)) return
    if (recommendations.some((item) => getSelectionMarketSignature(item) === getSelectionMarketSignature(recommendation))) return

    recommendations.push(recommendation)
  }

  for (let index = 0; recommendations.length < 3 && index < 48; index += 1) {
    const recommendation = createRelatedRecommendation(sourceSelections[index % sourceSelections.length], index, nowMs)

    addRecommendation(recommendation)
  }

  for (let index = 0; recommendations.length < 3 && index < 12; index += 1) {
    addRecommendation(createRelatedRecommendation(undefined, index, nowMs))
  }

  return recommendations
}

function DeleteButton({ label, onClick }: { label: string; onClick?: () => void }) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onClick?.()
  }

  return (
    <button type="button" className="betslip-page__delete-button" aria-label={label} onClick={handleClick}>
      <XIcon aria-hidden="true" weight="bold" />
    </button>
  )
}

const getSelectionIconSrc = (selection: BetslipSelection) => {
  const selectionTitle = getSelectionTitle(selection)

  if (selection.selectionType === 'player') {
    return getBetslipPlayerImage(selection)
      ?? getPlayerAvatarFallbackSrc(selection)
      ?? selection.selectionIcon
      ?? getTeamIconSource(selection.homeTeam, selection.homeTeamIcon)
  }

  if (selection.selectionIcon) return selection.selectionIcon

  if (selection.homeTeam && selectionTitle === selection.homeTeam) {
    return getTeamIconSource(selection.homeTeam, selection.homeTeamIcon)
  }

  if (selection.awayTeam && selectionTitle === selection.awayTeam) {
    return getTeamIconSource(selection.awayTeam, selection.awayTeamIcon)
  }

  if (selection.homeTeam) return getTeamIconSource(selection.homeTeam, selection.homeTeamIcon)
  if (selection.awayTeam) return getTeamIconSource(selection.awayTeam, selection.awayTeamIcon)

  return ''
}

function SelectionIcon({
  selection,
  className,
}: {
  selection: BetslipSelection
  className: string
}) {
  const iconSrc = getSelectionIconSrc(selection)
  const playerClassName = selection.selectionType === 'player' ? ` ${className}--player` : ''

  if (!iconSrc) return <span className={`${className}${playerClassName}`} aria-hidden="true" />

  return (
    <img
      src={iconSrc}
      alt=""
      className={`${className} ${className}--image${playerClassName}`}
      aria-hidden="true"
    />
  )
}

function BoostBadge({
  ariaLabel,
  icon = false,
  onInfoOpen,
}: {
  ariaLabel?: string
  icon?: boolean
  onInfoOpen?: () => void
}) {
  if (onInfoOpen) {
    return (
      <button
        type="button"
        className={`betslip-page__boost-badge betslip-page__boost-badge--button betslip-page__boost-badge--${icon ? 'arrow' : 'plus'}`}
        aria-label={ariaLabel ?? 'Ver como funciona o Pagamento Antecipado'}
        onClick={(event) => {
          event.stopPropagation()
          onInfoOpen()
        }}
      >
        <img src={icon ? substituicaoGarantida : pagamentoAntecipado} alt="" />
      </button>
    )
  }

  return (
    <span
      className={`betslip-page__boost-badge betslip-page__boost-badge--${icon ? 'arrow' : 'plus'}`}
      aria-hidden="true"
    >
      <img src={icon ? substituicaoGarantida : pagamentoAntecipado} alt="" />
    </span>
  )
}

function TurboSelectionBadge({ onInfoOpen }: { onInfoOpen?: () => void }) {
  if (onInfoOpen) {
    return (
      <button
        type="button"
        className="betslip-page__turbo-selection-badge betslip-page__turbo-selection-badge--button"
        aria-label="Ver como funciona a Múltipla Turbinada"
        onClick={(event) => {
          event.stopPropagation()
          onInfoOpen()
        }}
      >
        <img src={multiplaTurbinadaIcon} alt="" />
      </button>
    )
  }

  return (
    <span className="betslip-page__turbo-selection-badge" aria-hidden="true">
      <img src={multiplaTurbinadaIcon} alt="" />
    </span>
  )
}

function OfferAdvantageBadge({
  icon,
  label,
}: {
  icon: string
  label: string
}) {
  return (
    <span className="betslip-page__offer-advantage-badge" aria-label={label}>
      <img src={icon} alt="" />
    </span>
  )
}

function SelectionBadge({
  benefitItems,
  selection,
  showTurbo = true,
  onBenefitsInfoOpen,
  onEarlyPayoutInfoOpen,
  onTurboInfoOpen,
}: {
  benefitItems?: BetslipBenefitSheetItem[]
  selection: BetslipSelection
  showTurbo?: boolean
  onBenefitsInfoOpen?: (
    items: BetslipBenefitSheetItem[],
    initialItemId?: BetslipBenefitSheetItem['id']
  ) => void
  onEarlyPayoutInfoOpen?: (sport: PagamentoAntecipadoSport) => void
  onTurboInfoOpen?: () => void
}) {
  let secondaryBadge: ReactNode = null
  const offerAdvantage = getSelectionOfferAdvantage(selection)

  if (offerAdvantage) {
    return (
      <span className="betslip-page__selection-badges">
        <OfferAdvantageBadge icon={offerAdvantage.icon} label={offerAdvantage.label} />
      </span>
    )
  }

  const secondaryBenefit = getSelectionSecondaryBenefitItem(selection)
  const visibleBenefitItems = benefitItems ?? getSelectionBenefitItems(selection, betslipTurboMinSelectionCount, showTurbo)
  const hasTurboBenefit = visibleBenefitItems.some((item) => item.id === 'turbo')
  const hasBenefitSlider = visibleBenefitItems.length > 1 && !!onBenefitsInfoOpen
  const openBenefitSlider = (initialItemId: BetslipBenefitSheetItem['id']) => {
    if (!onBenefitsInfoOpen) return false

    onBenefitsInfoOpen(visibleBenefitItems, initialItemId)
    return true
  }
  const handleTurboInfoOpen = showTurbo && hasTurboBenefit
    ? () => {
        if (hasBenefitSlider) {
          openBenefitSlider('turbo')
          return
        }

        onTurboInfoOpen?.()
      }
    : undefined
  const canOpenSecondaryBenefit = Boolean(
    secondaryBenefit
    && (
      hasBenefitSlider
      || (secondaryBenefit.id === 'early-payout' && onEarlyPayoutInfoOpen)
      || (secondaryBenefit.id === 'substitution' && onBenefitsInfoOpen)
    )
  )
  const handleSecondaryInfoOpen = secondaryBenefit && canOpenSecondaryBenefit
    ? () => {
        if (hasBenefitSlider) {
          openBenefitSlider(secondaryBenefit.id)
          return
        }

        if (secondaryBenefit.id === 'early-payout') {
          onEarlyPayoutInfoOpen?.(secondaryBenefit.sport ?? 'futebol')
          return
        }

        if (secondaryBenefit.id === 'substitution') {
          openBenefitSlider('substitution')
        }
      }
    : undefined

  if (secondaryBenefit?.id === 'substitution') {
    secondaryBadge = (
      <BoostBadge
        ariaLabel="Ver como funciona a Substituição Protegida"
        icon
        onInfoOpen={handleSecondaryInfoOpen}
      />
    )
  } else if (secondaryBenefit?.id === 'early-payout') {
    secondaryBadge = (
      <BoostBadge
        ariaLabel="Ver como funciona o Pagamento Antecipado"
        onInfoOpen={handleSecondaryInfoOpen}
      />
    )
  }

  if (!hasTurboBenefit && !secondaryBadge) return null
  const hasInteractiveBadge = (hasTurboBenefit && !!handleTurboInfoOpen) || !!handleSecondaryInfoOpen

  return (
    <span className="betslip-page__selection-badges" aria-hidden={hasInteractiveBadge ? undefined : true}>
      {hasTurboBenefit ? <TurboSelectionBadge onInfoOpen={handleTurboInfoOpen} /> : null}
      {secondaryBadge}
    </span>
  )
}

function AnimatedFooterValue({
  targetValue,
  formatValue = formatCurrency,
}: {
  targetValue: number
  formatValue?: (value: number) => string
}) {
  const valueRef = useRef<HTMLElement>(null)
  const [initialValue] = useState(targetValue)
  const displayedValue = useRef(targetValue)

  useEffect(() => {
    let frameId: number | null = null
    const startValue = displayedValue.current
    const difference = targetValue - startValue

    const setValue = (value: number) => {
      displayedValue.current = value

      if (valueRef.current) {
        valueRef.current.textContent = formatValue(value)
      }
    }

    if (Math.abs(difference) < 0.005) {
      frameId = window.requestAnimationFrame(() => setValue(targetValue))

      return () => {
        if (frameId !== null) window.cancelAnimationFrame(frameId)
      }
    }

    const startedAt = performance.now()

    const tick = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startedAt) / animatedFooterValueDurationMs)
      const easedProgress = easeOutCubic(progress)
      const jitter = progress < 0.72
        ? Math.sin(progress * Math.PI * 18) * difference * 0.012
        : 0
      const nextValue = startValue + difference * easedProgress + jitter

      setValue(progress >= 1 ? targetValue : nextValue)

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick)
      }
    }

    frameId = window.requestAnimationFrame(tick)

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)
    }
  }, [formatValue, targetValue])

  return (
    <strong ref={valueRef} className="betslip-page__footer-value--rolling">
      {formatValue(initialValue)}
    </strong>
  )
}

interface BetslipTurboBannerProps {
  bonusCents: number
  bonusPercent: number | null
  hasTurboSelectionBadge: boolean
  isBlockedByPromotion: boolean
  nextBonusPercent: number | null
  onInfoOpen: () => void
  pechinchaRuleMessage?: string
  selectionCount: number
}

function BetslipTurboBanner({
  bonusCents,
  bonusPercent,
  hasTurboSelectionBadge,
  isBlockedByPromotion,
  nextBonusPercent,
  onInfoOpen,
  pechinchaRuleMessage,
  selectionCount,
}: BetslipTurboBannerProps) {
  if (pechinchaRuleMessage) {
    return (
      <div className="betslip-page__turbo-banner-shell">
        <div
          className="betslip-page__turbo-banner betslip-page__turbo-banner--promo-blocked"
          role="status"
        >
          <WarningCircleIcon aria-hidden="true" weight="bold" />
          <span>{pechinchaRuleMessage}</span>
        </div>
      </div>
    )
  }

  if (selectionCount <= 0) return null

  if (isBlockedByPromotion) {
    if (selectionCount < betslipTurboMinSelectionCount || !hasTurboSelectionBadge) return null

    return (
      <div className="betslip-page__turbo-banner-shell">
        <div
          className="betslip-page__turbo-banner betslip-page__turbo-banner--promo-blocked"
          role="status"
        >
          <WarningCircleIcon aria-hidden="true" weight="bold" />
          <span>Apostas com Pechincha ou Aumentadas não acumulam com Múltipla Turbinada.</span>
        </div>
      </div>
    )
  }

  const isActive = bonusPercent !== null

  if (!isActive) {
    const missingSelectionCount = Math.max(0, betslipTurboMinSelectionCount - selectionCount)
    const missingSelectionLabel = missingSelectionCount === 1
      ? '+1 seleção elegível'
      : `+${missingSelectionCount} seleções elegíveis`
    const missingSelectionAriaLabel = missingSelectionCount === 1
      ? 'Falta 1 seleção elegível para desbloquear 5 por cento de Múltipla Turbinada.'
      : `Faltam ${missingSelectionCount} seleções elegíveis para desbloquear 5 por cento de Múltipla Turbinada.`

    return (
      <div className="betslip-page__turbo-banner-shell">
        <button
          type="button"
          className="betslip-page__turbo-banner betslip-page__turbo-banner--locked"
          aria-label={missingSelectionAriaLabel}
          onClick={onInfoOpen}
        >
          <img className="betslip-page__turbo-banner-icon" src={iconMultiplaGde} alt="" aria-hidden="true" />
          <div className="betslip-page__turbo-banner-copy">
            <span>Adicione {missingSelectionLabel} para desbloquear</span>
            <strong className="betslip-page__turbo-banner-gradient">5% Múltipla Turbinada</strong>
          </div>
        </button>
      </div>
    )
  }

  const hasNextBonus = nextBonusPercent !== null && nextBonusPercent > bonusPercent
  const nextBonusLabel = hasNextBonus
    ? `Adicione +1 seleção para ${nextBonusPercent}%`
    : 'Bônus máximo liberado'

  return (
    <div className="betslip-page__turbo-banner-shell">
      <button
        type="button"
        className="betslip-page__turbo-banner betslip-page__turbo-banner--active"
        aria-label={`Múltipla Turbinada liberada com ${bonusPercent} por cento. Bônus de ${formatCurrency(bonusCents)} no valor para ganhar.`}
        onClick={onInfoOpen}
      >
        <img className="betslip-page__turbo-banner-icon" src={iconMultiplaGde} alt="" aria-hidden="true" />
        <div className="betslip-page__turbo-banner-copy">
          <strong className="betslip-page__turbo-banner-gradient">Liberado {bonusPercent}% Múltipla Turbinada</strong>
          <span>{nextBonusLabel}</span>
        </div>
        <strong className="betslip-page__turbo-banner-bonus">+{formatCurrency(bonusCents)}</strong>
      </button>
    </div>
  )
}

interface BetslipCardStakeControlsProps {
  isActive: boolean
  isStakeKeyboardOpen: boolean
  potentialWinCents: number
  stakeCents: number
  stakeLimitCents: number
  onStakeChange: (updater: StakeCentsUpdater) => void
  onStakeInputOpen: () => void
  onStakeInputToggle: () => void
}

function BetslipCardStakeControls({
  isActive,
  isStakeKeyboardOpen,
  potentialWinCents,
  stakeCents,
  stakeLimitCents,
  onStakeChange,
  onStakeInputOpen,
  onStakeInputToggle,
}: BetslipCardStakeControlsProps) {
  const handleQuickStake = (amountCents: number) => {
    onStakeChange((current) => {
      const nextValue = Math.min(current + amountCents, stakeLimitCents)

      return nextValue === current ? current : nextValue
    })
  }

  const handleMaxStake = () => {
    onStakeChange((current) => (current === stakeLimitCents ? current : stakeLimitCents))
  }

  const triggerQuickStakeFeedback = (button: HTMLButtonElement) => {
    button.classList.remove(quickStakeFeedbackClassName)
    void button.offsetWidth
    button.classList.add(quickStakeFeedbackClassName)
  }

  const handleQuickStakePointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    amountCents: number
  ) => {
    event.preventDefault()
    triggerQuickStakeFeedback(event.currentTarget)
    handleQuickStake(amountCents)
  }

  const handleQuickStakeClick = (
    event: MouseEvent<HTMLButtonElement>,
    amountCents: number
  ) => {
    if (event.detail !== 0) return

    triggerQuickStakeFeedback(event.currentTarget)
    handleQuickStake(amountCents)
  }

  const handleMaxStakePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    triggerQuickStakeFeedback(event.currentTarget)
    handleMaxStake()
  }

  const handleMaxStakeClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0) return

    triggerQuickStakeFeedback(event.currentTarget)
    handleMaxStake()
  }

  const handleQuickStakeAnimationEnd = (event: AnimationEvent<HTMLButtonElement>) => {
    if (event.animationName === 'betslipQuickStakeFeedback') {
      event.currentTarget.classList.remove(quickStakeFeedbackClassName)
    }
  }

  return (
    <div className="betslip-page-card__stake-panel" onClick={(event) => event.stopPropagation()}>
      <div className="betslip-page-card__stake-row" aria-label="Valor da aposta">
        <div className="betslip-page__quick-stakes betslip-page-card__quick-stakes">
          {[
            { label: '+10', amountCents: 1000 },
            { label: '+50', amountCents: 5000 },
            { label: '+100', amountCents: 10000 },
          ].map((stake) => (
            <button
              key={stake.label}
              type="button"
              className="betslip-page__quick-stake betslip-page-card__quick-stake"
              onPointerDown={(event) => handleQuickStakePointerDown(event, stake.amountCents)}
              onClick={(event) => handleQuickStakeClick(event, stake.amountCents)}
              onAnimationEnd={handleQuickStakeAnimationEnd}
            >
              {stake.label}
            </button>
          ))}
          <button
            type="button"
            className="betslip-page__quick-stake betslip-page-card__quick-stake"
            onPointerDown={handleMaxStakePointerDown}
            onClick={handleMaxStakeClick}
            onAnimationEnd={handleQuickStakeAnimationEnd}
          >
            Max
          </button>
        </div>

        <label
          className={[
            'betslip-page__stake-input',
            'betslip-page-card__stake-input',
            isActive && isStakeKeyboardOpen ? 'betslip-page__stake-input--active' : '',
          ].filter(Boolean).join(' ')}
          onPointerDown={(event) => {
            event.preventDefault()
            onStakeInputToggle()
          }}
        >
          <span>R$</span>
          <input
            type="text"
            value={formatStakeInput(stakeCents)}
            inputMode="decimal"
            aria-label="Valor apostado"
            aria-expanded={isActive && isStakeKeyboardOpen}
            aria-controls="betslip-stake-keyboard"
            onFocus={onStakeInputOpen}
            readOnly
          />
        </label>
      </div>

      <div className="betslip-page-card__return-row">
        <span>Para Ganhar</span>
        <strong>{formatCurrency(potentialWinCents)}</strong>
      </div>
    </div>
  )
}

interface BetslipFooterProps {
  activeStakeCents: number
  betMode: BetMode
  isPechinchaRuleBlocked: boolean
  isStakeKeyboardOpen: boolean
  isSubmitting: boolean
  potentialWinCents: number
  stakeCents: number
  stakeLimitCents: number
  totalOdds: number
  useBetCredit: boolean
  onActiveStakeCentsChange: (updater: StakeCentsUpdater) => void
  onBetCreditToggle: () => void
  onConfirm: (stakeCents: number, potentialWinCents: number) => void
  onStakeKeyboardOpenChange: (isOpen: boolean) => void
}

interface DragConfirmButtonProps {
  isDisabled: boolean
  isSubmitting: boolean
  potentialWinCents: number
  stakeCents: number
  onConfirm: (stakeCents: number, potentialWinCents: number) => void
}

const clampConfirmProgress = (progress: number) => Math.max(0, Math.min(progress, 1))

const getConfirmInnerWidth = (trackWidth: number) => (
  Math.max(
    betslipConfirmKnobSizePx,
    trackWidth - betslipConfirmTrackPaddingPx * 2
  )
)

const getConfirmFillWidth = (trackWidth: number, progress: number) => {
  const innerWidth = getConfirmInnerWidth(trackWidth)

  return betslipConfirmKnobSizePx + (
    innerWidth - betslipConfirmKnobSizePx
  ) * clampConfirmProgress(progress)
}

const getConfirmFillRatio = (trackWidth: number, progress: number) => (
  getConfirmFillWidth(trackWidth, progress) / getConfirmInnerWidth(trackWidth)
)

function DragConfirmButton({
  isDisabled,
  isSubmitting,
  potentialWinCents,
  stakeCents,
  onConfirm,
}: DragConfirmButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dragStartXRef = useRef(0)
  const dragStartProgressRef = useRef(0)
  const dragProgressRef = useRef(0)
  const completeTimerRef = useRef<number | null>(null)
  const [trackWidth, setTrackWidth] = useState(0)
  const [dragProgress, setDragProgress] = useState(0)
  const [isDraggingConfirm, setIsDraggingConfirm] = useState(false)
  const [isCompletingDrag, setIsCompletingDrag] = useState(false)
  const [hasCompletedDrag, setHasCompletedDrag] = useState(false)
  const [isLoadingVisible, setIsLoadingVisible] = useState(false)
  const isCompleteState = hasCompletedDrag || isSubmitting
  const isInteractionDisabled = isDisabled || isCompletingDrag || hasCompletedDrag
  const confirmLabel = `Desliza para apostar ${formatConfirmCurrency(stakeCents)}`
  const fillWidth = getConfirmFillWidth(trackWidth, isCompleteState ? 1 : dragProgress)
  const confirmButtonStyle = {
    '--betslip-confirm-fill-width': `${fillWidth}px`,
  } as CSSProperties

  const setVisualProgress = useCallback((nextProgress: number) => {
    const clampedProgress = clampConfirmProgress(nextProgress)

    dragProgressRef.current = clampedProgress
    setDragProgress(clampedProgress)
  }, [])

  const clearCompleteTimer = useCallback(() => {
    if (completeTimerRef.current === null) return

    window.clearTimeout(completeTimerRef.current)
    completeTimerRef.current = null
  }, [])

  const getMaxDragTravel = useCallback(() => {
    const buttonEl = buttonRef.current
    if (!buttonEl) return 1

    const trackRect = buttonEl.getBoundingClientRect()
    const innerWidth = getConfirmInnerWidth(trackRect.width)

    return Math.max(1, innerWidth - betslipConfirmKnobSizePx)
  }, [])

  const completeConfirm = useCallback(() => {
    if (isInteractionDisabled) return

    clearCompleteTimer()
    setIsDraggingConfirm(false)
    setHasCompletedDrag(true)
    setIsCompletingDrag(true)
    setIsLoadingVisible(false)
    setVisualProgress(1)

    completeTimerRef.current = window.setTimeout(() => {
      completeTimerRef.current = null
      setIsCompletingDrag(false)
      setIsLoadingVisible(true)
      onConfirm(stakeCents, potentialWinCents)
    }, betslipConfirmCompleteAnimationMs)
  }, [
    clearCompleteTimer,
    isInteractionDisabled,
    onConfirm,
    potentialWinCents,
    setVisualProgress,
    stakeCents,
  ])

  useLayoutEffect(() => {
    const buttonEl = buttonRef.current
    if (!buttonEl) return undefined

    const updateTrackWidth = () => {
      const nextTrackWidth = buttonEl.getBoundingClientRect().width

      setTrackWidth((currentTrackWidth) => (
        currentTrackWidth === nextTrackWidth ? currentTrackWidth : nextTrackWidth
      ))
    }

    updateTrackWidth()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateTrackWidth)

      return () => window.removeEventListener('resize', updateTrackWidth)
    }

    const resizeObserver = new ResizeObserver(updateTrackWidth)
    resizeObserver.observe(buttonEl)

    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => () => {
    clearCompleteTimer()
  }, [clearCompleteTimer])

  useEffect(() => {
    if (!isSubmitting && !isDisabled) return undefined

    const frameId = window.requestAnimationFrame(() => {
      if (isSubmitting) {
        setHasCompletedDrag(true)
        setIsCompletingDrag(false)
        setIsLoadingVisible(true)
        setVisualProgress(1)
        return
      }

      clearCompleteTimer()
      setHasCompletedDrag(false)
      setIsCompletingDrag(false)
      setIsDraggingConfirm(false)
      setIsLoadingVisible(false)
      setVisualProgress(0)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [clearCompleteTimer, isDisabled, isSubmitting, setVisualProgress])

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (isInteractionDisabled || event.button !== 0) return

    event.preventDefault()
    clearCompleteTimer()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartXRef.current = event.clientX
    dragStartProgressRef.current = dragProgressRef.current
    setIsCompletingDrag(false)
    setIsDraggingConfirm(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingConfirm || isInteractionDisabled) return

    event.preventDefault()
    const dragDelta = event.clientX - dragStartXRef.current
    const nextProgress = dragStartProgressRef.current + dragDelta / getMaxDragTravel()

    setVisualProgress(nextProgress)
  }

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingConfirm) return

    event.preventDefault()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    setIsDraggingConfirm(false)

    const currentTrackWidth = event.currentTarget.getBoundingClientRect().width
    const filledRatio = getConfirmFillRatio(currentTrackWidth, dragProgressRef.current)

    if (filledRatio >= betslipConfirmDragThreshold) {
      completeConfirm()
      return
    }

    setVisualProgress(0)
  }

  const handlePointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingConfirm) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    setIsDraggingConfirm(false)
    setVisualProgress(0)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['Enter', ' '].includes(event.key)) return

    event.preventDefault()
    completeConfirm()
  }

  return (
    <button
      type="button"
      ref={buttonRef}
      className={[
        'betslip-page__confirm-button',
        isDraggingConfirm ? 'betslip-page__confirm-button--dragging' : '',
        isLoadingVisible || isSubmitting ? 'betslip-page__confirm-button--loading' : '',
        hasCompletedDrag || isCompletingDrag || isSubmitting ? 'betslip-page__confirm-button--complete' : '',
        isDisabled && !isSubmitting ? 'betslip-page__confirm-button--disabled' : '',
      ].filter(Boolean).join(' ')}
      style={confirmButtonStyle}
      aria-busy={isLoadingVisible || isSubmitting}
      aria-label={confirmLabel}
      disabled={isInteractionDisabled}
      onKeyDown={handleKeyDown}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <span className="betslip-page__confirm-label">{confirmLabel}</span>
      <span className="betslip-page__confirm-fill" aria-hidden="true">
        <CaretRightIcon className="betslip-page__confirm-icon" weight="bold" />
      </span>
      <span className="betslip-page__confirm-spinner-wrap" aria-hidden="true">
        <span className="betslip-page__confirm-spinner" />
      </span>
    </button>
  )
}

function BetslipFooter({
  activeStakeCents,
  betMode,
  isPechinchaRuleBlocked,
  isStakeKeyboardOpen,
  isSubmitting,
  potentialWinCents,
  stakeCents,
  stakeLimitCents,
  totalOdds,
  useBetCredit,
  onActiveStakeCentsChange,
  onBetCreditToggle,
  onConfirm,
  onStakeKeyboardOpenChange,
}: BetslipFooterProps) {
  const stakeInputValue = formatStakeInput(activeStakeCents)
  const isStakeEmpty = stakeCents <= 0
  const isConfirmDisabled = isSubmitting || isStakeEmpty || isPechinchaRuleBlocked
  const isSimpleMode = betMode === 'simple'

  const openStakeKeyboard = () => {
    if (!isStakeKeyboardOpen) onStakeKeyboardOpenChange(true)
  }
  const toggleStakeKeyboard = () => onStakeKeyboardOpenChange(!isStakeKeyboardOpen)

  const handleQuickStake = (amountCents: number) => {
    onActiveStakeCentsChange((current) => {
      const nextValue = Math.min(current + amountCents, stakeLimitCents)

      return nextValue === current ? current : nextValue
    })
  }

  const handleMaxStake = () => {
    onActiveStakeCentsChange((current) => (current === stakeLimitCents ? current : stakeLimitCents))
  }

  const triggerQuickStakeFeedback = (button: HTMLButtonElement) => {
    button.classList.remove(quickStakeFeedbackClassName)
    void button.offsetWidth
    button.classList.add(quickStakeFeedbackClassName)
  }

  const handleKeyboardKey = (key: StakeKeyboardKey) => {
    if (key === 'ok') {
      if (isStakeKeyboardOpen) onStakeKeyboardOpenChange(false)
      return
    }

    openStakeKeyboard()

    if (key === 'backspace') {
      onActiveStakeCentsChange((current) => {
        const nextValue = Math.floor(current / 10)

        return nextValue === current ? current : nextValue
      })
      return
    }

    onActiveStakeCentsChange((current) => {
      const nextDigits = `${current}${key}`.replace(/^0+(?=\d)/, '')
      const nextValue = Math.min(Number(nextDigits), stakeLimitCents)

      return nextValue === current ? current : nextValue
    })
  }

  const handleQuickStakePointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    amountCents: number
  ) => {
    event.preventDefault()
    triggerQuickStakeFeedback(event.currentTarget)
    handleQuickStake(amountCents)
  }

  const handleQuickStakeClick = (
    event: MouseEvent<HTMLButtonElement>,
    amountCents: number
  ) => {
    if (event.detail !== 0) return

    triggerQuickStakeFeedback(event.currentTarget)
    handleQuickStake(amountCents)
  }

  const handleMaxStakePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    triggerQuickStakeFeedback(event.currentTarget)
    handleMaxStake()
  }

  const handleMaxStakeClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0) return

    triggerQuickStakeFeedback(event.currentTarget)
    handleMaxStake()
  }

  const handleQuickStakeAnimationEnd = (event: AnimationEvent<HTMLButtonElement>) => {
    if (event.animationName === 'betslipQuickStakeFeedback') {
      event.currentTarget.classList.remove(quickStakeFeedbackClassName)
    }
  }

  const handleKeyboardPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    key: StakeKeyboardKey
  ) => {
    event.preventDefault()
    handleKeyboardKey(key)
  }

  const handleKeyboardClick = (
    event: MouseEvent<HTMLButtonElement>,
    key: StakeKeyboardKey
  ) => {
    if (event.detail === 0) handleKeyboardKey(key)
  }

  return (
    <footer
      className={`betslip-page__footer${isSimpleMode ? ' betslip-page__footer--simple' : ''}`}
      aria-label="Resumo da aposta"
    >
      <div className="betslip-page__footer-summary" aria-label="Resumo dos valores">
        <div className="betslip-page__footer-summary-left">
          {!isSimpleMode ? (
            <div className="betslip-page__footer-summary-item">
              <span>Total Odds</span>
              <AnimatedFooterValue targetValue={totalOdds} formatValue={formatOddsLabel} />
            </div>
          ) : null}
          <div className="betslip-page__footer-summary-item">
            <span>Aposta</span>
            <AnimatedFooterValue targetValue={stakeCents} />
          </div>
        </div>
        <div className="betslip-page__footer-summary-right">
          <div className="betslip-page__footer-summary-item betslip-page__footer-summary-item--highlight">
            <span>Para Ganhar</span>
            <AnimatedFooterValue targetValue={potentialWinCents} />
          </div>
        </div>
      </div>

      {!isSimpleMode ? (
        <div className="betslip-page__stake-row" aria-label="Valor da aposta">
          <div className="betslip-page__quick-stakes">
            {[
              { label: '+10', amountCents: 1000 },
              { label: '+50', amountCents: 5000 },
              { label: '+100', amountCents: 10000 },
            ].map((stake) => (
              <button
                key={stake.label}
                type="button"
                className="betslip-page__quick-stake"
                onPointerDown={(event) => handleQuickStakePointerDown(event, stake.amountCents)}
                onClick={(event) => handleQuickStakeClick(event, stake.amountCents)}
                onAnimationEnd={handleQuickStakeAnimationEnd}
              >
                {stake.label}
              </button>
            ))}
            <button
              type="button"
              className="betslip-page__quick-stake"
              onPointerDown={handleMaxStakePointerDown}
              onClick={handleMaxStakeClick}
              onAnimationEnd={handleQuickStakeAnimationEnd}
            >
              Max
            </button>
          </div>

          <label
            className={`betslip-page__stake-input${isStakeKeyboardOpen ? ' betslip-page__stake-input--active' : ''}`}
            onPointerDown={(event) => {
              event.preventDefault()
              toggleStakeKeyboard()
            }}
          >
            <span>R$</span>
            <input
              type="text"
              value={stakeInputValue}
              inputMode="decimal"
              aria-label="Valor apostado"
              aria-expanded={isStakeKeyboardOpen}
              aria-controls="betslip-stake-keyboard"
              onFocus={() => {
                if (!isStakeKeyboardOpen) openStakeKeyboard()
              }}
              readOnly
            />
          </label>
        </div>
      ) : null}

      <StakeKeyboard
        id="betslip-stake-keyboard"
        isOpen={isStakeKeyboardOpen}
        onKeyPointerDown={handleKeyboardPointerDown}
        onKeyClick={handleKeyboardClick}
      />

      <div className="betslip-page__credit-row">
        <button
          type="button"
          role="switch"
          className={`betslip-page__credit-toggle${useBetCredit ? ' betslip-page__credit-toggle--active' : ''}`}
          aria-label="Usar crédito de aposta"
          aria-checked={useBetCredit}
          onClick={onBetCreditToggle}
        >
          <span aria-hidden="true" />
        </button>
        <div className="betslip-page__credit-copy">
          <strong>Usar crédito de aposta: R$ 20,00</strong>
          <span>*Rendem apenas o lucro.</span>
        </div>
      </div>

      <DragConfirmButton
        isDisabled={isConfirmDisabled}
        isSubmitting={isSubmitting}
        potentialWinCents={potentialWinCents}
        stakeCents={stakeCents}
        onConfirm={onConfirm}
      />
    </footer>
  )
}

function BetslipSuccessSheet({
  summary,
  isLeaving,
}: {
  summary: BetslipSuccessSummary
  isLeaving: boolean
}) {
  const hasFiredConfettiRef = useRef(false)
  const selectionItems = summary.selectionItems?.length
    ? summary.selectionItems
    : [{
        id: 'summary-selection',
        title: summary.selectionTitle,
        subtitle: summary.selectionSubtitle,
        oddLabel: summary.totalOddsLabel,
      }]
  const visibleSelectionItems = selectionItems.slice(0, 2)
  const hiddenSelectionCount = Math.max(0, selectionItems.length - visibleSelectionItems.length)
  const hasMultipleSelectionItems = selectionItems.length > 1
  const hasHiddenSelectionItems = hiddenSelectionCount > 0

  useEffect(() => {
    if (hasFiredConfettiRef.current) {
      return
    }

    hasFiredConfettiRef.current = true
    fireBetslipSuccessConfetti()
  }, [])

  return (
    <section
      className={[
        'betslip-success-sheet',
        isLeaving ? 'betslip-success-sheet--leaving' : '',
        hasMultipleSelectionItems ? 'betslip-success-sheet--multi-selection' : '',
        hasHiddenSelectionItems ? 'betslip-success-sheet--has-hidden-selections' : '',
      ].filter(Boolean).join(' ')}
      aria-label="Aposta feita com sucesso"
    >
      <header className="betslip-success-sheet__header">
        <div className="betslip-success-sheet__title-group">
          <span className="betslip-success-sheet__status-icon" aria-hidden="true">
            <CheckIcon weight="bold" />
          </span>
          <h2>Aposta feita!</h2>
        </div>

        <button type="button" className="betslip-success-sheet__view-button">
          <span>Ver Aposta</span>
          <CaretRightIcon aria-hidden="true" weight="bold" />
        </button>
      </header>

      <div
        className={[
          'betslip-success-sheet__selection-list',
          hasMultipleSelectionItems ? 'betslip-success-sheet__selection-list--stacked' : '',
          hasHiddenSelectionItems ? 'betslip-success-sheet__selection-list--fade' : '',
        ].filter(Boolean).join(' ')}
      >
        {visibleSelectionItems.map((item, index) => {
          return (
            <div
              className="betslip-success-sheet__selection"
              key={`${item.id}:${index}`}
            >
              <div className="betslip-success-sheet__selection-copy">
                <strong className="betslip-success-sheet__selection-title">{item.title}</strong>
                {item.selectionLabel && item.marketLabel ? (
                  <div className="betslip-success-sheet__selection-detail">
                    <span className="betslip-success-sheet__selection-detail-value">{item.selectionLabel}</span>
                    <span className="betslip-success-sheet__selection-detail-dot" aria-hidden="true" />
                    <span className="betslip-success-sheet__selection-detail-market">{item.marketLabel}</span>
                  </div>
                ) : (
                  <span className="betslip-success-sheet__selection-subtitle">{item.subtitle}</span>
                )}
              </div>

              <div
                className="betslip-success-sheet__selection-meta"
              >
                <strong className="betslip-success-sheet__odd">{item.oddLabel}</strong>
              </div>
            </div>
          )
        })}
      </div>

      {hasHiddenSelectionItems ? (
        <span className="betslip-success-sheet__more-tag">e mais {hiddenSelectionCount}</span>
      ) : null}

      <div className="betslip-success-sheet__values">
        <div className="betslip-success-sheet__value-list">
          <div className="betslip-success-sheet__value">
            <span>Valor apostado</span>
            <strong>{formatCurrency(summary.stakeCents)}</strong>
          </div>
          <div className="betslip-success-sheet__value">
            <span>Para Ganhar</span>
            <strong>{formatCurrency(summary.potentialWinCents)}</strong>
          </div>
        </div>

        <div className="betslip-success-sheet__actions" aria-label="Ações da aposta">
          <button type="button" aria-label="Comprovante da aposta">
            <FileTextIcon aria-hidden="true" weight="regular" />
          </button>
          <button type="button" aria-label="Compartilhar aposta">
            <ShareIcon aria-hidden="true" weight="regular" />
          </button>
        </div>
      </div>

      <div className="betslip-success-sheet__timer" aria-hidden="true" />
    </section>
  )
}

export function BetslipPage({
  isCoveredByEvent = false,
  onClose,
  onSelectionsEmptyExitStart,
}: BetslipPageProps) {
  const {
    selections,
    summary,
    addSelection,
    removeSelection,
    clearSelections,
  } = useBetslip()
  const [isDragging, setIsDragging] = useState(false)
  const [isStakeKeyboardOpen, setIsStakeKeyboardOpen] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isBetslipLeaving, setIsBetslipLeaving] = useState(false)
  const [isTurboInfoOpen, setIsTurboInfoOpen] = useState(false)
  const [earlyPayoutInfoSport, setEarlyPayoutInfoSport] = useState<PagamentoAntecipadoSport>('futebol')
  const [isEarlyPayoutInfoOpen, setIsEarlyPayoutInfoOpen] = useState(false)
  const [benefitInfoSheet, setBenefitInfoSheet] = useState<{
    initialItemId?: BetslipBenefitSheetItem['id']
    items: BetslipBenefitSheetItem[]
  } | null>(null)
  const [hasCompletedEnterAnimation, setHasCompletedEnterAnimation] = useState(false)
  const [selectedBetMode, setSelectedBetMode] = useState<BetMode>('multiple')
  const [useBetCredit, setUseBetCredit] = useState(false)
  const [multipleStakeCents, setMultipleStakeCents] = useState(DEFAULT_BETSLIP_STAKE_CENTS)
  const [simpleStakeCentsByGroupId, setSimpleStakeCentsByGroupId] = useState<Record<string, number>>({})
  const [stakeTarget, setStakeTarget] = useState<StakeTarget>({ type: 'multiple' })
  const [showSuccessSheet, setShowSuccessSheet] = useState(false)
  const [isSuccessSheetLeaving, setIsSuccessSheetLeaving] = useState(false)
  const [successSummary, setSuccessSummary] = useState<BetslipSuccessSummary | null>(null)
  const [addedSelectionId, setAddedSelectionId] = useState<string | null>(null)
  const [removingCardId, setRemovingCardId] = useState<string | null>(null)
  const [removingBuilderLegId, setRemovingBuilderLegId] = useState<string | null>(null)
  const [updatedGroupId, setUpdatedGroupId] = useState<string | null>(null)
  const [liveClockNowMs, setLiveClockNowMs] = useState(() => Date.now())
  const contentScrollRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const tabsTrackRef = useRef<HTMLDivElement>(null)
  const tabIndicatorRef = useRef<HTMLSpanElement>(null)
  const tabIndicatorReadyRef = useRef(false)
  const tabIndicatorAnimationRef = useRef<Animation | null>(null)
  const tabButtonRefs = useRef<Record<BetMode, HTMLButtonElement | null>>({
    multiple: null,
    simple: null,
  })
  const confirmTimerRef = useRef<number | null>(null)
  const successTimerRef = useRef<number | null>(null)
  const successAutoDismissTimerRef = useRef<number | null>(null)
  const successExitTimerRef = useRef<number | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const cardRemoveTimerRef = useRef<number | null>(null)
  const builderLegRemoveTimerRef = useRef<number | null>(null)
  const cardUpdateTimerRef = useRef<number | null>(null)
  const emptyBetslipCloseTimerRef = useRef<number | null>(null)
  const startX = useRef(0)
  const scrollLeft = useRef(0)
  const hadSelectionsRef = useRef(selections.length > 0)

  useEffect(() => {
    if (hasCompletedEnterAnimation) return undefined

    const timer = window.setTimeout(() => {
      setHasCompletedEnterAnimation(true)
    }, isCoveredByEvent ? 0 : betslipPageEnterDurationMs)

    return () => window.clearTimeout(timer)
  }, [hasCompletedEnterAnimation, isCoveredByEvent])

  const selectionGroups = useMemo(() => groupSelectionsByEvent(selections), [selections])
  const recommendations = useMemo(() => getRelatedRecommendations(selections), [selections])
  const hasLiveSelections = selections.some((selection) => selection.eventStatus === 'live')
  const totalSelectionCount = summary.selectionCount
  const isTurboBlockedByPromotion = hasBetslipTurboBlockedByPromotionSelection(selections)
  const turboEligibleSelectionCount = getBetslipTurboEligibleSelectionCountIgnoringPromotions(selections)
  const effectiveTurboEligibleSelectionCount = isTurboBlockedByPromotion ? 0 : turboEligibleSelectionCount
  const hasTurboSelectionBadge = selectionGroups.some((group) => {
    if (group.selections.length > 1) {
      return getSelectionGroupBenefitItems(group, turboEligibleSelectionCount, true)
        .some((item) => item.id === 'turbo')
    }

    const selection = group.selections[0]
    if (!selection) return false

    return getSelectionBenefitItems(selection, turboEligibleSelectionCount, true)
      .some((item) => item.id === 'turbo')
  })
  const isSingleBetMode = selectionGroups.length < 2
  const isMultipleTabDisabled = selectionGroups.length < 2
  const activeBetMode: BetMode = isSingleBetMode ? 'simple' : selectedBetMode
  const isSplitSimpleMode = activeBetMode === 'simple' && selectionGroups.length >= 2
  const stakeLimitCents = useBetCredit ? BET_CREDIT_CENTS : WALLET_STAKE_LIMIT_CENTS
  const totalOdds = summary.hasSelections ? summary.totalOdds : 0
  const totalOddsLabel = summary.hasSelections ? summary.totalOddsLabel : formatOddsLabel(0)
  const pechinchaRuleStatus = useMemo(
    () => getBetslipPechinchaRuleStatus(selections, totalOdds),
    [selections, totalOdds]
  )
  const isPechinchaRuleBlocked = pechinchaRuleStatus.hasPechincha && !pechinchaRuleStatus.isEligible
  const simpleStakeSummary = useMemo(() => (
    selectionGroups.reduce((summaryTotal, group) => {
      const stakeCents = simpleStakeCentsByGroupId[group.eventId] ?? DEFAULT_SIMPLE_STAKE_CENTS
      const potentialWinCents = Math.round(stakeCents * getSelectionGroupOddsValue(group.selections))

      return {
        stakeCents: summaryTotal.stakeCents + stakeCents,
        potentialWinCents: summaryTotal.potentialWinCents + potentialWinCents,
      }
    }, { stakeCents: 0, potentialWinCents: 0 })
  ), [selectionGroups, simpleStakeCentsByGroupId])
  const multiplePotentialWinCents = Math.round(multipleStakeCents * totalOdds)
  const turboBonusPercent = getBetslipTurboBonusPercent(effectiveTurboEligibleSelectionCount)
  const nextTurboBonusPercent = getBetslipTurboBonusPercent(effectiveTurboEligibleSelectionCount + 1)
  const turboBonusCents = getBetslipTurboBonusCents({
    bonusPercent: turboBonusPercent,
    potentialWinCents: multiplePotentialWinCents,
    stakeCents: multipleStakeCents,
  })
  const footerStakeCents = isSplitSimpleMode ? simpleStakeSummary.stakeCents : multipleStakeCents
  const footerPotentialWinCents = isSplitSimpleMode
    ? simpleStakeSummary.potentialWinCents
    : multiplePotentialWinCents + turboBonusCents
  const liveEventPayloadsByEventId = useMemo(() => {
    const payloads = new Map<string, LiveEventOpenPayload>()

    selectionGroups.forEach((group) => {
      const payload = buildBetslipLiveEventOpenPayload(selectionGroups, group.eventId, liveClockNowMs)
      if (payload) payloads.set(group.eventId, payload)
    })

    return payloads
  }, [liveClockNowMs, selectionGroups])

  const handleBetslipLiveEventOpen = useCallback((payload: LiveEventOpenPayload) => {
    window.dispatchEvent(new CustomEvent<LiveEventOpenPayload>(BETSLIP_LIVE_EVENT_OPEN_EVENT, {
      detail: payload,
    }))
  }, [])

  const handleTurboInfoOpen = useCallback(() => {
    setBenefitInfoSheet(null)
    setIsTurboInfoOpen(true)
  }, [])

  const handleTurboInfoClose = useCallback(() => {
    setIsTurboInfoOpen(false)
  }, [])

  const handleEarlyPayoutInfoOpen = useCallback((sport: PagamentoAntecipadoSport) => {
    setBenefitInfoSheet(null)
    setEarlyPayoutInfoSport(sport)
    setIsEarlyPayoutInfoOpen(true)
  }, [])

  const handleEarlyPayoutInfoClose = useCallback(() => {
    setIsEarlyPayoutInfoOpen(false)
  }, [])

  const handleBenefitsInfoOpen = useCallback((
    items: BetslipBenefitSheetItem[],
    initialItemId?: BetslipBenefitSheetItem['id']
  ) => {
    const visibleItems = dedupeBetslipBenefitItems(items)

    if (visibleItems.length === 0) return

    setIsTurboInfoOpen(false)
    setIsEarlyPayoutInfoOpen(false)

    if (visibleItems.length === 1) {
      const [item] = visibleItems

      if (item.id === 'turbo') {
        setIsTurboInfoOpen(true)
        return
      }

      if (item.id === 'early-payout') {
        setEarlyPayoutInfoSport(item.sport ?? 'futebol')
        setIsEarlyPayoutInfoOpen(true)
        return
      }

      setBenefitInfoSheet({
        items: visibleItems,
        initialItemId: item.id,
      })
      return
    }

    setBenefitInfoSheet({
      items: visibleItems,
      initialItemId,
    })
  }, [])

  const handleBenefitsInfoClose = useCallback(() => {
    setBenefitInfoSheet(null)
  }, [])

  const getLiveEventCardProps = useCallback((payload: LiveEventOpenPayload | undefined, eventName: string) => {
    if (!payload) return {}

    return {
      role: 'button' as const,
      tabIndex: 0,
      'aria-label': `Abrir evento ${eventName}`,
      onClick: () => handleBetslipLiveEventOpen(payload),
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (!['Enter', ' '].includes(event.key)) return

        event.preventDefault()
        handleBetslipLiveEventOpen(payload)
      },
    }
  }, [handleBetslipLiveEventOpen])

  useLayoutEffect(() => {
    const trackEl = tabsTrackRef.current
    const indicatorEl = tabIndicatorRef.current
    const activeTabEl = tabButtonRefs.current[activeBetMode]

    if (!trackEl || !indicatorEl || !activeTabEl) return

    const trackRect = trackEl.getBoundingClientRect()
    const activeRect = activeTabEl.getBoundingClientRect()
    const nextX = activeRect.left - trackRect.left + trackEl.scrollLeft
    const nextWidth = activeRect.width
    const shouldAnimate = tabIndicatorReadyRef.current

    const currentStyle = window.getComputedStyle(indicatorEl)
    const currentX = shouldAnimate
      ? getTranslateXFromTransform(currentStyle.transform)
      : nextX
    const currentWidth = shouldAnimate
      ? parseFloat(currentStyle.width) || nextWidth
      : nextWidth

    tabIndicatorAnimationRef.current?.cancel()
    tabIndicatorAnimationRef.current = null

    const applyTarget = () => {
      indicatorEl.style.opacity = '1'
      indicatorEl.style.width = `${nextWidth}px`
      indicatorEl.style.transform = `translate3d(${nextX}px, 0, 0)`
    }

    if (!shouldAnimate) {
      applyTarget()
      tabIndicatorReadyRef.current = true
      return
    }

    if (typeof indicatorEl.animate !== 'function') {
      applyTarget()
      return
    }

    const distance = nextX - currentX
    const overshootX = nextX + Math.sign(distance) * Math.min(Math.abs(distance) * 0.08, 14)
    const animation = indicatorEl.animate(
      [
        {
          opacity: 1,
          transform: `translate3d(${currentX}px, 0, 0)`,
          width: `${currentWidth}px`,
          offset: 0,
          easing: 'cubic-bezier(0.24, 0, 0.28, 1)',
        },
        {
          opacity: 1,
          transform: `translate3d(${overshootX}px, 0, 0)`,
          width: `${nextWidth}px`,
          offset: 0.78,
          easing: 'cubic-bezier(0.18, 1, 0.28, 1)',
        },
        {
          opacity: 1,
          transform: `translate3d(${nextX}px, 0, 0)`,
          width: `${nextWidth}px`,
          offset: 1,
        },
      ],
      {
        duration: betslipTabIndicatorAnimationDurationMs,
        fill: 'forwards',
      }
    )

    tabIndicatorAnimationRef.current = animation
    animation.onfinish = () => {
      if (tabIndicatorAnimationRef.current === animation) {
        tabIndicatorAnimationRef.current = null
        applyTarget()
        animation.cancel()
      }
    }
  }, [activeBetMode, isMultipleTabDisabled])

  useLayoutEffect(() => () => {
    tabIndicatorAnimationRef.current?.cancel()
    tabIndicatorAnimationRef.current = null
  }, [])

  useEffect(() => () => {
    if (confirmTimerRef.current !== null) window.clearTimeout(confirmTimerRef.current)
    if (successTimerRef.current !== null) window.clearTimeout(successTimerRef.current)
    if (successAutoDismissTimerRef.current !== null) window.clearTimeout(successAutoDismissTimerRef.current)
    if (successExitTimerRef.current !== null) window.clearTimeout(successExitTimerRef.current)
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    if (cardRemoveTimerRef.current !== null) window.clearTimeout(cardRemoveTimerRef.current)
    if (builderLegRemoveTimerRef.current !== null) window.clearTimeout(builderLegRemoveTimerRef.current)
    if (cardUpdateTimerRef.current !== null) window.clearTimeout(cardUpdateTimerRef.current)
    if (emptyBetslipCloseTimerRef.current !== null) window.clearTimeout(emptyBetslipCloseTimerRef.current)
  }, [])

  const dismissSuccessSheet = useCallback(() => {
    if (!showSuccessSheet || isSuccessSheetLeaving) return

    setIsSuccessSheetLeaving(true)

    if (successAutoDismissTimerRef.current !== null) {
      window.clearTimeout(successAutoDismissTimerRef.current)
      successAutoDismissTimerRef.current = null
    }

    successExitTimerRef.current = window.setTimeout(() => {
      onClose?.()
      successExitTimerRef.current = null
    }, betslipExitDelayMs)
  }, [isSuccessSheetLeaving, onClose, showSuccessSheet])

  useEffect(() => {
    if (!showSuccessSheet || isSuccessSheetLeaving) return undefined

    clearSelections()

    successAutoDismissTimerRef.current = window.setTimeout(() => {
      dismissSuccessSheet()
    }, betslipSuccessVisibleDelayMs)

    const handleOddInteraction = () => {
      dismissSuccessSheet()
    }

    window.addEventListener(BETSLIP_ODD_INTERACTION_EVENT, handleOddInteraction)

    return () => {
      window.removeEventListener(BETSLIP_ODD_INTERACTION_EVENT, handleOddInteraction)

      if (successAutoDismissTimerRef.current !== null) {
        window.clearTimeout(successAutoDismissTimerRef.current)
        successAutoDismissTimerRef.current = null
      }
    }
  }, [clearSelections, dismissSuccessSheet, isSuccessSheetLeaving, showSuccessSheet])

  useEffect(() => {
    if (!hasLiveSelections) return undefined

    const intervalId = window.setInterval(() => {
      setLiveClockNowMs(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [hasLiveSelections])

  useEffect(() => {
    if (!addedSelectionId) return undefined

    const frameId = window.requestAnimationFrame(() => {
      const selectionSelectorId = addedSelectionId.replace(/"/g, '\\"')
      const target = contentScrollRef.current?.querySelector<HTMLElement>(
        `[data-betslip-selection-id="${selectionSelectorId}"]`
      )

      target?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      })
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [addedSelectionId, selectionGroups])

  const getSimpleStakeCents = useCallback((groupId: string) => (
    simpleStakeCentsByGroupId[groupId] ?? DEFAULT_SIMPLE_STAKE_CENTS
  ), [simpleStakeCentsByGroupId])

  const setSimpleStakeCents = useCallback((groupId: string, updater: StakeCentsUpdater) => {
    setSimpleStakeCentsByGroupId((current) => {
      const currentValue = current[groupId] ?? DEFAULT_SIMPLE_STAKE_CENTS
      const rawNextValue = typeof updater === 'function' ? updater(currentValue) : updater
      const nextValue = Math.max(0, Math.min(rawNextValue, stakeLimitCents))

      if (nextValue === currentValue) return current

      return {
        ...current,
        [groupId]: nextValue,
      }
    })
  }, [stakeLimitCents])

  const setActiveStakeCents = useCallback((updater: StakeCentsUpdater) => {
    if (stakeTarget.type === 'simple') {
      setSimpleStakeCents(stakeTarget.groupId, updater)
      return
    }

    setMultipleStakeCents((current) => {
      const rawNextValue = typeof updater === 'function' ? updater(current) : updater
      const nextValue = Math.max(0, Math.min(rawNextValue, stakeLimitCents))

      return nextValue === current ? current : nextValue
    })
  }, [setSimpleStakeCents, stakeLimitCents, stakeTarget])

  const activeStakeCents = stakeTarget.type === 'simple'
    ? getSimpleStakeCents(stakeTarget.groupId)
    : multipleStakeCents

  const handleBetCreditToggle = useCallback(() => {
    if (useBetCredit) {
      setUseBetCredit(false)
      return
    }

    setUseBetCredit(true)
    setActiveStakeCents(BET_CREDIT_CENTS)
  }, [setActiveStakeCents, useBetCredit])

  const handleBetModeSelect = (mode: BetMode) => {
    if (mode === 'multiple' && isMultipleTabDisabled) return

    setSelectedBetMode(mode)
    setIsStakeKeyboardOpen(false)
    setStakeTarget(
      mode === 'simple' && selectionGroups[0]
        ? { type: 'simple', groupId: selectionGroups[0].eventId }
        : { type: 'multiple' }
    )
  }

  const handleCardStakeInputOpen = (groupId: string) => {
    setStakeTarget({ type: 'simple', groupId })
    if (!isStakeKeyboardOpen) setIsStakeKeyboardOpen(true)
  }

  const handleCardStakeInputToggle = (groupId: string) => {
    const isActiveCardInput = stakeTarget.type === 'simple' && stakeTarget.groupId === groupId

    if (isStakeKeyboardOpen && isActiveCardInput) {
      setIsStakeKeyboardOpen(false)
      return
    }

    setStakeTarget({ type: 'simple', groupId })
    setIsStakeKeyboardOpen(true)
  }

  const snapToNearestCard = (dragDelta = 0) => {
    if (!scrollRef.current) return

    const cardWidth = 304 + 8
    const currentScroll = scrollRef.current.scrollLeft
    const currentIndex = currentScroll / cardWidth
    let targetIndex = Math.round(currentIndex)

    if (dragDelta > 30) targetIndex = Math.ceil(currentIndex)
    if (dragDelta < -30) targetIndex = Math.floor(currentIndex)

    const maxIndex = Math.max(0, Math.ceil((scrollRef.current.scrollWidth - scrollRef.current.clientWidth) / cardWidth))
    targetIndex = Math.max(0, Math.min(targetIndex, maxIndex))

    scrollRef.current.scrollTo({
      left: targetIndex * cardWidth,
      behavior: 'smooth',
    })
  }

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return

    setIsDragging(true)
    startX.current = event.pageX - scrollRef.current.offsetLeft
    scrollLeft.current = scrollRef.current.scrollLeft
  }

  const handleMouseUp = () => {
    const delta = scrollRef.current ? scrollRef.current.scrollLeft - scrollLeft.current : 0

    setIsDragging(false)
    snapToNearestCard(delta)
  }

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollRef.current) return

    event.preventDefault()
    const x = event.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX.current) * 1.5
    scrollRef.current.scrollLeft = scrollLeft.current - walk
  }

  const handleMouseLeave = () => {
    if (!isDragging) return

    const delta = scrollRef.current ? scrollRef.current.scrollLeft - scrollLeft.current : 0
    setIsDragging(false)
    snapToNearestCard(delta)
  }

  const handleRecommendationAdd = (recommendation: BetslipSelection) => {
    setAddedSelectionId(recommendation.id)
    addSelection(
      getBetslipMarketGroupId({
        eventId: recommendation.eventId,
        marketId: recommendation.marketId,
      }),
      recommendation
    )
  }

  const stopRecommendationButtonDrag = (
    event: MouseEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation()
  }

  const handleSelectionAnimationEnd = (
    event: AnimationEvent<HTMLElement>,
    selectionId: string
  ) => {
    if (!['betslipSelectionAdded', 'betslipBuilderLegAdded'].includes(event.animationName)) return

    setAddedSelectionId((current) => (current === selectionId ? null : current))
  }

  const handleRequestClose = useCallback((afterExit?: () => void) => {
    if (isBetslipLeaving) return

    if (confirmTimerRef.current !== null) {
      window.clearTimeout(confirmTimerRef.current)
      confirmTimerRef.current = null
    }

    if (successTimerRef.current !== null) {
      window.clearTimeout(successTimerRef.current)
      successTimerRef.current = null
    }

    setIsConfirming(false)
    setIsStakeKeyboardOpen(false)
    setIsBetslipLeaving(true)

    closeTimerRef.current = window.setTimeout(() => {
      afterExit?.()
      onClose?.()
      closeTimerRef.current = null
    }, betslipExitDelayMs)
  }, [isBetslipLeaving, onClose])

  const handleClearSelectionsAfterExit = useCallback(() => {
    if (isBetslipLeaving) return

    onSelectionsEmptyExitStart?.()
    handleRequestClose(clearSelections)
  }, [clearSelections, handleRequestClose, isBetslipLeaving, onSelectionsEmptyExitStart])

  const handleRemoveAllSelections = () => {
    if (selections.length === 0) return

    handleClearSelectionsAfterExit()
  }

  const removeSelectionWithCardExit = (cardId: string, selectionIds: string[]) => {
    if (removingCardId || removingBuilderLegId) return

    const selectionIdsToRemove = new Set(selectionIds)
    const isRemovingEverySelection = selections.every((selection) => (
      selectionIdsToRemove.has(selection.id)
    ))

    if (isRemovingEverySelection) {
      handleClearSelectionsAfterExit()
      return
    }

    setRemovingCardId(cardId)

    cardRemoveTimerRef.current = window.setTimeout(() => {
      selectionIds.forEach((selectionId) => removeSelection(selectionId))
      setRemovingCardId(null)
      cardRemoveTimerRef.current = null
    }, betslipCardRemoveDelayMs)
  }

  const removeBuilderLegWithSoftUpdate = (groupId: string, selectionId: string) => {
    if (removingCardId || removingBuilderLegId) return

    setRemovingBuilderLegId(selectionId)

    builderLegRemoveTimerRef.current = window.setTimeout(() => {
      removeSelection(selectionId)
      setRemovingBuilderLegId(null)
      setUpdatedGroupId(groupId)
      builderLegRemoveTimerRef.current = null

      if (cardUpdateTimerRef.current !== null) window.clearTimeout(cardUpdateTimerRef.current)

      cardUpdateTimerRef.current = window.setTimeout(() => {
        setUpdatedGroupId(null)
        cardUpdateTimerRef.current = null
      }, betslipCardUpdateDelayMs)
    }, betslipBuilderLegRemoveDelayMs)
  }

  useEffect(() => {
    if (selections.length > 0) {
      hadSelectionsRef.current = true
      return
    }

    if (
      !hadSelectionsRef.current
      || isBetslipLeaving
      || showSuccessSheet
      || isSuccessSheetLeaving
    ) {
      return
    }

    hadSelectionsRef.current = false
    emptyBetslipCloseTimerRef.current = window.setTimeout(() => {
      emptyBetslipCloseTimerRef.current = null
      handleRequestClose()
    }, 0)

    return () => {
      if (emptyBetslipCloseTimerRef.current !== null) {
        window.clearTimeout(emptyBetslipCloseTimerRef.current)
        emptyBetslipCloseTimerRef.current = null
      }
    }
  }, [
    handleRequestClose,
    isBetslipLeaving,
    isSuccessSheetLeaving,
    selections.length,
    showSuccessSheet,
  ])

  const handleConfirmBet = (stakeCents: number, potentialWinCents: number) => {
    if (isConfirming || isBetslipLeaving || showSuccessSheet) return
    if (selectionGroups.length === 0) return
    if (isPechinchaRuleBlocked) return

    const successSelectionGroups = isSplitSimpleMode
      ? selectionGroups.filter((group) => getSimpleStakeCents(group.eventId) > 0)
      : selectionGroups
    if (successSelectionGroups.length === 0) return

    const successSelectionCount = isSplitSimpleMode ? successSelectionGroups.length : totalSelectionCount
    const successSelectionCopy = getSuccessSelectionCopy(successSelectionGroups, successSelectionCount)
    const successSelectionItems = isSplitSimpleMode
      ? getSuccessSimpleSelectionItems(successSelectionGroups)
      : undefined

    setIsStakeKeyboardOpen(false)
    setSuccessSummary({
      selectionCount: successSelectionCount,
      selectionTitle: successSelectionCopy.title,
      selectionSubtitle: successSelectionCopy.subtitle,
      stakeCents,
      potentialWinCents,
      totalOddsLabel,
      selectionItems: successSelectionItems,
    })
    setIsConfirming(true)

    confirmTimerRef.current = window.setTimeout(() => {
      setIsConfirming(false)
      setIsBetslipLeaving(true)

      successTimerRef.current = window.setTimeout(() => {
        setIsSuccessSheetLeaving(false)
        setShowSuccessSheet(true)
      }, betslipExitDelayMs)
    }, betslipConfirmDelayMs)
  }

  return (
    <>
      <main
        className={[
          'betslip-page',
          hasCompletedEnterAnimation ? '' : 'betslip-page--entering',
          isStakeKeyboardOpen ? 'betslip-page--keyboard-open' : '',
          isBetslipLeaving ? 'betslip-page--leaving' : '',
          isSplitSimpleMode ? 'betslip-page--simple-split' : '',
          isCoveredByEvent ? 'betslip-page--covered-by-event' : '',
        ].filter(Boolean).join(' ')}
        aria-hidden={isCoveredByEvent ? true : undefined}
        aria-labelledby="betslip-page-title"
      >
      <header className="betslip-page__header">
        <div className="betslip-page__title-group">
          <span className="betslip-page__count">{totalSelectionCount}</span>
          <h1 id="betslip-page-title" className="betslip-page__title">Seleções</h1>
        </div>

        <div className="betslip-page__header-actions">
          <div className="betslip-page__balances" aria-label="Saldos disponíveis">
            <div className="betslip-page__balance">
              <span>Pitacoins</span>
              <strong>{formatStakeInput(PITACOINS_CENTS)}</strong>
            </div>
            <div className="betslip-page__balance">
              <span>Saldo</span>
              <strong>{formatCurrency(BALANCE_CENTS)}</strong>
            </div>
          </div>

          <button type="button" className="betslip-page__close" aria-label="Fechar betslip" onClick={() => handleRequestClose()}>
            <XIcon aria-hidden="true" weight="bold" />
          </button>
        </div>
      </header>

      <nav className="betslip-page__tabs" aria-label="Tipo de aposta">
        <div className="betslip-page__tab-list" role="tablist" ref={tabsTrackRef}>
          <span className="betslip-page__tab-indicator" aria-hidden="true" ref={tabIndicatorRef} />
          <button
            type="button"
            className={[
              'betslip-page__tab',
              activeBetMode === 'multiple' ? 'betslip-page__tab--active' : '',
              isMultipleTabDisabled ? 'betslip-page__tab--disabled' : '',
            ].filter(Boolean).join(' ')}
            aria-current={activeBetMode === 'multiple' ? 'page' : undefined}
            aria-selected={activeBetMode === 'multiple'}
            disabled={isMultipleTabDisabled}
            onClick={() => handleBetModeSelect('multiple')}
            role="tab"
            ref={(el) => {
              tabButtonRefs.current.multiple = el
            }}
          >
            Múltipla
          </button>
          <button
            type="button"
            className={`betslip-page__tab${activeBetMode === 'simple' ? ' betslip-page__tab--active' : ''}`}
            aria-current={activeBetMode === 'simple' ? 'page' : undefined}
            aria-selected={activeBetMode === 'simple'}
            onClick={() => handleBetModeSelect('simple')}
            role="tab"
            ref={(el) => {
              tabButtonRefs.current.simple = el
            }}
          >
            Simples
          </button>
        </div>

        <button type="button" className="betslip-page__settings" aria-label="Configurações">
          <GearSixIcon aria-hidden="true" weight="bold" />
        </button>
      </nav>

      <div className="betslip-page__content" ref={contentScrollRef}>
        <BetslipTurboBanner
          bonusCents={turboBonusCents}
          bonusPercent={turboBonusPercent}
          hasTurboSelectionBadge={hasTurboSelectionBadge}
          isBlockedByPromotion={isTurboBlockedByPromotion}
          nextBonusPercent={nextTurboBonusPercent}
          onInfoOpen={handleTurboInfoOpen}
          pechinchaRuleMessage={isPechinchaRuleBlocked ? BETSLIP_PECHINCHA_RULE_MESSAGE : undefined}
          selectionCount={turboEligibleSelectionCount}
        />

        <section className="betslip-page__selections" aria-labelledby="betslip-page-selections-title">
          <div className="betslip-page__section-header">
            <h2 id="betslip-page-selections-title">Suas seleções:</h2>
            <button
              type="button"
              className="betslip-page__remove-all"
              disabled={selections.length === 0}
              onClick={handleRemoveAllSelections}
            >
              <span>Remover tudo</span>
              <TrashIcon aria-hidden="true" weight="bold" />
            </button>
          </div>

          <div className="betslip-page__selection-list">
            {selectionGroups.length === 0 ? (
              <div className="betslip-page__empty-state">
                <strong>Nenhuma seleção adicionada</strong>
                <span>Escolha uma odd para montar sua aposta.</span>
              </div>
            ) : selectionGroups.map((group) => {
              const firstSelection = group.selections[0]
              const isAddedGroup = group.selections.some((selection) => selection.id === addedSelectionId)
              const isRemovingGroup = removingCardId === group.eventId
              const isUpdatedGroup = updatedGroupId === group.eventId
              const liveEventPayload = liveEventPayloadsByEventId.get(group.eventId)
              const liveEventCardProps = getLiveEventCardProps(
                liveEventPayload,
                getSelectionEventName(firstSelection)
              )
              const liveEventCardClassName = liveEventPayload ? ' betslip-page-card--clickable' : ''
              const articleAnimationProps = {
                onAnimationEnd: (event: AnimationEvent<HTMLElement>) => {
                  const animatedSelection = group.selections.find((selection) => selection.id === addedSelectionId)
                  if (animatedSelection) handleSelectionAnimationEnd(event, animatedSelection.id)
                },
              }

              if (group.selections.length > 1) {
                const isLiveBuilder = firstSelection.eventStatus === 'live'
                const groupStakeCents = getSimpleStakeCents(group.eventId)
                const groupPotentialWinCents = Math.round(
                  groupStakeCents * getSelectionGroupOddsValue(group.selections)
                )
                const groupBenefitItems = getSelectionGroupBenefitItems(
                  group,
                  turboEligibleSelectionCount,
                  true
                )
                const hasGroupTurboBenefit = groupBenefitItems.some((item) => item.id === 'turbo')

                return (
                  <article
                    key={group.eventId}
                    className={`betslip-page-card betslip-page-card--builder${liveEventCardClassName}${isRemovingGroup ? ' betslip-page-card--removing' : ''}${isUpdatedGroup ? ' betslip-page-card--updated' : ''}`}
                    {...articleAnimationProps}
                    {...liveEventCardProps}
                  >
                    {isLiveBuilder ? (
                      <div className="betslip-page-card__event betslip-page-card__event--live">
                        <div className="betslip-page-card__live-teams">
                          <span>{firstSelection.homeTeam ?? getSelectionEventName(firstSelection)}</span>
                          <span>{firstSelection.awayTeam ?? ''}</span>
                        </div>

                        <div className="betslip-page-card__live-details">
                          <span className="betslip-page-card__live-time">{getSelectionTimeLabel(firstSelection, liveClockNowMs)}</span>
                          <div className="betslip-page-card__live-score" aria-label={`Placar ${firstSelection.homeScore ?? 0} a ${firstSelection.awayScore ?? 0}`}>
                            <span>{firstSelection.homeScore ?? '-'}</span>
                            <span>{firstSelection.awayScore ?? '-'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="betslip-page-card__event">
                        <span>{getSelectionEventName(firstSelection)}</span>
                        <span>{getSelectionTimeLabel(firstSelection, liveClockNowMs)}</span>
                      </div>
                    )}

                    <div className="betslip-page-card__builder-title">
                      <span className="betslip-page-card__create-badge">CA</span>
                      <span className="betslip-page-card__builder-label">
                        <strong>Criar Aposta</strong>
                        {hasGroupTurboBenefit ? (
                          <TurboSelectionBadge onInfoOpen={() => handleBenefitsInfoOpen(groupBenefitItems, 'turbo')} />
                        ) : null}
                      </span>
                      <strong className="betslip-page-card__odd">{getSelectionGroupOddsLabel(group.selections)}</strong>
                      <DeleteButton
                        label={`Remover aposta criada ${getSelectionEventName(firstSelection)}`}
                        onClick={() => removeSelectionWithCardExit(
                          group.eventId,
                          group.selections.map((selection) => selection.id)
                        )}
                      />
                    </div>

                    <div className="betslip-page-card__builder-list">
                      {group.selections.map((selection) => (
                        <div
                          key={selection.id}
                          data-betslip-selection-id={selection.id}
                          className={`betslip-page-card__builder-leg${selection.id === addedSelectionId ? ' betslip-page-card__builder-leg--added' : ''}${removingBuilderLegId === selection.id ? ' betslip-page-card__builder-leg--removing' : ''}`}
                        >
                          <span className="betslip-page-card__builder-dot" aria-hidden="true" />
                          <div className="betslip-page-card__builder-copy">
                            <div className="betslip-page-card__builder-name">
                              <strong>{getSelectionTitle(selection)}</strong>
                              <SelectionBadge
                                selection={selection}
                                showTurbo={false}
                                onBenefitsInfoOpen={handleBenefitsInfoOpen}
                                onEarlyPayoutInfoOpen={handleEarlyPayoutInfoOpen}
                              />
                            </div>
                            <span>{getSelectionMarketDisplayLabel(selection)}</span>
                          </div>
                          <DeleteButton
                            label={`Remover escolha ${getSelectionTitle(selection)}`}
                            onClick={() => removeBuilderLegWithSoftUpdate(group.eventId, selection.id)}
                          />
                        </div>
                      ))}
                    </div>

                    {isSplitSimpleMode ? (
                      <BetslipCardStakeControls
                        isActive={stakeTarget.type === 'simple' && stakeTarget.groupId === group.eventId}
                        isStakeKeyboardOpen={isStakeKeyboardOpen}
                        potentialWinCents={groupPotentialWinCents}
                        stakeCents={groupStakeCents}
                        stakeLimitCents={stakeLimitCents}
                        onStakeChange={(updater) => setSimpleStakeCents(group.eventId, updater)}
                        onStakeInputOpen={() => handleCardStakeInputOpen(group.eventId)}
                        onStakeInputToggle={() => handleCardStakeInputToggle(group.eventId)}
                      />
                    ) : null}
                  </article>
                )
              }

              const selection = firstSelection
              const isLive = selection.eventStatus === 'live'
              const isRemovingSelection = removingCardId === selection.id
              const isUpdatedSelection = updatedGroupId === group.eventId
              const groupStakeCents = getSimpleStakeCents(group.eventId)
              const groupPotentialWinCents = Math.round(groupStakeCents * getSelectionGroupOddsValue(group.selections))
              const selectionBenefitItems = getSelectionBenefitItems(
                selection,
                turboEligibleSelectionCount,
                true
              )

              return (
                <article
                  key={selection.id}
                  data-betslip-selection-id={selection.id}
                  className={`betslip-page-card betslip-page-card--${isLive ? 'live' : 'simple'}${liveEventCardClassName}${isAddedGroup ? ' betslip-page-card--added' : ''}${isRemovingSelection ? ' betslip-page-card--removing' : ''}${isUpdatedSelection ? ' betslip-page-card--updated' : ''}`}
                  {...articleAnimationProps}
                  {...liveEventCardProps}
                >
                  {isLive ? (
                    <div className="betslip-page-card__event betslip-page-card__event--live">
                      <div className="betslip-page-card__live-teams">
                        <span>{selection.homeTeam ?? getSelectionEventName(selection)}</span>
                        <span>{selection.awayTeam ?? ''}</span>
                      </div>

                      <div className="betslip-page-card__live-details">
                        <span className="betslip-page-card__live-time">{getSelectionTimeLabel(selection, liveClockNowMs)}</span>
                        <div className="betslip-page-card__live-score" aria-label={`Placar ${selection.homeScore ?? 0} a ${selection.awayScore ?? 0}`}>
                          <span>{selection.homeScore ?? '-'}</span>
                          <span>{selection.awayScore ?? '-'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="betslip-page-card__event">
                      <span>{getSelectionEventName(selection)}</span>
                      <span>{getSelectionTimeLabel(selection, liveClockNowMs)}</span>
                    </div>
                  )}

                  <div className="betslip-page-card__simple-body">
                    <SelectionIcon selection={selection} className="betslip-page-card__flag" />

                    <div className="betslip-page-card__simple-info">
                      <div className="betslip-page-card__choice-line">
                        <strong>{getSelectionTitle(selection)}</strong>
                        <SelectionBadge
                          benefitItems={selectionBenefitItems}
                          selection={selection}
                          onBenefitsInfoOpen={handleBenefitsInfoOpen}
                          onEarlyPayoutInfoOpen={handleEarlyPayoutInfoOpen}
                          onTurboInfoOpen={handleTurboInfoOpen}
                        />
                      </div>
                      <span className="betslip-page-card__market">{getSelectionMarketDisplayLabel(selection)}</span>
                    </div>

                    <strong className="betslip-page-card__odd">{selection.oddLabel}</strong>
                    <DeleteButton
                      label={`Remover seleção ${getSelectionTitle(selection)}`}
                      onClick={() => removeSelectionWithCardExit(selection.id, [selection.id])}
                    />
                  </div>

                  {isSplitSimpleMode ? (
                    <BetslipCardStakeControls
                      isActive={stakeTarget.type === 'simple' && stakeTarget.groupId === group.eventId}
                      isStakeKeyboardOpen={isStakeKeyboardOpen}
                      potentialWinCents={groupPotentialWinCents}
                      stakeCents={groupStakeCents}
                      stakeLimitCents={stakeLimitCents}
                      onStakeChange={(updater) => setSimpleStakeCents(group.eventId, updater)}
                      onStakeInputOpen={() => handleCardStakeInputOpen(group.eventId)}
                      onStakeInputToggle={() => handleCardStakeInputToggle(group.eventId)}
                    />
                  ) : null}
                </article>
              )
            })}
          </div>
        </section>

        <section className="betslip-page__recommendations" aria-labelledby="betslip-page-recommendations-title">
          <h2 id="betslip-page-recommendations-title">Você também pode gostar:</h2>

          <div
            ref={scrollRef}
            className={`betslip-page__recommendation-track${isDragging ? ' betslip-page__recommendation-track--dragging' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {recommendations.map((recommendation) => {
              const recommendationOddLabel = formatOddsLabel(recommendation.oddValue)

              return (
                <article key={recommendation.id} className="betslip-recommendation-card">
                  <div className="betslip-recommendation-card__event">
                    <span>{getSelectionEventName(recommendation)}</span>
                    <span>{getSelectionTimeLabel(recommendation, liveClockNowMs)}</span>
                  </div>

                  <div className="betslip-recommendation-card__body">
                    <SelectionIcon selection={recommendation} className="betslip-recommendation-card__flag" />
                    <div className="betslip-recommendation-card__copy">
                      <strong>{getSelectionTitle(recommendation)}</strong>
                      <span>{getSelectionMarketDisplayLabel(recommendation)}</span>
                    </div>

                    <button
                      type="button"
                      className="betslip-recommendation-card__button"
                      aria-label={`Adicionar ${getSelectionTitle(recommendation)} com odd ${recommendationOddLabel}`}
                      onMouseDown={stopRecommendationButtonDrag}
                      onPointerDown={stopRecommendationButtonDrag}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleRecommendationAdd(recommendation)
                      }}
                    >
                      <span>Adicionar</span>
                      <strong>{recommendationOddLabel}</strong>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>

      <BetslipFooter
        activeStakeCents={activeStakeCents}
        betMode={isSplitSimpleMode ? 'simple' : 'multiple'}
        isPechinchaRuleBlocked={isPechinchaRuleBlocked}
        isStakeKeyboardOpen={isStakeKeyboardOpen}
        isSubmitting={isConfirming}
        potentialWinCents={footerPotentialWinCents}
        stakeCents={footerStakeCents}
        stakeLimitCents={stakeLimitCents}
        totalOdds={totalOdds}
        useBetCredit={useBetCredit}
        onActiveStakeCentsChange={setActiveStakeCents}
        onBetCreditToggle={handleBetCreditToggle}
        onConfirm={handleConfirmBet}
        onStakeKeyboardOpenChange={setIsStakeKeyboardOpen}
      />
      </main>
      <MultiplaTurbinadaBottomSheet
        isOpen={isTurboInfoOpen}
        onClose={handleTurboInfoClose}
        currentSelectionCount={effectiveTurboEligibleSelectionCount}
      />
      <PagamentoAntecipadoBottomSheet
        isOpen={isEarlyPayoutInfoOpen}
        onClose={handleEarlyPayoutInfoClose}
        sport={earlyPayoutInfoSport}
      />
      <BeneficiosApostaBottomSheet
        isOpen={benefitInfoSheet !== null}
        onClose={handleBenefitsInfoClose}
        items={benefitInfoSheet?.items ?? []}
        initialItemId={benefitInfoSheet?.initialItemId}
      />
      {showSuccessSheet && successSummary ? (
        <BetslipSuccessSheet summary={successSummary} isLeaving={isSuccessSheetLeaving} />
      ) : null}
    </>
  )
}
