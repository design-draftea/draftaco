const rawTeamAbbreviationAliases: Record<string, string> = {
  Flamengo: 'FLA',
  Cruzeiro: 'CRU',
  Internacional: 'INT',
  Inter: 'INT',
  Bragantino: 'RBB',
  'Red Bull Bragantino': 'RBB',
  Vasco: 'VAS',
  Corinthians: 'COR',
  Palmeiras: 'PAL',
  Fluminense: 'FLU',
  Botafogo: 'BOT',
  Bahia: 'BAH',
  'Atl. Mineiro': 'CAM',
  'Atletico Mineiro': 'CAM',
  'Atletico-MG': 'CAM',
  'Atletico MG': 'CAM',
  'Atletico-Mineiro': 'CAM',
  'Atlético Mineiro': 'CAM',
  'Atlético-MG': 'CAM',
  'Atlético MG': 'CAM',
  Santos: 'SAN',
  'São Paulo': 'SAO',
  'Sao Paulo': 'SAO',
  Mirassol: 'MIR',
  Vitória: 'VIT',
  Vitoria: 'VIT',
  Sport: 'SPO',
  Grêmio: 'GRE',
  Gremio: 'GRE',
  Juventude: 'JUV',
  Paulistano: 'PAU',
  'Caxias do Sul': 'CAX',
  Caxias: 'CAX',
  Minas: 'MIN',
  Pinheiros: 'PIN',
  Unifacisa: 'UNI',

  'Paris Saint-Germain': 'PSG',
  'Paris SG': 'PSG',
  PSG: 'PSG',
  'Manchester City': 'MCI',
  'Man. City': 'MCI',
  'Man City': 'MCI',
  'Real Madrid': 'RMA',
  Barcelona: 'BAR',
  'FC Barcelona': 'BAR',
  Bayern: 'BAY',
  'Bayern Munich': 'BAY',
  'Bayern Munique': 'BAY',
  Arsenal: 'ARS',
  Liverpool: 'LIV',
  Chelsea: 'CHE',
  Napoli: 'NAP',
  Lyon: 'LYO',
  Newcastle: 'NEW',
  Benfica: 'BEN',
  Ajax: 'AJA',
  Tottenham: 'TOT',
  Wolves: 'WOL',
  Brighton: 'BHA',
  'West Ham': 'WHU',
  Leeds: 'LEE',
  Burnley: 'BUR',
  Getafe: 'GET',
  Elche: 'ELC',
  Sevilla: 'SEV',
  Villarreal: 'VIL',
  Alavés: 'ALA',
  Alaves: 'ALA',
  Espanyol: 'ESP',
  Mallorca: 'MLL',
  Levante: 'LEV',
  'B. Leverkusen': 'B04',
  Leverkusen: 'B04',
  'Bayer Leverkusen': 'B04',
  'B. Dortmund': 'BVB',
  Dortmund: 'BVB',
  'Borussia Dortmund': 'BVB',
  'RB Leipzig': 'RBL',
  Leipzig: 'RBL',
  Wolfsburg: 'WOB',
  Eintracht: 'SGE',
  'Eintracht Frankfurt': 'SGE',
  Augsburg: 'AUG',
  Hamburger: 'HSV',
  'Hamburger SV': 'HSV',

  'Deportes Tolima': 'TOL',
  Tolima: 'TOL',
  'Independiente del Valle': 'IDV',
  Bolívar: 'BOL',
  Bolivar: 'BOL',
  'Cerro Porteño': 'CCP',
  'Cerro Porteno': 'CCP',
  'Atlético Nacional': 'NAC',
  'Atletico Nacional': 'NAC',
  Peñarol: 'PEN',
  Penarol: 'PEN',
  'Universidad Católica': 'UCA',
  'Universidad Catolica': 'UCA',
  'Estudiantes de La Plata': 'EST',
  Estudiantes: 'EST',
  'LDU Quito': 'LDU',
  LDU: 'LDU',
  'Alianza Lima': 'ALI',
  'Sporting Cristal': 'SCR',
  'Barcelona SC': 'BSC',
  Platense: 'PLA',
  'Coquimbo Unido': 'COQ',
  'Deportivo Táchira': 'TAC',
  'Deportivo Tachira': 'TAC',
  Carabobo: 'CAR',
  Melgar: 'MEL',
  Universitario: 'UNI',

  'Inter Miami': 'MIA',
  Whitecaps: 'VAN',
  'Vancouver Whitecaps': 'VAN',
  Cincinnati: 'CIN',
  'Chicago Fire': 'CHI',
  Nashville: 'NSH',
  'New York City': 'NYC',
  'Seattle Sounders': 'SEA',
  'LA Galaxy': 'LAG',
  'Atlanta United': 'ATL',
  'Portland Timbers': 'POR',
  'Orlando City': 'ORL',
  'FC Dallas': 'DAL',
  'Houston Dynamo': 'HOU',
  'Charlotte FC': 'CLT',

  Jazz: 'UTA',
  'Utah Jazz': 'UTA',
  Thunder: 'OKC',
  'Oklahoma City Thunder': 'OKC',
  Knicks: 'NYK',
  'New York Knicks': 'NYK',
  Magic: 'ORL',
  'Orlando Magic': 'ORL',
  Bulls: 'CHI',
  'Chicago Bulls': 'CHI',
  Heat: 'MIA',
  'Miami Heat': 'MIA',
  '76ers': 'PHI',
  Celtics: 'BOS',
  Nuggets: 'DEN',
  Suns: 'PHX',
  Mavericks: 'DAL',
  Spurs: 'SAS',
  Clippers: 'LAC',
  Kings: 'SAC',
  Warriors: 'GSW',
  Lakers: 'LAL',

  // NFL
  'KC Chiefs': 'KC',
  'Kansas City Chiefs': 'KC',
  Chiefs: 'KC',
  'MIA Dolphins': 'MIA',
  'Miami Dolphins': 'MIA',
  Dolphins: 'MIA',
  'PIT Steelers': 'PIT',
  'Pittsburgh Steelers': 'PIT',
  Steelers: 'PIT',
  'CIN Bengals': 'CIN',
  'Cincinnati Bengals': 'CIN',
  Bengals: 'CIN',
  'BUF Bills': 'BUF',
  'Buffalo Bills': 'BUF',
  Bills: 'BUF',
  'NE Patriots': 'NE',
  'New England Patriots': 'NE',
  Patriots: 'NE',
  'PHI Eagles': 'PHI',
  'Philadelphia Eagles': 'PHI',
  Eagles: 'PHI',
  'DAL Cowboys': 'DAL',
  'Dallas Cowboys': 'DAL',
  Cowboys: 'DAL',
}

const normalizeTeamAbbreviationKey = (value: string) => (
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()
)

const teamAbbreviationAliases = Object.fromEntries(
  Object.entries(rawTeamAbbreviationAliases).map(([teamName, abbreviation]) => [
    normalizeTeamAbbreviationKey(teamName),
    abbreviation,
  ])
)

export function getTeamAbbreviation(teamName: string) {
  const trimmedTeamName = teamName.trim()
  if (!trimmedTeamName) return ''

  const alias = teamAbbreviationAliases[normalizeTeamAbbreviationKey(trimmedTeamName)]
  if (alias) return alias

  const cleanWords = trimmedTeamName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/gi, ''))
    .filter(Boolean)

  const acronym = cleanWords.map((word) => word[0]).join('').toUpperCase()
  if (acronym.length >= 3) return acronym.slice(0, 3)

  const compactFallback = cleanWords.join('').slice(0, 3).toUpperCase()
  return compactFallback || trimmedTeamName.slice(0, 3).toUpperCase()
}

export function getTeamAbbreviationAlias(teamName: string) {
  const trimmedTeamName = teamName.trim()
  if (!trimmedTeamName) return ''

  return teamAbbreviationAliases[normalizeTeamAbbreviationKey(trimmedTeamName)] ?? ''
}
