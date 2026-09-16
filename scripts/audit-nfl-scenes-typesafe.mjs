// Auditor semântico opcional para os lances difíceis do campinho NFL.
//
// O replay continua determinístico. Este script compara, fora do app, a interpretação do
// fixture com o texto oficial do nflverse e usa o Jev apenas em `no_play` e sacks — casos em
// que as colunas estatísticas podem esconder o que aconteceu em campo.
//
// Uso:
//   npm run qa:nfl:typesafe -- --dry-run
//   npm run qa:nfl:typesafe
//   npm run qa:nfl:typesafe -- --ids=360,696 --threshold=0.8

// A chave pode vir do ambiente ou de `.env.typesafe.local`. Ela nunca é impressa.

// Saída 0: todas as classificações conferem e superam o limite de confiança.
// Saída 1: há divergência ou baixa confiança — revisão humana necessária.
// Saída 2: configuração, dado ou chamada externa falhou.

import { readFile, writeFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fixturePath = path.join(repoRoot, 'src/data/nflLiveGame.json')
const apiUrl = 'https://api.typesafe.ai/v1/systemone'
const defaultThreshold = 0.75

let options
try {
  options = parseArgs(process.argv.slice(2))
} catch (error) {
  console.error(`TypeSafe NFL QA: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(2)
}

if (options.help) {
  printHelp()
  process.exit(0)
}

try {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'))
  const gameId = fixture.source?.gameId

  if (!gameId) throw new Error('o fixture não informa `source.gameId`')

  const candidates = fixture.plays
    .filter((play) => play.noPlay || play.sack)
    .filter((play) => options.ids.size === 0 || options.ids.has(play.id))

  if (candidates.length === 0) {
    throw new Error(options.ids.size > 0
      ? `nenhum lance encontrado para --ids=${[...options.ids].join(',')}`
      : 'o fixture não contém `no_play` nem sack para auditar')
  }

  const rawPlays = await loadGamePlayByPlay(gameId)
  const rawById = new Map(rawPlays.map((play) => [play.play_id, play]))
  const missingSource = candidates.filter((play) => !rawById.has(play.id))
  const auditable = candidates
    .filter((play) => rawById.has(play.id))
    .map((play) => ({
      id: play.id,
      description: rawById.get(play.id).desc,
      expected: expectedEvent(play),
    }))

  if (auditable.length === 0) {
    throw new Error('nenhum candidato tem descrição correspondente no play-by-play oficial')
  }

  if (options.dryRun) {
    printDryRun({ gameId, auditable, missingSource })
    process.exit(0)
  }

  const apiKey = await loadApiKey()
  const payload = buildRequest(gameId, auditable)
  const startedAt = Date.now()
  const response = await callTypeSafe(apiKey, payload)
  const elapsedMs = Date.now() - startedAt
  const results = evaluateAnswers(auditable, response.answers, options.threshold)
  const report = {
    gameId,
    model: response.model,
    threshold: options.threshold,
    elapsedMs,
    usage: response.usage,
    skipped: missingSource.map((play) => play.id),
    results,
  }

  if (options.json) printJson(report)
  else printReport(report)

  process.exitCode = results.some((result) => result.status !== 'ok') ? 1 : 0
} catch (error) {
  console.error(`TypeSafe NFL QA: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 2
}

function parseArgs(args) {
  const values = Object.fromEntries(args.map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=')
    return [key, rest.length > 0 ? rest.join('=') : true]
  }))
  const threshold = values.threshold === undefined
    ? defaultThreshold
    : Number(values.threshold)

  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new Error('`--threshold` deve ser um número entre 0 e 1')
  }

  const ids = new Set(
    typeof values.ids === 'string'
      ? values.ids.split(',').map((id) => id.trim()).filter(Boolean)
      : [],
  )

  return {
    dryRun: values['dry-run'] === true,
    help: values.help === true,
    ids,
    json: values.json === true,
    threshold,
  }
}

function printHelp() {
  console.log(`Auditoria semântica dos lances ambíguos do campinho NFL

Uso:
  npm run qa:nfl:typesafe -- [opções]

Opções:
  --dry-run          Lista os candidatos sem chamar o TypeSafe
  --ids=360,696      Audita somente os ids informados
  --threshold=0.75   Confiança mínima para aprovação (0 a 1)
  --json             Imprime o relatório em JSON
  --help             Mostra esta ajuda`)
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

function expectedEvent(play) {
  if (play.sack) return 'sack'
  if (!play.noPlay) return 'other'

  const nullified = play.nullified
  if (!nullified) return 'no_ball_action'
  if (nullified.kind === 'run') return 'voided_run'
  if (nullified.kind === 'pass') {
    return nullified.complete ? 'voided_complete_pass' : 'voided_incomplete_pass'
  }

  return 'other'
}

function buildRequest(gameId, plays) {
  const state = {
    gameId,
    plays: plays.map(({ id, description }) => ({ id, description })),
  }
  const criteria = {
    no_ball_action: 'No snap action or ball movement happened, such as a pre-snap penalty.',
    voided_run: 'A runner carried the ball, but a penalty nullified the play.',
    voided_complete_pass: 'A pass was thrown and caught, but a penalty nullified the play.',
    voided_incomplete_pass: 'A pass was thrown and not caught, but a penalty nullified the play.',
    sack: 'The quarterback was tackled before releasing a completed pass attempt.',
    other: 'The description shows another event or does not contain enough evidence.',
  }
  const questions = Object.fromEntries(plays.map((play, index) => [
    questionId(play.id),
    {
      type: 'choice',
      instructions: [
        `Classify the physical event in \`plays[${index}].description\` for a conservative field replay.`,
        'Use only the official description. If a penalty nullified an action that still happened,',
        'classify that action. If the penalty happened before the snap, choose `no_ball_action`.',
      ].join(' '),
      criteria,
    },
  ]))

  return { state, model: 'jev-latest', questions }
}

function questionId(playId) {
  return `event_${String(playId).replace(/[^a-zA-Z0-9_]/g, '_')}`
}

async function callTypeSafe(apiKey, payload) {
  const retryable = new Set([429, 529])
  let lastError

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 20_000)
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
    throw new Error('a API do TypeSafe não respondeu em 20 segundos')
  }
  throw lastError ?? new Error('a API do TypeSafe não respondeu')
}

const isRetryableError = (error) => (
  error?.name === 'AbortError'
  || error instanceof TypeError
  || /HTTP (429|529)/.test(error?.message ?? '')
)
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

function evaluateAnswers(plays, answers, threshold) {
  return plays.map((play) => {
    const answer = answers?.[questionId(play.id)]
    if (!answer || answer.type !== 'choice') {
      throw new Error(`a API não devolveu uma resposta Choice para o lance ${play.id}`)
    }

    const mismatch = answer.choice !== play.expected
    const lowConfidence = answer.confidence < threshold

    return {
      id: play.id,
      expected: play.expected,
      choice: answer.choice,
      confidence: answer.confidence,
      probabilities: answer.probabilities,
      status: mismatch ? 'mismatch' : (lowConfidence ? 'review' : 'ok'),
    }
  })
}

function printDryRun({ gameId, auditable, missingSource }) {
  console.log(`TypeSafe NFL QA · dry-run · jogo ${gameId}`)
  for (const play of auditable) console.log(`- ${play.id}: esperado ${play.expected}`)
  if (missingSource.length > 0) {
    console.log(`Ignorados sem súmula oficial: ${missingSource.map((play) => play.id).join(', ')}`)
  }
  console.log(`${auditable.length} lance(s) seriam enviados em uma única chamada.`)
}

function printReport(report) {
  console.log(`TypeSafe NFL QA · ${report.model} · jogo ${report.gameId}`)
  for (const result of report.results) {
    const marker = result.status === 'ok' ? 'OK' : 'REVISAR'
    const confidence = `${Math.round(result.confidence * 100)}%`
    const comparison = result.choice === result.expected
      ? result.choice
      : `esperado ${result.expected}, Jev ${result.choice}`
    console.log(`${marker.padEnd(7)} ${result.id.padEnd(5)} ${comparison} · confiança ${confidence}`)
  }

  if (report.skipped.length > 0) {
    console.log(`Ignorados sem súmula oficial: ${report.skipped.join(', ')}`)
  }

  const input = report.usage?.input_tokens ?? 0
  const output = report.usage?.output_tokens ?? 0
  const findings = report.results.filter((result) => result.status !== 'ok').length
  console.log(
    `${report.results.length} auditado(s) · ${findings} para revisar · `
    + `${input + output} tokens (${input} entrada + ${output} saída) · ${report.elapsedMs} ms`,
  )
}

function printJson(report) {
  console.log(JSON.stringify(report, null, 2))
}

async function loadGamePlayByPlay(gameId) {
  const season = gameId.slice(0, 4)
  const cachePath = path.join(os.tmpdir(), `nflverse_pbp_${season}.csv.gz`)
  let compressed

  try {
    compressed = await readFile(cachePath)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error

    const url = `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_${season}.csv.gz`
    // `--json` precisa manter stdout como JSON puro; progresso externo vai para stderr.
    console.error(`Baixando play-by-play ${season} do nflverse…`)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`download do nflverse falhou: HTTP ${response.status}`)
    compressed = Buffer.from(await response.arrayBuffer())
    await writeFile(cachePath, compressed)
  }

  const csv = gunzipSync(compressed).toString('utf8')
  return parseCsv(csv).filter((play) => play.game_id === gameId)
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  const header = rows.shift()
  if (!header) return []

  return rows
    .filter((cells) => cells.length === header.length)
    .map((cells) => Object.fromEntries(header.map((key, index) => [key, cells[index]])))
}
