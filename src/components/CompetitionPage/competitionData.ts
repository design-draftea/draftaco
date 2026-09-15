import flacoLopezProps from '../../assets/flacoLopezProps.png'
import arrascaetaProps from '../../assets/arrascaetaProps.png'
import depayProps from '../../assets/depayProps.png'
import pedroProps from '../../assets/pedroProps.png'
import yuriProps from '../../assets/yuriProps.png'
import avatarFutebol from '../../assets/avatarFutebol.png'
import escudoPalmeiras from '../../assets/escudoPalmeiras.png'
import escudoFlamengo from '../../assets/escudoFlamengo.png'
import escudoFluminense from '../../assets/escudoFluminense.png'
import escudoCruzeiro from '../../assets/escudoCruzeiro.png'
import escudoSantos from '../../assets/escudoSantos.png'
import iconFutebol from '../../assets/iconSports/soccer.png'
import escudoLakers from '../../assets/escudoLakers.png'
import escudoWarriors from '../../assets/escudoWarriors.png'
import escudoThunder from '../../assets/escudoThunder.png'
import escudoCavaliers from '../../assets/escudoCavaliers.png'
import escudoBulls from '../../assets/escudoBullsGde.png'
import playerLeBronJames from '../../assets/playerLeBronJames.png'
import playerStephenCurry from '../../assets/playerStephenCurry.png'
import playerLukaDoncic from '../../assets/playerLukaDoncic.png'
import playerJimmyButler from '../../assets/playerJimmyButler.png'
import { TEAM_LOGO_FALLBACK } from '../../shared/utils/teamLogoFallback'

export interface CompetitionMatch {
  id: string
  homeName: string
  homeIcon: string
  awayName: string
  awayIcon: string
  isLive?: boolean
  liveTime?: string
  homeScore?: number
  awayScore?: number
  dateTime?: string
  earlyPayout?: boolean
  odds: {
    home: string
    draw?: string
    away: string
  }
}

export interface PlayerPropOption {
  label: string
  odd: string
  active?: boolean
}

export interface PlayerImageAdjustment {
  scale: number
  x: number
  y: number
}

export interface PlayerPropCard {
  id: string
  matchLabel: string
  highlightedTeam: string
  matchTime: string
  playerName: string
  playerImage: string
  playerImageAdjustment?: PlayerImageAdjustment
  optionsByStat: Record<string, PlayerPropOption[]>
}

export interface LongTermOdd {
  id: string
  label: string
  market: string
  odd: string
  icon?: string
}

export interface CompetitionData {
  matches: CompetitionMatch[]
  playerStatChips: { id: string; label: string }[]
  playerProps: PlayerPropCard[]
  longTermTabs: { id: string; label: string }[]
  longTermOddsByTab: Record<string, LongTermOdd[]>
}

const defaultFlag = TEAM_LOGO_FALLBACK

const baseMatches: CompetitionMatch[] = [
  {
    id: 'live-1',
    homeName: 'Time Casa',
    homeIcon: defaultFlag,
    awayName: 'Time Visitante',
    awayIcon: defaultFlag,
    isLive: true,
    liveTime: '2T 22:12',
    homeScore: 2,
    awayScore: 1,
    odds: { home: '1.78x', draw: '1.78x', away: '1.78x' },
  },
  {
    id: 'live-2',
    homeName: 'Time Casa',
    homeIcon: defaultFlag,
    awayName: 'Time Visitante',
    awayIcon: defaultFlag,
    isLive: true,
    liveTime: '1T 18:34',
    homeScore: 0,
    awayScore: 0,
    odds: { home: '2.10x', draw: '3.20x', away: '3.20x' },
  },
  {
    id: 'live-3',
    homeName: 'Time Casa',
    homeIcon: defaultFlag,
    awayName: 'Time Visitante',
    awayIcon: defaultFlag,
    isLive: true,
    liveTime: '2T 38:05',
    homeScore: 1,
    awayScore: 2,
    odds: { home: '4.20x', draw: '3.50x', away: '1.62x' },
  },
  {
    id: 'pre-1',
    homeName: 'Time Casa',
    homeIcon: defaultFlag,
    awayName: 'Time Visitante',
    awayIcon: defaultFlag,
    dateTime: 'Hoje, 21:30',
    earlyPayout: true,
    odds: { home: '1.78x', draw: '1.78x', away: '1.78x' },
  },
  {
    id: 'pre-2',
    homeName: 'Time Casa',
    homeIcon: defaultFlag,
    awayName: 'Time Visitante',
    awayIcon: defaultFlag,
    dateTime: 'Hoje, 21:30',
    earlyPayout: true,
    odds: { home: '1.78x', draw: '1.78x', away: '1.78x' },
  },
  {
    id: 'pre-3',
    homeName: 'Time Casa',
    homeIcon: defaultFlag,
    awayName: 'Time Visitante',
    awayIcon: defaultFlag,
    dateTime: 'Amanhã, 16:00',
    earlyPayout: false,
    odds: { home: '2.05x', draw: '3.30x', away: '3.10x' },
  },
  {
    id: 'pre-4',
    homeName: 'Time Casa',
    homeIcon: defaultFlag,
    awayName: 'Time Visitante',
    awayIcon: defaultFlag,
    dateTime: 'Amanhã, 18:30',
    earlyPayout: true,
    odds: { home: '1.95x', draw: '3.40x', away: '3.50x' },
  },
  {
    id: 'pre-5',
    homeName: 'Time Casa',
    homeIcon: defaultFlag,
    awayName: 'Time Visitante',
    awayIcon: defaultFlag,
    dateTime: 'Amanhã, 16:30',
    earlyPayout: false,
    odds: { home: '2.40x', draw: '3.20x', away: '2.85x' },
  },
]

const basePlayerStats = [
  { id: 'finalizacao-gol', label: 'Finalização ao Gol' },
  { id: 'finalizacao-total', label: 'Finalização Total' },
  { id: 'gols', label: 'Gols' },
  { id: 'assistencias', label: 'Assistências' },
]

const basketballPlayerStats = [
  { id: 'pontos', label: 'Pontos' },
  { id: 'rebotes', label: 'Rebotes' },
  { id: 'assistencias', label: 'Assistências' },
  { id: 'bolas-3', label: 'Bolas de 3' },
]

const options = (values: Array<[string, string]>): PlayerPropOption[] =>
  values.map(([label, odd], index) => ({ label, odd, active: index === 1 }))

const basePlayerProps: PlayerPropCard[] = [
  {
    id: 'pp-flaco',
    matchLabel: 'PAL X FLU',
    highlightedTeam: 'PAL',
    matchTime: 'Hoje, 21:30',
    playerName: 'Flaco Lopez',
    playerImage: avatarFutebol,
    optionsByStat: {
      'finalizacao-gol': options([['1.0+', '1.42x'], ['2.0+', '1.88x'], ['3.0+', '3.25x']]),
      'finalizacao-total': options([['2.0+', '1.45x'], ['3.0+', '1.82x'], ['4.0+', '2.55x']]),
      gols: options([['1.0+', '2.35x'], ['2.0+', '7.50x'], ['3.0+', '26.00x']]),
      assistencias: options([['0.5+', '4.20x'], ['1.0+', '6.80x'], ['2.0+', '18.00x']]),
    },
  },
  {
    id: 'pp-arrascaeta',
    matchLabel: 'FLA X CRU',
    highlightedTeam: 'FLA',
    matchTime: '2T 22:12',
    playerName: 'Arrascaeta',
    playerImage: avatarFutebol,
    optionsByStat: {
      'finalizacao-gol': options([['0.5+', '1.55x'], ['1.5+', '2.05x'], ['2.5+', '3.80x']]),
      'finalizacao-total': options([['1.5+', '1.48x'], ['2.5+', '1.92x'], ['3.5+', '2.85x']]),
      gols: options([['1.0+', '3.10x'], ['2.0+', '11.00x'], ['3.0+', '41.00x']]),
      assistencias: options([['0.5+', '2.60x'], ['1.0+', '4.90x'], ['2.0+', '13.00x']]),
    },
  },
  {
    id: 'pp-depay',
    matchLabel: 'VAS X COR',
    highlightedTeam: 'COR',
    matchTime: '1T 18:34',
    playerName: 'Memphis Depay',
    playerImage: avatarFutebol,
    optionsByStat: {
      'finalizacao-gol': options([['1.0+', '1.62x'], ['2.0+', '2.18x'], ['3.0+', '4.10x']]),
      'finalizacao-total': options([['2.0+', '1.52x'], ['3.0+', '1.94x'], ['4.0+', '2.70x']]),
      gols: options([['1.0+', '2.55x'], ['2.0+', '8.75x'], ['3.0+', '31.00x']]),
      assistencias: options([['0.5+', '3.40x'], ['1.0+', '5.80x'], ['2.0+', '16.00x']]),
    },
  },
  {
    id: 'pp-pedro',
    matchLabel: 'FLA X CRU',
    highlightedTeam: 'FLA',
    matchTime: '2T 22:12',
    playerName: 'Pedro',
    playerImage: avatarFutebol,
    optionsByStat: {
      'finalizacao-gol': options([['1.0+', '1.45x'], ['2.0+', '1.95x'], ['3.0+', '3.55x']]),
      'finalizacao-total': options([['2.0+', '1.38x'], ['3.0+', '1.74x'], ['4.0+', '2.42x']]),
      gols: options([['1.0+', '2.05x'], ['2.0+', '6.80x'], ['3.0+', '23.00x']]),
      assistencias: options([['0.5+', '5.10x'], ['1.0+', '8.25x'], ['2.0+', '21.00x']]),
    },
  },
  {
    id: 'pp-yuri',
    matchLabel: 'VAS X COR',
    highlightedTeam: 'COR',
    matchTime: '1T 18:34',
    playerName: 'Yuri Alberto',
    playerImage: avatarFutebol,
    optionsByStat: {
      'finalizacao-gol': options([['1.0+', '1.58x'], ['2.0+', '2.12x'], ['3.0+', '3.95x']]),
      'finalizacao-total': options([['2.0+', '1.50x'], ['3.0+', '1.88x'], ['4.0+', '2.62x']]),
      gols: options([['1.0+', '2.45x'], ['2.0+', '8.20x'], ['3.0+', '29.00x']]),
      assistencias: options([['0.5+', '4.60x'], ['1.0+', '7.40x'], ['2.0+', '19.00x']]),
    },
  },
]

const baseLongTermTabs = [
  { id: 'torneio', label: 'Torneio' },
  { id: 'jogadores', label: 'Jogadores' },
]

const brasileiroLongTermOddsByTab: Record<string, LongTermOdd[]> = {
  torneio: [
    { id: 'br-lt-t-1', label: 'Palmeiras', market: 'Campeão', odd: '4.50x', icon: escudoPalmeiras },
    { id: 'br-lt-t-2', label: 'Flamengo', market: 'Top 4', odd: '1.85x', icon: escudoFlamengo },
    { id: 'br-lt-t-3', label: 'Fluminense', market: 'Campeão', odd: '8.25x', icon: escudoFluminense },
    { id: 'br-lt-t-4', label: 'Cruzeiro', market: 'Top 6', odd: '2.35x', icon: escudoCruzeiro },
    { id: 'br-lt-t-5', label: 'Santos', market: 'Rebaixamento', odd: '3.10x', icon: escudoSantos },
    { id: 'br-lt-t-6', label: 'Corinthians', market: 'Top 4', odd: '3.80x', icon: iconFutebol },
  ],
  jogadores: [
    { id: 'br-lt-j-1', label: 'Flaco Lopez', market: 'Artilheiro', odd: '6.00x', icon: flacoLopezProps },
    { id: 'br-lt-j-2', label: 'Arrascaeta', market: 'Mais assistências', odd: '5.50x', icon: arrascaetaProps },
    { id: 'br-lt-j-3', label: 'Pedro', market: 'Artilheiro', odd: '6.80x', icon: pedroProps },
    { id: 'br-lt-j-4', label: 'Yuri Alberto', market: 'Artilheiro', odd: '8.20x', icon: yuriProps },
    { id: 'br-lt-j-5', label: 'Memphis Depay', market: 'Melhor jogador', odd: '7.20x', icon: depayProps },
  ],
}

const nbaLongTermOddsByTab: Record<string, LongTermOdd[]> = {
  torneio: [
    { id: 'nba-lt-t-1', label: 'Thunder', market: 'Campeão', odd: '3.40x', icon: escudoThunder },
    { id: 'nba-lt-t-2', label: 'Lakers', market: 'Campeão', odd: '6.50x', icon: escudoLakers },
    { id: 'nba-lt-t-3', label: 'Warriors', market: 'Final de conferência', odd: '4.80x', icon: escudoWarriors },
    { id: 'nba-lt-t-4', label: 'Cavaliers', market: 'Campeão do Leste', odd: '5.20x', icon: escudoCavaliers },
    { id: 'nba-lt-t-5', label: 'Bulls', market: 'Playoffs', odd: '2.75x', icon: escudoBulls },
  ],
  jogadores: [
    { id: 'nba-lt-j-1', label: 'LeBron James', market: 'MVP das finais', odd: '9.00x', icon: playerLeBronJames },
    { id: 'nba-lt-j-2', label: 'Stephen Curry', market: 'Mais bolas de 3', odd: '3.20x', icon: playerStephenCurry },
    { id: 'nba-lt-j-3', label: 'Luka Doncic', market: 'Mais pontos', odd: '4.75x', icon: playerLukaDoncic },
    { id: 'nba-lt-j-4', label: 'Jimmy Butler', market: 'MVP das finais', odd: '14.00x', icon: playerJimmyButler },
  ],
}

const defaultData: CompetitionData = {
  matches: baseMatches,
  playerStatChips: basePlayerStats,
  playerProps: basePlayerProps,
  longTermTabs: baseLongTermTabs,
  longTermOddsByTab: brasileiroLongTermOddsByTab,
}

const nbaCompetitionIds = new Set(['bsq-nba', 'bsq-nba-2', 'nba'])

export function getCompetitionData(
  sport: string | null | undefined,
  competitionId: string
): CompetitionData {
  if (sport === 'basquete' || nbaCompetitionIds.has(competitionId)) {
    return {
      ...defaultData,
      playerStatChips: basketballPlayerStats,
      longTermOddsByTab: nbaLongTermOddsByTab,
    }
  }

  return defaultData
}
