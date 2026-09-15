import iconWta from '../assets/iconSports/wta.png'
import { getTennisCompetitionCountryIcon } from './tennisCountryIcons'

const ATP_BADGE = 'https://r2.thesportsdb.com/images/media/league/badge/q7aej51769857150.png'
const WTA_BADGE = iconWta

export const COMPETITION_BADGES: Record<string, string> = {
  'fut-brasileiro': 'https://r2.thesportsdb.com/images/media/league/badge/lywv7t1766787179.png',
  'fut-brasileirao-a': 'https://r2.thesportsdb.com/images/media/league/badge/lywv7t1766787179.png',
  'fut-libertadores': 'https://r2.thesportsdb.com/images/media/league/badge/9shr931685425181.png',
  'fut-champions': 'https://r2.thesportsdb.com/images/media/league/badge/facv1u1742998896.png',
  'fut-premier-league': 'https://r2.thesportsdb.com/images/media/league/badge/gasy9d1737743125.png',
  'fut-laliga': 'https://r2.thesportsdb.com/images/media/league/badge/ja4it51687628717.png',
  'fut-mls': 'https://r2.thesportsdb.com/images/media/league/badge/dqo6r91549878326.png',
  'fut-bundesliga': 'https://r2.thesportsdb.com/images/media/league/badge/teqh1b1679952008.png',
  'bsq-nba': 'https://r2.thesportsdb.com/images/media/league/badge/frdjqy1536585083.png',
  'bsq-nba-2': 'https://r2.thesportsdb.com/images/media/league/badge/frdjqy1536585083.png',
  'bsq-ncaab': 'https://r2.thesportsdb.com/images/media/league/badge/ibf3d21731087087.png',
  'nfl-liga': 'https://r2.thesportsdb.com/images/media/league/badge/g85fqz1662057187.png',
  'ten-atp-roma': getTennisCompetitionCountryIcon('ten-atp-roma'),
  'ten-roma-masters': getTennisCompetitionCountryIcon('ten-roma-masters'),
  'ten-roma-f': getTennisCompetitionCountryIcon('ten-roma-f'),
  'ten-parma-f': getTennisCompetitionCountryIcon('ten-parma-f'),
  'ten-bordeaux': getTennisCompetitionCountryIcon('ten-bordeaux'),
}

const COMPETITION_RAIL_BADGES: Record<string, string> = {
  'ten-atp-roma': ATP_BADGE,
  'ten-roma-masters': ATP_BADGE,
  'ten-roma-f': WTA_BADGE,
  'ten-parma-f': WTA_BADGE,
  'ten-bordeaux': ATP_BADGE,
}

export function getCompetitionBadge(competitionId: string, fallback = ''): string {
  return COMPETITION_BADGES[competitionId] ?? getTennisCompetitionCountryIcon(competitionId, fallback)
}

export function getCompetitionRailBadge(competitionId: string, fallback = ''): string {
  return COMPETITION_RAIL_BADGES[competitionId] ?? getCompetitionBadge(competitionId, fallback)
}
