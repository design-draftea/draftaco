// Verificações do replay de jogadas da NFL. Uso: node scripts/check-nfl-replay.mjs
//
// Por que existe: estas conferências viviam como arquivos soltos fora do projeto durante o
// desenvolvimento e se perderam quando a máquina limpou o `/tmp`. Agora fazem parte do
// repositório e rodam com `npm run check:nfl`.
//
// Sem dependências e sem framework de teste, no mesmo formato dos outros `scripts/check-*`:
// o projeto não tem nenhum dos dois, e a CI roda Node 20. Isso significa que este arquivo
// NÃO importa TypeScript — os valores dos módulos `.ts` são extraídos do texto por regex, e
// qualquer padrão que deixe de casar derruba o script na hora, em vez de passar em silêncio.

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ler = (relativo) => readFileSync(path.join(repoRoot, relativo))
const lerTexto = (relativo) => ler(relativo).toString('utf8')

const falhas = []
let total = 0

function conferir(nome, condicao, detalhe = '') {
  total += 1
  if (!condicao) falhas.push(detalhe ? `${nome}\n      ${detalhe}` : nome)
}

/** Erro de manutenção, não de dado: o script não consegue mais ler o que ia conferir. */
function extrairNumero(texto, arquivo, padrao, nome) {
  const achado = padrao.exec(texto)
  if (!achado) {
    throw new Error(
      `não encontrei ${nome} em ${arquivo}.\n`
      + 'O código mudou de forma e este script parou de enxergar o valor. '
      + 'Ajuste o padrão aqui antes de seguir — passar em silêncio é pior do que falhar.',
    )
  }

  return Number(achado[1])
}

// ── 1. Tripwire da arte ────────────────────────────────────────────────────
//
// Dezenove constantes de `fieldGeometry.ts` saem de medições de pixel feitas NESTA imagem:
// linhas de gol, profundidades, eixo central, meio da abertura das traves. Se alguém
// reexportar o campinho com outro recorte, nada quebra — o desenho inteiro só sai deslocado,
// em silêncio.
//
// Este bloco não remede nada: ele detecta que a remedição virou necessária, que é a parte
// que custa caro descobrir tarde. Decodificar o PNG para conferir as constantes automaticamente
// exigiria um decodificador inteiro sem dependência, e cobriria o mesmo caso perigoso.
const ARTE = 'src/assets/iconsDraftaco/campinhoNFL.png'
const ARTE_SHA256 = 'bc96154752fbc4c87078a1df294bf428663b0e7b202cfcba05a392f18140c620'
const ARTE_LARGURA = 1559
const ARTE_ALTURA = 628

const arte = ler(ARTE)
const sha = createHash('sha256').update(arte).digest('hex')
// IHDR é sempre o primeiro chunk de um PNG: largura e altura em big-endian, nos bytes 16-24.
const largura = arte.readUInt32BE(16)
const altura = arte.readUInt32BE(20)

const remedir = 'a arte mudou — remeça as constantes de fieldGeometry.ts e atualize este hash'
conferir('arte: dimensões', largura === ARTE_LARGURA && altura === ARTE_ALTURA,
  `${remedir}\n      esperado ${ARTE_LARGURA}x${ARTE_ALTURA}, encontrado ${largura}x${altura}`)
conferir('arte: sha256', sha === ARTE_SHA256, `${remedir}\n      encontrado ${sha}`)

// ── 2. Conteúdo do fixture ─────────────────────────────────────────────────
//
// Cada item aqui custou uma rodada de ajuste. São armadilhas que não quebram nada: produzem
// uma imagem plausível e errada.
const jogo = JSON.parse(lerTexto('src/data/nflLiveGame.json'))
const jogadas = jogo.plays
const TIPOS_DE_CHUTE = new Set(['kickoff', 'punt', 'field_goal', 'extra_point'])
const RETORNAVEIS = new Set(['kickoff', 'punt'])
const chutes = jogadas.filter((play) => TIPOS_DE_CHUTE.has(play.type) && !play.noPlay)

conferir('fixture: tem jogadas', jogadas.length > 0, 'o recorte veio vazio')

// Punt guarda quem chutou em `punter_player_name`, e não em `kicker_player_name`: sem o
// fallback no gerador, TODO punt aparecia sem nome e o card ficava com uma linha vazia.
const semChutador = chutes.filter((play) => !play.kicker).map((play) => play.id)
conferir('chute: todo chute tem quem chutou', semChutador.length === 0,
  `sem \`kicker\`: ${semChutador.join(', ')} (punt usa punter_player_name)`)

// Retorno de 0 jardas sem explicação parece dado faltando na tela.
const semDesfecho = chutes
  .filter((play) => RETORNAVEIS.has(play.type) && (play.returnYards ?? 0) === 0 && !play.kickOutcome)
  .map((play) => play.id)
conferir('chute: sem retorno, diz por quê', semDesfecho.length === 0,
  `sem \`kickOutcome\`: ${semDesfecho.join(', ')}`)

// O lance anulado é extraído do TEXTO oficial porque o nflverse deixa as colunas
// estatísticas vazias em `no_play`. Estas três são o recorte inteiro, conferidas uma a uma
// contra a súmula: se o parser do texto mudar, é aqui que aparece.
const anuladas = jogadas.filter((play) => play.noPlay)
conferir('anulada: o recorte tem as três', anuladas.length === 3,
  `encontradas ${anuladas.length}: ${anuladas.map((play) => play.id).join(', ')}`)

const anulada = (id) => jogadas.find((play) => play.id === id)
const falsoInicio = anulada('360')
conferir('anulada 360: falta antes do snap, sem jogada para desenhar',
  !!falsoInicio && falsoInicio.nullified === null && falsoInicio.penaltyType === 'False Start',
  `nullified=${JSON.stringify(falsoInicio?.nullified)} penalidade=${falsoInicio?.penaltyType}`)

const corridaAnulada = anulada('696')
conferir('anulada 696: corrida do Achane de 2 jardas',
  !!corridaAnulada?.nullified
  && corridaAnulada.nullified.kind === 'run'
  && corridaAnulada.nullified.rusher === 'D.Achane'
  && corridaAnulada.nullified.yards === 2
  && corridaAnulada.nullified.complete === true,
  JSON.stringify(corridaAnulada?.nullified))

const touchdownAnulado = anulada('1453')
conferir('anulada 1453: passe Mahomes -> Rice de 8 jardas, touchdown que não contou',
  !!touchdownAnulado?.nullified
  && touchdownAnulado.nullified.kind === 'pass'
  && touchdownAnulado.nullified.passer === 'P.Mahomes'
  && touchdownAnulado.nullified.receiver === 'R.Rice'
  && touchdownAnulado.nullified.yards === 8
  && touchdownAnulado.nullified.touchdown === true
  // O touchdown do LANCE continua falso: ele não entrou na súmula, e é esse o ponto.
  && touchdownAnulado.touchdown === false,
  `nullified=${JSON.stringify(touchdownAnulado?.nullified)} play.touchdown=${touchdownAnulado?.touchdown}`)

const anuladaComJardas = anuladas.filter((play) => play.yards !== 0).map((play) => play.id)
conferir('anulada: nenhuma credita jardas', anuladaComJardas.length === 0,
  `creditaram jardas: ${anuladaComJardas.join(', ')}`)

// `fixed_drive_result` já traz o desfecho FINAL da campanha, inclusive da que ainda está
// correndo. Mostrar isso entregaria o que ainda não aconteceu no jogo.
const emAndamento = jogo.drives.filter((drive) => drive.inProgress)
conferir('campanha em andamento: existe uma só', emAndamento.length === 1,
  `encontradas ${emAndamento.length}`)
conferir('campanha em andamento: não vaza o futuro',
  emAndamento.every((drive) => drive.result === null && drive.scorer === null),
  JSON.stringify(emAndamento.map((drive) => ({ id: drive.id, result: drive.result, scorer: drive.scorer }))))

// O lado do campo é a profundidade em que o lance é desenhado. Se o gerador voltar a emitir
// a chave antiga (`lateral`), todo lance cai no centro sem erro nenhum aparecer.
const LADOS = new Set(['left', 'middle', 'right'])
const semLado = jogadas.filter((play) => !LADOS.has(play.playSide)).map((play) => play.id)
conferir('fixture: todo lance tem `playSide`', semLado.length === 0,
  `sem lado válido: ${semLado.slice(0, 8).join(', ')} (a chave antiga era \`lateral\`)`)

// ── 3. Relações entre constantes ───────────────────────────────────────────
//
// Constantes que só fazem sentido umas em relação às outras, em arquivos diferentes, e que
// quebram em silêncio: nada estoura, a animação só passa a atropelar a seguinte.
const geometria = lerTexto('src/features/sports/NflPlayReplay/fieldGeometry.ts')
const replay = lerTexto('src/features/sports/NflPlayReplay/usePlayReplay.ts')
const sheet = lerTexto('src/components/BottomSheet/NflPlaysStatsBottomSheet.tsx')

const constante = (texto, arquivo, nome) => extrairNumero(
  texto, arquivo, new RegExp(`const ${nome} = (-?[\\d.]+)`), nome,
)
const campoDeTempo = (nome) => extrairNumero(
  replay, 'usePlayReplay.ts', new RegExp(`\\n\\s+${nome}: (\\d+),`), `REPLAY_TIMING.${nome}`,
)

const GROUND_Y = constante(geometria, 'fieldGeometry.ts', 'GROUND_Y')
const FIELD_MID_Y = constante(geometria, 'fieldGeometry.ts', 'FIELD_MID_Y')
const LINE_TOP_Y = constante(geometria, 'fieldGeometry.ts', 'LINE_TOP_Y')
const LINE_BOTTOM_Y = constante(geometria, 'fieldGeometry.ts', 'LINE_BOTTOM_Y')

// `PLAY_DEPTH` mistura número e identificador (`center: FIELD_MID_Y`), então o valor bruto é
// resolvido contra as constantes já lidas.
const blocoProfundidade = /export const PLAY_DEPTH = \{([^}]*)\}/.exec(geometria)
if (!blocoProfundidade) throw new Error('não encontrei PLAY_DEPTH em fieldGeometry.ts — ajuste este script')
const resolver = { FIELD_MID_Y, GROUND_Y }
const profundidade = Object.fromEntries(
  [...blocoProfundidade[1].matchAll(/(far|center|near):\s*([A-Za-z_][\w]*|-?[\d.]+)/g)]
    // Identificador desconhecido vira NaN e cai na conferência seguinte, em vez de sumir.
    .map(([, chave, bruto]) => [chave, resolver[bruto] ?? Number(bruto)]),
)

conferir('profundidade: as três faixas existem',
  ['far', 'center', 'near'].every((chave) => Number.isFinite(profundidade[chave])),
  JSON.stringify(profundidade))

// Desenhar fora da superfície de jogo põe a jogada em cima da arquibancada.
conferir('profundidade: as três caem dentro do gramado',
  ['far', 'center', 'near'].every((chave) => profundidade[chave] > LINE_TOP_Y && profundidade[chave] < LINE_BOTTOM_Y),
  `faixas ${JSON.stringify(profundidade)} fora de ${LINE_TOP_Y}..${LINE_BOTTOM_Y}`)

// Três faixas que se confundem não contam mais de que lado o lance correu.
conferir('profundidade: as três se distinguem',
  new Set([profundidade.far, profundidade.center, profundidade.near]).size === 3
  && profundidade.far < profundidade.center && profundidade.center < profundidade.near,
  JSON.stringify(profundidade))

// Topo e base à mesma distância EM PIXELS do centro: a leitura vence a física aqui, e uma
// assimetria faria um lance no topo parecer mais raso do que o mesmo lance na base.
const paraCima = profundidade.center - profundidade.far
const paraBaixo = profundidade.near - profundidade.center
conferir('profundidade: topo e base simétricos em pixels',
  Math.abs(paraCima - paraBaixo) < 0.001,
  `acima do centro ${paraCima}, abaixo ${paraBaixo}`)

// O alvo do chute ao gol é o meio da ABERTURA, medido na arte em y=66. Os postes abaixo são
// a medição original; o alvo tem de continuar entre eles, e não encostado num deles.
const POSTES = { right: [317.5, 354.6], left: [20.1, 57.0] }
const blocoGol = /export const GOAL_TARGET = \{([\s\S]*?)\n\} as const/.exec(geometria)
if (!blocoGol) throw new Error('não encontrei GOAL_TARGET em fieldGeometry.ts — ajuste este script')
for (const lado of ['right', 'left']) {
  const alvo = new RegExp(`${lado}: \\{ x: (-?[\\d.]+), y: (-?[\\d.]+) \\}`).exec(blocoGol[1])
  if (!alvo) throw new Error(`não encontrei GOAL_TARGET.${lado} — ajuste este script`)
  const x = Number(alvo[1])
  const [menor, maior] = POSTES[lado]
  const folga = Math.min(x - menor, maior - x)
  conferir(`chute ao gol: alvo ${lado} entre os postes`,
    x > menor && x < maior && folga > 2,
    `x=${x} com postes em ${menor} e ${maior} (folga ${folga.toFixed(2)})`)
}

// O selo da bola carregada: tamanho e respiro vivem no componente que desenha, e a posição
// sobre o retrato vive no módulo de cena. São dois arquivos que precisam continuar de acordo,
// e a quebra é silenciosa — o selo simplesmente desgruda do retrato, ou a bola vaza do aro.
const cena = lerTexto('src/features/sports/NflPlayReplay/playScene.ts')
const palco = lerTexto('src/features/sports/NflPlayReplay/NflFieldStage.tsx')

const PORTRAIT_RADIUS = constante(cena, 'playScene.ts', 'PORTRAIT_RADIUS')
const CARRY_OFFSET_X = constante(cena, 'playScene.ts', 'CARRY_OFFSET_X')
const CARRY_OFFSET_Y = constante(cena, 'playScene.ts', 'CARRY_OFFSET_Y')
const CARRY_BADGE_SIZE = constante(palco, 'NflFieldStage.tsx', 'CARRY_BADGE_SIZE')
const CARRY_BADGE_BORDER = constante(palco, 'NflFieldStage.tsx', 'CARRY_BADGE_BORDER')
const CARRY_BADGE_PADDING = constante(palco, 'NflFieldStage.tsx', 'CARRY_BADGE_PADDING')

// A bola tem de caber no selo com o respiro do estudo, e sobrar selo para o aro aparecer.
const bolaNoSelo = CARRY_BADGE_SIZE - CARRY_BADGE_PADDING * 2
conferir('selo: a bola cabe dentro com o respiro',
  bolaNoSelo > 0 && CARRY_BADGE_PADDING > CARRY_BADGE_BORDER,
  `selo ${CARRY_BADGE_SIZE}, borda ${CARRY_BADGE_BORDER}, respiro ${CARRY_BADGE_PADDING}, bola ${bolaNoSelo}`)

// O selo fica MONTADO no aro: parte dele por dentro do retrato, parte por fora. Se ele
// desgrudar, deixa de ler como "o jogador com a bola" e vira um segundo objeto na tela.
const distancia = Math.hypot(CARRY_OFFSET_X * PORTRAIT_RADIUS, CARRY_OFFSET_Y * PORTRAIT_RADIUS)
const raioDoSelo = CARRY_BADGE_SIZE / 2
conferir('selo: montado no aro do retrato',
  distancia - raioDoSelo < PORTRAIT_RADIUS && distancia + raioDoSelo > PORTRAIT_RADIUS,
  `centro a ${distancia.toFixed(2)} do retrato (raio ${PORTRAIT_RADIUS}), selo de raio ${raioDoSelo}`)

const ballFadeDelay = campoDeTempo('ballFadeDelay')
const ballFadeDuration = campoDeTempo('ballFadeDuration')
const catchPulse = campoDeTempo('catchPulse')
const stageExitDelay = campoDeTempo('stageExitDelay')
const stageExitDelayGain = campoDeTempo('stageExitDelayGain')
const stageExitDuration = campoDeTempo('stageExitDuration')
const badgeFlipDelay = campoDeTempo('badgeFlipDelay')
const badgeFlipOut = campoDeTempo('badgeFlipOut')
const badgeFlipIn = campoDeTempo('badgeFlipIn')
const SEQUENCE_PAUSE = constante(sheet, 'NflPlaysStatsBottomSheet.tsx', 'SEQUENCE_PAUSE')
const SEQUENCE_PAUSE_GAIN = constante(sheet, 'NflPlaysStatsBottomSheet.tsx', 'SEQUENCE_PAUSE_GAIN')

// A ordem que estas cinco constantes precisam manter, em dois arquivos diferentes:
// a bola apaga -> o palco sai -> o lance troca. Fora de ordem, uma etapa atropela a outra e
// a transição vira um corte.
const bolaApagada = ballFadeDelay + ballFadeDuration
conferir('tempo: a bola apaga antes de o palco começar a sair',
  bolaApagada <= stageExitDelay,
  `bola some em ${bolaApagada}ms, palco começa a sair em ${stageExitDelay}ms`)

const placaLegivel = badgeFlipDelay + badgeFlipOut + badgeFlipIn
conferir('tempo: o palco só sai depois de o número da placa estar legível',
  placaLegivel <= stageExitDelayGain,
  `placa pronta em ${placaLegivel}ms, palco começa a sair em ${stageExitDelayGain}ms`)

conferir('tempo: o lance só troca depois de o palco sair',
  stageExitDelay + stageExitDuration <= SEQUENCE_PAUSE,
  `palco fora em ${stageExitDelay + stageExitDuration}ms, troca em ${SEQUENCE_PAUSE}ms`)

conferir('tempo: com a placa girando, o lance troca ainda mais tarde',
  stageExitDelayGain + stageExitDuration <= SEQUENCE_PAUSE_GAIN,
  `palco fora em ${stageExitDelayGain + stageExitDuration}ms, troca em ${SEQUENCE_PAUSE_GAIN}ms`)

// A passagem da bola para a mão do jogador acontece DENTRO da fase de recepção: se a espera
// não couber no pulso, a bola ainda estaria solta no gramado quando a corrida começasse.
conferir('tempo: a bola chega à mão dentro da recepção',
  ballFadeDelay < catchPulse,
  `espera ${ballFadeDelay}ms, recepção dura ${catchPulse}ms`)

// A troca de foco do lançamento vive em dois arquivos: a duração da animação está em
// `REPLAY_TIMING`, e quanto tempo o retrato que sai fica montado é uma FRAÇÃO do voo, em
// `playScene`. Se a fração não cobrir a animação no voo mais curto, o retrato some no meio da
// saída e volta à opacidade cheia num quadro — bem à vista.
const focusSwap = campoDeTempo('focusSwap')
const focusSwapDelay = campoDeTempo('focusSwapDelay')
const airMin = campoDeTempo('airMin')
const FOCUS_SWAP_SPAN = constante(cena, 'playScene.ts', 'FOCUS_SWAP_SPAN')
const trocaDeFoco = focusSwapDelay + focusSwap
conferir('tempo: a troca de foco cabe no voo mais curto',
  trocaDeFoco <= FOCUS_SWAP_SPAN * airMin,
  `troca leva ${trocaDeFoco}ms (${focusSwapDelay} de espera + ${focusSwap}), `
  + `janela de ${Math.round(FOCUS_SWAP_SPAN * airMin)}ms (${FOCUS_SWAP_SPAN} de ${airMin}ms)`)

// ── Saída ──────────────────────────────────────────────────────────────────
if (falhas.length > 0) {
  process.stdout.write(`check:nfl — ${falhas.length} de ${total} falharam\n`)
  for (const falha of falhas) process.stdout.write(`  x ${falha}\n`)
  process.exit(1)
}

process.stdout.write(`check:nfl OK — ${total} conferências (arte, fixture, constantes)\n`)
