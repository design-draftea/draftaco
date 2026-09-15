import iconBasquete from '../../assets/iconSports/basketball.png'
import iconEsoccer from '../../assets/iconSports/e-soccer.png'
import iconFutebol from '../../assets/iconSports/soccer.png'
import iconNfl from '../../assets/iconSports/football.png'
import iconTenis from '../../assets/iconSports/tennis.png'
import iconVolei from '../../assets/iconSports/volleyball.png'

import flagAfricaDoSul from '../../assets/iconPaises/africa-do-sul.png'
import flagAlemanha from '../../assets/iconPaises/alemanha.png'
import flagArgentina from '../../assets/iconPaises/argentina.png'
import flagAustralia from '../../assets/iconPaises/australia.png'
import flagBrasil from '../../assets/iconPaises/brasil.png'
import flagBulgaria from '../../assets/iconPaises/bulgaria.png'
import flagEspanha from '../../assets/iconPaises/espanha.png'
import flagEstadosUnidos from '../../assets/iconPaises/estados-unidos.png'
import flagFranca from '../../assets/iconPaises/franca.png'
import flagGrecia from '../../assets/iconPaises/grecia.png'
import flagInglaterra from '../../assets/iconPaises/inglaterra.png'
import flagItalia from '../../assets/iconPaises/italia.png'
import flagMundo from '../../assets/iconPaises/mundo.png'
import flagRussia from '../../assets/iconPaises/russia.png'

import type { Competition, CompetitionCountry } from '../BottomSheet/CompeticaoBottomSheet'

export interface CompeticaoConfig {
  sportLabel: string
  sportIcon: string
  featuredCompetitions: Competition[]
  topCompetitions: Competition[]
  unifiedTopCompetitions?: Competition[]
  countries: CompetitionCountry[]
}

const futebolConfig: CompeticaoConfig = {
  sportLabel: 'Futebol',
  sportIcon: iconFutebol,
  featuredCompetitions: [
    { id: 'fut-brasileiro', name: 'Brasileirão Série A' },
    { id: 'fut-champions', name: 'Champions League' },
    { id: 'fut-premier-league', name: 'Premier League' },
    { id: 'fut-laliga', name: 'LaLiga' },
    { id: 'fut-mls', name: 'MLS' },
    { id: 'fut-bundesliga', name: 'Bundesliga' },
  ],
  topCompetitions: [
    { id: 'fut-brasileiro', name: 'Brasileirão Série A' },
    { id: 'fut-libertadores', name: 'Libertadores' },
    { id: 'fut-champions', name: 'Champions League' },
    { id: 'fut-sul-americana', name: 'Sul-Americana' },
    { id: 'fut-uefa-liga-europa', name: 'UEFA - Liga Europa' },
  ],
  unifiedTopCompetitions: [
    { id: 'fut-brasileiro', name: 'Brasileirão Série A' },
    { id: 'fut-champions', name: 'Champions League' },
    { id: 'fut-premier-league', name: 'Premier League' },
    { id: 'fut-libertadores', name: 'Libertadores' },
    { id: 'fut-bundesliga', name: 'Bundesliga' },
  ],
  countries: [
    {
      id: 'fut-africa-do-sul',
      name: 'África do Sul',
      flag: flagAfricaDoSul,
      competitions: [
        { id: 'fut-africa-premier', name: 'Premier Soccer League' },
      ],
    },
    {
      id: 'fut-alemanha',
      name: 'Alemanha',
      flag: flagAlemanha,
      competitions: [
        { id: 'fut-bundesliga', name: 'Bundesliga' },
        { id: 'fut-2-bundesliga', name: '2. Bundesliga' },
        { id: 'fut-dfb-pokal', name: 'DFB-Pokal' },
      ],
    },
    {
      id: 'fut-estados-unidos',
      name: 'Estados Unidos',
      flag: flagEstadosUnidos,
      competitions: [
        { id: 'fut-mls', name: 'MLS' },
      ],
    },
    {
      id: 'fut-arabia-saudita',
      name: 'Arábia Saudita',
      flag: flagMundo,
      competitions: [{ id: 'fut-saudi-pro', name: 'Saudi Pro League' }],
    },
    {
      id: 'fut-argentina',
      name: 'Argentina',
      flag: flagArgentina,
      competitions: [
        { id: 'fut-arg-liga-profesional', name: 'Liga Profesional' },
        { id: 'fut-arg-copa-argentina', name: 'Copa Argentina' },
      ],
    },
    {
      id: 'fut-australia',
      name: 'Austrália',
      flag: flagAustralia,
      competitions: [{ id: 'fut-aus-a-league', name: 'A-League' }],
    },
    {
      id: 'fut-brasil',
      name: 'Brasil',
      flag: flagBrasil,
      competitions: [
        { id: 'fut-brasileirao-a', name: 'Brasileirão Série A' },
        { id: 'fut-brasileirao-b', name: 'Brasileirão Série B' },
        { id: 'fut-copa-do-brasil', name: 'Copa do Brasil' },
      ],
    },
    {
      id: 'fut-espanha',
      name: 'Espanha',
      flag: flagEspanha,
      competitions: [
        { id: 'fut-laliga', name: 'LaLiga' },
        { id: 'fut-copa-del-rey', name: 'Copa del Rey' },
      ],
    },
    {
      id: 'fut-inglaterra',
      name: 'Inglaterra',
      flag: flagInglaterra,
      competitions: [
        { id: 'fut-premier-league', name: 'Premier League' },
        { id: 'fut-fa-cup', name: 'FA Cup' },
      ],
    },
    {
      id: 'fut-italia',
      name: 'Itália',
      flag: flagItalia,
      competitions: [
        { id: 'fut-serie-a', name: 'Serie A' },
        { id: 'fut-coppa-italia', name: 'Coppa Italia' },
      ],
    },
  ],
}

const basqueteConfig: CompeticaoConfig = {
  sportLabel: 'Basquete',
  sportIcon: iconBasquete,
  featuredCompetitions: [
    { id: 'bsq-nba', name: 'NBA' },
    { id: 'bsq-ncaab', name: 'NCAAB' },
    { id: 'bsq-nbb', name: 'NBB' },
    { id: 'bsq-euro-cup', name: 'Euro Cup' },
  ],
  topCompetitions: [
    { id: 'bsq-nba', name: 'NBA' },
    { id: 'bsq-ncaab', name: 'NCAAB' },
    { id: 'bsq-nbb', name: 'NBB' },
    { id: 'bsq-euro-cup', name: 'Euro Cup' },
  ],
  unifiedTopCompetitions: [
    { id: 'bsq-nba', name: 'NBA' },
  ],
  countries: [
    {
      id: 'bsq-argentina',
      name: 'Argentina',
      flag: flagArgentina,
      competitions: [{ id: 'bsq-arg-la-liga', name: 'La Liga Nacional' }],
    },
    {
      id: 'bsq-brasil',
      name: 'Brasil',
      flag: flagBrasil,
      competitions: [{ id: 'bsq-br-nbb', name: 'NBB' }],
    },
    {
      id: 'bsq-bulgaria',
      name: 'Bulgária',
      flag: flagBulgaria,
      competitions: [{ id: 'bsq-bul-naf', name: 'NBL' }],
    },
    {
      id: 'bsq-eua',
      name: 'Estados Unidos',
      flag: flagEstadosUnidos,
      competitions: [
        { id: 'bsq-nba-2', name: 'NBA' },
        { id: 'bsq-ncaab', name: 'NCAAB' },
        { id: 'bsq-wnba', name: 'WNBA' },
      ],
    },
    {
      id: 'bsq-grecia',
      name: 'Grécia',
      flag: flagGrecia,
      competitions: [{ id: 'bsq-grc-greek-league', name: 'Greek League' }],
    },
    {
      id: 'bsq-russia',
      name: 'Rússia',
      flag: flagRussia,
      competitions: [{ id: 'bsq-rus-vtb', name: 'VTB United League' }],
    },
  ],
}

const nflConfig: CompeticaoConfig = {
  sportLabel: 'NFL',
  sportIcon: iconNfl,
  featuredCompetitions: [
    { id: 'nfl-liga', name: 'NFL' },
  ],
  topCompetitions: [
    { id: 'nfl-liga', name: 'NFL' },
  ],
  unifiedTopCompetitions: [
    { id: 'nfl-liga', name: 'NFL' },
  ],
  countries: [
    {
      id: 'nfl-eua',
      name: 'Estados Unidos',
      flag: flagEstadosUnidos,
      competitions: [
        { id: 'nfl-liga', name: 'NFL' },
      ],
    },
  ],
}

const tenisConfig: CompeticaoConfig = {
  sportLabel: 'Tênis',
  sportIcon: iconTenis,
  featuredCompetitions: [
    { id: 'ten-roma-masters', name: 'Roma Masters' },
    { id: 'ten-roma-f', name: 'Roma (F)' },
    { id: 'ten-parma-f', name: 'Parma (F)' },
    { id: 'ten-bordeaux', name: 'Bordeaux' },
  ],
  topCompetitions: [
    { id: 'ten-roma-masters', name: 'Roma Masters' },
    { id: 'ten-roma-f', name: 'Roma (F)' },
    { id: 'ten-parma-f', name: 'Parma (F)' },
    { id: 'ten-bordeaux', name: 'Bordeaux' },
  ],
  countries: [
    {
      id: 'ten-italia',
      name: 'Itália',
      flag: flagItalia,
      competitions: [
        { id: 'ten-roma-masters', name: 'Roma Masters' },
        { id: 'ten-roma-f', name: 'Roma (F)' },
        { id: 'ten-parma-f', name: 'Parma (F)' },
      ],
    },
    {
      id: 'ten-franca',
      name: 'França',
      flag: flagFranca,
      competitions: [{ id: 'ten-bordeaux', name: 'Bordeaux' }],
    },
  ],
}

const voleiConfig: CompeticaoConfig = {
  sportLabel: 'Vôlei',
  sportIcon: iconVolei,
  featuredCompetitions: [
    { id: 'vol-superliga', name: 'Superliga' },
    { id: 'vol-vnl', name: 'VNL' },
  ],
  topCompetitions: [
    { id: 'vol-superliga', name: 'Superliga' },
    { id: 'vol-vnl', name: 'VNL' },
  ],
  countries: [],
}

const esoccerConfig: CompeticaoConfig = {
  sportLabel: 'Esoccer',
  sportIcon: iconEsoccer,
  featuredCompetitions: [
    { id: 'eso-fifa-cup', name: 'FIFA Cup' },
    { id: 'eso-efl-cup', name: 'EFL Cup' },
  ],
  topCompetitions: [
    { id: 'eso-fifa-cup', name: 'FIFA Cup' },
    { id: 'eso-efl-cup', name: 'EFL Cup' },
  ],
  countries: [],
}

export const competicaoConfigBySport: Record<string, CompeticaoConfig> = {
  futebol: futebolConfig,
  basquete: basqueteConfig,
  nfl: nflConfig,
  tenis: tenisConfig,
  volei: voleiConfig,
  esoccer: esoccerConfig,
}

export const defaultCompeticaoConfig = futebolConfig

const enabledCompetitionIds = new Set([
  'fut-brasileiro',
  'fut-brasileirao-a',
  'fut-champions',
  'fut-premier-league',
  'fut-libertadores',
  'fut-laliga',
  'fut-mls',
  'fut-bundesliga',
  'bsq-nba',
  'bsq-nba-2',
  'bsq-ncaab',
  'bsq-nbb',
  'bsq-br-nbb',
  'bsq-euro-cup',
  'nfl-liga',
  'ten-roma-masters',
  'ten-roma-f',
  'ten-parma-f',
  'ten-bordeaux',
])

export function isCompetitionEnabled(id: string): boolean {
  return enabledCompetitionIds.has(id)
}

export function isCompetitionRailClickable(sportId: string): boolean {
  return sportId !== 'tenis'
}

export function findCompetition(
  config: CompeticaoConfig,
  id: string
): Competition | null {
  const featured = config.featuredCompetitions.find((c) => c.id === id)
  if (featured) return featured
  const top = config.topCompetitions.find((c) => c.id === id)
  if (top) return top
  for (const country of config.countries) {
    const found = country.competitions.find((c) => c.id === id)
    if (found) return found
  }
  return null
}
