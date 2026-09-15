interface SportsDbTeamRecord {
  strTeam?: string | null
  strSport?: string | null
  strBadge?: string | null
  strLogo?: string | null
}

interface SportsDbTeamResponse {
  teams?: SportsDbTeamRecord[] | null
}

const API_KEY = import.meta.env.VITE_THESPORTSDB_API_KEY ?? '3'
const API_BASE_URL = import.meta.env.DEV
  ? `/sportsdb/api/v1/json/${API_KEY}`
  : `https://www.thesportsdb.com/api/v1/json/${API_KEY}`
const REQUEST_TIMEOUT_MS = 5000
const STORAGE_PREFIX = 'draftaco:sportsdb-team-logo:v1'

const SPORTS_DB_SPORT_BY_APP_SPORT: Record<string, string> = {
  futebol: 'Soccer',
  basquete: 'Basketball',
  nfl: 'American Football',
}

const TEAM_SEARCH_ALIASES: Record<string, string> = {
  'Atl. Mineiro': 'Atletico Mineiro',
  'Atlético Mineiro': 'Atletico Mineiro',
  'Atlético Madrid': 'Atletico Madrid',
  'Atlético-MG': 'Atletico Mineiro',
  Alavés: 'Deportivo Alaves',
  'B. Dortmund': 'Borussia Dortmund',
  'B. Leverkusen': 'Bayer Leverkusen',
  Bayern: 'Bayern Munich',
  Brighton: 'Brighton & Hove Albion',
  Eintracht: 'Eintracht Frankfurt',
  Hamburger: 'Hamburger SV',
  Inter: 'Inter Milan',
  Leeds: 'Leeds United',
  'Man. City': 'Manchester City',
  Newcastle: 'Newcastle United',
  PSG: 'Paris SG',
  'Paris Saint-Germain': 'Paris SG',
  Tottenham: 'Tottenham Hotspur',
  '76ers': 'Philadelphia 76ers',
  Bulls: 'Chicago Bulls',
  Cavaliers: 'Cleveland Cavaliers',
  Celtics: 'Boston Celtics',
  Charleston: 'Charleston Southern',
  Clippers: 'Los Angeles Clippers',
  Heat: 'Miami Heat',
  Jazz: 'Utah Jazz',
  'Kennesaw State': 'Kennesaw State Owls',
  Kings: 'Sacramento Kings',
  Lafayette: 'Lafayette Leopards',
  Knicks: 'New York Knicks',
  Lakers: 'Los Angeles Lakers',
  Magic: 'Orlando Magic',
  Mavericks: 'Dallas Mavericks',
  Nuggets: 'Denver Nuggets',
  Pennsylvania: 'Penn Quakers',
  'South Carolina St.': 'South Carolina State Bulldogs',
  'South Carolina State': 'South Carolina State Bulldogs',
  Southern: 'Southern Jaguars',
  'Southern Wesleyan': 'Southern Wesleyan Warriors',
  Spurs: 'San Antonio Spurs',
  Suns: 'Phoenix Suns',
  Thunder: 'Oklahoma City Thunder',
  Warriors: 'Golden State Warriors',
}

const teamLogoCache = new Map<string, Promise<string | null>>()

function getCacheKey(teamName: string, sport: string) {
  return `${sport}:${TEAM_SEARCH_ALIASES[teamName] ?? teamName}`
}

function normalizeTeamName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase()
}

function isTeamNameMatch(apiTeamName: string | null | undefined, searchName: string) {
  if (!apiTeamName) return false

  const apiName = normalizeTeamName(apiTeamName)
  const expectedName = normalizeTeamName(searchName)

  return apiName === expectedName
    || apiName.includes(expectedName)
    || expectedName.includes(apiName)
}

function isSportMatch(apiSport: string | null | undefined, sport: string) {
  const expectedSport = SPORTS_DB_SPORT_BY_APP_SPORT[sport]
  if (!expectedSport || !apiSport) return true

  return apiSport.toLowerCase() === expectedSport.toLowerCase()
}

function getStoredLogo(cacheKey: string) {
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}:${cacheKey}`)
  } catch {
    return null
  }
}

function setStoredLogo(cacheKey: string, logoUrl: string) {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}:${cacheKey}`, logoUrl)
  } catch {
    // Cache is an optimization only.
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) return null
    return response.json() as Promise<T>
  } catch {
    return null
  } finally {
    window.clearTimeout(timeoutId)
  }
}

async function fetchTeamLogoFromSportsDb(teamName: string, sport: string): Promise<string | null> {
  const searchName = TEAM_SEARCH_ALIASES[teamName] ?? teamName
  const url = `${API_BASE_URL}/searchteams.php?t=${encodeURIComponent(searchName)}`
  const data = await fetchJson<SportsDbTeamResponse>(url)
  const matchedTeam = data?.teams?.find((team) => (
    isTeamNameMatch(team.strTeam, searchName)
    && isSportMatch(team.strSport, sport)
  ))

  return matchedTeam?.strBadge ?? matchedTeam?.strLogo ?? null
}

export function isSportsDbTeamLogoUrl(logoUrl: string | undefined) {
  return Boolean(logoUrl?.includes('r2.thesportsdb.com/images/media/team/'))
}

export function getSportsDbTeamLogo(teamName: string, sport: string) {
  const cacheKey = getCacheKey(teamName, sport)
  const storedLogo = getStoredLogo(cacheKey)
  if (storedLogo) return Promise.resolve(storedLogo)

  const cached = teamLogoCache.get(cacheKey)
  if (cached) return cached

  const promise = fetchTeamLogoFromSportsDb(teamName, sport)
    .then((logoUrl) => {
      if (logoUrl) setStoredLogo(cacheKey, logoUrl)
      return logoUrl
    })
    .catch(() => null)

  teamLogoCache.set(cacheKey, promise)
  return promise
}
