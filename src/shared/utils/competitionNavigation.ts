export interface CompetitionLinkTarget {
  id: string
  name: string
  sport: string
}

const competitionLinkTargetsByLeagueId: Record<string, CompetitionLinkTarget> = {
  'brasil-serie-a': {
    id: 'fut-brasileiro',
    name: 'Brasileirão Série A',
    sport: 'futebol',
  },
  libertadores: {
    id: 'fut-libertadores',
    name: 'Libertadores',
    sport: 'futebol',
  },
  'champions-league': {
    id: 'fut-champions',
    name: 'Champions League',
    sport: 'futebol',
  },
  'premier-league': {
    id: 'fut-premier-league',
    name: 'Premier League',
    sport: 'futebol',
  },
  bundesliga: {
    id: 'fut-bundesliga',
    name: 'Bundesliga',
    sport: 'futebol',
  },
  'la-liga': {
    id: 'fut-laliga',
    name: 'LaLiga',
    sport: 'futebol',
  },
  mls: {
    id: 'fut-mls',
    name: 'MLS',
    sport: 'futebol',
  },
  nba: {
    id: 'bsq-nba',
    name: 'NBA',
    sport: 'basquete',
  },
  ncaab: {
    id: 'bsq-ncaab',
    name: 'NCAAB',
    sport: 'basquete',
  },
  'brasil-nbb': {
    id: 'bsq-nbb',
    name: 'NBB',
    sport: 'basquete',
  },
  'euro-cup': {
    id: 'bsq-euro-cup',
    name: 'Euro Cup',
    sport: 'basquete',
  },
  nfl: {
    id: 'nfl-liga',
    name: 'NFL',
    sport: 'nfl',
  },
  'nfl-liga': {
    id: 'nfl-liga',
    name: 'NFL',
    sport: 'nfl',
  },
  'ten-roma-masters': {
    id: 'ten-roma-masters',
    name: 'Roma Masters',
    sport: 'tenis',
  },
  'ten-roma-f': {
    id: 'ten-roma-f',
    name: 'Roma (F)',
    sport: 'tenis',
  },
  'ten-parma-f': {
    id: 'ten-parma-f',
    name: 'Parma (F)',
    sport: 'tenis',
  },
  'ten-bordeaux': {
    id: 'ten-bordeaux',
    name: 'Bordeaux',
    sport: 'tenis',
  },
}

export function getCompetitionLinkTarget(leagueId: string): CompetitionLinkTarget | null {
  return competitionLinkTargetsByLeagueId[leagueId] ?? null
}

export function getRailCompetitionId(competitionId?: string | null): string | undefined {
  if (!competitionId) return undefined

  return getCompetitionLinkTarget(competitionId)?.id ?? competitionId
}
