import fs from 'node:fs'
import ts from 'typescript'

const calendarPath = 'src/components/CalendarSection/CalendarSection.tsx'
const competitionsPath = 'src/components/SportFilterBar/competicaoData.ts'

const parseSourceFile = (path) => ts.createSourceFile(
  path,
  fs.readFileSync(path, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
)

const calendarSource = parseSourceFile(calendarPath)
const competitionsSource = parseSourceFile(competitionsPath)

const getDeclarations = (sourceFile) => {
  const declarations = new Map()

  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      declarations.set(node.name.text, node.initializer)
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return declarations
}

const calendarDeclarations = getDeclarations(calendarSource)
const competitionDeclarations = getDeclarations(competitionsSource)

const getNameText = (sourceFile, name) => {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text
  }

  return name.getText(sourceFile)
}

const getStringValue = (node) => ts.isStringLiteralLike(node) ? node.text : undefined

const getProperty = (sourceFile, objectNode, propertyName) => {
  if (!objectNode || !ts.isObjectLiteralExpression(objectNode)) return undefined

  const property = objectNode.properties.find((item) => (
    ts.isPropertyAssignment(item) && getNameText(sourceFile, item.name) === propertyName
  ))

  return property?.initializer
}

const getObjectKeys = (sourceFile, objectName, declarations) => {
  const initializer = declarations.get(objectName)
  if (!initializer || !ts.isObjectLiteralExpression(initializer)) return new Set()

  return new Set(
    initializer.properties
      .filter(ts.isPropertyAssignment)
      .map((property) => getNameText(sourceFile, property.name))
  )
}

const getStringMap = (sourceFile, objectName, declarations) => {
  const initializer = declarations.get(objectName)
  const map = new Map()
  if (!initializer || !ts.isObjectLiteralExpression(initializer)) return map

  initializer.properties
    .filter(ts.isPropertyAssignment)
    .forEach((property) => {
      const value = getStringValue(property.initializer)
      if (value) map.set(getNameText(sourceFile, property.name), value)
    })

  return map
}

const getStringSet = (sourceFile, setName, declarations) => {
  const initializer = declarations.get(setName)
  if (!initializer || !ts.isNewExpression(initializer)) return new Set()

  const arrayArgument = initializer.arguments?.[0]
  if (!arrayArgument || !ts.isArrayLiteralExpression(arrayArgument)) return new Set()

  return new Set(arrayArgument.elements.map(getStringValue).filter(Boolean))
}

const getChampionships = () => {
  const initializer = calendarDeclarations.get('championships')
  if (!initializer || !ts.isArrayLiteralExpression(initializer)) return []

  return initializer.elements
    .filter(ts.isObjectLiteralExpression)
    .map((championship) => {
      const eventsNode = getProperty(calendarSource, championship, 'events')
      const events = ts.isArrayLiteralExpression(eventsNode)
        ? eventsNode.elements
          .filter(ts.isObjectLiteralExpression)
          .map((event) => ({
            id: getStringValue(getProperty(calendarSource, event, 'id')),
            homeName: getStringValue(getProperty(calendarSource, event, 'homeName')),
            awayName: getStringValue(getProperty(calendarSource, event, 'awayName')),
          }))
          .filter((event) => event.id && event.homeName && event.awayName)
        : []

      return {
        id: getStringValue(getProperty(calendarSource, championship, 'id')),
        name: getStringValue(getProperty(calendarSource, championship, 'name')),
        sport: getStringValue(getProperty(calendarSource, championship, 'sport')),
        events,
      }
    })
    .filter((championship) => championship.id && championship.name && championship.sport)
}

const footballFinishingTeams = getObjectKeys(calendarSource, 'calendarFootballFinishingPlayersByTeam', calendarDeclarations)
const footballAssistTeams = getObjectKeys(calendarSource, 'calendarFootballAssistPlayersByTeam', calendarDeclarations)
const basketballPointTeams = getObjectKeys(calendarSource, 'calendarBasketballPointPlayersByTeam', calendarDeclarations)
const basketballAssistTeams = getObjectKeys(calendarSource, 'calendarBasketballAssistPlayersByTeam', calendarDeclarations)
const nflPassingYardsTeams = getObjectKeys(calendarSource, 'calendarNflPassingYardsPlayersByTeam', calendarDeclarations)
const nflReceptionsTeams = getObjectKeys(calendarSource, 'calendarNflReceptionsPlayersByTeam', calendarDeclarations)
const nflTouchdownsTeams = getObjectKeys(calendarSource, 'calendarNflTouchdownsPlayersByTeam', calendarDeclarations)
const nflRushingYardsTeams = getObjectKeys(calendarSource, 'calendarNflRushingYardsPlayersByTeam', calendarDeclarations)
const basketballAliases = getStringMap(calendarSource, 'calendarPlayerTeamAliases', calendarDeclarations)
const competitionToChampionship = getStringMap(calendarSource, 'competitionToChampionship', calendarDeclarations)
const enabledCompetitionIds = getStringSet(competitionsSource, 'enabledCompetitionIds', competitionDeclarations)
const championshipsById = new Map(getChampionships().map((championship) => [championship.id, championship]))

const hasBasketballTeam = (teams, teamName) => {
  const alias = basketballAliases.get(teamName)
  return teams.has(teamName) || (alias ? teams.has(alias) : false)
}

const footballMarkets = [
  {
    id: 'finalizacao-gol',
    hasEventProps: (event) => footballFinishingTeams.has(event.homeName) || footballFinishingTeams.has(event.awayName),
  },
  {
    id: 'gols',
    hasEventProps: (event) => footballFinishingTeams.has(event.homeName) || footballFinishingTeams.has(event.awayName),
  },
  {
    id: 'assistencias',
    hasEventProps: (event) => footballAssistTeams.has(event.homeName) || footballAssistTeams.has(event.awayName),
  },
]

const basketballMarkets = [
  {
    id: 'pontos-jogador',
    hasEventProps: (event) => hasBasketballTeam(basketballPointTeams, event.homeName) || hasBasketballTeam(basketballPointTeams, event.awayName),
  },
  {
    id: 'assistencias',
    hasEventProps: (event) => (
      hasBasketballTeam(basketballAssistTeams, event.homeName) ||
      hasBasketballTeam(basketballAssistTeams, event.awayName) ||
      hasBasketballTeam(basketballPointTeams, event.homeName) ||
      hasBasketballTeam(basketballPointTeams, event.awayName)
    ),
  },
]

const nflMarkets = [
  {
    id: 'jardas-passe',
    hasEventProps: (event) => hasBasketballTeam(nflPassingYardsTeams, event.homeName) || hasBasketballTeam(nflPassingYardsTeams, event.awayName),
  },
  {
    id: 'recepcoes',
    hasEventProps: (event) => hasBasketballTeam(nflReceptionsTeams, event.homeName) || hasBasketballTeam(nflReceptionsTeams, event.awayName),
  },
  {
    id: 'touchdowns',
    hasEventProps: (event) => hasBasketballTeam(nflTouchdownsTeams, event.homeName) || hasBasketballTeam(nflTouchdownsTeams, event.awayName),
  },
  {
    id: 'jardas-corrida',
    hasEventProps: (event) => hasBasketballTeam(nflRushingYardsTeams, event.homeName) || hasBasketballTeam(nflRushingYardsTeams, event.awayName),
  },
]

const seenChampionshipIds = new Set()
const failures = []
const summaries = []

for (const competitionId of enabledCompetitionIds) {
  const championshipId = competitionToChampionship.get(competitionId) ?? competitionId
  const championship = championshipsById.get(championshipId)

  if (!championship || seenChampionshipIds.has(championship.id)) continue
  if (championship.sport !== 'futebol' && championship.sport !== 'basquete' && championship.sport !== 'nfl') continue

  seenChampionshipIds.add(championship.id)

  const markets = championship.sport === 'basquete'
    ? basketballMarkets
    : championship.sport === 'nfl'
      ? nflMarkets
      : footballMarkets
  const marketSummaries = markets.map((market) => {
    const coveredEvents = championship.events.filter(market.hasEventProps)
    const missingEvents = championship.events.filter((event) => !market.hasEventProps(event))

    if (coveredEvents.length === 0) {
      failures.push(`${championship.name} (${championship.id}) sem props para ${market.id}`)
    }

    if (missingEvents.length > 0) {
      failures.push(
        `${championship.name} (${championship.id}) tem eventos sem props em ${market.id}: ` +
        missingEvents.map((event) => `${event.homeName} x ${event.awayName}`).join('; ')
      )
    }

    return `${market.id}:${coveredEvents.length}/${championship.events.length}`
  })

  summaries.push(`${championship.sport} ${championship.name}: ${marketSummaries.join(', ')}`)
}

if (failures.length > 0) {
  console.error('Player props coverage failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Player props coverage OK')
summaries.forEach((summary) => console.log(`- ${summary}`))
