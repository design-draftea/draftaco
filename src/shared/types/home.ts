export type ProductMode = 'apostas' | 'cassino'

export interface ProductRailBaseItem {
  id: string
  label: string
  icon?: string
  lightIcon?: string
  clickable?: boolean
  isMore?: boolean
}

export interface ProductRailSection<T extends ProductRailBaseItem = ProductRailBaseItem> {
  id: string
  className?: string
  items: T[]
}

export interface NavItem {
  id: string
  icon: string
  label: string
}

export interface NavbarConfig {
  activeItemId: string
  mainItems: NavItem[]
  searchItem: NavItem
}

export interface LiveTeam {
  name: string
  shortName: string
  badge: string
  score: number
}

export interface LiveMatch {
  homeTeam: LiveTeam
  awayTeam: LiveTeam
  matchTime: string
  odds: { home: string; draw: string; away: string }
}

export interface TennisPlayer {
  name: string
  sets: number
  games: number
  points: string
  isServing: boolean
  flag?: string
}

export interface TennisMatch {
  player1: TennisPlayer
  player2: TennisPlayer
  currentSet: string
  setScore: string
  odds: { player1: string; player2: string }
}

export interface ComboStat {
  value: string
  label: string
}

export interface MarketBannerTeam {
  name: string
  image?: string
  imageSourceName?: string
  glowColor?: string
  score?: string
  stats?: MarketBannerTeamStat[]
  sets?: string[]
  currentScore?: string
  isServing?: boolean
}

export interface MarketBannerOdd {
  label: string
  value: string
  outcomeId: string
  trend?: 'up' | 'down'
}

export interface MarketBannerTeamStat {
  icon: 'corner' | 'red-card' | 'yellow-card' | 'goal'
  value: string
}

export interface MarketBannerAlternativeMarket {
  id: string
  label: string
  odds: [MarketBannerOdd, MarketBannerOdd]
}

export interface MarketBannerPlayerProp {
  id: string
  playerName: string
  position?: string
  subtitle: string
  teamName: string
  odds: [MarketBannerOdd, MarketBannerOdd, MarketBannerOdd]
}

export interface MarketBanner {
  variant: 'football-live' | 'tennis-live' | 'football-pre' | 'basketball-live' | 'basketball-pre'
  sport: 'futebol' | 'tenis' | 'basquete'
  league: string
  teams: [MarketBannerTeam, MarketBannerTeam]
  odds: MarketBannerOdd[]
  footerLabel: string
  live?: boolean
  liveClock?: string
  alternativeMarkets?: MarketBannerAlternativeMarket[]
  playerProps?: MarketBannerPlayerProp[]
}

export interface Banner {
  id: number
  type: 'missao' | '1x2' | 'torneio' | 'aumentada' | 'virtuais' | 'aoVivo' | 'aoVivoTenis' | 'longoPrazo' | 'combinada' | 'market'
  headerLeft: string
  headerRight: string
  showTimer?: boolean
  background: string
  title: string
  description: string
  hideContent?: boolean
  casinoGameId?: string
  noWrapTitle?: boolean
  buttonText?: string
  showInfoBtn?: boolean
  odds?: { team: string; value: string; badge?: string }[]
  oddBoosted?: { old: string; new: string }
  liveMatch?: LiveMatch
  tennisMatch?: TennisMatch
  comboStats?: ComboStat[]
  marketBanner?: MarketBanner
  eventLink?: {
    eventId: string
    competitionId: string
    competitionName: string
    sport: 'futebol' | 'basquete'
  }
}

export interface Promotion {
  id: string
  type: 'missao' | 'vantagem'
  timeLabel: string
  hasTimer: boolean
  label: string[]
  title: string
  description: string
  image: string
  headline?: string
  titleLines?: string[]
  countdownLabel?: string
  countdownMinutes?: number
  rulesLabel?: string
  glowImage?: string
  accent?: 'mint' | 'gold' | 'cyan'
}

export interface HomeCompetitionOdd {
  label: string
  value: string
}

export interface HomeCompetitionMarketColumn {
  // Rótulo curto do cabeçalho da coluna, que precisa caber em 64px (ex.: "RF").
  label: string
  // Nome real do mercado, usado onde há espaço e a abreviação não se explica
  // (betslip, resumo da entrada). Quando ausente, vale `label`.
  fullLabel?: string
  tag?: string
  homeOdd: HomeCompetitionOdd
  awayOdd: HomeCompetitionOdd
}

export interface HomeCompetitionMarketChip {
  id: string
  label: string
}

// Esportes com card/props de competição implementados. `nfl` reaproveita o layout de
// colunas de mercado do basquete (ver BasketballMatchCard em HomeCompetitionSection).
export type HomeCompetitionSport = 'futebol' | 'basquete' | 'nfl'

export interface HomeCompetitionMatch {
  id: string
  homeTeam: string
  awayTeam: string
  sport: HomeCompetitionSport
  homeScore?: string
  awayScore?: string
  leagueLabel?: string
  marketLabel: string
  tags: string[]
  footerLabel: string
  live?: boolean
  liveClock?: string
  marketColumns?: HomeCompetitionMarketColumn[]
  doubleChanceOdds?: {
    homeOrDraw: string
    homeOrAway: string
    awayOrDraw: string
  }
  bothTeamsScoreOdds?: {
    yes: string
    no: string
  }
  totalGoalsOdds?: {
    line: number
    under: string
    over: string
  }
  totalCornersOdds?: {
    line: number
    under: string
    over: string
  }
  totalPointsOdds?: {
    line: number
    under: string
    over: string
  }
  handicapOdds?: {
    line: number
    home: string
    away: string
  }
  q3TotalOdds?: {
    line: number
    under: string
    over: string
  }
  q4TotalOdds?: {
    line: number
    under: string
    over: string
  }
  q3ResultOdds?: {
    home: string
    away: string
  }
  odds: [HomeCompetitionOdd, HomeCompetitionOdd, HomeCompetitionOdd]
}

export interface HomeCompetitionPlayerProp {
  id: string
  marketId?: string
  // Full team names — populated by the real builders (sport / competition) so the
  // canonical betslip key (see getPlayerPropBetslipKey) correlates selections across
  // screens. Optional because static fallback fixtures only carry abbreviations.
  homeTeam?: string
  awayTeam?: string
  playerName: string
  playerImage?: string
  position: string
  marketLabel: string
  matchLabel: string
  timeLabel: string
  teamName: string
  teamAbbreviation: string
  sport: HomeCompetitionSport
  odds: [HomeCompetitionOdd, HomeCompetitionOdd, HomeCompetitionOdd]
}

export interface HomeCompetitionHighlight {
  title: string
  sportLabel: string
  marketChips?: HomeCompetitionMarketChip[]
  matches: HomeCompetitionMatch[]
  playerProps: HomeCompetitionPlayerProp[]
}

export interface HomeOfferLeg {
  id: string
  icon?: 'total-goals'
  image?: string
  label: string
  detail?: string
}

export interface HomeOfferCarouselItem {
  id: string
  title: string
  badge: string
  badgeTone: 'combinada' | 'super-combinada' | 'super-aumentada' | 'aumentada' | 'garantida'
  matchup: string
  dateLabel: string
  background: string
  odd: string
  oldOdd?: string
  restrictions?: string[]
  footerAction?: {
    label: string
  }
  player?: {
    name: string
    teamName: string
    image: string
  }
  boost?: {
    from: string
    to: string
    marketLabel: string
  }
  legs?: HomeOfferLeg[]
}

export type CasinoCategoryId =
  | 'destaques'
  | 'slots'
  | 'roletas'
  | 'blackjack'
  | 'crash'
  | 'ao-vivo'
  | 'provedores'
  | 'promocoes'

export interface CasinoRailItem extends ProductRailBaseItem {
  categoryId: CasinoCategoryId
}

export interface CasinoGame {
  id: string
  name: string
  provider: string
  image: string
  categoryIds: CasinoCategoryId[]
  isLive?: boolean
}

export interface CasinoGameSection {
  id: string
  title: string
  categoryIds: CasinoCategoryId[]
  games: CasinoGame[]
}
