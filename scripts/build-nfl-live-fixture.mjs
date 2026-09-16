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
/* O corte fecha a campanha do KC no field goal de 26 jardas (13 x 7), para ela entrar na
   lista com desfecho em vez de ficar pendurada em 3ª & 8 quando a campanha de demonstração
   vem depois. Antes era 1520, uma jogada antes do chute. */
const CUTOFF = Number(args.cutoff ?? 1543)
/** `--demo=0` gera só o recorte real, sem a campanha fabricada (ver `demoPlays`). */
const WITH_DEMO = args.demo !== '0' && args.demo !== 'false'
/**
 * Primeiro lance REAL do que ainda VAI ACONTECER. Ver `continuationPlays` e `buildSteps`.
 *
 * O recorte até `CUTOFF` é o jogo no instante em que o protótipo abre. Deste lance em diante
 * é o horizonte: os lances que chegam sozinhos, um a um, enquanto a pessoa olha a tela.
 */
const HORIZON_FROM = Number(args.horizon ?? 1749)
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
      // Balde de profundidade da própria NFL: `short` abaixo de 15 jardas aéreas, `deep` daí
      // para cima. É a ÚNICA medida de distância que sobra num passe anulado incompleto —
      // ali não há ganho para contar, e sem isto o arco sairia com comprimento zero.
      depth: passe[3],
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
      // Corrida não tem balde de profundidade: a bola não subiu.
      depth: null,
      yards: ganho(corrida[3]),
      touchdown,
    }
  }

  return null
}

/**
 * Jardas da falta no referencial de quem tem a bola. `null` quando não há falta marcada.
 *
 * O nflverse dá o número sempre positivo e diz à parte de quem foi a falta (`penalty_team`).
 * Quem desenha precisa do SENTIDO, e ele sai daí: falta do ataque, a bola volta.
 */
function penaltyMarch(play) {
  if (play.penalty_yards === '' || play.penalty_yards === 'NA') return null
  const jardas = Number(play.penalty_yards)
  if (!Number.isFinite(jardas) || jardas === 0) return null

  return play.penalty_team === play.posteam ? -jardas : jardas
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
        /**
         * Quem cometeu a falta. Numa falta SECA — falso início, atraso de jogo — é a única
         * pessoa que fez alguma coisa no lance, e sem ela o campo mostrava um capacete
         * cinza sem nome num lance em que quem saiu antes do snap foi o Tyreek Hill.
         */
        penaltyBy: orEmpty(play.penalty_player_name),
        /**
         * Jardas da falta, COM SINAL no referencial de quem tem a bola: negativo quando a
         * falta é do ataque (a bola volta), positivo quando é da defesa.
         *
         * É o que o lance tem para mostrar quando a penalidade é a única coisa que houve. O
         * `check:nfl` confere o número contra a linha de scrimmage do lance SEGUINTE — é ali
         * que o recuo aparece de verdade, e é assim que se sabe que ele está certo.
         */
        penaltyYards: penaltyMarch(play),
        /** O que a jogada anulada foi, extraído do texto. `null` quando não houve jogada. */
        nullified,
        passer: orEmpty(play.passer_player_name),
        receiver: orEmpty(play.receiver_player_name),
        rusher: orEmpty(play.rusher_player_name),
        /**
         * Sack: o passe que nunca saiu. O nflverse marca `play_type: 'pass'`, deixa
         * `air_yards` vazio e credita a perda em `yards_gained`.
         *
         * Sem esta marca o protótipo lia só "passe" + "não completou" e dizia PASSE
         * INCOMPLETO num lance que não teve passe nenhum — e, sem jardas aéreas, não
         * desenhava nada. O que o lance tem para contar é a perda: o QB andou para trás.
         */
        sack: isOne(play.sack),
        /** Quem derrubou. Vai para a linha de resultado, como o autor do touchdown. */
        sackedBy: orEmpty(play.sack_player_name),
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
  /* Campanha que ENTREGOU A BOLA está ENCERRADA, mesmo sendo a última do recorte. Sem isto
     ela apareceria sem desfecho na lista — um touchdown sem a palavra "Touchdown" ao lado —
     e as contas de "em andamento" valeriam: o ganho de campo pararia no último snap em vez
     da end zone, e a contagem de lances trocaria a oficial pela parcial.

     O que encerra é a ENTREGA DA BOLA, e não o tipo do lance: pontuação (touchdown, ponto
     extra, field goal) e punt. O punt entrou quando o protótipo passou a percorrer TODOS os
     estados do jogo, um lance por vez: o recorte estático nunca terminava num punt, mas a
     reprodução ao vivo passa por dois deles, e neles a campanha aparecia "em andamento"
     logo depois de o time ter desistido da posse. */
  const DRIVE_ENDING_KICKS = new Set(['extra_point', 'field_goal', 'punt'])
  const endsDrive = (play) => DRIVE_ENDING_KICKS.has(play.play_type) || isOne(play.touchdown)

  return [...byDrive.entries()].map(([id, drivePlays]) => {
    const first = drivePlays[0]
    const last = drivePlays[drivePlays.length - 1]
    const inProgress = id === lastDriveId && !endsDrive(drivePlays[drivePlays.length - 1])
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
    // Campanha em andamento que ainda não teve SNAP: o único lance dela é o kickoff, e o
    // `yrdln` do kickoff é a linha de onde o ADVERSÁRIO chutou. Lê-lo como posição da bola
    // dava 40 jardas de ganho numa campanha em que ninguém jogou ainda. Enquanto não houver
    // snap, a campanha está no ponto de partida.
    const lastSnap = [...drivePlays].reverse().find((play) => !NON_DRIVE_PLAYS.has(play.play_type))
    const start = yardsToGoal(first.drive_start_yard_line, first.posteam)
    const end = inProgress
      ? (lastSnap ? yardsToGoal(lastSnap.yrdln, first.posteam) : start)
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

// ── Campanha de demonstração ───────────────────────────────────────────────
//
// FABRICADA. As demais jogadas deste fixture são o play-by-play real do MIA @ KC de
// 2023; esta campanha não aconteceu.
//
// Por que existe: campanha real é quase toda corrida de 3 jardas e passe curto, e o
// replay sabe desenhar muito mais do que isso — retorno de chute, passe que cai, jogada
// anulada, corrida, bomba para touchdown e chute entre os postes. Para apresentar o
// protótipo era preciso uma campanha que passasse por todo esse vocabulário em pouco
// tempo. O corte real do jogo foi conferido antes: das 21 campanhas, só três terminam em
// touchdown, e nenhuma delas junta variedade e tamanho curto.
//
// Por que mora AQUI e não no JSON: o JSON é gerado. Uma edição à mão desaparece no
// próximo `node scripts/build-nfl-live-fixture.mjs` sem deixar rastro, e quem rodasse não
// entenderia por que o protótipo mudou.
//
// Por que em formato de play-by-play e não de fixture: entrando junto com as jogadas
// reais, ela passa pelas MESMAS contas — placar por quarter, estatística de jogador,
// comparação entre equipes, campanhas, situação ao vivo. Fabricar direto no fixture
// obrigaria a repetir todas essas contas à mão, e cada uma seria uma chance de o placar da
// tela não bater com o das jogadas.
//
// `--demo=0` gera o recorte real puro.
//
// A história: KC acabou de fazer o field goal de 26 jardas (13 x 7, jogada real 1543).
// MIA recebe e responde em 1:43 — retorno de 27, passe de 18 para primeira descida, bomba
// incompleta, uma anulada por holding, corrida de 16 e o touchdown de 47 jardas numa 3ª &
// 4, que empata o jogo em 13 x 13.
//
// O recorte de ABERTURA termina na corrida de 16 jardas, com a campanha da MIA em andamento
// numa 3ª & 4: o touchdown e o ponto extra são os dois próximos lances do jogo e chegam
// sozinhos, já com a tela aberta. Ver o rodapé de `demoPlays`.
const DEMO_DRIVE = '8'

/** Linha de pbp com todas as colunas que o gerador lê, para cada lance preencher só o seu. */
const demoPlay = (home, away, campos) => ({
  game_id: GAME_ID,
  drive: DEMO_DRIVE,
  fixed_drive: DEMO_DRIVE,
  qtr: '2',
  posteam: away,
  defteam: home,
  // Colunas de campanha: o nflverse repete em todas as linhas, e `buildDrives` lê da
  // primeira.
  drive_quarter_start: '2',
  drive_game_clock_start: '07:33',
  drive_start_yard_line: `${away} 29`,
  drive_end_yard_line: `${home} 47`,
  fixed_drive_result: 'Touchdown',
  drive_play_count: '5',
  drive_time_of_possession: '1:43',
  // Tudo o mais vazio por padrão: `num()` e `isOne()` tratam vazio como 0/falso.
  down: '', ydstogo: '', yrdln: '', yards_gained: '0', air_yards: '', yards_after_catch: '',
  complete_pass: '0', touchdown: '0', pass_touchdown: '0', rush_touchdown: '0', first_down: '0',
  third_down_converted: '0', penalty: '0', penalty_team: '', penalty_type: '', penalty_yards: '0',
  interception: '0', fumble_lost: '0', sack: '0', touchback: '0', kick_distance: '', return_yards: '0',
  extra_point_result: '', field_goal_result: '', punt_downed: '0', punt_fair_catch: '0',
  punt_out_of_bounds: '0', pass_location: '', run_location: '',
  passer_player_name: '', passer_player_id: '', receiver_player_name: '', receiver_player_id: '',
  rusher_player_name: '', rusher_player_id: '', kicker_player_name: '', kicker_player_id: '',
  punter_player_name: '', punter_player_id: '', kickoff_returner_player_name: '',
  punt_returner_player_name: '', interception_player_name: '', interception_player_id: '',
  sack_player_name: '', sack_player_id: '', td_player_name: '', penalty_player_name: '',
  passing_yards: '0', receiving_yards: '0', rushing_yards: '0',
  total_home_score: '13', total_away_score: '7',
  ...campos,
})

const ID = {
  tua: '00-0036212', hill: '00-0033040', waddle: '00-0036613', achane: '00-0039040',
  sanders: '00-0034794', butker: '00-0033303',
  mahomes: '00-0033873', kelce: '00-0030506', pacheco: '00-0037197', chenal: '00-0037237',
}

function demoPlays(home, away) {
  return [
    // 1. Retorno de chute: a bola cai no campo e o retornador sai com ela na mão.
    demoPlay(home, away, {
      play_id: '9001', time: '07:33', play_type: 'kickoff', yrdln: `${home} 35`,
      kick_distance: '63', return_yards: '27', kicker_player_name: 'H.Butker', kicker_player_id: ID.butker,
      kickoff_returner_player_name: 'D.Achane',
      desc: `7-H.Butker kicks 63 yards from ${home} 35 to ${away} 2. 22-D.Achane to ${away} 29 for 27 yards (26-D.Bush).`,
    }),
    // 2. Passe curto com corrida depois: voo, recepção e trecho rasteiro na mesma jogada.
    demoPlay(home, away, {
      play_id: '9002', time: '07:26', play_type: 'pass', down: '1', ydstogo: '10', yrdln: `${away} 29`,
      yards_gained: '18', air_yards: '12', yards_after_catch: '6', complete_pass: '1', first_down: '1',
      pass_location: 'left', passer_player_name: 'T.Tagovailoa', passer_player_id: ID.tua,
      receiver_player_name: 'J.Waddle', receiver_player_id: ID.waddle,
      passing_yards: '18', receiving_yards: '18',
      desc: `(7:26) (Shotgun) 1-T.Tagovailoa pass short left to 17-J.Waddle to ${away} 47 for 18 yards (33-E.Apple).`,
    }),
    // 3. Passe profundo que cai: o X vermelho no ponto onde a bola bateu no chão.
    demoPlay(home, away, {
      play_id: '9003', time: '06:52', play_type: 'pass', down: '1', ydstogo: '10', yrdln: `${away} 47`,
      air_yards: '34', pass_location: 'right', passer_player_name: 'T.Tagovailoa', passer_player_id: ID.tua,
      receiver_player_name: 'T.Hill', receiver_player_id: ID.hill,
      desc: '(6:52) (Shotgun) 1-T.Tagovailoa pass incomplete deep right to 10-T.Hill (38-L.Sneed).',
    }),
    // 4. Anulada por penalidade: o lance aconteceu e é desenhado em cinza, com o carimbo.
    demoPlay(home, away, {
      play_id: '9004', time: '06:45', play_type: 'no_play', down: '2', ydstogo: '10', yrdln: `${away} 47`,
      penalty: '1', penalty_team: away, penalty_type: 'Offensive Holding', penalty_yards: '10',
      desc: `(6:45) (Shotgun) 1-T.Tagovailoa pass short right to 22-D.Achane for 8 yards. PENALTY on ${away}-76-K.Jones, Offensive Holding, 10 yards, enforced at ${away} 47 - No Play.`,
    }),
    // 5. Corrida: só trecho rasteiro, sem arco.
    demoPlay(home, away, {
      play_id: '9005', time: '06:38', play_type: 'run', down: '2', ydstogo: '20', yrdln: `${away} 37`,
      yards_gained: '16', run_location: 'left', rusher_player_name: 'D.Achane', rusher_player_id: ID.achane,
      rushing_yards: '16',
      desc: `(6:38) (Shotgun) 22-D.Achane left end to ${home} 47 for 16 yards (29-B.Jones).`,
    }),
    // O TOUCHDOWN e o PONTO EXTRA que vinham aqui saíram do recorte, nesta ordem e por duas
    // decisões diferentes da pessoa responsável pelo protótipo.
    //
    // O ponto extra saiu primeiro: sendo o lance de corte, o sheet abria num chute entre os
    // postes e a faixa do placar descrevia o recomeço do adversário (`1ª & 10 na KC 25`) em vez
    // do lance que acabou de acontecer.
    //
    // O touchdown saiu depois, quando o feed já existia: abrir NELE gasta o melhor lance do
    // recorte antes de a pessoa ter olhado a tela, e o que o protótipo quer mostrar é o jogo
    // acontecendo. Abrindo na corrida de 16 jardas, o touchdown é a primeira coisa que CHEGA —
    // com o sheet aberto, ele entra sozinho, e é o próprio jogo que apresenta o produto.
    //
    // Os dois voltam como PRIMEIROS LANCES DO HORIZONTE, em `bridgePlays`, na ordem do jogo.
  ]
}

/** Pontos que a campanha fabricada somou à visitante: o touchdown e o ponto extra. */
const DEMO_POINTS = 7

// ── Ponte para o resto do jogo REAL ────────────────────────────────────────
//
// Quatro lances fabricados, no mesmo formato de pbp da campanha de demonstração, que ligam o
// touchdown fabricado ao play-by-play real do resto do 2º quarto.
//
// Por que a ponte precisa existir: a campanha de demonstração SUBSTITUIU a campanha real da
// MIA — as duas são a `fixed_drive` 8 —, então o jogo real recomeça limpo na campanha 9. Só
// que ele recomeça em `1ª & 10 na KC 45`, às 04:31, e entre o touchdown (05:58) e aquele snap
// faltam o ponto extra, o kickoff e 79 segundos de relógio. Sem a ponte o relógio saltaria de
// 05:50 para 04:31 num intervalo só, e um salto desses é exatamente o que denuncia simulação.
//
// A alternativa era retemporizar o fim da campanha de demonstração para desaguar em 04:31.
// Custava mudar o estado de abertura do protótipo — `Q2 05:58`, touchdown de 47 jardas numa
// 3ª & 4 —, que já foi conferido e aprovado. A ponte não mexe em nada do que já existe.
//
// Os números saem dos lances reais equivalentes DESTE jogo: o kickoff da MIA (lance 1196) foi
// de 46 jardas com 11 de retorno, e L.Chenal é quem retornou os dois kickoffs do KC na partida.
function bridgePlays(home, away) {
  /**
   * Colunas da campanha 9, que passa a COMEÇAR no kickoff fabricado em vez do snap real.
   *
   * `buildDrives` lê as colunas de campanha da PRIMEIRA linha dela, e a primeira linha agora é
   * o kickoff. Sem reescrever estas colunas a campanha continuaria anunciando que começou na
   * KC 45 às 04:31 — o começo que ela teria se a bola tivesse vindo de um punt, e não de um
   * kickoff retornado até a própria 25.
   *
   * As contas: 5 lances (os 3 reais mais os 2 fabricados; kickoff não conta, como no nflverse)
   * e 2:48 de posse (de 05:50, quando a campanha começa, até 03:02, quando a seguinte começa).
   */
  const drive9 = {
    drive: '9', fixed_drive: '9', posteam: home, defteam: away,
    drive_quarter_start: '2',
    drive_game_clock_start: '05:50',
    drive_start_yard_line: `${home} 25`,
    drive_end_yard_line: `${away} 48`,
    fixed_drive_result: 'Punt',
    drive_play_count: '5',
    drive_time_of_possession: '2:48',
    total_home_score: '13', total_away_score: '14',
  }

  return [
    // 6. O lance da campanha: bomba de 47 jardas para touchdown numa 3ª & 4. É o PRIMEIRO
    //    lance que chega sozinho, e é ele que empata o jogo em 13 x 13.
    demoPlay(home, away, {
      play_id: '9006', time: '05:58', play_type: 'pass', down: '3', ydstogo: '4', yrdln: `${home} 47`,
      yards_gained: '47', air_yards: '41', yards_after_catch: '6', complete_pass: '1', first_down: '1',
      third_down_converted: '1', touchdown: '1', pass_touchdown: '1', pass_location: 'right',
      passer_player_name: 'T.Tagovailoa', passer_player_id: ID.tua,
      receiver_player_name: 'T.Hill', receiver_player_id: ID.hill,
      td_player_name: 'T.Hill', passing_yards: '47', receiving_yards: '47',
      total_home_score: '13', total_away_score: '13',
      desc: '(5:58) (Shotgun) 1-T.Tagovailoa pass deep right to 10-T.Hill for 47 yards, TOUCHDOWN.',
    }),
    // 7. Ponto extra: a bola para entre os postes, no alto. Leva o placar de 13 x 13 para
    //    13 x 14.
    demoPlay(home, away, {
      play_id: '9007', time: '05:50', play_type: 'extra_point', yrdln: `${home} 15`,
      // A distância é o que faz o lance ter voo (`isKick` em `playNarrative`): sem ela o ponto
      // extra não anima. São as 33 jardas de sempre — 15 do snap mais 18 da end zone e do fundo.
      kick_distance: '33',
      extra_point_result: 'good', kicker_player_name: 'J.Sanders', kicker_player_id: ID.sanders,
      total_home_score: '13', total_away_score: '14',
      desc: '7-J.Sanders extra point is GOOD, Center-44-B.Ferguson, Holder-16-J.Bailey.',
    }),
    // 8. Kickoff de volta, e a posse troca de lado na tela. No kickoff o `posteam` é quem
    //    RECEBE — aqui o KC — e o `yrdln` é a linha de onde a MIA chutou: 53 jardas param na
    //    KC 12, e o retorno de 13 deixa o KC na própria 25.
    demoPlay(home, away, {
      ...drive9,
      play_id: '9008', time: '05:50', play_type: 'kickoff', yrdln: `${away} 35`,
      kick_distance: '53', return_yards: '13',
      kicker_player_name: 'J.Sanders', kicker_player_id: ID.sanders,
      kickoff_returner_player_name: 'L.Chenal', kickoff_returner_player_id: ID.chenal,
      desc: `7-J.Sanders kicks 53 yards from ${away} 35 to ${home} 12. 53-L.Chenal to ${home} 25 for 13 yards (26-D.Bush).`,
    }),
    // 9. Primeiro snap do KC: corrida curta, sem arco. KC 25 mais 6 é a KC 31, em 2ª & 4.
    demoPlay(home, away, {
      ...drive9,
      play_id: '9009', time: '05:43', play_type: 'run', down: '1', ydstogo: '10', yrdln: `${home} 25`,
      yards_gained: '6', run_location: 'middle',
      rusher_player_name: 'I.Pacheco', rusher_player_id: ID.pacheco, rushing_yards: '6',
      desc: `(5:43) 10-I.Pacheco up the middle to ${home} 31 for 6 yards (51-D.Long).`,
    }),
    // 10. A emenda propriamente dita: este passe dá a primeira descida e deixa o KC em
    //     `1ª & 10 na KC 45` às 04:31 — exatamente o estado do lance 1749, que é real e é o
    //     próximo. Mexer nas jardas ou no relógio deste lance desalinha a emenda.
    demoPlay(home, away, {
      ...drive9,
      play_id: '9010', time: '05:05', play_type: 'pass', down: '2', ydstogo: '4', yrdln: `${home} 31`,
      yards_gained: '14', air_yards: '9', yards_after_catch: '5', complete_pass: '1', first_down: '1',
      pass_location: 'right',
      passer_player_name: 'P.Mahomes', passer_player_id: ID.mahomes,
      receiver_player_name: 'T.Kelce', receiver_player_id: ID.kelce,
      passing_yards: '14', receiving_yards: '14',
      desc: `(5:05) (Shotgun) 15-P.Mahomes pass short right to 87-T.Kelce to ${home} 45 for 14 yards (21-D.Elliott).`,
    }),
  ]
}

/**
 * O resto do 2º quarto, REAL, emendado depois da ponte. São 22 lances: o punt do KC, o sack e
 * o punt da MIA, os dois minutos, o passe de 39 jardas para R.Rice, o field goal de 32 jardas
 * e a última posse da MIA até o relógio zerar.
 *
 * Por que reaproveitar o real em vez de fabricar 22 lances: fabricar seria 22 chances de a
 * jarda não bater com o ganho, a descida não bater com a distância e as colunas de campanha
 * não baterem com os lances — e o replay já sabe desenhar tudo o que está aqui.
 *
 * A única edição é o PLACAR: a campanha fabricada deu 7 pontos à MIA que o jogo real não tem,
 * então todas estas linhas ganham `DEMO_POINTS` na visitante. O field goal real que fazia
 * 16 x 7 passa a fazer 16 x 14, e a conta fecha sozinha até o fim do quarter.
 *
 * Ficam de fora as linhas que não são lance — os dois pedidos de tempo e o `END QUARTER 2`.
 * Elas não têm `posteam`, não entram em `buildPlays` e não mexem no placar; deixá-las aqui
 * criaria passos do feed que não mostram lance nenhum.
 */
function continuationPlays(allPlays) {
  const start = allPlays.findIndex((play) => Number(play.play_id) === HORIZON_FROM)
  if (start < 0) throw new Error(`lance ${HORIZON_FROM} não encontrado em ${GAME_ID}`)

  const quarter = allPlays[start].qtr
  const rows = []
  // Percorre na ORDEM DO ARQUIVO, e não por `play_id`: o nflverse intercala o pedido de tempo
  // com um id maior que o do lance seguinte (1708 antes de 1696), e ordenar por id trocaria a
  // ordem do jogo.
  for (let index = start; index < allPlays.length && allPlays[index].qtr === quarter; index += 1) {
    rows.push(allPlays[index])
  }

  return rows
    .filter((play) => play.fixed_drive && play.posteam && play.play_type && play.play_type !== 'NA')
    .map((play) => ({
      ...play,
      total_away_score: String(num(play.total_away_score) + DEMO_POINTS),
    }))
}

/** "KC 25", "MIA 48" ou "50", a partir da posição absoluta no referencial de quem ataca. */
const yardLineLabel = (absolute, team, opponent) => {
  if (absolute === 50) return '50'

  return absolute < 50 ? `${team} ${absolute}` : `${opponent} ${100 - absolute}`
}

/**
 * Descida, distância, posição e posse no instante do corte.
 *
 * Caso normal: sai do próprio lance do corte. Depois de um lance que ENCERRA A POSSE não
 * existe descida nem distância — o lance acabou e ninguém está com a bola em jogo —, e ler o
 * lance do corte ali descreveria um snap que não vai acontecer. São três casos, e nenhum
 * deles é o mesmo que o outro:
 *
 * 1. Chute de pontuação (ponto extra ou field goal): a posse já mudou de dono e quem recebe
 *    ainda não começou. A situação descreve o RECOMEÇO — quem sofreu o ponto assume na
 *    própria 25, que é onde o kickoff para quando vira touchback.
 *
 * 2. Touchdown: a posse continua com quem marcou, porque o ponto extra é dele e ainda não
 *    foi chutado. Aqui não há recomeço para descrever, então a situação descreve o LANCE:
 *    `result` e `scorer`, no mesmo par que a lista de campanhas usa. É essa faixa que abre o
 *    sheet de jogadas, e o que ela promete passa a ser o touchdown que acabou de sair.
 *
 * 3. Chute que TROCA A POSSE (kickoff e punt): a bola voou, foi retornada e parou num ponto
 *    que nenhuma coluna traz pronta. A situação descreve onde quem recebeu vai começar. Este
 *    caso só apareceu quando o protótipo passou a percorrer todos os estados do jogo: no
 *    recorte estático o corte nunca caía num chute desses, e lendo o `yrdln` do lance a faixa
 *    anunciava a linha de onde o ADVERSÁRIO chutou como se fosse a posição da bola.
 *
 * Nos três casos a descida fica nula de propósito.
 */
function liveSituation(cutoffPlay, home, away) {
  const side = (team) => (team === home ? 'home' : 'away')
  const SCORING_KICKS = new Set(['extra_point', 'field_goal'])
  const base = { down: null, distance: null, result: null, scorer: null }

  if (SCORING_KICKS.has(cutoffPlay.play_type)) {
    const receiving = cutoffPlay.posteam === home ? away : home

    return { ...base, ballOn: `${receiving} 25`, possession: side(receiving) }
  }

  // Kickoff e punt são assimétricos no nflverse, e a conta segue a assimetria: no KICKOFF o
  // `posteam` já é quem RECEBE e o `yrdln` é a linha do chutador, então a bola anda para trás
  // no referencial de quem recebe; no PUNT quem chuta é o `posteam`, então a conta é feita no
  // referencial dele e invertida no fim. Touchback tem ponto fixo por regra: a 25 no kickoff,
  // a 20 no punt.
  if (cutoffPlay.play_type === 'kickoff' || cutoffPlay.play_type === 'punt') {
    const isKickoff = cutoffPlay.play_type === 'kickoff'
    const receiving = isKickoff
      ? cutoffPlay.posteam
      : (cutoffPlay.posteam === home ? away : home)
    const opponent = receiving === home ? away : home
    const kicked = absoluteYard(cutoffPlay.yrdln, cutoffPlay.posteam)
    const landed = isKickoff
      ? kicked - num(cutoffPlay.kick_distance)
      : 100 - (kicked + num(cutoffPlay.kick_distance))
    const spot = isOne(cutoffPlay.touchback)
      ? (isKickoff ? 25 : 20)
      : Math.max(1, Math.min(99, landed + num(cutoffPlay.return_yards)))

    return {
      ...base,
      ballOn: yardLineLabel(spot, receiving, opponent),
      possession: side(receiving),
    }
  }

  if (isOne(cutoffPlay.touchdown)) {
    return {
      ...base,
      ballOn: null,
      possession: side(cutoffPlay.posteam),
      result: 'Touchdown',
      scorer: orEmpty(cutoffPlay.td_player_name)
        ?? orEmpty(cutoffPlay.receiver_player_name)
        ?? orEmpty(cutoffPlay.rusher_player_name),
    }
  }

  return {
    ...base,
    down: Number(cutoffPlay.down) || null,
    distance: Number(cutoffPlay.ydstogo) || null,
    ballOn: cutoffPlay.yrdln || null,
    possession: side(cutoffPlay.posteam),
  }
}

/**
 * Tudo o que a tela mostra num INSTANTE do jogo: placar, situação de campo, placar por
 * quarter, estatística de jogador, campanhas e comparação entre equipes.
 *
 * Virou função porque o protótipo deixou de mostrar um instante e passou a percorrer vários —
 * um por lance que ainda vai chegar ao vivo (ver `buildSteps`). Refazer estas contas no
 * navegador seria repetir todas as regras deste arquivo, e cada repetição é uma chance de o
 * placar da tela não bater com o das jogadas. Aqui a conta é a MESMA, rodada mais vezes.
 */
function buildSnapshot(plays, home, away) {
  const cutoffPlay = plays[plays.length - 1]

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

  return {
    live: {
      quarter: Number(cutoffPlay.qtr),
      clock: cutoffPlay.time,
      homeScore: num(cutoffPlay.total_home_score),
      awayScore: num(cutoffPlay.total_away_score),
      ...liveSituation(cutoffPlay, home, away),
    },
    quarterScores: {
      home: quarters[home],
      away: quarters[away],
      homeTotal: previousHome,
      awayTotal: previousAway,
    },
    players: buildPlayers(plays),
    drives: buildDrives(plays, cutoffPlay, home),
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
}

// ── Regra de relógio ───────────────────────────────────────────────────────
//
// O relógio da NFL não corre o tempo todo. Ele corre DURANTE o lance e, depois que a bola
// morre, só continua correndo se o lance terminou em progresso normal dentro de campo. Passe
// incompleto, jogador que sai pela lateral, pontuação, falta e pedido de tempo param o
// cronômetro, que então só volta no snap seguinte (ou no apito de bola pronta, na falta).
// Primeira descida NÃO para o relógio — isso é regra de futebol universitário.
//
// Sem esta separação o protótipo queimava o intervalo inteiro de forma UNIFORME até o próximo
// snap, e o efeito era um relógio que nunca para: no passe incompleto, em que a regra manda
// congelar, ele seguia descendo devagarinho.

/**
 * O relógio PARA quando este lance acaba?
 *
 * Tudo sai de coluna real do nflverse, menos o fora de campo, que só existe no texto da
 * súmula (`ran ob`, `pushed ob`). Os lances fabricados da campanha de demonstração passam
 * pelas mesmas conferências porque são linhas de pbp com as mesmas colunas e a mesma súmula.
 */
const OUT_OF_BOUNDS = /\b(?:ran ob|pushed ob|out of bounds)\b/i

function stopsClock(play) {
  const desc = String(play.desc ?? '')

  // Passe incompleto: a bola cai no chão e o cronômetro para na hora.
  if (isOne(play.incomplete_pass) || /pass incomplete/i.test(desc)) return true
  // Fora de campo: o portador leva a bola para além da lateral.
  if (OUT_OF_BOUNDS.test(desc)) return true
  // Pontuação: touchdown, field goal (bom ou não), ponto extra e safety.
  if (isOne(play.touchdown) || play.field_goal_result || play.extra_point_result) return true
  if (isOne(play.safety)) return true
  // Troca de posse. Punt e chute devolvido contam aqui; o fumble recuperado pelo PRÓPRIO time
  // não para nada, e é justamente por isso que só `fumble_lost` entra.
  if (play.play_type === 'punt' || isOne(play.interception) || isOne(play.fumble_lost)) return true
  // Bola morta sem retorno: touchback e fair catch. O relógio só volta no snap.
  if (isOne(play.touchback) || isOne(play.punt_fair_catch) || isOne(play.kickoff_fair_catch)) return true
  // Falta e pedido de tempo. A falta devolve o relógio no apito de bola pronta, e não no snap,
  // mas a distância até o snap seguinte já está medida em `gapSeconds` — aqui só interessa que
  // o cronômetro parou quando o lance acabou.
  if (isOne(play.penalty) || isOne(play.timeout)) return true
  // Fim de período.
  if (isOne(play.quarter_end)) return true

  return false
}

/**
 * Teto de quantos segundos de relógio o LANCE em si queima, do snap até a bola morrer.
 *
 * Só vale para lance que deixa o cronômetro correndo, porque aí o intervalo até o próximo
 * snap é lance + huddle e o pbp não separa os dois. Quando o relógio PARA, o dado já separa
 * sozinho: se o cronômetro congelou no fim do lance, o que sobra até o snap seguinte é zero, e
 * o intervalo medido É a duração do lance. Confirmado neste jogo — os lances que param o
 * relógio têm intervalos de 2 a 12 segundos (passe incompleto 4/5/7, fora de campo 8, chute 4,
 * punt 7/12, touchdown 8), e os que não param têm 17 a 41.
 */
const PLAY_CLOCK_SECONDS = {
  kickoff: 6,
  punt: 8,
  field_goal: 5,
  extra_point: 4,
  pass: 6,
  run: 5,
  qb_kneel: 2,
  qb_spike: 1,
  no_play: 0,
}

const playClockSeconds = (play, gapSeconds) => (
  stopsClock(play)
    ? gapSeconds
    : Math.min(PLAY_CLOCK_SECONDS[play.play_type] ?? 6, gapSeconds)
)

/**
 * Um instante por lance que ainda vai chegar. O passo 0 é o jogo AGORA, no touchdown; cada
 * passo seguinte é o jogo com mais um lance visível.
 *
 * `gapSeconds` é a distância de RELÓGIO DE JOGO até o lance seguinte, e é dela que o protótipo
 * tira o ritmo em que entrega os lances. Ela traz de graça as paradas reais do jogo: o ponto
 * extra e o kickoff saem no mesmo relógio (o cronômetro está parado), o passe incompleto quase
 * não anda, e a queima entre dois snaps anda quarenta segundos. Um intervalo fixo entre lances
 * seria um metrônomo, e metrônomo lê como animação em laço — não como jogo.
 *
 * `playSeconds` e `clockStops` MEDEM a regra: o primeiro é o que o lance queimou do snap até a
 * bola morrer, e o segundo diz se o cronômetro parou ali. Os dois são conferidos por
 * `check:nfl` e são o que prova que os intervalos deste recorte são os reais — um passe
 * incompleto queima de 2 a 7 segundos e uma corrida em campo queima de 17 a 41, porque no
 * primeiro caso o relógio para na hora e no segundo ele atravessa o huddle.
 *
 * O app NÃO usa mais `playSeconds` para desenhar a descida: o relógio da tela desce dentro da
 * apresentação do lance e trava no horário DELE (ver `presentationOf`, em `nflLiveFeed.ts`).
 * A regra continua valendo no dado, que é quem define o tamanho de cada descida.
 *
 * O ÚLTIMO passo mede até 00:00, e é por isso que o protótipo termina em vez de congelar:
 * depois do último snap o relógio simplesmente corre até o fim do quarter e vira `Intervalo`.
 */
function buildSteps(now, horizon, home, away) {
  const visible = [...now]
  const steps = []

  for (let index = 0; index <= horizon.length; index += 1) {
    if (index > 0) visible.push(horizon[index - 1])

    const current = visible[visible.length - 1]
    const next = horizon[index] ?? null
    // Sem `next`, o que falta medir é o resto do quarter — do relógio deste lance até zero.
    const gapSeconds = next
      ? Math.max(0, clockToSeconds(current.time) - clockToSeconds(next.time))
      : clockToSeconds(current.time)

    steps.push({
      playId: current.play_id,
      playCount: buildPlays(visible, home).length,
      gapSeconds,
      playSeconds: playClockSeconds(current, gapSeconds),
      clockStops: stopsClock(current),
      endsPeriod: next === null,
      ...buildSnapshot(visible, home, away),
    })
  }

  return steps
}

async function main() {
  const allPlays = await loadPbp()
  if (allPlays.length === 0) throw new Error(`jogo ${GAME_ID} não encontrado`)

  const first = allPlays[0]
  const home = first.home_team
  const away = first.away_team

  // O jogo AGORA: o recorte real até o corte, mais a campanha fabricada que termina no
  // touchdown. É exatamente o que o protótipo mostrava antes de o feed existir.
  const now = [
    ...allPlays.filter((play) => Number(play.play_id) <= CUTOFF),
    ...(WITH_DEMO ? demoPlays(home, away) : []),
  ]
  // O que ainda VAI acontecer, e chega sozinho: a ponte fabricada e o resto real do quarter.
  // Sem a campanha de demonstração não existe horizonte — a emenda depende dela.
  const horizon = WITH_DEMO ? [...bridgePlays(home, away), ...continuationPlays(allPlays)] : []
  const plays = [...now, ...horizon]

  const fixture = {
    source: {
      provider: 'nflverse',
      dataset: `play_by_play_${SEASON}`,
      license: 'CC-BY-4.0',
      gameId: GAME_ID,
      cutoffPlayId: CUTOFF,
      horizonFromPlayId: WITH_DEMO ? HORIZON_FROM : null,
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
    ...buildSnapshot(now, home, away),
    // `plays` traz o recorte INTEIRO, horizonte incluído. Quantos deles já aconteceram em cada
    // instante é o `playCount` do passo — quem lê o fixture sem o feed vê o jogo inteiro, e
    // quem lê com o feed vê só até onde o relógio chegou.
    plays: buildPlays(plays, home),
    feed: { steps: buildSteps(now, horizon, home, away) },
  }

  const outPath = path.join(repoRoot, 'src/data/nflLiveGame.json')
  await writeFile(outPath, `${JSON.stringify(fixture, null, 2)}\n`)

  const passos = fixture.feed.steps
  const ultimo = passos[passos.length - 1]

  process.stdout.write(`\n${GAME_ID} até a jogada ${CUTOFF}\n`)
  process.stdout.write(`  Q${fixture.live.quarter} ${fixture.live.clock} · ${home} ${fixture.live.homeScore} x ${fixture.live.awayScore} ${away}\n`)
  const situationLog = fixture.live.result
    ? `${fixture.live.result} de ${fixture.live.scorer}`
    : (fixture.live.down
      ? `${fixture.live.down}ª & ${fixture.live.distance} na ${fixture.live.ballOn}`
      : `recomeço na ${fixture.live.ballOn}`)
  process.stdout.write(`  ${situationLog}, posse ${fixture.live.possession}\n`)
  process.stdout.write(`  lances considerados: ${plays.length} de ${allPlays.length}\n`)
  process.stdout.write(`  lances no replay: ${fixture.plays.length}, passes completos: ${fixture.plays.filter((p) => p.type === 'pass' && p.complete && !p.noPlay).length}\n`)
  process.stdout.write(`  campanhas: ${fixture.drives.length} (quarters ${[...new Set(fixture.drives.map((d) => d.quarter))].join(', ')})\n`)
  process.stdout.write(`  feed: ${passos.length} passos, ${horizon.length} lances a chegar\n`)
  process.stdout.write(`    termina em Q${ultimo.live.quarter} ${ultimo.live.clock} · ${ultimo.live.homeScore} x ${ultimo.live.awayScore}, +${ultimo.gapSeconds}s até o fim do quarter\n`)
  process.stdout.write(`  escrito em ${path.relative(repoRoot, outPath)}\n`)
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`)
  process.exitCode = 1
})
