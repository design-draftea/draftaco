import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from 'react'
import { homeCompetitionHighlight } from '../../data/homeProducts'
import { getLocalPlayerImage } from '../../data/playerImages'
import { getTeamLogo } from '../../data/teamLogos'
import {
  createBetslipSelection,
  getMatchOddBetslipKey,
  getPlayerPropBetslipKey,
  normalizeBetslipIdPart,
} from '../../shared/hooks/betslipUtils'
import { useOddSelection } from '../../shared/hooks/useOddSelection'
import { updateLiveClock } from '../../shared/utils/liveClock'
import { TeamLogo } from '../TeamLogo'
import chevronDown from '../../assets/iconsDraftaco/chevronDown.svg'
import chevronRight from '../../assets/iconsDraftaco/chevronRight.svg'
import flagFallback from '../../assets/iconsDraftaco/flagFallback.svg'
import iconStatistic from '../../assets/iconsDraftaco/iconStatistic.svg'
import playerAvatarBasquete from '../../assets/playerAvatarBasquete.svg'
import playerAvatarNFL from '../../assets/playerAvatarNFL.svg'
import playerAvatarFutebol from '../../assets/playerAvatarFutebol.svg'
import type {
  HomeCompetitionHighlight,
  HomeCompetitionMarketColumn,
  HomeCompetitionMarketChip,
  HomeCompetitionMatch,
  HomeCompetitionOdd,
  HomeCompetitionPlayerProp,
} from '../../shared/types/home'
import './HomeCompetitionSection.css'

const emptyMarketChips: HomeCompetitionMarketChip[] = []
const PLAYER_PROPS_GRID_INITIAL_COUNT = 4
const PLAYER_PROPS_GRID_LOAD_STEP = 2
const PLAYER_PROPS_GRID_MAX_COUNT = 8
const PLAYER_ODD_MOUSE_SENSITIVITY = 1
const PLAYER_ODD_TOUCH_SENSITIVITY = 0.92
const PLAYER_ODD_VERTICAL_INTENT_THRESHOLD = 28
const PLAYER_ODD_HORIZONTAL_INTENT_THRESHOLD = 28
const PLAYER_ODD_CLICK_SUPPRESS_THRESHOLD = 28
const PLAYER_ODD_TAP_REPLAY_THRESHOLD = 28
const PLAYER_ODD_DRAG_AXIS_RATIO = 1.15
const PLAYER_ODD_NATIVE_CLICK_SUPPRESS_MS = 450

const getVerticalScrollContainer = (element: HTMLElement | null) => {
  let current = element?.parentElement ?? null

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current)
    if (/(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight) {
      return current
    }
    current = current.parentElement
  }

  return (document.scrollingElement ?? document.documentElement) as HTMLElement
}

const getHorizontalScrollAncestor = (element: HTMLElement | null) => {
  let current = element?.parentElement ?? null

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current)
    if (/(auto|scroll)/.test(style.overflowX) && current.scrollWidth > current.clientWidth) {
      return current
    }
    current = current.parentElement
  }

  return null
}
const PLAYER_PROPS_ACCORDION_DURATION_MS = 900
const playerPropsMarketIds = new Set(['finalizacao-gol', 'gols', 'pontos-jogador', 'assistencias'])
const basketballQuarterChipIds = new Set(['q1', 'q2', 'q3', 'q4'])

type HomeCompetitionOddDisplay = {
  label: ReactNode
  value: ReactNode
}

interface HomeCompetitionOddButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  odd: HomeCompetitionOddDisplay
}

export type HomeCompetitionPlayerPropOddRenderer = (
  odd: HomeCompetitionOddDisplay,
  context: {
    prop: HomeCompetitionPlayerProp
    index: number
    isActive: boolean
    className: string
  }
) => ReactNode

export type HomeCompetitionMatchOddRenderer = (
  odd: HomeCompetitionOddDisplay,
  context: {
    match: HomeCompetitionMatch
    index: number
    marketId: string
    marketLabel: string
    outcomeId: string
  }
) => ReactNode

const teamLogoAliases: Record<string, string> = {
  'Paris Saint-Germain': 'PSG',
}

const getLogoSource = (teamName: string) => getTeamLogo(teamLogoAliases[teamName] ?? teamName, flagFallback)

const getPlayerPropAvatar = (sport: HomeCompetitionPlayerProp['sport']) => {
  if (sport === 'basquete') return playerAvatarBasquete
  if (sport === 'nfl') return playerAvatarNFL

  return playerAvatarFutebol
}

const getInitialOddIndex = (odds: HomeCompetitionOdd[]) => Math.floor(odds.length / 2)

const getReactNodeText = (node: ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(getReactNodeText).join('')

  return ''
}

const getOddOutcomeId = (label: ReactNode, index: number, prefix?: string) => (
  [prefix, index, normalizeBetslipIdPart(getReactNodeText(label))]
    .filter(Boolean)
    .join('-')
)

const getInitialLiveTimes = (matches: HomeCompetitionMatch[]) =>
  matches.reduce<Record<string, string>>((times, match) => {
    if (match.live) times[match.id] = match.liveClock ?? match.footerLabel
    return times
  }, {})

const getBasketballQuarterFromMarketId = (marketId: string) => {
  if (!basketballQuarterChipIds.has(marketId)) return undefined

  const quarter = Number(marketId.replace('q', ''))
  return Number.isFinite(quarter) ? quarter : undefined
}

const getBasketballLiveQuarter = (
  match: HomeCompetitionMatch,
  liveTime?: string
) => {
  if (!match.live || match.sport !== 'basquete') return undefined

  const timeLabel = liveTime ?? match.liveClock ?? match.footerLabel
  const quarterMatch = timeLabel.match(/\bQ([1-4])\b/i)

  if (quarterMatch) return Number(quarterMatch[1])
  if (/intervalo/i.test(timeLabel)) return 3

  return undefined
}

const isMarketAvailableForMatch = (
  marketId: string,
  match: HomeCompetitionMatch,
  liveTime?: string
) => {
  const marketQuarter = getBasketballQuarterFromMarketId(marketId)
  if (marketQuarter === undefined) return true
  if (match.sport !== 'basquete') return true

  const liveQuarter = getBasketballLiveQuarter(match, liveTime)
  if (liveQuarter === undefined) return true

  return marketQuarter >= liveQuarter
}

const getAvailableMarketChips = (
  competition: HomeCompetitionHighlight,
  marketChips: HomeCompetitionMarketChip[],
  liveTimes: Record<string, string>
) => marketChips.filter((chip) => {
  if (playerPropsMarketIds.has(chip.id)) {
    return competition.playerProps.some((prop) => !prop.marketId || prop.marketId === chip.id)
  }

  return competition.matches.some((match) => isMarketAvailableForMatch(chip.id, match, liveTimes[match.id]))
})

const formatMarketLine = (line: number) => `${line > 0 ? '+' : ''}${line}`

const getMatchOddLabels = (match: HomeCompetitionMatch) => ({
  home: match.odds[0]?.label ?? match.homeTeam,
  away: match.sport === 'basquete' || match.sport === 'nfl'
    ? match.odds[1]?.label ?? match.awayTeam
    : match.odds[2]?.label ?? match.awayTeam,
})

const getMatchMarketOdds = (
  match: HomeCompetitionMatch,
  activeMarket?: string
): HomeCompetitionOdd[] => {
  const labels = getMatchOddLabels(match)

  if (activeMarket === 'dupla-chance' && match.doubleChanceOdds) {
    return [
      { label: '1X', value: match.doubleChanceOdds.homeOrDraw },
      { label: '12', value: match.doubleChanceOdds.homeOrAway },
      { label: 'X2', value: match.doubleChanceOdds.awayOrDraw },
    ]
  }

  if (activeMarket === 'ambos-marcam' && match.bothTeamsScoreOdds) {
    return [
      { label: 'Sim', value: match.bothTeamsScoreOdds.yes },
      { label: 'Não', value: match.bothTeamsScoreOdds.no },
    ]
  }

  if (activeMarket === 'total-gols' && match.totalGoalsOdds) {
    return [
      { label: `-${match.totalGoalsOdds.line}`, value: match.totalGoalsOdds.under },
      { label: `+${match.totalGoalsOdds.line}`, value: match.totalGoalsOdds.over },
    ]
  }

  if (activeMarket === 'escanteios' && match.totalCornersOdds) {
    return [
      { label: `-${match.totalCornersOdds.line}`, value: match.totalCornersOdds.under },
      { label: `+${match.totalCornersOdds.line}`, value: match.totalCornersOdds.over },
    ]
  }

  if (activeMarket === 'total-pontos' && match.totalPointsOdds) {
    return [
      { label: `-${match.totalPointsOdds.line}`, value: match.totalPointsOdds.under },
      { label: `+${match.totalPointsOdds.line}`, value: match.totalPointsOdds.over },
    ]
  }

  if (activeMarket === 'handicap' && match.handicapOdds) {
    return [
      { label: `${labels.home} ${formatMarketLine(match.handicapOdds.line)}`, value: match.handicapOdds.home },
      { label: `${labels.away} ${formatMarketLine(-match.handicapOdds.line)}`, value: match.handicapOdds.away },
    ]
  }

  if (activeMarket === 'vencedor') {
    return [match.odds[0], match.odds[1]].filter(Boolean)
  }

  return match.odds
}

const getMatchMarketLabel = (
  match: HomeCompetitionMatch,
  activeMarketLabel?: string
) => activeMarketLabel ? activeMarketLabel.toUpperCase() : match.marketLabel

const parseOddValue = (odd?: string) => {
  if (!odd) return 1.9

  const value = Number(odd.replace('x', '').replace(',', '.'))
  return Number.isFinite(value) ? value : 1.9
}

const formatOddValue = (odd: number) => `${Math.max(1.05, odd).toFixed(2)}x`

const adjustOddValue = (odd: string | undefined, delta: number) => (
  formatOddValue(parseOddValue(odd) + delta)
)

const roundMarketLine = (line: number) => Math.round(line * 2) / 2

const getBasketballTotalColumn = (
  label: string,
  totalOdds: HomeCompetitionMatch['totalPointsOdds'] | HomeCompetitionMatch['q3TotalOdds'],
  fallbackLine: number
): HomeCompetitionMarketColumn => {
  const line = totalOdds?.line ?? fallbackLine

  return {
    label,
    homeOdd: { label: `Mais ${line}`, value: totalOdds?.over ?? '1.90x' },
    awayOdd: { label: `Menos ${line}`, value: totalOdds?.under ?? '1.90x' },
  }
}

const basketballQuarterMarketConfig = {
  q1: { index: 1, totalOffset: -1, oddOffset: 0.1 },
  q2: { index: 2, totalOffset: 0, oddOffset: 0.04 },
  q3: { index: 3, totalOffset: 0.5, oddOffset: 0 },
  q4: { index: 4, totalOffset: 1, oddOffset: 0.06 },
} as const

const getBasketballQuarterTotalOdds = (
  match: HomeCompetitionMatch,
  quarterId: keyof typeof basketballQuarterMarketConfig
) => {
  if (quarterId === 'q3') return match.q3TotalOdds
  if (quarterId === 'q4') return match.q4TotalOdds

  return undefined
}

const getBasketballQuarterMarketColumns = (
  match: HomeCompetitionMatch,
  quarterId: keyof typeof basketballQuarterMarketConfig
): HomeCompetitionMarketColumn[] => {
  const labels = getMatchOddLabels(match)
  const config = basketballQuarterMarketConfig[quarterId]
  const totalPointsLine = match.totalPointsOdds?.line ?? 212.5
  const fallbackTotalLine = roundMarketLine((totalPointsLine / 4) + config.totalOffset)
  const quarterTotalOdds = getBasketballQuarterTotalOdds(match, quarterId)
  const totalLine = quarterTotalOdds?.line ?? fallbackTotalLine
  const handicapBaseLine = Math.abs(match.handicapOdds?.line ?? 4.5)
  const handicapLine = roundMarketLine(Math.max(0.5, (handicapBaseLine / 4) + (config.index % 2 === 0 ? 0.5 : 0)))
  const homeHandicapLine = (match.handicapOdds?.line ?? handicapBaseLine) < 0 ? -handicapLine : handicapLine
  const awayHandicapLine = -homeHandicapLine

  return [
    {
      label: 'Vencer',
      homeOdd: { label: labels.home, value: adjustOddValue(match.odds[0]?.value, config.oddOffset) },
      awayOdd: { label: labels.away, value: adjustOddValue(match.odds[1]?.value, -config.oddOffset) },
    },
    {
      label: 'Handicap',
      homeOdd: {
        label: `${labels.home} ${formatMarketLine(homeHandicapLine)}`,
        value: adjustOddValue(match.handicapOdds?.home, config.oddOffset / 2),
      },
      awayOdd: {
        label: `${labels.away} ${formatMarketLine(awayHandicapLine)}`,
        value: adjustOddValue(match.handicapOdds?.away, -(config.oddOffset / 2)),
      },
    },
    {
      label: 'Total',
      homeOdd: { label: `Mais ${totalLine}`, value: quarterTotalOdds?.over ?? adjustOddValue(match.totalPointsOdds?.over, config.oddOffset / 2) },
      awayOdd: { label: `Menos ${totalLine}`, value: quarterTotalOdds?.under ?? adjustOddValue(match.totalPointsOdds?.under, -(config.oddOffset / 2)) },
    },
  ]
}

const getBasketballActiveMarketColumns = (
  match: HomeCompetitionMatch,
  activeMarket?: string
): HomeCompetitionMarketColumn[] => {
  const labels = getMatchOddLabels(match)
  const totalPointsLine = match.totalPointsOdds?.line ?? 212.5
  const q3TotalFallbackLine = Math.round((totalPointsLine / 4) * 2) / 2

  if (activeMarket === 'principais' || activeMarket === 'vencedor') {
    return match.marketColumns ?? [{
      label: 'Vencer',
      homeOdd: match.odds[0],
      awayOdd: match.odds[1],
    }]
  }

  if (activeMarket === 'q1' || activeMarket === 'q2' || activeMarket === 'q3' || activeMarket === 'q4') {
    return getBasketballQuarterMarketColumns(match, activeMarket)
  }

  if (activeMarket === 'total-pontos') {
    return [getBasketballTotalColumn('Total', match.totalPointsOdds, totalPointsLine)]
  }

  if (activeMarket === 'q3-total') {
    return [getBasketballTotalColumn('Total', match.q3TotalOdds, q3TotalFallbackLine)]
  }

  if (activeMarket === 'q4-total') {
    return [getBasketballTotalColumn('Total', match.q4TotalOdds, q3TotalFallbackLine + 1)]
  }

  if (activeMarket === 'q3-resultado') {
    return [{
      label: 'Resultado',
      tag: '3Q',
      homeOdd: { label: labels.home, value: match.q3ResultOdds?.home ?? match.odds[0].value },
      awayOdd: { label: labels.away, value: match.q3ResultOdds?.away ?? match.odds[1].value },
    }]
  }

  return match.marketColumns ?? []
}

const scrollMarketChipIntoView = (chipEl: HTMLButtonElement) => {
  const containerEl = chipEl.parentElement
  if (!containerEl) return

  const chipLeft = chipEl.offsetLeft
  const chipWidth = chipEl.offsetWidth
  const containerWidth = containerEl.clientWidth
  const containerScroll = containerEl.scrollLeft
  const padding = 20

  if (chipLeft + chipWidth > containerScroll + containerWidth - padding) {
    containerEl.scrollTo({ left: chipLeft - padding, behavior: 'smooth' })
  } else if (chipLeft < containerScroll + padding) {
    containerEl.scrollTo({ left: chipLeft - padding, behavior: 'smooth' })
  }
}

function renderPlayerPropMatchLabel(prop: HomeCompetitionPlayerProp) {
  const labelParts = prop.matchLabel.toUpperCase().split(/\s+VS\s+/)

  if (labelParts.length !== 2) return prop.matchLabel.toUpperCase()

  return labelParts.map((label, index) => (
    <span key={`${prop.id}-${label}`}>
      {index > 0 && ' VS '}
      {label === prop.teamAbbreviation ? <strong>{label}</strong> : label}
    </span>
  ))
}

const getPlayerPropTimeParts = (timeLabel: string) => {
  const normalizedTimeLabel = timeLabel.trim()

  if (/^AO VIVO$/i.test(normalizedTimeLabel)) {
    return { date: normalizedTimeLabel.toUpperCase(), time: '' }
  }

  const parentheticalTimeMatch = normalizedTimeLabel.match(/^(.+?)\s*\(([^)]+)\)$/)
  if (parentheticalTimeMatch) {
    return {
      date: parentheticalTimeMatch[1].trim().toUpperCase(),
      time: parentheticalTimeMatch[2].trim(),
    }
  }

  const commaTimeMatch = normalizedTimeLabel.match(/^(.+?),\s*(.+)$/)
  if (commaTimeMatch) {
    return {
      date: commaTimeMatch[1].trim().toUpperCase(),
      time: commaTimeMatch[2].trim(),
    }
  }

  const compactTimeMatch = normalizedTimeLabel.match(/^(.+?)\s+(\d{1,2}:\d{2})$/)
  if (compactTimeMatch) {
    return {
      date: compactTimeMatch[1].trim().toUpperCase(),
      time: compactTimeMatch[2].trim(),
    }
  }

  return { date: normalizedTimeLabel.toUpperCase(), time: '' }
}

const renderPlayerPropTimeLabel = (label: string) => {
  const { date, time } = getPlayerPropTimeParts(label)

  return (
    <span className="home-competition__player-time-label">
      <span>{date}</span>
      {time && <span>{time}</span>}
    </span>
  )
}

const getPlayerPropGroupTitle = (prop: HomeCompetitionPlayerProp) => {
  const timeLabel = prop.timeLabel.trim()

  if (/^AO VIVO/i.test(timeLabel)) return 'Ao vivo'
  if (/^HOJE/i.test(timeLabel)) return 'Hoje'
  if (/^AMANH[ÃA]/i.test(timeLabel)) return 'Amanhã'

  const compactDateMatch = timeLabel.match(/^\d{1,2}\/[a-zç]{3}/i)

  return (compactDateMatch?.[0] ?? timeLabel.split(/\s+/)[0]) || 'Próximos'
}

const getPlayerPropGroupId = (title: string) => (
  title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'proximos'
)

type HomeCompetitionPlayerPropGroup = {
  id: string
  title: string
  props: HomeCompetitionPlayerProp[]
}

const playerPropGroupOrder = new Map([
  ['Ao vivo', 0],
  ['Hoje', 1],
  ['Amanhã', 2],
])

const getPlayerPropGroups = (props: HomeCompetitionPlayerProp[]): HomeCompetitionPlayerPropGroup[] => {
  const groups: HomeCompetitionPlayerPropGroup[] = []
  const groupsByTitle = new Map<string, HomeCompetitionPlayerPropGroup>()

  props.forEach((prop) => {
    const title = getPlayerPropGroupTitle(prop)
    const existingGroup = groupsByTitle.get(title)

    if (existingGroup) {
      existingGroup.props.push(prop)
      return
    }

    const group = {
      id: getPlayerPropGroupId(title),
      title,
      props: [prop],
    }

    groupsByTitle.set(title, group)
    groups.push(group)
  })

  return groups.sort((first, second) => (
    (playerPropGroupOrder.get(first.title) ?? 10) - (playerPropGroupOrder.get(second.title) ?? 10)
  ))
}

export function HomeCompetitionOddButton({
  odd,
  className = '',
  type = 'button',
  disabled,
  ...buttonProps
}: HomeCompetitionOddButtonProps) {
  const isDisabled = disabled ?? !buttonProps.onClick

  return (
    <button
      {...buttonProps}
      className={['home-competition__odd', className].filter(Boolean).join(' ')}
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled ? 'true' : undefined}
    >
      <span>{odd.label}</span>
      <strong>{odd.value}</strong>
    </button>
  )
}

function PlayerPropOddSlider({
  prop,
  renderOddButton,
}: {
  prop: HomeCompetitionPlayerProp
  renderOddButton?: HomeCompetitionPlayerPropOddRenderer
}) {
  const oddsRef = useRef<HTMLDivElement | null>(null)
  const scrollRafRef = useRef<number | null>(null)
  const initialOddIndex = getInitialOddIndex(prop.odds)
  const dragRef = useRef<{
    startX: number
    startY: number
    scrollLeft: number
    startIndex: number
    moved: boolean
    direction: 'pending' | 'horizontal' | 'vertical'
    lastY: number
    pointerId: number
    sensitivity: number
    tapTarget: HTMLButtonElement | null
  } | null>(null)
  const suppressClickRef = useRef(false)
  const suppressClickTimeoutRef = useRef<number | null>(null)
  const lockedParentRef = useRef<HTMLElement | null>(null)
  const [activeOddIndex, setActiveOddIndex] = useState(initialOddIndex)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const setOddsElement = useCallback((node: HTMLDivElement | null) => {
    oddsRef.current = node
    if (!node) return

    window.requestAnimationFrame(() => {
      const oddEl = Array.from(node.children).filter((child) =>
        (child as HTMLElement).classList.contains('home-competition__odd')
      )[initialOddIndex] as HTMLElement | undefined

      if (!oddEl) return

      const oddCenter = oddEl.offsetLeft + oddEl.offsetWidth / 2
      node.scrollLeft = Math.max(0, oddCenter - node.clientWidth / 2)
    })
  }, [initialOddIndex])

  const getCenteredOddIndex = useCallback(() => {
    const containerEl = oddsRef.current
    if (!containerEl || containerEl.children.length === 0) return -1

    const containerCenter = containerEl.scrollLeft + containerEl.clientWidth / 2
    let nearestIndex = 0
    let nearestDistance = Number.POSITIVE_INFINITY

    Array.from(containerEl.children).forEach((child, index) => {
      const oddEl = child as HTMLElement
      if (!oddEl.classList.contains('home-competition__odd')) return

      const oddCenter = oddEl.offsetLeft + oddEl.offsetWidth / 2
      const distance = Math.abs(oddCenter - containerCenter)

      if (distance < nearestDistance) {
        nearestIndex = index
        nearestDistance = distance
      }
    })

    return Math.max(0, Math.min(prop.odds.length - 1, nearestIndex))
  }, [prop.odds.length])

  const updateScrollState = useCallback(() => {
    const containerEl = oddsRef.current
    if (!containerEl) return

    const maxScrollLeft = Math.max(0, containerEl.scrollWidth - containerEl.clientWidth)
    const centeredOddIndex = getCenteredOddIndex()

    if (centeredOddIndex >= 0) setActiveOddIndex(centeredOddIndex)
    setCanScrollLeft(containerEl.scrollLeft > 1)
    setCanScrollRight(containerEl.scrollLeft < maxScrollLeft - 1)
  }, [getCenteredOddIndex])

  // Coalesce scroll work to one run per frame. iOS fires scroll events faster than it
  // paints during momentum, and measuring the centered odd forces a synchronous layout
  // each time — running it per-event is what made this carousel stutter on iOS.
  const handleOddsScroll = useCallback(() => {
    if (scrollRafRef.current !== null) return
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null
      updateScrollState()
    })
  }, [updateScrollState])

  useEffect(() => () => {
    if (scrollRafRef.current !== null) window.cancelAnimationFrame(scrollRafRef.current)
    if (suppressClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressClickTimeoutRef.current)
      suppressClickTimeoutRef.current = null
    }
    suppressClickRef.current = false
    if (lockedParentRef.current) {
      lockedParentRef.current.style.overflowX = ''
      lockedParentRef.current = null
    }
  }, [])

  const scrollOddIntoCenter = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const containerEl = oddsRef.current
    const oddEl = Array.from(containerEl?.children ?? []).filter((child) =>
      (child as HTMLElement).classList.contains('home-competition__odd')
    )[index] as HTMLElement | undefined

    if (!containerEl || !oddEl) return

    const oddCenter = oddEl.offsetLeft + oddEl.offsetWidth / 2
    const targetScroll = oddCenter - containerEl.clientWidth / 2
    const nextScrollLeft = Math.max(0, targetScroll)

    if (behavior === 'auto') {
      containerEl.scrollLeft = nextScrollLeft
      return
    }

    containerEl.scrollTo({
      left: nextScrollLeft,
      behavior,
    })
  }, [])

  const centerOdd = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const nextIndex = Math.max(0, Math.min(prop.odds.length - 1, index))
    setActiveOddIndex(nextIndex)
    window.requestAnimationFrame(() => scrollOddIntoCenter(nextIndex, behavior))
  }, [prop.odds.length, scrollOddIntoCenter])

  const snapToNearestOdd = useCallback((dragDelta = 0, startIndex?: number) => {
    const nearestIndex = getCenteredOddIndex()
    const initialIndex = startIndex ?? activeOddIndex
    let targetIndex = nearestIndex >= 0 ? nearestIndex : initialIndex

    if (Math.abs(dragDelta) > 12 && targetIndex === initialIndex) {
      targetIndex = initialIndex + (dragDelta > 0 ? 1 : -1)
    }

    centerOdd(targetIndex)
  }, [activeOddIndex, centerOdd, getCenteredOddIndex])

  // Toggle the snap-disabling drag class SYNCHRONOUSLY (not via React state). The class
  // sets scroll-snap-type:none, and it must be active the instant we start writing
  // scrollLeft — otherwise mandatory snap yanks the content back on every move
  // ("vai um pouco e volta"). React state would apply it a render too late.
  const setDraggingClass = (active: boolean) => {
    oddsRef.current?.classList.toggle('home-competition__player-odds--dragging', active)

    // The player cards live in their OWN horizontal carousel, so the odds carousel is a
    // horizontal scroller nested inside another one. While dragging the odds, lock the
    // outer carousel — otherwise it steals the gesture and the odds barely move.
    if (active) {
      const parent = getHorizontalScrollAncestor(oddsRef.current)
      if (parent) {
        lockedParentRef.current = parent
        parent.style.overflowX = 'hidden'
      }
    } else if (lockedParentRef.current) {
      lockedParentRef.current.style.overflowX = ''
      lockedParentRef.current = null
    }
  }

  const applyVerticalScroll = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const containerEl = oddsRef.current
    if (!drag || !containerEl) return

    const verticalEl = getVerticalScrollContainer(containerEl)
    verticalEl.scrollTop += drag.lastY - event.clientY
    drag.lastY = event.clientY
  }

  const getOddTapTarget = (target: EventTarget | null, x: number, y: number) => {
    const targetElement = target instanceof Element ? target : document.elementFromPoint(x, y)
    const directTarget = targetElement?.closest<HTMLButtonElement>('.home-competition__odd') ?? null

    if (directTarget && oddsRef.current?.contains(directTarget)) return directTarget

    const pointTarget = document
      .elementFromPoint(x, y)
      ?.closest<HTMLButtonElement>('.home-competition__odd') ?? null

    return pointTarget && oddsRef.current?.contains(pointTarget) ? pointTarget : null
  }

  const isReplayableTapDistance = (deltaX: number, deltaY: number) => (
    Math.hypot(deltaX, deltaY) <= PLAYER_ODD_TAP_REPLAY_THRESHOLD
  )

  const clearClickSuppression = () => {
    if (suppressClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressClickTimeoutRef.current)
      suppressClickTimeoutRef.current = null
    }

    suppressClickRef.current = false
  }

  const suppressNextNativeClick = () => {
    clearClickSuppression()
    suppressClickRef.current = true
    suppressClickTimeoutRef.current = window.setTimeout(() => {
      suppressClickRef.current = false
      suppressClickTimeoutRef.current = null
    }, PLAYER_ODD_NATIVE_CLICK_SUPPRESS_MS)
  }

  const replayOddTap = (tapTarget: HTMLButtonElement) => {
    suppressNextNativeClick()
    tapTarget.click()
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    const containerEl = oddsRef.current
    if (!containerEl) return

    event.stopPropagation()
    containerEl.setPointerCapture?.(event.pointerId)
    if (event.pointerType === 'mouse') setDraggingClass(true)

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: containerEl.scrollLeft,
      startIndex: activeOddIndex,
      moved: false,
      direction: event.pointerType === 'mouse' ? 'horizontal' : 'pending',
      lastY: event.clientY,
      pointerId: event.pointerId,
      sensitivity: event.pointerType === 'touch'
        ? PLAYER_ODD_TOUCH_SENSITIVITY
        : PLAYER_ODD_MOUSE_SENSITIVITY,
      tapTarget: getOddTapTarget(event.target, event.clientX, event.clientY),
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const containerEl = oddsRef.current
    if (!drag || !containerEl) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    // Lock to one axis once intent is clear: horizontal scrolls the odds, vertical
    // scrolls the page (touch-action is none here, so the page can't scroll itself).
    if (drag.direction === 'pending') {
      if (absY >= PLAYER_ODD_VERTICAL_INTENT_THRESHOLD && absY > absX * PLAYER_ODD_DRAG_AXIS_RATIO) {
        drag.direction = 'vertical'
        applyVerticalScroll(event)
        return
      }

      if (absX < PLAYER_ODD_HORIZONTAL_INTENT_THRESHOLD || absX <= absY * PLAYER_ODD_DRAG_AXIS_RATIO) {
        return
      }

      drag.direction = 'horizontal'
      setDraggingClass(true)
    }

    if (event.cancelable) event.preventDefault()

    if (drag.direction === 'vertical') {
      applyVerticalScroll(event)
      return
    }

    if (drag.direction !== 'horizontal') return

    const walk = deltaX * drag.sensitivity
    drag.moved = drag.moved || absX > PLAYER_ODD_CLICK_SUPPRESS_THRESHOLD
    containerEl.scrollLeft = drag.scrollLeft - walk
  }

  const releaseOddsPointer = (pointerId: number) => {
    const containerEl = oddsRef.current
    if (containerEl?.hasPointerCapture?.(pointerId)) {
      containerEl.releasePointerCapture(pointerId)
    }
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const containerEl = oddsRef.current
    event.stopPropagation()
    releaseOddsPointer(event.pointerId)
    if (!drag) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    const shouldReplayTap = event.pointerType !== 'mouse' &&
      drag.direction !== 'horizontal' &&
      !!drag.tapTarget &&
      !drag.tapTarget.disabled &&
      drag.tapTarget.isConnected &&
      isReplayableTapDistance(deltaX, deltaY)

    if (shouldReplayTap) {
      if (event.cancelable) event.preventDefault()
      const tapTarget = drag.tapTarget!
      dragRef.current = null
      setDraggingClass(false)
      replayOddTap(tapTarget)
      return
    }

    const wasHorizontal = drag.direction === 'horizontal'
    const wasVerticalScroll = drag.direction === 'vertical' &&
      event.pointerType !== 'mouse' &&
      !isReplayableTapDistance(deltaX, deltaY)
    const dragDelta = containerEl && wasHorizontal ? containerEl.scrollLeft - drag.scrollLeft : 0
    const { startIndex, moved } = drag
    dragRef.current = null
    setDraggingClass(false)

    // Swallow the click that follows a real swipe so it never toggles a bet.
    if (wasHorizontal && moved) {
      suppressNextNativeClick()
    }

    if (wasVerticalScroll) {
      suppressNextNativeClick()
    }

    if (wasHorizontal) snapToNearestOdd(dragDelta, startIndex)
  }

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    releaseOddsPointer(event.pointerId)
    dragRef.current = null
    setDraggingClass(false)
  }

  const handleOddsClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current && event.nativeEvent.isTrusted) {
      clearClickSuppression()
      event.preventDefault()
      event.stopPropagation()
      return
    }

    const containerEl = oddsRef.current
    const clickedOdd = getOddTapTarget(event.target, event.clientX, event.clientY)
    if (!containerEl || !clickedOdd) return

    const clickedIndex = Array.from(containerEl.children)
      .filter((child) => (child as HTMLElement).classList.contains('home-competition__odd'))
      .indexOf(clickedOdd)

    if (clickedIndex >= 0) centerOdd(clickedIndex)
  }

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const movement = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (Math.abs(movement) < 12) return

    event.preventDefault()
    centerOdd(activeOddIndex + (movement > 0 ? 1 : -1))
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(updateScrollState)

    return () => window.cancelAnimationFrame(frame)
  }, [prop.odds, updateScrollState])

  return (
    <div
      className={[
        'home-competition__player-odds-frame',
        canScrollLeft ? 'home-competition__player-odds-frame--fade-left' : '',
        canScrollRight ? 'home-competition__player-odds-frame--fade-right' : '',
      ].filter(Boolean).join(' ')}
      aria-label={`Odds de ${prop.playerName}`}
      onWheel={handleWheel}
    >
      <div
        ref={setOddsElement}
        className="home-competition__player-odds"
        onScroll={handleOddsScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClickCapture={handleOddsClickCapture}
      >
        {prop.odds.map((odd, index) => {
          const className = index === activeOddIndex ? 'home-competition__odd--center' : ''
          const oddKey = `${prop.id}-${String(odd.label)}-${index}`

          if (renderOddButton) {
            return (
              <Fragment key={oddKey}>
                {renderOddButton(odd, {
                  prop,
                  index,
                  isActive: index === activeOddIndex,
                  className,
                })}
              </Fragment>
            )
          }

          return (
            <HomeCompetitionOddButton
              odd={odd}
              key={oddKey}
              className={className}
            />
          )
        })}
      </div>
    </div>
  )
}

interface HomeCompetitionSectionProps {
  activeMarketId?: string
  competition?: HomeCompetitionHighlight
  hideMarketChips?: boolean
  hideMatches?: boolean
  hideTitleRow?: boolean
  hideTitleChevron?: boolean
  matchGroups?: HomeCompetitionMatchGroup[]
  playerPropsLayout?: 'carousel' | 'grid'
  showPlayerPropsWithMatches?: boolean
  titleVariant?: 'default' | 'compact'
  className?: string
  onMatchClick?: (
    match: HomeCompetitionMatch,
    competition: HomeCompetitionHighlight,
    liveTimes: Record<string, string>
  ) => void
}

export interface HomeCompetitionMatchGroup {
  id: string
  title: string
  matches: HomeCompetitionMatch[]
}

function MatchTeamRow({
  teamName,
  score,
  sport,
}: {
  teamName: string
  score?: string
  sport: HomeCompetitionMatch['sport']
}) {
  return (
    <div className="home-competition__team-row">
      <span className="home-competition__team-info">
        <TeamLogo
          teamName={teamName}
          sport={sport}
          currentLogo={getLogoSource(teamName)}
          className="home-competition__team-logo"
          fallbackClassName="home-competition__team-logo--fallback"
          placeholderClassName="home-competition__team-logo-placeholder"
        />
        <span className="home-competition__team-name">{teamName}</span>
      </span>
      {score !== undefined && <span className="home-competition__score">{score}</span>}
    </div>
  )
}

function BasketballMarketButton({ odd }: { odd: HomeCompetitionOdd }) {
  return (
    <button
      className="home-competition__odd home-competition__odd--basketball"
      type="button"
      disabled
      aria-disabled="true"
    >
      <span>{odd.label}</span>
      <strong>{odd.value}</strong>
    </button>
  )
}

// Card com colunas de mercado (Vencer/RF + Handicap + Total). Nasceu no basquete e é
// reaproveitado pela NFL, que tem a mesma estrutura de 3 colunas x 2 linhas.
export function HomeCompetitionMarketColumnsMatchCard({
  match,
  liveTime,
  activeMarket,
  hideFooter = false,
  renderOddButton,
  onClick,
}: {
  match: HomeCompetitionMatch
  liveTime?: string
  activeMarket?: string
  hideFooter?: boolean
  renderOddButton?: HomeCompetitionMatchOddRenderer
  onClick?: () => void
}) {
  const footerLabel = match.live ? liveTime ?? match.liveClock ?? match.footerLabel : match.footerLabel
  const marketColumns = getBasketballActiveMarketColumns(match, activeMarket)
  const isCompactMarketLayout = marketColumns.length < 3
  const marketStateKey = activeMarket ?? 'default'
  const baseMarketId = activeMarket ?? normalizeBetslipIdPart(match.marketLabel)
  const isClickable = !!onClick
  const leagueLabel = match.leagueLabel?.toUpperCase()
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    onClick()
  }

  return (
    <article
      className={[
        'home-competition__match-card',
        'home-competition__match-card--basketball',
        hideFooter ? 'home-competition__match-card--no-footer' : '',
        isClickable ? 'home-competition__match-card--clickable' : '',
      ].filter(Boolean).join(' ')}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className="home-competition__basketball-header">
        <span className="home-competition__league-label">{leagueLabel}</span>
        <div
          key={`${match.id}-${marketStateKey}-basketball-headings`}
          className={`home-competition__basketball-market-headings${isCompactMarketLayout ? ' home-competition__basketball-market-headings--compact' : ''}`}
          aria-hidden="true"
        >
          {marketColumns.map((column) => (
            <span className="home-competition__basketball-market-heading" key={`${match.id}-${marketStateKey}-${column.label}`}>
              {column.label}
              {column.tag && <small>{column.tag}</small>}
            </span>
          ))}
        </div>
      </div>
      <div className="home-competition__basketball-main">
        <div className="home-competition__teams">
          <MatchTeamRow teamName={match.homeTeam} score={match.homeScore} sport={match.sport} />
          <MatchTeamRow teamName={match.awayTeam} score={match.awayScore} sport={match.sport} />
        </div>
        <div
          key={`${match.id}-${marketStateKey}-basketball-markets`}
          className={`home-competition__basketball-markets${isCompactMarketLayout ? ' home-competition__basketball-markets--compact' : ''}`}
          aria-label={`Mercados de ${match.homeTeam} contra ${match.awayTeam}`}
        >
          {marketColumns.map((column, columnIndex) => {
            const columnMarketId = `${baseMarketId}-${normalizeBetslipIdPart(column.label)}`
            const columnOdds = [
              { odd: column.homeOdd, prefix: 'home' },
              { odd: column.awayOdd, prefix: 'away' },
            ]

            return (
              <div className="home-competition__basketball-market-column" key={`${match.id}-${marketStateKey}-${column.label}`}>
                {columnOdds.map(({ odd, prefix }, oddIndex) => {
                  const index = columnIndex * 2 + oddIndex
                  const oddKey = `${match.id}-${columnMarketId}-${prefix}-${String(odd.label)}`

                  if (renderOddButton) {
                    return (
                      <Fragment key={oddKey}>
                        {renderOddButton(odd, {
                          match,
                          index,
                          marketId: columnMarketId,
                          // O cabeçalho usa o rótulo curto; quem recebe isto (betslip) usa o nome real.
                          marketLabel: column.fullLabel ?? column.label,
                          outcomeId: getOddOutcomeId(odd.label, index, prefix),
                        })}
                      </Fragment>
                    )
                  }

                  return <BasketballMarketButton odd={odd} key={oddKey} />
                })}
              </div>
            )
          })}
        </div>
      </div>
      {!hideFooter && (
        <div className="home-competition__match-footer">
          <div className="home-competition__status">
            {match.live && (
              <span className="home-competition__live-badge">
                <span className="home-competition__live-dot" />
                AO VIVO
              </span>
            )}
            <span className="home-competition__footer-label">{footerLabel}</span>
          </div>
          <span className="home-competition__more">
            Ver mais
            <img src={chevronRight} alt="" className="home-competition__chevron home-competition__chevron--secondary" />
          </span>
        </div>
      )}
    </article>
  )
}

function MatchCard({
  match,
  liveTime,
  activeMarket,
  activeMarketLabel,
  renderOddButton,
  onClick,
}: {
  match: HomeCompetitionMatch
  liveTime?: string
  activeMarket?: string
  activeMarketLabel?: string
  renderOddButton?: HomeCompetitionMatchOddRenderer
  onClick?: () => void
}) {
  const footerLabel = match.live ? liveTime ?? match.liveClock ?? match.footerLabel : match.footerLabel
  const marketOdds = getMatchMarketOdds(match, activeMarket)
  const marketStateKey = activeMarket ?? match.marketLabel
  const marketId = activeMarket ?? normalizeBetslipIdPart(match.marketLabel)
  const marketLabel = activeMarketLabel ?? match.marketLabel
  const isClickable = !!onClick
  const leagueLabel = match.leagueLabel?.toUpperCase()
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    onClick()
  }

  if ((match.sport === 'basquete' || match.sport === 'nfl') && match.marketColumns) {
    return (
      <HomeCompetitionMarketColumnsMatchCard
        match={match}
        liveTime={liveTime}
        activeMarket={activeMarket}
        renderOddButton={renderOddButton}
        onClick={onClick}
      />
    )
  }

  return (
    <article
      className={[
        'home-competition__match-card',
        `home-competition__match-card--${match.sport}`,
        isClickable ? 'home-competition__match-card--clickable' : '',
      ].filter(Boolean).join(' ')}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className="home-competition__match-header">
        <span className="home-competition__league-label">{leagueLabel}</span>
        <div className="home-competition__market">
          <div className="home-competition__market-content" key={`${match.id}-${marketStateKey}-market`}>
            <span className="home-competition__market-label">{getMatchMarketLabel(match, activeMarketLabel)}</span>
            <span className="home-competition__tags">
              {match.tags.map((tag) => (
                <span className="home-competition__tag" key={`${match.id}-${tag}`}>
                  {tag}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
      <div className="home-competition__match-main">
        <div className="home-competition__teams">
          <MatchTeamRow teamName={match.homeTeam} score={match.homeScore} sport={match.sport} />
          <MatchTeamRow teamName={match.awayTeam} score={match.awayScore} sport={match.sport} />
        </div>
        <div
          key={`${match.id}-${marketStateKey}-odds`}
          className={`home-competition__odds${marketOdds.length === 2 ? ' home-competition__odds--two' : ''}`}
          aria-label={`Odds de ${match.homeTeam} contra ${match.awayTeam}`}
        >
          {marketOdds.map((odd, index) => {
            const oddKey = `${match.id}-${marketId}-${odd.label}-${index}`

            if (renderOddButton) {
              return (
                <Fragment key={oddKey}>
                  {renderOddButton(odd, {
                    match,
                    index,
                    marketId,
                    marketLabel,
                    outcomeId: getOddOutcomeId(odd.label, index),
                  })}
                </Fragment>
              )
            }

            return <HomeCompetitionOddButton odd={odd} key={oddKey} />
          })}
        </div>
      </div>
      <div className="home-competition__match-footer">
        <div className="home-competition__status">
          {match.live && (
            <span className="home-competition__live-badge">
              <span className="home-competition__live-dot" />
              AO VIVO
            </span>
          )}
          <span className="home-competition__footer-label">{footerLabel}</span>
        </div>
        <span className="home-competition__more">
          Ver mais
          <img src={chevronRight} alt="" className="home-competition__chevron home-competition__chevron--secondary" />
        </span>
      </div>
    </article>
  )
}

function PlayerPropSingleOdd({
  prop,
  renderOddButton,
}: {
  prop: HomeCompetitionPlayerProp
  renderOddButton?: HomeCompetitionPlayerPropOddRenderer
}) {
  const odd = prop.odds[0]
  if (!odd) return null

  return (
    <div className="home-competition__player-odds-frame home-competition__player-odds-frame--single">
      <div className="home-competition__player-odds home-competition__player-odds--single">
        {renderOddButton
          ? renderOddButton(odd, {
              prop,
              index: 0,
              isActive: true,
              className: 'home-competition__odd--center',
            })
          : <HomeCompetitionOddButton odd={odd} className="home-competition__odd--center" />}
      </div>
    </div>
  )
}

export function HomeCompetitionPlayerPropCard({
  prop,
  className = '',
  matchLabel,
  timeLabel,
  showTimeLabel = true,
  showMarketLabel = true,
  oddsLayout = 'slider',
  renderOddButton,
}: {
  prop: HomeCompetitionPlayerProp
  className?: string
  matchLabel?: ReactNode
  timeLabel?: ReactNode
  showTimeLabel?: boolean
  showMarketLabel?: boolean
  // 'single' renderiza um único botão de largura total, para mercados sem linha
  // (ex.: Touchdown a qualquer momento).
  oddsLayout?: 'slider' | 'single'
  renderOddButton?: HomeCompetitionPlayerPropOddRenderer
}) {
  const resolvedTimeLabel = timeLabel ?? prop.timeLabel
  const localPlayerImage = getLocalPlayerImage(prop.teamName, prop.playerName)
  const playerImage = localPlayerImage ?? prop.playerImage ?? getPlayerPropAvatar(prop.sport)
  const playerTimeLabel = typeof resolvedTimeLabel === 'string'
    ? renderPlayerPropTimeLabel(resolvedTimeLabel)
    : <span>{resolvedTimeLabel}</span>

  return (
    <article className={`home-competition__player-card${className ? ` ${className}` : ''}`}>
      <span className="home-competition__stat-icon" aria-hidden="true">
        <img src={iconStatistic} alt="" />
      </span>
      <div className="home-competition__player-meta">
        <span className="home-competition__player-match-label">{matchLabel ?? renderPlayerPropMatchLabel(prop)}</span>
        {showTimeLabel && playerTimeLabel}
      </div>
      <div className={`home-competition__player-photo${localPlayerImage ? ' home-competition__player-photo--real' : ''}`}>
        <img src={playerImage} alt="" />
      </div>
      <div className="home-competition__player-info">
        <p>
          <strong>{prop.playerName}</strong>
          <span>{prop.position}</span>
        </p>
        {showMarketLabel && <small>{prop.marketLabel}</small>}
      </div>
      {oddsLayout === 'single' ? (
        <PlayerPropSingleOdd prop={prop} renderOddButton={renderOddButton} />
      ) : (
        <PlayerPropOddSlider prop={prop} renderOddButton={renderOddButton} />
      )}
    </article>
  )
}

export function HomeCompetitionSection({
  activeMarketId: controlledActiveMarketId,
  competition = homeCompetitionHighlight,
  hideMarketChips = false,
  hideMatches = false,
  hideTitleRow = false,
  hideTitleChevron = false,
  matchGroups,
  playerPropsLayout = 'carousel',
  showPlayerPropsWithMatches = false,
  titleVariant = 'default',
  className = '',
  onMatchClick,
}: HomeCompetitionSectionProps = {}) {
  const sectionTitleId = `home-competition-title-${competition.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const marketChips = competition.marketChips ?? emptyMarketChips
  const getOddButtonProps = useOddSelection('')
  const playerPropsGridRef = useRef<HTMLDivElement | null>(null)
  const playerPropsAnimationRef = useRef<{ fromHeight: number } | null>(null)
  const playerPropsAnimationStartTimerRef = useRef<number | null>(null)
  const playerPropsAnimationTimerRef = useRef<number | null>(null)
  const [activeMarket, setActiveMarket] = useState(() => marketChips[0]?.id)
  const [liveTimes, setLiveTimes] = useState(() => getInitialLiveTimes(competition.matches))
  const availableMarketChips = getAvailableMarketChips(competition, marketChips, liveTimes)
  const requestedActiveMarket = controlledActiveMarketId ?? activeMarket
  const activeMarketId = requestedActiveMarket && availableMarketChips.some((chip) => chip.id === requestedActiveMarket)
    ? requestedActiveMarket
    : availableMarketChips[0]?.id
  const activeMarketChip = availableMarketChips.find((chip) => chip.id === activeMarketId) ?? availableMarketChips[0]
  const isPlayerPropsMarket = activeMarketId ? playerPropsMarketIds.has(activeMarketId) : false
  const activePlayerProps = isPlayerPropsMarket
    ? competition.playerProps.filter((prop) => !prop.marketId || prop.marketId === activeMarketId)
    : competition.playerProps
  const playerPropsStateKey = `${competition.title}:${playerPropsLayout}:${isPlayerPropsMarket ? activeMarketId : 'all'}`
  const [visiblePlayerPropsState, setVisiblePlayerPropsState] = useState(() => ({
    count: PLAYER_PROPS_GRID_INITIAL_COUNT,
    key: playerPropsStateKey,
  }))
  const [enteringPlayerPropIds, setEnteringPlayerPropIds] = useState<Set<string>>(() => new Set())
  const visiblePlayerPropsCount = visiblePlayerPropsState.key === playerPropsStateKey
    ? visiblePlayerPropsState.count
    : PLAYER_PROPS_GRID_INITIAL_COUNT
  const visiblePlayerPropsMaxCount = Math.min(PLAYER_PROPS_GRID_MAX_COUNT, activePlayerProps.length)
  const shouldGroupPlayerProps = hideTitleRow && playerPropsLayout === 'grid'
  const visiblePlayerProps = playerPropsLayout === 'grid' && !shouldGroupPlayerProps
    ? activePlayerProps.slice(0, Math.min(visiblePlayerPropsCount, visiblePlayerPropsMaxCount))
    : activePlayerProps
  const [visiblePlayerPropGroupCountsState, setVisiblePlayerPropGroupCountsState] = useState<{
    key: string
    counts: Record<string, number>
  }>(() => ({
    key: playerPropsStateKey,
    counts: {},
  }))
  const marketMatches = activeMarketId
    ? competition.matches.filter((match) => isMarketAvailableForMatch(activeMarketId, match, liveTimes[match.id]))
    : competition.matches
  const marketMatchIds = new Set(marketMatches.map((match) => match.id))
  const visibleMatchGroups = matchGroups
    ? matchGroups
        .map((group) => ({
          ...group,
          matches: group.matches.filter((match) => marketMatchIds.has(match.id)),
        }))
        .filter((group) => group.matches.length > 0)
    : []
  const hasMatches = !hideMatches && (
    matchGroups ? visibleMatchGroups.length > 0 : marketMatches.length > 0
  )
  const hasAvailableMarketChips = availableMarketChips.length > 0
  const shouldShowMarketChips = !hideTitleRow && !hideMarketChips && hasAvailableMarketChips
  const shouldShowMatches = hasMatches && !isPlayerPropsMarket
  const hasPlayerProps = activePlayerProps.length > 0
  const shouldShowPlayerProps = hasPlayerProps && (
    !hasAvailableMarketChips ||
    isPlayerPropsMarket ||
    !hasMatches ||
    (showPlayerPropsWithMatches && shouldShowMatches)
  )
  const playerPropGroups = shouldGroupPlayerProps ? getPlayerPropGroups(activePlayerProps) : []
  const getPlayerPropGroupVisibleCount = (groupId: string) => (
    visiblePlayerPropGroupCountsState.key === playerPropsStateKey
      ? visiblePlayerPropGroupCountsState.counts[groupId] ?? PLAYER_PROPS_GRID_INITIAL_COUNT
      : PLAYER_PROPS_GRID_INITIAL_COUNT
  )
  const getPlayerPropGroupMaxCount = (group: HomeCompetitionPlayerPropGroup) => (
    Math.min(PLAYER_PROPS_GRID_MAX_COUNT, group.props.length)
  )
  const visiblePlayerPropGroups = shouldGroupPlayerProps
    ? playerPropGroups.map((group) => ({
        ...group,
        props: group.props.slice(0, Math.min(getPlayerPropGroupVisibleCount(group.id), getPlayerPropGroupMaxCount(group))),
      }))
    : []
  const visibleGroupedPlayerPropsCount = visiblePlayerPropGroups.reduce((total, group) => (
    total + group.props.length
  ), 0)
  const canLoadMorePlayerProps = shouldShowPlayerProps &&
    playerPropsLayout === 'grid' &&
    !shouldGroupPlayerProps &&
    visiblePlayerProps.length < visiblePlayerPropsMaxCount
  const clearPlayerPropsAnimation = useCallback(() => {
    if (playerPropsAnimationStartTimerRef.current !== null) {
      window.clearTimeout(playerPropsAnimationStartTimerRef.current)
      playerPropsAnimationStartTimerRef.current = null
    }

    if (playerPropsAnimationTimerRef.current !== null) {
      window.clearTimeout(playerPropsAnimationTimerRef.current)
      playerPropsAnimationTimerRef.current = null
    }
  }, [])

  const preparePlayerPropsAccordion = () => {
    const gridEl = playerPropsGridRef.current
    if (gridEl) {
      clearPlayerPropsAnimation()
      playerPropsAnimationRef.current = { fromHeight: gridEl.getBoundingClientRect().height }
      gridEl.classList.add('home-competition__players--accordion')
      gridEl.style.height = `${playerPropsAnimationRef.current.fromHeight}px`
      gridEl.style.overflow = 'hidden'
    }
  }

  const handleLoadMorePlayerProps = () => {
    const currentCount = Math.min(visiblePlayerPropsCount, visiblePlayerPropsMaxCount)
    const nextCount = Math.min(currentCount + PLAYER_PROPS_GRID_LOAD_STEP, visiblePlayerPropsMaxCount)

    if (nextCount <= currentCount) return

    preparePlayerPropsAccordion()
    setEnteringPlayerPropIds(new Set(
      activePlayerProps.slice(currentCount, nextCount).map((prop) => prop.id)
    ))
    setVisiblePlayerPropsState({
      count: nextCount,
      key: playerPropsStateKey,
    })
  }

  const handleLoadMorePlayerPropGroup = (group: HomeCompetitionPlayerPropGroup) => {
    const maxCount = getPlayerPropGroupMaxCount(group)
    const currentCount = Math.min(getPlayerPropGroupVisibleCount(group.id), maxCount)
    const nextCount = Math.min(currentCount + PLAYER_PROPS_GRID_LOAD_STEP, maxCount)

    if (nextCount <= currentCount) return

    preparePlayerPropsAccordion()
    setEnteringPlayerPropIds(new Set(
      group.props.slice(currentCount, nextCount).map((prop) => prop.id)
    ))
    setVisiblePlayerPropGroupCountsState((currentState) => ({
      key: playerPropsStateKey,
      counts: {
        ...(currentState.key === playerPropsStateKey ? currentState.counts : {}),
        [group.id]: nextCount,
      },
    }))
  }

  useEffect(() => {
    if (!competition.matches.some((match) => match.live)) return

    const interval = setInterval(() => {
      setLiveTimes((currentTimes) => {
        const nextTimes = { ...currentTimes }

        competition.matches.forEach((match) => {
          if (!match.live) return

          const currentTime = currentTimes[match.id] ?? match.liveClock ?? match.footerLabel
          nextTimes[match.id] = updateLiveClock(currentTime)
        })

        return nextTimes
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [competition.matches])

  useLayoutEffect(() => {
    const animation = playerPropsAnimationRef.current
    const gridEl = playerPropsGridRef.current

    if (!animation || !gridEl || playerPropsLayout !== 'grid') return

    playerPropsAnimationRef.current = null
    const fromHeight = animation.fromHeight
    gridEl.classList.remove('home-competition__players--accordion')
    gridEl.style.height = `${fromHeight}px`
    gridEl.style.overflow = 'hidden'
    void gridEl.offsetHeight

    const toHeight = gridEl.scrollHeight

    if (Math.abs(toHeight - fromHeight) < 1) {
      gridEl.style.height = ''
      gridEl.style.overflow = ''
      playerPropsAnimationStartTimerRef.current = window.setTimeout(() => {
        playerPropsAnimationStartTimerRef.current = null
        setEnteringPlayerPropIds(new Set())
      }, 0)
      return
    }

    gridEl.classList.add('home-competition__players--accordion')
    playerPropsAnimationStartTimerRef.current = window.setTimeout(() => {
      playerPropsAnimationStartTimerRef.current = null
      gridEl.style.height = `${toHeight}px`

      playerPropsAnimationTimerRef.current = window.setTimeout(() => {
        gridEl.style.height = ''
        gridEl.style.overflow = ''
        gridEl.classList.remove('home-competition__players--accordion')
        setEnteringPlayerPropIds(new Set())
        playerPropsAnimationTimerRef.current = null
      }, PLAYER_PROPS_ACCORDION_DURATION_MS)
    }, 24)

    return clearPlayerPropsAnimation
  }, [clearPlayerPropsAnimation, playerPropsLayout, visibleGroupedPlayerPropsCount, visiblePlayerProps.length])

  useEffect(() => () => {
    clearPlayerPropsAnimation()
  }, [clearPlayerPropsAnimation])

  const renderMatchOddButton: HomeCompetitionMatchOddRenderer = (odd, {
    match,
    index,
    marketId,
    marketLabel,
    outcomeId,
  }) => {
    const betslipKey = getMatchOddBetslipKey({
      sport: match.sport,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      marketId,
      outcomeId,
      label: odd.label,
    })
    const eventId = betslipKey.eventId
    const oddGroupId = betslipKey.groupId
    const eventTimeLabel = match.live
      ? liveTimes[match.id] ?? match.liveClock ?? match.footerLabel
      : match.footerLabel
    const homeTeamIcon = getLogoSource(match.homeTeam)
    const awayTeamIcon = getLogoSource(match.awayTeam)
    const leagueName = match.leagueLabel ?? competition.title
    const selectionIcon = index === 0
      ? homeTeamIcon
      : index === 2
        ? awayTeamIcon
        : undefined
    const marketKey = normalizeBetslipIdPart(marketId)
    const marketLabelKey = normalizeBetslipIdPart(marketLabel)
    const isEarlyPayoutResultMarket = match.tags.some((tag) => normalizeBetslipIdPart(tag) === 'pa')
      && (
        ['resultado-final', 'vencedor', '1x2'].includes(marketKey)
        || ['resultado-final', 'vencedor', '1x2'].includes(marketLabelKey)
      )

    return (
      <HomeCompetitionOddButton
        odd={odd}
        {...getOddButtonProps(
          `${oddGroupId}:${betslipKey.outcomeId}`,
          oddGroupId,
          '',
          createBetslipSelection({
            eventId,
            marketId: betslipKey.marketId,
            outcomeId: betslipKey.outcomeId,
            label: odd.label,
            odd: odd.value,
            marketLabel,
            eventStatus: match.live ? 'live' : 'prematch',
            sport: match.sport,
            leagueId: normalizeBetslipIdPart(leagueName),
            leagueName,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            eventName: `${match.homeTeam} x ${match.awayTeam}`,
            eventTimeLabel,
            liveClock: match.live ? eventTimeLabel : undefined,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            homeTeamIcon,
            awayTeamIcon,
            selectionIcon,
            badgeType: isEarlyPayoutResultMarket ? 'boost' : undefined,
            marketTags: match.tags,
          })
        )}
      />
    )
  }

  const renderPlayerPropOddButton: HomeCompetitionPlayerPropOddRenderer = (odd, {
    prop,
    className,
  }) => {
    // Canonical key shared with the competition screen and the event (see
    // getPlayerPropBetslipKey) so the SAME bet correlates across every surface.
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
            selectionTeamName: prop.teamAbbreviation || prop.teamName,
            selectionLabel: prop.playerName,
          })
        )}
      />
    )
  }

  const renderMatchCard = (match: HomeCompetitionMatch) => (
    <MatchCard
      match={match}
      liveTime={liveTimes[match.id]}
      activeMarket={activeMarketChip?.id}
      activeMarketLabel={activeMarketChip?.label}
      renderOddButton={renderMatchOddButton}
      onClick={onMatchClick ? () => onMatchClick(match, competition, liveTimes) : undefined}
      key={match.id}
    />
  )
  const renderPlayerPropCard = (prop: HomeCompetitionPlayerProp) => (
    <HomeCompetitionPlayerPropCard
      prop={prop}
      className={enteringPlayerPropIds.has(prop.id) ? 'home-competition__player-card--entering' : ''}
      renderOddButton={renderPlayerPropOddButton}
      key={prop.id}
    />
  )

  return (
    <section
      className={[
        'home-competition',
        hideTitleRow ? 'home-competition--without-title' : '',
        titleVariant === 'compact' ? 'home-competition--compact-title' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...(hideTitleRow ? { 'aria-label': competition.title } : { 'aria-labelledby': sectionTitleId })}
    >
      {!hideTitleRow && (
        <div className={`home-competition__title-row${shouldShowMarketChips ? ' home-competition__title-row--with-markets' : ''}`}>
          <div className="home-competition__title-main">
            <h2 id={sectionTitleId}>{competition.title}</h2>
            {!hideTitleChevron && <img src={chevronRight} alt="" className="home-competition__chevron" />}
            {competition.sportLabel && <span>{competition.sportLabel}</span>}
          </div>
          {shouldShowMarketChips && (
            <div className="home-competition__markets" role="tablist" aria-label={`Mercados de ${competition.title}`}>
              {availableMarketChips.map((chip) => {
                const isActive = activeMarketChip?.id === chip.id

                return (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`home-competition__market-tab${isActive ? ' home-competition__market-tab--active' : ''}`}
                    key={chip.id}
                    onClick={(event) => {
                      setActiveMarket(chip.id)
                      scrollMarketChipIntoView(event.currentTarget)
                    }}
                  >
                    <span>{chip.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
      <div className="home-competition__content">
        {shouldShowMatches && matchGroups && (
          <div className="home-competition__match-groups">
            {visibleMatchGroups.map((group) => (
              <section className="home-competition__match-group" aria-label={group.title} key={group.id}>
                <h3 className="home-competition__match-group-title">{group.title}</h3>
                <div className="home-competition__matches">
                  {group.matches.map((match) => renderMatchCard(match))}
                </div>
              </section>
            ))}
          </div>
        )}
        {shouldShowMatches && !matchGroups && (
          <div className="home-competition__matches">
            {marketMatches.map((match) => renderMatchCard(match))}
          </div>
        )}
        {shouldShowPlayerProps && shouldGroupPlayerProps && (
          <div
            ref={playerPropsGridRef}
            className="home-competition__player-groups"
            aria-label="Player props"
          >
            {visiblePlayerPropGroups.map((group) => {
              const sourceGroup = playerPropGroups.find((playerPropGroup) => playerPropGroup.id === group.id)
              const canLoadMoreGroup = !!sourceGroup && group.props.length < getPlayerPropGroupMaxCount(sourceGroup)

              return (
                <section className="home-competition__match-group" aria-label={group.title} key={group.id}>
                  <h3 className="home-competition__match-group-title">{group.title}</h3>
                  <div className="home-competition__players home-competition__players--grid">
                    {group.props.map((prop) => renderPlayerPropCard(prop))}
                  </div>
                  {canLoadMoreGroup && sourceGroup && (
                    <button
                      className="home-competition__load-more"
                      type="button"
                      onClick={() => handleLoadMorePlayerPropGroup(sourceGroup)}
                    >
                      <span>Carregar mais</span>
                      <img src={chevronDown} alt="" className="home-competition__load-more-icon" />
                    </button>
                  )}
                </section>
              )
            })}
          </div>
        )}
        {shouldShowPlayerProps && !shouldGroupPlayerProps && (
          <div
            ref={playerPropsLayout === 'grid' ? playerPropsGridRef : undefined}
            className={`home-competition__players${playerPropsLayout === 'grid' ? ' home-competition__players--grid' : ''}`}
            aria-label="Player props"
          >
            {visiblePlayerProps.map((prop) => renderPlayerPropCard(prop))}
          </div>
        )}
        {canLoadMorePlayerProps && (
          <button
            className="home-competition__load-more"
            type="button"
            onClick={handleLoadMorePlayerProps}
          >
            <span>Carregar mais</span>
            <img src={chevronDown} alt="" className="home-competition__load-more-icon" />
          </button>
        )}
      </div>
    </section>
  )
}
