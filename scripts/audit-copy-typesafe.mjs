// Auditor semântico do catálogo de textos da Draftea e dos rótulos de aposta.
//
// A tradução continua determinística. Este script roda fora do app: primeiro as verificações
// que o código resolve sozinho, sem custo, e só manda para o Jev o que exige julgamento —
// se o espanhol diz a mesma coisa que o português e se um mercado combina com o jogador.
//
// Uso:
//   npm run qa:copy:typesafe -- --dry-run
//   npm run qa:copy:typesafe
//   npm run qa:copy:typesafe -- --only=traducao --limit=40
//   npm run qa:copy:typesafe -- --all --json
//
// A chave pode vir do ambiente ou de `.env.typesafe.local`. Ela nunca é impressa.
//
// Calibração medida em 2026-09-16, contra o catálogo atual e traduções corrompidas de propósito:
//   - DIVERGE (probabilidade <= 0.25) acertou as quatro trocas de sentido plantadas e é acionável.
//   - REVISAR (entre 0.25 e o limite) tem cerca de 9% de falso positivo; vale olhar, não corrigir no
//     escuro.
//   - Lote grande degrada o julgamento: com 40 perguntas por requisição, um par correto caiu de 95%
//     para 15%. Com seis, o resultado empata com o par avaliado sozinho. Daí o padrão de `--batch`.
//   - Ponto cego conhecido: texto que ficou em português mas diz a mesma coisa passa pela pergunta de
//     equivalência, porque ele é de fato equivalente. `vazamento` cobre o código e a lista de
//     entradas mantidas iguais cobre o catálogo; uma tradução aparente ainda em português escapa.
//
// Saída 0: nada a revisar.
// Saída 1: há divergência ou baixa confiança — revisão humana necessária.
// Saída 2: configuração, dado ou chamada externa falhou.

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const catalogPath = path.join(repoRoot, 'src/brands/draftea/legacyCopy.ts')
const sourceRoot = path.join(repoRoot, 'src')
const cachePath = path.join(repoRoot, 'node_modules/.cache/qa-copy-typesafe.json')
const apiUrl = 'https://api.typesafe.ai/v1/systemone'
const defaultThreshold = 0.75
const defaultLimit = 60
const defaultBatch = 6

// Atributos que o adaptador de i18n traduz, além do texto dos elementos nativos.
const localizedAttributes = new Set(['aria-label', 'alt', 'placeholder', 'title'])
// Marcadores que só existem em português; um deles basta para acusar vazamento sem gastar token.
const portugueseMarkers = [
  /[ãõçÃÕÇ]/,
  /\b(você|vocês|não|então|também|nós|muito|uma|com|dos|das|seu|sua|jogo|jogos|apostas?)\b/i,
  /nh[aeiou]/i,
  /lh[aeiou]/i,
  /ção|ções|ões/i,
]
const checkIds = ['regex', 'duplicatas', 'vazamento', 'traducao', 'identidade', 'mercado']

let options
try {
  options = parseArgs(process.argv.slice(2))
} catch (error) {
  console.error(`TypeSafe copy QA: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(2)
}

if (options.help) {
  printHelp()
  process.exit(0)
}

try {
  const catalogSource = await readFile(catalogPath, 'utf8')
  const catalog = await loadCatalog(catalogSource)
  const { localize, applyReplacements } = makeLocalize(catalog)

  const offline = []
  if (options.checks.has('regex')) offline.push(...auditReplacementOrder(catalog.replacements))
  if (options.checks.has('duplicatas')) offline.push(...auditDuplicateKeys(catalogSource))

  const sourceFiles = (await listSourceFiles(sourceRoot))
    .filter((file) => path.relative(repoRoot, file).startsWith(options.pathPrefix))
  const leaks = options.checks.has('vazamento')
    ? auditPortugueseLeaks(await readLiterals(sourceFiles), localize)
    : { confirmed: [], candidates: [] }
  offline.push(...leaks.confirmed)

  const playerProps = options.checks.has('mercado') ? await readPlayerProps(sourceFiles) : []
  offline.push(...auditPlayerPropReferences(playerProps))

  const classified = options.checks.has('traducao') || options.checks.has('identidade')
    ? classifyTranslations(catalog.exact, applyReplacements)
    : { identity: [], redundant: [], real: [] }
  const translations = {
    ...classified,
    real: options.checks.has('traducao') ? classified.real : [],
    identity: options.checks.has('identidade') ? classified.identity : [],
  }
  const cache = await loadCache()
  const questions = buildQuestions({
    translations,
    leaks: leaks.candidates,
    playerProps,
    cache,
    limit: options.all ? Infinity : options.limit,
  })

  if (options.dryRun) {
    if (options.json) printJson({ offline, questions, playerProps })
    else printDryRun({ offline, questions, translations, leaks, playerProps })
    process.exitCode = offline.length > 0 ? 1 : 0
  } else if (questions.length === 0) {
    printReport({ offline, judged: [], usage: null, elapsedMs: 0, model: null, calls: 0, translations })
    process.exitCode = offline.length > 0 ? 1 : 0
  } else {
    const apiKey = await loadApiKey()
    const startedAt = Date.now()
    const { answers, usage, model, calls } = await askTypeSafe(apiKey, questions, options.batch)
    const elapsedMs = Date.now() - startedAt
    const judged = evaluateAnswers(questions, answers, options.threshold)

    await saveCache(cache, judged)

    const report = { offline, judged, usage, elapsedMs, model, calls, translations }
    if (options.json) printJson(report)
    else printReport(report)

    const findings = offline.length + judged.filter((item) => item.status !== 'ok').length
    process.exitCode = findings > 0 ? 1 : 0
  }
} catch (error) {
  console.error(`TypeSafe copy QA: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 2
}

function parseArgs(args) {
  const values = Object.fromEntries(args.map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=')
    return [key, rest.length > 0 ? rest.join('=') : true]
  }))

  const threshold = values.threshold === undefined ? defaultThreshold : Number(values.threshold)
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new Error('`--threshold` deve ser um número entre 0 e 1')
  }

  const limit = values.limit === undefined ? defaultLimit : Number(values.limit)
  if (!Number.isInteger(limit) || limit < 1) throw new Error('`--limit` deve ser um inteiro positivo')

  const batch = values.batch === undefined ? defaultBatch : Number(values.batch)
  if (!Number.isInteger(batch) || batch < 1) throw new Error('`--batch` deve ser um inteiro positivo')

  const checks = new Set(
    typeof values.only === 'string'
      ? values.only.split(',').map((entry) => entry.trim()).filter(Boolean)
      : checkIds,
  )
  for (const check of checks) {
    if (!checkIds.includes(check)) {
      throw new Error(`\`--only\` não conhece "${check}"; use ${checkIds.join(', ')}`)
    }
  }

  const pathPrefix = typeof values.path === 'string' ? values.path.replace(/^\.?\//, '') : 'src'
  if (!pathPrefix.startsWith('src')) throw new Error('`--path` precisa começar em `src`')

  return {
    all: values.all === true,
    batch,
    checks,
    dryRun: values['dry-run'] === true,
    help: values.help === true,
    json: values.json === true,
    limit,
    pathPrefix,
    threshold,
  }
}

function printHelp() {
  console.log(`Auditoria do catálogo de textos da Draftea e dos rótulos de aposta

Uso:
  npm run qa:copy:typesafe -- [opções]

Opções:
  --dry-run          Roda só as verificações locais e lista o que iria ao TypeSafe
  --only=traducao    Limita as verificações (${checkIds.join(', ')})
  --path=src/...     Restringe vazamento e mercado a um caminho do código
  --limit=60         Teto de itens enviados ao TypeSafe por execução
  --batch=40         Perguntas por requisição
  --all              Ignora o teto e audita tudo que não estiver em cache
  --threshold=0.75   Probabilidade mínima para aprovação (0 a 1)
  --json             Imprime o relatório em JSON
  --help             Mostra esta ajuda

Verificações locais (sem custo):
  regex        Substituição posterior que nunca dispara ou que reescreve a saída de outra
  duplicatas   Chave repetida no mapa exato, em que a última silenciosamente vence
  vazamento    Texto que atravessa a tradução intacto e continua em português
  mercado      Jogador cujo time não aparece na partida declarada

Verificações com o Jev (pagas, em lote, com cache por hash):
  traducao     O espanhol diz a mesma coisa que o português
  vazamento    Texto ambíguo que sobrou da checagem local
  mercado      O mercado combina com a posição do jogador

Duas famílias de entrada saem do caminho pago: as que só repetem um regex existente, porque o
código já decide; e as mantidas iguais ao português, porque o modelo não separa "Saldo", certo
nas duas línguas, de "Tempo de posse", esquecido. Estas ficam listadas para conferência humana.`)
}

// O catálogo é fonte TypeScript sem imports: remover as anotações basta para importá-lo.
async function loadCatalog(source) {
  const asJavaScript = source
    .replace(': Record<string, string> =', ' =')
    .replace(': [RegExp, string][] =', ' =')

  if (/:\s*(Record|\[RegExp)/.test(asJavaScript)) {
    throw new Error('o catálogo ganhou anotações de tipo que este script não sabe remover')
  }

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(asJavaScript, 'utf8').toString('base64')}`
  const loaded = await import(moduleUrl)

  if (!loaded.exactDrafteaTranslations || !Array.isArray(loaded.drafteaReplacements)) {
    throw new Error('o catálogo não exporta `exactDrafteaTranslations` e `drafteaReplacements`')
  }

  return { exact: loaded.exactDrafteaTranslations, replacements: loaded.drafteaReplacements }
}

// Espelha `localizeCopy` de src/shared/i18n/brandLocalization.tsx.
function makeLocalize({ exact, replacements }) {
  const applyReplacements = (value) => replacements.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value,
  )

  return {
    localize: (value) => exact[value] ?? applyReplacements(value),
    applyReplacements,
  }
}

// Uma entrada exata pode ser tradução de verdade, repetição de um regex ou termo mantido igual.
// Só a primeira precisa de julgamento: as outras duas o código resolve ou pergunta de outro jeito.
function classifyTranslations(exact, applyReplacements) {
  const identity = []
  const redundant = []
  const real = []

  for (const [source, target] of Object.entries(exact)) {
    if (source === target) identity.push([source, target])
    else if (applyReplacements(source) === target) redundant.push([source, target])
    else real.push([source, target])
  }

  return { identity, redundant, real }
}

// Um padrão literal só dispara se nenhum padrão literal anterior consumir o texto dele.
function auditReplacementOrder(replacements) {
  const findings = []
  const literals = replacements.map(([pattern], index) => ({
    index,
    source: literalSource(pattern),
    pattern,
  }))

  for (const later of literals) {
    if (later.source === null) continue

    for (const earlier of literals) {
      if (earlier.index >= later.index || earlier.source === null) continue
      if (!later.source.includes(earlier.source)) continue

      findings.push({
        check: 'regex',
        status: 'mismatch',
        subject: later.pattern.source,
        detail: `nunca dispara: "${earlier.pattern.source}" (posição ${earlier.index + 1}) já consome esse texto`,
      })
      break
    }
  }

  for (const [index, [, replacement]] of replacements.entries()) {
    if (typeof replacement !== 'string') continue

    for (const [laterIndex, [laterPattern]] of replacements.entries()) {
      if (laterIndex <= index) continue

      const probe = new RegExp(laterPattern.source, laterPattern.flags.replace('g', ''))
      if (!probe.test(replacement)) continue

      findings.push({
        check: 'regex',
        status: 'mismatch',
        subject: replacements[index][0].source,
        detail: `a saída "${replacement}" é reescrita por "${laterPattern.source}" (posição ${laterIndex + 1})`,
      })
      break
    }
  }

  return findings
}

// Padrão sem metacaractere: o texto vale como literal e permite comparar ordem com precisão.
function literalSource(pattern) {
  return /^[^\\^$.*+?()[\]{}|]+$/.test(pattern.source) ? pattern.source : null
}

// O objeto avaliado perde chaves repetidas, então a contagem sai do texto do arquivo.
function auditDuplicateKeys(source) {
  const seen = new Map()
  const findings = []
  const entry = /^\s*'((?:[^'\\]|\\.)*)':/gm
  let match

  while ((match = entry.exec(source)) !== null) {
    const key = match[1]
    const line = source.slice(0, match.index).split('\n').length

    if (seen.has(key)) {
      findings.push({
        check: 'duplicatas',
        status: 'mismatch',
        subject: key,
        detail: `repetida nas linhas ${seen.get(key)} e ${line}; a última vence em silêncio`,
      })
      continue
    }

    seen.set(key, line)
  }

  return findings
}

async function listSourceFiles(root) {
  const entries = await readdir(root, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name)
    if (entry.isDirectory()) files.push(...await listSourceFiles(entryPath))
    else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) files.push(entryPath)
  }

  return files
}

// Extrai o que o adaptador realmente traduz: texto de elementos nativos e atributos acessíveis.
async function readLiterals(files) {
  const literals = new Map()

  for (const file of files.filter((entry) => entry.endsWith('.tsx'))) {
    const source = ts.createSourceFile(
      file,
      await readFile(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )

    const record = (text, node) => {
      const value = text.replace(/\s+/g, ' ').trim()
      if (value.length < 2 || !/\p{Letter}/u.test(value)) return
      if (literals.has(value)) return

      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source))
      literals.set(value, `${path.relative(repoRoot, file)}:${line + 1}`)
    }

    const visit = (node) => {
      if (ts.isJsxText(node) && isIntrinsicParent(node.parent)) record(node.text, node)

      if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
        const name = node.name.getText(source)
        const owner = node.parent.parent
        if (localizedAttributes.has(name) && isIntrinsicTag(owner.tagName) && !hasSkipFlag(node.parent.parent)) {
          record(node.initializer.text, node)
        }
      }

      ts.forEachChild(node, visit)
    }

    ts.forEachChild(source, visit)
  }

  return literals
}

function isIntrinsicParent(node) {
  if (!node) return false
  if (ts.isJsxFragment(node)) return true
  if (!ts.isJsxElement(node)) return false

  return isIntrinsicTag(node.openingElement.tagName) && !hasSkipFlag(node.openingElement)
}

// Elemento nativo é o de tag minúscula; componentes recebem props e não passam pelo adaptador.
function isIntrinsicTag(tagName) {
  return /^[a-z]/.test(tagName.getText())
}

function hasSkipFlag(openingElement) {
  return openingElement.attributes.properties.some((property) => (
    ts.isJsxAttribute(property)
    && property.name.getText() === 'data-brand-localization-skip'
    && property.initializer
    && ts.isStringLiteral(property.initializer)
    && property.initializer.text === 'true'
  ))
}

// Intacto e com marcador de português é achado local; intacto e ambíguo vira pergunta ao Jev.
function auditPortugueseLeaks(literals, localize) {
  const confirmed = []
  const candidates = []

  for (const [value, location] of literals) {
    if (localize(value) !== value) continue

    if (portugueseMarkers.some((marker) => marker.test(value))) {
      confirmed.push({
        check: 'vazamento',
        status: 'mismatch',
        subject: value,
        detail: `atravessa a tradução intacto e continua em português · ${location}`,
      })
      continue
    }

    candidates.push({ value, location })
  }

  return { confirmed, candidates }
}

// Player props ficam em literais de dados; o AST evita avaliar os imports de asset.
async function readPlayerProps(files) {
  const props = []
  // `subtitle` e `marketLabel` nomeiam o mercado conforme a fixture; os dois valem.
  const wanted = [
    'playerName', 'position', 'marketLabel', 'subtitle', 'matchLabel',
    'teamName', 'teamAbbreviation', 'sport',
  ]

  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      await readFile(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    )

    const visit = (node) => {
      if (ts.isObjectLiteralExpression(node)) {
        const fields = {}
        for (const property of node.properties) {
          if (!ts.isPropertyAssignment(property)) continue
          if (!ts.isStringLiteral(property.initializer)) continue

          const name = property.name.getText(source).replace(/^'|'$/g, '')
          if (wanted.includes(name)) fields[name] = property.initializer.text
        }

        const market = fields.marketLabel ?? fields.subtitle
        const team = fields.matchLabel ?? fields.teamName

        if (fields.playerName && fields.position && market && team) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart(source))
          props.push({
            ...fields,
            market,
            blockTeams: collectBlockTeams(node, source),
            location: `${path.relative(repoRoot, file)}:${line + 1}`,
          })
        }
      }

      ts.forEachChild(node, visit)
    }

    ts.forEachChild(source, visit)
  }

  return props
}

// Sobe até o bloco dono do `playerProps` e junta os times que ele declara.
// Banner usa `teams: [{ name }]`; vitrine de competição usa `matches: [{ homeTeam, awayTeam }]`.
function collectBlockTeams(node, source) {
  for (let current = node.parent; current; current = current.parent) {
    if (!ts.isObjectLiteralExpression(current)) continue

    const ownsPlayerProps = current.properties.some((property) => (
      ts.isPropertyAssignment(property) && property.name.getText(source) === 'playerProps'
    ))
    if (!ownsPlayerProps) continue

    const teams = new Set()
    for (const property of current.properties) {
      if (!ts.isPropertyAssignment(property)) continue

      const name = property.name.getText(source)
      if (name === 'playerProps') continue
      if (name === 'teams') collectStringsNamed(property.initializer, source, ['name'], teams)
      if (name === 'matches') collectStringsNamed(property.initializer, source, ['homeTeam', 'awayTeam'], teams)
      if (['homeTeam', 'awayTeam'].includes(name) && ts.isStringLiteral(property.initializer)) {
        teams.add(property.initializer.text)
      }
    }

    return [...teams]
  }

  return []
}

function collectStringsNamed(node, source, names, into) {
  const visit = (child) => {
    if (
      ts.isPropertyAssignment(child)
      && names.includes(child.name.getText(source))
      && ts.isStringLiteral(child.initializer)
    ) {
      into.add(child.initializer.text)
    }
    ts.forEachChild(child, visit)
  }

  ts.forEachChild(node, visit)
}

// Integridade referencial é código: o time do jogador precisa estar na partida declarada.
function auditPlayerPropReferences(props) {
  return props.flatMap((prop) => {
    const abbreviation = prop.teamAbbreviation
    if (abbreviation && prop.matchLabel && !prop.matchLabel.toUpperCase().includes(abbreviation.toUpperCase())) {
      return [{
        check: 'mercado',
        status: 'mismatch',
        subject: `${prop.playerName} · ${prop.market}`,
        detail: `time ${abbreviation} não aparece em "${prop.matchLabel}" · ${prop.location}`,
      }]
    }

    const teams = prop.blockTeams ?? []
    if (!prop.teamName || teams.length === 0) return []
    if (teams.some((team) => sameTeam(team, prop.teamName))) return []

    return [{
      check: 'mercado',
      status: 'mismatch',
      subject: `${prop.playerName} · ${prop.market}`,
      detail: `time ${prop.teamName} não joga nas partidas do bloco (${teams.join(', ')}) · ${prop.location}`,
    }]
  })
}

// Nomes curtos convivem com nomes completos na fixture: "Bayern" vale por "Bayern de Munique".
function sameTeam(left, right) {
  const normalize = (value) => value.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')
  const a = normalize(left)
  const b = normalize(right)

  return a.includes(b) || b.includes(a)
}

function buildQuestions({ translations, leaks, playerProps, cache, limit }) {
  const questions = []

  for (const [source, target] of translations.real) {
    questions.push({
      check: 'traducao',
      id: questionId('traducao', source),
      subject: source,
      detail: `-> "${target}"`,
      state: { portugues: source, espanhol: target },
      question: {
        type: 'noul',
        instructions: 'Does `espanhol` carry the same meaning and intent as `portugues`?',
        criteria: {
          true: 'A reader of the Spanish app understands the same thing and is led to the same action.'
            + ' Deliberate localization counts as the same: a market may take the name used in Spanish.',
          false: 'A reader would understand something different: the subject, the action, a number, a team,'
            + ' a player or an amount is not the same, or the text was left in Portuguese.',
        },
      },
    })
  }

  for (const leak of leaks) {
    questions.push({
      check: 'vazamento',
      id: questionId('vazamento', leak.value),
      subject: leak.value,
      detail: leak.location,
      state: { texto: leak.value },
      question: {
        type: 'noul',
        instructions: 'Is `texto` written in Spanish, as required for the Mexican Spanish version of the app?',
        criteria: {
          true: 'It is Spanish, or a name, number or word that is identical in Spanish and Portuguese.',
          false: 'It is Portuguese and a Spanish speaker would notice it as foreign.',
        },
      },
    })
  }

  for (const prop of playerProps) {
    questions.push({
      check: 'mercado',
      id: questionId('mercado', `${prop.playerName}|${prop.market}|${prop.position}`),
      subject: `${prop.playerName} · ${prop.market}`,
      detail: `${prop.position} · ${prop.matchLabel ?? prop.teamName} · ${prop.location}`,
      state: {
        esporte: prop.sport ?? null,
        jogador: prop.playerName,
        time: prop.teamName ?? null,
        posicao: prop.position,
        mercado: prop.market,
      },
      question: {
        type: 'noul',
        instructions: 'Can a player at `posicao` in `esporte` plausibly be offered the betting market in `mercado`?',
        criteria: {
          true: 'The market matches what a player in that position does on the field.',
          false: 'The market belongs to another position, another sport, or could not apply to this player.',
        },
      },
    })
  }

  // O hash cobre estado e pergunta: mudar um critério reavalia tudo, em vez de reusar o cache.
  for (const item of questions) {
    item.hash = hashOf([item.check, JSON.stringify(item.state), JSON.stringify(item.question)])
  }

  const pending = questions.filter((item) => cache[item.id] !== item.hash)
  return pending.slice(0, limit === Infinity ? pending.length : limit)
}

function questionId(check, subject) {
  return `${check}_${createHash('sha1').update(subject).digest('hex').slice(0, 12)}`
}

function hashOf(parts) {
  return createHash('sha1').update(parts.join('|~|')).digest('hex').slice(0, 16)
}

async function loadCache() {
  try {
    return JSON.parse(await readFile(cachePath, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return {}
    throw error
  }
}

// Só entra no cache o que passou: um achado precisa reaparecer até alguém corrigir.
async function saveCache(cache, judged) {
  const next = { ...cache }
  for (const item of judged) {
    if (item.status === 'ok') next[item.id] = item.hash
    else delete next[item.id]
  }

  await mkdir(path.dirname(cachePath), { recursive: true })
  await writeFile(cachePath, JSON.stringify(next, null, 2))
}

async function askTypeSafe(apiKey, questions, batchSize) {
  const answers = {}
  const usage = { input_tokens: 0, output_tokens: 0 }
  let model = null
  let calls = 0

  for (let start = 0; start < questions.length; start += batchSize) {
    const slice = questions.slice(start, start + batchSize)
    const payload = {
      state: Object.fromEntries(slice.map((item) => [item.id, item.state])),
      model: 'jev-latest',
      questions: Object.fromEntries(slice.map((item) => [
        item.id,
        {
          ...item.question,
          // Cada pergunta olha só o seu recorte do estado compartilhado da requisição.
          instructions: item.question.instructions.replace(/`(\w+)`/g, `\`${item.id}.$1\``),
        },
      ])),
    }

    const response = await callTypeSafe(apiKey, payload)
    Object.assign(answers, response.answers)
    usage.input_tokens += response.usage?.input_tokens ?? 0
    usage.output_tokens += response.usage?.output_tokens ?? 0
    model = response.model ?? model
    calls += 1
  }

  return { answers, usage, model, calls }
}

async function callTypeSafe(apiKey, payload) {
  const retryable = new Set([429, 529])
  let lastError

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30_000)
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout))
      const body = await response.json().catch(() => null)

      if (response.ok) return body
      if (!retryable.has(response.status) || attempt === 2) {
        const detail = body?.detail ?? body?.message ?? `HTTP ${response.status}`
        throw new Error(`a API do TypeSafe recusou a auditoria: ${detail}`)
      }
    } catch (error) {
      lastError = error
      if (attempt === 2 || !isRetryableError(error)) break
    }

    await wait(500 * (2 ** attempt))
  }

  if (lastError?.name === 'AbortError') {
    throw new Error('a API do TypeSafe não respondeu em 30 segundos')
  }
  throw lastError ?? new Error('a API do TypeSafe não respondeu')
}

const isRetryableError = (error) => (
  error?.name === 'AbortError'
  || error instanceof TypeError
  || /HTTP (429|529)/.test(error?.message ?? '')
)
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

// Noul devolve a probabilidade do sim; ela é o próprio sinal, sem confiança separada.
function evaluateAnswers(questions, answers, threshold) {
  return questions.map((item) => {
    const answer = answers?.[item.id]
    if (!answer || answer.type !== 'noul' || typeof answer.noul !== 'number') {
      throw new Error(`a API não devolveu uma resposta Noul para "${item.subject}"`)
    }

    const status = answer.noul >= threshold ? 'ok' : (answer.noul <= 1 - threshold ? 'mismatch' : 'review')
    return { ...item, noul: answer.noul, status }
  })
}

async function loadApiKey() {
  const fromEnvironment = process.env.TYPESAFE_API_KEY?.trim()
  if (fromEnvironment) return fromEnvironment

  const envPaths = [path.join(repoRoot, '.env.typesafe.local')]
  const worktreesRoot = path.dirname(repoRoot)
  if (path.basename(worktreesRoot) === '.worktrees') {
    envPaths.push(path.join(path.dirname(worktreesRoot), '.env.typesafe.local'))
  }

  let contents = null
  for (const envPath of envPaths) {
    try {
      contents = await readFile(envPath, 'utf8')
      break
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }

  if (contents === null) {
    throw new Error(
      'TYPESAFE_API_KEY ausente. Crie `.env.typesafe.local` com '
      + '`TYPESAFE_API_KEY=sua_chave`.',
    )
  }

  const line = contents.split(/\r?\n/).find((entry) => /^\s*TYPESAFE_API_KEY\s*=/.test(entry))
  const value = line?.replace(/^\s*TYPESAFE_API_KEY\s*=\s*/, '').trim()
  const unquoted = value?.replace(/^(["'])(.*)\1$/, '$2').trim()

  if (!unquoted) throw new Error('TYPESAFE_API_KEY está vazia em `.env.typesafe.local`')
  return unquoted
}

function printDryRun({ offline, questions, translations, leaks, playerProps }) {
  console.log('TypeSafe copy QA · dry-run')
  printOffline(offline)

  const byCheck = (check) => questions.filter((item) => item.check === check).length
  const total = translations.real.length + translations.identity.length + translations.redundant.length
  console.log(
    `Corpus: ${total} entrada(s) do catálogo, ${leaks.candidates.length} texto(s) ambíguo(s), `
    + `${playerProps.length} player prop(s).`,
  )
  console.log(
    `Resolvidas no código: ${translations.redundant.length} entrada(s) que só repetem um regex existente.`,
  )
  printIdentity(translations.identity)
  console.log(
    `Iriam ao TypeSafe: ${questions.length} pergunta(s) — ${byCheck('traducao')} tradução, `
    + `${byCheck('vazamento')} vazamento, ${byCheck('mercado')} mercado.`,
  )
}

// Conferência humana, não achado: a maioria destes está certa e o modelo não distingue.
function printIdentity(identity) {
  if (identity.length === 0) return

  console.log(`Mantidas iguais ao português, conferir a olho (${identity.length}):`)
  console.log(`  ${identity.map(([source]) => source).join(' · ')}`)
}

function printReport(report) {
  console.log(`TypeSafe copy QA${report.model ? ` · ${report.model}` : ''}`)
  printOffline(report.offline)
  printIdentity(report.translations?.identity ?? [])

  for (const item of report.judged) {
    if (item.status === 'ok') continue

    const marker = item.status === 'mismatch' ? 'DIVERGE' : 'REVISAR'
    const probability = `${Math.round(item.noul * 100)}%`
    console.log(`${marker.padEnd(8)} ${item.check.padEnd(10)} ${item.subject} ${item.detail} · ${probability}`)
  }

  const judgedFindings = report.judged.filter((item) => item.status !== 'ok').length
  const input = report.usage?.input_tokens ?? 0
  const output = report.usage?.output_tokens ?? 0

  console.log(
    `${report.offline.length} achado(s) local(is) · ${report.judged.length} avaliado(s) pelo Jev · `
    + `${judgedFindings} para revisar · ${input + output} tokens (${input} entrada + ${output} saída) · `
    + `${report.calls} chamada(s) · ${report.elapsedMs} ms`,
  )
}

function printOffline(offline) {
  for (const finding of offline) {
    console.log(`LOCAL    ${finding.check.padEnd(10)} ${finding.subject} · ${finding.detail}`)
  }
}

function printJson(report) {
  console.log(JSON.stringify(report, null, 2))
}
