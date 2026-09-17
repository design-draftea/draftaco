import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, type UIEvent, type WheelEvent } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { CaretRightIcon, CourtBasketballIcon, MonitorPlayIcon, SoccerBallIcon } from '@phosphor-icons/react'
import './LiveEventPage.css'

import { ContentFilterChips } from '../../../components/ContentFilterChips'
import { NflPlaysStatsBottomSheet } from '../../../components/BottomSheet'
import { MarketAccordion as LiveEventInlineMarketSection } from '../../../components/MarketAccordion'
import {
  HomeCompetitionMarketColumnsMatchCard,
  HomeCompetitionOddButton,
  HomeCompetitionPlayerPropCard,
} from '../../../components/HomeCompetitionSection'
import { PreMatchPlayerPropCard, getMatchPlayerProps, type MatchPlayerProp } from '../../../components/PreMatchSection/PreMatchSection'
import { getLivePlayerProps } from '../../../components/LiveMatchCard'
import {
  getCalendarPlayerPropsForEvent,
  type CompetitionEvent,
} from '../../../components/CalendarSection'
import type { HomeCompetitionMatch, HomeCompetitionOdd, HomeCompetitionPlayerProp } from '../../../shared/types/home'
import { getLocalPlayerImage } from '../../../data/playerImages'
import iconAoVivo from '../../../assets/iconAoVivo.png'
import iconCloseEvents from '../../../assets/iconsDraftaco/iconCloseEvents.svg'
import pagamentoAntecipado from '../../../assets/pagamentoAntecipado.png'
import substituicaoGarantida from '../../../assets/substituicaoGarantida.png'
import multiplaTurbinada from '../../../assets/multiplaTurbinada.png'
import streamingFutebol from '../../../assets/streamingFutebol.webp'
import streamingBasquete from '../../../assets/streamingBasquete.webp'
import iconBasquete from '../../../assets/iconSports/basketball.png'
import iconFutebol from '../../../assets/iconSports/soccer.png'
import playerAvatarFutebol from '../../../assets/playerAvatarFutebol.svg'
import playerAvatarBasquete from '../../../assets/playerAvatarBasquete.svg'
import arrascaetaProps from '../../../assets/arrascaetaProps.png'
import pedroProps from '../../../assets/pedroProps.png'
import depayProps from '../../../assets/depayProps.png'
import yuriProps from '../../../assets/yuriProps.png'
import flacoLopezProps from '../../../assets/flacoLopezProps.png'
import cartaoAmareloIcon from '../../../assets/iconsDraftaco/cartaoAmarelo.svg'
import cartaoVermelhoIcon from '../../../assets/iconsDraftaco/cartaoVermelho.svg'
import chutesIcon from '../../../assets/iconsDraftaco/chutes.svg'
import escanteiosIcon from '../../../assets/iconsDraftaco/escanteios.svg'
import chevronDown from '../../../assets/iconsDraftaco/chevronDown.svg'
import chevronRight from '../../../assets/iconsDraftaco/chevronRight.svg'
import ballAmericanFootball from '../../../assets/iconsDraftaco/ballAmericanFootball.svg'
import { useOddSelection } from '../../../shared/hooks/useOddSelection'
import { createBetslipSelection, getBetslipEventId, getBetslipMarketGroupId, getMatchOddBetslipKey, getPlayerPropBetslipKey } from '../../../shared/hooks/betslipUtils'
import { useSportsDbTeamLogo } from '../../../shared/hooks/useSportsDbTeamLogo'
import { getTeamAbbreviation } from '../../../shared/utils/teamAbbreviations'
import { getDownAndDistanceLabel, getNflMarketColumns, nflEventMarketChips } from '../../../shared/utils/nflMarkets'
import { shortName } from '../NflPlayReplay/playNarrative'
import { hasNflLiveClock, useNflLiveFeed, type NflLiveFeedState } from '../NflLiveFeed'
import { TEAM_LOGO_FALLBACK, isTeamLogoFallback } from '../../../shared/utils/teamLogoFallback'

export interface LiveEventMatch {
  id?: string
  leagueId?: string
  leagueName?: string
  leagueFlag?: string
  sport?: string
  isLive?: boolean
  time?: string
  dateTime?: string
  currentTime?: string
  homeTeam: { name: string; icon: string; score: number }
  awayTeam: { name: string; icon: string; score: number }
  odds: { home: string; draw?: string; away: string }
  doubleChanceOdds?: { homeOrDraw: string; homeOrAway: string; awayOrDraw: string }
  bothTeamsScoreOdds?: { yes: string; no: string }
  totalGoalsOdds?: { line: number; under: string; over: string }
  totalCornersOdds?: { line: number; under: string; over: string }
  totalPointsOdds?: { line: number; under: string; over: string }
  handicapOdds?: { line: number; home: string; away: string }
  q3TotalOdds?: { line: number; under: string; over: string }
  q4TotalOdds?: { line: number; under: string; over: string }
  // Só no futebol americano: descida, jardas para a próxima, posição da bola e posse.
  // Depois de um lance de pontuação não existe descida: `scoringPlay` vem no lugar e a
  // faixa passa a descrever o lance (`Touchdown · T.Hill`), não o próximo snap.
  footballSituation?: {
    down: number
    distance: number
    ballOn: string
    possession: 'home' | 'away'
    scoringPlay?: { result: string; scorer: string }
    /**
     * O período acabou. Aqui não há situação de campo NENHUMA para mostrar: a descida, a
     * distância e o ponto da bola são do último lance, e depois do apito eles não valem mais —
     * a próxima posse começa depois do intervalo, em outro lugar do campo. O relógio logo acima
     * já diz `Intervalo`, então a faixa fica só com o acesso às jogadas.
     */
    isPeriodOver?: boolean
  }
  extraBets?: number
}

export interface LiveEventRailItem {
  id: string
  leagueId?: string
  leagueName: string
  leagueFlag?: string
  sport: string
  isLive?: boolean
  dateTime: string
  currentTime?: string
  headerPrimary?: string
  headerSecondary?: string
  homeTeam: { name: string; icon: string; score?: number }
  awayTeam: { name: string; icon: string; score?: number }
  odds?: { home: string; draw?: string; away: string }
}

export interface LiveEventPageProps {
  isOpen: boolean
  onClose: () => void
  onOpenSettled?: () => void
  onCloseStart?: () => void
  match?: LiveEventMatch
  matches?: LiveEventMatch[]
  railEvents?: LiveEventRailItem[]
  selectedIndex?: number
  currentTimes?: Record<string, string>
  leagueName: string
  leagueFlag?: string
  sport: string
  currentTime?: string
}

export interface LiveEventInlineProps {
  match?: LiveEventMatch
  matches?: LiveEventMatch[]
  railEvents?: LiveEventRailItem[]
  selectedIndex?: number
  currentTimes?: Record<string, string>
  leagueName: string
  leagueFlag?: string
  sport: string
  currentTime?: string
  onSelectedIndexChange?: (index: number) => void
  onCompactChange?: (isCompact: boolean) => void
}

export interface LiveEventInlineHeaderProps {
  match?: LiveEventMatch
  matches?: LiveEventMatch[]
  railEvents?: LiveEventRailItem[]
  selectedIndex?: number
  currentTimes?: Record<string, string>
  leagueName: string
  leagueFlag?: string
  sport: string
  currentTime?: string
  isCompact?: boolean
  /** Abre o sheet de jogadas já montado, para a rota de atalho `/<marca>/nfl`. */
  initialStatsOpen?: boolean
  onSelectedIndexChange?: (index: number) => void
  onLayoutReady?: () => void
  onClose?: () => void
  closeControl?: 'icon' | 'all'
}

export interface LiveEventOpenPayload {
  matches: LiveEventMatch[]
  selectedIndex: number
  leagueName: string
  leagueFlag?: string
  sport: string
  currentTimes: Record<string, string>
  railEvents?: LiveEventRailItem[]
}

interface LiveEventCloseOptions {
  force?: boolean
}

interface LiveEventContentProps {
  match: LiveEventMatch
  leagueName: string
  sport: string
  currentTime: string
  isExpanded: boolean
  expansionProgress: number
  onRequestClose: (options?: LiveEventCloseOptions) => void
  onRequestExpand: () => void
  onRequestCollapse: () => void
  onExpansionProgressChange: (progress: number, options?: { deferSettle?: boolean }) => void
  onExpansionGestureEnd: (progress: number) => void
  onCompactPullChange: (distance: number) => void
  onCompactPullEnd: (distance: number) => void
  onBlockNextClose: () => void
  onSwipeStart: () => void
  onSwipeMove: (dx: number) => void
  onSwipeEnd: (dx: number, velocity: number) => void
  disableSheetInteractions?: boolean
}

type TabId = 'transmissao' | 'campo'
type DetailTabId = 'destaques' | 'criar-aposta' | 'cartoes' | 'times' | 'jogadores'

const detailTabs: Array<{ id: DetailTabId; label: string }> = [
  { id: 'destaques', label: 'Destaques' },
  { id: 'criar-aposta', label: 'Criar Aposta' },
  { id: 'cartoes', label: 'Cartões' },
  { id: 'times', label: 'Times' },
  { id: 'jogadores', label: 'Jogadores' },
]

interface ShotOutcome {
  label: string
  odd: string
  labelParts?: [string, string]
}

interface PlayerShotMarket {
  id: string
  player: string
  team: string
  position?: string
  image?: string
  outcomes: ShotOutcome[]
}

interface TotalGoalsMarketRow {
  id: string
  under: ShotOutcome
  over: ShotOutcome
}

interface ThreeWayMarketRow {
  id: string
  options: ShotOutcome[]
}

const shotOutcomes = (values: Array<[string, string]>): ShotOutcome[] =>
  values.map(([label, odd]) => ({ label, odd }))

const LIVE_EVENT_HOME_FALLBACK_GLOW = '#00a0dd'
const LIVE_EVENT_AWAY_FALLBACK_GLOW = '#ad0924'
const LIVE_EVENT_LOGO_COLOR_CANVAS_MAX_SIZE = 72
const LIVE_EVENT_PLAYER_PROPS_PER_MARKET = 10
const LIVE_EVENT_PLAYER_PROPS_PER_TEAM = Math.ceil(LIVE_EVENT_PLAYER_PROPS_PER_MARKET / 2)
const LIVE_EVENT_INLINE_PLAYER_PROPS_INITIAL_COUNT = 4
const LIVE_EVENT_INLINE_PLAYER_PROPS_MAX_COUNT = 8
const LIVE_EVENT_INLINE_PLAYER_PROPS_LOAD_STEP = 2
const LIVE_EVENT_INLINE_PLAYER_PROPS_ACCORDION_DURATION_MS = 600
const LIVE_EVENT_INLINE_SHOW_STREAM_BLOCK = false
const LIVE_EVENT_INLINE_ENABLE_ODD_ACTIONS = true
const logoDominantColorCache = new Map<string, string | null>()
const pendingLogoDominantColorRequests = new Map<string, Promise<string | null>>()

const teamGlowFallbackColors: Record<string, string> = {
  Flamengo: '#e31b23',
  Cruzeiro: '#2f6dff',
  Internacional: '#d71920',
  Inter: '#2d7dff',
  Bragantino: '#f4f4f4',
  'Red Bull Bragantino': '#f4f4f4',
  Vasco: '#f4f4f4',
  Corinthians: '#f4f4f4',
  Palmeiras: '#1f9f55',
  Fluminense: '#8d1230',
  Botafogo: '#f4f4f4',
  'Atl. Mineiro': '#f4f4f4',
  'Atlético-MG': '#f4f4f4',
  'São Paulo': '#e63232',
  Mirassol: '#ffd23a',
  Barcelona: '#a31745',
  Bayern: '#dc052d',
  PSG: '#2d5eff',
  'Real Madrid': '#f4f4f4',
  Liverpool: '#d00027',
  Arsenal: '#ef0107',
  Chelsea: '#034694',
  'Manchester City': '#6cabdd',
  Jazz: '#002b5c',
  Thunder: '#007ac1',
  Knicks: '#f58426',
  Magic: '#0077c0',
  Bulls: '#ce1141',
  Heat: '#98002e',
  Warriors: '#1d428a',
  Lakers: '#552583',
  Pistons: '#1d42ba',
  Cavaliers: '#860038',
  '76ers': '#006bb6',
  Celtics: '#007a33',
  Nuggets: '#0e2240',
  Suns: '#1d1160',
  Mavericks: '#00538c',
  Spurs: '#c4ced4',
  Clippers: '#c8102e',
  Kings: '#5a2d81',
  'Kennesaw State': '#fdb927',
  'Southern Wesleyan': '#005eb8',
  Paulistano: '#d71920',
  Unifacisa: '#004b93',
  Minas: '#f4c430',
  Pinheiros: '#005baa',
  Valencia: '#f37021',
  'Virtus Bologna': 'var(--ds-fill-dark, #000000)',
  Varese: '#c8102e',
  Tortona: 'var(--ds-fill-dark, #000000)',
  Fenerbahçe: '#f6c500',
}

interface LogoColorBucket {
  r: number
  g: number
  b: number
  count: number
  score: number
}

function getLogoGlowStyle(glowColor: string): CSSProperties {
  return {
    ['--live-event-team-glow' as string]: glowColor,
  } as CSSProperties
}

function getTeamGlowFallbackColor(teamName: string): string {
  const trimmedName = teamName.trim()
  if (teamGlowFallbackColors[trimmedName]) return teamGlowFallbackColors[trimmedName]

  let hash = 0
  for (let i = 0; i < trimmedName.length; i++) {
    hash = (hash * 31 + trimmedName.charCodeAt(i)) >>> 0
  }

  return `hsl(${hash % 360} 72% 58%)`
}

function rgbToHslStats(r: number, g: number, b: number) {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2

  if (max === min) {
    return { saturation: 0, lightness }
  }

  const delta = max - min
  const saturation = lightness > 0.5
    ? delta / (2 - max - min)
    : delta / (max + min)

  return { saturation, lightness }
}

function getLogoPixelScore(r: number, g: number, b: number, a: number) {
  const alpha = a / 255
  if (alpha < 0.25) return 0

  const { saturation, lightness } = rgbToHslStats(r, g, b)
  const neutralPenalty = saturation < 0.16 ? 0.32 : 1
  const nearWhitePenalty = saturation < 0.12 && lightness > 0.82 ? 0.18 : 1
  const nearBlackPenalty = saturation < 0.12 && lightness < 0.14 ? 0.08 : 1
  const lightnessWeight = Math.max(0.4, 1 - Math.abs(lightness - 0.55) * 0.55)

  return alpha * (0.32 + saturation * 2.4) * neutralPenalty * nearWhitePenalty * nearBlackPenalty * lightnessWeight
}

function formatLogoColorBucket(bucket: LogoColorBucket) {
  const r = Math.round(bucket.r / bucket.count)
  const g = Math.round(bucket.g / bucket.count)
  const b = Math.round(bucket.b / bucket.count)

  return `rgb(${r}, ${g}, ${b})`
}

function getDominantLogoColorFromPixels(pixels: Uint8ClampedArray) {
  const buckets = new Map<string, LogoColorBucket>()

  for (let index = 0; index < pixels.length; index += 4) {
    const r = pixels[index]
    const g = pixels[index + 1]
    const b = pixels[index + 2]
    const a = pixels[index + 3]
    const score = getLogoPixelScore(r, g, b, a)

    if (score <= 0) continue

    const bucketKey = `${Math.floor(r / 24)}-${Math.floor(g / 24)}-${Math.floor(b / 24)}`
    const bucket = buckets.get(bucketKey)

    if (bucket) {
      bucket.r += r
      bucket.g += g
      bucket.b += b
      bucket.count += 1
      bucket.score += score
    } else {
      buckets.set(bucketKey, { r, g, b, count: 1, score })
    }
  }

  let dominantBucket: LogoColorBucket | null = null

  buckets.forEach((bucket) => {
    if (!dominantBucket || bucket.score > dominantBucket.score) {
      dominantBucket = bucket
    }
  })

  return dominantBucket ? formatLogoColorBucket(dominantBucket) : null
}

function loadLogoImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Unable to load logo image: ${src}`))
    image.src = src
  })
}

const isRemoteLogoColorExtractionBlocked = (src: string) => (
  /^https:\/\/r2\.thesportsdb\.com\//i.test(src)
)

async function extractDominantLogoColor(src: string): Promise<string | null> {
  if (logoDominantColorCache.has(src)) return logoDominantColorCache.get(src) ?? null

  const pendingRequest = pendingLogoDominantColorRequests.get(src)
  if (pendingRequest) return pendingRequest

  const request = loadLogoImage(src)
    .then((image) => {
      const maxDimension = Math.max(image.naturalWidth, image.naturalHeight)
      if (maxDimension <= 0) return null

      const scale = Math.min(1, LIVE_EVENT_LOGO_COLOR_CANVAS_MAX_SIZE / maxDimension)
      const width = Math.max(1, Math.round(image.naturalWidth * scale))
      const height = Math.max(1, Math.round(image.naturalHeight * scale))
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', { willReadFrequently: true })

      if (!context) return null

      canvas.width = width
      canvas.height = height
      context.clearRect(0, 0, width, height)
      context.drawImage(image, 0, 0, width, height)

      return getDominantLogoColorFromPixels(context.getImageData(0, 0, width, height).data)
    })
    .catch(() => null)
    .then((color) => {
      logoDominantColorCache.set(src, color)
      pendingLogoDominantColorRequests.delete(src)
      return color
    })

  pendingLogoDominantColorRequests.set(src, request)
  return request
}

function useLogoGlowColor(src: string | undefined, teamName: string, isFallback: boolean, fallbackGlowColor: string) {
  const [resolvedLogoColor, setResolvedLogoColor] = useState<{ src: string; color: string | null } | null>(null)
  const teamGlowFallbackColor = getTeamGlowFallbackColor(teamName)

  useEffect(() => {
    if (!src || isFallback || isRemoteLogoColorExtractionBlocked(src) || logoDominantColorCache.has(src)) return

    let isCancelled = false

    void extractDominantLogoColor(src).then((dominantColor) => {
      if (!isCancelled) {
        setResolvedLogoColor({ src, color: dominantColor })
      }
    })

    return () => {
      isCancelled = true
    }
  }, [isFallback, src])

  if (!src || isFallback) return fallbackGlowColor
  if (isRemoteLogoColorExtractionBlocked(src)) return teamGlowFallbackColor
  if (logoDominantColorCache.has(src)) return logoDominantColorCache.get(src) ?? teamGlowFallbackColor
  if (resolvedLogoColor?.src === src) return resolvedLogoColor.color ?? teamGlowFallbackColor

  return teamGlowFallbackColor
}

function getDoubleChanceDisplayName(teamName: string): string {
  return getInlineTeamAbbreviation(teamName)
}

const teamShotMarkets: Record<string, PlayerShotMarket[]> = {
  Flamengo: [
    { id: 'flamengo-arrascaeta', player: 'Arrascaeta', team: 'Flamengo', image: arrascaetaProps, outcomes: shotOutcomes([['0.5+', '1.55x'], ['1.5+', '2.05x'], ['2.5+', '3.80x']]) },
    { id: 'flamengo-pedro', player: 'Pedro', team: 'Flamengo', image: pedroProps, outcomes: shotOutcomes([['1.0+', '1.45x'], ['2.0+', '1.95x'], ['3.0+', '3.55x']]) },
  ],
  Cruzeiro: [
    { id: 'cruzeiro-matheus-pereira', player: 'Matheus Pereira', team: 'Cruzeiro', outcomes: shotOutcomes([['0.5+', '1.72x'], ['1.5+', '2.45x'], ['2.5+', '5.20x']]) },
    { id: 'cruzeiro-kaio-jorge', player: 'Kaio Jorge', team: 'Cruzeiro', outcomes: shotOutcomes([['0.5+', '1.82x'], ['1.5+', '2.65x'], ['2.5+', '5.80x']]) },
  ],
  Vasco: [
    { id: 'vasco-vegetti', player: 'Vegetti', team: 'Vasco', outcomes: shotOutcomes([['0.5+', '1.62x'], ['1.5+', '2.28x'], ['2.5+', '4.75x']]) },
    { id: 'vasco-payet', player: 'Payet', team: 'Vasco', outcomes: shotOutcomes([['0.5+', '1.95x'], ['1.5+', '3.10x'], ['2.5+', '7.00x']]) },
  ],
  Corinthians: [
    { id: 'corinthians-memphis', player: 'Memphis Depay', team: 'Corinthians', image: depayProps, outcomes: shotOutcomes([['1.0+', '1.62x'], ['2.0+', '2.18x'], ['3.0+', '4.10x']]) },
    { id: 'corinthians-yuri', player: 'Yuri Alberto', team: 'Corinthians', image: yuriProps, outcomes: shotOutcomes([['1.0+', '1.58x'], ['2.0+', '2.12x'], ['3.0+', '3.95x']]) },
  ],
  Internacional: [
    { id: 'internacional-alan-patrick', player: 'Alan Patrick', team: 'Internacional', outcomes: shotOutcomes([['0.5+', '1.78x'], ['1.5+', '2.55x'], ['2.5+', '5.60x']]) },
    { id: 'internacional-valencia', player: 'Enner Valencia', team: 'Internacional', outcomes: shotOutcomes([['0.5+', '1.66x'], ['1.5+', '2.32x'], ['2.5+', '4.90x']]) },
  ],
  Bragantino: [
    { id: 'bragantino-sasha', player: 'Eduardo Sasha', team: 'Bragantino', outcomes: shotOutcomes([['0.5+', '1.82x'], ['1.5+', '2.72x'], ['2.5+', '6.00x']]) },
    { id: 'bragantino-jhon-jhon', player: 'Jhon Jhon', team: 'Bragantino', outcomes: shotOutcomes([['0.5+', '2.05x'], ['1.5+', '3.30x'], ['2.5+', '8.00x']]) },
  ],
  Mirassol: [
    { id: 'mirassol-negueba', player: 'Negueba', team: 'Mirassol', outcomes: shotOutcomes([['0.5+', '2.10x'], ['1.5+', '3.55x'], ['2.5+', '8.50x']]) },
    { id: 'mirassol-reinaldo', player: 'Reinaldo', team: 'Mirassol', outcomes: shotOutcomes([['0.5+', '2.22x'], ['1.5+', '3.80x'], ['2.5+', '9.00x']]) },
  ],
  'São Paulo': [
    { id: 'sao-paulo-calleri', player: 'Calleri', team: 'São Paulo', outcomes: shotOutcomes([['0.5+', '1.62x'], ['1.5+', '2.24x'], ['2.5+', '4.65x']]) },
    { id: 'sao-paulo-luciano', player: 'Luciano', team: 'São Paulo', outcomes: shotOutcomes([['0.5+', '1.84x'], ['1.5+', '2.78x'], ['2.5+', '6.20x']]) },
  ],
  Palmeiras: [
    { id: 'palmeiras-flaco', player: 'Flaco Lopez', team: 'Palmeiras', image: flacoLopezProps, outcomes: shotOutcomes([['1.0+', '1.42x'], ['2.0+', '1.88x'], ['3.0+', '3.25x']]) },
    { id: 'palmeiras-veiga', player: 'Raphael Veiga', team: 'Palmeiras', outcomes: shotOutcomes([['0.5+', '1.74x'], ['1.5+', '2.48x'], ['2.5+', '5.40x']]) },
  ],
  Fluminense: [
    { id: 'fluminense-cano', player: 'Cano', team: 'Fluminense', outcomes: shotOutcomes([['0.5+', '1.70x'], ['1.5+', '2.40x'], ['2.5+', '5.10x']]) },
    { id: 'fluminense-arias', player: 'Arias', team: 'Fluminense', outcomes: shotOutcomes([['0.5+', '1.88x'], ['1.5+', '2.90x'], ['2.5+', '6.75x']]) },
  ],
  Botafogo: [
    { id: 'botafogo-igor-jesus', player: 'Igor Jesus', team: 'Botafogo', outcomes: shotOutcomes([['0.5+', '1.68x'], ['1.5+', '2.35x'], ['2.5+', '5.00x']]) },
    { id: 'botafogo-savarino', player: 'Savarino', team: 'Botafogo', outcomes: shotOutcomes([['0.5+', '1.92x'], ['1.5+', '3.05x'], ['2.5+', '7.25x']]) },
  ],
  'Atl. Mineiro': [
    { id: 'atletico-mg-hulk', player: 'Hulk', team: 'Atl. Mineiro', outcomes: shotOutcomes([['0.5+', '1.48x'], ['1.5+', '2.02x'], ['2.5+', '4.10x']]) },
    { id: 'atletico-mg-paulinho', player: 'Paulinho', team: 'Atl. Mineiro', outcomes: shotOutcomes([['0.5+', '1.70x'], ['1.5+', '2.48x'], ['2.5+', '5.40x']]) },
  ],
  'Atlético-MG': [
    { id: 'atletico-mg-hulk-alt', player: 'Hulk', team: 'Atlético-MG', outcomes: shotOutcomes([['0.5+', '1.48x'], ['1.5+', '2.02x'], ['2.5+', '4.10x']]) },
    { id: 'atletico-mg-paulinho-alt', player: 'Paulinho', team: 'Atlético-MG', outcomes: shotOutcomes([['0.5+', '1.70x'], ['1.5+', '2.48x'], ['2.5+', '5.40x']]) },
  ],
  Barcelona: [
    { id: 'barcelona-lewandowski', player: 'Lewandowski', team: 'Barcelona', outcomes: shotOutcomes([['0.5+', '1.38x'], ['1.5+', '1.78x'], ['2.5+', '3.10x']]) },
    { id: 'barcelona-raphinha', player: 'Raphinha', team: 'Barcelona', outcomes: shotOutcomes([['0.5+', '1.66x'], ['1.5+', '2.28x'], ['2.5+', '4.60x']]) },
  ],
  Bayern: [
    { id: 'bayern-kane', player: 'Harry Kane', team: 'Bayern', outcomes: shotOutcomes([['0.5+', '1.32x'], ['1.5+', '1.70x'], ['2.5+', '2.95x']]) },
    { id: 'bayern-musiala', player: 'Musiala', team: 'Bayern', outcomes: shotOutcomes([['0.5+', '1.78x'], ['1.5+', '2.70x'], ['2.5+', '6.00x']]) },
  ],
  PSG: [
    { id: 'psg-dembele', player: 'Dembélé', team: 'PSG', outcomes: shotOutcomes([['0.5+', '1.62x'], ['1.5+', '2.24x'], ['2.5+', '4.85x']]) },
    { id: 'psg-ramos', player: 'Gonçalo Ramos', team: 'PSG', outcomes: shotOutcomes([['0.5+', '1.58x'], ['1.5+', '2.20x'], ['2.5+', '4.70x']]) },
  ],
  'Paris Saint-Germain': [
    { id: 'paris-saint-germain-dembele', player: 'Dembélé', team: 'Paris Saint-Germain', outcomes: shotOutcomes([['0.5+', '1.62x'], ['1.5+', '2.24x'], ['2.5+', '4.85x']]) },
    { id: 'paris-saint-germain-ramos', player: 'Gonçalo Ramos', team: 'Paris Saint-Germain', outcomes: shotOutcomes([['0.5+', '1.58x'], ['1.5+', '2.20x'], ['2.5+', '4.70x']]) },
  ],
  'Manchester City': [
    { id: 'manchester-city-haaland', player: 'Haaland', team: 'Manchester City', outcomes: shotOutcomes([['1.0+', '1.48x'], ['2.0+', '1.92x'], ['3.0+', '3.55x']]) },
    { id: 'manchester-city-foden', player: 'Foden', team: 'Manchester City', outcomes: shotOutcomes([['0.5+', '1.74x'], ['1.5+', '2.55x'], ['2.5+', '5.60x']]) },
  ],
  Inter: [
    { id: 'inter-lautaro', player: 'Lautaro Martínez', team: 'Inter', outcomes: shotOutcomes([['0.5+', '1.50x'], ['1.5+', '2.08x'], ['2.5+', '4.35x']]) },
    { id: 'inter-thuram', player: 'Thuram', team: 'Inter', outcomes: shotOutcomes([['0.5+', '1.72x'], ['1.5+', '2.52x'], ['2.5+', '5.70x']]) },
  ],
}

const liveEventPlayerTeamAliases: Record<string, string> = {
  'Paris Saint-Germain': 'PSG',
  'Man. City': 'Manchester City',
  'Utah Jazz': 'Jazz',
  'Oklahoma City Thunder': 'Thunder',
  'New York Knicks': 'Knicks',
  'Orlando Magic': 'Magic',
  'Chicago Bulls': 'Bulls',
  'Miami Heat': 'Heat',
  'Golden State Warriors': 'Warriors',
  'Los Angeles Lakers': 'Lakers',
  'Philadelphia 76ers': '76ers',
  'Boston Celtics': 'Celtics',
  'Denver Nuggets': 'Nuggets',
  'Phoenix Suns': 'Suns',
  'Dallas Mavericks': 'Mavericks',
  'San Antonio Spurs': 'Spurs',
  'Los Angeles Clippers': 'Clippers',
  'LA Clippers': 'Clippers',
  'Sacramento Kings': 'Kings',
}

function getLiveEventPlayerTeamKey(teamName: string): string {
  const trimmedTeamName = teamName.trim()
  return liveEventPlayerTeamAliases[trimmedTeamName] ?? trimmedTeamName
}

const basketballTeamPlayers: Record<string, string[]> = {
  Jazz: ['Lauri Markkanen', 'Keyonte George', 'John Collins', 'Walker Kessler'],
  Thunder: ['Shai Gilgeous-Alexander', 'Jalen Williams', 'Chet Holmgren', 'Luguentz Dort'],
  Knicks: ['Jalen Brunson', 'Karl-Anthony Towns', 'Mikal Bridges', 'Josh Hart'],
  Magic: ['Paolo Banchero', 'Franz Wagner', 'Jalen Suggs', 'Wendell Carter Jr.'],
  Bulls: ['Coby White', 'Zach LaVine', 'Nikola Vucevic', 'Josh Giddey'],
  Heat: ['Tyler Herro', 'Bam Adebayo', 'Jimmy Butler', 'Jaime Jaquez Jr.'],
  Warriors: ['Stephen Curry', 'Jonathan Kuminga', 'Draymond Green', 'Brandin Podziemski'],
  Lakers: ['LeBron James', 'Luka Doncic', 'Austin Reaves', 'Rui Hachimura'],
  '76ers': ['Tyrese Maxey', 'Joel Embiid', 'Paul George', 'Kelly Oubre Jr.'],
  Celtics: ['Jayson Tatum', 'Jaylen Brown', 'Derrick White', 'Kristaps Porzingis'],
  Nuggets: ['Nikola Jokic', 'Jamal Murray', 'Michael Porter Jr.', 'Aaron Gordon'],
  Suns: ['Devin Booker', 'Kevin Durant', 'Bradley Beal', 'Grayson Allen'],
  Mavericks: ['Luka Doncic', 'Kyrie Irving', 'Klay Thompson', 'Dereck Lively II'],
  Spurs: ['Victor Wembanyama', 'Devin Vassell', 'Keldon Johnson', 'Jeremy Sochan'],
  Clippers: ['Kawhi Leonard', 'James Harden', 'Ivica Zubac', 'Norman Powell'],
  Kings: ['DeAaron Fox', 'Domantas Sabonis', 'Keegan Murray', 'Malik Monk'],
  'Southern Wesleyan': ['Julian Cameron', 'Marcus Reed', 'Tyler Harris', 'Noah Brooks'],
  'Kennesaw State': ['Terrell Burden', 'Demond Robinson', 'Simeon Cottle', 'Adrian Wooley'],
  'AEPS Machitis': ['Nikos Pappas', 'Dimitris Kosmas', 'Giorgos Theodorou', 'Alexandros Ioannou'],
  'ASA Koroivos': ['Vasilis Mouratos', 'Kostas Papadakis', 'Antonis Koniaris', 'Marios Georgiou'],
  'Vanoli Cremona': ['Trevor Lacey', 'Peyton Willis', 'Davide Denegri', 'Paul Eboua'],
  Varese: ['Nico Mannion', 'Davide Alviti', 'Skylar Spencer', 'Jordan Harris'],
  'Virtus Bologna': ['Tornike Shengelia', 'Marco Belinelli', 'Daniel Hackett', 'Ante Zizic'],
  Tortona: ['Tommaso Baldasso', 'Kyle Weems', 'Chris Dowe', 'Ismael Kamagate'],
  Beroe: ['Ivan Lilov', 'Pavel Marinov', 'Nikolay Stoyanov', 'Martin Georgiev'],
  'Balkan Botevgrad': ['Dimitur Dimitrov', 'Manny Suarez', 'Pavlin Ivanov', 'Mihailo Vasic'],
  Lafayette: ['Devin Hines', 'Kyle Jenkins', 'Ryan Pettit', 'Caleb Williams'],
  Pennsylvania: ['Clark Slajchert', 'Nick Spinoso', 'Sam Brown', 'Ethan Roberts'],
  'South Carolina St.': ['Mitchel Taylor', 'Davion Everett', 'Michael Teal', 'Jordan Simpson'],
  Charleston: ['Ante Brzovic', 'Reyne Smith', 'Ben Burnham', 'CJ Fulton'],
  Southern: ['Brandon Davis', 'Michael Jacobs', 'Tyrone Lyons', 'Kendal Coleman'],
  Texas: ['Max Abmas', 'Dylan Disu', 'Tyrese Hunter', 'Kadin Shedrick'],
  Besiktas: ['Derek Needham', 'Matt Mitchell', 'Jonah Mathews', 'Kerem Konan'],
  Lietkabelis: ['Gediminas Orelik', 'Vytenis Lipkevicius', 'Kristupas Zemaitis', 'Deividas Sirvydis'],
  'Chemnitz 99': ['Aher Uguak', 'Kaza Kajami-Keane', 'Wes van Beck', 'Jeff Garrett'],
  Panionios: ['Kendrick Ray', 'Giorgos Tsalmpouris', 'Nikos Gikas', 'Stelios Poulianitis'],
  'Hapoel Jerusalem': ['Levi Randolph', 'Khadeen Carrington', 'Austin Wiley', 'Yovel Zoosman'],
  'Hamburg Towers': ['Brae Ivey', 'Jordan Barnett', 'Jonas Wohlfarth-Bottermann', 'Nico Brauner'],
  Paulistano: ['Dalaqua', 'Gemadinha', 'Victao', 'Ruiz'],
  Unifacisa: ['Trevor Gaskins', 'Barnes', 'Gerson', 'Nesbitt'],
  Botafogo: ['Coelho', 'Pastor', 'Machado', 'Maique'],
  'Caxias do Sul': ['Alexey', 'Miller', 'Enzo', 'Pedro'],
  Flamengo: ['Didi Louzada', 'Gabriel Jaú', 'Olivinha', 'Alexey Borges'],
  Minas: ['Shaq Johnson', 'Gui Deodato', 'Danilo Fuzaro', 'Renan Lenz'],
  'São Paulo': ['Miller', 'Tyrone', 'Coelho', 'Maique'],
  Pinheiros: ['Ruivo', 'Munford', 'André Góes', 'Renan'],
  Valencia: ['Chris Jones', 'Brandon Davies', 'Semi Ojeleye', 'Xabi Lopez-Arostegui'],
  'USK Praha': ['Ondrej Sehnal', 'Matej Vanka', 'David Bohm', 'Martin Peterka'],
  Bourges: ['Sarah Michel', 'Laetitia Guapo', 'Kayla Alexander', 'Alix Duchet'],
  'Lyon ASVEL': ['Marine Johannes', 'Gabby Williams', 'Julie Allemand', 'Dominique Malonga'],
  Fenerbahçe: ['Emma Meesseman', 'Kayla McBride', 'Satou Sabally', 'Alina Iagupova'],
  Sopron: ['Briann January', 'Virag Kiss', 'Zsofia Fegyverneky', 'Megan Walker'],
  Schio: ['Marina Mabrey', 'Astou Ndour', 'Dorka Juhasz', 'Costanza Verona'],
  Girona: ['Marianna Tolo', 'Regan Magarity', 'Laura Pena', 'Carolina Guerrero'],
}

function slugifyTeamName(teamName: string): string {
  return teamName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function getFootballTeamPlayers(teamName: string): string[] {
  const teamKey = getLiveEventPlayerTeamKey(teamName)
  const marketPlayers = [
    ...(teamShotMarkets[teamName] ?? []),
    ...(teamKey !== teamName ? teamShotMarkets[teamKey] ?? [] : []),
  ].map((market) => market.player)
  const eventPlayers = (getMappedTeamEvents(teamName) ?? []).map((event) => event.player)

  return Array.from(new Set([...marketPlayers, ...eventPlayers]))
}

function buildFallbackShotMarkets(teamName: string): PlayerShotMarket[] {
  const slug = slugifyTeamName(teamName)

  return getFootballTeamPlayers(teamName).slice(0, 2).map((player, index) => ({
    id: `${slug}-${slugifyTeamName(player)}`,
    player,
    team: teamName,
    outcomes: shotOutcomes(index === 0
      ? [['0.5+', '1.78x'], ['1.5+', '2.60x'], ['2.5+', '5.75x']]
      : [['0.5+', '1.88x'], ['1.5+', '2.85x'], ['2.5+', '6.40x']]),
  }))
}

const supplementalShotOutcomes = [
  shotOutcomes([['0.5+', '1.78x'], ['1.5+', '2.60x'], ['2.5+', '5.75x']]),
  shotOutcomes([['0.5+', '1.88x'], ['1.5+', '2.85x'], ['2.5+', '6.40x']]),
  shotOutcomes([['0.5+', '2.05x'], ['1.5+', '3.25x'], ['2.5+', '7.50x']]),
  shotOutcomes([['0.5+', '2.22x'], ['1.5+', '3.70x'], ['2.5+', '8.80x']]),
]

const supplementalAssistOutcomes = [
  shotOutcomes([['1.0+', '1.68x'], ['2.0+', '2.35x'], ['3.0+', '4.20x']]),
  shotOutcomes([['1.0+', '1.74x'], ['2.0+', '2.50x'], ['3.0+', '4.60x']]),
  shotOutcomes([['1.0+', '1.82x'], ['2.0+', '2.70x'], ['3.0+', '5.10x']]),
  shotOutcomes([['1.0+', '1.92x'], ['2.0+', '2.95x'], ['3.0+', '5.80x']]),
]

function normalizePlayerName(playerName: string): string {
  return slugifyTeamName(playerName.replace(/\s+/g, ' '))
}

function hasPlayer(rows: PlayerShotMarket[], playerName: string): boolean {
  const normalizedPlayer = normalizePlayerName(playerName)
  return rows.some((row) => normalizePlayerName(row.player) === normalizedPlayer)
}

function buildSupplementalShotMarket(teamName: string, playerName: string, index: number): PlayerShotMarket {
  return {
    id: `${slugifyTeamName(teamName)}-${normalizePlayerName(playerName)}-${index}`,
    player: playerName,
    team: teamName,
    outcomes: supplementalShotOutcomes[index % supplementalShotOutcomes.length],
  }
}

function buildSupplementalAssistMarket(teamName: string, playerName: string, index: number, isBasketball: boolean): PlayerShotMarket {
  return {
    id: `${slugifyTeamName(teamName)}-${normalizePlayerName(playerName)}-assist-${index}`,
    player: playerName,
    team: teamName,
    position: isBasketball ? 'AST' : 'MEI',
    outcomes: supplementalAssistOutcomes[index % supplementalAssistOutcomes.length],
  }
}

function getTeamShotMarketRows(teamName: string, playerLimit = 4): PlayerShotMarket[] {
  const teamKey = getLiveEventPlayerTeamKey(teamName)
  const baseRows = teamShotMarkets[teamName] ?? teamShotMarkets[teamKey] ?? buildFallbackShotMarkets(teamName)
  const rows = baseRows.map((row) => ({
    ...row,
    id: row.team === teamName ? row.id : `${slugifyTeamName(teamName)}-${row.id}`,
    team: teamName,
  }))
  const candidates = getFootballTeamPlayers(teamName)

  for (const playerName of candidates) {
    if (rows.length >= playerLimit) break
    if (hasPlayer(rows, playerName)) continue
    rows.push(buildSupplementalShotMarket(teamName, playerName, rows.length))
  }

  return rows.slice(0, playerLimit)
}

function getShotsOnGoalRows(match: LiveEventMatch, isExpanded: boolean): PlayerShotMarket[] {
  const playerLimit = isExpanded ? LIVE_EVENT_PLAYER_PROPS_PER_MARKET : 4
  const teamPlayerLimit = isExpanded ? LIVE_EVENT_PLAYER_PROPS_PER_TEAM : 4
  const rows = [
    ...getTeamShotMarketRows(match.homeTeam.name, teamPlayerLimit),
    ...getTeamShotMarketRows(match.awayTeam.name, teamPlayerLimit),
  ]
  return rows.slice(0, playerLimit)
}

function formatMarketLine(line: number): string {
  return Number.isInteger(line) ? `${line}.0` : `${line}`
}

function getBasketballTeamPlayers(teamName: string, playerLimit?: number): string[] {
  const teamKey = getLiveEventPlayerTeamKey(teamName)
  const mappedPlayers = [
    ...(basketballTeamPlayers[teamName] ?? []),
    ...(teamKey !== teamName ? basketballTeamPlayers[teamKey] ?? [] : []),
  ]
  const players = Array.from(new Set(mappedPlayers))

  return typeof playerLimit === 'number' ? players.slice(0, playerLimit) : players
}

function buildBasketballPlayerPointMarket(teamName: string, playerName: string, index: number): PlayerShotMarket {
  const baseLine = 8.5 + index * 2

  return {
    id: `${slugifyTeamName(teamName)}-${normalizePlayerName(playerName)}-points`,
    player: playerName,
    team: teamName,
    position: 'PTS',
    outcomes: shotOutcomes([
      [`${formatMarketLine(baseLine)}+`, `${(1.48 + index * 0.08).toFixed(2)}x`],
      [`${formatMarketLine(baseLine + 5)}+`, `${(2.05 + index * 0.16).toFixed(2)}x`],
      [`${formatMarketLine(baseLine + 10)}+`, `${(3.20 + index * 0.28).toFixed(2)}x`],
    ]),
  }
}

function getBasketballTeamPlayerRows(teamName: string, playerLimit = 4): PlayerShotMarket[] {
  return getBasketballTeamPlayers(teamName, playerLimit)
    .map((playerName, index) => buildBasketballPlayerPointMarket(teamName, playerName, index))
}

function getBasketballPlayerPointRows(match: LiveEventMatch, isExpanded: boolean): PlayerShotMarket[] {
  const playerLimit = isExpanded ? LIVE_EVENT_PLAYER_PROPS_PER_MARKET : 4
  const teamPlayerLimit = isExpanded ? LIVE_EVENT_PLAYER_PROPS_PER_TEAM : 4
  const rows = [
    ...getBasketballTeamPlayerRows(match.homeTeam.name, teamPlayerLimit),
    ...getBasketballTeamPlayerRows(match.awayTeam.name, teamPlayerLimit),
  ]
  return rows.slice(0, playerLimit)
}

function getTeamAssistMarketRows(teamName: string, isBasketball: boolean, playerLimit = 4): PlayerShotMarket[] {
  const playerCandidates = isBasketball
    ? getBasketballTeamPlayers(teamName, playerLimit)
    : getFootballTeamPlayers(teamName)
  const rows: PlayerShotMarket[] = []

  for (const playerName of playerCandidates) {
    if (rows.length >= playerLimit) break
    if (hasPlayer(rows, playerName)) continue
    rows.push(buildSupplementalAssistMarket(teamName, playerName, rows.length, isBasketball))
  }

  return rows
}

function getAssistPlayerPropRows(match: LiveEventMatch, isBasketball: boolean): PlayerShotMarket[] {
  const rows = [
    ...getTeamAssistMarketRows(match.homeTeam.name, isBasketball, LIVE_EVENT_PLAYER_PROPS_PER_TEAM),
    ...getTeamAssistMarketRows(match.awayTeam.name, isBasketball, LIVE_EVENT_PLAYER_PROPS_PER_TEAM),
  ]
  return rows.slice(0, LIVE_EVENT_PLAYER_PROPS_PER_MARKET)
}

function getPlayerPropRows(match: LiveEventMatch, isBasketball: boolean, isExpanded: boolean): PlayerShotMarket[] {
  return isBasketball
    ? getBasketballPlayerPointRows(match, isExpanded)
    : getShotsOnGoalRows(match, isExpanded)
}

const liveEventMidfieldPlayerNames = new Set([
  'arrascaeta',
  'de-la-cruz',
  'matheus-pereira',
  'payet',
  'alan-patrick',
  'jhon-jhon',
  'raphael-veiga',
  'arias',
  'savarino',
  'musiala',
  'dembele',
  'raphinha',
])

function getPlayerPropCardPosition(playerName: string, isBasketball: boolean): string {
  if (isBasketball) return 'PTS'
  return liveEventMidfieldPlayerNames.has(normalizePlayerName(playerName)) ? 'MEI' : 'ATA'
}

function getTotalGoalsRows(match: LiveEventMatch, isExpanded: boolean): TotalGoalsMarketRow[] {
  const currentLine = match.totalGoalsOdds?.line ?? 2.5
  const lines = [2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5]
  const normalizedLines = lines.includes(currentLine) ? lines : [currentLine, ...lines]
  const visibleLines = normalizedLines.slice(0, isExpanded ? 8 : 4)
  const underFallbackOdds = ['1.42x', '1.78x', '2.15x', '2.65x', '3.10x', '3.80x', '4.60x', '5.40x']
  const overFallbackOdds = ['2.70x', '1.98x', '1.62x', '1.38x', '1.24x', '1.16x', '1.10x', '1.06x']

  return visibleLines.map((line, index) => {
    const isCurrentLine = line === currentLine && match.totalGoalsOdds
    const underOdd = isCurrentLine ? match.totalGoalsOdds!.under : underFallbackOdds[index]
    const overOdd = isCurrentLine ? match.totalGoalsOdds!.over : overFallbackOdds[index]
    const formattedLine = formatMarketLine(line)

    return {
      id: `total-goals-${formattedLine}`,
      under: { label: `Menos de ${formattedLine}`, odd: underOdd },
      over: { label: `Mais de ${formattedLine}`, odd: overOdd },
    }
  })
}

function buildLineMarketRows(
  market: { line: number; under: string; over: string } | undefined,
  lines: number[],
  underFallbackOdds: string[],
  overFallbackOdds: string[],
  underLabel: string,
  overLabel: string
): TotalGoalsMarketRow[] {
  const currentLine = market?.line ?? lines[0]
  const normalizedLines = lines.includes(currentLine) ? lines : [currentLine, ...lines]

  return normalizedLines.slice(0, 4).map((line, index) => {
    const isCurrentLine = line === currentLine && market
    const formattedLine = formatMarketLine(line)

    return {
      id: `${underLabel}-${formattedLine}`,
      under: {
        label: `${underLabel} ${formattedLine}`,
        odd: isCurrentLine ? market.under : underFallbackOdds[index],
      },
      over: {
        label: `${overLabel} ${formattedLine}`,
        odd: isCurrentLine ? market.over : overFallbackOdds[index],
      },
    }
  })
}

function getTotalCornersRows(match: LiveEventMatch): TotalGoalsMarketRow[] {
  return buildLineMarketRows(
    match.totalCornersOdds,
    [8.5, 9.5, 10.5, 11.5],
    ['1.70x', '1.88x', '2.10x', '2.45x'],
    ['2.05x', '1.86x', '1.66x', '1.48x'],
    'Menos de',
    'Mais de'
  )
}

function getTotalPointsRows(match: LiveEventMatch): TotalGoalsMarketRow[] {
  const currentLine = match.totalPointsOdds?.line ?? 164.5
  return buildLineMarketRows(
    match.totalPointsOdds,
    [currentLine, currentLine + 4, currentLine + 8, currentLine + 12],
    ['1.78x', '1.92x', '2.08x', '2.26x'],
    ['2.04x', '1.88x', '1.72x', '1.58x'],
    'Menos de',
    'Mais de'
  )
}

function formatSignedLine(line: number): string {
  if (line === 0) return '0.0'
  return `${line > 0 ? '+' : ''}${formatMarketLine(line)}`
}

function getHandicapRows(match: LiveEventMatch): TotalGoalsMarketRow[] {
  const currentLine = match.handicapOdds?.line ?? 1.5
  const lines = [currentLine, currentLine + 2, currentLine - 2, currentLine + 4]

  return lines.slice(0, 4).map((line, index) => {
    const isCurrentLine = line === currentLine && match.handicapOdds
    const homeOdd = isCurrentLine ? match.handicapOdds!.home : ['1.88x', '1.94x', '1.82x', '2.02x'][index]
    const awayOdd = isCurrentLine ? match.handicapOdds!.away : ['1.92x', '1.86x', '1.98x', '1.78x'][index]

    return {
      id: `handicap-${formatSignedLine(line)}`,
      under: {
        label: `${match.homeTeam.name} ${formatSignedLine(line)}`,
        odd: homeOdd,
      },
      over: {
        label: `${match.awayTeam.name} ${formatSignedLine(-line)}`,
        odd: awayOdd,
      },
    }
  })
}

function getQuarterTotalRows(market: LiveEventMatch['q3TotalOdds'] | LiveEventMatch['q4TotalOdds']): TotalGoalsMarketRow[] {
  const currentLine = market?.line ?? 42.5
  return buildLineMarketRows(
    market,
    [currentLine, currentLine + 2, currentLine + 4, currentLine + 6],
    ['1.82x', '1.94x', '2.12x', '2.34x'],
    ['1.98x', '1.86x', '1.68x', '1.52x'],
    'Menos de',
    'Mais de'
  )
}

function getTotalCardsRows(): TotalGoalsMarketRow[] {
  return buildLineMarketRows(
    undefined,
    [3.5, 4.5, 5.5, 6.5],
    ['1.62x', '1.88x', '2.25x', '2.85x'],
    ['2.18x', '1.82x', '1.58x', '1.34x'],
    'Menos de',
    'Mais de'
  )
}

function isLineMarketCurrentRow(row: TotalGoalsMarketRow, line: number | undefined): boolean {
  return line !== undefined && row.id.endsWith(`-${formatMarketLine(line)}`)
}

function isHandicapCurrentRow(row: TotalGoalsMarketRow, line: number | undefined): boolean {
  return line !== undefined && row.id === `handicap-${formatSignedLine(line)}`
}

function getLiveEventLineOutcomeId(row: TotalGoalsMarketRow, isCurrentRow: boolean, outcomeId: string): string {
  return isCurrentRow ? outcomeId : `${outcomeId}-${row.id}`
}

const liveEventDoubleChanceOutcomeIds = ['home-or-draw', 'home-or-away', 'away-or-draw']

function getDoubleChanceRows(match: LiveEventMatch): ThreeWayMarketRow[] {
  const homeDisplayName = getDoubleChanceDisplayName(match.homeTeam.name)
  const awayDisplayName = getDoubleChanceDisplayName(match.awayTeam.name)

  return [
    {
      id: 'double-chance-main',
      options: [
        {
          label: `${match.homeTeam.name} ou Empate`,
          labelParts: [homeDisplayName, 'EMP'],
          odd: match.doubleChanceOdds?.homeOrDraw ?? '1.30x',
        },
        {
          label: `${match.homeTeam.name} ou ${match.awayTeam.name}`,
          labelParts: [homeDisplayName, awayDisplayName],
          odd: match.doubleChanceOdds?.homeOrAway ?? '1.28x',
        },
        {
          label: `${match.awayTeam.name} ou Empate`,
          labelParts: [awayDisplayName, 'EMP'],
          odd: match.doubleChanceOdds?.awayOrDraw ?? '1.65x',
        },
      ],
    },
  ]
}

function parseLiveTime(timeStr: string): { prefix: string; totalSeconds: number; isQuarter: boolean } | null {
  const match = timeStr.match(/^(.+?)\s+(\d+):(\d+)$/)
  if (!match) return null
  return {
    prefix: match[1],
    totalSeconds: parseInt(match[2]) * 60 + parseInt(match[3]),
    isQuarter: /^Q\d+$/.test(match[1]),
  }
}

function formatLiveTime(prefix: string, totalSeconds: number): string {
  const normalizedSeconds = Math.max(0, totalSeconds)
  const m = Math.floor(normalizedSeconds / 60)
  const s = normalizedSeconds % 60
  return `${prefix} ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getNextLiveTime(parsed: { prefix: string; totalSeconds: number; isQuarter: boolean }): string {
  return formatLiveTime(
    parsed.prefix,
    parsed.isQuarter ? parsed.totalSeconds - 1 : parsed.totalSeconds + 1
  )
}

function getLiveEventMatchKey(match: LiveEventMatch, index: number): string {
  return match.id ?? `${match.homeTeam.name}-${match.awayTeam.name}-${index}`
}

function getLiveEventMatchIdentity(match: LiveEventMatch, index: number): string {
  const matchKey = getLiveEventMatchKey(match, index)
  return match.leagueId ? `${match.leagueId}:${matchKey}` : matchKey
}

function getLiveEventRailIdentity(item: LiveEventRailItem): string {
  return item.leagueId ? `${item.leagueId}:${item.id}` : item.id
}

function getLiveEventMatchTime(match: LiveEventMatch, index: number, currentTimes: Record<string, string> | undefined, fallback?: string): string {
  const key = getLiveEventMatchKey(match, index)
  return currentTimes?.[key] ?? match.currentTime ?? fallback ?? match.dateTime ?? match.time ?? 'Ao vivo'
}

function getLiveEventSportFallbackIcon(): string {
  return TEAM_LOGO_FALLBACK
}

function isLiveEventFallbackTeamIcon(icon: string | undefined): boolean {
  return isTeamLogoFallback(icon)
}

function getLiveEventTeamIconView(icon: string | undefined) {
  const isFallback = isLiveEventFallbackTeamIcon(icon)

  return {
    src: isFallback ? getLiveEventSportFallbackIcon() : icon,
    isFallback,
  }
}

function getLiveEventRailFallbackItems({
  matches,
  currentTimes,
  leagueName,
  leagueFlag,
  sport,
}: {
  matches: LiveEventMatch[]
  currentTimes?: Record<string, string>
  leagueName: string
  leagueFlag?: string
  sport: string
}): LiveEventRailItem[] {
  return matches.map((match, index) => {
    const id = getLiveEventMatchKey(match, index)
    const displayTime = getLiveEventMatchTime(match, index, currentTimes)

    return {
      id,
      leagueId: match.leagueId,
      leagueName: match.leagueName ?? leagueName,
      leagueFlag: match.leagueFlag ?? leagueFlag,
      sport: match.sport ?? sport,
      isLive: match.isLive ?? true,
      dateTime: match.dateTime ?? match.time ?? displayTime,
      currentTime: displayTime,
      headerPrimary: (match.isLive ?? true) ? displayTime : undefined,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      odds: match.odds,
    }
  })
}

function getLiveEventRailPreMatchHeader(item: LiveEventRailItem) {
  if (item.headerPrimary) {
    return {
      primary: item.headerPrimary,
      secondary: item.headerSecondary ?? item.leagueName,
    }
  }

  const [datePart, timePart] = item.dateTime.split(',').map((part) => part.trim())
  return {
    primary: timePart || datePart,
    secondary: datePart || item.leagueName,
  }
}

interface LiveEventRailTeamIconProps {
  team: LiveEventRailItem['homeTeam']
  sport: string
}

function LiveEventRailTeamIcon({ team, sport }: LiveEventRailTeamIconProps) {
  const resolvedIcon = useSportsDbTeamLogo(team.name, team.icon, sport, getLiveEventSportFallbackIcon(), {
    useCurrentLogoFallback: true,
  })
  const teamIcon = getLiveEventTeamIconView(resolvedIcon)

  if (!teamIcon.src) {
    return <span className="live-event-page__rail-team-icon live-event-page__rail-team-icon--placeholder" />
  }

  return (
    <img
      src={teamIcon.src}
      alt=""
      className="live-event-page__rail-team-icon"
    />
  )
}

interface LiveEventMatchRailProps {
  items: LiveEventRailItem[]
  activeIdentity: string
  activeRailIndex: number
  railTimes: Record<string, string>
  selectableIdentities: Set<string>
  isExpanded: boolean
  onSelect: (item: LiveEventRailItem, railIndex: number) => void
}

function LiveEventMatchRail({
  items,
  activeIdentity,
  activeRailIndex,
  railTimes,
  selectableIdentities,
  isExpanded,
  onSelect,
}: LiveEventMatchRailProps) {
  const railRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const lastPositionedIndexRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (isExpanded || activeRailIndex < 0) return

    const railEl = railRef.current
    const itemEl = itemRefs.current[activeRailIndex]
    if (!railEl || !itemEl) return

    const maxScrollLeft = Math.max(0, railEl.scrollWidth - railEl.clientWidth)
    const centeredLeft = itemEl.offsetLeft - (railEl.clientWidth - itemEl.offsetWidth) / 2
    const targetLeft = activeRailIndex === 0
      ? 0
      : activeRailIndex === items.length - 1
        ? maxScrollLeft
        : Math.min(maxScrollLeft, Math.max(0, centeredLeft))
    const isFirstPosition = lastPositionedIndexRef.current === null
    const didActiveIndexChange = lastPositionedIndexRef.current !== activeRailIndex

    railEl.scrollTo({
      left: targetLeft,
      top: 0,
      behavior: isFirstPosition || !didActiveIndexChange ? 'auto' : 'smooth',
    })
    lastPositionedIndexRef.current = activeRailIndex
  }, [activeRailIndex, isExpanded, items.length])

  const handleCardKeyDown = (event: KeyboardEvent<HTMLButtonElement>, item: LiveEventRailItem, railIndex: number) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelect(item, railIndex)
  }

  return (
    <div className="live-event-page__compact-rail" ref={railRef} aria-label="Jogos">
      <div className="live-event-page__compact-rail-track">
        {items.map((item, index) => {
          const identity = getLiveEventRailIdentity(item)
          const isActive = identity === activeIdentity
          const isSelectable = selectableIdentities.has(identity)
          const displayTime = railTimes[identity] ?? item.currentTime ?? item.headerPrimary ?? item.dateTime
          const preMatchHeader = getLiveEventRailPreMatchHeader(item)

          return (
            <button
              key={identity}
              ref={(element) => { itemRefs.current[index] = element }}
              type="button"
              className={[
                'live-event-page__rail-card',
                item.isLive ? 'live-event-page__rail-card--live' : 'live-event-page__rail-card--prematch',
                isActive ? 'live-event-page__rail-card--active' : '',
                isSelectable ? 'live-event-page__rail-card--selectable' : 'live-event-page__rail-card--disabled',
              ].filter(Boolean).join(' ')}
              aria-label={`${item.homeTeam.name} contra ${item.awayTeam.name}`}
              aria-pressed={isActive && isSelectable ? true : undefined}
              disabled={!isSelectable}
              onClick={() => onSelect(item, index)}
              onKeyDown={(event) => handleCardKeyDown(event, item, index)}
            >
              <span className="live-event-page__rail-active-line" aria-hidden="true" />
              <span className="live-event-page__rail-card-header">
                {item.isLive ? (
                  <>
                    <span className="live-event-page__rail-live-meta">
                      <span className="live-event-page__rail-live-icon-wrap" aria-hidden="true">
                        <img src={iconAoVivo} alt="" className="live-event-page__rail-live-icon" />
                      </span>
                      <span className="live-event-page__rail-header-primary">{displayTime}</span>
                    </span>
                    <MonitorPlayIcon aria-hidden="true" className="live-event-page__rail-stream-icon" weight="bold" />
                  </>
                ) : (
                  <>
                    <span className="live-event-page__rail-header-primary">{preMatchHeader.primary}</span>
                    <span className="live-event-page__rail-header-secondary">{preMatchHeader.secondary}</span>
                  </>
                )}
              </span>

              <span className="live-event-page__rail-teams">
                <span className="live-event-page__rail-team-list">
                  <span className="live-event-page__rail-team-row">
                    <LiveEventRailTeamIcon team={item.homeTeam} sport={item.sport} />
                    <span className="live-event-page__rail-team-name">{item.homeTeam.name}</span>
                  </span>
                  <span className="live-event-page__rail-team-row">
                    <LiveEventRailTeamIcon team={item.awayTeam} sport={item.sport} />
                    <span className="live-event-page__rail-team-name">{item.awayTeam.name}</span>
                  </span>
                </span>
                {item.isLive && (
                  <span className="live-event-page__rail-score-column" aria-label="Placar">
                    <span className="live-event-page__rail-team-score">{item.homeTeam.score ?? 0}</span>
                    <span className="live-event-page__rail-team-score">{item.awayTeam.score ?? 0}</span>
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PauseIcon() {
  return (
    <svg className="live-event-page__stream-icon" viewBox="0 0 12 12" aria-hidden="true">
      <rect x="3" y="2.25" width="2" height="7.5" rx="0.5" fill="currentColor" />
      <rect x="7" y="2.25" width="2" height="7.5" rx="0.5" fill="currentColor" />
    </svg>
  )
}

function MuteIcon() {
  return (
    <svg className="live-event-page__stream-icon" viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M5.6 2.3 3.4 4.1H1.7a.5.5 0 0 0-.5.5v2.8a.5.5 0 0 0 .5.5h1.7l2.2 1.8a.4.4 0 0 0 .65-.31V2.6a.4.4 0 0 0-.65-.3Z"
        fill="currentColor"
      />
      <path
        d="m8 4.5 2.5 3M10.5 4.5 8 7.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

function FullscreenIcon() {
  return (
    <svg className="live-event-page__stream-icon live-event-page__stream-icon--lg" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

function CloseStreamIcon() {
  return (
    <svg className="live-event-page__stream-icon live-event-page__stream-icon--lg" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="m4.5 4.5 7 7M11.5 4.5l-7 7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

interface MatchEvent {
  type: 'yellow' | 'red' | 'goal'
  player: string
  minute?: number
  detail?: string
}

// Events ordered by minute; include enough goals per team to cover any realistic score
const TEAM_EVENTS: Record<string, MatchEvent[]> = {
  // Brasil
  'Flamengo':         [{ type: 'yellow', player: 'Arrascaeta', minute: 20 }, { type: 'goal', player: 'Pedro', minute: 38 }, { type: 'goal', player: 'Gabigol', minute: 57 }, { type: 'goal', player: 'De La Cruz', minute: 72 }],
  'Cruzeiro':         [{ type: 'goal', player: 'Matheus Pereira', minute: 7 }, { type: 'yellow', player: 'Zé Ivaldo', minute: 31 }, { type: 'goal', player: 'Kaique Rocha', minute: 65 }, { type: 'goal', player: 'Eduardo', minute: 80 }],
  'Internacional':    [{ type: 'yellow', player: 'Thiago Maia', minute: 14 }, { type: 'goal', player: 'Valencia', minute: 42 }, { type: 'goal', player: 'Wesley', minute: 58 }, { type: 'goal', player: 'Bernabei', minute: 74 }],
  'Bragantino':       [{ type: 'goal', player: 'Jhon Jhon', minute: 9 }, { type: 'yellow', player: 'Laquintana', minute: 33 }, { type: 'goal', player: 'Vinicinho', minute: 61 }, { type: 'goal', player: 'Sasha', minute: 79 }],
  'Mirassol':         [{ type: 'yellow', player: 'Lucas Ramon', minute: 22 }, { type: 'goal', player: 'Cristian', minute: 41 }, { type: 'goal', player: 'Reinaldo', minute: 60 }, { type: 'goal', player: 'Negueba', minute: 75 }],
  'Palmeiras':        [{ type: 'goal', player: 'Flaco López', minute: 18 }, { type: 'yellow', player: 'Aníbal Moreno', minute: 35 }, { type: 'goal', player: 'Estêvão', minute: 54 }, { type: 'goal', player: 'Raphael Veiga', minute: 70 }],
  'Fluminense':       [{ type: 'yellow', player: 'Felipe Melo', minute: 19 }, { type: 'goal', player: 'Cano', minute: 36 }, { type: 'goal', player: 'Arias', minute: 58 }, { type: 'goal', player: 'Keno', minute: 74 }],
  'São Paulo':        [{ type: 'yellow', player: 'Luiz Gustavo', minute: 27 }, { type: 'goal', player: 'Calleri', minute: 43 }, { type: 'goal', player: 'André Silva', minute: 62 }, { type: 'goal', player: 'Luciano', minute: 77 }],
  'Corinthians':      [{ type: 'yellow', player: 'André Ramalho', minute: 22 }, { type: 'goal', player: 'Memphis', minute: 49 }, { type: 'goal', player: 'Romero', minute: 64 }, { type: 'goal', player: 'Yuri Alberto', minute: 81 }],
  'Grêmio':           [{ type: 'yellow', player: 'Kannemann', minute: 16 }, { type: 'goal', player: 'Soteldo', minute: 32 }, { type: 'goal', player: 'Cristaldo', minute: 55 }, { type: 'goal', player: 'Arezo', minute: 71 }],
  'Atlético-MG':      [{ type: 'goal', player: 'Hulk', minute: 24 }, { type: 'yellow', player: 'Otávio', minute: 40 }, { type: 'goal', player: 'Paulinho', minute: 58 }, { type: 'goal', player: 'Vargas', minute: 75 }],
  'Atl. Mineiro':     [{ type: 'goal', player: 'Hulk', minute: 24 }, { type: 'yellow', player: 'Otávio', minute: 40 }, { type: 'goal', player: 'Paulinho', minute: 58 }, { type: 'goal', player: 'Vargas', minute: 75 }],
  'Botafogo':         [{ type: 'goal', player: 'Tiquinho Soares', minute: 13 }, { type: 'yellow', player: 'Marçal', minute: 44 }, { type: 'goal', player: 'Savarino', minute: 60 }, { type: 'goal', player: 'Igor Jesus', minute: 78 }],
  'Vasco':            [{ type: 'yellow', player: 'Hugo Moura', minute: 19 }, { type: 'goal', player: 'Vegetti', minute: 37 }, { type: 'goal', player: 'Payet', minute: 56 }, { type: 'goal', player: 'Léo', minute: 73 }],
  'Athletico-PR':     [{ type: 'goal', player: 'Cuello', minute: 8 }, { type: 'yellow', player: 'Thiago Heleno', minute: 41 }, { type: 'goal', player: 'Canobbio', minute: 59 }, { type: 'goal', player: 'Pablo', minute: 76 }],
  'Fortaleza':        [{ type: 'yellow', player: 'Titi', minute: 31 }, { type: 'goal', player: 'Moisés', minute: 47 }, { type: 'goal', player: 'Lucero', minute: 63 }, { type: 'goal', player: 'Pochettino', minute: 80 }],
  'Bahia':            [{ type: 'goal', player: 'Everaldo', minute: 17 }, { type: 'yellow', player: 'Rezende', minute: 38 }, { type: 'goal', player: 'Cauly', minute: 60 }, { type: 'goal', player: 'Biel', minute: 77 }],
  'Santos':           [{ type: 'goal', player: 'Guilherme', minute: 11 }, { type: 'yellow', player: 'João Paulo', minute: 37 }, { type: 'goal', player: 'Soteldo', minute: 53 }, { type: 'goal', player: 'Morelos', minute: 70 }],
  // Europa — Champions / Top
  'PSG':              [{ type: 'goal', player: 'Dembélé', minute: 12 }, { type: 'yellow', player: 'Nuno Mendes', minute: 28 }, { type: 'goal', player: 'Vitinha', minute: 47 }, { type: 'goal', player: 'Ramos', minute: 67 }],
  'Lyon':             [{ type: 'yellow', player: 'Tolisso', minute: 18 }, { type: 'goal', player: 'Lacazette', minute: 35 }, { type: 'goal', player: 'Cherki', minute: 55 }, { type: 'goal', player: 'Nuamah', minute: 73 }],
  'Newcastle':        [{ type: 'yellow', player: 'Bruno Guimarães', minute: 21 }, { type: 'goal', player: 'Isak', minute: 39 }, { type: 'goal', player: 'Gordon', minute: 58 }, { type: 'goal', player: 'Wilson', minute: 76 }],
  'Napoli':           [{ type: 'goal', player: 'Kvaratskhelia', minute: 10 }, { type: 'yellow', player: 'Lobotka', minute: 34 }, { type: 'goal', player: 'Lukaku', minute: 52 }, { type: 'goal', player: 'Di Lorenzo', minute: 69 }],
  'Barcelona':        [{ type: 'goal', player: 'Lewandowski', minute: 15 }, { type: 'yellow', player: 'Koundé', minute: 32 }, { type: 'goal', player: 'Yamal', minute: 53 }, { type: 'goal', player: 'Raphinha', minute: 71 }],
  'Bayern':           [{ type: 'goal', player: 'Harry Kane', minute: 7 }, { type: 'yellow', player: 'Goretzka', minute: 30 }, { type: 'goal', player: 'Musiala', minute: 50 }, { type: 'goal', player: 'Sané', minute: 68 }],
  'Real Madrid':      [{ type: 'goal', player: 'Vini Jr', minute: 14 }, { type: 'yellow', player: 'Camavinga', minute: 36 }, { type: 'goal', player: 'Bellingham', minute: 54 }, { type: 'goal', player: 'Mbappé', minute: 72 }],
  'Manchester City':  [{ type: 'goal', player: 'Haaland', minute: 11 }, { type: 'yellow', player: 'Rodri', minute: 29 }, { type: 'goal', player: 'De Bruyne', minute: 49 }, { type: 'goal', player: 'Foden', minute: 66 }],
  'Man. City':        [{ type: 'goal', player: 'Haaland', minute: 11 }, { type: 'yellow', player: 'Rodri', minute: 29 }, { type: 'goal', player: 'De Bruyne', minute: 49 }, { type: 'goal', player: 'Foden', minute: 66 }],
  'Arsenal':          [{ type: 'yellow', player: 'Partey', minute: 23 }, { type: 'goal', player: 'Saka', minute: 41 }, { type: 'goal', player: 'Havertz', minute: 60 }, { type: 'goal', player: 'Martinelli', minute: 78 }],
  'Liverpool':        [{ type: 'goal', player: 'Salah', minute: 9 }, { type: 'yellow', player: 'Mac Allister', minute: 33 }, { type: 'goal', player: 'Núñez', minute: 51 }, { type: 'goal', player: 'Diaz', minute: 70 }],
  'Chelsea':          [{ type: 'yellow', player: 'Caicedo', minute: 17 }, { type: 'goal', player: 'Palmer', minute: 38 }, { type: 'goal', player: 'Jackson', minute: 57 }, { type: 'goal', player: 'Nkunku', minute: 74 }],
  'Inter':            [{ type: 'goal', player: 'Thuram', minute: 16 }, { type: 'yellow', player: 'Barella', minute: 37 }, { type: 'goal', player: 'Lautaro', minute: 55 }, { type: 'goal', player: 'Çalhanoğlu', minute: 73 }],
  'Milan':            [{ type: 'yellow', player: 'Tomori', minute: 20 }, { type: 'goal', player: 'Giroud', minute: 40 }, { type: 'goal', player: 'Leão', minute: 59 }, { type: 'goal', player: 'Pulisic', minute: 76 }],
  'Juventus':         [{ type: 'goal', player: 'Vlahović', minute: 13 }, { type: 'yellow', player: 'Bremer', minute: 35 }, { type: 'goal', player: 'Yildiz', minute: 53 }, { type: 'goal', player: 'Chiesa', minute: 70 }],
  'Atlético Madrid':  [{ type: 'yellow', player: 'Koke', minute: 24 }, { type: 'goal', player: 'Griezmann', minute: 44 }, { type: 'goal', player: 'Morata', minute: 62 }, { type: 'goal', player: 'Riquelme', minute: 79 }],
  'Borussia Dortmund':[{ type: 'goal', player: 'Füllkrug', minute: 18 }, { type: 'yellow', player: 'Hummels', minute: 39 }, { type: 'goal', player: 'Brandt', minute: 57 }, { type: 'goal', player: 'Adeyemi', minute: 74 }],
  'Aston Villa':      [{ type: 'yellow', player: 'McGinn', minute: 21 }, { type: 'goal', player: 'Watkins', minute: 38 }, { type: 'goal', player: 'Bailey', minute: 56 }, { type: 'goal', player: 'Rogers', minute: 73 }],
  'Brighton':         [{ type: 'goal', player: 'Welbeck', minute: 14 }, { type: 'yellow', player: 'Estupiñán', minute: 34 }, { type: 'goal', player: 'João Pedro', minute: 52 }, { type: 'goal', player: 'Mitoma', minute: 69 }],
  'West Ham':         [{ type: 'yellow', player: 'Soucek', minute: 23 }, { type: 'goal', player: 'Bowen', minute: 42 }, { type: 'goal', player: 'Paquetá', minute: 60 }, { type: 'goal', player: 'Kudus', minute: 77 }],
  'Nottingham':       [{ type: 'goal', player: 'Wood', minute: 16 }, { type: 'yellow', player: 'Yates', minute: 35 }, { type: 'goal', player: 'Hudson-Odoi', minute: 54 }, { type: 'goal', player: 'Awoniyi', minute: 72 }],
  'Leeds':            [{ type: 'yellow', player: 'Ampadu', minute: 19 }, { type: 'goal', player: 'Piroe', minute: 38 }, { type: 'goal', player: 'Rutter', minute: 57 }, { type: 'goal', player: 'James', minute: 74 }],
  'Burnley':          [{ type: 'goal', player: 'Foster', minute: 21 }, { type: 'yellow', player: 'O\'Shea', minute: 41 }, { type: 'goal', player: 'Rodríguez', minute: 60 }, { type: 'goal', player: 'Brownhill', minute: 76 }],
  'Getafe':           [{ type: 'yellow', player: 'Mauro Arambarri', minute: 25 }, { type: 'goal', player: 'Mayoral', minute: 44 }, { type: 'goal', player: 'Greenwood', minute: 62 }, { type: 'goal', player: 'Latasa', minute: 78 }],
  'Elche':            [{ type: 'goal', player: 'Pere Milla', minute: 18 }, { type: 'yellow', player: 'Bigas', minute: 39 }, { type: 'goal', player: 'Boyé', minute: 57 }, { type: 'goal', player: 'Mojica', minute: 75 }],
  'Alavés':           [{ type: 'yellow', player: 'Tenaglia', minute: 20 }, { type: 'goal', player: 'Samu Omorodion', minute: 41 }, { type: 'goal', player: 'Carlos Vicente', minute: 59 }, { type: 'goal', player: 'Rioja', minute: 76 }],
  'Espanyol':         [{ type: 'goal', player: 'Joselu', minute: 13 }, { type: 'yellow', player: 'Calero', minute: 33 }, { type: 'goal', player: 'Puado', minute: 52 }, { type: 'goal', player: 'Bare', minute: 71 }],
  'Mallorca':         [{ type: 'yellow', player: 'Antonio Raíllo', minute: 22 }, { type: 'goal', player: 'Muriqi', minute: 40 }, { type: 'goal', player: 'Larin', minute: 60 }, { type: 'goal', player: 'Darder', minute: 76 }],
  'Levante':          [{ type: 'goal', player: 'Iborra', minute: 16 }, { type: 'yellow', player: 'Postigo', minute: 36 }, { type: 'goal', player: 'Bouldini', minute: 55 }, { type: 'goal', player: 'Brugué', minute: 72 }],
  'B. Leverkusen':    [{ type: 'goal', player: 'Wirtz', minute: 12 }, { type: 'yellow', player: 'Tah', minute: 32 }, { type: 'goal', player: 'Boniface', minute: 50 }, { type: 'goal', player: 'Grimaldo', minute: 68 }],
  'Wolfsburg':        [{ type: 'yellow', player: 'Arnold', minute: 24 }, { type: 'goal', player: 'Wind', minute: 43 }, { type: 'goal', player: 'Wimmer', minute: 60 }, { type: 'goal', player: 'Majer', minute: 77 }],
  'Eintracht':        [{ type: 'goal', player: 'Ekitiké', minute: 17 }, { type: 'yellow', player: 'Koch', minute: 38 }, { type: 'goal', player: 'Marmoush', minute: 56 }, { type: 'goal', player: 'Knauff', minute: 73 }],
  'Augsburg':         [{ type: 'yellow', player: 'Gouweleeuw', minute: 23 }, { type: 'goal', player: 'Demirović', minute: 42 }, { type: 'goal', player: 'Tietz', minute: 60 }, { type: 'goal', player: 'Vargas', minute: 77 }],
  'Hamburger':        [{ type: 'goal', player: 'Glatzel', minute: 15 }, { type: 'yellow', player: 'Schonlau', minute: 35 }, { type: 'goal', player: 'Königsdörffer', minute: 54 }, { type: 'goal', player: 'Selke', minute: 71 }],
  'Benfica':          [{ type: 'goal', player: 'Di María', minute: 14 }, { type: 'yellow', player: 'Otamendi', minute: 35 }, { type: 'goal', player: 'Pavlidis', minute: 52 }, { type: 'goal', player: 'Schjelderup', minute: 70 }],
  'Ajax':             [{ type: 'yellow', player: 'Henderson', minute: 20 }, { type: 'goal', player: 'Brobbey', minute: 39 }, { type: 'goal', player: 'Berghuis', minute: 56 }, { type: 'goal', player: 'Tahirović', minute: 73 }],
  'Fenerbahçe':       [{ type: 'goal', player: 'Dzeko', minute: 12 }, { type: 'yellow', player: 'İrfan Can', minute: 32 }, { type: 'goal', player: 'Tadić', minute: 51 }, { type: 'goal', player: 'En-Nesyri', minute: 69 }],
  'Porto':            [{ type: 'yellow', player: 'Otávio', minute: 22 }, { type: 'goal', player: 'Galeno', minute: 41 }, { type: 'goal', player: 'Taremi', minute: 59 }, { type: 'goal', player: 'Pepê', minute: 76 }],
  'Panathinaikos':    [{ type: 'yellow', player: 'Maksimović', minute: 24 }, { type: 'goal', player: 'Ioannidis', minute: 43 }, { type: 'goal', player: 'Mancini', minute: 61 }, { type: 'goal', player: 'Bakasetas', minute: 78 }],
  'Dinamo':           [{ type: 'goal', player: 'Petković', minute: 16 }, { type: 'yellow', player: 'Šutalo', minute: 37 }, { type: 'goal', player: 'Baturina', minute: 55 }, { type: 'goal', player: 'Špikić', minute: 73 }],
  // América do Sul
  'Boca Juniors':     [{ type: 'goal', player: 'Cavani', minute: 11 }, { type: 'yellow', player: 'Fabra', minute: 31 }, { type: 'goal', player: 'Merentiel', minute: 49 }, { type: 'goal', player: 'Janson', minute: 68 }],
  'Argentinos Jrs':   [{ type: 'yellow', player: 'Hauche', minute: 25 }, { type: 'goal', player: 'Verón', minute: 44 }, { type: 'goal', player: 'Cabrera', minute: 62 }, { type: 'goal', player: 'Castro', minute: 79 }],
  'Racing':           [{ type: 'goal', player: 'Maravilla Martínez', minute: 13 }, { type: 'yellow', player: 'Sigali', minute: 33 }, { type: 'goal', player: 'Solari', minute: 52 }, { type: 'goal', player: 'Quintero', minute: 70 }],
  'River Plate':      [{ type: 'yellow', player: 'Pérez', minute: 21 }, { type: 'goal', player: 'Borja', minute: 40 }, { type: 'goal', player: 'Colidio', minute: 58 }, { type: 'goal', player: 'Lanzini', minute: 75 }],
  'San Lorenzo':      [{ type: 'goal', player: 'Cuello', minute: 17 }, { type: 'yellow', player: 'Romaña', minute: 38 }, { type: 'goal', player: 'Adam Bareiro', minute: 56 }, { type: 'goal', player: 'Ferro', minute: 74 }],
  'Córdoba':          [{ type: 'yellow', player: 'Galván', minute: 23 }, { type: 'goal', player: 'Garro', minute: 42 }, { type: 'goal', player: 'Bustos', minute: 60 }, { type: 'goal', player: 'Requena', minute: 77 }],
  // MLS
  'Inter Miami':      [{ type: 'goal', player: 'Messi', minute: 11 }, { type: 'yellow', player: 'Busquets', minute: 30 }, { type: 'goal', player: 'Suárez', minute: 49 }, { type: 'goal', player: 'Alba', minute: 68 }],
  'Whitecaps':        [{ type: 'yellow', player: 'Cubas', minute: 22 }, { type: 'goal', player: 'White', minute: 41 }, { type: 'goal', player: 'Gauld', minute: 59 }, { type: 'goal', player: 'Vite', minute: 76 }],
  'Cincinnati':       [{ type: 'goal', player: 'Boupendza', minute: 14 }, { type: 'yellow', player: 'Miazga', minute: 34 }, { type: 'goal', player: 'Acosta', minute: 52 }, { type: 'goal', player: 'Vázquez', minute: 70 }],
  'Chicago Fire':     [{ type: 'yellow', player: 'Souquet', minute: 25 }, { type: 'goal', player: 'Shaqiri', minute: 43 }, { type: 'goal', player: 'Cuypers', minute: 61 }, { type: 'goal', player: 'Haile-Selassie', minute: 78 }],
  'Nashville':        [{ type: 'goal', player: 'Mukhtar', minute: 13 }, { type: 'yellow', player: 'Zimmerman', minute: 33 }, { type: 'goal', player: 'Surridge', minute: 51 }, { type: 'goal', player: 'Bunbury', minute: 69 }],
  'New York City':    [{ type: 'yellow', player: 'Martins', minute: 20 }, { type: 'goal', player: 'Talles Magno', minute: 39 }, { type: 'goal', player: 'Wolf', minute: 57 }, { type: 'goal', player: 'Rodríguez', minute: 74 }],
}

const FOOTBALL_MATCH_MINUTES = 90
const FOOTBALL_SECOND_HALF_OFFSET = 45
const FALLBACK_LIVE_MATCH_PROGRESS = 0.55

function getStableTeamSeed(teamName: string): number {
  let seed = 0
  for (let i = 0; i < teamName.length; i++) seed = (seed * 31 + teamName.charCodeAt(i)) >>> 0
  return seed
}

function getMappedTeamEvents(teamName: string): MatchEvent[] | undefined {
  const teamKey = getLiveEventPlayerTeamKey(teamName)
  return TEAM_EVENTS[teamName] ?? TEAM_EVENTS[teamKey]
}

function getFootballPeriodMinute(time?: string): number | null {
  const normalizedTime = time?.trim()
  if (!normalizedTime) return null

  const parsed = parseLiveTime(normalizedTime)
  if (!parsed || parsed.isQuarter) return null

  return Math.floor(Math.max(0, parsed.totalSeconds) / 60)
}

function getFootballVisibleMinute(time?: string): number | null {
  const normalizedTime = time?.trim()
  if (!normalizedTime) return null
  if (/^(intervalo|int)$/i.test(normalizedTime)) return FOOTBALL_SECOND_HALF_OFFSET
  if (/^ao vivo$/i.test(normalizedTime)) return Math.round(FOOTBALL_MATCH_MINUTES * 0.28)

  const periodMinute = getFootballPeriodMinute(normalizedTime)
  if (periodMinute !== null) return periodMinute

  const minuteLabelMatch = normalizedTime.match(/^(\d{1,3})\s*(?:min(?:uto)?s?|m|')$/i)
  if (minuteLabelMatch) return Number.parseInt(minuteLabelMatch[1], 10)

  const clockOnlyMatch = normalizedTime.match(/^(\d{1,3}):\d{2}$/)
  if (clockOnlyMatch) return Number.parseInt(clockOnlyMatch[1], 10)

  return null
}

function getFootballElapsedMinute(time?: string): number | null {
  const normalizedTime = time?.trim()
  if (!normalizedTime) return null
  if (/^(intervalo|int)$/i.test(normalizedTime)) return FOOTBALL_SECOND_HALF_OFFSET
  if (/^ao vivo$/i.test(normalizedTime)) return Math.round(FOOTBALL_MATCH_MINUTES * FALLBACK_LIVE_MATCH_PROGRESS)

  const parsed = parseLiveTime(normalizedTime)
  if (!parsed || parsed.isQuarter) return getFootballVisibleMinute(normalizedTime)

  const periodMatch = parsed.prefix.match(/^(\d+)T$/)
  if (!periodMatch) return null

  const period = Number.parseInt(periodMatch[1], 10)
  const periodOffset = Math.max(0, period - 1) * FOOTBALL_SECOND_HALF_OFFSET
  const periodMinute = getFootballPeriodMinute(normalizedTime) ?? 0
  return Math.max(0, periodOffset + periodMinute)
}

function getFootballMatchProgress(time?: string): number {
  const visibleMinute = getFootballVisibleMinute(time)
  if (visibleMinute === null) return FALLBACK_LIVE_MATCH_PROGRESS
  return Math.min(1, Math.max(0, visibleMinute / FOOTBALL_MATCH_MINUTES))
}

function getScoredGoalEvents(
  teamName: string,
  allEvents: MatchEvent[],
  score: number,
  elapsedMinute: number | null
): MatchEvent[] {
  const targetGoals = Math.max(0, score)
  let goalEvents = allEvents.filter((event) => event.type === 'goal').slice(0, targetGoals)

  if (goalEvents.length < targetGoals) {
    const fallbackGoals = buildFallbackEvents(teamName, targetGoals)
      .filter((event) => event.type === 'goal')
      .slice(goalEvents.length, targetGoals)
    goalEvents = [...goalEvents, ...fallbackGoals]
  }

  if (elapsedMinute === null) return goalEvents

  const latestGoalMinute = Math.max(1, elapsedMinute - 1)
  return goalEvents.map((event, index) => {
    if ((event.minute ?? 0) <= latestGoalMinute) return event

    const goalsAfterThis = goalEvents.length - index - 1
    const adjustedMinute = Math.max(1, latestGoalMinute - goalsAfterThis * 6)
    return { ...event, minute: adjustedMinute }
  })
}

function getTeamEvents(teamName: string, score: number, currentTime?: string): MatchEvent[] {
  const mapped = getMappedTeamEvents(teamName)
  const elapsedMinute = getFootballElapsedMinute(currentTime)
  const allEvents = mapped
    ? mapped.slice().sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
    : buildFallbackEvents(teamName, score)
  const goalEvents = getScoredGoalEvents(teamName, allEvents, score, elapsedMinute)
  const timedEvents = allEvents.filter((event) => (
    event.type !== 'goal'
    && (elapsedMinute === null || event.minute === undefined || event.minute <= elapsedMinute)
  ))

  return [...goalEvents, ...timedEvents].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
}

function buildFallbackEvents(teamName: string, score: number): MatchEvent[] {
  const players = getFootballTeamPlayers(teamName)
  if (players.length === 0) return []

  // Deterministic ordering preserves the mock's stable timeline without inventing athletes.
  const seed = getStableTeamSeed(teamName)
  const pick = (offset: number) => players[(seed + offset) % players.length]
  const events: MatchEvent[] = [{ type: 'yellow', player: pick(0), minute: 18 + (seed % 10) }]
  const goals = Math.max(score, 0)
  const baseMinute = 25
  for (let i = 0; i < goals; i++) {
    events.push({ type: 'goal', player: pick(i + 1), minute: baseMinute + i * 18 })
  }
  return events.sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
}

function getBasketballTeamEvents(teamName: string, score: number): MatchEvent[] {
  if (score <= 0) return []

  const players = getBasketballTeamPlayers(teamName)
  const topPoints = Math.max(2, Math.round(score * 0.34))
  const secondPoints = Math.max(2, Math.round(score * 0.24))
  const thirdPoints = Math.max(1, Math.round(score * 0.18))

  const events: MatchEvent[] = [
    { type: 'goal', player: players[0], detail: `${topPoints} pts` },
    { type: 'goal', player: players[1], detail: `${secondPoints} pts` },
    { type: 'goal', player: players[2], detail: `${thirdPoints} pts` },
  ]

  return events.filter((event) => Boolean(event.player))
}

function getMatchEvents(teamName: string, score: number, isBasketball: boolean, currentTime?: string): MatchEvent[] {
  return isBasketball
    ? getBasketballTeamEvents(teamName, score)
    : getTeamEvents(teamName, score, currentTime)
}

function getInlineFootballCardEventCount(teamName: string, type: 'yellow' | 'red', currentTime: string): number {
  const visibleMinute = getFootballVisibleMinute(currentTime)
  const events = getMappedTeamEvents(teamName) ?? buildFallbackEvents(teamName, 0)

  return events.filter((event) => (
    event.type === type
    && (visibleMinute === null || event.minute === undefined || event.minute <= visibleMinute)
  )).length
}

function getInlineFootballYellowCards(teamName: string, currentTime: string): number {
  const seed = getStableTeamSeed(teamName)
  const visibleMinute = getFootballVisibleMinute(currentTime)
  const progress = getFootballMatchProgress(currentTime)
  const projectedCards = 1 + (seed % 3)
  const eventCards = getInlineFootballCardEventCount(teamName, 'yellow', currentTime)
  const scaledCards = Math.floor(projectedCards * Math.max(0, progress - 0.12) / 0.88)
  let cards = Math.min(projectedCards, Math.max(eventCards, scaledCards))

  if (visibleMinute !== null && visibleMinute < 12) cards = 0
  if (visibleMinute !== null && visibleMinute < 35) cards = Math.min(cards, 1)
  if (visibleMinute !== null && visibleMinute < 55) cards = Math.min(cards, 2)

  return cards
}

function getInlineFootballRedCards(teamName: string, currentTime: string): number {
  const eventCards = getInlineFootballCardEventCount(teamName, 'red', currentTime)
  if (eventCards > 0) return eventCards

  const visibleMinute = getFootballVisibleMinute(currentTime)
  if (visibleMinute === null || visibleMinute < 60) return 0

  const seed = getStableTeamSeed(teamName)
  return seed % 11 === 0 && visibleMinute >= 72 ? 1 : 0
}

function getInlineFootballCorners(teamName: string, currentTime: string): number {
  const seed = getStableTeamSeed(teamName)
  const visibleMinute = getFootballVisibleMinute(currentTime)
  const progress = getFootballMatchProgress(currentTime)
  const projectedCorners = 2 + (seed % 5)
  let corners = Math.floor(projectedCorners * Math.pow(progress, 1.05))

  if (visibleMinute !== null && visibleMinute >= 18 && seed % 4 === 0) corners += 1
  if (visibleMinute !== null && visibleMinute < 10) corners = 0
  if (visibleMinute !== null && visibleMinute < 20) corners = Math.min(corners, 1)
  if (visibleMinute !== null && visibleMinute < 30) corners = Math.min(corners, 2)
  if (visibleMinute !== null && visibleMinute < 45) corners = Math.min(corners, 3)
  if (visibleMinute !== null && visibleMinute < 60) corners = Math.min(corners, 4)
  if (visibleMinute !== null && visibleMinute < 75) corners = Math.min(corners, 5)

  return Math.min(projectedCorners, Math.max(0, corners))
}

function getInlineFootballShots(teamName: string, currentTime: string): number {
  const seed = getStableTeamSeed(teamName)
  const visibleMinute = getFootballVisibleMinute(currentTime)
  const progress = getFootballMatchProgress(currentTime)
  const projectedShots = 4 + (seed % 7)
  let shots = Math.floor(projectedShots * Math.pow(progress, 0.82))

  if (visibleMinute !== null && visibleMinute >= 15 && seed % 3 === 0) shots += 1
  if (visibleMinute !== null && visibleMinute < 10) shots = Math.min(shots, 1)
  if (visibleMinute !== null && visibleMinute < 25) shots = Math.min(shots, 3)
  if (visibleMinute !== null && visibleMinute < 45) shots = Math.min(shots, 5)
  if (visibleMinute !== null && visibleMinute < 70) shots = Math.min(shots, 8)

  return Math.min(projectedShots, Math.max(0, shots))
}

function getMatchEventLabel(event: MatchEvent): string {
  if (event.detail) return `${event.player} ${event.detail}`
  return `${event.player} ${event.minute ?? 0}'`
}

function LiveEventContent({
  onRequestClose,
  onRequestExpand,
  onRequestCollapse,
  onExpansionProgressChange,
  onExpansionGestureEnd,
  onCompactPullChange,
  onCompactPullEnd,
  onBlockNextClose,
  onSwipeStart,
  onSwipeMove,
  onSwipeEnd,
  isExpanded,
  expansionProgress,
  match,
  leagueName,
  sport,
  currentTime,
  disableSheetInteractions = false,
}: LiveEventContentProps) {
  const [activeTab, setActiveTab] = useState<TabId>('transmissao')
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTabId>('destaques')
  const [isResultMarketOpen, setIsResultMarketOpen] = useState(true)
  const [isShotsMarketOpen, setIsShotsMarketOpen] = useState(true)
  const [isAssistsMarketOpen, setIsAssistsMarketOpen] = useState(true)
  const [isTotalGoalsMarketOpen, setIsTotalGoalsMarketOpen] = useState(true)
  const [isCornersMarketOpen, setIsCornersMarketOpen] = useState(true)
  const [isCardsMarketOpen, setIsCardsMarketOpen] = useState(true)
  const [isDoubleChanceMarketOpen, setIsDoubleChanceMarketOpen] = useState(true)
  const [displayTime, setDisplayTime] = useState(currentTime)
  const [isStickyScoreHeaderVisible, setIsStickyScoreHeaderVisible] = useState(false)
  const getOddButtonProps = useOddSelection('live-event-page__market-odd')
  const scrollRef = useRef<HTMLDivElement>(null)
  const scoreBoxRef = useRef<HTMLDivElement>(null)
  const stickyScoreHeaderVisibleRef = useRef(false)
  const dragStartYRef = useRef<number | null>(null)
  const stickyCollapseGestureRef = useRef<{
    startY: number
    startProgress: number
    lastProgress: number
    isDragging: boolean
  } | null>(null)
  const expansionProgressRef = useRef(expansionProgress)
  const scrollAnimationFrameRef = useRef<number | null>(null)
  const lastScrollTopRef = useRef(0)
  const pendingScrollTopRef = useRef(0)
  const expansionGestureRef = useRef<{
    startX: number
    startY: number
    startProgress: number
    startedAtScrollTop: boolean
    isControlling: boolean
    pullDistance: number
    lastProgress: number
    startedAt: number
    horizontalLocked: boolean
    lastX: number
    lastT: number
    startedOnHorizontalScroller: boolean
    canCloseFromPull: boolean
  } | null>(null)
  const contentSport = match.sport ?? sport
  const isBasketball = contentSport === 'basquete'
  const isLiveMatch = match.isLive ?? true
  const scheduledDateTime = match.dateTime ?? match.time ?? currentTime
  const liveStreamImage = isBasketball ? streamingBasquete : streamingFutebol
  const eventBallIcon = isBasketball ? iconBasquete : iconFutebol
  const playerAvatarFallback = isBasketball ? playerAvatarBasquete : playerAvatarFutebol
  const earlyPayoutImage = pagamentoAntecipado
  const resultMarketTitle = isBasketball ? 'Vencedor' : 'Resultado final'
  const fieldTabLabel = isBasketball ? 'Quadra' : 'Campo'
  const fieldViewLabel = isBasketball ? 'Visão da Quadra' : 'Visão do Campo'
  const playerMarketTitle = isBasketball ? 'Pontos do Jogador' : 'Finalizações ao Gol'
  const playerPropsMarketId = isBasketball ? 'pontos-jogador' : 'finalizacao-gol'
  const assistsMarketId = 'assistencias'
  const primaryTotalMarketTitle = isBasketball ? 'Total de Pontos' : 'Total de Gols'
  const secondaryMarketTitle = isBasketball ? 'Handicap' : 'Total de Escanteios'
  const tertiaryMarketTitle = isBasketball ? '3° Quarto - Total de Pontos' : 'Total de Cartões'
  const finalMarketTitle = isBasketball ? '4° Quarto - Total de Pontos' : 'Dupla Chance'
  const eventId = getBetslipEventId({
    sport: contentSport,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
  })
  const buildEventPlayerPropCards = (marketId: string, fallbackRows: PlayerShotMarket[] = []): MatchPlayerProp[] => {
    const syncedCards = isLiveMatch
      ? getLivePlayerProps({
        ...match,
        id: match.id ?? 'live-event',
        time: match.time ?? scheduledDateTime,
      }, contentSport, marketId, LIVE_EVENT_PLAYER_PROPS_PER_MARKET)
      : getMatchPlayerProps({
        id: match.id ?? 'live-event',
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
      }, contentSport, marketId, LIVE_EVENT_PLAYER_PROPS_PER_MARKET)
    const fallbackCards: MatchPlayerProp[] = fallbackRows.map((row) => {
      const teamSide = row.team === match.awayTeam.name ? 'away' : 'home'

      return {
        id: `${match.id ?? 'live-event'}-${row.id}`,
        playerName: row.player,
        teamName: row.team,
        teamIcon: teamSide === 'away' ? match.awayTeam.icon : match.homeTeam.icon,
        teamSide,
        sport: contentSport,
        position: row.position ?? getPlayerPropCardPosition(row.player, isBasketball),
        image: row.image ?? getLocalPlayerImage(row.team, row.player) ?? playerAvatarFallback,
        options: row.outcomes.map((outcome, outcomeIndex) => ({
          label: outcome.label,
          odd: outcome.odd,
          active: outcomeIndex === Math.min(1, row.outcomes.length - 1),
        })),
      }
    })
    const uniqueCardKeys = new Set<string>()
    const playerCards = [...syncedCards, ...fallbackCards].reduce<MatchPlayerProp[]>((cards, player) => {
      const cardKey = `${normalizePlayerName(player.teamName)}:${normalizePlayerName(player.playerName)}`
      if (cards.length >= LIVE_EVENT_PLAYER_PROPS_PER_MARKET || uniqueCardKeys.has(cardKey)) return cards

      uniqueCardKeys.add(cardKey)
      cards.push(player)
      return cards
    }, [])

    return playerCards.map((player) => ({
      ...player,
      eventId,
      marketId,
      eventStatus: isLiveMatch ? 'live' as const : 'prematch' as const,
      leagueId: match.leagueId,
      leagueName: match.leagueName ?? leagueName,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      eventTimeLabel: isLiveMatch ? displayTime : scheduledDateTime,
      liveClock: isLiveMatch ? displayTime : undefined,
      homeScore: match.homeTeam.score,
      awayScore: match.awayTeam.score,
    }))
  }
  const playerPropCards = buildEventPlayerPropCards(playerPropsMarketId, getPlayerPropRows(match, isBasketball, true))
  const assistPlayerPropCards = buildEventPlayerPropCards(assistsMarketId, getAssistPlayerPropRows(match, isBasketball))
  const primaryTotalRows = isBasketball ? getTotalPointsRows(match) : getTotalGoalsRows(match, false)
  const secondaryRows = isBasketball ? getHandicapRows(match) : getTotalCornersRows(match)
  const tertiaryRows = isBasketball ? getQuarterTotalRows(match.q3TotalOdds) : getTotalCardsRows()
  const finalRows = isBasketball ? getQuarterTotalRows(match.q4TotalOdds) : []
  const doubleChanceRows = isBasketball ? [] : getDoubleChanceRows(match)
  const resolvedHomeTeamIcon = useSportsDbTeamLogo(match.homeTeam.name, match.homeTeam.icon, contentSport, getLiveEventSportFallbackIcon(), {
    useCurrentLogoFallback: true,
  })
  const resolvedAwayTeamIcon = useSportsDbTeamLogo(match.awayTeam.name, match.awayTeam.icon, contentSport, getLiveEventSportFallbackIcon(), {
    useCurrentLogoFallback: true,
  })
  const homeTeamIcon = getLiveEventTeamIconView(resolvedHomeTeamIcon)
  const awayTeamIcon = getLiveEventTeamIconView(resolvedAwayTeamIcon)
  const homeLogoGlowColor = useLogoGlowColor(
    homeTeamIcon.src,
    match.homeTeam.name,
    homeTeamIcon.isFallback,
    LIVE_EVENT_HOME_FALLBACK_GLOW
  )
  const awayLogoGlowColor = useLogoGlowColor(
    awayTeamIcon.src,
    match.awayTeam.name,
    awayTeamIcon.isFallback,
    LIVE_EVENT_AWAY_FALLBACK_GLOW
  )
  const homeEvents = isLiveMatch ? getMatchEvents(match.homeTeam.name, match.homeTeam.score, isBasketball, displayTime) : []
  const awayEvents = isLiveMatch ? getMatchEvents(match.awayTeam.name, match.awayTeam.score, isBasketball, displayTime) : []
  const homePrimaryEvent = homeEvents[0]
  const awayPrimaryEvent = awayEvents[0]
  const homeExtraEventsCount = Math.max(0, homeEvents.length - 1)
  const awayExtraEventsCount = Math.max(0, awayEvents.length - 1)
  const resultMarketId = isBasketball ? 'vencedor' : 'resultado-final'
  const primaryTotalMarketId = isBasketball ? 'total-pontos' : 'total-gols'
  const secondaryMarketId = isBasketball ? 'handicap' : 'escanteios'
  const tertiaryMarketId = isBasketball ? 'q3-total' : 'total-cartoes'
  const finalMarketId = isBasketball ? 'q4-total' : 'dupla-chance'
  const getMarketTitle = (marketId: string) => {
    if (marketId === resultMarketId) return resultMarketTitle
    if (marketId === playerPropsMarketId) return playerMarketTitle
    if (marketId === assistsMarketId) return 'Assistências'
    if (marketId === primaryTotalMarketId) return primaryTotalMarketTitle
    if (marketId === secondaryMarketId) return secondaryMarketTitle
    if (marketId === tertiaryMarketId) return tertiaryMarketTitle
    if (marketId === finalMarketId) return finalMarketTitle

    return marketId
  }
  const getMarketTags = (marketId: string) => {
    if (isBasketball) return []
    if (marketId === resultMarketId) return ['PA', '90’']
    if ([primaryTotalMarketId, secondaryMarketId, tertiaryMarketId, finalMarketId].includes(marketId)) return ['90’']

    return []
  }
  const renderMarketOddButton = (
    marketId: string,
    outcomeId: string,
    label: ReactNode,
    odd: ReactNode,
    className = 'live-event-page__market-odd',
    labelClassName?: string,
    labelAriaLabel?: string
  ) => {
    const betslipKey = getMatchOddBetslipKey({
      sport: contentSport,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      marketId,
      outcomeId,
      label,
    })
    const groupId = betslipKey.groupId

    return (
      <button
        key={`${groupId}:${betslipKey.outcomeId}`}
        {...getOddButtonProps(
          `${groupId}:${betslipKey.outcomeId}`,
          groupId,
          className,
          createBetslipSelection({
            eventId,
            marketId: betslipKey.marketId,
            outcomeId: betslipKey.outcomeId,
            label,
            odd,
            marketLabel: getMarketTitle(marketId),
            eventStatus: isLiveMatch ? 'live' : 'prematch',
            sport: contentSport,
            leagueId: match.leagueId,
            leagueName: match.leagueName ?? leagueName,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            eventTimeLabel: isLiveMatch ? displayTime : scheduledDateTime,
            liveClock: isLiveMatch ? displayTime : undefined,
            homeScore: match.homeTeam.score,
            awayScore: match.awayTeam.score,
            badgeType: marketId === resultMarketId ? 'boost' : undefined,
            marketTags: getMarketTags(marketId),
          })
        )}
      >
        <span className={labelClassName} aria-label={labelAriaLabel}>{label}</span>
        <strong>{odd}</strong>
      </button>
    )
  }

  useEffect(() => {
    expansionProgressRef.current = expansionProgress
  }, [expansionProgress])

  const syncStickyScoreHeaderVisibility = useCallback((isVisible: boolean) => {
    if (stickyScoreHeaderVisibleRef.current === isVisible) return

    stickyScoreHeaderVisibleRef.current = isVisible
    setIsStickyScoreHeaderVisible(isVisible)
  }, [])

  const updateStickyScoreHeaderVisibility = useCallback(() => {
    const scrollElement = scrollRef.current
    const scoreElement = scoreBoxRef.current

    if (!scrollElement || !scoreElement) {
      syncStickyScoreHeaderVisibility(false)
      return
    }

    const scoreRect = scoreElement.getBoundingClientRect()
    const scrollRect = scrollElement.getBoundingClientRect()
    syncStickyScoreHeaderVisibility(scoreRect.bottom <= scrollRect.top + 1)
  }, [syncStickyScoreHeaderVisibility])

  const handleContentScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    pendingScrollTopRef.current = event.currentTarget.scrollTop

    if (scrollAnimationFrameRef.current !== null) return

    scrollAnimationFrameRef.current = window.requestAnimationFrame(() => {
      scrollAnimationFrameRef.current = null

      const scrollTop = pendingScrollTopRef.current

      lastScrollTopRef.current = scrollTop
      updateStickyScoreHeaderVisibility()
    })
  }, [updateStickyScoreHeaderVisibility])

  const handleContentWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    if (disableSheetInteractions) return

    const verticalDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : 0
    if (verticalDelta === 0) return

    const scrollElement = event.currentTarget
    const currentProgress = expansionProgressRef.current
    const isAtScrollTop = scrollElement.scrollTop <= LIVE_EVENT_PULL_TOP_THRESHOLD
    const shouldExpand = verticalDelta > 0 && currentProgress < 1
    const shouldCollapse = verticalDelta < 0 && (currentProgress < 1 || isAtScrollTop)

    if (!shouldExpand && !shouldCollapse) return

    event.preventDefault()
    event.stopPropagation()

    onCompactPullChange(0)

    const nextProgress = clampLiveEventExpansionProgress(
      currentProgress + verticalDelta / LIVE_EVENT_EXPANSION_WHEEL_DISTANCE
    )

    expansionProgressRef.current = nextProgress
    onExpansionProgressChange(nextProgress, { deferSettle: true })
  }, [disableSheetInteractions, onCompactPullChange, onExpansionProgressChange])

  useEffect(() => {
    const syncTimer = window.setTimeout(() => setDisplayTime(currentTime), 0)
    // O jogo de NFL não conta sozinho: `currentTime` já chega comprimido pelo feed, e descontar
    // mais um segundo por segundo em cima dele faria a etiqueta divergir do placar.
    if (!isLiveMatch || hasNflLiveClock(match.id)) return () => window.clearTimeout(syncTimer)
    const parsed = parseLiveTime(currentTime)
    if (!parsed) return () => window.clearTimeout(syncTimer)
    let totalSeconds = parsed.totalSeconds
    const interval = setInterval(() => {
      totalSeconds = parsed.isQuarter ? totalSeconds - 1 : totalSeconds + 1
      setDisplayTime(formatLiveTime(parsed.prefix, totalSeconds))
    }, 1000)
    return () => {
      window.clearTimeout(syncTimer)
      clearInterval(interval)
    }
  }, [currentTime, isLiveMatch, match.id])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsResultMarketOpen(true)
      setIsShotsMarketOpen(true)
      setIsTotalGoalsMarketOpen(true)
      setIsCornersMarketOpen(true)
      setIsCardsMarketOpen(true)
      setIsDoubleChanceMarketOpen(true)
      syncStickyScoreHeaderVisibility(false)
      scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [match, syncStickyScoreHeaderVisibility])

  useEffect(() => () => {
    if (scrollAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollAnimationFrameRef.current)
      scrollAnimationFrameRef.current = null
    }
  }, [])

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(updateStickyScoreHeaderVisibility)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [isExpanded, updateStickyScoreHeaderVisibility])

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(updateStickyScoreHeaderVisibility)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [match, updateStickyScoreHeaderVisibility])

  useEffect(() => {
    if (disableSheetInteractions) return

    const scrollElement = scrollRef.current
    if (!scrollElement || !isMobileTouchScreen()) return

    const handleTouchStart = (event: globalThis.TouchEvent) => {
      if (event.touches.length !== 1) {
        expansionGestureRef.current = null
        return
      }

      const touch = event.touches[0]
      if (!touch) return

      const currentProgress = expansionProgressRef.current
      if (currentProgress > 0) onBlockNextClose()

      const target = event.target as Element | null
      const startedOnHorizontalScroller = !!target?.closest('.live-event-page__player-odds-row')
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()

      expansionGestureRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startProgress: currentProgress,
        startedAtScrollTop: scrollElement.scrollTop <= LIVE_EVENT_PULL_TOP_THRESHOLD,
        isControlling: false,
        pullDistance: 0,
        lastProgress: currentProgress,
        startedAt: now,
        horizontalLocked: false,
        lastX: touch.clientX,
        lastT: now,
        startedOnHorizontalScroller,
        canCloseFromPull: currentProgress <= 0 && !isExpanded,
      }
    }

    const handleTouchMove = (event: globalThis.TouchEvent) => {
      const gesture = expansionGestureRef.current
      const touch = event.touches[0]
      if (!gesture || !touch) return

      const dx = touch.clientX - gesture.startX
      const dy = touch.clientY - gesture.startY
      const currentProgress = expansionProgressRef.current
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()

      if (gesture.startProgress > 0) onBlockNextClose()

      gesture.lastX = touch.clientX
      gesture.lastT = now

      if (gesture.horizontalLocked) {
        if (event.cancelable) event.preventDefault()
        event.stopPropagation()
        onSwipeMove(dx)
        return
      }

      const hasVerticalIntent = Math.abs(dy) >= LIVE_EVENT_PULL_START_THRESHOLD && Math.abs(dy) > Math.abs(dx)
      const hasHorizontalIntent = currentProgress < 1
        && Math.abs(dx) >= LIVE_EVENT_SWIPE_INTENT_THRESHOLD
        && Math.abs(dx) > Math.abs(dy)

      if (!gesture.isControlling) {
        if (hasHorizontalIntent && !gesture.startedOnHorizontalScroller) {
          gesture.horizontalLocked = true
          if (event.cancelable) event.preventDefault()
          event.stopPropagation()
          onSwipeStart()
          onSwipeMove(dx)
          return
        }

        const wantsExpand = dy <= -LIVE_EVENT_PULL_START_THRESHOLD && currentProgress < 1
        const wantsCollapse = dy >= LIVE_EVENT_PULL_START_THRESHOLD
          && (
            currentProgress < 1
            || (currentProgress >= 1 && gesture.startedAtScrollTop)
          )

        if (!hasVerticalIntent || (!wantsExpand && !wantsCollapse)) return

        gesture.isControlling = true
      }

      if (event.cancelable) event.preventDefault()
      event.stopPropagation()

      const nextProgress = clampLiveEventExpansionProgress(
        gesture.startProgress - dy / LIVE_EVENT_EXPANSION_TOUCH_DISTANCE
      )
      const distanceToCompact = gesture.startProgress * LIVE_EVENT_EXPANSION_TOUCH_DISTANCE
      const compactPullDistance = dy > distanceToCompact
        ? getCompactPullDistance(dy - distanceToCompact)
        : 0

      gesture.lastProgress = nextProgress
      gesture.pullDistance = nextProgress <= 0 ? compactPullDistance : 0
      expansionProgressRef.current = nextProgress

      onExpansionProgressChange(nextProgress)
      onCompactPullChange(gesture.pullDistance)
    }

    const finishGesture = () => {
      const gesture = expansionGestureRef.current
      expansionGestureRef.current = null
      if (!gesture) return

      if (gesture.horizontalLocked) {
        const dx = gesture.lastX - gesture.startX
        const dt = Math.max(1, gesture.lastT - gesture.startedAt)
        onSwipeEnd(dx, dx / dt)
        return
      }

      if (!gesture.isControlling) return

      if (gesture.pullDistance > 0) {
        const didPullPastCloseThreshold = gesture.pullDistance >= LIVE_EVENT_CLOSE_PULL_THRESHOLD

        if (gesture.canCloseFromPull || didPullPastCloseThreshold) {
          onCompactPullEnd(gesture.pullDistance)
          if (didPullPastCloseThreshold) return
        } else {
          onCompactPullChange(0)
        }
      } else {
        onCompactPullChange(0)
      }

      onExpansionGestureEnd(gesture.lastProgress)
    }

    scrollElement.addEventListener('touchstart', handleTouchStart, { passive: true })
    scrollElement.addEventListener('touchmove', handleTouchMove, { passive: false })
    scrollElement.addEventListener('touchend', finishGesture)
    scrollElement.addEventListener('touchcancel', finishGesture)

    return () => {
      scrollElement.removeEventListener('touchstart', handleTouchStart)
      scrollElement.removeEventListener('touchmove', handleTouchMove)
      scrollElement.removeEventListener('touchend', finishGesture)
      scrollElement.removeEventListener('touchcancel', finishGesture)
    }
  }, [disableSheetInteractions, isExpanded, onBlockNextClose, onCompactPullChange, onCompactPullEnd, onExpansionGestureEnd, onExpansionProgressChange, onSwipeStart, onSwipeMove, onSwipeEnd])

  const handleCloseHandlePointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    if (expansionProgressRef.current > 0) onBlockNextClose()
    dragStartYRef.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleCloseHandlePointerUp = (event: PointerEvent<HTMLSpanElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const dragStartY = dragStartYRef.current
    dragStartYRef.current = null
    const dragDistance = dragStartY === null ? 0 : event.clientY - dragStartY

    if (Math.abs(dragDistance) <= 8) {
      if (isExpanded || expansionProgressRef.current > 0) {
        onRequestClose()
      } else {
        onRequestClose({ force: true })
      }
      return
    }

    if (dragDistance >= 32) {
      if (isExpanded) {
        onRequestCollapse()
      } else {
        onRequestClose({ force: true })
      }
    } else if (dragDistance <= -32 && !isExpanded) {
      onRequestExpand()
    }
  }

  const handleCloseHandlePointerCancel = () => {
    dragStartYRef.current = null
  }

  const handleStickyCollapsePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!isExpanded) return

    onBlockNextClose()
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    stickyCollapseGestureRef.current = {
      startY: event.clientY,
      startProgress: expansionProgressRef.current,
      lastProgress: expansionProgressRef.current,
      isDragging: false,
    }
  }

  const handleStickyCollapsePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = stickyCollapseGestureRef.current
    if (!gesture) return

    event.preventDefault()
    event.stopPropagation()
    onBlockNextClose()

    const dy = Math.max(0, event.clientY - gesture.startY)
    if (dy < LIVE_EVENT_PULL_START_THRESHOLD && !gesture.isDragging) return

    gesture.isDragging = true
    const nextProgress = clampLiveEventExpansionProgress(
      gesture.startProgress - dy / LIVE_EVENT_EXPANSION_TOUCH_DISTANCE
    )

    gesture.lastProgress = nextProgress
    expansionProgressRef.current = nextProgress
    onExpansionProgressChange(nextProgress)
  }

  const handleStickyCollapsePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = stickyCollapseGestureRef.current
    stickyCollapseGestureRef.current = null

    if (!gesture) return

    event.preventDefault()
    event.stopPropagation()

    if (!gesture.isDragging) {
      onRequestCollapse()
      return
    }

    onExpansionGestureEnd(gesture.lastProgress)
  }

  const handleStickyCollapsePointerCancel = () => {
    const gesture = stickyCollapseGestureRef.current
    stickyCollapseGestureRef.current = null

    if (!gesture?.isDragging) return
    onExpansionGestureEnd(gesture.lastProgress)
  }

  const handleTopAreaClick = () => {
    if (isExpanded || expansionProgressRef.current > 0) {
      onRequestClose()
      return
    }

    onRequestClose({ force: true })
  }

  return (
    <div
      className={`live-event-page__content${isLiveMatch ? '' : ' live-event-page__content--prematch'}`}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className={[
          'live-event-page__sticky-score-header',
          'header--gradient-v3',
          isLiveMatch ? '' : 'live-event-page__sticky-score-header--prematch',
          isStickyScoreHeaderVisible ? 'live-event-page__sticky-score-header--visible' : '',
        ].filter(Boolean).join(' ')}
        aria-hidden={!isStickyScoreHeaderVisible}
        onPointerDown={handleStickyCollapsePointerDown}
        onPointerMove={handleStickyCollapsePointerMove}
        onPointerUp={handleStickyCollapsePointerUp}
        onPointerCancel={handleStickyCollapsePointerCancel}
      >
        <div className="header__bg-light" aria-hidden="true" />
        <div className="header__bg-dark" aria-hidden="true" />
        <div className="header__bg-gradient" aria-hidden="true" />
        <span className="live-event-page__sticky-collapse-handle" aria-hidden="true">
          <span />
        </span>
        <div className="live-event-page__sticky-score-inner">
          <div className="live-event-page__sticky-score-team">
            {homeTeamIcon.src && (
              <img
                src={homeTeamIcon.src}
                alt=""
                className={[
                  'live-event-page__sticky-score-logo',
                ].filter(Boolean).join(' ')}
              />
            )}
          </div>
          <div
            className={`live-event-page__sticky-score-board${isLiveMatch ? '' : ' live-event-page__sticky-score-board--prematch'}`}
            aria-label={isLiveMatch
              ? `Placar: ${match.homeTeam.score} a ${match.awayTeam.score}, ${displayTime}`
              : `${match.homeTeam.name} contra ${match.awayTeam.name}, ${scheduledDateTime}`}
          >
            {isLiveMatch ? (
              <div className="live-event-page__sticky-score-row">
                <span className="live-event-page__sticky-score-value">{match.homeTeam.score}</span>
                <span className="live-event-page__sticky-score-separator">:</span>
                <span className="live-event-page__sticky-score-value">{match.awayTeam.score}</span>
              </div>
            ) : (
              <span className="live-event-page__sticky-matchup-separator">x</span>
            )}
            <span className="live-event-page__sticky-score-time">
              {isLiveMatch ? displayTime : scheduledDateTime}
            </span>
          </div>
          <div className="live-event-page__sticky-score-team">
            {awayTeamIcon.src && (
              <img
                src={awayTeamIcon.src}
                alt=""
                className={[
                  'live-event-page__sticky-score-logo',
                ].filter(Boolean).join(' ')}
              />
            )}
          </div>
        </div>
      </div>
      {/* Scrollable content */}
      <div
        className="live-event-page__scroll"
        ref={scrollRef}
        onScroll={handleContentScroll}
        onWheel={handleContentWheel}
      >
        <div className="live-event-page__scroll-body header--gradient-v3">
          <div className="header__bg-light" aria-hidden="true" />
          <div className="header__bg-dark" aria-hidden="true" />
          <div className="header__bg-gradient" aria-hidden="true" />
          <button
            type="button"
            className="live-event-page__top-close-area"
            aria-label="Fechar evento"
            onClick={handleTopAreaClick}
          >
            <span
              className="live-event-page__drag-handle"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={handleCloseHandlePointerDown}
              onPointerUp={handleCloseHandlePointerUp}
              onPointerCancel={handleCloseHandlePointerCancel}
            >
              <span />
            </span>
          </button>

          {/* ── Match card ── */}
          <div className={`live-event-page__match-card${isLiveMatch ? '' : ' live-event-page__match-card--prematch'}`}>

          {/* League name */}
          <span className="live-event-page__league-name">{leagueName}</span>

          {isLiveMatch ? (
            <div className="live-event-page__live-row">
              <div className="live-event-page__tag-aovivo">
                <div className="live-event-page__tag-icon-wrapper">
                  <img src={iconAoVivo} alt="" className="live-event-page__tag-icon" />
                </div>
                <span>Ao Vivo</span>
              </div>
              <span className="live-event-page__match-time">{displayTime}</span>
            </div>
          ) : (
            <div className="live-event-page__prematch-date-row">
              <span className="live-event-page__prematch-date">{scheduledDateTime}</span>
            </div>
          )}

          {/* Confronto — logos + placar */}
          <div
            className={`live-event-page__confronto${isLiveMatch ? '' : ' live-event-page__confronto--prematch'}`}
            ref={scoreBoxRef}
          >

            {/* Home */}
            <div className="live-event-page__team-block live-event-page__team-block--home">
              <div className="live-event-page__team-info">
                <div className="live-event-page__logo-container">
                  {homeTeamIcon.src ? (
                    <>
                      <span
                        className="live-event-page__logo-glow"
                        style={getLogoGlowStyle(homeLogoGlowColor)}
                        aria-hidden="true"
                      />
                      <img
                        src={homeTeamIcon.src}
                        alt={match.homeTeam.name}
                        className={[
                          'live-event-page__logo',
                        ].filter(Boolean).join(' ')}
                      />
                    </>
                  ) : (
                    <div className="live-event-page__logo-placeholder" />
                  )}
                </div>
                <span className="live-event-page__team-name">{match.homeTeam.name}</span>
              </div>
              {isLiveMatch && <div className="live-event-page__score">{match.homeTeam.score}</div>}
            </div>

            {isLiveMatch ? (
              <div className="live-event-page__score-separator">:</div>
            ) : (
              <div className="live-event-page__matchup-separator">x</div>
            )}

            {/* Away */}
            <div className="live-event-page__team-block live-event-page__team-block--away">
              {isLiveMatch && <div className="live-event-page__score">{match.awayTeam.score}</div>}
              <div className="live-event-page__team-info">
                <div className="live-event-page__logo-container">
                  {awayTeamIcon.src ? (
                    <>
                      <span
                        className="live-event-page__logo-glow"
                        style={getLogoGlowStyle(awayLogoGlowColor)}
                        aria-hidden="true"
                      />
                      <img
                        src={awayTeamIcon.src}
                        alt={match.awayTeam.name}
                        className={[
                          'live-event-page__logo',
                        ].filter(Boolean).join(' ')}
                      />
                    </>
                  ) : (
                    <div className="live-event-page__logo-placeholder" />
                  )}
                </div>
                <span className="live-event-page__team-name">{match.awayTeam.name}</span>
              </div>
            </div>
          </div>

          {isLiveMatch && (
            <>
              {/* Eventos da partida */}
              <div className="live-event-page__events">
                <div className="live-event-page__events-side-frame">
                  <div className="live-event-page__events-side live-event-page__events-side--home">
                    {homePrimaryEvent && (
                      <div className="live-event-page__event">
                        {homePrimaryEvent.type === 'goal' ? (
                          <img src={eventBallIcon} alt="" className="live-event-page__event-ball" />
                        ) : (
                          <div className={`live-event-page__event-icon live-event-page__event-icon--${homePrimaryEvent.type}`} />
                        )}
                        <span className="live-event-page__event-text">
                          {getMatchEventLabel(homePrimaryEvent)}
                        </span>
                      </div>
                    )}
                    {homeExtraEventsCount > 0 && (
                      <span className="live-event-page__event-more">[+{homeExtraEventsCount}]</span>
                    )}
                  </div>
                </div>
                <div className="live-event-page__events-side-frame live-event-page__events-side-frame--away">
                  <div className="live-event-page__events-side live-event-page__events-side--away">
                    {awayPrimaryEvent && (
                      <div className="live-event-page__event">
                        <span className="live-event-page__event-text">
                          {getMatchEventLabel(awayPrimaryEvent)}
                        </span>
                        {awayPrimaryEvent.type === 'goal' ? (
                          <img src={eventBallIcon} alt="" className="live-event-page__event-ball" />
                        ) : (
                          <div className={`live-event-page__event-icon live-event-page__event-icon--${awayPrimaryEvent.type}`} />
                        )}
                      </div>
                    )}
                    {awayExtraEventsCount > 0 && (
                      <span className="live-event-page__event-more">[+{awayExtraEventsCount}]</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats link */}
              <button className="live-event-page__stats-btn">
                <span>Ver mais estatísticas</span>
              </button>
            </>
          )}
        </div>

        {/* ── Tabs ── */}
        {isLiveMatch && (
          <>
            <div className="live-event-page__tabs">
              <button
                className={`live-event-page__tab${activeTab === 'transmissao' ? ' live-event-page__tab--active' : ''}`}
                onClick={() => setActiveTab('transmissao')}
              >
                <MonitorPlayIcon aria-hidden="true" className="live-event-page__tab-icon" weight="bold" />
                <span>Transmissão</span>
              </button>
              <button
                className={`live-event-page__tab${activeTab === 'campo' ? ' live-event-page__tab--active' : ''}`}
                onClick={() => setActiveTab('campo')}
              >
                {isBasketball ? (
                  <CourtBasketballIcon aria-hidden="true" className="live-event-page__tab-field-icon" weight="bold" />
                ) : (
                  <SoccerBallIcon aria-hidden="true" className="live-event-page__tab-field-icon" weight="bold" />
                )}
                <span>{fieldTabLabel}</span>
              </button>
            </div>

            {/* ── Streaming / Campo ── */}
            {activeTab === 'transmissao' ? (
              <div className="live-event-page__streaming">
                {/* TODO: substituir por player real */}
                <img src={liveStreamImage} alt="Transmissão ao vivo" className="live-event-page__stream-img" />
                <div className="live-event-page__live-badge">LIVE</div>
                <button className="live-event-page__stream-btn live-event-page__stream-btn--top-right" aria-label="Fechar">
                  <CloseStreamIcon />
                </button>
                <div className="live-event-page__stream-controls">
                  <button className="live-event-page__stream-btn" aria-label="Pausar">
                    <PauseIcon />
                  </button>
                  <button className="live-event-page__stream-btn" aria-label="Mudo">
                    <MuteIcon />
                  </button>
                </div>
                <button className="live-event-page__stream-btn live-event-page__stream-btn--fullscreen" aria-label="Tela cheia">
                  <FullscreenIcon />
                </button>
              </div>
            ) : (
              <div className="live-event-page__campo">
                {/* TODO: adicionar visão do campo */}
                <span className="live-event-page__campo-label">{fieldViewLabel}</span>
                <span className="live-event-page__campo-sub">Em breve</span>
              </div>
            )}
          </>
        )}

        <div className="live-event-page__detail-tabs" aria-label="Navegação do evento">
          {detailTabs.map((tab) => (
            <button
              key={tab.id}
              className={`live-event-page__detail-tab${activeDetailTab === tab.id ? ' live-event-page__detail-tab--active' : ''}`}
              onClick={() => setActiveDetailTab(tab.id)}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Market card (Resultado Final) ── */}
        <div className={`live-event-page__market-card${isResultMarketOpen ? '' : ' live-event-page__market-card--closed'}`}>
          <div className="live-event-page__market-header">
            <span className="live-event-page__market-title">{resultMarketTitle}</span>
            <div className="live-event-page__market-actions">
              <div className="live-event-page__market-ca-box">
                <span className="live-event-page__market-ca">CA</span>
              </div>
              <button
                type="button"
                className="live-event-page__market-toggle"
                aria-label={isResultMarketOpen ? 'Recolher mercado' : 'Expandir mercado'}
                aria-expanded={isResultMarketOpen}
                onClick={() => setIsResultMarketOpen((current) => !current)}
              >
                <CaretRightIcon
                  aria-hidden="true"
                  className={`live-event-page__market-chevron${isResultMarketOpen ? '' : ' live-event-page__market-chevron--closed'}`}
                  weight="bold"
                />
              </button>
            </div>
          </div>

          <div className="live-event-page__market-tags">
            <div className="live-event-page__market-tag">
              <span>Pag. Antecipado</span>
              <span className="live-event-page__market-tag-badge">
                <img src={earlyPayoutImage} alt="" className="live-event-page__market-tag-img" />
              </span>
            </div>
            <div className="live-event-page__market-tag">
              <span>Múltipla Turbinada</span>
              <span className="live-event-page__market-tag-badge">
                <img src={multiplaTurbinada} alt="" className="live-event-page__market-tag-img" />
              </span>
            </div>
          </div>

          <div className={`live-event-page__market-collapse${isResultMarketOpen ? ' live-event-page__market-collapse--open' : ''}`}>
            <div className="live-event-page__market-collapse-inner">
              <div className="live-event-page__market-odds">
                {renderMarketOddButton(resultMarketId, 'home', match.homeTeam.name, match.odds.home)}
                {match.odds.draw && (
                  renderMarketOddButton(resultMarketId, 'draw', 'Empate', match.odds.draw)
                )}
                {renderMarketOddButton(resultMarketId, 'away', match.awayTeam.name, match.odds.away)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Market card (Finalizações ao Gol) ── */}
        {playerPropCards.length > 0 && (
        <div className={`live-event-page__market-card live-event-page__market-card--player-props${isShotsMarketOpen ? '' : ' live-event-page__market-card--closed'}`}>
          <div className="live-event-page__market-header">
            <span className="live-event-page__market-title">{playerMarketTitle}</span>
            <div className="live-event-page__market-actions">
              <div className="live-event-page__market-ca-box">
                <span className="live-event-page__market-ca">CA</span>
              </div>
              <button
                type="button"
                className="live-event-page__market-toggle"
                aria-label={isShotsMarketOpen ? 'Recolher mercado' : 'Expandir mercado'}
                aria-expanded={isShotsMarketOpen}
                onClick={() => setIsShotsMarketOpen((current) => !current)}
              >
                <CaretRightIcon
                  aria-hidden="true"
                  className={`live-event-page__market-chevron${isShotsMarketOpen ? '' : ' live-event-page__market-chevron--closed'}`}
                  weight="bold"
                />
              </button>
            </div>
          </div>

          <div className={`live-event-page__market-collapse${isShotsMarketOpen ? ' live-event-page__market-collapse--open' : ''}`}>
            <div className="live-event-page__market-collapse-inner">
              <div
                className="prematch-section__player-props live-event-page__player-props-slider"
                aria-label={`Cards de ${playerMarketTitle}`}
              >
                {playerPropCards.map((player) => (
                  <PreMatchPlayerPropCard key={player.id} player={player} />
                ))}
              </div>
            </div>
          </div>
        </div>
        )}

        {assistPlayerPropCards.length > 0 && (
          <div className={`live-event-page__market-card live-event-page__market-card--player-props${isAssistsMarketOpen ? '' : ' live-event-page__market-card--closed'}`}>
            <div className="live-event-page__market-header">
              <span className="live-event-page__market-title">Assistências</span>
              <div className="live-event-page__market-actions">
                <div className="live-event-page__market-ca-box">
                  <span className="live-event-page__market-ca">CA</span>
                </div>
                <button
                  type="button"
                  className="live-event-page__market-toggle"
                  aria-label={isAssistsMarketOpen ? 'Recolher mercado' : 'Expandir mercado'}
                  aria-expanded={isAssistsMarketOpen}
                  onClick={() => setIsAssistsMarketOpen((current) => !current)}
                >
                  <CaretRightIcon
                    aria-hidden="true"
                    className={`live-event-page__market-chevron${isAssistsMarketOpen ? '' : ' live-event-page__market-chevron--closed'}`}
                    weight="bold"
                  />
                </button>
              </div>
            </div>

            <div className="live-event-page__market-tags">
              <div className="live-event-page__market-tag">
                <span>Substituição Garantida</span>
                <span className="live-event-page__market-tag-badge">
                  <img src={substituicaoGarantida} alt="" className="live-event-page__market-tag-img" />
                </span>
              </div>
              <div className="live-event-page__market-tag">
                <span>Múltipla Turbinada</span>
                <span className="live-event-page__market-tag-badge">
                  <img src={multiplaTurbinada} alt="" className="live-event-page__market-tag-img" />
                </span>
              </div>
            </div>

            <div className={`live-event-page__market-collapse${isAssistsMarketOpen ? ' live-event-page__market-collapse--open' : ''}`}>
              <div className="live-event-page__market-collapse-inner">
                <div
                  className="prematch-section__player-props live-event-page__player-props-slider"
                  aria-label="Cards de Assistências"
                >
                  {assistPlayerPropCards.map((player) => (
                    <PreMatchPlayerPropCard key={player.id} player={player} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Market card (Total de Gols) ── */}
        <div className={`live-event-page__market-card${isTotalGoalsMarketOpen ? '' : ' live-event-page__market-card--closed'}`}>
          <div className="live-event-page__market-header">
            <span className="live-event-page__market-title">{primaryTotalMarketTitle}</span>
            <div className="live-event-page__market-actions">
              <div className="live-event-page__market-ca-box">
                <span className="live-event-page__market-ca">CA</span>
              </div>
              <button
                type="button"
                className="live-event-page__market-toggle"
                aria-label={isTotalGoalsMarketOpen ? 'Recolher mercado' : 'Expandir mercado'}
                aria-expanded={isTotalGoalsMarketOpen}
                onClick={() => setIsTotalGoalsMarketOpen((current) => !current)}
              >
                <CaretRightIcon
                  aria-hidden="true"
                  className={`live-event-page__market-chevron${isTotalGoalsMarketOpen ? '' : ' live-event-page__market-chevron--closed'}`}
                  weight="bold"
                />
              </button>
            </div>
          </div>

          <div className="live-event-page__market-tags">
            <div className="live-event-page__market-tag">
              <span>Múltipla Turbinada</span>
              <span className="live-event-page__market-tag-badge">
                <img src={multiplaTurbinada} alt="" className="live-event-page__market-tag-img" />
              </span>
            </div>
          </div>

          <div className={`live-event-page__market-collapse${isTotalGoalsMarketOpen ? ' live-event-page__market-collapse--open' : ''}`}>
            <div className="live-event-page__market-collapse-inner">
              <div className="live-event-page__total-goals-list">
                {primaryTotalRows.map((row) => {
                  const isCurrentRow = isLineMarketCurrentRow(row, isBasketball ? match.totalPointsOdds?.line : match.totalGoalsOdds?.line)
                  const underOutcomeId = getLiveEventLineOutcomeId(row, isCurrentRow, isBasketball ? 'under-points' : 'under')
                  const overOutcomeId = getLiveEventLineOutcomeId(row, isCurrentRow, isBasketball ? 'over-points' : 'over')

                  return (
                    <div key={row.id} className="live-event-page__total-goals-row">
                      {renderMarketOddButton(primaryTotalMarketId, underOutcomeId, row.under.label, row.under.odd)}
                      {renderMarketOddButton(primaryTotalMarketId, overOutcomeId, row.over.label, row.over.odd)}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Market card (Total de Escanteios) ── */}
        <div className={`live-event-page__market-card${isCornersMarketOpen ? '' : ' live-event-page__market-card--closed'}`}>
          <div className="live-event-page__market-header">
            <span className="live-event-page__market-title">{secondaryMarketTitle}</span>
            <div className="live-event-page__market-actions">
              <div className="live-event-page__market-ca-box">
                <span className="live-event-page__market-ca">CA</span>
              </div>
              <button
                type="button"
                className="live-event-page__market-toggle"
                aria-label={isCornersMarketOpen ? 'Recolher mercado' : 'Expandir mercado'}
                aria-expanded={isCornersMarketOpen}
                onClick={() => setIsCornersMarketOpen((current) => !current)}
              >
                <CaretRightIcon
                  aria-hidden="true"
                  className={`live-event-page__market-chevron${isCornersMarketOpen ? '' : ' live-event-page__market-chevron--closed'}`}
                  weight="bold"
                />
              </button>
            </div>
          </div>

          <div className="live-event-page__market-tags">
            <div className="live-event-page__market-tag">
              <span>Múltipla Turbinada</span>
              <span className="live-event-page__market-tag-badge">
                <img src={multiplaTurbinada} alt="" className="live-event-page__market-tag-img" />
              </span>
            </div>
          </div>

          <div className={`live-event-page__market-collapse${isCornersMarketOpen ? ' live-event-page__market-collapse--open' : ''}`}>
            <div className="live-event-page__market-collapse-inner">
              <div className="live-event-page__total-goals-list">
                {secondaryRows.map((row) => {
                  const isCurrentRow = isBasketball
                    ? isHandicapCurrentRow(row, match.handicapOdds?.line)
                    : isLineMarketCurrentRow(row, match.totalCornersOdds?.line)
                  const underOutcomeId = getLiveEventLineOutcomeId(row, isCurrentRow, isBasketball ? 'home-handicap' : 'under-corners')
                  const overOutcomeId = getLiveEventLineOutcomeId(row, isCurrentRow, isBasketball ? 'away-handicap' : 'over-corners')

                  return (
                    <div key={row.id} className="live-event-page__total-goals-row">
                      {renderMarketOddButton(secondaryMarketId, underOutcomeId, row.under.label, row.under.odd)}
                      {renderMarketOddButton(secondaryMarketId, overOutcomeId, row.over.label, row.over.odd)}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Market card (Total de Cartões) ── */}
        <div className={`live-event-page__market-card${isCardsMarketOpen ? '' : ' live-event-page__market-card--closed'}`}>
          <div className="live-event-page__market-header">
            <span className="live-event-page__market-title">{tertiaryMarketTitle}</span>
            <div className="live-event-page__market-actions">
              <div className="live-event-page__market-ca-box">
                <span className="live-event-page__market-ca">CA</span>
              </div>
              <button
                type="button"
                className="live-event-page__market-toggle"
                aria-label={isCardsMarketOpen ? 'Recolher mercado' : 'Expandir mercado'}
                aria-expanded={isCardsMarketOpen}
                onClick={() => setIsCardsMarketOpen((current) => !current)}
              >
                <CaretRightIcon
                  aria-hidden="true"
                  className={`live-event-page__market-chevron${isCardsMarketOpen ? '' : ' live-event-page__market-chevron--closed'}`}
                  weight="bold"
                />
              </button>
            </div>
          </div>

          <div className="live-event-page__market-tags">
            <div className="live-event-page__market-tag">
              <span>Múltipla Turbinada</span>
              <span className="live-event-page__market-tag-badge">
                <img src={multiplaTurbinada} alt="" className="live-event-page__market-tag-img" />
              </span>
            </div>
          </div>

          <div className={`live-event-page__market-collapse${isCardsMarketOpen ? ' live-event-page__market-collapse--open' : ''}`}>
            <div className="live-event-page__market-collapse-inner">
              <div className="live-event-page__total-goals-list">
                {tertiaryRows.map((row) => {
                  const isCurrentRow = isBasketball && isLineMarketCurrentRow(row, match.q3TotalOdds?.line)
                  const underOutcomeId = getLiveEventLineOutcomeId(row, isCurrentRow, isBasketball ? 'under-q3' : 'under')
                  const overOutcomeId = getLiveEventLineOutcomeId(row, isCurrentRow, isBasketball ? 'over-q3' : 'over')

                  return (
                    <div key={row.id} className="live-event-page__total-goals-row">
                      {renderMarketOddButton(tertiaryMarketId, underOutcomeId, row.under.label, row.under.odd)}
                      {renderMarketOddButton(tertiaryMarketId, overOutcomeId, row.over.label, row.over.odd)}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Market card (Dupla Chance) ── */}
        <div className={`live-event-page__market-card live-event-page__market-card--double-chance${isDoubleChanceMarketOpen ? '' : ' live-event-page__market-card--closed'}`}>
          <div className="live-event-page__market-header">
            <span className="live-event-page__market-title">{finalMarketTitle}</span>
            <div className="live-event-page__market-actions">
              <div className="live-event-page__market-ca-box">
                <span className="live-event-page__market-ca">CA</span>
              </div>
              <button
                type="button"
                className="live-event-page__market-toggle"
                aria-label={isDoubleChanceMarketOpen ? 'Recolher mercado' : 'Expandir mercado'}
                aria-expanded={isDoubleChanceMarketOpen}
                onClick={() => setIsDoubleChanceMarketOpen((current) => !current)}
              >
                <CaretRightIcon
                  aria-hidden="true"
                  className={`live-event-page__market-chevron${isDoubleChanceMarketOpen ? '' : ' live-event-page__market-chevron--closed'}`}
                  weight="bold"
                />
              </button>
            </div>
          </div>

          <div className="live-event-page__market-tags">
            <div className="live-event-page__market-tag">
              <span>Múltipla Turbinada</span>
              <span className="live-event-page__market-tag-badge">
                <img src={multiplaTurbinada} alt="" className="live-event-page__market-tag-img" />
              </span>
            </div>
          </div>

          <div className={`live-event-page__market-collapse${isDoubleChanceMarketOpen ? ' live-event-page__market-collapse--open' : ''}`}>
            <div className="live-event-page__market-collapse-inner">
              {isBasketball ? (
                <div className="live-event-page__total-goals-list">
                  {finalRows.map((row) => {
                    const isCurrentRow = isLineMarketCurrentRow(row, match.q4TotalOdds?.line)
                    const underOutcomeId = getLiveEventLineOutcomeId(row, isCurrentRow, 'under-q4')
                    const overOutcomeId = getLiveEventLineOutcomeId(row, isCurrentRow, 'over-q4')

                    return (
                      <div key={row.id} className="live-event-page__total-goals-row">
                        {renderMarketOddButton(finalMarketId, underOutcomeId, row.under.label, row.under.odd)}
                        {renderMarketOddButton(finalMarketId, overOutcomeId, row.over.label, row.over.odd)}
                      </div>
                    )
                  })}
                </div>
              ) : (
                doubleChanceRows.map((row) => (
                  <div key={row.id} className="live-event-page__market-odds live-event-page__market-odds--double-chance">
                    {row.options.map((option, optionIndex) => (
                      renderMarketOddButton(
                        finalMarketId,
                        liveEventDoubleChanceOutcomeIds[optionIndex] ?? option.label,
                        option.labelParts ? `${option.labelParts[0]}/${option.labelParts[1]}` : option.label,
                        option.odd,
                        'live-event-page__market-odd live-event-page__market-odd--double-chance',
                        'live-event-page__market-odd-label',
                        option.label
                      )
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        </div>
      </div>
    </div>
  )
}

const MemoLiveEventContent = memo(LiveEventContent, (previous, next) => (
  previous.match === next.match
  && previous.leagueName === next.leagueName
  && previous.sport === next.sport
  && previous.currentTime === next.currentTime
  && previous.isExpanded === next.isExpanded
  && previous.expansionProgress === next.expansionProgress
  && previous.disableSheetInteractions === next.disableSheetInteractions
))

const LIVE_EVENT_COMPACT_SIDE_MARGIN = 24
const LIVE_EVENT_COMPACT_TOP = 106
const LIVE_EVENT_TRANSITION_MS = 360
const LIVE_EVENT_CONTENT_SWITCH_MS = 380
const LIVE_EVENT_CLOSE_GUARD_MS = 900
const LIVE_EVENT_PULL_TOP_THRESHOLD = 1
const LIVE_EVENT_PULL_START_THRESHOLD = 6
const LIVE_EVENT_PULL_RESISTANCE = 0.56
const LIVE_EVENT_MAX_COMPACT_PULL = 132
const LIVE_EVENT_CLOSE_PULL_THRESHOLD = 72
const LIVE_EVENT_EXPANSION_TOUCH_DISTANCE = 180
const LIVE_EVENT_EXPANSION_WHEEL_DISTANCE = 260
const LIVE_EVENT_EXPANSION_SETTLE_THRESHOLD = 0.5
const LIVE_EVENT_WHEEL_SETTLE_DELAY_MS = 140
const LIVE_EVENT_SWIPE_INTENT_THRESHOLD = 8
const LIVE_EVENT_SWIPE_COMMIT_RATIO = 0.25
const LIVE_EVENT_SWIPE_COMMIT_VELOCITY = 0.45
const LIVE_EVENT_SWIPE_SNAP_MS = 220
const LIVE_EVENT_SWIPE_EDGE_RESISTANCE = 0.28
const LIVE_EVENT_SWIPE_PAGE_GAP = 24
type LiveEventSwitchDirection = 'next' | 'previous'

interface SwipeState {
  direction: LiveEventSwitchDirection
  isSnapping: boolean
}

interface LiveEventContentTransition {
  matchesKey: string
  previousIndex: number
  activeIndex: number
  direction: LiveEventSwitchDirection
  key: number
}

interface ActiveMatchState {
  matchesKey: string
  requestedIndex: number
  index: number
}

const isMobileTouchScreen = () => (
  typeof window !== 'undefined'
  && (
    window.matchMedia?.('(hover: none) and (pointer: coarse)').matches
    || navigator.maxTouchPoints > 0
  )
)

const getCompactPullDistance = (distance: number) => (
  Math.min(LIVE_EVENT_MAX_COMPACT_PULL, Math.max(0, distance * LIVE_EVENT_PULL_RESISTANCE))
)

const clampLiveEventExpansionProgress = (progress: number) => (
  Math.min(1, Math.max(0, progress))
)

const getInlineTeamAbbreviation = getTeamAbbreviation

function getInlineMatchHeaderClockLabel(time: string, keepPeriod = false): string {
  const parsed = parseLiveTime(time)
  if (!parsed) return time

  const minutes = Math.floor(Math.max(0, parsed.totalSeconds) / 60)
  const seconds = Math.max(0, parsed.totalSeconds) % 60
  const clock = `${minutes}:${String(seconds).padStart(2, '0')}`

  // No futebol americano o quarter faz parte do relógio exibido ("Q2 07:32");
  // nos outros esportes o header mostra só o tempo.
  return keepPeriod && parsed.prefix ? `${parsed.prefix} ${clock}` : clock
}

function getInlineRailLiveClockLabel(time: string): string {
  const parsed = parseLiveTime(time)
  if (!parsed) return time

  const minutes = Math.floor(Math.max(0, parsed.totalSeconds) / 60)
  const seconds = Math.max(0, parsed.totalSeconds) % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function getInlinePreMatchRailLabel(item: LiveEventRailItem): string {
  const preMatchHeader = getLiveEventRailPreMatchHeader(item)
  if (
    !preMatchHeader.secondary
    || preMatchHeader.secondary === item.leagueName
    || preMatchHeader.secondary === preMatchHeader.primary
  ) return preMatchHeader.primary

  return `${preMatchHeader.secondary} (${preMatchHeader.primary})`
}

const inlineSummaryStatIconByType: Record<string, string> = {
  red: cartaoVermelhoIcon,
  yellow: cartaoAmareloIcon,
  corner: escanteiosIcon,
  statistic: chutesIcon,
}

function getInlineTeamStats(teamName: string, score: number, isBasketball: boolean, currentTime: string, isLiveMatch: boolean) {
  if (isBasketball) {
    return [
      { type: 'text', label: 'PTS', value: Math.max(score, 0) },
      { type: 'text', label: 'REB', value: 12 + (teamName.length % 8) },
      { type: 'text', label: 'AST', value: 6 + (teamName.length % 7) },
    ] as const
  }

  if (!isLiveMatch) {
    return [
      { type: 'red', value: 0 },
      { type: 'yellow', value: 0 },
      { type: 'corner', value: 0 },
      { type: 'statistic', value: 0 },
    ] as const
  }

  return [
    { type: 'red', value: getInlineFootballRedCards(teamName, currentTime) },
    { type: 'yellow', value: getInlineFootballYellowCards(teamName, currentTime) },
    { type: 'corner', value: getInlineFootballCorners(teamName, currentTime) },
    { type: 'statistic', value: getInlineFootballShots(teamName, currentTime) },
  ] as const
}

interface LiveEventInlineEventRailProps {
  items: LiveEventRailItem[]
  activeIdentity: string
  railTimes: Record<string, string>
  matchIndexByIdentity: Map<string, number>
  onSelectIndex?: (index: number) => void
}

function LiveEventInlineEventRail({
  items,
  activeIdentity,
  railTimes,
  matchIndexByIdentity,
  onSelectIndex,
}: LiveEventInlineEventRailProps) {
  const railRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const activeIndex = items.findIndex((item) => getLiveEventRailIdentity(item) === activeIdentity)
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

  useLayoutEffect(() => {
    if (activeIndex < 0) return

    const railEl = railRef.current
    const itemEl = itemRefs.current[activeIndex]
    if (!railEl || !itemEl) return

    const maxScrollLeft = Math.max(0, railEl.scrollWidth - railEl.clientWidth)
    const centeredLeft = itemEl.offsetLeft - (railEl.clientWidth - itemEl.offsetWidth) / 2
    const targetLeft = activeIndex === 0
      ? 0
      : activeIndex === items.length - 1
        ? maxScrollLeft
        : Math.min(maxScrollLeft, Math.max(0, centeredLeft))

    railEl.scrollTo({ left: targetLeft, top: 0, behavior: 'smooth' })
    window.requestAnimationFrame(updateRailFadeState)
    window.setTimeout(updateRailFadeState, 260)
  }, [activeIndex, items.length, updateRailFadeState])

  useLayoutEffect(() => {
    updateRailFadeState()
  }, [items.length, updateRailFadeState])

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
  }, [items.length, updateRailFadeState])

  if (items.length === 0) return null

  return (
    <div
      className={[
        'live-event-inline__event-rail',
        'competition-event-rail__scroll',
        railFade.left ? 'competition-event-rail__scroll--fade-left' : '',
        railFade.right ? 'competition-event-rail__scroll--fade-right' : '',
      ].filter(Boolean).join(' ')}
      ref={railRef}
      aria-label="Jogos do campeonato"
    >
      <div className="live-event-inline__event-track competition-event-rail__track">
        {items.map((item, index) => {
          const identity = getLiveEventRailIdentity(item)
          const matchIndex = matchIndexByIdentity.get(identity)
          const isActive = identity === activeIdentity
          const isSelectable = matchIndex !== undefined
          const displayTime = railTimes[identity] ?? item.currentTime ?? item.headerPrimary ?? item.dateTime
          const matchup = `${getInlineTeamAbbreviation(item.homeTeam.name)} vs ${getInlineTeamAbbreviation(item.awayTeam.name)}`

          return (
            <button
              key={identity}
              ref={(element) => { itemRefs.current[index] = element }}
              type="button"
              className={[
                'live-event-inline__event-item',
                'competition-event-rail__item',
                item.isLive ? 'live-event-inline__event-item--live' : 'live-event-inline__event-item--prematch',
                item.isLive ? 'competition-event-rail__item--live' : 'competition-event-rail__item--prematch',
                isActive ? 'live-event-inline__event-item--active' : '',
                isActive ? 'competition-event-rail__item--active' : '',
              ].filter(Boolean).join(' ')}
              aria-label={`${item.homeTeam.name} contra ${item.awayTeam.name}`}
              aria-pressed={isActive && isSelectable ? true : undefined}
              disabled={!isSelectable}
              onClick={() => {
                if (matchIndex !== undefined) onSelectIndex?.(matchIndex)
              }}
            >
              <span className="live-event-inline__event-label competition-event-rail__label">{matchup}</span>
              {item.isLive ? (
                <span className={[
                  'live-event-inline__event-meta',
                  'competition-event-rail__meta',
                  isActive ? 'live-event-inline__event-meta--active' : '',
                  isActive ? 'competition-event-rail__meta--active' : '',
                  isActive ? 'live-event-inline__event-meta--active-live' : 'live-event-inline__event-meta--live',
                  isActive ? 'competition-event-rail__meta--active-live' : 'competition-event-rail__meta--live',
                ].filter(Boolean).join(' ')}>
                  <span className="live-event-inline__event-live-dot competition-event-rail__live-dot" aria-hidden="true" />
                  {isActive ? 'Ao Vivo' : getInlineRailLiveClockLabel(displayTime)}
                </span>
              ) : (
                <span className={[
                  'live-event-inline__event-meta',
                  'competition-event-rail__meta',
                  'live-event-inline__event-meta--prematch',
                  'competition-event-rail__meta--prematch',
                  isActive ? 'live-event-inline__event-meta--active' : '',
                  isActive ? 'competition-event-rail__meta--active' : '',
                  isActive ? 'live-event-inline__event-meta--active-prematch' : '',
                  isActive ? 'competition-event-rail__meta--active-prematch' : '',
                ].filter(Boolean).join(' ')}>
                  {getInlinePreMatchRailLabel(item)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface LiveEventInlineScoreTeamProps {
  team: LiveEventMatch['homeTeam']
  sport: string
  side: 'home' | 'away'
  hasPossession?: boolean
}

function LiveEventInlineScoreTeam({
  team,
  sport,
  side,
  hasPossession = false,
}: LiveEventInlineScoreTeamProps) {
  const resolvedIcon = useSportsDbTeamLogo(team.name, team.icon, sport, getLiveEventSportFallbackIcon(), {
    useCurrentLogoFallback: true,
  })
  const teamIcon = getLiveEventTeamIconView(resolvedIcon)
  const logoGlowColor = useLogoGlowColor(
    teamIcon.src,
    team.name,
    teamIcon.isFallback,
    side === 'home' ? LIVE_EVENT_HOME_FALLBACK_GLOW : LIVE_EVENT_AWAY_FALLBACK_GLOW
  )

  return (
    <div className={`live-event-inline__summary-team live-event-inline__summary-team--${side}`}>
      {side === 'home' && (
        <span className="live-event-inline__summary-team-title">
          <span className="live-event-inline__summary-team-name">{team.name}</span>
          {hasPossession && (
            <img
              src={ballAmericanFootball}
              alt=""
              className="live-event-inline__possession-ball"
              aria-hidden="true"
            />
          )}
        </span>
      )}
      <div className="live-event-inline__summary-logo-wrap">
        {teamIcon.src ? (
          <>
            <span
              className="live-event-inline__summary-logo-glow"
              style={getLogoGlowStyle(logoGlowColor)}
              aria-hidden="true"
            />
            <img
              src={teamIcon.src}
              alt={team.name}
              className="live-event-inline__summary-logo"
            />
          </>
        ) : (
          <span className="live-event-inline__summary-logo live-event-inline__summary-logo--placeholder" />
        )}
      </div>
      {side === 'away' && (
        <span className="live-event-inline__summary-team-title">
          {hasPossession && (
            <img
              src={ballAmericanFootball}
              alt=""
              className="live-event-inline__possession-ball"
              aria-hidden="true"
            />
          )}
          <span className="live-event-inline__summary-team-name">{team.name}</span>
        </span>
      )}
    </div>
  )
}

interface LiveEventInlineTeamStatsProps {
  team: LiveEventMatch['homeTeam']
  isBasketball: boolean
  currentTime: string
  isLiveMatch: boolean
  side: 'home' | 'away'
}

function LiveEventInlineTeamStats({
  team,
  isBasketball,
  currentTime,
  isLiveMatch,
  side,
}: LiveEventInlineTeamStatsProps) {
  const stats = getInlineTeamStats(team.name, team.score, isBasketball, currentTime, isLiveMatch)
  const orderedStats = side === 'away' ? [...stats].reverse() : [...stats]

  return (
    <div className={`live-event-inline__summary-stats live-event-inline__summary-stats--${side}`} aria-label={`Estatísticas de ${team.name}`}>
      {orderedStats.map((stat, index) => (
        <span key={`${stat.type}-${index}`} className="live-event-inline__summary-stat">
          {stat.type === 'text' ? (
            <span className="live-event-inline__summary-stat-text">{stat.label}</span>
          ) : (
            <span className={`live-event-inline__summary-stat-icon live-event-inline__summary-stat-icon--${stat.type}`} aria-hidden="true">
              <img src={inlineSummaryStatIconByType[stat.type]} alt="" />
            </span>
          )}
          <span>{stat.value}</span>
        </span>
      ))}
    </div>
  )
}

interface LiveEventInlineScoreHeaderProps {
  match: LiveEventMatch
  sport: string
  currentTime: string
  /** Abre o sheet de jogadas já montado, para a rota de atalho `/<marca>/nfl`. */
  initialStatsOpen?: boolean
}

function LiveEventInlineScoreHeader({
  match,
  sport,
  currentTime,
  initialStatsOpen = false,
}: LiveEventInlineScoreHeaderProps) {
  const contentSport = match.sport ?? sport
  const isBasketball = contentSport === 'basquete'
  const isLiveMatch = match.isLive ?? true
  // No futebol americano a faixa inferior mostra a situação de campo, não as
  // estatísticas do time: descida, jardas para a próxima e onde a bola está.
  const situation = isLiveMatch ? match.footballSituation : undefined
  // Quem pontuou continua com a posse até o ponto extra, então a posse identifica o time.
  const scoringTeamName = situation?.possession === 'home' ? match.homeTeam.name : match.awayTeam.name
  const [isStatsOpen, setIsStatsOpen] = useState(initialStatsOpen)
  const scoreMain = (
    <div className="live-event-inline__score-main">
      <LiveEventInlineScoreTeam
        team={match.homeTeam}
        sport={contentSport}
        side="home"
        hasPossession={situation?.possession === 'home'}
      />
      <div className="live-event-inline__score-center">
        {isLiveMatch ? (
          <>
            <span className="live-event-inline__score-row">
              <strong>{match.homeTeam.score}</strong>
              <span>:</span>
              <strong>{match.awayTeam.score}</strong>
            </span>
            {/* No intervalo o estado desce para a linha da situação, que é onde a descida
                ficava: assim ele aparece uma vez só e na mesma linha do "Ver mais".

                A linha do relógio continua OCUPANDO o lugar dela, escondida. A coluna do placar
                tem 52px e alinha por baixo, então tirá-la do fluxo escorregava o número para o
                lugar do relógio — e o placar tem de ficar onde estava. */}
            <span
              className={[
                'live-event-inline__score-time',
                situation?.isPeriodOver ? 'live-event-inline__score-time--hidden' : '',
              ].filter(Boolean).join(' ')}
              aria-hidden={situation?.isPeriodOver ? true : undefined}
            >
              <span className="live-event-inline__score-live-dot-wrap" aria-hidden="true">
                <span className="live-event-inline__score-live-dot" />
              </span>
              <span>{getInlineMatchHeaderClockLabel(currentTime, !!situation)}</span>
            </span>
          </>
        ) : (
          <span className="live-event-inline__score-matchup">vs</span>
        )}
      </div>
      <LiveEventInlineScoreTeam
        team={match.awayTeam}
        sport={contentSport}
        side="away"
        hasPossession={situation?.possession === 'away'}
      />
    </div>
  )

  return (
    <section
      className={[
        'live-event-inline__score-header',
        isLiveMatch ? '' : 'live-event-inline__score-header--prematch',
      ].filter(Boolean).join(' ')}
      aria-label={`${match.homeTeam.name} contra ${match.awayTeam.name}`}
    >
      {situation ? (
        // O placar INTEIRO é o acesso às jogadas e estatísticas, e não só a faixa de
        // situação: quem olha o placar de um jogo ao vivo está pedindo o lance, e o alvo
        // de 26px da faixa era pequeno demais para o que a área toda já parecia oferecer.
        // O gatilho é um `button` em volta das duas partes — envolver a `section` deixaria
        // o bottom sheet dentro do próprio botão, e manter dois botões irmãos daria dois
        // alvos anunciados para a mesma ação.
        <button
          type="button"
          className="live-event-inline__score-trigger"
          onClick={() => setIsStatsOpen(true)}
        >
          {scoreMain}
          <span className="live-event-inline__summary-stats-row live-event-inline__situation-row">
            {situation.isPeriodOver ? (
              <span className="live-event-inline__situation-item live-event-inline__situation-item--state">
                {getInlineMatchHeaderClockLabel(currentTime, true)}
              </span>
            ) : situation.scoringPlay ? (
              // Uma frase só, com separador: dois itens soltos no gap de 12px liam como
              // dois rótulos sem relação ("Touchdown" de um lado, "Hill" do outro), e não
              // como o lance e quem o fez. O sobrenome sai do MESMO helper da lista de
              // campanhas do sheet — a faixa anuncia justamente o lance em que o sheet
              // abre, e dois nomes diferentes para ele seriam um defeito silencioso.
              <span className="live-event-inline__situation-item">
                {[
                  situation.scoringPlay.result,
                  getTeamAbbreviation(scoringTeamName),
                  shortName(situation.scoringPlay.scorer),
                ].filter(Boolean).join(' · ')}
              </span>
            ) : (
              <>
                <span className="live-event-inline__situation-item">
                  {getDownAndDistanceLabel(situation.down, situation.distance)}
                </span>
                <span className="live-event-inline__situation-item">{situation.ballOn}</span>
              </>
            )}
            <span className="live-event-inline__situation-more">
              Ver mais
              <img
                src={chevronRight}
                alt=""
                className="home-competition__chevron home-competition__chevron--secondary"
              />
            </span>
          </span>
        </button>
      ) : scoreMain}
      {!situation && isLiveMatch && (
        <div className="live-event-inline__summary-stats-row">
          <LiveEventInlineTeamStats
            team={match.homeTeam}
            isBasketball={isBasketball}
            currentTime={currentTime}
            isLiveMatch={isLiveMatch}
            side="home"
          />
          <LiveEventInlineTeamStats
            team={match.awayTeam}
            isBasketball={isBasketball}
            currentTime={currentTime}
            isLiveMatch={isLiveMatch}
            side="away"
          />
        </div>
      )}
      {situation && (
        <NflPlaysStatsBottomSheet
          isOpen={isStatsOpen}
          onClose={() => setIsStatsOpen(false)}
          liveClock={getInlineMatchHeaderClockLabel(currentTime, true)}
        />
      )}
    </section>
  )
}

interface LiveEventInlineStreamBlockProps {
  sport: string
}

function LiveEventInlineStreamBlock({ sport }: LiveEventInlineStreamBlockProps) {
  const [activeTab, setActiveTab] = useState<TabId>('transmissao')
  const isBasketball = sport === 'basquete'
  const streamImage = isBasketball ? streamingBasquete : streamingFutebol
  const fieldTabLabel = isBasketball ? 'Quadra' : 'Campo'

  return (
    <section className="live-event-inline__stream-block" aria-label="Transmissão do evento">
      <div className="live-event-inline__media-tabs" role="tablist" aria-label="Visualização do jogo">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'transmissao'}
          className={[
            'live-event-inline__media-tab',
            activeTab === 'transmissao' ? 'live-event-inline__media-tab--active' : '',
          ].filter(Boolean).join(' ')}
          onClick={() => setActiveTab('transmissao')}
        >
          <MonitorPlayIcon aria-hidden="true" className="live-event-inline__media-tab-icon" weight="bold" />
          <span>Transmissão</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'campo'}
          className={[
            'live-event-inline__media-tab',
            activeTab === 'campo' ? 'live-event-inline__media-tab--active' : '',
          ].filter(Boolean).join(' ')}
          onClick={() => setActiveTab('campo')}
        >
          {isBasketball ? (
            <CourtBasketballIcon aria-hidden="true" className="live-event-inline__media-tab-icon" weight="bold" />
          ) : (
            <SoccerBallIcon aria-hidden="true" className="live-event-inline__media-tab-icon" weight="bold" />
          )}
          <span>{fieldTabLabel}</span>
        </button>
      </div>
      {activeTab === 'transmissao' ? (
        <div className="live-event-inline__stream-media">
          <img src={streamImage} alt="Transmissão ao vivo" className="live-event-inline__stream-img" />
          <div className="live-event-inline__live-badge">LIVE</div>
          <button type="button" className="live-event-inline__stream-control live-event-inline__stream-control--close" aria-label="Fechar transmissão">
            <CloseStreamIcon />
          </button>
          <div className="live-event-inline__stream-controls">
            <button type="button" className="live-event-inline__stream-control" aria-label="Pausar">
              <PauseIcon />
            </button>
            <button type="button" className="live-event-inline__stream-control" aria-label="Mudo">
              <MuteIcon />
            </button>
          </div>
          <button type="button" className="live-event-inline__stream-control live-event-inline__stream-control--fullscreen" aria-label="Tela cheia">
            <FullscreenIcon />
          </button>
        </div>
      ) : (
        <div className={`live-event-inline__field-view live-event-inline__field-view--${isBasketball ? 'basketball' : 'soccer'}`} aria-label={fieldTabLabel}>
          <span aria-hidden="true" />
        </div>
      )}
    </section>
  )
}

const liveEventInlineMarketChips = [
  { id: 'populares', label: 'POPULARES' },
  { id: 'criar-aposta', label: 'CRIAR APOSTA' },
  { id: 'cartoes', label: 'CARTÕES' },
  { id: 'times', label: 'TIMES' },
  { id: 'jogadores', label: 'JOGADORES' },
] as const

function LiveEventInlineMarketChips({ sport }: { sport: string }) {
  // Pills decorativas. A NFL usa a lista do Figma do detalhe do evento.
  const chips = sport === 'nfl' ? nflEventMarketChips : liveEventInlineMarketChips

  return (
    <ContentFilterChips
      filters={chips}
      activeFilter={chips[0].id}
      ariaLabel="Filtros de mercado"
      className="live-event-inline__market-chips"
      disabled
    />
  )
}

type InlineOddButtonRenderer = (
  marketId: string,
  outcomeId: string,
  label: ReactNode,
  odd: ReactNode,
  className?: string,
  selectionDetails?: {
    marketLabel?: string
    selectionLabel?: string
    selectionType?: 'team' | 'player' | 'market'
    playerName?: string
    selectionTeamName?: string
    selectionIcon?: string
    playerImage?: string
    badgeType?: 'boost' | 'substitution'
    marketTags?: string[]
  }
) => ReactNode

interface LiveEventInlinePlayerPropCardProps {
  player: MatchPlayerProp
  marketId: string
  marketLabel: string
  timeLabel: string
  sport: HomeCompetitionPlayerProp['sport']
  className?: string
  oddsLayout?: 'slider' | 'single'
  renderOddButton: InlineOddButtonRenderer
}

function getInlineHomePlayerProp(player: MatchPlayerProp, marketLabel: string, timeLabel: string, sport: HomeCompetitionPlayerProp['sport']): HomeCompetitionPlayerProp {
  const playerOdds = player.options.map((option) => ({
    label: option.label,
    value: option.odd,
  }))
  const fallbackOdd = playerOdds[playerOdds.length - 1] ?? { label: '', value: '' }
  const odds: [HomeCompetitionOdd, HomeCompetitionOdd, HomeCompetitionOdd] = [
    playerOdds[0] ?? fallbackOdd,
    playerOdds[1] ?? fallbackOdd,
    playerOdds[2] ?? fallbackOdd,
  ]

  return {
    id: player.id,
    homeTeam: player.homeTeam ?? player.teamName,
    awayTeam: player.awayTeam ?? player.teamName,
    playerName: player.playerName,
    playerImage: player.image,
    position: player.position,
    marketLabel,
    matchLabel: player.teamName,
    timeLabel,
    teamName: player.teamName,
    teamAbbreviation: getInlineTeamAbbreviation(player.teamName),
    sport,
    odds,
  }
}

function LiveEventInlinePlayerPropCard({
  player,
  marketId,
  marketLabel,
  timeLabel,
  sport,
  className,
  oddsLayout = 'slider',
  renderOddButton,
}: LiveEventInlinePlayerPropCardProps) {
  const homePlayerProp = getInlineHomePlayerProp(player, marketLabel, timeLabel, sport)

  return (
    <HomeCompetitionPlayerPropCard
      prop={homePlayerProp}
      className={className}
      matchLabel={homePlayerProp.teamAbbreviation}
      showTimeLabel={false}
      showMarketLabel={false}
      oddsLayout={oddsLayout}
      renderOddButton={(odd, context) => {
        const option = player.options[context.index] ?? player.options[0]
        // Canonical key (per-player market + line) so this inline view of the event
        // correlates with the full event, competition and sport screens.
        const propKey = getPlayerPropBetslipKey({
          sport,
          homeTeam: player.homeTeam,
          awayTeam: player.awayTeam,
          marketId,
          playerName: player.playerName,
          lineLabel: option?.label ?? odd.label,
        })

        return renderOddButton(
          propKey.marketId,
          propKey.outcomeId,
          odd.label,
          odd.value,
          context.className,
          {
            marketLabel,
            selectionLabel: `${player.playerName} ${option?.label ?? odd.label}`,
            selectionType: 'player',
            playerName: player.playerName,
            selectionTeamName: player.teamName,
            selectionIcon: player.teamIcon,
            playerImage: player.image,
            badgeType: 'substitution',
          }
        )
      }}
    />
  )
}

// Mercados de jogador da NFL no detalhe do evento, na ordem do Figma 1825-51678.
const nflInlinePlayerPropMarkets = [
  {
    id: 'td-qualquer-momento',
    title: 'Touchdown a qualquer momento',
    oddsLayout: 'single' as const,
  },
  {
    id: 'jardas-passe',
    title: 'Jardas de passe',
    subtitle: '(ganha se for maior ou igual)',
    oddsLayout: 'slider' as const,
  },
  {
    id: 'recepcoes',
    title: 'Recepções',
    subtitle: '(ganha se for maior ou igual)',
    oddsLayout: 'slider' as const,
  },
  {
    id: 'jardas-corrida',
    title: 'Jardas de corrida',
    subtitle: '(ganha se for maior ou igual)',
    oddsLayout: 'slider' as const,
  },
]

const nflInlinePlayerPropTitles = new Map(
  nflInlinePlayerPropMarkets.map((market) => [market.id, market.title])
)

// Cada mercado de jogador da NFL tem seu próprio "Carregar mais", por isso a contagem
// visível vive aqui e não no bloco de mercados.
function LiveEventInlineNflPropSection({
  market,
  cards,
  timeLabel,
  sport,
  renderOddButton,
}: {
  market: typeof nflInlinePlayerPropMarkets[number]
  cards: MatchPlayerProp[]
  timeLabel: string
  sport: HomeCompetitionPlayerProp['sport']
  renderOddButton: InlineOddButtonRenderer
}) {
  const [visibleCount, setVisibleCount] = useState(LIVE_EVENT_INLINE_PLAYER_PROPS_INITIAL_COUNT)
  const maxCount = Math.min(LIVE_EVENT_INLINE_PLAYER_PROPS_MAX_COUNT, cards.length)
  const visibleCards = cards.slice(0, Math.min(visibleCount, maxCount))
  const canLoadMore = visibleCards.length < maxCount

  if (cards.length === 0) return null

  return (
    <LiveEventInlineMarketSection
      title={market.title}
      subtitle={market.subtitle}
      badges={[]}
      className="live-event-inline__market-section--player-props"
    >
      <div
        className="home-competition__players home-competition__players--grid live-event-inline__player-grid"
        aria-label={`Cards de ${market.title}`}
      >
        {visibleCards.map((player) => (
          <LiveEventInlinePlayerPropCard
            key={player.id}
            player={player}
            marketId={market.id}
            marketLabel={market.title}
            timeLabel={timeLabel}
            sport={sport}
            oddsLayout={market.oddsLayout}
            renderOddButton={renderOddButton}
          />
        ))}
      </div>
      {canLoadMore && (
        <button
          type="button"
          className="home-competition__load-more"
          onClick={() => setVisibleCount((current) => Math.min(
            current + LIVE_EVENT_INLINE_PLAYER_PROPS_LOAD_STEP,
            maxCount
          ))}
        >
          <span>Carregar mais</span>
          <img src={chevronDown} alt="" className="home-competition__load-more-icon" />
        </button>
      )}
    </LiveEventInlineMarketSection>
  )
}

interface LiveEventInlineMarketsProps {
  match: LiveEventMatch
  leagueName: string
  sport: string
  currentTime: string
}

function LiveEventInlineMarkets({
  match,
  leagueName,
  sport,
  currentTime,
}: LiveEventInlineMarketsProps) {
  const contentSport = match.sport ?? sport
  const isBasketball = contentSport === 'basquete'
  const isNfl = contentSport === 'nfl'
  const isLiveMatch = match.isLive ?? true
  const scheduledDateTime = match.dateTime ?? match.time ?? currentTime
  const playerAvatarFallback = isBasketball ? playerAvatarBasquete : playerAvatarFutebol
  const [displayTime, setDisplayTime] = useState(currentTime)
  const playerPropsGridRef = useRef<HTMLDivElement | null>(null)
  const playerPropsAnimationRef = useRef<{ fromHeight: number } | null>(null)
  const playerPropsAnimationStartTimerRef = useRef<number | null>(null)
  const playerPropsAnimationTimerRef = useRef<number | null>(null)
  const [visiblePlayerPropsCount, setVisiblePlayerPropsCount] = useState(LIVE_EVENT_INLINE_PLAYER_PROPS_INITIAL_COUNT)
  const [enteringPlayerPropIds, setEnteringPlayerPropIds] = useState<Set<string>>(() => new Set())
  const getOddButtonProps = useOddSelection('')
  const eventId = getBetslipEventId({
    sport: contentSport,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
  })
  const resultMarketId = isBasketball ? 'vencedor' : 'resultado-final'
  const playerPropsMarketId = isBasketball ? 'pontos-jogador' : 'finalizacao-gol'
  const playerPropsSport = isBasketball ? 'basquete' : 'futebol'
  const primaryTotalMarketId = isBasketball ? 'total-pontos' : 'total-gols'
  const secondaryMarketId = isBasketball ? 'handicap' : 'escanteios'
  const finalMarketId = isBasketball ? 'q4-total' : 'dupla-chance'
  const resultMarketTitle = isBasketball ? 'Vencedor' : 'Resultado final'
  const playerMarketTitle = isBasketball ? 'Pontos do Jogador' : 'Finalizações ao Gol'
  const primaryTotalMarketTitle = isBasketball ? 'Total de Pontos' : 'Total de Gols'
  const secondaryMarketTitle = isBasketball ? 'Handicap' : 'Total de Escanteios'
  const finalMarketTitle = isBasketball ? '4° Quarto - Total de Pontos' : 'Dupla Chance'
  const primaryTotalRows = isBasketball ? getTotalPointsRows(match) : getTotalGoalsRows(match, false)
  const secondaryRows = isBasketball ? getHandicapRows(match) : getTotalCornersRows(match)
  const finalRows = isBasketball ? getQuarterTotalRows(match.q4TotalOdds) : []
  const doubleChanceRows = isBasketball ? [] : getDoubleChanceRows(match)

  // A NFL reaproveita o catálogo de player props do CalendarSection, que trabalha com
  // CompetitionEvent. Aqui montamos o evento equivalente a partir do match do evento.
  const nflSyntheticEvent: CompetitionEvent = {
    id: match.id ?? 'live-event',
    dateTime: scheduledDateTime,
    isLive: isLiveMatch,
    homeName: match.homeTeam.name,
    homeIcon: match.homeTeam.icon ?? '',
    awayName: match.awayTeam.name,
    awayIcon: match.awayTeam.icon ?? '',
    odds: match.odds,
    totalPointsOdds: match.totalPointsOdds,
    handicapOdds: match.handicapOdds,
  }
  const nflResultMarketTitle = 'Resultado Final'
  const nflHomeLabel = getTeamAbbreviation(match.homeTeam.name)
  const nflAwayLabel = getTeamAbbreviation(match.awayTeam.name)
  const nflColumnsMatch: HomeCompetitionMatch = {
    id: match.id ?? 'live-event',
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    sport: 'nfl',
    marketLabel: nflResultMarketTitle,
    tags: [],
    footerLabel: scheduledDateTime,
    totalPointsOdds: match.totalPointsOdds,
    handicapOdds: match.handicapOdds,
    marketColumns: getNflMarketColumns({
      homeLabel: nflHomeLabel,
      awayLabel: nflAwayLabel,
      homeOdd: match.odds.home,
      awayOdd: match.odds.away,
      hasEarlyPayout: !isLiveMatch,
      totalLine: match.totalPointsOdds?.line,
      totalOver: match.totalPointsOdds?.over,
      totalUnder: match.totalPointsOdds?.under,
      handicapLine: match.handicapOdds?.line,
      handicapHome: match.handicapOdds?.home,
      handicapAway: match.handicapOdds?.away,
    }),
    odds: [
      { label: nflHomeLabel, value: match.odds.home },
      { label: nflAwayLabel, value: match.odds.away },
      { label: 'TOTAL', value: match.totalPointsOdds?.over ?? '-' },
    ],
  }

  const getMarketTitle = (marketId: string) => {
    if (isNfl) {
      if (marketId === 'total-pontos') return 'Total de Pontos'
      if (marketId === 'handicap') return 'Handicap'

      return nflInlinePlayerPropTitles.get(marketId) ?? nflResultMarketTitle
    }

    if (marketId === resultMarketId) return resultMarketTitle
    if (marketId === playerPropsMarketId) return playerMarketTitle
    if (marketId === primaryTotalMarketId) return primaryTotalMarketTitle
    if (marketId === secondaryMarketId) return secondaryMarketTitle
    if (marketId === finalMarketId) return finalMarketTitle

    return marketId
  }
  const getMarketTags = (marketId: string) => {
    if (isBasketball || isNfl) return []
    if (marketId === resultMarketId) return ['PA', '90’']
    if ([primaryTotalMarketId, secondaryMarketId, finalMarketId].includes(marketId)) return ['90’']

    return []
  }

  const buildEventPlayerPropCards = (marketId: string, fallbackRows: PlayerShotMarket[] = []): MatchPlayerProp[] => {
    const syncedCards = isNfl
      ? getCalendarPlayerPropsForEvent(nflSyntheticEvent, contentSport, marketId)
      : isLiveMatch
      ? getLivePlayerProps({
        ...match,
        id: match.id ?? 'live-event',
        time: match.time ?? scheduledDateTime,
      }, contentSport, marketId, LIVE_EVENT_PLAYER_PROPS_PER_MARKET)
      : getMatchPlayerProps({
        id: match.id ?? 'live-event',
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
      }, contentSport, marketId, LIVE_EVENT_PLAYER_PROPS_PER_MARKET)
    const fallbackCards: MatchPlayerProp[] = fallbackRows.map((row) => {
      const teamSide = row.team === match.awayTeam.name ? 'away' : 'home'

      return {
        id: `${match.id ?? 'live-event'}-${row.id}`,
        playerName: row.player,
        teamName: row.team,
        teamIcon: teamSide === 'away' ? match.awayTeam.icon : match.homeTeam.icon,
        teamSide,
        sport: contentSport,
        position: row.position ?? getPlayerPropCardPosition(row.player, isBasketball),
        image: row.image ?? getLocalPlayerImage(row.team, row.player) ?? playerAvatarFallback,
        options: row.outcomes.map((outcome, outcomeIndex) => ({
          label: outcome.label,
          odd: outcome.odd,
          active: outcomeIndex === Math.min(1, row.outcomes.length - 1),
        })),
      }
    })
    const uniqueCardKeys = new Set<string>()
    const playerCards = [...syncedCards, ...fallbackCards].reduce<MatchPlayerProp[]>((cards, player) => {
      const cardKey = `${normalizePlayerName(player.teamName)}:${normalizePlayerName(player.playerName)}`
      if (cards.length >= LIVE_EVENT_PLAYER_PROPS_PER_MARKET || uniqueCardKeys.has(cardKey)) return cards

      uniqueCardKeys.add(cardKey)
      cards.push(player)
      return cards
    }, [])

    return playerCards.map((player) => ({
      ...player,
      eventId,
      marketId,
      marketLabel: getMarketTitle(marketId),
      eventStatus: isLiveMatch ? 'live' as const : 'prematch' as const,
      leagueId: match.leagueId,
      leagueName: match.leagueName ?? leagueName,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      eventTimeLabel: isLiveMatch ? displayTime : scheduledDateTime,
      liveClock: isLiveMatch ? displayTime : undefined,
      homeScore: match.homeTeam.score,
      awayScore: match.awayTeam.score,
    }))
  }

  const playerPropCards = buildEventPlayerPropCards(playerPropsMarketId, getPlayerPropRows(match, isBasketball, true))
  const visiblePlayerPropsMaxCount = Math.min(LIVE_EVENT_INLINE_PLAYER_PROPS_MAX_COUNT, playerPropCards.length)
  const visiblePlayerProps = playerPropCards.slice(0, Math.min(visiblePlayerPropsCount, visiblePlayerPropsMaxCount))
  const canLoadMorePlayerProps = visiblePlayerProps.length < visiblePlayerPropsMaxCount

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

  const handleLoadMorePlayerProps = useCallback(() => {
    const currentCount = Math.min(visiblePlayerPropsCount, visiblePlayerPropsMaxCount)
    const nextCount = Math.min(
      currentCount + LIVE_EVENT_INLINE_PLAYER_PROPS_LOAD_STEP,
      visiblePlayerPropsMaxCount
    )

    if (nextCount <= currentCount) return

    const gridEl = playerPropsGridRef.current
    if (gridEl) {
      clearPlayerPropsAnimation()
      playerPropsAnimationRef.current = { fromHeight: gridEl.getBoundingClientRect().height }
      gridEl.classList.add('home-competition__players--accordion')
      gridEl.style.height = `${playerPropsAnimationRef.current.fromHeight}px`
      gridEl.style.overflow = 'hidden'
    }

    setEnteringPlayerPropIds(new Set(
      playerPropCards.slice(currentCount, nextCount).map((player) => player.id)
    ))
    setVisiblePlayerPropsCount(nextCount)
  }, [
    clearPlayerPropsAnimation,
    playerPropCards,
    visiblePlayerPropsCount,
    visiblePlayerPropsMaxCount,
  ])

  const renderOddButton: InlineOddButtonRenderer = (
    marketId,
    outcomeId,
    label,
    odd,
    className = '',
    selectionDetails
  ) => {
    const matchOddKey = selectionDetails?.selectionType === 'player'
      ? null
      : getMatchOddBetslipKey({
        sport: contentSport,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        marketId,
        outcomeId,
        label,
      })
    const groupId = matchOddKey?.groupId ?? getBetslipMarketGroupId({ eventId, marketId })
    const betslipMarketId = matchOddKey?.marketId ?? marketId
    const betslipOutcomeId = matchOddKey?.outcomeId ?? outcomeId

    if (!LIVE_EVENT_INLINE_ENABLE_ODD_ACTIONS) {
      return (
        <HomeCompetitionOddButton
          key={`${groupId}:${betslipOutcomeId}`}
          odd={{ label, value: odd }}
          className={className}
        />
      )
    }

    return (
      <HomeCompetitionOddButton
        key={`${groupId}:${betslipOutcomeId}`}
        odd={{ label, value: odd }}
        disabled={false}
        {...getOddButtonProps(
          `${groupId}:${betslipOutcomeId}`,
          groupId,
          className,
          createBetslipSelection({
            eventId,
            marketId: betslipMarketId,
            outcomeId: betslipOutcomeId,
            label,
            odd,
            marketLabel: selectionDetails?.marketLabel ?? getMarketTitle(marketId),
            eventStatus: isLiveMatch ? 'live' : 'prematch',
            selectionType: selectionDetails?.selectionType,
            selectionLabel: selectionDetails?.selectionLabel,
            sport: contentSport,
            leagueId: match.leagueId,
            leagueName: match.leagueName ?? leagueName,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            eventTimeLabel: isLiveMatch ? displayTime : scheduledDateTime,
            liveClock: isLiveMatch ? displayTime : undefined,
            homeScore: match.homeTeam.score,
            awayScore: match.awayTeam.score,
            playerName: selectionDetails?.playerName,
            selectionTeamName: selectionDetails?.selectionTeamName,
            selectionIcon: selectionDetails?.selectionIcon,
            playerImage: selectionDetails?.playerImage,
            badgeType: selectionDetails?.badgeType ?? (marketId === resultMarketId ? 'boost' : undefined),
            marketTags: selectionDetails?.marketTags ?? getMarketTags(marketId),
          })
        )}
      />
    )
  }

  useEffect(() => {
    const syncTimer = window.setTimeout(() => setDisplayTime(currentTime), 0)
    // O jogo de NFL não conta sozinho: `currentTime` já chega comprimido pelo feed, e descontar
    // mais um segundo por segundo em cima dele faria a etiqueta divergir do placar.
    if (!isLiveMatch || hasNflLiveClock(match.id)) return () => window.clearTimeout(syncTimer)
    const parsed = parseLiveTime(currentTime)
    if (!parsed) return () => window.clearTimeout(syncTimer)
    let totalSeconds = parsed.totalSeconds
    const interval = setInterval(() => {
      totalSeconds = parsed.isQuarter ? totalSeconds - 1 : totalSeconds + 1
      setDisplayTime(formatLiveTime(parsed.prefix, totalSeconds))
    }, 1000)
    return () => {
      window.clearTimeout(syncTimer)
      clearInterval(interval)
    }
  }, [currentTime, isLiveMatch, match.id])

  useLayoutEffect(() => {
    const animation = playerPropsAnimationRef.current
    const gridEl = playerPropsGridRef.current

    if (!animation || !gridEl) return

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
      }, LIVE_EVENT_INLINE_PLAYER_PROPS_ACCORDION_DURATION_MS)
    }, 24)

    return clearPlayerPropsAnimation
  }, [clearPlayerPropsAnimation, visiblePlayerProps.length])

  useEffect(() => () => {
    clearPlayerPropsAnimation()
  }, [clearPlayerPropsAnimation])

  if (isNfl) {
    const nflTimeLabel = isLiveMatch ? 'AO VIVO' : scheduledDateTime
    const nflTotalRows = getTotalPointsRows(match)
    const nflHandicapRows = getHandicapRows(match)

    return (
      <div className="live-event-inline__markets">
        <div className="live-event-inline__market-columns-card">
          <HomeCompetitionMarketColumnsMatchCard
            match={nflColumnsMatch}
            hideFooter
            renderOddButton={(odd, context) => renderOddButton(
              context.marketId,
              `${context.outcomeId}`,
              odd.label,
              odd.value,
              undefined,
              {
                marketLabel: context.marketLabel,
                selectionType: 'team',
                marketTags: isLiveMatch ? [] : ['PA'],
              }
            )}
          />
        </div>

        {nflInlinePlayerPropMarkets.map((market) => (
          <LiveEventInlineNflPropSection
            key={market.id}
            market={market}
            cards={buildEventPlayerPropCards(market.id)}
            timeLabel={nflTimeLabel}
            sport="nfl"
            renderOddButton={renderOddButton}
          />
        ))}

        <LiveEventInlineMarketSection title="Total de Pontos" badges={[]}>
          <div className="live-event-inline__line-list">
            {nflTotalRows.slice(0, 4).map((row) => {
              const isCurrentRow = isLineMarketCurrentRow(row, match.totalPointsOdds?.line)
              const underOutcomeId = getLiveEventLineOutcomeId(row, isCurrentRow, 'under-points')
              const overOutcomeId = getLiveEventLineOutcomeId(row, isCurrentRow, 'over-points')

              return (
                <div key={row.id} className="home-competition__odds home-competition__odds--two">
                  {renderOddButton('total-pontos', underOutcomeId, row.under.label, row.under.odd)}
                  {renderOddButton('total-pontos', overOutcomeId, row.over.label, row.over.odd)}
                </div>
              )
            })}
          </div>
        </LiveEventInlineMarketSection>

        <LiveEventInlineMarketSection title="Handicap" badges={[]}>
          <div className="live-event-inline__line-list">
            {nflHandicapRows.slice(0, 4).map((row) => {
              const isCurrentRow = isHandicapCurrentRow(row, match.handicapOdds?.line)
              const underOutcomeId = getLiveEventLineOutcomeId(row, isCurrentRow, 'home-handicap')
              const overOutcomeId = getLiveEventLineOutcomeId(row, isCurrentRow, 'away-handicap')

              return (
                <div key={row.id} className="home-competition__odds home-competition__odds--two">
                  {renderOddButton('handicap', underOutcomeId, row.under.label, row.under.odd)}
                  {renderOddButton('handicap', overOutcomeId, row.over.label, row.over.odd)}
                </div>
              )
            })}
          </div>
        </LiveEventInlineMarketSection>
      </div>
    )
  }

  return (
    <div className="live-event-inline__markets">
      <LiveEventInlineMarketSection title={resultMarketTitle}>
        <div className="home-competition__odds">
          {renderOddButton(resultMarketId, 'home', match.homeTeam.name, match.odds.home)}
          {match.odds.draw && renderOddButton(resultMarketId, 'draw', 'Empate', match.odds.draw)}
          {renderOddButton(resultMarketId, 'away', match.awayTeam.name, match.odds.away)}
        </div>
      </LiveEventInlineMarketSection>

      {playerPropCards.length > 0 && (
      <LiveEventInlineMarketSection title={playerMarketTitle} badges={[]} className="live-event-inline__market-section--player-props">
        <div
          ref={playerPropsGridRef}
          className="home-competition__players home-competition__players--grid live-event-inline__player-grid"
          aria-label={`Cards de ${playerMarketTitle}`}
        >
          {visiblePlayerProps.map((player) => (
            <LiveEventInlinePlayerPropCard
              key={player.id}
              player={player}
              marketId={playerPropsMarketId}
              marketLabel={player.marketLabel ?? playerMarketTitle}
              timeLabel={isLiveMatch ? 'AO VIVO' : scheduledDateTime}
              sport={playerPropsSport}
              className={enteringPlayerPropIds.has(player.id) ? 'home-competition__player-card--entering' : ''}
              renderOddButton={renderOddButton}
            />
          ))}
        </div>
        {canLoadMorePlayerProps && (
          <button type="button" className="home-competition__load-more" onClick={handleLoadMorePlayerProps}>
            <span>Carregar mais</span>
            <img src={chevronDown} alt="" className="home-competition__load-more-icon" />
          </button>
        )}
      </LiveEventInlineMarketSection>
      )}

      <LiveEventInlineMarketSection title={primaryTotalMarketTitle} badges={['90’']}>
        <div className="live-event-inline__line-list">
          {primaryTotalRows.slice(0, 4).map((row) => {
            const isCurrentRow = isLineMarketCurrentRow(row, isBasketball ? match.totalPointsOdds?.line : match.totalGoalsOdds?.line)
            const underOutcomeId = getLiveEventLineOutcomeId(row, isCurrentRow, isBasketball ? 'under-points' : 'under')
            const overOutcomeId = getLiveEventLineOutcomeId(row, isCurrentRow, isBasketball ? 'over-points' : 'over')

            return (
              <div key={row.id} className="home-competition__odds home-competition__odds--two">
                {renderOddButton(primaryTotalMarketId, underOutcomeId, row.under.label, row.under.odd)}
                {renderOddButton(primaryTotalMarketId, overOutcomeId, row.over.label, row.over.odd)}
              </div>
            )
          })}
        </div>
      </LiveEventInlineMarketSection>

      <LiveEventInlineMarketSection title={secondaryMarketTitle} badges={['90’']}>
        <div className="live-event-inline__line-list">
          {secondaryRows.slice(0, 4).map((row) => {
            const isCurrentRow = isBasketball
              ? isHandicapCurrentRow(row, match.handicapOdds?.line)
              : isLineMarketCurrentRow(row, match.totalCornersOdds?.line)
            const underOutcomeId = getLiveEventLineOutcomeId(row, isCurrentRow, isBasketball ? 'home-handicap' : 'under-corners')
            const overOutcomeId = getLiveEventLineOutcomeId(row, isCurrentRow, isBasketball ? 'away-handicap' : 'over-corners')

            return (
              <div key={row.id} className="home-competition__odds home-competition__odds--two">
                {renderOddButton(secondaryMarketId, underOutcomeId, row.under.label, row.under.odd)}
                {renderOddButton(secondaryMarketId, overOutcomeId, row.over.label, row.over.odd)}
              </div>
            )
          })}
        </div>
      </LiveEventInlineMarketSection>

      <LiveEventInlineMarketSection title={finalMarketTitle} badges={['90’']}>
        {isBasketball ? (
          <div className="live-event-inline__line-list">
            {finalRows.slice(0, 4).map((row) => {
              const isCurrentRow = isLineMarketCurrentRow(row, match.q4TotalOdds?.line)
              const underOutcomeId = getLiveEventLineOutcomeId(row, isCurrentRow, 'under-q4')
              const overOutcomeId = getLiveEventLineOutcomeId(row, isCurrentRow, 'over-q4')

              return (
                <div key={row.id} className="home-competition__odds home-competition__odds--two">
                  {renderOddButton(finalMarketId, underOutcomeId, row.under.label, row.under.odd)}
                  {renderOddButton(finalMarketId, overOutcomeId, row.over.label, row.over.odd)}
                </div>
              )
            })}
          </div>
        ) : (
          doubleChanceRows.map((row) => (
            <div key={row.id} className="home-competition__odds">
              {row.options.map((option, optionIndex) => (
                renderOddButton(
                  finalMarketId,
                  liveEventDoubleChanceOutcomeIds[optionIndex] ?? option.label,
                  option.labelParts ? `${option.labelParts[0]}/${option.labelParts[1]}` : option.label,
                  option.odd
                )
              ))}
            </div>
          ))
        )}
      </LiveEventInlineMarketSection>
    </div>
  )
}

// ── O jogo de NFL que acontece sozinho ─────────────────────────────────────
//
// A tela do evento recebe os jogos num INSTANTÂNEO: a Home guarda o payload em estado quando a
// pessoa abre o evento (`loadedEventContext`) e não o remonta mais. Para os jogos mockados isso
// nunca importou — o placar deles nunca muda, e quem faz o relógio andar é o tique de 1s.
//
// Para a NFL importa, e é exatamente o que o protótipo estava mostrando: o placar e o campo
// congelados no touchdown enquanto o relógio corria. Daqui em diante o jogo é trazido de volta
// ao presente a cada lance que chega, no único lugar que o mostra.

const nflLiveMatch = (match: LiveEventMatch, feed: NflLiveFeedState): LiveEventMatch => {
  // `feed.live`, e não `feed.step.live`: o placar mostra o instante do lance que está na tela, e
  // ele atrasa em relação ao passo enquanto o lance é desenhado. Ver `presentationOf` no feed.
  const { live } = feed
  // No intervalo o desfecho do último lance também sai da faixa: `Touchdown · MIA · Hill` é o
  // anúncio de um lance que acabou de acontecer, e no apito ele já não é a notícia.
  const isPeriodOver = feed.isOver

  return {
    ...match,
    time: feed.clock,
    dateTime: feed.clock,
    currentTime: feed.clock,
    homeTeam: { ...match.homeTeam, score: live.homeScore },
    awayTeam: { ...match.awayTeam, score: live.awayScore },
    footballSituation: {
      // Sem descida é recomeço — depois de um chute ou de um kickoff a bola está parada num
      // ponto e ninguém fez nada ainda.
      down: live.down ?? 1,
      distance: live.distance ?? 10,
      ballOn: live.ballOn ?? '',
      possession: live.possession as 'home' | 'away',
      ...(live.result && !isPeriodOver
        ? { scoringPlay: { result: live.result, scorer: live.scorer ?? '' } }
        : {}),
      ...(isPeriodOver ? { isPeriodOver } : {}),
    },
  }
}

const withNflLiveMatches = (matches: LiveEventMatch[], feed: NflLiveFeedState) => {
  const index = matches.findIndex((match) => hasNflLiveClock(match.id))
  if (index < 0) return matches

  const next = [...matches]
  next[index] = nflLiveMatch(matches[index], feed)

  return next
}

const withNflLiveRailItems = (items: LiveEventRailItem[], feed: NflLiveFeedState) => {
  const index = items.findIndex((item) => hasNflLiveClock(getLiveEventRailIdentity(item)))
  if (index < 0) return items

  const item = items[index]
  // `feed.live`, e não `feed.step.live`: o placar mostra o instante do lance que está na tela, e
  // ele atrasa em relação ao passo enquanto o lance é desenhado. Ver `presentationOf` no feed.
  const { live } = feed
  const next = [...items]
  next[index] = {
    ...item,
    dateTime: feed.clock,
    currentTime: feed.clock,
    headerPrimary: item.headerPrimary === undefined ? undefined : feed.clock,
    homeTeam: { ...item.homeTeam, score: live.homeScore },
    awayTeam: { ...item.awayTeam, score: live.awayScore },
  }

  return next
}

/**
 * O mapa de relógios que veio no payload também é instantâneo, e ele VENCE o `currentTime` do
 * jogo. Tirar a chave da NFL de lá é o que deixa o relógio do feed passar.
 */
const withoutNflLiveClock = (times: Record<string, string> | undefined) => {
  if (!times) return times
  const chaves = Object.keys(times).filter((key) => hasNflLiveClock(key))
  if (chaves.length === 0) return times

  const next = { ...times }
  for (const chave of chaves) delete next[chave]

  return next
}

interface LiveEventInlineStateOptions {
  match?: LiveEventMatch
  matches?: LiveEventMatch[]
  railEvents?: LiveEventRailItem[]
  selectedIndex?: number
  currentTimes?: Record<string, string>
  leagueName: string
  leagueFlag?: string
  sport: string
  currentTime?: string
  onSelectedIndexChange?: (index: number) => void
}

function useLiveEventInlineState({
  match,
  matches,
  railEvents,
  selectedIndex = 0,
  currentTimes,
  leagueName,
  leagueFlag,
  sport,
  currentTime,
  onSelectedIndexChange,
}: LiveEventInlineStateOptions) {
  const feed = useNflLiveFeed()
  const liveCurrentTimes = useMemo(() => withoutNflLiveClock(currentTimes), [currentTimes])
  const eventMatches = useMemo(
    () => withNflLiveMatches(matches?.length ? matches : match ? [match] : [], feed),
    [feed, match, matches]
  )
  const eventMatchesKey = useMemo(
    () => eventMatches.map((eventMatch, index) => getLiveEventMatchIdentity(eventMatch, index)).join('|'),
    [eventMatches]
  )
  const requestedSelectedMatchIndex = Math.min(Math.max(selectedIndex, 0), Math.max(eventMatches.length - 1, 0))
  const [internalSelectedIndex, setInternalSelectedIndex] = useState(requestedSelectedMatchIndex)

  useEffect(() => {
    setInternalSelectedIndex(requestedSelectedMatchIndex)
  }, [eventMatchesKey, requestedSelectedMatchIndex])

  const selectedMatchIndex = onSelectedIndexChange ? requestedSelectedMatchIndex : internalSelectedIndex
  const selectedMatch = eventMatches[selectedMatchIndex]
  const selectedMatchIdentity = selectedMatch ? getLiveEventMatchIdentity(selectedMatch, selectedMatchIndex) : ''
  const railItems = useMemo(
    () => withNflLiveRailItems(
      railEvents?.length
        ? railEvents
        : getLiveEventRailFallbackItems({
            matches: eventMatches,
            currentTimes: liveCurrentTimes,
            leagueName,
            leagueFlag,
            sport,
          }),
      feed,
    ),
    [feed, liveCurrentTimes, eventMatches, leagueFlag, leagueName, railEvents, sport]
  )
  const railItemsKey = useMemo(
    () => railItems.map((item) => getLiveEventRailIdentity(item)).join('|'),
    [railItems]
  )
  const initialRailTimes = useMemo(
    () => railItems.reduce<Record<string, string>>((times, item) => {
      const identity = getLiveEventRailIdentity(item)
      // Fora do mapa de propósito: o relógio do jogo de NFL vem do feed, e quem não está aqui
      // cai no `dateTime` do item, que é onde o feed escreve. Ver `hasNflLiveClock`.
      if (hasNflLiveClock(identity)) return times
      times[identity] = item.currentTime ?? item.headerPrimary ?? item.dateTime
      return times
    }, {}),
    [railItems]
  )
  const [railTimesState, setRailTimesState] = useState(() => ({
    key: railItemsKey,
    times: initialRailTimes,
  }))
  const railTimes = railTimesState.key === railItemsKey ? railTimesState.times : initialRailTimes
  const matchIndexByIdentity = useMemo(() => {
    const indexByIdentity = new Map<string, number>()
    eventMatches.forEach((eventMatch, index) => {
      indexByIdentity.set(getLiveEventMatchIdentity(eventMatch, index), index)
    })
    return indexByIdentity
  }, [eventMatches])
  const selectedMatchTime = selectedMatch
    ? getLiveEventMatchTime(
        selectedMatch,
        selectedMatchIndex,
        liveCurrentTimes,
        selectedMatchIndex === selectedIndex ? currentTime : undefined
      )
    : ''
  const selectedDisplayTime = selectedMatch
    ? railTimes[selectedMatchIdentity] ?? selectedMatchTime
    : selectedMatchTime

  useEffect(() => {
    if (railItems.length === 0 || !railItems.some((item) => item.isLive)) return

    const interval = window.setInterval(() => {
      setRailTimesState((current) => {
        const sourceTimes = current.key === railItemsKey ? current.times : initialRailTimes
        const next = { ...sourceTimes }

        railItems.forEach((item) => {
          if (!item.isLive) return

          const identity = getLiveEventRailIdentity(item)
          // O jogo de NFL tem relógio próprio, comprimido e derivado dos lances. Apagar a
          // chave é o que devolve o item ao `dateTime` do feed. Ver `hasNflLiveClock`.
          if (hasNflLiveClock(identity)) {
            delete next[identity]
            return
          }
          const sourceTime = next[identity] ?? item.currentTime ?? item.headerPrimary ?? item.dateTime
          const parsed = parseLiveTime(sourceTime)
          if (parsed) next[identity] = getNextLiveTime(parsed)
        })

        return { key: railItemsKey, times: next }
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [initialRailTimes, railItems, railItemsKey])

  const handleInlineSelectIndex = useCallback((index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), Math.max(eventMatches.length - 1, 0))
    if (nextIndex === selectedMatchIndex) return

    if (onSelectedIndexChange) {
      onSelectedIndexChange(nextIndex)
      return
    }

    setInternalSelectedIndex(nextIndex)
  }, [eventMatches.length, onSelectedIndexChange, selectedMatchIndex])

  return {
    eventMatches,
    selectedMatch,
    selectedMatchIdentity,
    selectedDisplayTime,
    railItems,
    railTimes,
    matchIndexByIdentity,
    handleInlineSelectIndex,
  }
}

export function LiveEventInlineHeader({
  match,
  matches,
  railEvents,
  selectedIndex = 0,
  currentTimes,
  leagueName,
  leagueFlag,
  sport,
  currentTime,
  isCompact: _isCompact = false,
  initialStatsOpen = false,
  onSelectedIndexChange,
  onLayoutReady,
  onClose,
  closeControl = 'icon',
}: LiveEventInlineHeaderProps) {
  const {
    selectedMatch,
    selectedMatchIdentity,
    selectedDisplayTime,
    railItems,
    railTimes,
    matchIndexByIdentity,
    handleInlineSelectIndex,
  } = useLiveEventInlineState({
    match,
    matches,
    railEvents,
    selectedIndex,
    currentTimes,
    leagueName,
    leagueFlag,
    sport,
    currentTime,
    onSelectedIndexChange,
  })
  const hasSelectedMatch = !!selectedMatch

  useLayoutEffect(() => {
    if (!hasSelectedMatch) return

    onLayoutReady?.()
    const frame = window.requestAnimationFrame(() => {
      onLayoutReady?.()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [hasSelectedMatch, _isCompact, onLayoutReady, railItems.length, selectedMatchIdentity])

  if (!selectedMatch) return null

  return (
    <div
      className={[
        'live-event-inline__header-stack',
        (selectedMatch.isLive ?? true) ? '' : 'live-event-inline__header-stack--prematch',
      ].filter(Boolean).join(' ')}
    >
      <div className="live-event-inline__rail-row competition-event-rail">
        {onClose ? (
          <button
            type="button"
            className={closeControl === 'all' ? 'competition-event-rail__all' : 'live-event-inline__close'}
            onClick={onClose}
            aria-label={closeControl === 'all' ? 'Ver todos os jogos' : 'Fechar evento'}
          >
            {closeControl === 'all' ? (
              <span className="competition-event-rail__all-label">TODOS</span>
            ) : (
              <img src={iconCloseEvents} alt="" aria-hidden="true" />
            )}
          </button>
        ) : null}
        <LiveEventInlineEventRail
          items={railItems}
          activeIdentity={selectedMatchIdentity}
          railTimes={railTimes}
          matchIndexByIdentity={matchIndexByIdentity}
          onSelectIndex={handleInlineSelectIndex}
        />
      </div>
      <LiveEventInlineScoreHeader
        match={selectedMatch}
        sport={selectedMatch.sport ?? sport}
        currentTime={selectedDisplayTime}
        initialStatsOpen={initialStatsOpen}
      />
      <LiveEventInlineMarketChips sport={selectedMatch.sport ?? sport} />
    </div>
  )
}

export function LiveEventInline({
  match,
  matches,
  railEvents,
  selectedIndex = 0,
  currentTimes,
  leagueName,
  leagueFlag,
  sport,
  currentTime,
  onSelectedIndexChange,
  onCompactChange,
}: LiveEventInlineProps) {
  const {
    selectedMatch,
    selectedMatchIdentity,
    selectedDisplayTime,
  } = useLiveEventInlineState({
    match,
    matches,
    railEvents,
    selectedIndex,
    currentTimes,
    leagueName,
    leagueFlag,
    sport,
    currentTime,
    onSelectedIndexChange,
  })

  useEffect(() => {
    onCompactChange?.(false)

    return () => {
      onCompactChange?.(false)
    }
  }, [onCompactChange])

  if (!selectedMatch) return null

  return (
    <section className="live-event-inline">
      <div className="live-event-inline__content">
        {LIVE_EVENT_INLINE_SHOW_STREAM_BLOCK && (selectedMatch.isLive ?? true) && (
          <LiveEventInlineStreamBlock sport={selectedMatch.sport ?? sport} />
        )}
        <LiveEventInlineMarkets
          key={selectedMatchIdentity}
          match={selectedMatch}
          leagueName={selectedMatch.leagueName ?? leagueName}
          sport={selectedMatch.sport ?? sport}
          currentTime={selectedDisplayTime}
        />
      </div>
    </section>
  )
}

interface SheetMetrics {
  viewportWidth: number
  viewportHeight: number
  compactScale: number
}

function measureSheetMetrics(): SheetMetrics {
  if (typeof window === 'undefined') {
    return {
      viewportWidth: 390,
      viewportHeight: 844,
      compactScale: 342 / 390,
    }
  }

  const viewportWidth = window.visualViewport?.width ?? window.innerWidth ?? 390
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight ?? 844
  const availableWidth = Math.max(1, viewportWidth - LIVE_EVENT_COMPACT_SIDE_MARGIN * 2)
  const compactScale = Math.min(1, availableWidth / viewportWidth)

  return {
    viewportWidth,
    viewportHeight,
    compactScale,
  }
}

export function LiveEventPage({
  isOpen,
  onClose,
  onOpenSettled,
  onCloseStart,
  match,
  matches,
  railEvents,
  selectedIndex = 0,
  currentTimes,
  leagueName,
  leagueFlag,
  sport,
  currentTime,
}: LiveEventPageProps) {
  const feed = useNflLiveFeed()
  const liveCurrentTimes = useMemo(() => withoutNflLiveClock(currentTimes), [currentTimes])
  const eventMatches = useMemo(
    () => withNflLiveMatches(matches?.length ? matches : match ? [match] : [], feed),
    [feed, match, matches]
  )
  const eventMatchesKey = useMemo(
    () => eventMatches.map((eventMatch, index) => getLiveEventMatchIdentity(eventMatch, index)).join('|'),
    [eventMatches]
  )
  const requestedSelectedMatchIndex = Math.min(Math.max(selectedIndex, 0), Math.max(eventMatches.length - 1, 0))
  const [activeMatchState, setActiveMatchState] = useState<ActiveMatchState>(() => ({
    matchesKey: eventMatchesKey,
    requestedIndex: requestedSelectedMatchIndex,
    index: requestedSelectedMatchIndex,
  }))
  const [contentTransition, setContentTransition] = useState<LiveEventContentTransition | null>(null)
  const activeMatchIndex = (
    activeMatchState.matchesKey === eventMatchesKey
    && activeMatchState.requestedIndex === requestedSelectedMatchIndex
  )
    ? activeMatchState.index
    : requestedSelectedMatchIndex
  const activeContentTransition = contentTransition?.matchesKey === eventMatchesKey
    ? contentTransition
    : null
  const selectedMatchIndex = Math.min(Math.max(activeMatchIndex, 0), Math.max(eventMatches.length - 1, 0))
  const selectedMatch = eventMatches[selectedMatchIndex]
  const selectedMatchIdentity = selectedMatch ? getLiveEventMatchIdentity(selectedMatch, selectedMatchIndex) : ''
  const railItems = useMemo(
    () => withNflLiveRailItems(
      railEvents?.length
        ? railEvents
        : getLiveEventRailFallbackItems({
            matches: eventMatches,
            currentTimes: liveCurrentTimes,
            leagueName,
            leagueFlag,
            sport,
          }),
      feed,
    ),
    [feed, liveCurrentTimes, eventMatches, leagueFlag, leagueName, railEvents, sport]
  )
  const railItemsKey = useMemo(
    () => railItems.map((item) => getLiveEventRailIdentity(item)).join('|'),
    [railItems]
  )
  const matchIndexByIdentity = useMemo(() => {
    const indexByIdentity = new Map<string, number>()
    eventMatches.forEach((eventMatch, index) => {
      indexByIdentity.set(getLiveEventMatchIdentity(eventMatch, index), index)
    })
    return indexByIdentity
  }, [eventMatches])
  const selectableIdentities = useMemo(
    () => new Set(matchIndexByIdentity.keys()),
    [matchIndexByIdentity]
  )
  const activeRailIndex = railItems.findIndex((item) => getLiveEventRailIdentity(item) === selectedMatchIdentity)
  const initialRailTimes = useMemo(
    () => railItems.reduce<Record<string, string>>((times, item) => {
      const identity = getLiveEventRailIdentity(item)
      // Fora do mapa de propósito: o relógio do jogo de NFL vem do feed, e quem não está aqui
      // cai no `dateTime` do item, que é onde o feed escreve. Ver `hasNflLiveClock`.
      if (hasNflLiveClock(identity)) return times
      times[identity] = item.currentTime ?? item.headerPrimary ?? item.dateTime
      return times
    }, {}),
    [railItems]
  )
  const [railTimesState, setRailTimesState] = useState(() => ({
    key: railItemsKey,
    times: initialRailTimes,
  }))
  const railTimes = railTimesState.key === railItemsKey ? railTimesState.times : initialRailTimes
  const [isClosing, setIsClosing] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const [expansionProgress, setExpansionProgress] = useState(0)
  const isExpanded = expansionProgress >= 1
  const hasExpansionStarted = expansionProgress > 0
  const [isExpansionGestureActive, setIsExpansionGestureActive] = useState(false)
  const [compactPullY, setCompactPullY] = useState(0)
  const [isCompactPulling, setIsCompactPulling] = useState(false)
  const [sheetMetrics, setSheetMetrics] = useState<SheetMetrics>(() => measureSheetMetrics())
  const [swipeState, setSwipeState] = useState<SwipeState | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const compactCloseGuardTimerRef = useRef<number | null>(null)
  const compactCloseGuardRef = useRef(false)
  const switchTimerRef = useRef<number | null>(null)
  const expansionSettleTimerRef = useRef<number | null>(null)
  const swipeSnapTimerRef = useRef<number | null>(null)
  const pageRootRef = useRef<HTMLDivElement | null>(null)
  const swipeRuntimeRef = useRef({
    selectedMatchIndex,
    eventMatchesLength: eventMatches.length,
    eventMatchesKey,
    requestedSelectedMatchIndex,
    sheetMetrics,
    expansionProgress,
  })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (isOpen && !isClosing) {
        if (closeTimerRef.current !== null) {
          window.clearTimeout(closeTimerRef.current)
          closeTimerRef.current = null
        }
        setSheetMetrics(measureSheetMetrics())
        setExpansionProgress(0)
        setIsExpansionGestureActive(false)
        setCompactPullY(0)
        setIsCompactPulling(false)
        setShouldRender(true)
        setIsClosing(false)
      } else if (shouldRender && !isClosing) {
        setIsClosing(true)
        setExpansionProgress(0)
        setIsExpansionGestureActive(false)
        setCompactPullY(0)
        setIsCompactPulling(false)
        closeTimerRef.current = window.setTimeout(() => {
          setShouldRender(false)
          setIsClosing(false)
          closeTimerRef.current = null
          onClose()
        }, LIVE_EVENT_TRANSITION_MS)
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [isOpen, onClose, shouldRender, isClosing])

  useEffect(() => () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (compactCloseGuardTimerRef.current !== null) {
      window.clearTimeout(compactCloseGuardTimerRef.current)
      compactCloseGuardTimerRef.current = null
    }
    if (switchTimerRef.current !== null) {
      window.clearTimeout(switchTimerRef.current)
      switchTimerRef.current = null
    }
    if (expansionSettleTimerRef.current !== null) {
      window.clearTimeout(expansionSettleTimerRef.current)
      expansionSettleTimerRef.current = null
    }
    if (swipeSnapTimerRef.current !== null) {
      window.clearTimeout(swipeSnapTimerRef.current)
      swipeSnapTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!shouldRender || isClosing) return undefined

    const timer = window.setTimeout(() => {
      onOpenSettled?.()
    }, LIVE_EVENT_TRANSITION_MS)

    return () => window.clearTimeout(timer)
  }, [isClosing, onOpenSettled, shouldRender])

  const armCompactCloseGuard = useCallback(() => {
    compactCloseGuardRef.current = true

    if (compactCloseGuardTimerRef.current !== null) {
      window.clearTimeout(compactCloseGuardTimerRef.current)
    }

    compactCloseGuardTimerRef.current = window.setTimeout(() => {
      compactCloseGuardRef.current = false
      compactCloseGuardTimerRef.current = null
    }, LIVE_EVENT_CLOSE_GUARD_MS)
  }, [])

  const clearCompactCloseGuard = useCallback(() => {
    compactCloseGuardRef.current = false

    if (compactCloseGuardTimerRef.current !== null) {
      window.clearTimeout(compactCloseGuardTimerRef.current)
      compactCloseGuardTimerRef.current = null
    }
  }, [])

  useLayoutEffect(() => {
    swipeRuntimeRef.current = {
      selectedMatchIndex,
      eventMatchesLength: eventMatches.length,
      eventMatchesKey,
      requestedSelectedMatchIndex,
      sheetMetrics,
      expansionProgress,
    }
  }, [
    eventMatches.length,
    eventMatchesKey,
    expansionProgress,
    requestedSelectedMatchIndex,
    selectedMatchIndex,
    sheetMetrics,
  ])

  useEffect(() => {
    if (!shouldRender || railItems.length === 0 || !railItems.some((item) => item.isLive)) return

    const interval = window.setInterval(() => {
      setRailTimesState((current) => {
        const sourceTimes = current.key === railItemsKey ? current.times : initialRailTimes
        const next = { ...sourceTimes }

        railItems.forEach((item) => {
          if (!item.isLive) return

          const identity = getLiveEventRailIdentity(item)
          // O jogo de NFL tem relógio próprio. Ver `hasNflLiveClock`.
          if (hasNflLiveClock(identity)) {
            delete next[identity]
            return
          }
          const sourceTime = next[identity] ?? item.currentTime ?? item.headerPrimary ?? item.dateTime
          const parsed = parseLiveTime(sourceTime)
          if (parsed) {
            next[identity] = getNextLiveTime(parsed)
          }
        })

        return { key: railItemsKey, times: next }
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [initialRailTimes, railItems, railItemsKey, shouldRender])

  useEffect(() => {
    if (!shouldRender) return

    const scrollY = window.scrollY
    const previousBodyOverflow = document.body.style.overflow
    const previousBodyPosition = document.body.style.position
    const previousBodyTop = document.body.style.top
    const previousBodyWidth = document.body.style.width
    const previousHtmlOverflow = document.documentElement.style.overflow

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
      document.body.style.position = previousBodyPosition
      document.body.style.top = previousBodyTop
      document.body.style.width = previousBodyWidth
      window.scrollTo(0, scrollY)
    }
  }, [shouldRender])

  useEffect(() => {
    if (!shouldRender) return

    const updateSheetMetrics = () => setSheetMetrics(measureSheetMetrics())

    updateSheetMetrics()
    window.addEventListener('resize', updateSheetMetrics)
    window.visualViewport?.addEventListener('resize', updateSheetMetrics)

    return () => {
      window.removeEventListener('resize', updateSheetMetrics)
      window.visualViewport?.removeEventListener('resize', updateSheetMetrics)
    }
  }, [shouldRender])

  const clearExpansionSettleTimer = useCallback(() => {
    if (expansionSettleTimerRef.current !== null) {
      window.clearTimeout(expansionSettleTimerRef.current)
      expansionSettleTimerRef.current = null
    }
  }, [])

  const settleExpansionProgress = useCallback((progress: number) => {
    clearExpansionSettleTimer()

    const clampedProgress = clampLiveEventExpansionProgress(progress)
    const settledProgress = clampedProgress <= 0
      ? 0
      : clampedProgress >= 1
        ? 1
        : clampedProgress >= LIVE_EVENT_EXPANSION_SETTLE_THRESHOLD
          ? 1
          : 0

    setExpansionProgress(settledProgress)
    setIsExpansionGestureActive(false)
    setCompactPullY(0)
    setIsCompactPulling(false)
  }, [clearExpansionSettleTimer])

  const handleExpansionProgressChange = useCallback((
    progress: number,
    options: { deferSettle?: boolean } = {}
  ) => {
    const nextProgress = clampLiveEventExpansionProgress(progress)

    clearExpansionSettleTimer()
    setIsExpansionGestureActive(true)
    setExpansionProgress(nextProgress)

    if (nextProgress > 0) {
      setCompactPullY(0)
      setIsCompactPulling(false)
    }

    if (options.deferSettle) {
      expansionSettleTimerRef.current = window.setTimeout(() => {
        settleExpansionProgress(nextProgress)
      }, LIVE_EVENT_WHEEL_SETTLE_DELAY_MS)
    }
  }, [clearExpansionSettleTimer, settleExpansionProgress])

  const handleExpansionGestureEnd = useCallback((progress: number) => {
    const nextProgress = clampLiveEventExpansionProgress(progress)
    if (nextProgress <= 0) armCompactCloseGuard()
    settleExpansionProgress(nextProgress)
  }, [armCompactCloseGuard, settleExpansionProgress])

  const requestClose = useCallback((options: LiveEventCloseOptions = {}) => {
    if (isClosing) return
    const shouldForceClose = options.force === true

    clearExpansionSettleTimer()
    if (!shouldForceClose && expansionProgress > 0) {
      armCompactCloseGuard()
      setExpansionProgress(0)
      setIsExpansionGestureActive(false)
      setCompactPullY(0)
      setIsCompactPulling(false)
      return
    }
    if (!shouldForceClose && compactCloseGuardRef.current) return

    if (shouldForceClose) clearCompactCloseGuard()

    onCloseStart?.()
    setIsClosing(true)
    setExpansionProgress(0)
    setIsExpansionGestureActive(false)
    setCompactPullY(0)
    setIsCompactPulling(false)
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
    }
    closeTimerRef.current = window.setTimeout(() => {
      setShouldRender(false)
      setIsClosing(false)
      closeTimerRef.current = null
      onClose()
    }, LIVE_EVENT_TRANSITION_MS)
  }, [armCompactCloseGuard, clearCompactCloseGuard, clearExpansionSettleTimer, expansionProgress, isClosing, onClose, onCloseStart])

  const requestExpand = useCallback(() => {
    clearExpansionSettleTimer()
    setCompactPullY(0)
    setIsCompactPulling(false)
    setIsExpansionGestureActive(false)
    setExpansionProgress(1)
  }, [clearExpansionSettleTimer])

  const requestCollapse = useCallback(() => {
    armCompactCloseGuard()
    clearExpansionSettleTimer()
    setCompactPullY(0)
    setIsCompactPulling(false)
    setIsExpansionGestureActive(false)
    setExpansionProgress(0)
  }, [armCompactCloseGuard, clearExpansionSettleTimer])

  const handleCompactPullChange = useCallback((distance: number) => {
    if (isClosing) return
    if (distance <= 0) {
      setIsCompactPulling(false)
      setCompactPullY(0)
      return
    }

    setIsCompactPulling(true)
    setCompactPullY(distance)
  }, [isClosing])

  const handleCompactPullEnd = useCallback((distance: number) => {
    if (distance >= LIVE_EVENT_CLOSE_PULL_THRESHOLD) {
      requestClose({ force: true })
      return
    }

    setIsCompactPulling(false)
    setCompactPullY(0)
  }, [requestClose])

  const commitMatchSwitch = useCallback((nextMatchIndex: number, direction: LiveEventSwitchDirection) => {
    if (switchTimerRef.current !== null) {
      window.clearTimeout(switchTimerRef.current)
      switchTimerRef.current = null
    }

    setContentTransition((current) => {
      const canContinueTransition = current?.matchesKey === eventMatchesKey

      return {
        matchesKey: eventMatchesKey,
        previousIndex: canContinueTransition ? current.activeIndex : selectedMatchIndex,
        activeIndex: nextMatchIndex,
        direction,
        key: (canContinueTransition ? current.key : 0) + 1,
      }
    })
    setActiveMatchState({
      matchesKey: eventMatchesKey,
      requestedIndex: requestedSelectedMatchIndex,
      index: nextMatchIndex,
    })
    setCompactPullY(0)
    setIsCompactPulling(false)

    switchTimerRef.current = window.setTimeout(() => {
      setContentTransition(null)
      switchTimerRef.current = null
    }, LIVE_EVENT_CONTENT_SWITCH_MS)
  }, [eventMatchesKey, requestedSelectedMatchIndex, selectedMatchIndex])

  const handleRailItemSelect = useCallback((item: LiveEventRailItem, railIndex: number) => {
    const nextMatchIndex = matchIndexByIdentity.get(getLiveEventRailIdentity(item))
    if (nextMatchIndex === undefined || nextMatchIndex === selectedMatchIndex) return

    const currentRailIndex = activeRailIndex >= 0 ? activeRailIndex : selectedMatchIndex
    const direction: LiveEventSwitchDirection = railIndex > currentRailIndex ? 'next' : 'previous'

    commitMatchSwitch(nextMatchIndex, direction)
  }, [activeRailIndex, commitMatchSwitch, matchIndexByIdentity, selectedMatchIndex])

  const handleSwipeStart = useCallback(() => {
    if (swipeSnapTimerRef.current !== null) return

    pageRootRef.current?.style.setProperty('--live-event-swipe-x', '0px')
    setSwipeState({ direction: 'next', isSnapping: false })
  }, [])

  const handleSwipeMove = useCallback((dx: number) => {
    if (swipeSnapTimerRef.current !== null) return

    const {
      selectedMatchIndex: currentMatchIndex,
      eventMatchesLength,
    } = swipeRuntimeRef.current
    const direction: LiveEventSwitchDirection = dx < 0 ? 'next' : 'previous'
    const hasNeighbor = direction === 'next'
      ? currentMatchIndex < eventMatchesLength - 1
      : currentMatchIndex > 0
    const adjustedDx = hasNeighbor ? dx : dx * LIVE_EVENT_SWIPE_EDGE_RESISTANCE
    pageRootRef.current?.style.setProperty('--live-event-swipe-x', `${adjustedDx}px`)

    setSwipeState((current) => {
      if (current && current.direction === direction && !current.isSnapping) return current
      return { direction, isSnapping: false }
    })
  }, [])

  const handleSwipeEnd = useCallback((dx: number, velocity: number) => {
    if (swipeSnapTimerRef.current !== null) return

    const {
      selectedMatchIndex: currentMatchIndex,
      eventMatchesLength,
      eventMatchesKey: currentEventMatchesKey,
      requestedSelectedMatchIndex: currentRequestedSelectedMatchIndex,
      sheetMetrics: currentSheetMetrics,
      expansionProgress: currentExpansionProgress,
    } = swipeRuntimeRef.current
    const direction: LiveEventSwitchDirection = dx < 0 ? 'next' : 'previous'
    const hasNeighbor = direction === 'next'
      ? currentMatchIndex < eventMatchesLength - 1
      : currentMatchIndex > 0
    const viewportWidth = currentSheetMetrics.viewportWidth
    const currentSheetScale = currentSheetMetrics.compactScale + (1 - currentSheetMetrics.compactScale) * currentExpansionProgress
    const swipePageDistance = viewportWidth * currentSheetScale + LIVE_EVENT_SWIPE_PAGE_GAP
    const passedDistance = Math.abs(dx) >= swipePageDistance * LIVE_EVENT_SWIPE_COMMIT_RATIO
    const passedVelocity = Math.abs(velocity) >= LIVE_EVENT_SWIPE_COMMIT_VELOCITY
      && Math.abs(dx) >= LIVE_EVENT_SWIPE_INTENT_THRESHOLD * 2
    const shouldCommit = hasNeighbor && (passedDistance || passedVelocity)

    if (swipeSnapTimerRef.current !== null) {
      window.clearTimeout(swipeSnapTimerRef.current)
      swipeSnapTimerRef.current = null
    }

    if (shouldCommit) {
      const nextIndex = currentMatchIndex + (direction === 'next' ? 1 : -1)
      const targetPx = (direction === 'next' ? -1 : 1) * swipePageDistance
      pageRootRef.current?.style.setProperty('--live-event-swipe-x', `${targetPx}px`)
      setSwipeState({ direction, isSnapping: true })

      swipeSnapTimerRef.current = window.setTimeout(() => {
        flushSync(() => {
          setActiveMatchState({
            matchesKey: currentEventMatchesKey,
            requestedIndex: currentRequestedSelectedMatchIndex,
            index: nextIndex,
          })
          setSwipeState(null)
        })
        pageRootRef.current?.style.setProperty('--live-event-swipe-x', '0px')
        swipeSnapTimerRef.current = null
      }, LIVE_EVENT_SWIPE_SNAP_MS)
    } else {
      pageRootRef.current?.style.setProperty('--live-event-swipe-x', '0px')
      setSwipeState({ direction, isSnapping: true })
      swipeSnapTimerRef.current = window.setTimeout(() => {
        setSwipeState(null)
        swipeSnapTimerRef.current = null
      }, LIVE_EVENT_SWIPE_SNAP_MS)
    }
  }, [])

  if (!shouldRender || !selectedMatch) return null

  const selectedMatchTime = getLiveEventMatchTime(
    selectedMatch,
    selectedMatchIndex,
    currentTimes,
    selectedMatchIndex === selectedIndex ? currentTime : undefined
  )
  const previousTransitionMatch = activeContentTransition
    ? eventMatches[activeContentTransition.previousIndex]
    : undefined
  const previousTransitionMatchTime = previousTransitionMatch
    ? getLiveEventMatchTime(previousTransitionMatch, activeContentTransition!.previousIndex, currentTimes)
    : ''
  const pageClasses = [
    'live-event-page',
    isClosing ? 'live-event-page--closing' : '',
    isExpanded ? 'live-event-page--expanded' : '',
    hasExpansionStarted ? 'live-event-page--expansion-started' : '',
    isExpansionGestureActive ? 'live-event-page--gesture-resizing' : '',
    isCompactPulling ? 'live-event-page--compact-pulling' : '',
    activeContentTransition ? 'live-event-page--content-switching' : '',
    swipeState ? 'live-event-page--swiping' : '',
    swipeState?.isSnapping ? 'live-event-page--swipe-snapping' : '',
  ].filter(Boolean).join(' ')
  const swipeNeighborIndex = swipeState
    ? (swipeState.direction === 'next'
        ? (selectedMatchIndex < eventMatches.length - 1 ? selectedMatchIndex + 1 : null)
        : (selectedMatchIndex > 0 ? selectedMatchIndex - 1 : null))
    : null
  const swipeNeighborMatch = swipeNeighborIndex !== null ? eventMatches[swipeNeighborIndex] : null
  const showSwipeNeighbor = !!swipeState
    && swipeNeighborMatch !== null
    && swipeNeighborMatch !== undefined
    && !activeContentTransition
  const sheetOffsetY = LIVE_EVENT_COMPACT_TOP * (1 - expansionProgress) + compactPullY
  const sheetScale = sheetMetrics.compactScale + (1 - sheetMetrics.compactScale) * expansionProgress
  const sheetRadius = 28 * (1 - expansionProgress)
  const rootStyle = {
    ['--live-event-sheet-width' as string]: `${sheetMetrics.viewportWidth}px`,
    ['--live-event-sheet-height' as string]: `${sheetMetrics.viewportHeight}px`,
    ['--live-event-compact-scale' as string]: String(sheetMetrics.compactScale),
    ['--live-event-compact-top' as string]: `${LIVE_EVENT_COMPACT_TOP}px`,
    ['--live-event-compact-pull-y' as string]: `${compactPullY}px`,
    ['--live-event-expansion-progress' as string]: String(expansionProgress),
    ['--live-event-sheet-offset-y' as string]: `${sheetOffsetY}px`,
    ['--live-event-sheet-scale' as string]: String(sheetScale),
    ['--live-event-sheet-radius' as string]: `${sheetRadius}px`,
    ['--live-event-swipe-page-gap' as string]: `${LIVE_EVENT_SWIPE_PAGE_GAP}px`,
  } as CSSProperties

  return createPortal(
    <div ref={pageRootRef} className={pageClasses} style={rootStyle}>
      <div className="live-event-page__overlay" onClick={() => requestClose()} />
      <div className="live-event-page__sheet-layer">
        {railItems.length > 0 && (
          <div className="live-event-page__compact-rail-shell">
            <LiveEventMatchRail
              items={railItems}
              activeIdentity={selectedMatchIdentity}
              activeRailIndex={activeRailIndex}
              railTimes={railTimes}
              selectableIdentities={selectableIdentities}
              isExpanded={isExpanded}
              onSelect={handleRailItemSelect}
            />
          </div>
        )}
        <div className="live-event-page__sheet-slide">
          <div className="live-event-page__sheet-center">
            <div className="live-event-page__sheet-scale">
              <div className="live-event-page__content-stage">
                {activeContentTransition && previousTransitionMatch && (
                  <div
                    key={getLiveEventMatchIdentity(previousTransitionMatch, activeContentTransition.previousIndex)}
                    className={[
                      'live-event-page__content-pane',
                      'live-event-page__content-pane--previous',
                      `live-event-page__content-pane--exit-${activeContentTransition.direction}`,
                    ].join(' ')}
                  >
                    <MemoLiveEventContent
                      match={previousTransitionMatch}
                      leagueName={previousTransitionMatch.leagueName ?? leagueName}
                      sport={previousTransitionMatch.sport ?? sport}
                      currentTime={previousTransitionMatchTime}
                      isExpanded={isExpanded}
                      expansionProgress={expansionProgress}
                      onRequestClose={requestClose}
                      onRequestExpand={requestExpand}
                      onRequestCollapse={requestCollapse}
                      onExpansionProgressChange={handleExpansionProgressChange}
                      onExpansionGestureEnd={handleExpansionGestureEnd}
                      onCompactPullChange={handleCompactPullChange}
                      onCompactPullEnd={handleCompactPullEnd}
                      onBlockNextClose={armCompactCloseGuard}
                      onSwipeStart={handleSwipeStart}
                      onSwipeMove={handleSwipeMove}
                      onSwipeEnd={handleSwipeEnd}
                    />
                  </div>
                )}
                <div
                  key={selectedMatchIdentity}
                  className={[
                    'live-event-page__content-pane',
                    'live-event-page__content-pane--active',
                    activeContentTransition ? `live-event-page__content-pane--enter-${activeContentTransition.direction}` : '',
                  ].filter(Boolean).join(' ')}
                >
                  <MemoLiveEventContent
                    match={selectedMatch}
                    leagueName={selectedMatch.leagueName ?? leagueName}
                    sport={selectedMatch.sport ?? sport}
                    currentTime={selectedMatchTime}
                    isExpanded={isExpanded}
                    expansionProgress={expansionProgress}
                    onRequestClose={requestClose}
                    onRequestExpand={requestExpand}
                    onRequestCollapse={requestCollapse}
                    onExpansionProgressChange={handleExpansionProgressChange}
                    onExpansionGestureEnd={handleExpansionGestureEnd}
                    onCompactPullChange={handleCompactPullChange}
                    onCompactPullEnd={handleCompactPullEnd}
                    onBlockNextClose={armCompactCloseGuard}
                    onSwipeStart={handleSwipeStart}
                    onSwipeMove={handleSwipeMove}
                    onSwipeEnd={handleSwipeEnd}
                  />
                </div>
                {showSwipeNeighbor && swipeNeighborMatch && swipeState && (
                  <div
                    key={getLiveEventMatchIdentity(swipeNeighborMatch, swipeNeighborIndex!)}
                    className={[
                      'live-event-page__content-pane',
                      'live-event-page__content-pane--swipe-neighbor',
                      `live-event-page__content-pane--swipe-neighbor-${swipeState.direction}`,
                    ].join(' ')}
                    aria-hidden
                  >
                    <MemoLiveEventContent
                      match={swipeNeighborMatch}
                      leagueName={swipeNeighborMatch.leagueName ?? leagueName}
                      sport={swipeNeighborMatch.sport ?? sport}
                      currentTime={getLiveEventMatchTime(swipeNeighborMatch, swipeNeighborIndex!, currentTimes)}
                      isExpanded={isExpanded}
                      expansionProgress={expansionProgress}
                      onRequestClose={requestClose}
                      onRequestExpand={requestExpand}
                      onRequestCollapse={requestCollapse}
                      onExpansionProgressChange={handleExpansionProgressChange}
                      onExpansionGestureEnd={handleExpansionGestureEnd}
                      onCompactPullChange={handleCompactPullChange}
                      onCompactPullEnd={handleCompactPullEnd}
                      onBlockNextClose={armCompactCloseGuard}
                      onSwipeStart={handleSwipeStart}
                      onSwipeMove={handleSwipeMove}
                      onSwipeEnd={handleSwipeEnd}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
