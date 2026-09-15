// Gera src/data/nflLiveGame.json a partir do play-by-play do nflverse.
//
// Por que um fixture e não uma busca em tempo de execução: o nflverse não é API, é um
// arquivo por temporada (~19 MB comprimido) no GitHub Releases. Baixar isso no navegador
// para mostrar um jogo seria absurdo, então extraímos a partida uma vez e versionamos o
// recorte. O dado é real; o que é estático é o recorte.
//
// Tudo é acumulado ATÉ a jogada de corte, para que o protótipo mostre o jogo "ao vivo"
// naquele instante: placar por quarter, estatística de jogador e comparação entre equipes.
//
// Uso: node scripts/build-nfl-live-fixture.mjs [--game=2023_19_MIA_KC] [--cutoff=1520]

import { readFile, writeFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=')
    return [key, value ?? true]
  })
)

const GAME_ID = args.game ?? '2023_19_MIA_KC'
const CUTOFF = Number(args.cutoff ?? 1520)
const SEASON = GAME_ID.slice(0, 4)
const PBP_URL = `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_${SEASON}.csv.gz`

// Nomes e apelidos ficam aqui porque o pbp só traz a sigla do time.
// A cor é a oficial de cada franquia e alimenta as barras de comparação.
const TEAMS = {
  KC: { abbr: 'KC', name: 'KC Chiefs', nickname: 'Chiefs', color: '#E31837' },
  MIA: { abbr: 'MIA', name: 'MIA Dolphins', nickname: 'Dolphins', color: '#008E97' },
}

// ── CSV com aspas: o campo `desc` tem vírgulas, então não dá para usar split(',')
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1 } else { quoted = false }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') { quoted = true }
    else if (char === ',') { row.push(field); field = '' }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (char !== '\r') { field += char }
  }

  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }

  const header = rows.shift()
  return rows
    .filter((cells) => cells.length === header.length)
    .map((cells) => Object.fromEntries(header.map((key, index) => [key, cells[index]])))
}

const num = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
const isOne = (value) => value === '1'

async function loadPbp() {
  const cachePath = path.join(os.tmpdir(), `nflverse_pbp_${SEASON}.csv.gz`)

  try {
    await readFile(cachePath)
  } catch {
    process.stdout.write(`baixando ${PBP_URL}\n`)
    const response = await fetch(PBP_URL)
    if (!response.ok) throw new Error(`download falhou: ${response.status}`)
    await writeFile(cachePath, Buffer.from(await response.arrayBuffer()))
  }

  const csv = gunzipSync(await readFile(cachePath)).toString('utf8')
  return parseCsv(csv).filter((play) => play.game_id === GAME_ID)
}

// ── Estatística de jogador, acumulada até o corte ──────────────────────────
function buildPlayers(plays) {
  const byTeam = {}
  const ensure = (team, id, name) => {
    if (!team || !id) return null
    byTeam[team] ??= {}
    byTeam[team][id] ??= {
      id,
      name,
      passing: { completions: 0, attempts: 0, yards: 0, tds: 0, interceptions: 0 },
      rushing: { carries: 0, yards: 0, tds: 0 },
      receiving: { receptions: 0, yards: 0, tds: 0 },
      kicking: { fgMade: 0, fgAtt: 0, xpMade: 0, xpAtt: 0 },
      defense: { tackles: 0, sacks: 0, interceptions: 0, passesDefended: 0 },
      returns: { returns: 0, yards: 0 },
      punting: { punts: 0, yards: 0 },
    }
    return byTeam[team][id]
  }

  for (const play of plays) {
    const offense = play.posteam
    const defense = play.defteam

    // Passe: sack não conta como tentativa, seguindo a súmula.
    if (play.passer_player_id && !isOne(play.sack) && play.play_type === 'pass') {
      const passer = ensure(offense, play.passer_player_id, play.passer_player_name)
      if (passer) {
        passer.passing.attempts += 1
        if (isOne(play.complete_pass)) {
          passer.passing.completions += 1
          passer.passing.yards += num(play.passing_yards)
        }
        if (isOne(play.pass_touchdown)) passer.passing.tds += 1
        if (isOne(play.interception)) passer.passing.interceptions += 1
      }
    }

    if (play.rusher_player_id && play.play_type === 'run') {
      const rusher = ensure(offense, play.rusher_player_id, play.rusher_player_name)
      if (rusher) {
        rusher.rushing.carries += 1
        rusher.rushing.yards += num(play.rushing_yards)
        if (isOne(play.rush_touchdown)) rusher.rushing.tds += 1
      }
    }

    if (play.receiver_player_id && play.play_type === 'pass') {
      const receiver = ensure(offense, play.receiver_player_id, play.receiver_player_name)
      if (receiver && isOne(play.complete_pass)) {
        receiver.receiving.receptions += 1
        receiver.receiving.yards += num(play.receiving_yards)
        if (isOne(play.pass_touchdown)) receiver.receiving.tds += 1
      }
    }

    if (play.kicker_player_id) {
      const kicker = ensure(offense, play.kicker_player_id, play.kicker_player_name)
      if (kicker && play.play_type === 'field_goal') {
        kicker.kicking.fgAtt += 1
        if (play.field_goal_result === 'made') kicker.kicking.fgMade += 1
      }
      if (kicker && play.play_type === 'extra_point') {
        kicker.kicking.xpAtt += 1
        if (play.extra_point_result === 'good') kicker.kicking.xpMade += 1
      }
    }

    if (play.punter_player_id) {
      const punter = ensure(offense, play.punter_player_id, play.punter_player_name)
      if (punter) { punter.punting.punts += 1; punter.punting.yards += num(play.kick_distance) }
    }

    for (const prefix of ['punt_returner', 'kickoff_returner']) {
      const id = play[`${prefix}_player_id`]
      if (!id) continue
      const returner = ensure(defense || offense, id, play[`${prefix}_player_name`])
      if (returner) { returner.returns.returns += 1; returner.returns.yards += num(play.return_yards) }
    }

    // Defesa: o pbp espalha os participantes em colunas numeradas.
    for (const field of ['solo_tackle_1', 'solo_tackle_2', 'assist_tackle_1', 'assist_tackle_2', 'assist_tackle_3', 'assist_tackle_4']) {
      const id = play[`${field}_player_id`]
      if (!id) continue
      const player = ensure(defense, id, play[`${field}_player_name`])
      if (player) player.defense.tackles += 1
    }
    if (play.sack_player_id) {
      const player = ensure(defense, play.sack_player_id, play.sack_player_name)
      if (player) player.defense.sacks += 1
    }
    for (const field of ['half_sack_1', 'half_sack_2']) {
      const id = play[`${field}_player_id`]
      if (!id) continue
      const player = ensure(defense, id, play[`${field}_player_name`])
      if (player) player.defense.sacks += 0.5
    }
    if (play.interception_player_id) {
      const player = ensure(defense, play.interception_player_id, play.interception_player_name)
      if (player) player.defense.interceptions += 1
    }
    for (const field of ['pass_defense_1', 'pass_defense_2']) {
      const id = play[`${field}_player_id`]
      if (!id) continue
      const player = ensure(defense, id, play[`${field}_player_name`])
      if (player) player.defense.passesDefended += 1
    }
  }

  const categories = {
    passing: (s) => s.passing.attempts > 0,
    rushing: (s) => s.rushing.carries > 0,
    receiving: (s) => s.receiving.receptions > 0,
    kicking: (s) => s.kicking.fgAtt > 0 || s.kicking.xpAtt > 0,
    defense: (s) => s.defense.tackles > 0 || s.defense.sacks > 0 || s.defense.interceptions > 0 || s.defense.passesDefended > 0,
    returns: (s) => s.returns.returns > 0,
    punting: (s) => s.punting.punts > 0,
  }
  const sortKey = {
    passing: (s) => s.passing.yards,
    rushing: (s) => s.rushing.yards,
    receiving: (s) => s.receiving.yards,
    kicking: (s) => s.kicking.fgMade,
    defense: (s) => s.defense.tackles + s.defense.sacks,
    returns: (s) => s.returns.yards,
    punting: (s) => s.punting.punts,
  }

  return Object.fromEntries(Object.entries(byTeam).map(([team, players]) => [
    team,
    Object.fromEntries(Object.entries(categories).map(([category, hasData]) => [
      category,
      Object.values(players)
        .filter(hasData)
        .sort((a, b) => sortKey[category](b) - sortKey[category](a))
        .map((player) => ({ id: player.id, name: player.name, ...player[category] })),
    ])),
  ]))
}

// ── Comparação entre equipes, acumulada até o corte ────────────────────────
function buildTeamTotals(plays) {
  const totals = {}
  const ensure = (team) => {
    if (!team) return null
    totals[team] ??= {
      passYards: 0, rushYards: 0, firstDowns: 0,
      thirdDownAtt: 0, thirdDownConv: 0, turnovers: 0,
      penalties: 0, penaltyYards: 0, possessionSeconds: 0,
    }
    return totals[team]
  }

  const countedDrives = new Set()

  for (const play of plays) {
    const offense = ensure(play.posteam)
    if (offense) {
      offense.passYards += num(play.passing_yards)
      offense.rushYards += num(play.rushing_yards)
      if (isOne(play.first_down)) offense.firstDowns += 1
      if (play.down === '3') {
        offense.thirdDownAtt += 1
        if (isOne(play.third_down_converted)) offense.thirdDownConv += 1
      }
      if (isOne(play.interception)) offense.turnovers += 1
      if (isOne(play.fumble_lost)) offense.turnovers += 1
    }

    const penalized = ensure(play.penalty_team)
    if (penalized && isOne(play.penalty)) {
      penalized.penalties += 1
      penalized.penaltyYards += num(play.penalty_yards)
    }

    // O tempo de posse vem pronto por campanha; só não pode ser somado por lance.
    const drive = play.drive
    if (drive && play.drive_time_of_possession && play.posteam && !countedDrives.has(drive)) {
      countedDrives.add(drive)
      const [minutes, seconds] = play.drive_time_of_possession.split(':')
      totals[play.posteam].possessionSeconds += Number(minutes) * 60 + Number(seconds)
    }
  }

  return totals
}

const formatClock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

// ── Campanhas (drives) ─────────────────────────────────────────────────────
//
// O nflverse traz `drive_play_count` e `drive_time_of_possession` prontos, mas são
// valores FINAIS da campanha: usá-los na campanha ainda em andamento no corte vazaria o
// futuro (mostraria as 12 jogadas de uma campanha que, no instante do jogo, tem 11). Por
// isso a campanha em andamento é recalculada a partir dos lances vistos até o corte;
// as encerradas usam as colunas oficiais, que batem exatamente com esse cálculo.

const clockToSeconds = (clock) => {
  const [minutes, seconds] = String(clock).split(':').map(Number)
  return minutes * 60 + seconds
}

// Distância até a end zone adversária, para medir o ganho líquido de campo.
const yardsToGoal = (yardLine, posteam) => {
  if (!yardLine) return null
  const value = yardLine.trim()
  if (value === '50') return 50
  const [side, number] = value.split(' ')
  return side === posteam ? 100 - Number(number) : Number(number)
}

// Lances que o `drive_play_count` do nflverse não conta.
const NON_DRIVE_PLAYS = new Set(['kickoff', 'punt', 'extra_point', 'no_play', 'NA', ''])

// ── Lances (plays) ─────────────────────────────────────────────────────────
//
// Posição absoluta em jardas a partir da própria end zone de quem ataca (0..100), para
// que a geometria do campo não precise saber de siglas: "KC 31" com posse do KC é 31;
// "MIA 44" com posse do KC é 56.
const absoluteYard = (yardLine, posteam) => {
  if (!yardLine) return null
  const value = yardLine.trim()
  if (value === '50') return 50
  const [side, number] = value.split(' ')
  return side === posteam ? Number(number) : 100 - Number(number)
}

const orEmpty = (value) => (value && value !== 'NA' ? value : null)

/**
 * Lado do campo em que o lance ACONTECEU: `left`, `middle` ou `right`, na perspectiva de
 * quem ataca. É o que permite desenhar cada jogada numa profundidade diferente do campo.
 *
 * ATENÇÃO — este campo é INFERIDO, e o nome evita prometer o que ele não é. O pbp não traz a
 * posição lateral da bola: não existe coluna de hash mark nem coordenada. O que existe é
 * para onde o lance FOI (`pass_location` / `run_location`), e é dele que inferimos o lado.
 * A inferência é causalmente invertida — um passe da hash esquerda para a lateral direita
 * sai inteiro na faixa direita, origem inclusive. O comportamento é deliberado e aprovado:
 * lido como "de que lado do campo o lance correu", o desenho é coerente.
 *
 * ESTE É O PONTO DE ENTRADA para quando um fornecedor trouxer a posição real da bola no
 * snap: é só devolver o lado a partir dela aqui, e o resto do replay continua igual —
 * `depthForPlaySide` em `src/features/sports/NflPlayReplay/fieldGeometry.ts` é o único
 * consumidor, e ele só quer saber o lado.
 *
 * Quem não tem lado próprio herda o do lance anterior, porque a bola não andou de lado:
 * punt e jogada anulada saem do mesmo ponto. Kickoff, field goal e ponto extra são do
 * centro por regra.
 */
/**
 * Jogada anulada por penalidade: o que ela FOI, extraído do texto oficial do lance.
 *
 * Por que precisa disto: o nflverse não preenche as colunas estatísticas (`passer`,
 * `air_yards`, `yards_gained`) em `no_play`, porque o lance não conta na súmula. Mas ele
 * aconteceu em campo, e o `desc` descreve. Sem isto o protótipo mostrava campo vazio até
 * para um TOUCHDOWN anulado.
 *
 * Nem toda anulada teve jogada: falta antes do snap (False Start, Delay of Game) para o
 * lance antes de ele existir, e pedido de tempo também entra como `no_play`. Nesses casos o
 * texto não traz jogada e a função devolve `null` — mostrar algo ali seria invenção.
 *
 * Conferido contra os 17 `no_play` deste jogo: 6 com jogada, 11 sem.
 */
const NOME_NO_TEXTO = String.raw`(?:\d+-)?([A-Z]\.[A-Za-zÀ-ÿ'\-\.]+)`

function parseNullified(descRaw) {
  const d = (descRaw ?? '').replace(/\s+/g, ' ')
  // Tudo antes de "PENALTY on" é a jogada; o resto é a marcação da falta.
  const antes = d.split(' PENALTY on ')[0]
    .replace(/^\(\d*:\d+\)\s*/, '')
    .replace(/\((?:Shotgun|No Huddle[^)]*|Punt formation|Field Goal formation)\)\s*/g, '')
    .trim()
  if (!antes || /^Timeout/.test(antes)) return null

  const touchdown = /TOUCHDOWN/.test(antes)
  const ganho = (m) => (m == null ? 0 : (m === 'no gain' ? 0 : Number(m)))
  // O nome vem grudado no ponto final da frase quando é o último token.
  const limpo = (n) => (n ? n.replace(/\.$/, '') : null)

  // Grupos: 1 passador, 2 'incomplete ', 3 short|deep, 4 lado, 5 recebedor, 6 jardas.
  const passe = new RegExp(
    NOME_NO_TEXTO + String.raw` pass (incomplete )?(short|deep) (left|middle|right)`
    + String.raw`(?: to ` + NOME_NO_TEXTO + String.raw`)?`
    + String.raw`(?: for (-?\d+|no gain))?`,
  ).exec(antes)
  if (passe) {
    return {
      kind: 'pass',
      passer: limpo(passe[1]),
      receiver: limpo(passe[5]),
      rusher: null,
      complete: !passe[2],
      location: passe[4],
      yards: passe[2] ? 0 : ganho(passe[6]),
      touchdown,
    }
  }

  const corrida = new RegExp(
    NOME_NO_TEXTO + String.raw` (?:(left|right) (?:end|tackle|guard)|up the middle|scrambles[^.]*?)`
    + String.raw` to [A-Z]{2,3} \d+ for (-?\d+|no gain)`,
  ).exec(antes)
  if (corrida) {
    return {
      kind: 'run',
      passer: null,
      receiver: null,
      rusher: limpo(corrida[1]),
      complete: true,
      location: corrida[2] ?? 'middle',
      yards: ganho(corrida[3]),
      touchdown,
    }
  }

  return null
}

const CENTERED_TYPES = new Set(['kickoff', 'field_goal', 'extra_point'])

function playSideOf(play, previous, nullified) {
  if (CENTERED_TYPES.has(play.play_type)) return 'middle'

  // Numa anulada as colunas de lado vêm vazias, mas o texto traz o lado real.
  const raw = nullified?.location ?? (play.play_type === 'run' ? play.run_location : play.pass_location)
  if (raw === 'left' || raw === 'middle' || raw === 'right') return raw

  return previous
}

function buildPlays(plays, home) {
  let previousSide = 'middle'

  return plays
    .filter((play) => play.fixed_drive && play.posteam && play.play_type && play.play_type !== 'NA')
    .map((play) => {
      const start = absoluteYard(play.yrdln, play.posteam)
      const nullified = play.play_type === 'no_play' ? parseNullified(play.desc) : null
      const playSide = playSideOf(play, previousSide, nullified)
      previousSide = playSide
      const air = play.air_yards === '' || play.air_yards === 'NA' ? null : num(play.air_yards)
      const afterCatch = play.yards_after_catch === '' || play.yards_after_catch === 'NA'
        ? null
        : num(play.yards_after_catch)

      return {
        id: play.play_id,
        driveId: play.fixed_drive,
        quarter: Number(play.qtr),
        clock: play.time,
        side: play.posteam === home ? 'home' : 'away',
        type: play.play_type,
        down: Number(play.down) || null,
        distance: Number(play.ydstogo) || null,
        // Posição do snap e ganho total. O ponto da recepção sai de `airYards`, e o que
        // vem depois é corrida — juntar os dois num número só seria fingir que a bola
        // voou o lance inteiro.
        startYard: start,
        /** Lado do campo em que o lance correu, usado como profundidade. Ver `playSideOf`. */
        playSide,
        yards: num(play.yards_gained),
        airYards: air,
        yardsAfterCatch: afterCatch,
        complete: isOne(play.complete_pass),
        touchdown: isOne(play.touchdown),
        firstDown: isOne(play.first_down),
        // Só `no_play` é jogada anulada — é assim que o nflverse marca o lance que a
        // penalidade cancelou. Uma penalidade num lance que valeu (recusada, ou marcada
        // no retorno) mantém o tipo real, então não pode virar "anulada".
        noPlay: play.play_type === 'no_play',
        penalty: isOne(play.penalty),
        /** Tipo da falta, para a linha de resultado dizer por que foi anulada. */
        penaltyType: orEmpty(play.penalty_type),
        /** O que a jogada anulada foi, extraído do texto. `null` quando não houve jogada. */
        nullified,
        passer: orEmpty(play.passer_player_name),
        receiver: orEmpty(play.receiver_player_name),
        rusher: orEmpty(play.rusher_player_name),
        // Chutes. Atenção ao kickoff: ali `posteam` é quem RECEBE, e `yrdln` é a linha de
        // onde o adversário chuta. Logo, no referencial de `posteam` a bola voa para TRÁS
        // (em direção à própria end zone) e só o retorno anda para frente. Em punt, field
        // goal e ponto extra o chute é do próprio `posteam` e vai para frente.
        kickDistance: play.kick_distance === '' || play.kick_distance === 'NA' ? null : num(play.kick_distance),
        returnYards: num(play.return_yards),
        touchback: isOne(play.touchback),
        // Punt usa `punter_player_name`; `kicker_player_name` fica vazio nele. Sem este
        // fallback TODO punt aparecia sem o nome de quem chutou, e o card ficava com uma
        // linha vazia embaixo do título.
        kicker: orEmpty(play.kicker_player_name) ?? orEmpty(play.punter_player_name),
        returner: orEmpty(play.kickoff_returner_player_name) ?? orEmpty(play.punt_returner_player_name),
        fieldGoalResult: orEmpty(play.field_goal_result),
        /**
         * Como o chute terminou sem retorno. Explica um retorno de 0 jardas, que sozinho
         * parecia dado faltando: a bola foi dominada, houve pedido de posse justa, ou ela
         * saiu pela lateral.
         */
        kickOutcome: isOne(play.touchback) ? 'touchback'
          : isOne(play.punt_downed) ? 'downed'
            : isOne(play.punt_fair_catch) ? 'fair_catch'
              : isOne(play.punt_out_of_bounds) ? 'out_of_bounds'
                : null,
      }
    })
}

function buildDrives(plays, cutoffPlay, home) {
  const byDrive = new Map()
  for (const play of plays) {
    if (!play.fixed_drive || !play.posteam) continue
    if (!byDrive.has(play.fixed_drive)) byDrive.set(play.fixed_drive, [])
    byDrive.get(play.fixed_drive).push(play)
  }

  const lastDriveId = [...byDrive.keys()].pop()

  return [...byDrive.entries()].map(([id, drivePlays]) => {
    const first = drivePlays[0]
    const last = drivePlays[drivePlays.length - 1]
    const inProgress = id === lastDriveId
    const startQuarter = Number(first.drive_quarter_start || first.qtr)

    const playCount = inProgress
      ? drivePlays.filter((play) => !NON_DRIVE_PLAYS.has(play.play_type)).length
      : Number(first.drive_play_count)

    // Encerrada: a janela oficial já é o tempo de posse. Em andamento: do início da
    // campanha até o relógio do corte, somando a virada de quarter quando houver.
    const duration = inProgress
      ? formatClock(
        clockToSeconds(first.drive_game_clock_start)
        - clockToSeconds(cutoffPlay.time)
        + (Number(last.qtr) - startQuarter) * 900,
      )
      : first.drive_time_of_possession

    // Ganho líquido de campo, e não a soma de `yards_gained`: a soma ignora o recuo de
    // penalidade. Em touchdown a campanha termina na end zone, não no último snap.
    const start = yardsToGoal(first.drive_start_yard_line, first.posteam)
    const end = inProgress
      ? yardsToGoal(cutoffPlay.yrdln, first.posteam)
      : (first.fixed_drive_result === 'Touchdown' ? 0 : yardsToGoal(first.drive_end_yard_line, first.posteam))

    // O resultado só existe para campanha encerrada. Em andamento, `fixed_drive_result` já
    // traz o desfecho final — mostrá-lo entregaria o que ainda não aconteceu no jogo.
    const touchdownPlay = inProgress ? null : drivePlays.find((play) => isOne(play.touchdown))
    const fieldGoalPlay = inProgress ? null : drivePlays.find((play) => play.play_type === 'field_goal')

    return {
      id,
      quarter: startQuarter,
      side: first.posteam === home ? 'home' : 'away',
      result: inProgress ? null : (first.fixed_drive_result || null),
      // Quem marcou: anotador do touchdown, ou o chutador quando a campanha terminou em
      // field goal.
      scorer: touchdownPlay
        ? orEmpty(touchdownPlay.td_player_name)
        : (fieldGoalPlay ? orEmpty(fieldGoalPlay.kicker_player_name) : null),
      plays: playCount,
      yards: start !== null && end !== null ? start - end : 0,
      duration,
      inProgress,
    }
  })
}

async function main() {
  const allPlays = await loadPbp()
  if (allPlays.length === 0) throw new Error(`jogo ${GAME_ID} não encontrado`)

  const plays = allPlays.filter((play) => Number(play.play_id) <= CUTOFF)
  const cutoffPlay = plays[plays.length - 1]
  const first = allPlays[0]
  const home = first.home_team
  const away = first.away_team

  // Placar por quarter: diferença do placar acumulado dentro de cada período.
  const quarters = { [home]: [0, 0, 0, 0], [away]: [0, 0, 0, 0] }
  let previousHome = 0
  let previousAway = 0
  for (const play of plays) {
    const quarter = Number(play.qtr)
    if (!quarter || quarter > 4) continue
    quarters[home][quarter - 1] += num(play.total_home_score) - previousHome
    quarters[away][quarter - 1] += num(play.total_away_score) - previousAway
    previousHome = num(play.total_home_score)
    previousAway = num(play.total_away_score)
  }

  const totals = buildTeamTotals(plays)
  const stat = (team, key) => totals[team]?.[key] ?? 0

  const fixture = {
    source: {
      provider: 'nflverse',
      dataset: `play_by_play_${SEASON}`,
      license: 'CC-BY-4.0',
      gameId: GAME_ID,
      cutoffPlayId: CUTOFF,
      generatedBy: 'scripts/build-nfl-live-fixture.mjs',
    },
    game: {
      date: first.game_date,
      stadium: first.stadium,
      temperature: first.temp ? `${first.temp}°F` : null,
      wind: first.wind ? `${first.wind} mph` : null,
      home: TEAMS[home] ?? { abbr: home, name: home, nickname: home },
      away: TEAMS[away] ?? { abbr: away, name: away, nickname: away },
    },
    live: {
      quarter: Number(cutoffPlay.qtr),
      clock: cutoffPlay.time,
      homeScore: num(cutoffPlay.total_home_score),
      awayScore: num(cutoffPlay.total_away_score),
      down: Number(cutoffPlay.down) || null,
      distance: Number(cutoffPlay.ydstogo) || null,
      ballOn: cutoffPlay.yrdln || null,
      possession: cutoffPlay.posteam === home ? 'home' : 'away',
    },
    quarterScores: {
      home: quarters[home],
      away: quarters[away],
      homeTotal: previousHome,
      awayTotal: previousAway,
    },
    players: buildPlayers(plays),
    drives: buildDrives(plays, cutoffPlay, home),
    plays: buildPlays(plays, home),
    teamComparison: [
      { key: 'total-yards', home: stat(home, 'passYards') + stat(home, 'rushYards'), away: stat(away, 'passYards') + stat(away, 'rushYards') },
      { key: 'pass-yards', home: stat(home, 'passYards'), away: stat(away, 'passYards') },
      { key: 'rush-yards', home: stat(home, 'rushYards'), away: stat(away, 'rushYards') },
      { key: 'first-downs', home: stat(home, 'firstDowns'), away: stat(away, 'firstDowns') },
      {
        key: 'third-down',
        home: `${stat(home, 'thirdDownConv')}/${stat(home, 'thirdDownAtt')}`,
        away: `${stat(away, 'thirdDownConv')}/${stat(away, 'thirdDownAtt')}`,
        homeRatio: stat(home, 'thirdDownAtt') ? stat(home, 'thirdDownConv') / stat(home, 'thirdDownAtt') : 0,
        awayRatio: stat(away, 'thirdDownAtt') ? stat(away, 'thirdDownConv') / stat(away, 'thirdDownAtt') : 0,
      },
      { key: 'turnovers', home: stat(home, 'turnovers'), away: stat(away, 'turnovers') },
      {
        key: 'penalties',
        home: `${stat(home, 'penalties')}-${stat(home, 'penaltyYards')}`,
        away: `${stat(away, 'penalties')}-${stat(away, 'penaltyYards')}`,
        homeRatio: stat(home, 'penaltyYards'),
        awayRatio: stat(away, 'penaltyYards'),
      },
      {
        key: 'possession',
        home: formatClock(stat(home, 'possessionSeconds')),
        away: formatClock(stat(away, 'possessionSeconds')),
        homeRatio: stat(home, 'possessionSeconds'),
        awayRatio: stat(away, 'possessionSeconds'),
      },
    ],
  }

  const outPath = path.join(repoRoot, 'src/data/nflLiveGame.json')
  await writeFile(outPath, `${JSON.stringify(fixture, null, 2)}\n`)

  process.stdout.write(`\n${GAME_ID} até a jogada ${CUTOFF}\n`)
  process.stdout.write(`  Q${fixture.live.quarter} ${fixture.live.clock} · ${home} ${fixture.live.homeScore} x ${fixture.live.awayScore} ${away}\n`)
  process.stdout.write(`  ${fixture.live.down}ª & ${fixture.live.distance} na ${fixture.live.ballOn}, posse ${fixture.live.possession}\n`)
  process.stdout.write(`  lances considerados: ${plays.length} de ${allPlays.length}\n`)
  process.stdout.write(`  lances no replay: ${fixture.plays.length}, passes completos: ${fixture.plays.filter((p) => p.type === 'pass' && p.complete && !p.noPlay).length}\n`)
  process.stdout.write(`  campanhas: ${fixture.drives.length} (quarters ${[...new Set(fixture.drives.map((d) => d.quarter))].join(', ')})\n`)
  process.stdout.write(`  escrito em ${path.relative(repoRoot, outPath)}\n`)
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`)
  process.exitCode = 1
})
