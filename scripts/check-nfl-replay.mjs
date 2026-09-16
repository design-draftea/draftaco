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

// ── AGORA e HORIZONTE ──────────────────────────────────────────────────────
//
// `plays` traz o recorte INTEIRO, incluindo os lances que ainda não aconteceram e vão chegar
// sozinhos enquanto a pessoa olha a tela. Quase tudo daqui em diante vale para os dois — um
// lance do horizonte é desenhado pelo mesmo replay —, mas o que descreve O INSTANTE EM QUE O
// PROTÓTIPO ABRE precisa parar onde o jogo está agora. Sem esta separação, as conferências de
// recorte passariam a ler o fim do 2º quarto como se fosse o presente.
const PASSOS = jogo.feed?.steps ?? []
const AGORA = PASSOS.length > 0 ? PASSOS[0].playCount : jogadas.length
const jogadasAgora = jogadas.slice(0, AGORA)
const jogadasHorizonte = jogadas.slice(AGORA)

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
// estatísticas vazias em `no_play`. As três do jogo real são conferidas uma a uma contra a
// súmula abaixo: se o parser do texto mudar, é aqui que aparece. A quarta é da campanha de
// demonstração, fabricada no gerador — ela entra pelo mesmo parser, então também prova que
// o texto dela está no formato do nflverse.
const anuladas = jogadas.filter((play) => play.noPlay)
const anuladasReais = jogadasAgora.filter((play) => play.noPlay && Number(play.id) < 9000)
conferir('anulada: o recorte real tem as três', anuladasReais.length === 3,
  `encontradas ${anuladasReais.length}: ${anuladasReais.map((play) => play.id).join(', ')}`)

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

const passeAnuladoDemo = jogadas.find((play) => play.id === '9004')
conferir('anulada 9004 (demo): passe Tagovailoa -> Achane de 8 jardas',
  !!passeAnuladoDemo?.nullified
  && passeAnuladoDemo.nullified.kind === 'pass'
  && passeAnuladoDemo.nullified.passer === 'T.Tagovailoa'
  && passeAnuladoDemo.nullified.receiver === 'D.Achane'
  && passeAnuladoDemo.nullified.yards === 8,
  `nullified=${JSON.stringify(passeAnuladoDemo?.nullified)}`)

const anuladaComJardas = anuladas.filter((play) => play.yards !== 0).map((play) => play.id)
conferir('anulada: nenhuma credita jardas', anuladaComJardas.length === 0,
  `creditaram jardas: ${anuladaComJardas.join(', ')}`)

// As duas anuladas INCOMPLETAS do horizonte. Elas ficaram meses mostrando campo vazio, e a
// segunda é a que prova o caminho sem recebedor: o texto oficial dela não nomeia ninguém.
const anuladaIncompleta = anulada('1962')
conferir('anulada 1962: passe Mahomes -> Kelce, curto à direita, que caiu',
  !!anuladaIncompleta?.nullified
  && anuladaIncompleta.nullified.kind === 'pass'
  && anuladaIncompleta.nullified.complete === false
  && anuladaIncompleta.nullified.passer === 'P.Mahomes'
  && anuladaIncompleta.nullified.receiver === 'T.Kelce'
  && anuladaIncompleta.nullified.depth === 'short',
  `nullified=${JSON.stringify(anuladaIncompleta?.nullified)}`)

const anuladaSemAlvo = anulada('2248')
conferir('anulada 2248: passe do Tagovailoa que caiu, sem recebedor no texto',
  !!anuladaSemAlvo?.nullified
  && anuladaSemAlvo.nullified.complete === false
  && anuladaSemAlvo.nullified.passer === 'T.Tagovailoa'
  && anuladaSemAlvo.nullified.receiver === null
  && anuladaSemAlvo.nullified.depth === 'short',
  `nullified=${JSON.stringify(anuladaSemAlvo?.nullified)}`)

// A regra do produto: o que foi anulado TEM de mostrar a jogada. Quem passou pelo parser
// aconteceu em campo, e cada um desses lances precisa de uma distância para desenhar — o
// ganho quando houve, o balde de profundidade quando o passe caiu. Sem ela o arco sai com
// comprimento zero, que na tela é exatamente o campo vazio que isto veio corrigir.
const anuladaSemDesenho = anuladas
  .filter((play) => play.nullified)
  .filter((play) => (play.nullified.kind === 'pass' && !play.nullified.complete
    ? !play.nullified.depth
    : play.nullified.yards === 0 && !play.nullified.touchdown))
  .map((play) => play.id)
conferir('anulada: toda anulada que aconteceu tem o que desenhar', anuladaSemDesenho.length === 0,
  `sem distância para o desenho: ${anuladaSemDesenho.join(', ')}`)

const baldeInvalido = anuladas
  .filter((play) => play.nullified?.depth && !['short', 'deep'].includes(play.nullified.depth))
  .map((play) => play.id)
conferir('anulada: o balde de profundidade é short ou deep', baldeInvalido.length === 0,
  `balde fora do vocabulário da NFL: ${baldeInvalido.join(', ')}`)

// ── Falta seca ─────────────────────────────────────────────────────────────
//
// A anulada em que o lance NÃO chegou a existir: falso início, atraso de jogo. Ali a
// penalidade é o lance inteiro, e o que ela tem para mostrar é quem a cometeu e quanto a bola
// voltou. Sem isso o campo ficava com um capacete cinza sem nome e nada se movendo.
const indiceDe = (id) => jogadas.findIndex((play) => play.id === id)
const faltasSecas = jogadas.filter((play) => play.noPlay && !play.nullified && play.penaltyYards)

conferir('falta seca: o recorte tem os três falsos inícios',
  faltasSecas.length === 3 && faltasSecas.every((play) => play.penaltyType === 'False Start'),
  `encontradas ${faltasSecas.length}: ${faltasSecas.map((play) => play.id + ':' + play.penaltyType).join(', ')}`)

const faltaSemAutor = faltasSecas.filter((play) => !play.penaltyBy).map((play) => play.id)
conferir('falta seca: tem quem cometeu', faltaSemAutor.length === 0,
  `sem \`penaltyBy\` — o retrato fica sem nome: ${faltaSemAutor.join(', ')}`)

// A conferência que dá o direito de desenhar o recuo: ele tem de bater com a linha de
// scrimmage do lance SEGUINTE, que é onde a marcação aparece de verdade. Meia distância para
// a end zone, faltas compensadas ou falta recusada quebram a conta — e aí o desenho estaria
// mostrando a bola parando onde ela não parou.
const recuoQueNaoFecha = jogadas
  .map((play, i) => ({ play, seguinte: jogadas[i + 1] }))
  .filter(({ play, seguinte }) => play.noPlay && play.penaltyYards && seguinte)
  .filter(({ play, seguinte }) => seguinte.startYard - play.startYard !== play.penaltyYards)
  .map(({ play }) => play.id)
conferir('falta: o recuo fecha com a linha do lance seguinte', recuoQueNaoFecha.length === 0,
  `marcação e linha seguinte discordam: ${recuoQueNaoFecha.join(', ')}`)

// Numa falta antes do snap a bola volta mas a linha da descida FICA: é por isso que a
// distância cresce junto ("3ª e 8" vira "3ª e 13"). O desenho conta com isso — a bola recua
// para longe de uma linha amarela parada.
const descidaQueAndou = faltasSecas
  .map((play) => ({ play, seguinte: jogadas[indiceDe(play.id) + 1] }))
  .filter(({ play, seguinte }) => seguinte && play.distance !== null && seguinte.distance !== null)
  .filter(({ play, seguinte }) => play.startYard + play.distance !== seguinte.startYard + seguinte.distance)
  .map(({ play }) => play.id)
conferir('falta seca: a linha da descida não anda com a bola', descidaQueAndou.length === 0,
  `linha da descida mudou de jarda: ${descidaQueAndou.join(', ')}`)

// ── Sack ───────────────────────────────────────────────────────────────────
//
// O nflverse guarda o sack como `play_type: 'pass'` com `air_yards` vazio. Sem a marca
// própria, o protótipo lia "passe" + "não completou" e escrevia PASSE INCOMPLETO num lance
// em que passe nenhum saiu — e, sem jardas aéreas, não desenhava nada.
//
// Esta é a conferência que teria pegado aquilo: um passe sem jardas aéreas ou é sack, ou é
// um lance que vai ficar parado na tela sem ninguém perceber.
const passeSemDesenho = jogadas
  .filter((play) => play.type === 'pass' && !play.noPlay && play.airYards === null && !play.sack)
  .map((play) => play.id)
conferir('passe: sem jardas aéreas, só se for sack', passeSemDesenho.length === 0,
  `passe parado, sem arco e sem marca de sack: ${passeSemDesenho.join(', ')}`)

const sacks = jogadas.filter((play) => play.sack)
conferir('sack: o recorte tem o do Tagovailoa no fim do 2º quarto',
  sacks.length === 1 && sacks[0].id === '1915',
  `encontrados ${sacks.length}: ${sacks.map((play) => play.id).join(', ')}`)

const sackSemPerda = sacks.filter((play) => play.yards >= 0).map((play) => play.id)
conferir('sack: a perda é negativa', sackSemPerda.length === 0,
  `sem perda em jardas: ${sackSemPerda.join(', ')}`)

// Quem derrubou vai para a linha de resultado. Sem o nome ela fica com um `·` e nada depois.
const sackSemAutor = sacks.filter((play) => !play.sackedBy).map((play) => play.id)
conferir('sack: tem quem derrubou', sackSemAutor.length === 0,
  `sem \`sackedBy\`: ${sackSemAutor.join(', ')}`)

// `fixed_drive_result` já traz o desfecho FINAL da campanha, inclusive da que ainda está
// correndo. Mostrar isso entregaria o que ainda não aconteceu no jogo.
const emAndamento = jogo.drives.filter((drive) => drive.inProgress)
// No máximo uma, e pode ser NENHUMA: quando o recorte para num lance de PONTUAÇÃO, a
// campanha acabou e a seguinte ainda não começou. Fora desse caso, uma campanha tem de
// estar correndo, senão o jogo não está ao vivo e a faixa de situação não tem o que
// mostrar.
const ULTIMA = jogadasAgora[jogadasAgora.length - 1]
const CHUTE_DE_PONTO = ULTIMA.type === 'extra_point' || ULTIMA.type === 'field_goal'
const TOUCHDOWN = ULTIMA.touchdown === true
const PONTUOU = CHUTE_DE_PONTO || TOUCHDOWN
conferir('campanha em andamento: uma só, ou nenhuma depois de pontuar',
  emAndamento.length === 1 || (emAndamento.length === 0 && PONTUOU),
  `encontradas ${emAndamento.length}, último lance ${ULTIMA.type}, touchdown ${ULTIMA.touchdown}`)
// Depois de um chute de pontuação a faixa descreve o RECOMEÇO, não o lance que acabou: quem
// sofreu o ponto assume a bola. Sem isto ela diria que quem marcou está com a bola no campo
// de defesa do adversário.
if (CHUTE_DE_PONTO) {
  conferir('situação ao vivo: a posse passou para quem recebe o chute',
    jogo.live.possession !== ULTIMA.side && jogo.live.down === null,
    `posse ${jogo.live.possession}, último lance do lado ${ULTIMA.side}, descida ${jogo.live.down}`)
}
// No touchdown é o contrário: o ponto extra é de quem marcou, então a posse FICA com ele e
// não há recomeço para descrever. A faixa passa a mostrar o lance, e é por `result` e
// `scorer` que o app sabe trocar a descida pelo `Touchdown · T.Hill`.
if (TOUCHDOWN) {
  conferir('situação ao vivo: touchdown mantém a posse e descreve o lance',
    jogo.live.possession === ULTIMA.side
    && jogo.live.down === null
    && jogo.live.result === 'Touchdown'
    && !!jogo.live.scorer,
    `posse ${jogo.live.possession}, lado ${ULTIMA.side}, descida ${jogo.live.down}, `
    + `result ${jogo.live.result}, scorer ${jogo.live.scorer}`)
  // O placar do topo é o do INSTANTE do touchdown, com o ponto extra ainda por chutar. Se
  // alguém devolver o ponto extra ao recorte, o sheet volta a abrir num chute.
  conferir('recorte: o ponto extra não abre o sheet',
    ULTIMA.type !== 'extra_point',
    'o último lance do instante de abertura é um ponto extra')
}
conferir('campanha em andamento: não vaza o futuro',
  emAndamento.every((drive) => drive.result === null && drive.scorer === null),
  JSON.stringify(emAndamento.map((drive) => ({ id: drive.id, result: drive.result, scorer: drive.scorer }))))

// ── 2b. O feed ao vivo ─────────────────────────────────────────────────────
//
// O feed é a sequência de instantes pela qual o protótipo passa SOZINHO, um lance por vez,
// enquanto a pessoa olha a tela. Cada passo é o jogo inteiro recalculado pelo gerador — placar,
// situação, campanhas, estatística e comparação —, e é por isso que o navegador não refaz
// conta nenhuma.
//
// Erro aqui não quebra nada: produz um jogo plausível e errado. Um placar que anda para trás,
// um relógio que volta, um lance que some da lista — tudo isso renderiza sem reclamar, e só
// aparece para quem ficar olhando a tela pelos três minutos inteiros.
const segundos = (relogio) => {
  const [minuto, segundo] = String(relogio).split(':').map(Number)

  return minuto * 60 + segundo
}
const mesmoJson = (a, b) => JSON.stringify(a) === JSON.stringify(b)

conferir('feed: existe e tem mais de um passo', PASSOS.length > 1,
  `${PASSOS.length} passo(s) — sem horizonte o jogo volta a congelar na corrida de abertura`)

// O passo 0 é o jogo AGORA. Se ele divergir do topo do fixture, a tela mostra um estado antes
// de o feed montar e OUTRO logo depois: um pisca de placar na abertura.
const forasDoPasso0 = ['live', 'quarterScores', 'players', 'drives', 'teamComparison']
  .filter((campo) => !mesmoJson(PASSOS[0]?.[campo], jogo[campo]))
conferir('feed: o passo 0 é exatamente o estado de abertura', forasDoPasso0.length === 0,
  `divergem: ${forasDoPasso0.join(', ')}`)

// Um lance por passo, sem buraco e sem repetição: é o `playCount` que fatia `plays`, então um
// salto aqui some com um lance da lista e da linha do tempo.
const saltos = PASSOS
  .map((passo, indice) => ({ indice, passo }))
  .filter(({ indice, passo }) => indice > 0 && passo.playCount !== PASSOS[indice - 1].playCount + 1)
  .map(({ indice }) => indice)
conferir('feed: cada passo mostra exatamente um lance a mais', saltos.length === 0,
  `passos fora da conta: ${saltos.join(', ')}`)

conferir('feed: o último passo mostra o recorte inteiro',
  PASSOS[PASSOS.length - 1]?.playCount === jogadas.length,
  `último passo mostra ${PASSOS[PASSOS.length - 1]?.playCount} de ${jogadas.length}`)

// O `playId` é como o app sabe QUAL lance acabou de chegar — é dele que sai o anúncio na
// faixa e o lance que o sheet abre. Se ele apontar para outro lugar, a tela anuncia um lance
// e mostra outro.
const idsTrocados = PASSOS
  .filter((passo) => jogadas[passo.playCount - 1]?.id !== passo.playId)
  .map((passo) => passo.playId)
conferir('feed: o `playId` do passo é o último lance visível dele', idsTrocados.length === 0,
  `ids que não batem: ${idsTrocados.join(', ')}`)

// Placar só sobe, e sempre bate com a soma dos quarters daquele instante. As duas contas saem
// de lugares diferentes do gerador (o acumulado do lance e a diferença por período), então
// divergirem é sinal de que uma das duas parou de enxergar um lance de pontuação.
const placarParaTras = PASSOS
  .map((passo, indice) => ({ indice, passo }))
  .filter(({ indice, passo }) => indice > 0 && (
    passo.live.homeScore < PASSOS[indice - 1].live.homeScore
    || passo.live.awayScore < PASSOS[indice - 1].live.awayScore
  ))
  .map(({ indice }) => indice)
conferir('feed: o placar nunca anda para trás', placarParaTras.length === 0,
  `passos que baixam o placar: ${placarParaTras.join(', ')}`)

const placarDivergente = PASSOS
  .filter((passo) => passo.live.homeScore !== passo.quarterScores.homeTotal
    || passo.live.awayScore !== passo.quarterScores.awayTotal
    || passo.quarterScores.home.reduce((a, b) => a + b, 0) !== passo.quarterScores.homeTotal
    || passo.quarterScores.away.reduce((a, b) => a + b, 0) !== passo.quarterScores.awayTotal)
  .map((passo) => passo.playId)
conferir('feed: o placar do topo bate com a soma dos quarters', placarDivergente.length === 0,
  `passos divergentes: ${placarDivergente.join(', ')}`)

// O relógio do quarter conta PARA TRÁS. Um passo que sobe o relógio é um lance fora de ordem,
// e fora de ordem a campanha fica com a cronologia invertida na lista.
const relogioParaTras = PASSOS
  .map((passo, indice) => ({ indice, passo }))
  .filter(({ indice, passo }) => indice > 0
    && passo.live.quarter === PASSOS[indice - 1].live.quarter
    && segundos(passo.live.clock) > segundos(PASSOS[indice - 1].live.clock))
  .map(({ indice }) => indice)
conferir('feed: o relógio nunca volta', relogioParaTras.length === 0,
  `passos que sobem o relógio: ${relogioParaTras.join(', ')}`)

// `gapSeconds` é a distância até o lance SEGUINTE, e é com ela que o app faz o relógio andar
// entre um lance e outro. Se ela não fechar, o relógio chega ao próximo lance adiantado ou
// atrasado e corrige num salto — o salto é justamente o que denuncia simulação.
const gapsErrados = PASSOS
  .map((passo, indice) => ({ indice, passo, proximo: PASSOS[indice + 1] }))
  .filter(({ passo, proximo }) => proximo
    && segundos(passo.live.clock) - passo.gapSeconds !== segundos(proximo.live.clock))
  .map(({ indice }) => indice)
conferir('feed: `gapSeconds` desagua no relógio do passo seguinte', gapsErrados.length === 0,
  `passos com sobra: ${gapsErrados.join(', ')}`)

// ── Regra de relógio da NFL ────────────────────────────────────────────────
//
// `playSeconds` e `clockStops` MEDEM a regra no dado: quanto o lance queimou do snap até a bola
// morrer, e se o cronômetro parou ali. São eles que provam que os intervalos deste recorte são os
// reais — errados, não quebram nada: produzem um jogo plausível cujos tempos ignoram a regra.
// O app desenha a descida do relógio dentro da apresentação do lance e trava no horário dele, mas
// o TAMANHO de cada descida continua saindo daqui.
const foraDoIntervalo = PASSOS
  .map((passo, indice) => ({ indice, passo }))
  .filter(({ passo }) => !Number.isInteger(passo.playSeconds)
    || passo.playSeconds < 0
    || passo.playSeconds > passo.gapSeconds)
  .map(({ indice }) => indice)
conferir('feed: o tempo do lance cabe dentro do intervalo', foraDoIntervalo.length === 0,
  `passos fora: ${foraDoIntervalo.join(', ')}`)

// Lance que para o relógio não deixa tempo morto: o cronômetro congela no fim do lance e só
// volta no snap seguinte. Sem isto o passe incompleto volta a escorregar pela espera inteira.
const paradaQueNaoPara = PASSOS
  .map((passo, indice) => ({ indice, passo }))
  .filter(({ passo }) => passo.clockStops && passo.playSeconds !== passo.gapSeconds)
  .map(({ indice }) => indice)
conferir('feed: lance que para o relógio não deixa tempo morto', paradaQueNaoPara.length === 0,
  `passos com sobra: ${paradaQueNaoPara.join(', ')}`)

// O caso que originou a regra, preso pelo dado e não pelo tipo: passe incompleto PARA.
const incompletos = PASSOS.filter((passo) => {
  const jogada = jogadas[passo.playCount - 1]
  return jogada.type === 'pass' && !jogada.complete && !jogada.noPlay && jogada.yards === 0
})
conferir('feed: todo passe incompleto para o relógio',
  incompletos.length > 0 && incompletos.every((passo) => passo.clockStops),
  `${incompletos.length} incompleto(s), ${incompletos.filter((p) => !p.clockStops).length} sem parada`)

// E o contrário: jogada que termina em campo NÃO para. Sem esta, marcar tudo como parada
// passaria nas conferências acima e devolveria um relógio congelado o jogo inteiro.
const corridasEmCampo = PASSOS.filter((passo) => {
  const jogada = jogadas[passo.playCount - 1]
  return jogada.type === 'run' && !jogada.touchdown && !jogada.penalty && passo.gapSeconds > 20
})
conferir('feed: corrida derrubada em campo mantém o relógio correndo',
  corridasEmCampo.length > 0
  && corridasEmCampo.every((passo) => !passo.clockStops && passo.gapSeconds > passo.playSeconds),
  `${corridasEmCampo.length} corrida(s), ${corridasEmCampo.filter((p) => p.clockStops).length} marcadas como parada`)

// Só o último passo encerra o período, e o intervalo dele tem de chegar a 00:00 exatamente.
// É esse zero que faz o protótipo TERMINAR no intervalo em vez de congelar de novo.
const ultimoPasso = PASSOS[PASSOS.length - 1]
conferir('feed: só o último passo encerra o período',
  PASSOS.filter((passo) => passo.endsPeriod).length === 1 && ultimoPasso?.endsPeriod === true,
  `${PASSOS.filter((passo) => passo.endsPeriod).length} passo(s) marcados`)

conferir('feed: o último intervalo zera o relógio do quarter',
  ultimoPasso && ultimoPasso.gapSeconds === segundos(ultimoPasso.live.clock),
  `relógio ${ultimoPasso?.live.clock}, intervalo ${ultimoPasso?.gapSeconds}s`)

// O TOUCHDOWN é a primeira coisa que chega sozinha. Esta é a decisão que define a demonstração:
// a tela abre na corrida de 16 jardas, em 3ª & 4, e o melhor lance do recorte não é o estado de
// abertura — é o que ACONTECE com a pessoa olhando. Devolvê-lo ao recorte gasta o lance antes de
// alguém ter visto a tela.
conferir('feed: o touchdown é o primeiro lance a chegar',
  jogadasHorizonte[0]?.touchdown === true,
  `primeiro do horizonte: ${jogadasHorizonte[0]?.type} (${jogadasHorizonte[0]?.id}), `
  + `touchdown ${jogadasHorizonte[0]?.touchdown}`)

conferir('feed: o ponto extra vem logo depois do touchdown',
  jogadasHorizonte[1]?.type === 'extra_point',
  `segundo do horizonte: ${jogadasHorizonte[1]?.type} (${jogadasHorizonte[1]?.id})`)

conferir('feed: o kickoff vem logo depois do ponto extra',
  jogadasHorizonte[2]?.type === 'kickoff',
  `terceiro do horizonte: ${jogadasHorizonte[2]?.type} (${jogadasHorizonte[2]?.id})`)

// A abertura tem de ser um lance COMUM, com a campanha correndo. Num lance de pontuação a
// campanha fecha, a faixa passa a descrever um desfecho e o sheet abre num lance que encerra o
// assunto — é justamente o que esta mudança desfez.
conferir('feed: a abertura é um lance comum, com a campanha em andamento',
  ULTIMA.touchdown === false && ULTIMA.type !== 'extra_point' && ULTIMA.type !== 'field_goal'
  && emAndamento.length === 1,
  `último lance da abertura: ${ULTIMA.type} (${ULTIMA.id}), touchdown ${ULTIMA.touchdown}, `
  + `campanhas em andamento ${emAndamento.length}`)

// As duas conferências que o instante de abertura tinha quando ele PARAVA no touchdown. Elas não
// deixam de valer por ele ter virado o primeiro lance do horizonte: agora valem no PASSO em que
// ele chega, que é onde a faixa precisa manter a posse com quem marcou e trocar a descida pelo
// `Touchdown · T.Hill`.
const passoDoTouchdown = PASSOS.find((passo) => jogadas[passo.playCount - 1]?.touchdown === true)
const lanceDoTouchdown = jogadas[(passoDoTouchdown?.playCount ?? 0) - 1]
conferir('feed: o passo do touchdown mantém a posse e descreve o lance',
  !!passoDoTouchdown
  && passoDoTouchdown.live.possession === lanceDoTouchdown?.side
  && passoDoTouchdown.live.down === null
  && passoDoTouchdown.live.result === 'Touchdown'
  && !!passoDoTouchdown.live.scorer,
  `posse ${passoDoTouchdown?.live.possession}, lado ${lanceDoTouchdown?.side}, `
  + `descida ${passoDoTouchdown?.live.down}, result ${passoDoTouchdown?.live.result}, `
  + `scorer ${passoDoTouchdown?.live.scorer}`)

conferir('feed: a campanha do touchdown fecha com o desfecho no passo dele',
  !!passoDoTouchdown
  && passoDoTouchdown.drives.some((campanha) => campanha.result === 'Touchdown'
    && campanha.scorer === passoDoTouchdown.live.scorer
    && campanha.inProgress === false),
  JSON.stringify(passoDoTouchdown?.drives.slice(-2)))

// A EMENDA. Os lances fabricados da ponte existem para entregar a bola ao jogo real no ponto
// exato em que ele recomeça: `1ª & 10 na KC 45`. Mexer nas jardas ou na descida de qualquer
// lance da ponte desalinha isso em silêncio — a campanha continua desenhando, só que a bola
// teleporta entre o último lance fabricado e o primeiro real.
const ultimoFabricado = jogadasHorizonte.filter((play) => Number(play.id) >= 9000).pop()
const primeiroReal = jogadasHorizonte.find((play) => Number(play.id) < 9000)
conferir('feed: a emenda com o jogo real fecha no mesmo ponto do campo',
  !!ultimoFabricado && !!primeiroReal
  && ultimoFabricado.startYard + ultimoFabricado.yards === primeiroReal.startYard
  && primeiroReal.down === 1 && primeiroReal.distance === 10,
  `fabricado ${ultimoFabricado?.id} termina na ${ultimoFabricado?.startYard + ultimoFabricado?.yards}, `
  + `real ${primeiroReal?.id} começa na ${primeiroReal?.startYard} em ${primeiroReal?.down}ª & ${primeiroReal?.distance}`)

// A regra de "não vazar o futuro" vale em TODO passo, não só no de abertura: o feed passa por
// campanhas em andamento que o recorte estático nunca mostrava.
const passosQueVazam = PASSOS
  .filter((passo) => passo.drives.some((drive) => drive.inProgress && (drive.result !== null || drive.scorer !== null)))
  .map((passo) => passo.playId)
conferir('feed: nenhum passo entrega o desfecho de campanha em andamento', passosQueVazam.length === 0,
  `passos que vazam: ${passosQueVazam.join(', ')}`)

// Uma campanha correndo, ou nenhuma logo depois de a bola trocar de dono. Duas ao mesmo tempo
// significa que o gerador perdeu o fim de uma delas.
const ENTREGA_A_BOLA = new Set(['extra_point', 'field_goal', 'punt'])
const passosComCampanhaErrada = PASSOS
  .filter((passo) => {
    const correndo = passo.drives.filter((drive) => drive.inProgress).length
    const ultima = jogadas[passo.playCount - 1]
    const entregou = ENTREGA_A_BOLA.has(ultima?.type) || ultima?.touchdown === true

    return !(correndo === 1 || (correndo === 0 && entregou))
  })
  .map((passo) => passo.playId)
conferir('feed: uma campanha em andamento, ou nenhuma depois de entregar a bola',
  passosComCampanhaErrada.length === 0,
  `passos fora da regra: ${passosComCampanhaErrada.join(', ')}`)

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

// Um chute nunca é desenhado como ERRO. O touchback já esteve no vermelho do passe que cai,
// pelo argumento de que a bola não chegou a ninguém — e o resultado eram dois punts lado a
// lado com linguagens visuais diferentes, um lilás e um vermelho. A regressão é silenciosa:
// basta alguém trocar uma linha da tabela, e nada quebra.
const TOM_DO_TOUCHBACK = /touchback: '(\w+)'/.exec(cena)
conferir('chute: touchback não é desenhado como erro',
  !!TOM_DO_TOUCHBACK && TOM_DO_TOUCHBACK[1] !== 'error',
  `PATH_TONE.touchback = ${TOM_DO_TOUCHBACK ? TOM_DO_TOUCHBACK[1] : '(não encontrado)'}`)

// A profundidade desenhada num passe anulado incompleto não é escolhida a dedo: é a mediana
// real de cada balde entre os passes incompletos de 2023. O que este arquivo pode conferir é
// que os dois números continuam DENTRO da definição da NFL para o balde que representam —
// `short` abaixo de 15 jardas aéreas, `deep` daí para cima. Um "short" de 20 desenharia um
// lance que contradiz o próprio texto que o gerou.
const BALDE_CURTO = extrairNumero(cena, 'playScene.ts',
  /VOID_PASS_DEPTH = \{ short: (\d+)/, 'VOID_PASS_DEPTH.short')
const BALDE_LONGO = extrairNumero(cena, 'playScene.ts',
  /VOID_PASS_DEPTH = \{ short: \d+, deep: (\d+)/, 'VOID_PASS_DEPTH.deep')
conferir('anulada: a profundidade cabe no balde que representa',
  BALDE_CURTO > 0 && BALDE_CURTO < 15 && BALDE_LONGO >= 15,
  `short=${BALDE_CURTO}, deep=${BALDE_LONGO} (a NFL separa os dois em 15 jardas aéreas)`)

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
