import type { ReactNode } from 'react'
import { CaretRightIcon, MonitorPlayIcon } from '@phosphor-icons/react'
import iconAoVivo from '../../assets/iconAoVivo.png'
import { getTennisPlayerCountryIcon } from '../../data/tennisCountryIcons'
import { getLocalPlayerImage } from '../../data/playerImages'
import { useSportsDbTeamLogo } from '../../shared/hooks/useSportsDbTeamLogo'
import playerAvatarFutebol from '../../assets/playerAvatarFutebol.svg'
import playerAvatarBasquete from '../../assets/playerAvatarBasquete.svg'
import arrascaetaProps from '../../assets/arrascaetaProps.png'
import pedroProps from '../../assets/pedroProps.png'
import depayProps from '../../assets/depayProps.png'
import yuriProps from '../../assets/yuriProps.png'
import flacoLopezProps from '../../assets/flacoLopezProps.png'
import playerRaphinha from '../../assets/playerRaphinha.png'
import playerLewa from '../../assets/playerLewa.png'
import playerYamal from '../../assets/playerYamal.png'
import playerJimmyButler from '../../assets/playerJimmyButler.png'
import playerLeBronJames from '../../assets/playerLeBronJames.png'
import playerLukaDoncic from '../../assets/playerLukaDoncic.png'
import playerStephenCurry from '../../assets/playerStephenCurry.png'
import {
  PreMatchPlayerPropCard,
  type MatchPlayerProp,
  type PlayerPropOption,
  type TeamPlayerProfile,
} from '../PreMatchSection/PreMatchSection'
import { useOddSelection } from '../../shared/hooks/useOddSelection'
import { createBetslipSelection, getBetslipEventId, getMatchOddBetslipKey } from '../../shared/hooks/betslipUtils'
import '../LiveSection/LiveSection.css'

export interface LiveMatchCardMatch {
  id: string
  leagueId?: string
  leagueName?: string
  time: string
  homeTeam: { name: string; icon: string; score: number }
  awayTeam: { name: string; icon: string; score: number }
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
  totalPointsOdds?: {
    line: number
    under: string
    over: string
  }
  totalGamesOdds?: {
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
}

interface LiveMatchCardProps {
  match: LiveMatchCardMatch
  sport: string
  activeMarket: string
  currentTime: string
  disableInteractions?: boolean
  onClick?: () => void
}

const LIVE_PLAYER_PROPS_PER_MATCH = 3
const LIVE_FOOTBALL_FINISHING_MARKET_ID = 'finalizacao-gol'
const LIVE_FOOTBALL_ASSISTS_MARKET_ID = 'assistencias'
const LIVE_BASKETBALL_PLAYER_POINTS_MARKET_ID = 'pontos-jogador'
const LIVE_BASKETBALL_PLAYER_ASSISTS_MARKET_ID = 'assistencias'

const livePlayerPropOptions = (values: Array<[string, string]>): PlayerPropOption[] =>
  values.map(([label, odd], index) => ({ label, odd, active: index === 1 }))

const liveFootballFinishingOptionSets = [
  livePlayerPropOptions([['3.0+', '1.78x'], ['4.0+', '1.78x'], ['5.0+', '1.78x']]),
  livePlayerPropOptions([['2.0+', '1.55x'], ['3.0+', '1.92x'], ['4.0+', '2.70x']]),
  livePlayerPropOptions([['1.0+', '1.48x'], ['2.0+', '2.05x'], ['3.0+', '3.60x']]),
]

const liveFootballAssistOptionSets = [
  livePlayerPropOptions([['1.0+', '1.68x'], ['2.0+', '2.35x'], ['3.0+', '4.20x']]),
  livePlayerPropOptions([['1.0+', '1.74x'], ['2.0+', '2.50x'], ['3.0+', '4.60x']]),
  livePlayerPropOptions([['1.0+', '1.82x'], ['2.0+', '2.70x'], ['3.0+', '5.10x']]),
]

const liveBasketballPlayerPointOptionSets = [
  livePlayerPropOptions([['15.5+', '1.62x'], ['20.5+', '1.95x'], ['25.5+', '3.05x']]),
  livePlayerPropOptions([['12.5+', '1.58x'], ['17.5+', '1.88x'], ['22.5+', '2.80x']]),
  livePlayerPropOptions([['8.5+', '1.54x'], ['13.5+', '1.82x'], ['18.5+', '2.60x']]),
]

const liveBasketballPlayerAssistOptionSets = [
  livePlayerPropOptions([['1.0+', '1.70x'], ['2.0+', '2.15x'], ['3.0+', '3.40x']]),
  livePlayerPropOptions([['1.0+', '1.62x'], ['2.0+', '1.95x'], ['3.0+', '2.90x']]),
  livePlayerPropOptions([['1.0+', '1.54x'], ['2.0+', '1.82x'], ['3.0+', '2.55x']]),
]

const normalizeLivePlayerImageKey = (playerName: string) =>
  playerName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const livePlayerImagesByName: Record<string, string> = {
  arrascaeta: arrascaetaProps,
  'giorgian-de-arrascaeta': arrascaetaProps,
  pedro: pedroProps,
  'memphis-depay': depayProps,
  depay: depayProps,
  'yuri-alberto': yuriProps,
  'flaco-lopez': flacoLopezProps,
  raphinha: playerRaphinha,
  lewandowski: playerLewa,
  'r-lewandowski': playerLewa,
  'robert-lewandowski': playerLewa,
  yamal: playerYamal,
  'l-yamal': playerYamal,
  'lamine-yamal': playerYamal,
  'jimmy-butler': playerJimmyButler,
  'lebron-james': playerLeBronJames,
  'luka-doncic': playerLukaDoncic,
  'stephen-curry': playerStephenCurry,
}

const getLivePlayerImage = (playerName: string, teamName: string, sport: string) =>
  getLocalPlayerImage(teamName, playerName) ??
  livePlayerImagesByName[normalizeLivePlayerImageKey(playerName)] ??
  (sport === 'basquete' ? playerAvatarBasquete : playerAvatarFutebol)

const liveFootballFinishingPlayersByTeam: Record<string, TeamPlayerProfile[]> = {
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
  'São Paulo': [
    { name: 'Calleri', position: 'ATA' },
    { name: 'Luciano', position: 'ATA' },
    { name: 'Lucas Moura', position: 'MEI' },
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
  'Manchester City': [
    { name: 'Haaland', position: 'ATA' },
    { name: 'Foden', position: 'MEI' },
    { name: 'De Bruyne', position: 'MEI' },
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
  Getafe: [
    { name: 'Mayoral', position: 'ATA' },
    { name: 'Greenwood', position: 'ATA' },
    { name: 'Latasa', position: 'ATA' },
  ],
  Elche: [
    { name: 'Boye', position: 'ATA' },
    { name: 'Pere Milla', position: 'ATA' },
    { name: 'Mojica', position: 'LAT' },
  ],
  'B. Leverkusen': [
    { name: 'Wirtz', position: 'MEI' },
    { name: 'Boniface', position: 'ATA' },
    { name: 'Grimaldo', position: 'LAT' },
  ],
  Bayern: [
    { name: 'Harry Kane', position: 'ATA' },
    { name: 'Musiala', position: 'MEI' },
    { name: 'Sane', position: 'ATA' },
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

const liveFootballAssistPlayersByTeam: Record<string, TeamPlayerProfile[]> = {
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
  'São Paulo': [
    { name: 'Lucas Moura', position: 'MEI' },
    { name: 'Luciano', position: 'MEI' },
    { name: 'Alisson', position: 'MEI' },
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
  'Manchester City': [
    { name: 'De Bruyne', position: 'MEI' },
    { name: 'Foden', position: 'MEI' },
    { name: 'Bernardo Silva', position: 'MEI' },
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
  Getafe: [
    { name: 'Maksimovic', position: 'MEI' },
    { name: 'Alena', position: 'MEI' },
    { name: 'Milla', position: 'MEI' },
  ],
  Elche: [
    { name: 'Fidel', position: 'MEI' },
    { name: 'Febas', position: 'MEI' },
    { name: 'Josan', position: 'MEI' },
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
    { name: 'Pepe', position: 'MEI' },
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

const liveBasketballPointPlayersByTeam: Record<string, TeamPlayerProfile[]> = {
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
  'AEPS Machitis': [
    { name: 'Nikos Kalaitzis', position: 'ARM' },
    { name: 'Petros Liapis', position: 'ALA' },
    { name: 'Giorgos Pavlidis', position: 'PIV' },
  ],
  'ASA Koroivos': [
    { name: 'Dimitris Stamatis', position: 'ARM' },
    { name: 'Vasilis Mouratos', position: 'ARM' },
    { name: 'Kostas Iatridis', position: 'ALA' },
  ],
  'Southern Wesleyan': [
    { name: 'Jacob Smith', position: 'ARM' },
    { name: 'Marcus Brown', position: 'ALA' },
    { name: 'Tyler Johnson', position: 'PIV' },
  ],
  'Kennesaw State': [
    { name: 'Terrell Burden', position: 'ARM' },
    { name: 'Demond Robinson', position: 'PIV' },
    { name: 'Chris Youngblood', position: 'ALA' },
  ],
  'Vanoli Cremona': [
    { name: 'Andrea Pecchia', position: 'ALA' },
    { name: 'Trevor Lacey', position: 'ARM' },
    { name: 'Paul Eboua', position: 'PIV' },
  ],
  Varese: [
    { name: 'Nico Mannion', position: 'ARM' },
    { name: 'Gabe Brown', position: 'ALA' },
    { name: 'Davide Alviti', position: 'ALA' },
  ],
  'Virtus Bologna': [
    { name: 'Tornike Shengelia', position: 'ALA' },
    { name: 'Marco Belinelli', position: 'ARM' },
    { name: 'Daniel Hackett', position: 'ARM' },
  ],
  Tortona: [
    { name: 'Tommaso Baldasso', position: 'ARM' },
    { name: 'Kyle Weems', position: 'ALA' },
    { name: 'Ismael Kamagate', position: 'PIV' },
  ],
  Beroe: [
    { name: 'Darius Hall', position: 'ALA' },
    { name: 'Aleksandar Yanev', position: 'ALA' },
    { name: 'Ivan Lilov', position: 'ARM' },
  ],
  'Balkan Botevgrad': [
    { name: 'Dimitar Dimitrov', position: 'ALA' },
    { name: 'Manny Suarez', position: 'PIV' },
    { name: 'Nikolay Grozev', position: 'ARM' },
  ],
}

const isLivePlayerPropsMarket = (sport: string, marketId: string) =>
  sport === 'basquete'
    ? marketId === LIVE_BASKETBALL_PLAYER_POINTS_MARKET_ID ||
      marketId === LIVE_BASKETBALL_PLAYER_ASSISTS_MARKET_ID
    : sport === 'futebol' && (
      marketId === LIVE_FOOTBALL_FINISHING_MARKET_ID ||
      marketId === LIVE_FOOTBALL_ASSISTS_MARKET_ID
    )

const liveMarketLabels: Record<string, string> = {
  'resultado-final': 'Resultado Final',
  vencedor: 'Resultado Final',
  'dupla-chance': 'Dupla Chance',
  'ambos-marcam': 'Ambos Marcam',
  'total-gols': 'Total de Gols',
  escanteios: 'Total de Escanteios',
  'total-pontos': 'Total de Pontos',
  handicap: 'Handicap',
  'handicap-games': 'Handicap de Games',
  'total-games': 'Total de Games',
  'q3-total': '3° Quarto - Total de Pontos',
  'q4-total': '4° Quarto - Total de Pontos',
  [LIVE_FOOTBALL_FINISHING_MARKET_ID]: 'Finalizações ao Gol',
  [LIVE_FOOTBALL_ASSISTS_MARKET_ID]: 'Assistências',
  [LIVE_BASKETBALL_PLAYER_POINTS_MARKET_ID]: 'Pontos do Jogador',
}

const livePlayerTeamAliases: Record<string, string> = {
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

const getLiveTeamPlayerProfiles = (
  playersByTeam: Record<string, TeamPlayerProfile[]>,
  teamName: string
) => {
  const trimmedTeamName = teamName.trim()
  const alias = livePlayerTeamAliases[trimmedTeamName]

  return playersByTeam[trimmedTeamName] ?? (alias ? playersByTeam[alias] : undefined) ?? []
}

// eslint-disable-next-line react-refresh/only-export-components
export const getLivePlayerProps = (
  match: LiveMatchCardMatch,
  sport: string,
  marketId: string,
  playerLimit = LIVE_PLAYER_PROPS_PER_MATCH
): MatchPlayerProp[] => {
  const optionSets = sport === 'basquete'
    ? marketId === LIVE_BASKETBALL_PLAYER_ASSISTS_MARKET_ID
      ? liveBasketballPlayerAssistOptionSets
      : liveBasketballPlayerPointOptionSets
    : marketId === LIVE_FOOTBALL_ASSISTS_MARKET_ID
      ? liveFootballAssistOptionSets
      : liveFootballFinishingOptionSets
  const playersByTeam = sport === 'basquete'
    ? liveBasketballPointPlayersByTeam
    : marketId === LIVE_FOOTBALL_ASSISTS_MARKET_ID
      ? liveFootballAssistPlayersByTeam
      : liveFootballFinishingPlayersByTeam
  const homePlayers = getLiveTeamPlayerProfiles(playersByTeam, match.homeTeam.name)
  const awayPlayers = getLiveTeamPlayerProfiles(playersByTeam, match.awayTeam.name)
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
      id: `${match.id}-${marketId}-${player.teamName}-${player.name}`,
      playerName: player.name,
      teamName: player.teamName,
      teamIcon: player.teamIcon,
      teamSide: player.teamSide,
      sport,
      position: player.position,
      image: getLivePlayerImage(player.name, player.teamName, sport),
      options: optionSets[players.length % optionSets.length],
    })
    return players
  }, [])
}

export function LiveMatchCard({
  match,
  sport,
  activeMarket,
  currentTime,
  disableInteractions = false,
  onClick,
}: LiveMatchCardProps) {
  const isBasketball = sport === 'basquete'
  const isTennis = sport === 'tenis'
  const isPlayerProps = isLivePlayerPropsMarket(sport, activeMarket)
  const homeCurrentIcon = isTennis
    ? getTennisPlayerCountryIcon(match.homeTeam.name, match.homeTeam.icon)
    : match.homeTeam.icon
  const awayCurrentIcon = isTennis
    ? getTennisPlayerCountryIcon(match.awayTeam.name, match.awayTeam.icon)
    : match.awayTeam.icon
  const homeTeamIcon = useSportsDbTeamLogo(match.homeTeam.name, homeCurrentIcon, sport, undefined, {
    useCurrentLogoFallback: true,
  })
  const awayTeamIcon = useSportsDbTeamLogo(match.awayTeam.name, awayCurrentIcon, sport, undefined, {
    useCurrentLogoFallback: true,
  })
  const getOddButtonProps = useOddSelection('live-section__odd-btn')
  const eventId = getBetslipEventId({
    sport,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
  })
  const matchPlayerProps = isPlayerProps
    ? getLivePlayerProps(match, sport, activeMarket).map((player) => ({
      ...player,
      eventId,
      marketId: activeMarket,
      marketLabel: liveMarketLabels[activeMarket],
      eventStatus: 'live' as const,
      leagueId: match.leagueId,
      leagueName: match.leagueName,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      eventTimeLabel: currentTime,
      liveClock: currentTime,
      homeScore: match.homeTeam.score,
      awayScore: match.awayTeam.score,
    }))
    : []

  if (isPlayerProps && matchPlayerProps.length === 0) return null

  const marketLabel = liveMarketLabels[activeMarket]
  const getMatchSelectionIcon = (outcomeId: string, label: ReactNode) => {
    if (outcomeId.startsWith('home') || label === match.homeTeam.name) return homeTeamIcon
    if (outcomeId.startsWith('away') || label === match.awayTeam.name) return awayTeamIcon

    return homeTeamIcon || awayTeamIcon
  }
  const getMatchOddButtonProps = (outcomeId: string, label: ReactNode, value: ReactNode) => {
    if (disableInteractions) {
      return {
        type: 'button' as const,
        className: 'live-section__odd-btn',
        disabled: true,
        'aria-disabled': true,
      }
    }

    const betslipKey = getMatchOddBetslipKey({
      sport,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      marketId: activeMarket,
      outcomeId,
      label,
    })

    return getOddButtonProps(
      `${betslipKey.groupId}:${betslipKey.outcomeId}`,
      betslipKey.groupId,
      'live-section__odd-btn',
      createBetslipSelection({
        eventId,
        marketId: betslipKey.marketId,
        outcomeId: betslipKey.outcomeId,
        label,
        odd: value,
        marketLabel,
        eventStatus: 'live',
        sport,
        leagueId: match.leagueId,
        leagueName: match.leagueName,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        eventTimeLabel: currentTime,
        liveClock: currentTime,
        homeScore: match.homeTeam.score,
        awayScore: match.awayTeam.score,
        homeTeamIcon,
        awayTeamIcon,
        selectionIcon: getMatchSelectionIcon(outcomeId, label),
      })
    )
  }
  const renderOddButton = (outcomeId: string, label: ReactNode, value: ReactNode) => (
    <button {...getMatchOddButtonProps(outcomeId, label, value)}>
      <span className="live-section__odd-team">{label}</span>
      <span className="live-section__odd-value">{value}</span>
    </button>
  )

  const renderTeamIcon = (icon: string | undefined) => {
    if (icon) return <img src={icon} alt="" className="live-section__team-icon" />
    return <div className="live-section__team-icon--placeholder" />
  }

  return (
    <div
      className={`live-section__match${isPlayerProps ? ' live-section__match--player-props' : ''}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className="live-section__match-header">
        <div className="live-section__match-time">
          <div className="live-section__tag-aovivo">
            <div className="live-section__tag-icon-wrapper">
              <img src={iconAoVivo} alt="" className="live-section__tag-icon" />
            </div>
            <span>Ao Vivo</span>
          </div>
          <span>{currentTime}</span>
        </div>
        <div className="live-section__match-header-actions">
          <MonitorPlayIcon aria-hidden="true" className="live-section__stream-icon" weight="bold" />
          <CaretRightIcon aria-hidden="true" className="live-section__match-arrow" weight="bold" />
        </div>
      </div>

      <div className="live-section__teams">
        <div className="live-section__team">
          <div className="live-section__team-info">
            {renderTeamIcon(homeTeamIcon)}
            <span className="live-section__team-name">{match.homeTeam.name}</span>
          </div>
          {!isTennis && (
            <div className="live-section__team-score">
              <span>{match.homeTeam.score}</span>
            </div>
          )}
        </div>
        <div className="live-section__team">
          <div className="live-section__team-info">
            {renderTeamIcon(awayTeamIcon)}
            <span className="live-section__team-name">{match.awayTeam.name}</span>
          </div>
          {!isTennis && (
            <div className="live-section__team-score">
              <span>{match.awayTeam.score}</span>
            </div>
          )}
        </div>
      </div>

      {isPlayerProps ? (
        <div
          key={`${match.id}-${activeMarket}-player-props`}
          className="prematch-section__player-props live-section__player-props"
          aria-label={`Jogadores de ${match.homeTeam.name} x ${match.awayTeam.name}`}
          onClick={(event) => event.stopPropagation()}
        >
          {matchPlayerProps.map((player) => (
            <PreMatchPlayerPropCard key={player.id} player={player} disableInteractions={disableInteractions} />
          ))}
        </div>
      ) : (
      <div key={`${match.id}-${activeMarket}-odds`} className="live-section__odds">
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
          <>
            {renderOddButton('under-points', `Menos de ${match.totalPointsOdds.line}`, match.totalPointsOdds.under)}
            {renderOddButton('over-points', `Mais de ${match.totalPointsOdds.line}`, match.totalPointsOdds.over)}
          </>
        ) : activeMarket === 'handicap' && match.handicapOdds ? (
          <>
            {renderOddButton('home-handicap', `${match.homeTeam.name} ${match.handicapOdds.line > 0 ? '+' : ''}${match.handicapOdds.line}`, match.handicapOdds.home)}
            {renderOddButton('away-handicap', `${match.awayTeam.name} ${match.handicapOdds.line > 0 ? '' : '+'}${-match.handicapOdds.line}`, match.handicapOdds.away)}
          </>
        ) : activeMarket === 'handicap-games' && match.handicapOdds ? (
          <>
            {renderOddButton('home-handicap-games', `${match.homeTeam.name} ${match.handicapOdds.line > 0 ? '+' : ''}${match.handicapOdds.line}`, match.handicapOdds.home)}
            {renderOddButton('away-handicap-games', `${match.awayTeam.name} ${match.handicapOdds.line > 0 ? '' : '+'}${-match.handicapOdds.line}`, match.handicapOdds.away)}
          </>
        ) : activeMarket === 'total-games' && match.totalGamesOdds ? (
          <>
            {renderOddButton('under-games', `Menos de ${match.totalGamesOdds.line}`, match.totalGamesOdds.under)}
            {renderOddButton('over-games', `Mais de ${match.totalGamesOdds.line}`, match.totalGamesOdds.over)}
          </>
        ) : activeMarket === 'q3-total' && match.q3TotalOdds ? (
          <>
            {renderOddButton('under-q3', `Menos de ${match.q3TotalOdds.line}`, match.q3TotalOdds.under)}
            {renderOddButton('over-q3', `Mais de ${match.q3TotalOdds.line}`, match.q3TotalOdds.over)}
          </>
        ) : activeMarket === 'q4-total' && match.q4TotalOdds ? (
          <>
            {renderOddButton('under-q4', `Menos de ${match.q4TotalOdds.line}`, match.q4TotalOdds.under)}
            {renderOddButton('over-q4', `Mais de ${match.q4TotalOdds.line}`, match.q4TotalOdds.over)}
          </>
        ) : isBasketball || isTennis ? (
          <>
            {renderOddButton('home', match.homeTeam.name, match.odds.home)}
            {renderOddButton('away', match.awayTeam.name, match.odds.away)}
          </>
        ) : (
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
}
