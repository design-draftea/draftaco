import { useCallback, useState, useEffect, useLayoutEffect, useRef, type PointerEvent, type ReactNode, type WheelEvent } from 'react'
import { CaretRightIcon, CaretUpIcon } from '@phosphor-icons/react'
import './PreMatchSection.css'
import { getTeamLogo } from '../../data/teamLogos'
import { useHomeMarketStickyState } from '../../shared/hooks/useHomeMarketStickyVisible'
import { createBetslipSelection, getBetslipEventId, getMatchOddBetslipKey, getPlayerPropBetslipKey } from '../../shared/hooks/betslipUtils'
import { useOddSelection } from '../../shared/hooks/useOddSelection'
import { useSportsDbTeamLogo } from '../../shared/hooks/useSportsDbTeamLogo'
import { useSlidingActiveIndicator } from '../../shared/hooks/useSlidingActiveIndicator'
import { getLocalPlayerImage } from '../../data/playerImages'
import {
  getCompetitionLinkTarget,
  type CompetitionLinkTarget,
} from '../../shared/utils/competitionNavigation'
import type { LiveEventMatch, LiveEventOpenPayload } from '../../features/sports/LiveEventPage'

import iconBasquete from '../../assets/iconSports/basketball.png'
import iconEsoccer from '../../assets/iconSports/e-soccer.png'
import iconFutebol from '../../assets/iconSports/soccer.png'
import iconTenis from '../../assets/iconSports/tennis.png'
import iconVolei from '../../assets/iconSports/volleyball.png'
import flagAlemanha from '../../assets/iconPaises/alemanha.png'
import flagArgentina from '../../assets/iconPaises/argentina.png'
import flagBrasil from '../../assets/iconPaises/brasil.png'
import flagEspanha from '../../assets/iconPaises/espanha.png'
import flagEstadosUnidos from '../../assets/iconPaises/estados-unidos.png'
import flagInglaterra from '../../assets/iconPaises/inglaterra.png'
import flagMundo from '../../assets/iconPaises/mundo.png'
// NBA Teams
import escudoBulls from '../../assets/escudoBullsGde.png'
import escudoPistons from '../../assets/escudoPistonsGde.png'
import escudoWarriors from '../../assets/escudoWarriors.png'
import escudoLakers from '../../assets/escudoLakers.png'
import escudoCavaliers from '../../assets/escudoCavaliers.png'
import escudoMiami from '../../assets/escudoMiami.png'
// NCAAB Teams
import escudoLafayette from '../../assets/escudoLafayette.png'
import escudoPennsylvania from '../../assets/escudoPennsylvania.png'
import escudoSouthCarolina from '../../assets/escudoSouthCarolina.png'
import escudoSouthern from '../../assets/escudoSouthern.png'
import escudoTexas from '../../assets/escudoTexas.png'
import escudoCaxias from '../../assets/escudoCaxias.png'
// Escudos Brasil
import escudoBotafogo from '../../assets/escudoBotafogo.png'
import escudoBahia from '../../assets/escudoBahia.png'
import escudoPalmeiras from '../../assets/escudoPalmeiras.png'
import escudoFluminense from '../../assets/escudoFluminense.png'
import escudoAtlMineiro from '../../assets/escudoAtlMineiro.png'
import escudoSantos from '../../assets/escudoSantos.png'
// Escudos Internacionais
import escudoReal from '../../assets/escudoReal.png'
import escudoBarca from '../../assets/escudoBarca.png'
import escudoArsenal from '../../assets/escudoArsenal.png'
import escudoChelsea from '../../assets/escudoChelsea.png'
import escudoBayerMunique from '../../assets/escudoBayerMunique.png'
import escudoBayerLeverkusen from '../../assets/escudoBayerLeverkusen.png'
import escudoLiverpool from '../../assets/escudoLiverpool.png'
import escudoManchesterCity from '../../assets/escudomanchesterCity.png'
import escudoBenfica from '../../assets/escudoBenfica.png'
import escudoAjax from '../../assets/escudoAjax.png'
import escudoBrighton from '../../assets/escudoBrighton.png'
import escudoWestHam from '../../assets/escudoWestHam.png'
import escudoLeeds from '../../assets/escudoLeeds.png'
import escudoBurnley from '../../assets/escudoBurnley.png'
import escudoGetafe from '../../assets/escudoGetafe.png'
import escudoElche from '../../assets/escudoElche.png'
import escudoAlaves from '../../assets/escudoAlaves.png'
import escudoEspanyol from '../../assets/escudoEspanyol.png'
import escudoMallorca from '../../assets/escudoMallorca.png'
import escudoLevante from '../../assets/escudoLevante.png'
import escudoWolfsburg from '../../assets/escudoWolfsburg.png'
import escudoEintracht from '../../assets/escudoEintracht.png'
import escudoAugsburg from '../../assets/escudoAugsburg.png'
import escudoHamburger from '../../assets/escudoHamburger.png'
import pagamentoAntecipado from '../../assets/pagamentoAntecipado.png'
import playerAvatarFutebol from '../../assets/playerAvatarFutebol.svg'
import playerAvatarBasquete from '../../assets/playerAvatarBasquete.svg'
import arrascaetaProps from '../../assets/arrascaetaProps.png'
import depayProps from '../../assets/depayProps.png'
import flacoLopezProps from '../../assets/flacoLopezProps.png'
import pedroProps from '../../assets/pedroProps.png'
import yuriProps from '../../assets/yuriProps.png'
import playerJimmyButler from '../../assets/playerJimmyButler.png'
import playerLeBronJames from '../../assets/playerLeBronJames.png'
import playerLukaDoncic from '../../assets/playerLukaDoncic.png'
import playerLewa from '../../assets/playerLewa.png'
import playerRaphinha from '../../assets/playerRaphinha.png'
import playerStephenCurry from '../../assets/playerStephenCurry.png'
import playerYamal from '../../assets/playerYamal.png'
// Bottom Sheet
import { ReiAntecipaBottomSheet } from '../BottomSheet/ReiAntecipaBottomSheet'

interface SportChip {
  id: string
  icon: string
  label: string
  disabled?: boolean
}

interface MarketChip {
  id: string
  label: string
}

export interface PlayerPropOption {
  label: string
  odd: string
  active?: boolean
}

export interface TeamPlayerProfile {
  name: string
  position: string
}

export interface MatchPlayerProp {
  id: string
  eventId?: string
  marketId?: string
  marketLabel?: string
  eventStatus?: 'prematch' | 'live'
  leagueId?: string
  leagueName?: string
  homeTeam?: string
  awayTeam?: string
  eventTimeLabel?: string
  liveClock?: string
  homeScore?: string | number
  awayScore?: string | number
  playerName: string
  teamName: string
  teamIcon?: string
  teamSide: 'home' | 'away'
  sport: string
  position: string
  image: string
  options: PlayerPropOption[]
}

export interface PlayerPropsMatch {
  id: string
  homeTeam: { name: string; icon?: string }
  awayTeam: { name: string; icon?: string }
}

interface Team {
  name: string
  icon: string
}

interface Match {
  id: string
  dateTime: string
  homeTeam: Team
  awayTeam: Team
  odds: {
    home: string
    draw?: string
    away: string
  }
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
  // Basketball specific
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
  extraBets?: number // Número de apostas extras (+2, +20, etc)
}

interface League {
  id: string
  name: string
  flag: string
  isOpen: boolean
  matches: Match[]
  sport: string
}

interface PreMatchSectionProps {
  disableInteractions?: boolean
  onOpenCompetition?: (target: CompetitionLinkTarget) => void
  onMatchClick?: (payload: LiveEventOpenPayload) => void
}

interface MarketScrollAnchor {
  matchKey: string
  top: number
}

const sportChips: SportChip[] = [
  { id: 'futebol', icon: iconFutebol, label: 'Futebol' },
  { id: 'basquete', icon: iconBasquete, label: 'Basquete' },
  { id: 'tenis', icon: iconTenis, label: 'Tênis', disabled: true },
  { id: 'volei', icon: iconVolei, label: 'Vôlei', disabled: true },
  { id: 'esoccer', icon: iconEsoccer, label: 'Esoccer', disabled: true },
]

interface PreMatchTeamIconProps {
  teamName: string
  currentIcon: string | undefined
  sport: string
}

function PreMatchTeamIcon({ teamName, currentIcon, sport }: PreMatchTeamIconProps) {
  const resolvedIcon = useSportsDbTeamLogo(teamName, currentIcon, sport, undefined, {
    useCurrentLogoFallback: true,
  })

  if (!resolvedIcon) return <div className="prematch-section__team-icon--placeholder" />

  return <img src={resolvedIcon} alt="" className="prematch-section__team-icon" />
}

const footballMarketChips: MarketChip[] = [
  { id: 'resultado-final', label: 'Resultado Final' },
  { id: 'finalizacao-gol', label: 'Finalização ao Gol' },
  { id: 'dupla-chance', label: 'Dupla Chance' },
  { id: 'assistencias', label: 'Assistências' },
  { id: 'ambos-marcam', label: 'Ambos Marcam' },
  { id: 'total-gols', label: 'Total de Gols' },
  { id: 'escanteios', label: 'Total de Escanteios' },
]

const basketballMarketChips: MarketChip[] = [
  { id: 'vencedor', label: 'Resultado Final' },
  { id: 'pontos-jogador', label: 'Pontos do Jogador' },
  { id: 'total-pontos', label: 'Total de Pontos' },
  { id: 'assistencias', label: 'Assistências' },
  { id: 'handicap', label: 'Handicap' },
  { id: 'q3-total', label: '3° Quarto - Total de Pontos' },
  { id: 'q4-total', label: '4° Quarto - Total de Pontos' },
]

const PLAYER_PROPS_PER_MATCH = 3
const FOOTBALL_PLAYER_PROPS_MARKET_ID = 'finalizacao-gol'
const FOOTBALL_ASSISTS_MARKET_ID = 'assistencias'
const BASKETBALL_PLAYER_PROPS_MARKET_ID = 'pontos-jogador'
const BASKETBALL_ASSISTS_MARKET_ID = 'assistencias'
const PLAYER_PROP_OPTION_MOUSE_SENSITIVITY = 1
const PLAYER_PROP_OPTION_TOUCH_SENSITIVITY = 0.92
const PLAYER_PROP_OPTION_VERTICAL_INTENT_THRESHOLD = 28
const PLAYER_PROP_OPTION_HORIZONTAL_INTENT_THRESHOLD = 28
const PLAYER_PROP_OPTION_CLICK_SUPPRESS_THRESHOLD = 28
const PLAYER_PROP_OPTION_TAP_REPLAY_THRESHOLD = 28
const PLAYER_PROP_OPTION_AXIS_RATIO = 1.15
const PLAYER_PROP_OPTION_SWIPE_THRESHOLD = 12
const PLAYER_PROP_OPTION_PROGRAMMATIC_MS = 220
const PLAYER_PROP_OPTION_NATIVE_CLICK_SUPPRESS_MS = 450

const playerPropOptions = (values: Array<[string, string]>): PlayerPropOption[] =>
  values.map(([label, odd], index) => ({ label, odd, active: index === 1 }))

const footballPlayerPropOptionSets = [
  playerPropOptions([['3.0+', '1.78x'], ['4.0+', '1.78x'], ['5.0+', '1.78x']]),
  playerPropOptions([['2.0+', '1.55x'], ['3.0+', '1.92x'], ['4.0+', '2.70x']]),
  playerPropOptions([['1.0+', '1.48x'], ['2.0+', '2.05x'], ['3.0+', '3.60x']]),
]

const footballAssistPropOptionSets = [
  playerPropOptions([['1.0+', '1.68x'], ['2.0+', '2.35x'], ['3.0+', '4.20x']]),
  playerPropOptions([['1.0+', '1.74x'], ['2.0+', '2.50x'], ['3.0+', '4.60x']]),
  playerPropOptions([['1.0+', '1.82x'], ['2.0+', '2.70x'], ['3.0+', '5.10x']]),
]

const basketballPlayerPropOptionSets = [
  playerPropOptions([['15.5+', '1.62x'], ['20.5+', '1.95x'], ['25.5+', '3.05x']]),
  playerPropOptions([['12.5+', '1.58x'], ['17.5+', '1.88x'], ['22.5+', '2.80x']]),
  playerPropOptions([['8.5+', '1.54x'], ['13.5+', '1.82x'], ['18.5+', '2.60x']]),
]

const basketballAssistPropOptionSets = [
  playerPropOptions([['1.0+', '1.70x'], ['2.0+', '2.15x'], ['3.0+', '3.40x']]),
  playerPropOptions([['1.0+', '1.62x'], ['2.0+', '1.95x'], ['3.0+', '2.90x']]),
  playerPropOptions([['1.0+', '1.54x'], ['2.0+', '1.82x'], ['3.0+', '2.55x']]),
]

const footballPlayersByTeam: Record<string, TeamPlayerProfile[]> = {
  Palmeiras: [
    { name: 'Flaco Lopez', position: 'ATA' },
    { name: 'Vitor Roque', position: 'ATA' },
    { name: 'Raphael Veiga', position: 'MEI' },
  ],
  Fluminense: [
    { name: 'Cano', position: 'ATA' },
    { name: 'Arias', position: 'MEI' },
    { name: 'Keno', position: 'ATA' },
  ],
  Botafogo: [
    { name: 'Igor Jesus', position: 'ATA' },
    { name: 'Savarino', position: 'MEI' },
    { name: 'Tiquinho Soares', position: 'ATA' },
  ],
  Bahia: [
    { name: 'Everaldo', position: 'ATA' },
    { name: 'Cauly', position: 'MEI' },
    { name: 'Biel', position: 'ATA' },
  ],
  'Atl. Mineiro': [
    { name: 'Hulk', position: 'ATA' },
    { name: 'Paulinho', position: 'ATA' },
    { name: 'Gustavo Scarpa', position: 'MEI' },
  ],
  Santos: [
    { name: 'Neymar Jr', position: 'ATA' },
    { name: 'Guilherme', position: 'ATA' },
    { name: 'Soteldo', position: 'MEI' },
  ],
  'Real Madrid': [
    { name: 'Vini Jr', position: 'ATA' },
    { name: 'Mbappé', position: 'ATA' },
    { name: 'Bellingham', position: 'MEI' },
  ],
  Barcelona: [
    { name: 'Lewandowski', position: 'ATA' },
    { name: 'Yamal', position: 'ATA' },
    { name: 'Raphinha', position: 'ATA' },
  ],
  Liverpool: [
    { name: 'Salah', position: 'ATA' },
    { name: 'Núñez', position: 'ATA' },
    { name: 'Diaz', position: 'ATA' },
  ],
  'Man. City': [
    { name: 'Haaland', position: 'ATA' },
    { name: 'Foden', position: 'MEI' },
    { name: 'De Bruyne', position: 'MEI' },
  ],
  Benfica: [
    { name: 'Di María', position: 'ATA' },
    { name: 'Pavlidis', position: 'ATA' },
    { name: 'Schjelderup', position: 'ATA' },
  ],
  Ajax: [
    { name: 'Brobbey', position: 'ATA' },
    { name: 'Berghuis', position: 'MEI' },
    { name: 'Henderson', position: 'MEI' },
  ],
  Arsenal: [
    { name: 'Saka', position: 'ATA' },
    { name: 'Havertz', position: 'MEI' },
    { name: 'Martinelli', position: 'ATA' },
  ],
  Chelsea: [
    { name: 'Palmer', position: 'MEI' },
    { name: 'Jackson', position: 'ATA' },
    { name: 'Nkunku', position: 'ATA' },
  ],
  Tottenham: [
    { name: 'Son', position: 'ATA' },
    { name: 'Solanke', position: 'ATA' },
    { name: 'Maddison', position: 'MEI' },
    { name: 'Kulusevski', position: 'MEI' },
  ],
  Wolves: [
    { name: 'Cunha', position: 'ATA' },
    { name: 'Hwang', position: 'ATA' },
    { name: 'Neto', position: 'ATA' },
    { name: 'Larsen', position: 'ATA' },
  ],
  Brighton: [
    { name: 'Welbeck', position: 'ATA' },
    { name: 'João Pedro', position: 'ATA' },
    { name: 'Mitoma', position: 'ATA' },
  ],
  'West Ham': [
    { name: 'Bowen', position: 'ATA' },
    { name: 'Paquetá', position: 'MEI' },
    { name: 'Kudus', position: 'ATA' },
  ],
  Leeds: [
    { name: 'Piroe', position: 'ATA' },
    { name: 'Rutter', position: 'ATA' },
    { name: 'James', position: 'ATA' },
  ],
  Burnley: [
    { name: 'Foster', position: 'ATA' },
    { name: 'Rodríguez', position: 'ATA' },
    { name: 'Brownhill', position: 'MEI' },
  ],
  Getafe: [
    { name: 'Mayoral', position: 'ATA' },
    { name: 'Greenwood', position: 'ATA' },
    { name: 'Latasa', position: 'ATA' },
  ],
  Elche: [
    { name: 'Boyé', position: 'ATA' },
    { name: 'Pere Milla', position: 'ATA' },
    { name: 'Mojica', position: 'LAT' },
  ],
  Alavés: [
    { name: 'Samu Omorodion', position: 'ATA' },
    { name: 'Carlos Vicente', position: 'ATA' },
    { name: 'Rioja', position: 'ATA' },
  ],
  Espanyol: [
    { name: 'Puado', position: 'ATA' },
    { name: 'Joselu', position: 'ATA' },
    { name: 'Bare', position: 'MEI' },
  ],
  Mallorca: [
    { name: 'Muriqi', position: 'ATA' },
    { name: 'Larin', position: 'ATA' },
    { name: 'Darder', position: 'MEI' },
  ],
  Levante: [
    { name: 'Bouldini', position: 'ATA' },
    { name: 'Brugué', position: 'ATA' },
    { name: 'Iborra', position: 'MEI' },
  ],
  'B. Leverkusen': [
    { name: 'Wirtz', position: 'MEI' },
    { name: 'Boniface', position: 'ATA' },
    { name: 'Grimaldo', position: 'LAT' },
  ],
  Bayern: [
    { name: 'Harry Kane', position: 'ATA' },
    { name: 'Musiala', position: 'MEI' },
    { name: 'Sané', position: 'ATA' },
  ],
  Wolfsburg: [
    { name: 'Wind', position: 'ATA' },
    { name: 'Wimmer', position: 'ATA' },
    { name: 'Majer', position: 'MEI' },
  ],
  Eintracht: [
    { name: 'Ekitiké', position: 'ATA' },
    { name: 'Marmoush', position: 'ATA' },
    { name: 'Knauff', position: 'ALA' },
  ],
  Augsburg: [
    { name: 'Demirović', position: 'ATA' },
    { name: 'Tietz', position: 'ATA' },
    { name: 'Vargas', position: 'ATA' },
  ],
  Hamburger: [
    { name: 'Glatzel', position: 'ATA' },
    { name: 'Selke', position: 'ATA' },
    { name: 'Königsdörffer', position: 'ATA' },
  ],
  'São Paulo': [
    { name: 'Calleri', position: 'ATA' },
    { name: 'Luciano', position: 'ATA' },
    { name: 'Lucas Moura', position: 'MEI' },
  ],
}

const footballAssistPlayersByTeam: Record<string, TeamPlayerProfile[]> = {
  Palmeiras: [
    { name: 'Raphael Veiga', position: 'MEI' },
    { name: 'Mauricio', position: 'MEI' },
    { name: 'Richard Rios', position: 'MEI' },
  ],
  Fluminense: [
    { name: 'Arias', position: 'MEI' },
    { name: 'Ganso', position: 'MEI' },
    { name: 'Lima', position: 'MEI' },
  ],
  Botafogo: [
    { name: 'Savarino', position: 'MEI' },
    { name: 'Almada', position: 'MEI' },
    { name: 'Marlon Freitas', position: 'MEI' },
  ],
  Bahia: [
    { name: 'Cauly', position: 'MEI' },
    { name: 'Everton Ribeiro', position: 'MEI' },
    { name: 'Jean Lucas', position: 'MEI' },
  ],
  'Atl. Mineiro': [
    { name: 'Gustavo Scarpa', position: 'MEI' },
    { name: 'Zaracho', position: 'MEI' },
    { name: 'Bernard', position: 'MEI' },
  ],
  Santos: [
    { name: 'Lucas Lima', position: 'MEI' },
    { name: 'Soteldo', position: 'MEI' },
    { name: 'Pituca', position: 'MEI' },
  ],
  'Real Madrid': [
    { name: 'Bellingham', position: 'MEI' },
    { name: 'Modric', position: 'MEI' },
    { name: 'Valverde', position: 'MEI' },
  ],
  Barcelona: [
    { name: 'Pedri', position: 'MEI' },
    { name: 'Gavi', position: 'MEI' },
    { name: 'De Jong', position: 'MEI' },
  ],
  Liverpool: [
    { name: 'Szoboszlai', position: 'MEI' },
    { name: 'Mac Allister', position: 'MEI' },
    { name: 'Curtis Jones', position: 'MEI' },
  ],
  'Man. City': [
    { name: 'De Bruyne', position: 'MEI' },
    { name: 'Foden', position: 'MEI' },
    { name: 'Bernardo Silva', position: 'MEI' },
  ],
  Benfica: [
    { name: 'Kokcu', position: 'MEI' },
    { name: 'Aursnes', position: 'MEI' },
    { name: 'Florentino', position: 'MEI' },
  ],
  Ajax: [
    { name: 'Berghuis', position: 'MEI' },
    { name: 'Henderson', position: 'MEI' },
    { name: 'Taylor', position: 'MEI' },
  ],
  Arsenal: [
    { name: 'Odegaard', position: 'MEI' },
    { name: 'Rice', position: 'MEI' },
    { name: 'Havertz', position: 'MEI' },
  ],
  Chelsea: [
    { name: 'Palmer', position: 'MEI' },
    { name: 'Enzo Fernandez', position: 'MEI' },
    { name: 'Caicedo', position: 'MEI' },
  ],
  Brighton: [
    { name: 'Joao Pedro', position: 'MEI' },
    { name: 'Mitoma', position: 'MEI' },
    { name: 'Gross', position: 'MEI' },
  ],
  'West Ham': [
    { name: 'Paqueta', position: 'MEI' },
    { name: 'Kudus', position: 'MEI' },
    { name: 'Ward-Prowse', position: 'MEI' },
  ],
  Leeds: [
    { name: 'Rutter', position: 'MEI' },
    { name: 'Gnonto', position: 'MEI' },
    { name: 'Ampadu', position: 'MEI' },
  ],
  Burnley: [
    { name: 'Brownhill', position: 'MEI' },
    { name: 'Gudmundsson', position: 'MEI' },
    { name: 'Koleosho', position: 'MEI' },
  ],
  Getafe: [
    { name: 'Maksimovic', position: 'MEI' },
    { name: 'Aleña', position: 'MEI' },
    { name: 'Milla', position: 'MEI' },
  ],
  Elche: [
    { name: 'Fidel', position: 'MEI' },
    { name: 'Febas', position: 'MEI' },
    { name: 'Josan', position: 'MEI' },
  ],
  Alavés: [
    { name: 'Guridi', position: 'MEI' },
    { name: 'Blanco', position: 'MEI' },
    { name: 'Carlos Vicente', position: 'MEI' },
  ],
  Espanyol: [
    { name: 'Darder', position: 'MEI' },
    { name: 'Bare', position: 'MEI' },
    { name: 'Melamed', position: 'MEI' },
  ],
  Mallorca: [
    { name: 'Darder', position: 'MEI' },
    { name: 'Dani Rodriguez', position: 'MEI' },
    { name: 'Antonio Sanchez', position: 'MEI' },
  ],
  Levante: [
    { name: 'Iborra', position: 'MEI' },
    { name: 'Pablo Martinez', position: 'MEI' },
    { name: 'Brugue', position: 'MEI' },
  ],
  'B. Leverkusen': [
    { name: 'Wirtz', position: 'MEI' },
    { name: 'Xhaka', position: 'MEI' },
    { name: 'Palacios', position: 'MEI' },
  ],
  Bayern: [
    { name: 'Musiala', position: 'MEI' },
    { name: 'Kimmich', position: 'MEI' },
    { name: 'Muller', position: 'MEI' },
  ],
  Wolfsburg: [
    { name: 'Majer', position: 'MEI' },
    { name: 'Arnold', position: 'MEI' },
    { name: 'Wimmer', position: 'MEI' },
  ],
  Eintracht: [
    { name: 'Gotze', position: 'MEI' },
    { name: 'Skhiri', position: 'MEI' },
    { name: 'Knauff', position: 'MEI' },
  ],
  Augsburg: [
    { name: 'Vargas', position: 'MEI' },
    { name: 'Rexhbecaj', position: 'MEI' },
    { name: 'Maier', position: 'MEI' },
  ],
  Hamburger: [
    { name: 'Kittel', position: 'MEI' },
    { name: 'Reis', position: 'MEI' },
    { name: 'Königsdörffer', position: 'MEI' },
  ],
  'São Paulo': [
    { name: 'Lucas Moura', position: 'MEI' },
    { name: 'Luciano', position: 'MEI' },
    { name: 'Alisson', position: 'MEI' },
  ],
  Flamengo: [
    { name: 'Arrascaeta', position: 'MEI' },
    { name: 'Gerson', position: 'MEI' },
    { name: 'De la Cruz', position: 'MEI' },
  ],
  Cruzeiro: [
    { name: 'Matheus Pereira', position: 'MEI' },
    { name: 'Lucas Silva', position: 'MEI' },
    { name: 'Ramiro', position: 'MEI' },
  ],
  Internacional: [
    { name: 'Alan Patrick', position: 'MEI' },
    { name: 'Bruno Henrique', position: 'MEI' },
    { name: 'Wanderson', position: 'MEI' },
  ],
  Bragantino: [
    { name: 'Lincoln', position: 'MEI' },
    { name: 'Jadsom', position: 'MEI' },
    { name: 'Eric Ramires', position: 'MEI' },
  ],
  Mirassol: [
    { name: 'Chico Kim', position: 'MEI' },
    { name: 'Gabriel', position: 'MEI' },
    { name: 'Danielzinho', position: 'MEI' },
  ],
  'Atlético Madrid': [
    { name: 'Griezmann', position: 'MEI' },
    { name: 'De Paul', position: 'MEI' },
    { name: 'Koke', position: 'MEI' },
  ],
  Inter: [
    { name: 'Barella', position: 'MEI' },
    { name: 'Calhanoglu', position: 'MEI' },
    { name: 'Mkhitaryan', position: 'MEI' },
  ],
  PSG: [
    { name: 'Vitinha', position: 'MEI' },
    { name: 'Zaïre-Emery', position: 'MEI' },
    { name: 'Fabian Ruiz', position: 'MEI' },
  ],
  Lyon: [
    { name: 'Cherki', position: 'MEI' },
    { name: 'Tolisso', position: 'MEI' },
    { name: 'Caqueret', position: 'MEI' },
  ],
  Newcastle: [
    { name: 'Bruno Guimaraes', position: 'MEI' },
    { name: 'Tonali', position: 'MEI' },
    { name: 'Joelinton', position: 'MEI' },
  ],
  Napoli: [
    { name: 'Anguissa', position: 'MEI' },
    { name: 'Lobotka', position: 'MEI' },
    { name: 'Zielinski', position: 'MEI' },
  ],
  'Boca Juniors': [
    { name: 'Zenon', position: 'MEI' },
    { name: 'Pol Fernandez', position: 'MEI' },
    { name: 'Medina', position: 'MEI' },
  ],
  'Argentinos Jrs': [
    { name: 'Alan Lescano', position: 'MEI' },
    { name: 'Francis Mac Allister', position: 'MEI' },
    { name: 'Heredia', position: 'MEI' },
  ],
  Racing: [
    { name: 'Juanfer Quintero', position: 'MEI' },
    { name: 'Almendra', position: 'MEI' },
    { name: 'Nardoni', position: 'MEI' },
  ],
  'River Plate': [
    { name: 'Nacho Fernandez', position: 'MEI' },
    { name: 'Echeverri', position: 'MEI' },
    { name: 'Aliendro', position: 'MEI' },
  ],
  'San Lorenzo': [
    { name: 'Barrios', position: 'MEI' },
    { name: 'Leguizamon', position: 'MEI' },
    { name: 'Remedi', position: 'MEI' },
  ],
  Córdoba: [
    { name: 'Lodico', position: 'MEI' },
    { name: 'Puebla', position: 'MEI' },
    { name: 'Acevedo', position: 'MEI' },
  ],
  'Inter Miami': [
    { name: 'Messi', position: 'MEI' },
    { name: 'Busquets', position: 'MEI' },
    { name: 'Gomez', position: 'MEI' },
  ],
  Whitecaps: [
    { name: 'Ryan Gauld', position: 'MEI' },
    { name: 'Vite', position: 'MEI' },
    { name: 'Cubas', position: 'MEI' },
  ],
  Cincinnati: [
    { name: 'Acosta', position: 'MEI' },
    { name: 'Nwobodo', position: 'MEI' },
    { name: 'Kubo', position: 'MEI' },
  ],
  'Chicago Fire': [
    { name: 'Shaqiri', position: 'MEI' },
    { name: 'Gimenez', position: 'MEI' },
    { name: 'Gutierrez', position: 'MEI' },
  ],
  Nashville: [
    { name: 'Mukhtar', position: 'MEI' },
    { name: 'Godoy', position: 'MEI' },
    { name: 'Davis', position: 'MEI' },
  ],
  'New York City': [
    { name: 'Moralez', position: 'MEI' },
    { name: 'Parks', position: 'MEI' },
    { name: 'Sands', position: 'MEI' },
  ],
  Dinamo: [
    { name: 'Baturina', position: 'MEI' },
    { name: 'Misic', position: 'MEI' },
    { name: 'Ademi', position: 'MEI' },
  ],
  'Aston Villa': [
    { name: 'McGinn', position: 'MEI' },
    { name: 'Tielemans', position: 'MEI' },
    { name: 'Douglas Luiz', position: 'MEI' },
  ],
  Fenerbahçe: [
    { name: 'Tadic', position: 'MEI' },
    { name: 'Szymanski', position: 'MEI' },
    { name: 'Fred', position: 'MEI' },
  ],
  Porto: [
    { name: 'Pepê', position: 'MEI' },
    { name: 'Nico Gonzalez', position: 'MEI' },
    { name: 'Alan Varela', position: 'MEI' },
  ],
  Panathinaikos: [
    { name: 'Bernard', position: 'MEI' },
    { name: 'Bakasetas', position: 'MEI' },
    { name: 'Zeca', position: 'MEI' },
  ],
  Nottingham: [
    { name: 'Gibbs-White', position: 'MEI' },
    { name: 'Danilo', position: 'MEI' },
    { name: 'Yates', position: 'MEI' },
  ],
}

const footballFinishingPlayersByTeam: Record<string, TeamPlayerProfile[]> = {
  ...footballPlayersByTeam,
  Flamengo: [
    { name: 'Pedro', position: 'ATA' },
    { name: 'Bruno Henrique', position: 'ATA' },
    { name: 'Everton Cebolinha', position: 'ATA' },
  ],
  Cruzeiro: [
    { name: 'Kaio Jorge', position: 'ATA' },
    { name: 'Gabigol', position: 'ATA' },
    { name: 'Lautaro Diaz', position: 'ATA' },
  ],
  Internacional: [
    { name: 'Rafael Borre', position: 'ATA' },
    { name: 'Enner Valencia', position: 'ATA' },
    { name: 'Wesley', position: 'ATA' },
  ],
  Bragantino: [
    { name: 'Eduardo Sasha', position: 'ATA' },
    { name: 'Helinho', position: 'ATA' },
    { name: 'Thiago Borbas', position: 'ATA' },
  ],
  Mirassol: [
    { name: 'Dellatorre', position: 'ATA' },
    { name: 'Negueba', position: 'ATA' },
    { name: 'Fernandinho', position: 'ATA' },
  ],
  'Atlético Madrid': [
    { name: 'Julian Alvarez', position: 'ATA' },
    { name: 'Sorloth', position: 'ATA' },
    { name: 'Griezmann', position: 'ATA' },
  ],
  Inter: [
    { name: 'Lautaro Martinez', position: 'ATA' },
    { name: 'Thuram', position: 'ATA' },
    { name: 'Taremi', position: 'ATA' },
  ],
  PSG: [
    { name: 'Dembélé', position: 'ATA' },
    { name: 'Kvaratskhelia', position: 'ATA' },
    { name: 'Gonçalo Ramos', position: 'ATA' },
  ],
  Lyon: [
    { name: 'Lacazette', position: 'ATA' },
    { name: 'Mikautadze', position: 'ATA' },
    { name: 'Nuamah', position: 'ATA' },
  ],
  Newcastle: [
    { name: 'Isak', position: 'ATA' },
    { name: 'Gordon', position: 'ATA' },
    { name: 'Barnes', position: 'ATA' },
  ],
  Napoli: [
    { name: 'Osimhen', position: 'ATA' },
    { name: 'Politano', position: 'ATA' },
    { name: 'Raspadori', position: 'ATA' },
  ],
  'Boca Juniors': [
    { name: 'Cavani', position: 'ATA' },
    { name: 'Merentiel', position: 'ATA' },
    { name: 'Zenon', position: 'ATA' },
  ],
  'Argentinos Jrs': [
    { name: 'Gondou', position: 'ATA' },
    { name: 'Veron', position: 'ATA' },
    { name: 'Heredia', position: 'ATA' },
  ],
  Racing: [
    { name: 'Maravilla Martinez', position: 'ATA' },
    { name: 'Carbonero', position: 'ATA' },
    { name: 'Solari', position: 'ATA' },
  ],
  'River Plate': [
    { name: 'Borja', position: 'ATA' },
    { name: 'Colidio', position: 'ATA' },
    { name: 'Solari', position: 'ATA' },
  ],
  'San Lorenzo': [
    { name: 'Bareiro', position: 'ATA' },
    { name: 'Leguizamon', position: 'ATA' },
    { name: 'Cerutti', position: 'ATA' },
  ],
  Córdoba: [
    { name: 'Suarez', position: 'ATA' },
    { name: 'Puebla', position: 'ATA' },
    { name: 'Acevedo', position: 'ATA' },
  ],
  'Inter Miami': [
    { name: 'Messi', position: 'ATA' },
    { name: 'Suarez', position: 'ATA' },
    { name: 'Campana', position: 'ATA' },
  ],
  Whitecaps: [
    { name: 'Brian White', position: 'ATA' },
    { name: 'Ryan Gauld', position: 'ATA' },
    { name: 'Ali Ahmed', position: 'ATA' },
  ],
  Cincinnati: [
    { name: 'Acosta', position: 'ATA' },
    { name: 'Kubo', position: 'ATA' },
    { name: 'Baird', position: 'ATA' },
  ],
  'Chicago Fire': [
    { name: 'Cuypers', position: 'ATA' },
    { name: 'Gutierrez', position: 'ATA' },
    { name: 'Mueller', position: 'ATA' },
  ],
  Nashville: [
    { name: 'Surridge', position: 'ATA' },
    { name: 'Mukhtar', position: 'ATA' },
    { name: 'Shaffelburg', position: 'ATA' },
  ],
  'New York City': [
    { name: 'Martinez', position: 'ATA' },
    { name: 'Rodriguez', position: 'ATA' },
    { name: 'Wolf', position: 'ATA' },
  ],
  Dinamo: [
    { name: 'Petkovic', position: 'ATA' },
    { name: 'Kulenovic', position: 'ATA' },
    { name: 'Hoxha', position: 'ATA' },
  ],
  'Aston Villa': [
    { name: 'Watkins', position: 'ATA' },
    { name: 'Bailey', position: 'ATA' },
    { name: 'Diaby', position: 'ATA' },
  ],
  Fenerbahçe: [
    { name: 'Dzeko', position: 'ATA' },
    { name: 'En-Nesyri', position: 'ATA' },
    { name: 'Tadic', position: 'ATA' },
  ],
  Porto: [
    { name: 'Evanilson', position: 'ATA' },
    { name: 'Galeno', position: 'ATA' },
    { name: 'Pepe', position: 'ATA' },
  ],
  Panathinaikos: [
    { name: 'Ioannidis', position: 'ATA' },
    { name: 'Sporar', position: 'ATA' },
    { name: 'Mancini', position: 'ATA' },
  ],
  Nottingham: [
    { name: 'Wood', position: 'ATA' },
    { name: 'Elanga', position: 'ATA' },
    { name: 'Gibbs-White', position: 'ATA' },
  ],
}

const basketballPlayersByTeam: Record<string, TeamPlayerProfile[]> = {
  Jazz: [
    { name: 'Lauri Markkanen', position: 'ALA' },
    { name: 'Keyonte George', position: 'ARM' },
    { name: 'Collin Sexton', position: 'ARM' },
  ],
  Thunder: [
    { name: 'Shai Gilgeous-Alexander', position: 'ARM' },
    { name: 'Jalen Williams', position: 'ALA' },
    { name: 'Chet Holmgren', position: 'PIV' },
  ],
  Knicks: [
    { name: 'Jalen Brunson', position: 'ARM' },
    { name: 'Karl-Anthony Towns', position: 'PIV' },
    { name: 'Mikal Bridges', position: 'ALA' },
  ],
  Magic: [
    { name: 'Paolo Banchero', position: 'ALA' },
    { name: 'Franz Wagner', position: 'ALA' },
    { name: 'Jalen Suggs', position: 'ARM' },
  ],
  Bulls: [
    { name: 'Coby White', position: 'ARM' },
    { name: 'Josh Giddey', position: 'ARM' },
    { name: 'Nikola Vucevic', position: 'PIV' },
  ],
  Heat: [
    { name: 'Tyler Herro', position: 'ARM' },
    { name: 'Bam Adebayo', position: 'PIV' },
    { name: 'Jaime Jaquez Jr.', position: 'ALA' },
  ],
  Warriors: [
    { name: 'Stephen Curry', position: 'ARM' },
    { name: 'Draymond Green', position: 'ALA' },
    { name: 'Jonathan Kuminga', position: 'ALA' },
  ],
  Lakers: [
    { name: 'LeBron James', position: 'ALA' },
    { name: 'Luka Doncic', position: 'ARM' },
    { name: 'Austin Reaves', position: 'ARM' },
  ],
  Pistons: [
    { name: 'Cade Cunningham', position: 'ARM' },
    { name: 'Jaden Ivey', position: 'ARM' },
    { name: 'Jalen Duren', position: 'PIV' },
  ],
  Cavaliers: [
    { name: 'Donovan Mitchell', position: 'ARM' },
    { name: 'Darius Garland', position: 'ARM' },
    { name: 'Evan Mobley', position: 'ALA' },
  ],
  Lafayette: [
    { name: 'Devin Hines', position: 'ARM' },
    { name: 'Kyle Jenkins', position: 'ALA' },
    { name: 'Ryan Pettit', position: 'PIV' },
  ],
  Pennsylvania: [
    { name: 'Clark Slajchert', position: 'ARM' },
    { name: 'Nick Spinoso', position: 'PIV' },
    { name: 'Sam Brown', position: 'ALA' },
  ],
  'South Carolina State': [
    { name: 'Mitchel Taylor', position: 'ARM' },
    { name: 'Davion Everett', position: 'PIV' },
    { name: 'Michael Teal', position: 'ALA' },
  ],
  'Charleston Southern': [
    { name: 'RJ Johnson', position: 'ARM' },
    { name: 'Taje Kelly', position: 'ALA' },
    { name: "A'lahn Sumler", position: 'ARM' },
  ],
  Southern: [
    { name: 'Brandon Davis', position: 'ARM' },
    { name: 'Michael Jacobs', position: 'ALA' },
    { name: 'Tyrone Lyons', position: 'ALA' },
  ],
  Texas: [
    { name: 'Max Abmas', position: 'ARM' },
    { name: 'Dylan Disu', position: 'ALA' },
    { name: 'Tyrese Hunter', position: 'ARM' },
  ],
  Besiktas: [
    { name: 'Derek Needham', position: 'ARM' },
    { name: 'Matt Mitchell', position: 'ALA' },
    { name: 'Jonah Mathews', position: 'ARM' },
  ],
  Lietkabelis: [
    { name: 'Gediminas Orelik', position: 'ALA' },
    { name: 'Vytenis Lipkevicius', position: 'ALA' },
    { name: 'Kristupas Zemaitis', position: 'ARM' },
  ],
  'Chemnitz 99': [
    { name: 'Aher Uguak', position: 'ALA' },
    { name: 'Kaza Kajami-Keane', position: 'ARM' },
    { name: 'Wes van Beck', position: 'ALA' },
  ],
  Panionios: [
    { name: 'Kendrick Ray', position: 'ARM' },
    { name: 'Giorgos Tsalmpouris', position: 'PIV' },
    { name: 'Nikos Gikas', position: 'ARM' },
  ],
  'Hapoel Jerusalem': [
    { name: 'Levi Randolph', position: 'ALA' },
    { name: 'Khadeen Carrington', position: 'ARM' },
    { name: 'Austin Wiley', position: 'PIV' },
  ],
  'Hamburg Towers': [
    { name: 'Brae Ivey', position: 'ARM' },
    { name: 'Jordan Barnett', position: 'ALA' },
    { name: 'Nico Brauner', position: 'ARM' },
  ],
  'Independiente Santiago del Estero': [
    { name: 'Juan Brussino', position: 'ARM' },
    { name: 'Andrés Lugli', position: 'ALA' },
    { name: 'Eduardo Vasirani', position: 'PIV' },
  ],
  'Sportivo Suardi': [
    { name: 'Santiago Calderón', position: 'ARM' },
    { name: 'Pablo Martínez', position: 'ALA' },
    { name: 'Horacio Rigada', position: 'PIV' },
  ],
  'Santa Paula de Galvez': [
    { name: 'Agustín Chiana', position: 'ARM' },
    { name: 'Alejandro Madera', position: 'ALA' },
    { name: 'Matías Galligani', position: 'PIV' },
  ],
  'San Isidro': [
    { name: 'Santiago Ludueña', position: 'ARM' },
    { name: 'Bruno Barovero', position: 'ARM' },
    { name: 'Federico Zezular', position: 'ALA' },
  ],
  Ciclista: [
    { name: 'Manuel Lambrisca', position: 'ARM' },
    { name: 'Alejo Crotti', position: 'ALA' },
    { name: 'Maximiliano Tamburini', position: 'ALA' },
  ],
  'Racing Avellaneda': [
    { name: 'Matías Núñez', position: 'ARM' },
    { name: 'Erbel De Pietro', position: 'ALA' },
    { name: 'Sebastián Chaine', position: 'PIV' },
  ],
  Botafogo: [
    { name: 'Coelho', position: 'ARM' },
    { name: 'Pastor', position: 'ALA' },
    { name: 'Machado', position: 'ALA' },
  ],
  'Caxias do Sul': [
    { name: 'Alexey', position: 'ARM' },
    { name: 'Enzo', position: 'ALA' },
    { name: 'Pedro', position: 'PIV' },
  ],
}

const isPlayerPropsMarket = (sport: string, marketId: string) =>
  sport === 'basquete'
    ? marketId === BASKETBALL_PLAYER_PROPS_MARKET_ID || marketId === BASKETBALL_ASSISTS_MARKET_ID
    : marketId === FOOTBALL_PLAYER_PROPS_MARKET_ID || marketId === FOOTBALL_ASSISTS_MARKET_ID

const getPlayerPropAvatar = (sport: string) =>
  sport === 'basquete' ? playerAvatarBasquete : playerAvatarFutebol

const normalizePlayerPropImageKey = (playerName: string) =>
  playerName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const playerPropImagesByName: Record<string, string> = {
  arrascaeta: arrascaetaProps,
  'giorgian-de-arrascaeta': arrascaetaProps,
  pedro: pedroProps,
  'memphis-depay': depayProps,
  depay: depayProps,
  'yuri-alberto': yuriProps,
  'flaco-lopez': flacoLopezProps,
  lewandowski: playerLewa,
  'r-lewandowski': playerLewa,
  'robert-lewandowski': playerLewa,
  raphinha: playerRaphinha,
  yamal: playerYamal,
  'l-yamal': playerYamal,
  'lamine-yamal': playerYamal,
  'jimmy-butler': playerJimmyButler,
  'lebron-james': playerLeBronJames,
  'luka-doncic': playerLukaDoncic,
  'stephen-curry': playerStephenCurry,
}

const getPlayerPropImage = (playerName: string, teamName: string, sport: string) =>
  getLocalPlayerImage(teamName, playerName) ??
  playerPropImagesByName[normalizePlayerPropImageKey(playerName)] ??
  getPlayerPropAvatar(sport)

const isPlayerPropAvatarPlaceholder = (image: string) =>
  image === playerAvatarFutebol || image === playerAvatarBasquete

const getPlayerPropOptionSets = (sport: string, marketId: string) => {
  if (sport === 'basquete') {
    return marketId === BASKETBALL_ASSISTS_MARKET_ID
      ? basketballAssistPropOptionSets
      : basketballPlayerPropOptionSets
  }
  return marketId === FOOTBALL_ASSISTS_MARKET_ID ? footballAssistPropOptionSets : footballPlayerPropOptionSets
}

const playerProfileTeamAliases: Record<string, string> = {
  'Paris Saint-Germain': 'PSG',
  'Manchester City': 'Man. City',
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

const getTeamPlayerProfilesFrom = (
  playersByTeam: Record<string, TeamPlayerProfile[]>,
  teamName: string
) => {
  const trimmedTeamName = teamName.trim()
  const alias = playerProfileTeamAliases[trimmedTeamName]

  return playersByTeam[trimmedTeamName] ?? (alias ? playersByTeam[alias] : undefined) ?? []
}

const getTeamPlayerProfiles = (teamName: string, sport: string, marketId: string) => {
  if (sport === 'basquete') return getTeamPlayerProfilesFrom(basketballPlayersByTeam, teamName)
  if (marketId === FOOTBALL_ASSISTS_MARKET_ID) return getTeamPlayerProfilesFrom(footballAssistPlayersByTeam, teamName)
  return getTeamPlayerProfilesFrom(footballFinishingPlayersByTeam, teamName)
}

// eslint-disable-next-line react-refresh/only-export-components
export const getMatchPlayerProps = (
  match: PlayerPropsMatch,
  sport: string,
  marketId = sport === 'basquete' ? BASKETBALL_PLAYER_PROPS_MARKET_ID : FOOTBALL_PLAYER_PROPS_MARKET_ID,
  playerLimit = PLAYER_PROPS_PER_MATCH
): MatchPlayerProp[] => {
  const optionSets = getPlayerPropOptionSets(sport, marketId)
  const homePlayers = getTeamPlayerProfiles(match.homeTeam.name, sport, marketId)
  const awayPlayers = getTeamPlayerProfiles(match.awayTeam.name, sport, marketId)
  const orderedPlayers = [
    ...homePlayers.slice(0, 1).map((player) => ({ ...player, teamName: match.homeTeam.name, teamIcon: match.homeTeam.icon, teamSide: 'home' as const })),
    ...awayPlayers.slice(0, 1).map((player) => ({ ...player, teamName: match.awayTeam.name, teamIcon: match.awayTeam.icon, teamSide: 'away' as const })),
    ...homePlayers.slice(1, 2).map((player) => ({ ...player, teamName: match.homeTeam.name, teamIcon: match.homeTeam.icon, teamSide: 'home' as const })),
    ...awayPlayers.slice(1, 2).map((player) => ({ ...player, teamName: match.awayTeam.name, teamIcon: match.awayTeam.icon, teamSide: 'away' as const })),
    ...homePlayers.slice(2).map((player) => ({ ...player, teamName: match.homeTeam.name, teamIcon: match.homeTeam.icon, teamSide: 'home' as const })),
    ...awayPlayers.slice(2).map((player) => ({ ...player, teamName: match.awayTeam.name, teamIcon: match.awayTeam.icon, teamSide: 'away' as const })),
  ]
  const uniquePlayerNames = new Set<string>()

  return orderedPlayers.reduce<MatchPlayerProp[]>((players, player) => {
    if (players.length >= playerLimit || uniquePlayerNames.has(player.name)) return players

    uniquePlayerNames.add(player.name)
    players.push({
      id: `${match.id}-${player.teamName}-${player.name}`,
      playerName: player.name,
      teamName: player.teamName,
      teamIcon: player.teamIcon,
      teamSide: player.teamSide,
      sport,
      position: player.position,
      image: getPlayerPropImage(player.name, player.teamName, sport),
      options: optionSets[players.length % optionSets.length],
    })
    return players
  }, [])
}

const getInitialPlayerPropOptionIndex = (options: PlayerPropOption[]) => {
  const activeIndex = options.findIndex((option) => option.active)
  return activeIndex >= 0 ? activeIndex : Math.floor(options.length / 2)
}

interface PreMatchPlayerPropCardProps {
  player: MatchPlayerProp
  disableInteractions?: boolean
}

export function PreMatchPlayerPropCard({
  player,
  disableInteractions = false,
}: PreMatchPlayerPropCardProps) {
  const resolvedTeamIcon = useSportsDbTeamLogo(player.teamName, player.teamIcon, player.sport, undefined, {
    useCurrentLogoFallback: true,
  })
  const getPlayerPropOddButtonProps = useOddSelection('prematch-section__player-prop-option')
  const [activeOptionIndex, setActiveOptionIndex] = useState(() =>
    getInitialPlayerPropOptionIndex(player.options)
  )
  const hasPlayerImage = !isPlayerPropAvatarPlaceholder(player.image)
  const [isDraggingOptions, setIsDraggingOptions] = useState(false)
  const activeOptionIndexRef = useRef(activeOptionIndex)
  const optionsScrollRef = useRef<HTMLDivElement | null>(null)
  const optionDrag = useRef<{
    startX: number
    startY?: number
    scrollLeft: number
    startIndex: number
    moved: boolean
    direction: 'pending' | 'horizontal' | 'vertical'
    lastY: number
    pointerId?: number
    sensitivity: number
    tapTarget: HTMLButtonElement | null
  } | null>(null)
  const suppressOptionClick = useRef(false)
  const suppressOptionClickTimeout = useRef<number | null>(null)
  const wheelLock = useRef(0)
  const playerPropsScrollLockTimeout = useRef<number | null>(null)
  const programmaticOptionTarget = useRef<number | null>(null)
  const programmaticOptionTimeout = useRef<number | null>(null)

  const clearProgrammaticOptionTarget = useCallback(() => {
    if (programmaticOptionTimeout.current) {
      window.clearTimeout(programmaticOptionTimeout.current)
      programmaticOptionTimeout.current = null
    }

    programmaticOptionTarget.current = null
  }, [])

  const setPlayerPropsScrollLocked = useCallback((locked: boolean) => {
    if (playerPropsScrollLockTimeout.current) {
      window.clearTimeout(playerPropsScrollLockTimeout.current)
      playerPropsScrollLockTimeout.current = null
    }

    optionsScrollRef.current
      ?.closest('.prematch-section__player-props')
      ?.classList.toggle('prematch-section__player-props--odds-active', locked)
  }, [])

  const releasePlayerPropsScrollLock = useCallback((delay = 0) => {
    if (playerPropsScrollLockTimeout.current) {
      window.clearTimeout(playerPropsScrollLockTimeout.current)
    }

    playerPropsScrollLockTimeout.current = window.setTimeout(() => {
      optionsScrollRef.current
        ?.closest('.prematch-section__player-props')
        ?.classList.remove('prematch-section__player-props--odds-active')
      playerPropsScrollLockTimeout.current = null
    }, delay)
  }, [])

  const scrollOptionIntoCenter = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const containerEl = optionsScrollRef.current
    const optionEl = containerEl?.children.item(index) as HTMLElement | null
    if (!containerEl || !optionEl) return

    const optionCenter = optionEl.offsetLeft + optionEl.offsetWidth / 2
    const targetScroll = optionCenter - containerEl.clientWidth / 2
    const nextScrollLeft = Math.max(0, targetScroll)

    if (behavior === 'auto') {
      containerEl.scrollLeft = nextScrollLeft
      return
    }

    containerEl.scrollTo({ left: nextScrollLeft, behavior })
  }, [])

  const getCenteredOptionIndex = useCallback(() => {
    const containerEl = optionsScrollRef.current
    if (!containerEl || containerEl.children.length === 0) return -1

    const containerCenter = containerEl.scrollLeft + containerEl.clientWidth / 2
    let nearestIndex = 0
    let nearestDistance = Number.POSITIVE_INFINITY

    Array.from(containerEl.children).forEach((child, index) => {
      const optionEl = child as HTMLElement
      const optionCenter = optionEl.offsetLeft + optionEl.offsetWidth / 2
      const distance = Math.abs(optionCenter - containerCenter)

      if (distance < nearestDistance) {
        nearestIndex = index
        nearestDistance = distance
      }
    })

    return nearestIndex
  }, [])

  const clampOptionScroll = useCallback(() => {
    const containerEl = optionsScrollRef.current
    if (!containerEl) return

    const maxScroll = Math.max(0, containerEl.scrollWidth - containerEl.clientWidth)
    const nextScroll = Math.min(maxScroll, Math.max(0, containerEl.scrollLeft))

    if (Math.abs(containerEl.scrollLeft - nextScroll) > 0.5) {
      containerEl.scrollLeft = nextScroll
    }
  }, [])

  const setActiveOption = (index: number) => {
    if (activeOptionIndexRef.current === index) return

    activeOptionIndexRef.current = index
    setActiveOptionIndex(index)
  }

  const centerOption = (index: number, behavior: ScrollBehavior = 'smooth') => {
    clearProgrammaticOptionTarget()
    programmaticOptionTarget.current = index
    setActiveOption(index)
    window.requestAnimationFrame(() => scrollOptionIntoCenter(index, behavior))

    if (behavior === 'auto') {
      programmaticOptionTarget.current = null
      return
    }

    programmaticOptionTimeout.current = window.setTimeout(() => {
      programmaticOptionTarget.current = null
      programmaticOptionTimeout.current = null
    }, PLAYER_PROP_OPTION_PROGRAMMATIC_MS)
  }

  const stepOption = (direction: number) => {
    const currentIndex = activeOptionIndexRef.current ?? Math.max(0, getCenteredOptionIndex())
    const nextIndex = Math.min(player.options.length - 1, Math.max(0, currentIndex + direction))

    if (currentIndex !== nextIndex) {
      centerOption(nextIndex)
    }
  }

  const updateCenteredOption = () => {
    clampOptionScroll()

    if (programmaticOptionTarget.current !== null) return

    const centeredIndex = getCenteredOptionIndex()
    if (centeredIndex < 0) return
    setActiveOption(centeredIndex)
  }

  const snapToNearestOption = (dragDelta = 0, startIndex?: number) => {
    const containerEl = optionsScrollRef.current
    if (!containerEl) return

    const nearestIndex = getCenteredOptionIndex()
    const lastIndex = containerEl.children.length - 1
    const initialIndex = startIndex ?? activeOptionIndexRef.current ?? nearestIndex
    let targetIndex = nearestIndex

    if (Math.abs(dragDelta) > PLAYER_PROP_OPTION_SWIPE_THRESHOLD && nearestIndex === initialIndex) {
      targetIndex = initialIndex + (dragDelta > 0 ? 1 : -1)
    }

    targetIndex = Math.max(0, Math.min(lastIndex, targetIndex))
    centerOption(targetIndex)
  }

  const getVerticalScrollContainer = (element: HTMLElement | null) => {
    let currentElement = element?.parentElement ?? null

    while (currentElement && currentElement !== document.body) {
      const style = window.getComputedStyle(currentElement)
      const canScrollY = /(auto|scroll)/.test(style.overflowY)

      if (canScrollY && currentElement.scrollHeight > currentElement.clientHeight) {
        return currentElement
      }

      currentElement = currentElement.parentElement
    }

    return (document.scrollingElement ?? document.documentElement) as HTMLElement
  }

  const applyVerticalPointerScroll = (event: PointerEvent<HTMLDivElement>) => {
    const drag = optionDrag.current
    const containerEl = optionsScrollRef.current
    if (!drag || !containerEl) return

    const verticalScrollEl = getVerticalScrollContainer(containerEl)
    verticalScrollEl.scrollTop += drag.lastY - event.clientY
    drag.lastY = event.clientY
  }

  const getOptionTapTarget = (target: EventTarget | null, x: number, y: number) => {
    const targetElement = target instanceof Element ? target : document.elementFromPoint(x, y)
    const directTarget = targetElement?.closest<HTMLButtonElement>('.prematch-section__player-prop-option') ?? null

    if (directTarget && optionsScrollRef.current?.contains(directTarget)) return directTarget

    const pointTarget = document
      .elementFromPoint(x, y)
      ?.closest<HTMLButtonElement>('.prematch-section__player-prop-option') ?? null

    return pointTarget && optionsScrollRef.current?.contains(pointTarget) ? pointTarget : null
  }

  const isReplayableTapDistance = (deltaX: number, deltaY: number) => (
    Math.hypot(deltaX, deltaY) <= PLAYER_PROP_OPTION_TAP_REPLAY_THRESHOLD
  )

  const clearOptionClickSuppression = () => {
    if (suppressOptionClickTimeout.current !== null) {
      window.clearTimeout(suppressOptionClickTimeout.current)
      suppressOptionClickTimeout.current = null
    }

    suppressOptionClick.current = false
  }

  const suppressNextNativeOptionClick = () => {
    clearOptionClickSuppression()
    suppressOptionClick.current = true
    suppressOptionClickTimeout.current = window.setTimeout(() => {
      suppressOptionClick.current = false
      suppressOptionClickTimeout.current = null
    }, PLAYER_PROP_OPTION_NATIVE_CLICK_SUPPRESS_MS)
  }

  const replayOptionTap = (tapTarget: HTMLButtonElement) => {
    suppressNextNativeOptionClick()
    tapTarget.click()
  }

  const handleOptionPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    const containerEl = optionsScrollRef.current
    if (!containerEl) return

    event.stopPropagation()
    containerEl.setPointerCapture?.(event.pointerId)
    clearProgrammaticOptionTarget()
    if (event.pointerType === 'mouse') {
      setPlayerPropsScrollLocked(true)
      setIsDraggingOptions(true)
      containerEl.classList.add('prematch-section__player-prop-options-scroll--dragging')
    }

    optionDrag.current = {
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: containerEl.scrollLeft,
      startIndex: activeOptionIndexRef.current ?? getCenteredOptionIndex(),
      moved: false,
      direction: event.pointerType === 'mouse' ? 'horizontal' : 'pending',
      lastY: event.clientY,
      pointerId: event.pointerId,
      sensitivity: event.pointerType === 'touch'
        ? PLAYER_PROP_OPTION_TOUCH_SENSITIVITY
        : PLAYER_PROP_OPTION_MOUSE_SENSITIVITY,
      tapTarget: getOptionTapTarget(event.target, event.clientX, event.clientY),
    }
  }

  const handleOptionPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = optionDrag.current
    const containerEl = optionsScrollRef.current
    if (!drag || !containerEl) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - (drag.startY ?? event.clientY)
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    if (drag.direction === 'pending') {
      if (
        absY >= PLAYER_PROP_OPTION_VERTICAL_INTENT_THRESHOLD &&
        absY > absX * PLAYER_PROP_OPTION_AXIS_RATIO
      ) {
        drag.direction = 'vertical'
        setIsDraggingOptions(false)
        releasePlayerPropsScrollLock()
        applyVerticalPointerScroll(event)
        return
      }

      if (
        absX < PLAYER_PROP_OPTION_HORIZONTAL_INTENT_THRESHOLD ||
        absX <= absY * PLAYER_PROP_OPTION_AXIS_RATIO
      ) {
        return
      }

      drag.direction = 'horizontal'
      setPlayerPropsScrollLocked(true)
      setIsDraggingOptions(true)
      containerEl.classList.add('prematch-section__player-prop-options-scroll--dragging')
    }

    event.stopPropagation()

    if (event.cancelable) {
      event.preventDefault()
    }

    if (drag.direction === 'vertical') {
      applyVerticalPointerScroll(event)
      return
    }

    if (drag.direction !== 'horizontal') return


    const walk = deltaX * drag.sensitivity
    drag.moved = drag.moved || absX > PLAYER_PROP_OPTION_CLICK_SUPPRESS_THRESHOLD
    containerEl.scrollLeft = drag.scrollLeft - walk
    clampOptionScroll()
  }

  const clearOptionDrag = () => {
    const drag = optionDrag.current
    const containerEl = optionsScrollRef.current

    if (containerEl && drag?.pointerId !== undefined && containerEl.hasPointerCapture?.(drag.pointerId)) {
      containerEl.releasePointerCapture(drag.pointerId)
    }

    optionDrag.current = null
    setIsDraggingOptions(false)
    containerEl?.classList.remove('prematch-section__player-prop-options-scroll--dragging')
    releasePlayerPropsScrollLock()
  }

  const finishOptionDrag = (releaseDelay = 0) => {
    const drag = optionDrag.current
    const containerEl = optionsScrollRef.current
    if (!drag) return

    if (drag.direction !== 'horizontal') {
      clearOptionDrag()
      return
    }

    const dragDelta = containerEl ? containerEl.scrollLeft - drag.scrollLeft : 0

    if (containerEl && drag.pointerId !== undefined && containerEl.hasPointerCapture?.(drag.pointerId)) {
      containerEl.releasePointerCapture(drag.pointerId)
    }

    optionDrag.current = null
    setIsDraggingOptions(false)
    containerEl?.classList.remove('prematch-section__player-prop-options-scroll--dragging')
    releasePlayerPropsScrollLock(releaseDelay)

    if (drag.moved) {
      suppressNextNativeOptionClick()
    }

    snapToNearestOption(dragDelta, drag.startIndex)
  }

  const handleOptionPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    const drag = optionDrag.current

    if (
      event.pointerType !== 'mouse' &&
      drag &&
      drag.direction !== 'horizontal' &&
      drag.tapTarget &&
      !drag.tapTarget.disabled &&
      drag.tapTarget.isConnected &&
      isReplayableTapDistance(event.clientX - drag.startX, event.clientY - (drag.startY ?? event.clientY))
    ) {
      if (event.cancelable) event.preventDefault()
      const tapTarget = drag.tapTarget
      clearOptionDrag()
      replayOptionTap(tapTarget)
      return
    }

    if (drag?.direction === 'vertical') {
      suppressNextNativeOptionClick()
      clearOptionDrag()
      return
    }

    if (optionDrag.current?.direction === 'horizontal') {
      finishOptionDrag(140)
      return
    }

    clearOptionDrag()
  }

  const handleOptionPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    clearOptionDrag()
  }

  const handleOptionWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.stopPropagation()
    const movement = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (Math.abs(movement) < 12) return
    event.preventDefault()
    setPlayerPropsScrollLocked(true)
    releasePlayerPropsScrollLock(260)

    const now = event.timeStamp
    if (now - wheelLock.current < 220) return
    wheelLock.current = now

    stepOption(movement > 0 ? 1 : -1)
  }

  useEffect(() => {
    activeOptionIndexRef.current = activeOptionIndex
  }, [activeOptionIndex])

  useLayoutEffect(() => {
    const initialIndex = getInitialPlayerPropOptionIndex(player.options)
    activeOptionIndexRef.current = initialIndex
    scrollOptionIntoCenter(initialIndex, 'auto')
  }, [player.options, scrollOptionIntoCenter])

  useEffect(() => () => {
    if (suppressOptionClickTimeout.current !== null) {
      window.clearTimeout(suppressOptionClickTimeout.current)
      suppressOptionClickTimeout.current = null
    }
    suppressOptionClick.current = false

    if (playerPropsScrollLockTimeout.current) {
      window.clearTimeout(playerPropsScrollLockTimeout.current)
    }
    if (programmaticOptionTimeout.current) {
      window.clearTimeout(programmaticOptionTimeout.current)
    }

    optionsScrollRef.current
      ?.closest('.prematch-section__player-props')
      ?.classList.remove('prematch-section__player-props--odds-active')
  }, [])

  return (
    <article className="prematch-section__player-prop-card">
      <span className="prematch-section__player-prop-stat-icon" aria-hidden="true" />
      {resolvedTeamIcon ? (
        <img
          src={resolvedTeamIcon}
          alt=""
          className="prematch-section__player-prop-team-icon"
        />
      ) : null}
      {hasPlayerImage ? (
        <img
          src={player.image}
          alt=""
          className="prematch-section__player-prop-avatar prematch-section__player-prop-avatar--image"
        />
      ) : (
        <span
          className={`prematch-section__player-prop-avatar prematch-section__player-prop-avatar--${player.sport === 'basquete' ? 'basketball' : 'football'}`}
          aria-hidden="true"
        />
      )}
      <div className="prematch-section__player-prop-name">
        <strong>{player.playerName}</strong>
        <span>{player.position}</span>
      </div>
      <div className="prematch-section__player-prop-options" aria-label={`Odds de ${player.playerName}`} onWheel={handleOptionWheel}>
        <div
          ref={optionsScrollRef}
          className={`prematch-section__player-prop-options-scroll${isDraggingOptions ? ' prematch-section__player-prop-options-scroll--dragging' : ''}`}
          onScroll={updateCenteredOption}
          onPointerDown={handleOptionPointerDown}
          onPointerMove={handleOptionPointerMove}
          onPointerUp={handleOptionPointerUp}
          onPointerCancel={handleOptionPointerCancel}
          onLostPointerCapture={() => finishOptionDrag()}
        >
          {player.options.map((option, index) => {
            const hasBetslipContext = !!player.eventId && !!player.marketId
            // Canonical key shared with the sport and competition screens so the SAME
            // bet correlates everywhere; the per-player market id enables multi-select.
            const propKey = hasBetslipContext
              ? getPlayerPropBetslipKey({
                sport: player.sport,
                homeTeam: player.homeTeam,
                awayTeam: player.awayTeam,
                marketId: player.marketId!,
                playerName: player.playerName,
                lineLabel: option.label,
              })
              : null
            const groupId = propKey?.groupId ?? player.id
            const outcomeId = propKey?.outcomeId ?? `${player.teamSide}:${player.playerName}:option-${index}`
            const oddProps = disableInteractions
              ? {
                  type: 'button' as const,
                  className: 'prematch-section__player-prop-option',
                  disabled: true,
                  'aria-disabled': true,
                }
              : getPlayerPropOddButtonProps(
                  `${groupId}:${outcomeId}`,
                  groupId,
                  'prematch-section__player-prop-option',
                  hasBetslipContext
                    ? createBetslipSelection({
                      eventId: propKey!.eventId,
                      marketId: propKey!.marketId,
                      outcomeId,
                      label: option.label,
                      odd: option.odd,
                      marketLabel: player.marketLabel,
                      eventStatus: player.eventStatus ?? 'prematch',
                      selectionType: 'player',
                      sport: player.sport,
                      leagueId: player.leagueId,
                      leagueName: player.leagueName,
                      homeTeam: player.homeTeam,
                      awayTeam: player.awayTeam,
                      eventTimeLabel: player.eventTimeLabel,
                      liveClock: player.liveClock,
                      homeScore: player.homeScore,
                      awayScore: player.awayScore,
                      playerName: player.playerName,
                      selectionTeamName: player.teamName,
                      selectionIcon: resolvedTeamIcon || player.teamIcon,
                      playerImage: player.image,
                      badgeType: 'substitution',
                    })
                    : undefined
                )
            const isSelected = 'aria-pressed' in oddProps && oddProps['aria-pressed'] === true
            const selectionRenderState = isSelected ? 'selected' : 'idle'

            return (
              <button
                key={`${player.id}-${option.label}-${selectionRenderState}`}
                {...oddProps}
                data-selection-state={selectionRenderState}
                className={`${oddProps.className}${isSelected ? ' prematch-section__player-prop-option--active' : ''}`}
                onClick={(event) => {
                  event.stopPropagation()
                  if (disableInteractions) return
                  if (suppressOptionClick.current && event.nativeEvent.isTrusted) {
                    clearOptionClickSuppression()
                    event.preventDefault()
                    return
                  }
                  centerOption(index)
                  if ('onClick' in oddProps) oddProps.onClick?.(event)
                }}
              >
                <span>{option.label}</span>
                <strong>{option.odd}</strong>
              </button>
            )
          })}
        </div>
      </div>
    </article>
  )
}

const leagues: League[] = [
  {
    id: 'brasil-serie-a',
    name: 'Brasil - Série A',
    flag: flagBrasil,
    isOpen: true,
    sport: 'futebol',
    matches: [
      {
        id: '1',
        dateTime: 'Hoje, 21:30',
        homeTeam: { name: 'Palmeiras', icon: getTeamLogo("Palmeiras", escudoPalmeiras) },
        awayTeam: { name: 'Fluminense', icon: getTeamLogo("Fluminense", escudoFluminense) },
        odds: { home: '1.65x', draw: '3.80x', away: '5.00x' },
        doubleChanceOdds: { homeOrDraw: '1.20x', homeOrAway: '1.35x', awayOrDraw: '2.10x' },
        bothTeamsScoreOdds: { yes: '1.85x', no: '1.90x' },
        totalGoalsOdds: { line: 2.5, under: '1.85x', over: '1.90x' },
        totalCornersOdds: { line: 9.5, under: '1.80x', over: '1.95x' },
        extraBets: 2,
      },
      {
        id: '2',
        dateTime: 'Hoje, 21:30',
        homeTeam: { name: 'Botafogo', icon: getTeamLogo("Botafogo", escudoBotafogo) },
        awayTeam: { name: 'Bahia', icon: getTeamLogo("Bahia", escudoBahia) },
        odds: { home: '1.85x', draw: '3.40x', away: '4.20x' },
        doubleChanceOdds: { homeOrDraw: '1.25x', homeOrAway: '1.40x', awayOrDraw: '1.95x' },
        bothTeamsScoreOdds: { yes: '1.75x', no: '2.00x' },
        totalGoalsOdds: { line: 2.5, under: '1.80x', over: '1.95x' },
        totalCornersOdds: { line: 9.5, under: '1.85x', over: '1.90x' },
        extraBets: 2,
      },
      {
        id: '3',
        dateTime: 'Amanhã, 20:00',
        homeTeam: { name: 'Atl. Mineiro', icon: getTeamLogo("Atl. Mineiro", escudoAtlMineiro) },
        awayTeam: { name: 'Santos', icon: getTeamLogo("Santos", escudoSantos) },
        odds: { home: '2.10x', draw: '3.25x', away: '3.50x' },
        doubleChanceOdds: { homeOrDraw: '1.30x', homeOrAway: '1.35x', awayOrDraw: '1.70x' },
        bothTeamsScoreOdds: { yes: '1.70x', no: '2.05x' },
        totalGoalsOdds: { line: 2.5, under: '1.90x', over: '1.85x' },
        totalCornersOdds: { line: 10.5, under: '1.88x', over: '1.88x' },
      },
    ],
  },
  {
    id: 'champions-league',
    name: 'Champions League',
    flag: flagMundo,
    isOpen: true,
    sport: 'futebol',
    matches: [
      {
        id: '4',
        dateTime: 'Hoje, 16:00',
        homeTeam: { name: 'Real Madrid', icon: getTeamLogo("Real Madrid", escudoReal) },
        awayTeam: { name: 'Barcelona', icon: getTeamLogo("Barcelona", escudoBarca) },
        odds: { home: '2.20x', draw: '3.40x', away: '3.10x' },
        doubleChanceOdds: { homeOrDraw: '1.35x', homeOrAway: '1.30x', awayOrDraw: '1.60x' },
        bothTeamsScoreOdds: { yes: '1.55x', no: '2.30x' },
        totalGoalsOdds: { line: 2.5, under: '2.10x', over: '1.70x' },
        totalCornersOdds: { line: 10.5, under: '1.75x', over: '2.00x' },
        extraBets: 2,
      },
      {
        id: '5',
        dateTime: 'Hoje, 16:00',
        homeTeam: { name: 'Liverpool', icon: getTeamLogo("Liverpool", escudoLiverpool) },
        awayTeam: { name: 'Man. City', icon: getTeamLogo("Man. City", escudoManchesterCity) },
        odds: { home: '2.40x', draw: '3.50x', away: '2.80x' },
        doubleChanceOdds: { homeOrDraw: '1.45x', homeOrAway: '1.30x', awayOrDraw: '1.55x' },
        bothTeamsScoreOdds: { yes: '1.50x', no: '2.40x' },
        totalGoalsOdds: { line: 2.5, under: '2.05x', over: '1.75x' },
        totalCornersOdds: { line: 10.5, under: '1.82x', over: '1.92x' },
        extraBets: 2,
      },
      {
        id: '6',
        dateTime: 'Amanhã, 16:00',
        homeTeam: { name: 'Benfica', icon: getTeamLogo("Benfica", escudoBenfica) },
        awayTeam: { name: 'Ajax', icon: getTeamLogo("Ajax", escudoAjax) },
        odds: { home: '2.10x', draw: '3.40x', away: '3.30x' },
        doubleChanceOdds: { homeOrDraw: '1.30x', homeOrAway: '1.32x', awayOrDraw: '1.68x' },
        bothTeamsScoreOdds: { yes: '1.65x', no: '2.15x' },
        totalGoalsOdds: { line: 2.5, under: '1.95x', over: '1.80x' },
        totalCornersOdds: { line: 9.5, under: '1.90x', over: '1.85x' },
      },
    ],
  },
  {
    id: 'premier-league',
    name: 'Inglaterra - Premier League',
    flag: flagInglaterra,
    isOpen: false,
    sport: 'futebol',
    matches: [
      {
        id: '6',
        dateTime: 'Hoje, 12:30',
        homeTeam: { name: 'Arsenal', icon: getTeamLogo("Arsenal", escudoArsenal) },
        awayTeam: { name: 'Chelsea', icon: getTeamLogo("Chelsea", escudoChelsea) },
        odds: { home: '1.90x', draw: '3.60x', away: '3.80x' },
        doubleChanceOdds: { homeOrDraw: '1.25x', homeOrAway: '1.28x', awayOrDraw: '1.85x' },
        bothTeamsScoreOdds: { yes: '1.60x', no: '2.20x' },
        totalGoalsOdds: { line: 2.5, under: '2.00x', over: '1.78x' },
        totalCornersOdds: { line: 10.5, under: '1.78x', over: '1.98x' },
        extraBets: 2,
      },
      {
        id: '7',
        dateTime: 'Amanhã, 15:00',
        homeTeam: { name: 'Brighton', icon: getTeamLogo("Brighton", escudoBrighton) },
        awayTeam: { name: 'West Ham', icon: getTeamLogo("West Ham", escudoWestHam) },
        odds: { home: '2.00x', draw: '3.50x', away: '3.60x' },
        doubleChanceOdds: { homeOrDraw: '1.28x', homeOrAway: '1.30x', awayOrDraw: '1.78x' },
        bothTeamsScoreOdds: { yes: '1.72x', no: '2.02x' },
        totalGoalsOdds: { line: 2.5, under: '1.88x', over: '1.88x' },
        totalCornersOdds: { line: 9.5, under: '1.85x', over: '1.90x' },
      },
      {
        id: '8',
        dateTime: 'Amanhã, 17:00',
        homeTeam: { name: 'Leeds', icon: getTeamLogo("Leeds", escudoLeeds) },
        awayTeam: { name: 'Burnley', icon: getTeamLogo("Burnley", escudoBurnley) },
        odds: { home: '2.20x', draw: '3.30x', away: '3.20x' },
        doubleChanceOdds: { homeOrDraw: '1.32x', homeOrAway: '1.32x', awayOrDraw: '1.62x' },
        bothTeamsScoreOdds: { yes: '1.80x', no: '1.95x' },
        totalGoalsOdds: { line: 2.5, under: '1.92x', over: '1.85x' },
        totalCornersOdds: { line: 9.5, under: '1.88x', over: '1.88x' },
      },
    ],
  },
  {
    id: 'la-liga',
    name: 'Espanha - La Liga',
    flag: flagEspanha,
    isOpen: false,
    sport: 'futebol',
    matches: [
      {
        id: '9',
        dateTime: 'Hoje, 14:00',
        homeTeam: { name: 'Getafe', icon: getTeamLogo("Getafe", escudoGetafe) },
        awayTeam: { name: 'Elche', icon: getTeamLogo("Elche", escudoElche) },
        odds: { home: '2.10x', draw: '3.20x', away: '3.50x' },
        doubleChanceOdds: { homeOrDraw: '1.28x', homeOrAway: '1.32x', awayOrDraw: '1.68x' },
        bothTeamsScoreOdds: { yes: '2.10x', no: '1.68x' },
        totalGoalsOdds: { line: 2.5, under: '1.70x', over: '2.10x' },
        totalCornersOdds: { line: 8.5, under: '1.82x', over: '1.92x' },
      },
      {
        id: '10',
        dateTime: 'Hoje, 16:00',
        homeTeam: { name: 'Alavés', icon: getTeamLogo("Alavés", escudoAlaves) },
        awayTeam: { name: 'Espanyol', icon: getTeamLogo("Espanyol", escudoEspanyol) },
        odds: { home: '2.40x', draw: '3.10x', away: '2.95x' },
        doubleChanceOdds: { homeOrDraw: '1.35x', homeOrAway: '1.33x', awayOrDraw: '1.52x' },
        bothTeamsScoreOdds: { yes: '1.90x', no: '1.85x' },
        totalGoalsOdds: { line: 2.5, under: '1.75x', over: '2.02x' },
        totalCornersOdds: { line: 9.5, under: '1.80x', over: '1.95x' },
      },
      {
        id: '11',
        dateTime: 'Amanhã, 18:30',
        homeTeam: { name: 'Mallorca', icon: getTeamLogo("Mallorca", escudoMallorca) },
        awayTeam: { name: 'Levante', icon: getTeamLogo("Levante", escudoLevante) },
        odds: { home: '2.25x', draw: '3.30x', away: '3.15x' },
        doubleChanceOdds: { homeOrDraw: '1.32x', homeOrAway: '1.32x', awayOrDraw: '1.60x' },
        bothTeamsScoreOdds: { yes: '1.75x', no: '2.00x' },
        totalGoalsOdds: { line: 2.5, under: '1.82x', over: '1.95x' },
        totalCornersOdds: { line: 9.5, under: '1.85x', over: '1.90x' },
      },
    ],
  },
  {
    id: 'bundesliga',
    name: 'Alemanha - Bundesliga',
    flag: flagAlemanha,
    isOpen: false,
    sport: 'futebol',
    matches: [
      {
        id: '12',
        dateTime: 'Hoje, 16:30',
        homeTeam: { name: 'B. Leverkusen', icon: getTeamLogo("B. Leverkusen", escudoBayerLeverkusen) },
        awayTeam: { name: 'Bayern', icon: getTeamLogo("Bayern", escudoBayerMunique) },
        odds: { home: '2.40x', draw: '3.40x', away: '2.80x' },
        doubleChanceOdds: { homeOrDraw: '1.42x', homeOrAway: '1.30x', awayOrDraw: '1.55x' },
        bothTeamsScoreOdds: { yes: '1.45x', no: '2.60x' },
        totalGoalsOdds: { line: 2.5, under: '2.15x', over: '1.68x' },
        totalCornersOdds: { line: 10.5, under: '1.75x', over: '2.00x' },
        extraBets: 2,
      },
      {
        id: '13',
        dateTime: 'Amanhã, 13:30',
        homeTeam: { name: 'Wolfsburg', icon: getTeamLogo("Wolfsburg", escudoWolfsburg) },
        awayTeam: { name: 'Eintracht', icon: getTeamLogo("Eintracht", escudoEintracht) },
        odds: { home: '2.70x', draw: '3.30x', away: '2.55x' },
        doubleChanceOdds: { homeOrDraw: '1.48x', homeOrAway: '1.32x', awayOrDraw: '1.45x' },
        bothTeamsScoreOdds: { yes: '1.68x', no: '2.10x' },
        totalGoalsOdds: { line: 2.5, under: '1.90x', over: '1.85x' },
        totalCornersOdds: { line: 9.5, under: '1.88x', over: '1.88x' },
      },
      {
        id: '14',
        dateTime: 'Amanhã, 15:30',
        homeTeam: { name: 'Augsburg', icon: getTeamLogo("Augsburg", escudoAugsburg) },
        awayTeam: { name: 'Hamburger', icon: getTeamLogo("Hamburger", escudoHamburger) },
        odds: { home: '2.50x', draw: '3.20x', away: '2.85x' },
        doubleChanceOdds: { homeOrDraw: '1.40x', homeOrAway: '1.33x', awayOrDraw: '1.50x' },
        bothTeamsScoreOdds: { yes: '1.72x', no: '2.02x' },
        totalGoalsOdds: { line: 2.5, under: '1.85x', over: '1.92x' },
        totalCornersOdds: { line: 9.5, under: '1.82x', over: '1.92x' },
      },
    ],
  },
  // Basketball
  {
    id: 'nba',
    name: 'NBA',
    flag: flagEstadosUnidos,
    isOpen: true,
    sport: 'basquete',
    matches: [
      {
        id: 'nba-pre-1',
        dateTime: 'Hoje, 22:00',
        homeTeam: { name: 'Bulls', icon: getTeamLogo("Bulls", escudoBulls) },
        awayTeam: { name: 'Heat', icon: getTeamLogo("Heat", escudoMiami) },
        odds: { home: '2.45x', away: '1.55x' },
        totalPointsOdds: { line: 218.5, under: '1.90x', over: '1.90x' },
        handicapOdds: { line: 6.5, home: '1.88x', away: '1.92x' },
        q3TotalOdds: { line: 54.5, under: '1.85x', over: '1.95x' },
        q4TotalOdds: { line: 56.5, under: '1.90x', over: '1.90x' },
        extraBets: 20,
      },
      {
        id: 'nba-pre-2',
        dateTime: 'Amanhã, 21:30',
        homeTeam: { name: 'Warriors', icon: getTeamLogo("Warriors", escudoWarriors) },
        awayTeam: { name: 'Lakers', icon: getTeamLogo("Lakers", escudoLakers) },
        odds: { home: '1.72x', away: '2.15x' },
        totalPointsOdds: { line: 228.5, under: '1.85x', over: '1.95x' },
        handicapOdds: { line: -4.5, home: '1.90x', away: '1.90x' },
        q3TotalOdds: { line: 57.5, under: '1.88x', over: '1.92x' },
        q4TotalOdds: { line: 58.5, under: '1.85x', over: '1.95x' },
        extraBets: 20,
      },
      {
        id: 'nba-pre-3',
        dateTime: 'Amanhã, 23:00',
        homeTeam: { name: 'Pistons', icon: getTeamLogo("Pistons", escudoPistons) },
        awayTeam: { name: 'Cavaliers', icon: getTeamLogo("Cavaliers", escudoCavaliers) },
        odds: { home: '3.20x', away: '1.35x' },
        totalPointsOdds: { line: 212.5, under: '1.92x', over: '1.88x' },
        handicapOdds: { line: 8.5, home: '1.85x', away: '1.95x' },
        q3TotalOdds: { line: 52.5, under: '1.90x', over: '1.90x' },
        q4TotalOdds: { line: 54.5, under: '1.88x', over: '1.92x' },
      },
    ],
  },
  {
    id: 'ncaab',
    name: 'NCAAB',
    flag: flagEstadosUnidos,
    isOpen: true,
    sport: 'basquete',
    matches: [
      {
        id: 'ncaab-pre-1',
        dateTime: 'Hoje, 20:00',
        homeTeam: { name: 'Lafayette', icon: escudoLafayette },
        awayTeam: { name: 'Pennsylvania', icon: escudoPennsylvania },
        odds: { home: '2.85x', away: '1.42x' },
        totalPointsOdds: { line: 142.5, under: '1.90x', over: '1.90x' },
        handicapOdds: { line: 7.5, home: '1.88x', away: '1.92x' },
        q3TotalOdds: { line: 35.5, under: '1.85x', over: '1.95x' },
        q4TotalOdds: { line: 36.5, under: '1.90x', over: '1.90x' },
        extraBets: 20,
      },
      {
        id: 'ncaab-pre-2',
        dateTime: 'Hoje, 21:00',
        homeTeam: { name: 'South Carolina State', icon: escudoSouthCarolina },
        awayTeam: { name: 'Charleston Southern', icon: '' },
        odds: { home: '1.95x', away: '1.85x' },
        totalPointsOdds: { line: 138.5, under: '1.88x', over: '1.92x' },
        handicapOdds: { line: -2.5, home: '1.90x', away: '1.90x' },
        q3TotalOdds: { line: 34.5, under: '1.90x', over: '1.90x' },
        q4TotalOdds: { line: 35.5, under: '1.85x', over: '1.95x' },
      },
      {
        id: 'ncaab-pre-3',
        dateTime: 'Hoje, 22:00',
        homeTeam: { name: 'Southern', icon: escudoSouthern },
        awayTeam: { name: 'Texas', icon: escudoTexas },
        odds: { home: '5.50x', away: '1.15x' },
        totalPointsOdds: { line: 148.5, under: '1.85x', over: '1.95x' },
        handicapOdds: { line: 14.5, home: '1.92x', away: '1.88x' },
        q3TotalOdds: { line: 37.5, under: '1.88x', over: '1.92x' },
        q4TotalOdds: { line: 38.5, under: '1.90x', over: '1.90x' },
      },
    ],
  },
  {
    id: 'euro-cup',
    name: 'Euro Cup',
    flag: flagMundo,
    isOpen: false,
    sport: 'basquete',
    matches: [
      {
        id: 'euro-pre-1',
        dateTime: 'Amanhã, 14:00',
        homeTeam: { name: 'Besiktas', icon: '' },
        awayTeam: { name: 'Lietkabelis', icon: '' },
        odds: { home: '1.72x', away: '2.10x' },
        totalPointsOdds: { line: 158.5, under: '1.90x', over: '1.90x' },
        handicapOdds: { line: -3.5, home: '1.88x', away: '1.92x' },
        q3TotalOdds: { line: 39.5, under: '1.85x', over: '1.95x' },
        q4TotalOdds: { line: 40.5, under: '1.90x', over: '1.90x' },
        extraBets: 20,
      },
      {
        id: 'euro-pre-2',
        dateTime: 'Amanhã, 15:00',
        homeTeam: { name: 'Chemnitz 99', icon: '' },
        awayTeam: { name: 'Panionios', icon: '' },
        odds: { home: '1.55x', away: '2.45x' },
        totalPointsOdds: { line: 162.5, under: '1.88x', over: '1.92x' },
        handicapOdds: { line: -5.5, home: '1.90x', away: '1.90x' },
        q3TotalOdds: { line: 40.5, under: '1.90x', over: '1.90x' },
        q4TotalOdds: { line: 41.5, under: '1.85x', over: '1.95x' },
      },
      {
        id: 'euro-pre-3',
        dateTime: 'Amanhã, 15:00',
        homeTeam: { name: 'Hapoel Jerusalem', icon: '' },
        awayTeam: { name: 'Hamburg Towers', icon: '' },
        odds: { home: '1.65x', away: '2.25x' },
        totalPointsOdds: { line: 165.5, under: '1.90x', over: '1.90x' },
        handicapOdds: { line: -4.5, home: '1.88x', away: '1.92x' },
        q3TotalOdds: { line: 41.5, under: '1.88x', over: '1.92x' },
        q4TotalOdds: { line: 42.5, under: '1.90x', over: '1.90x' },
      },
    ],
  },
  {
    id: 'argentina-liga',
    name: 'Argentina - La Liga',
    flag: flagArgentina,
    isOpen: false,
    sport: 'basquete',
    matches: [
      {
        id: 'arg-pre-1',
        dateTime: 'Hoje, 20:00',
        homeTeam: { name: 'Independiente Santiago del Estero', icon: '' },
        awayTeam: { name: 'Sportivo Suardi', icon: '' },
        odds: { home: '1.45x', away: '2.70x' },
        totalPointsOdds: { line: 168.5, under: '1.90x', over: '1.90x' },
        handicapOdds: { line: -6.5, home: '1.88x', away: '1.92x' },
        q3TotalOdds: { line: 42.5, under: '1.85x', over: '1.95x' },
        q4TotalOdds: { line: 43.5, under: '1.90x', over: '1.90x' },
        extraBets: 20,
      },
      {
        id: 'arg-pre-2',
        dateTime: 'Hoje, 20:30',
        homeTeam: { name: 'Santa Paula de Galvez', icon: '' },
        awayTeam: { name: 'San Isidro', icon: '' },
        odds: { home: '2.15x', away: '1.70x' },
        totalPointsOdds: { line: 162.5, under: '1.88x', over: '1.92x' },
        handicapOdds: { line: 4.5, home: '1.90x', away: '1.90x' },
        q3TotalOdds: { line: 40.5, under: '1.90x', over: '1.90x' },
        q4TotalOdds: { line: 41.5, under: '1.85x', over: '1.95x' },
      },
      {
        id: 'arg-pre-3',
        dateTime: 'Hoje, 21:00',
        homeTeam: { name: 'Ciclista', icon: '' },
        awayTeam: { name: 'Racing Avellaneda', icon: '' },
        odds: { home: '1.85x', away: '1.95x' },
        totalPointsOdds: { line: 158.5, under: '1.90x', over: '1.90x' },
        handicapOdds: { line: -1.5, home: '1.88x', away: '1.92x' },
        q3TotalOdds: { line: 39.5, under: '1.88x', over: '1.92x' },
        q4TotalOdds: { line: 40.5, under: '1.90x', over: '1.90x' },
      },
    ],
  },
  {
    id: 'brasil-nbb',
    name: 'Brasil - NBB',
    flag: flagBrasil,
    isOpen: false,
    sport: 'basquete',
    matches: [
      {
        id: 'nbb-pre-1',
        dateTime: 'Hoje, 20:00',
        homeTeam: { name: 'Botafogo', icon: getTeamLogo("Botafogo", escudoBotafogo) },
        awayTeam: { name: 'Caxias do Sul', icon: getTeamLogo("Caxias do Sul", escudoCaxias) },
        odds: { home: '1.55x', away: '2.45x' },
        totalPointsOdds: { line: 172.5, under: '1.90x', over: '1.90x' },
        handicapOdds: { line: -5.5, home: '1.88x', away: '1.92x' },
        q3TotalOdds: { line: 43.5, under: '1.85x', over: '1.95x' },
        q4TotalOdds: { line: 44.5, under: '1.90x', over: '1.90x' },
        extraBets: 20,
      },
    ],
  },
  ]

export function PreMatchSection({
  disableInteractions = false,
  onOpenCompetition,
  onMatchClick,
}: PreMatchSectionProps = {}) {
  const [activeSport, setActiveSport] = useState('futebol')
  const [activeMarket, setActiveMarket] = useState('resultado-final')
  const [openLeagues, setOpenLeagues] = useState<string[]>(
    leagues.filter((l) => l.isOpen).map((l) => l.id)
  )
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [bottomSheetSport, setBottomSheetSport] = useState<'futebol' | 'basquete'>('futebol')
  const getOddButtonProps = useOddSelection('prematch-section__odd-btn')
  
  // Refs for auto-scroll chips
  const sectionRef = useRef<HTMLElement>(null)
  const sportChipsRef = useRef<HTMLDivElement>(null)
  const marketChipsRef = useRef<HTMLDivElement>(null)
  const sportChipRefs = useRef<(HTMLButtonElement | null)[]>([])
  const marketChipRefs = useRef<(HTMLButtonElement | null)[]>([])
  const marketScrollAnchorRef = useRef<MarketScrollAnchor | null>(null)
  const marketStickyState = useHomeMarketStickyState(sectionRef, marketChipsRef)

  // Reset market chips scroll position when sport changes
  useEffect(() => {
    if (marketChipsRef.current) {
      marketChipsRef.current.scrollTo({ left: 0, behavior: 'smooth' })
    }
  }, [activeSport])

  const openReiAntecipaSheet = (sport: 'futebol' | 'basquete') => {
    setBottomSheetSport(sport)
    setShowBottomSheet(true)
  }

  const getHomeScrollContainer = useCallback(
    () => sectionRef.current?.closest<HTMLElement>('.home') ?? null,
    []
  )

  const getMarketScrollAnchor = (): MarketScrollAnchor | null => {
    const sectionEl = sectionRef.current
    if (!sectionEl) return null

    const scrollContainerEl = getHomeScrollContainer()
    const scrollFrameRect = scrollContainerEl?.getBoundingClientRect() ?? {
      top: 0,
      bottom: window.innerHeight,
    }
    const marketChipsBottom = marketChipsRef.current?.getBoundingClientRect().bottom ?? scrollFrameRect.top
    const anchorLine = Math.max(scrollFrameRect.top, marketChipsBottom) + 8
    const matchEls = Array.from(sectionEl.querySelectorAll<HTMLElement>('[data-prematch-match-key]'))
    const visibleMatches = matchEls
      .map((matchEl) => ({
        matchEl,
        rect: matchEl.getBoundingClientRect(),
      }))
      .filter(({ rect }) => rect.bottom > anchorLine && rect.top < scrollFrameRect.bottom)

    if (visibleMatches.length === 0) return null

    const anchorMatch = visibleMatches.reduce((bestMatch, currentMatch) => {
      const getScore = ({ rect }: { rect: DOMRect }) => (
        rect.top <= anchorLine && rect.bottom >= anchorLine
          ? 0
          : Math.abs(rect.top - anchorLine)
      )

      return getScore(currentMatch) < getScore(bestMatch) ? currentMatch : bestMatch
    }, visibleMatches[0])
    const matchKey = anchorMatch.matchEl.dataset.prematchMatchKey

    if (!matchKey) return null

    return {
      matchKey,
      top: anchorMatch.rect.top,
    }
  }

  const restoreMarketScrollAnchor = useCallback(() => {
    const anchor = marketScrollAnchorRef.current
    const sectionEl = sectionRef.current
    if (!anchor || !sectionEl) return

    marketScrollAnchorRef.current = null

    const matchEl = Array.from(sectionEl.querySelectorAll<HTMLElement>('[data-prematch-match-key]'))
      .find((currentMatchEl) => currentMatchEl.dataset.prematchMatchKey === anchor.matchKey)

    if (!matchEl) return

    const delta = matchEl.getBoundingClientRect().top - anchor.top
    if (Math.abs(delta) < 0.5) return

    const scrollContainerEl = getHomeScrollContainer()
    if (scrollContainerEl) {
      scrollContainerEl.scrollTop += delta
      return
    }

    window.scrollBy({ top: delta, behavior: 'auto' })
  }, [getHomeScrollContainer])

  useLayoutEffect(() => {
    restoreMarketScrollAnchor()
  }, [activeMarket, restoreMarketScrollAnchor])

  // Get current market chips and filtered leagues based on sport
  const currentMarketChips = activeSport === 'basquete' ? basketballMarketChips : footballMarketChips
  const filteredLeagues = leagues.filter((l) => l.sport === activeSport)
  const activeSportChipIndex = sportChips.findIndex((chip) => chip.id === activeSport)
  const activeMarketChipIndex = currentMarketChips.findIndex((chip) => chip.id === activeMarket)
  const marketIndicatorKey = `${activeSport}:${activeMarket}:${currentMarketChips.map((chip) => chip.id).join('|')}`

  useSlidingActiveIndicator({
    activeKey: activeSport,
    containerRef: sportChipsRef,
    getActiveElement: () => sportChipRefs.current[activeSportChipIndex],
  })

  useSlidingActiveIndicator({
    activeKey: marketIndicatorKey,
    containerRef: marketChipsRef,
    getActiveElement: () => marketChipRefs.current[activeMarketChipIndex],
  })

  const openCompetitionFromLeague = (leagueId: string) => {
    if (disableInteractions) return

    const target = getCompetitionLinkTarget(leagueId)
    if (!target) return
    onOpenCompetition?.(target)
  }

  const toLiveEventMatch = (league: League, match: Match): LiveEventMatch => ({
    id: match.id,
    leagueId: league.id,
    leagueName: league.name,
    leagueFlag: league.flag,
    sport: league.sport,
    isLive: false,
    time: match.dateTime,
    dateTime: match.dateTime,
    currentTime: match.dateTime,
    homeTeam: {
      ...match.homeTeam,
      score: 0,
    },
    awayTeam: {
      ...match.awayTeam,
      score: 0,
    },
    odds: match.odds,
    doubleChanceOdds: match.doubleChanceOdds,
    bothTeamsScoreOdds: match.bothTeamsScoreOdds,
    totalGoalsOdds: match.totalGoalsOdds,
    totalCornersOdds: match.totalCornersOdds,
    totalPointsOdds: match.totalPointsOdds,
    handicapOdds: match.handicapOdds,
    q3TotalOdds: match.q3TotalOdds,
    q4TotalOdds: match.q4TotalOdds,
    extraBets: match.extraBets,
  })

  const openPreMatchEvent = (league: League, selectedIndex: number) => {
    if (disableInteractions) return

    const selectedMatch = league.matches[selectedIndex]
    if (!selectedMatch) return

    const eventEntries = filteredLeagues.flatMap((eventLeague) => (
      eventLeague.matches.map((match) => ({ league: eventLeague, match }))
    ))
    const selectedEventIndex = eventEntries.findIndex(({ league: eventLeague, match }) => (
      eventLeague.id === league.id && match.id === selectedMatch.id
    ))

    const currentTimes = eventEntries.reduce<Record<string, string>>((times, { match }) => {
      times[match.id] = match.dateTime
      return times
    }, {})

    onMatchClick?.({
      matches: eventEntries.map(({ league: eventLeague, match }) => toLiveEventMatch(eventLeague, match)),
      selectedIndex: Math.max(0, selectedEventIndex),
      leagueName: league.name,
      leagueFlag: league.flag,
      sport: league.sport,
      currentTimes,
    })
  }

  const toggleLeague = (leagueId: string) => {
    setOpenLeagues((prev) =>
      prev.includes(leagueId)
        ? prev.filter((id) => id !== leagueId)
        : [...prev, leagueId]
    )
  }

  const getDisabledOddButtonProps = () => ({
    type: 'button' as const,
    className: 'prematch-section__odd-btn',
    disabled: true,
    'aria-disabled': true,
  })

  return (
    <section id="section-breve" className="prematch-section" ref={sectionRef}>
      {/* Header */}
      <div className="prematch-section__header">
        <div className="prematch-section__title">
          <span>Começa em Breve</span>
          <CaretRightIcon aria-hidden="true" className="prematch-section__arrow" weight="bold" />
        </div>
      </div>

      {/* Sport Chips */}
      <div className="prematch-section__chips sliding-chip-group" ref={sportChipsRef}>
        <span className="sliding-chip-indicator" aria-hidden="true" />
        {sportChips.map((chip, index) => (
          <button
            key={chip.id}
            ref={(el) => { sportChipRefs.current[index] = el }}
            className={`prematch-section__chip sliding-chip ${activeSport === chip.id ? 'prematch-section__chip--active' : ''} ${chip.disabled ? 'prematch-section__chip--disabled' : ''}`}
            onClick={() => {
              if (disableInteractions) return
              if (chip.disabled) return
              setActiveSport(chip.id)
              setActiveMarket(chip.id === 'basquete' ? 'vencedor' : 'resultado-final')
              // Scroll to make chip visible
              const chipEl = sportChipRefs.current[index]
              const containerEl = sportChipsRef.current
              if (chipEl && containerEl) {
                const chipLeft = chipEl.offsetLeft
                const chipWidth = chipEl.offsetWidth
                const containerWidth = containerEl.offsetWidth
                const containerScroll = containerEl.scrollLeft
                const padding = 12
                if (chipLeft + chipWidth > containerScroll + containerWidth - padding) {
                  containerEl.scrollTo({ left: chipLeft - padding, behavior: 'smooth' })
                } else if (chipLeft < containerScroll + padding) {
                  containerEl.scrollTo({ left: chipLeft - padding, behavior: 'smooth' })
                }
              }
            }}
            disabled={disableInteractions || chip.disabled}
            aria-disabled={disableInteractions || chip.disabled}
          >
            <img src={chip.icon} alt="" className="prematch-section__chip-icon" />
            <span data-text={chip.label}>{chip.label}</span>
          </button>
        ))}
      </div>

      {/* Market Chips */}
      <div className={`prematch-section__chips prematch-section__chips--sticky sliding-chip-group sliding-chip-group--indicator-ready${marketStickyState.isStuck ? ' prematch-section__chips--sticky-stuck' : ''}${marketStickyState.isVisible ? '' : ' prematch-section__chips--sticky-hidden'}`} ref={marketChipsRef}>
        <span className="sliding-chip-indicator" aria-hidden="true" />
        {currentMarketChips.map((chip, index) => (
          <button
            key={chip.id}
            ref={(el) => { marketChipRefs.current[index] = el }}
            className={`prematch-section__chip prematch-section__chip--market sliding-chip ${activeMarket === chip.id ? 'prematch-section__chip--active' : ''}`}
            onClick={() => {
              if (disableInteractions) return

              if (chip.id !== activeMarket) {
                marketScrollAnchorRef.current = getMarketScrollAnchor()
              }
              setActiveMarket(chip.id)
              // Scroll to make chip visible
              const chipEl = marketChipRefs.current[index]
              const containerEl = marketChipsRef.current
              if (chipEl && containerEl) {
                const chipLeft = chipEl.offsetLeft
                const chipWidth = chipEl.offsetWidth
                const containerWidth = containerEl.offsetWidth
                const containerScroll = containerEl.scrollLeft
                const padding = 12
                if (chipLeft + chipWidth > containerScroll + containerWidth - padding) {
                  containerEl.scrollTo({ left: chipLeft - padding, behavior: 'smooth' })
                } else if (chipLeft < containerScroll + padding) {
                  containerEl.scrollTo({ left: chipLeft - padding, behavior: 'smooth' })
                }
              }
            }}
            disabled={disableInteractions}
            aria-disabled={disableInteractions}
          >
            <span data-text={chip.label}>{chip.label}</span>
          </button>
        ))}
      </div>

      {/* Leagues */}
      <div className="prematch-section__leagues">
        {filteredLeagues.map((league) => (
          <div key={league.id} className={`prematch-section__league ${openLeagues.includes(league.id) ? 'prematch-section__league--open' : ''}`}>
            {/* League Header */}
            <button
              className="prematch-section__league-header"
              onClick={() => toggleLeague(league.id)}
            >
              <div className="prematch-section__league-title">
                <img src={league.flag} alt="" className="prematch-section__league-flag" />
                <span>{league.name}</span>
              </div>
              <CaretUpIcon
                aria-hidden="true"
                className={`prematch-section__accordion-icon ${openLeagues.includes(league.id) ? 'prematch-section__accordion-icon--open' : ''}`}
                weight="bold"
              />
            </button>

            {/* League Matches with Animation */}
            {league.matches.length > 0 && (
              <div className={`prematch-section__matches-wrapper ${openLeagues.includes(league.id) ? 'prematch-section__matches-wrapper--open' : ''}`}>
                <div className="prematch-section__matches-inner">
                  <div className="prematch-section__matches">
                    {league.matches.map((match, matchIndex) => {
                      const eventId = getBetslipEventId({
                        sport: league.sport,
                        homeTeam: match.homeTeam.name,
                        awayTeam: match.awayTeam.name,
                      })
                      const marketLabel = currentMarketChips.find((chip) => chip.id === activeMarket)?.label
                      const matchPlayerProps = isPlayerPropsMarket(league.sport, activeMarket)
                        ? getMatchPlayerProps(match, league.sport, activeMarket).map((player) => ({
                          ...player,
                          eventId,
                          marketId: activeMarket,
                          marketLabel,
                          eventStatus: 'prematch' as const,
                          leagueId: league.id,
                          leagueName: league.name,
                          homeTeam: match.homeTeam.name,
                          awayTeam: match.awayTeam.name,
                          eventTimeLabel: match.dateTime,
                        }))
                        : []

                      if (isPlayerPropsMarket(league.sport, activeMarket) && matchPlayerProps.length === 0) {
                        return null
                      }

                      const renderOddButton = (outcomeId: string, label: ReactNode, value: ReactNode) => {
                        const betslipKey = getMatchOddBetslipKey({
                          sport: league.sport,
                          homeTeam: match.homeTeam.name,
                          awayTeam: match.awayTeam.name,
                          marketId: activeMarket,
                          outcomeId,
                          label,
                        })

                        return (
                          <button
                            {...(disableInteractions
                              ? getDisabledOddButtonProps()
                              : getOddButtonProps(
                                  `${betslipKey.groupId}:${betslipKey.outcomeId}`,
                                  betslipKey.groupId,
                                  'prematch-section__odd-btn',
                                  createBetslipSelection({
                                    eventId,
                                    marketId: betslipKey.marketId,
                                    outcomeId: betslipKey.outcomeId,
                                    label,
                                    odd: value,
                                    marketLabel,
                                    eventStatus: 'prematch',
                                    sport: league.sport,
                                    leagueId: league.id,
                                    leagueName: league.name,
                                    homeTeam: match.homeTeam.name,
                                    awayTeam: match.awayTeam.name,
                                    eventTimeLabel: match.dateTime,
                                    badgeType: 'boost',
                                  })
                                ))}
                          >
                            <span className="prematch-section__odd-team">{label}</span>
                            <span className="prematch-section__odd-value">{value}</span>
                          </button>
                        )
                      }

                      return (
                      <div
                        key={match.id}
                        data-prematch-match-key={`${league.id}:${match.id}`}
                        className={`prematch-section__match${!disableInteractions && onMatchClick ? ' prematch-section__match--clickable' : ''}${isPlayerPropsMarket(league.sport, activeMarket) ? ' prematch-section__match--player-props' : ''}`}
                        onClick={!disableInteractions && onMatchClick ? () => openPreMatchEvent(league, matchIndex) : undefined}
                      >
                        {/* Match Header */}
                        <div className="prematch-section__match-header">
                          <div className="prematch-section__teams-compact">
                            <div className="prematch-section__team-row">
                              <PreMatchTeamIcon
                                teamName={match.homeTeam.name}
                                currentIcon={match.homeTeam.icon}
                                sport={league.sport}
                              />
                              <span className="prematch-section__team-name">{match.homeTeam.name}</span>
                            </div>
                            <div className="prematch-section__team-row">
                              <PreMatchTeamIcon
                                teamName={match.awayTeam.name}
                                currentIcon={match.awayTeam.icon}
                                sport={league.sport}
                              />
                              <span className="prematch-section__team-name">{match.awayTeam.name}</span>
                            </div>
                          </div>
                          <div className="prematch-section__match-info">
                            {match.extraBets && (activeMarket === 'resultado-final' || activeMarket === 'vencedor' || isPlayerPropsMarket(league.sport, activeMarket)) ? (
                              <button 
                                type="button"
                                className="prematch-section__match-info-content prematch-section__match-info-content--clickable"
                                disabled={disableInteractions}
                                onClick={(e) => { e.stopPropagation(); openReiAntecipaSheet(league.sport as 'futebol' | 'basquete'); }}
                              >
                                <div className="prematch-section__pag-antecipado">
                                  <span className="prematch-section__pag-antecipado-label">Pag. Antecipado</span>
                                  <img 
                                    src={pagamentoAntecipado} 
                                    alt="" 
                                    className="prematch-section__rei-antecipa" 
                                  />
                                </div>
                            <span className="prematch-section__match-datetime">{match.dateTime}</span>
                              </button>
                            ) : (
                              <div className="prematch-section__match-info-content">
                                <span className="prematch-section__match-datetime">{match.dateTime}</span>
                              </div>
                            )}
                            <CaretRightIcon aria-hidden="true" className="prematch-section__match-arrow" weight="bold" />
                          </div>
                        </div>

                        {/* Odds */}
                        {isPlayerPropsMarket(league.sport, activeMarket) ? (
                          <div
                            key={`${match.id}-${activeMarket}-player-props`}
                            className="prematch-section__player-props"
                            aria-label={`Jogadores de ${match.homeTeam.name} x ${match.awayTeam.name}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {matchPlayerProps.map((player) => (
                              <PreMatchPlayerPropCard key={player.id} player={player} disableInteractions={disableInteractions} />
                            ))}
                          </div>
                        ) : (
                        <div key={`${match.id}-${activeMarket}-odds`} className="prematch-section__odds">
                          {/* Football Markets */}
                          {activeMarket === 'dupla-chance' && match.doubleChanceOdds ? (
                            <>
                              {renderOddButton('home-or-draw', 'Casa ou Empate', match.doubleChanceOdds.homeOrDraw)}
                              {renderOddButton('home-or-away', 'Casa ou Fora', match.doubleChanceOdds.homeOrAway)}
                              {renderOddButton('away-or-draw', 'Fora ou Empate', match.doubleChanceOdds.awayOrDraw)}
                            </>
                          ) : activeMarket === 'ambos-marcam' && match.bothTeamsScoreOdds ? (
                            <>
                              {renderOddButton('yes', 'Sim', match.bothTeamsScoreOdds.yes)}
                              {renderOddButton('no', 'Não', match.bothTeamsScoreOdds.no)}
                            </>
                          ) : activeMarket === 'total-gols' && match.totalGoalsOdds ? (
                            <>
                              {renderOddButton('under', `Menos de ${match.totalGoalsOdds.line}`, match.totalGoalsOdds.under)}
                              {renderOddButton('over', `Mais de ${match.totalGoalsOdds.line}`, match.totalGoalsOdds.over)}
                            </>
                          ) : activeMarket === 'escanteios' && match.totalCornersOdds ? (
                            <>
                              {renderOddButton('under-corners', `Menos de ${match.totalCornersOdds.line}`, match.totalCornersOdds.under)}
                              {renderOddButton('over-corners', `Mais de ${match.totalCornersOdds.line}`, match.totalCornersOdds.over)}
                            </>
                          ) : activeMarket === 'total-pontos' && match.totalPointsOdds ? (
                            /* Basketball: Total de Pontos */
                            <>
                              {renderOddButton('under-points', `Menos de ${match.totalPointsOdds.line}`, match.totalPointsOdds.under)}
                              {renderOddButton('over-points', `Mais de ${match.totalPointsOdds.line}`, match.totalPointsOdds.over)}
                            </>
                          ) : activeMarket === 'handicap' && match.handicapOdds ? (
                            /* Basketball: Handicap */
                            <>
                              {renderOddButton('home-handicap', `${match.homeTeam.name} ${match.handicapOdds.line > 0 ? '+' : ''}${match.handicapOdds.line}`, match.handicapOdds.home)}
                              {renderOddButton('away-handicap', `${match.awayTeam.name} ${match.handicapOdds.line > 0 ? '' : '+'}${-match.handicapOdds.line}`, match.handicapOdds.away)}
                            </>
                          ) : activeMarket === 'q3-total' && match.q3TotalOdds ? (
                            /* Basketball: 3° Quarto - Total de Pontos */
                            <>
                              {renderOddButton('under-q3', `Menos de ${match.q3TotalOdds.line}`, match.q3TotalOdds.under)}
                              {renderOddButton('over-q3', `Mais de ${match.q3TotalOdds.line}`, match.q3TotalOdds.over)}
                            </>
                          ) : activeMarket === 'q4-total' && match.q4TotalOdds ? (
                            /* Basketball: 4° Quarto - Total de Pontos */
                            <>
                              {renderOddButton('under-q4', `Menos de ${match.q4TotalOdds.line}`, match.q4TotalOdds.under)}
                              {renderOddButton('over-q4', `Mais de ${match.q4TotalOdds.line}`, match.q4TotalOdds.over)}
                            </>
                          ) : activeMarket === 'vencedor' || activeSport === 'basquete' ? (
                            /* Basketball: Vencedor (no draw) */
                            <>
                              {renderOddButton('home', match.homeTeam.name, match.odds.home)}
                              {renderOddButton('away', match.awayTeam.name, match.odds.away)}
                            </>
                          ) : (
                            /* Football: Resultado Final (default) */
                            <>
                              {renderOddButton('home', match.homeTeam.name, match.odds.home)}
                              {renderOddButton('draw', 'Empate', match.odds.draw)}
                              {renderOddButton('away', match.awayTeam.name, match.odds.away)}
                            </>
                          )}
                        </div>
                        )}
                      </div>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    className="prematch-section__league-more"
                    disabled={disableInteractions}
                    onClick={() => openCompetitionFromLeague(league.id)}
                  >
                    <span>Veja mais {league.name}</span>
                    <CaretRightIcon aria-hidden="true" className="prematch-section__league-more-icon" weight="bold" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* More Button */}
      <div className="prematch-section__more">
        <button className="prematch-section__more-btn" disabled={disableInteractions}>
          <span>Mais {activeSport === 'basquete' ? 'Basquete' : 'Futebol'}</span>
          <CaretRightIcon aria-hidden="true" className="prematch-section__more-icon" weight="bold" />
        </button>
      </div>

      {/* Bottom Sheet - Rei Antecipa */}
      <ReiAntecipaBottomSheet
        isOpen={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        sport={bottomSheetSport}
      />
    </section>
  )
}
