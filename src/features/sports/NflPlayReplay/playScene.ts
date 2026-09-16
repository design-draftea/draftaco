// O QUE desenhar num lance — separado de COMO desenhar (`NflFieldStage.tsx`).
//
// Antes as duas coisas moravam juntas no componente: 509 linhas fazendo geometria, decisão
// de cor, decisão de fase e render. Cada tipo novo de lance precisava abrir o `.tsx` e
// pendurar mais uma condição no meio do JSX.
//
// Aqui a decisão é uma função pura, sem React e sem cor: o palco monta a cena uma vez
// (`buildPlayScene`) e pede o quadro de cada instante (`frameAt`). O componente recebe
// pontos, tons e sinalizadores prontos, e só desenha.

import {
  arcPath,
  arcPoint,
  depthForPlaySide,
  directionForSide,
  fieldLine,
  GOAL_TARGET,
  groundPoint,
  TOUCHDOWN_YARD,
  yardToXAtDepth,
  type AttackDirection,
  type FlightKind,
  type PlaySide,
  type Point,
} from './fieldGeometry'
import {
  getPlayOutcome,
  hasBallFlight,
  hasNullifiedPlay,
  isAnimatable,
  isKick,
  isRun,
  isSack,
  penaltyMarchYards,
  showsGainBadge,
  type NflPlay,
  type PlayOutcome,
} from './playNarrative'
import type { ReplayPhase, ReplaySegments } from './usePlayReplay'

/* Composição do palco. Retrato, haste e nome sobem 6px em relação ao estudo (centro em 58,
   haste em 78, nome em 30). Os três andam juntos: a haste tem de continuar saindo da base
   do círculo (PORTRAIT_CENTER_Y + PORTRAIT_RADIUS) e o nome tem de manter a mesma folga
   acima dele. Ficam aqui, e não no componente, porque o recolhimento da bola mira o centro
   do retrato — se as duas medidas morassem em arquivos diferentes, a bola passaria a mirar
   o lugar errado no dia em que o retrato mudasse de altura. */
export const PORTRAIT_RADIUS = 20
export const PORTRAIT_CENTER_Y = 52
export const STEM_TOP_Y = PORTRAIT_CENTER_Y + PORTRAIT_RADIUS
export const NAME_BASELINE_Y = 24

/**
 * Quanto do voo o retrato de quem lançou continua montado depois de o foco trocar.
 *
 * É FRAÇÃO do voo, e não milissegundos, porque aqui não se sabe quanto o voo dura — isso
 * mora em `usePlayReplay`. Precisa cobrir com folga a troca inteira (`focusSwapDelay` mais
 * `focusSwap`) no voo mais curto (`airMin`): desmontar antes do fim da animação devolveria o
 * retrato à opacidade cheia num quadro, bem à vista. Depois dela o retrato já está
 * invisível — o `fill-mode: both` segura o estado final —, então sobrar janela não custa
 * nada.
 *
 * `check:nfl` confere a folga, que depende de constantes de outro arquivo.
 */
const FOCUS_SWAP_SPAN = 0.7

/** Quantidade e alcance do rastro: trecho curto atrás da bola, não a rota inteira. */
const TRAIL_SAMPLES = 7
const TRAIL_SPAN = 0.17

/**
 * Onde a bola descansa depois de recebida: num selo sobre o retrato, como se o jogador a
 * estivesse carregando. Ela não some mais — quem anda passa a andar COM a bola, que é o que
 * o lance tem para contar.
 *
 * Posição medida no estudo aprovado: o selo fica na diagonal de baixo à direita, montado
 * sobre o aro do retrato — parte dele por dentro, parte por fora. As medidas são frações do
 * raio do retrato, e não pixels, para o conjunto continuar coerente se o retrato mudar de
 * tamanho. No estudo, o retrato tem 40 e o selo 16, a mesma proporção daqui.
 */
const CARRY_OFFSET_X = 0.60
const CARRY_OFFSET_Y = 0.63

/** Papel da cor no caminho. O valor de cada tom mora no componente, com o resto da arte. */
export type PathTone = 'success' | 'error' | 'void'

/**
 * As tabelas abaixo são o motivo de o desfecho existir. Cada uma responde UMA pergunta, e
 * o `Record<PlayOutcome, …>` obriga a responder por todas as variantes: no dia em que
 * `sack` entrar no tipo, o TypeScript aponta exatamente as decisões que faltam tomar, em
 * vez de deixar o caso novo cair no ramo `else` de um booleano.
 */
const PATH_TONE: Record<PlayOutcome, PathTone> = {
  gain: 'success',
  noGain: 'success',
  // A bola não chegou a ninguém: é o vermelho da referência.
  incomplete: 'error',
  /* O touchback ficava neste vermelho, pelo mesmo argumento — "não chegou a ninguém". O
     argumento vale para o passe que cai e não vale para o chute: ele foi executado, andou as
     jardas todas e a posse passou como devia. Um punt que entra na end zone é o desfecho
     NORMAL dele, não uma falha, e o vermelho fazia dois punts lado a lado parecerem dois
     lances diferentes. Quem diz que ninguém ficou com a bola é o X da chegada, e o texto. */
  touchback: 'success',
  // O sack também é vermelho: a bola ficou com quem a tinha, mas para o ataque o lance deu
  // errado — e a cor aqui lê o lance, não a posse.
  sack: 'error',
  // Cinza: o lance saiu bem, só não conta. Nem confirmação, nem erro.
  voided: 'void',
  // Cinza pelo mesmo motivo, mesmo com a bola no chão: quem apagou o lance foi a
  // penalidade, e não o passe errado. O X da chegada é que diz que ela caiu.
  voidedIncomplete: 'void',
  // A falta seca é a mesma bandeira: cinza.
  penalty: 'void',
}

/** Marca de chegada: bolinha onde a posse ficou, X onde a bola caiu. */
const ARRIVAL_MARK: Record<PlayOutcome, 'dot' | 'cross'> = {
  gain: 'dot',
  noGain: 'dot',
  voided: 'dot',
  // O passador terminou o lance com a bola, no chão: é posse, e posse é bolinha.
  sack: 'dot',
  incomplete: 'cross',
  voidedIncomplete: 'cross',
  touchback: 'cross',
  // A bola parou na jarda nova, e continua sendo de quem era: é posse, e posse é bolinha.
  penalty: 'dot',
}

/** O pulso é confirmação de recepção: só onde alguém ficou com a bola. */
const CONFIRMS_CATCH: Record<PlayOutcome, boolean> = {
  gain: true,
  noGain: true,
  voided: true,
  // Ninguém recebeu nada num sack: a bola nunca saiu da mão de quem levou.
  sack: false,
  incomplete: false,
  voidedIncomplete: false,
  touchback: false,
  // Não houve recepção nenhuma: a bola foi empurrada pela marcação, não recebida.
  penalty: false,
}

/** Força do fim do gradiente: o caminho chega forte quando o lance chegou. */
const FLOW_END_OPACITY: Record<PlayOutcome, number> = {
  gain: 0.95,
  noGain: 0.95,
  voided: 0.95,
  sack: 0.95,
  penalty: 0.95,
  incomplete: 0.6,
  voidedIncomplete: 0.6,
  // O chute chegou onde ia dar: o caminho chega forte, como o dos outros chutes.
  touchback: 0.95,
}

/**
 * Alguém termina o lance COM a bola. Responde sozinha o que antes eram dois `!==` soltos no
 * meio de `carriesBall` — e é essa tabela que impede a anulada incompleta de herdar a
 * recepção da anulada comum: cinza as duas, com posse só uma.
 */
const KEEPS_POSSESSION: Record<PlayOutcome, boolean> = {
  gain: true,
  noGain: true,
  voided: true,
  sack: true,
  penalty: true,
  incomplete: false,
  voidedIncomplete: false,
  touchback: false,
}

/**
 * A bola CAI no chão ao chegar: ela some e o X fica no lugar dela.
 *
 * Não é o contrário de `KEEPS_POSSESSION`. No touchback a bola também morre sem dono, mas
 * fica desenhada onde parou: a posição dela dentro da end zone é a informação do lance.
 */
const BALL_FALLS: Record<PlayOutcome, boolean> = {
  gain: false,
  noGain: false,
  voided: false,
  sack: false,
  penalty: false,
  touchback: false,
  incomplete: true,
  voidedIncomplete: true,
}

/**
 * Profundidade do arco num passe anulado INCOMPLETO, em jardas.
 *
 * O texto oficial de um lance anulado não traz jardas aéreas — traz o balde da própria NFL:
 * `short` abaixo de 15 jardas aéreas, `deep` daí para cima. Estes dois números são a MEDIANA
 * real de cada balde entre os passes incompletos da temporada 2023 (short: 5 jardas em
 * 4.486 lances; deep: 24 em 1.828), medida no mesmo play-by-play do nflverse que gera o
 * fixture. É a melhor resposta possível à pergunta "a que distância caiu", dado o que a
 * súmula diz do lance — e nenhum número aparece na tela: a placa de jardas fica suprimida
 * em toda anulada (`showsGainBadge`).
 */
const VOID_PASS_DEPTH = { short: 5, deep: 24 } as const

/** Quanto o desenho de um passe anulado cobre: o ganho quando houve, o balde quando não. */
const voidPassSpan = (anulada: { complete: boolean; yards: number; depth: string | null }) => (
  anulada.complete ? anulada.yards : VOID_PASS_DEPTH[anulada.depth === 'deep' ? 'deep' : 'short']
)

export interface TrailDot {
  point: Point
  opacity: number
  radius: number
}

export interface FieldLine {
  x1: number
  y1: number
  x2: number
  y2: number
}

/** Tudo que não muda enquanto o lance corre. */
export interface PlayScene {
  outcome: PlayOutcome
  /** Tem alguma coisa para animar. Um falso início não tem. */
  animatable: boolean
  /** A bola voa (passe ou chute). Corrida anda: não tem arco nem recepção. */
  flies: boolean
  /** Chute ao gol (field goal, ponto extra): o alvo é a abertura, não uma jarda. */
  atGoal: boolean
  kind: FlightKind
  direction: AttackDirection
  /** Profundidade única deste lance. Não muda enquanto ele corre. */
  depthY: number
  origin: Point
  /** Onde a bola chega: recepção, queda, ou o meio da abertura num chute ao gol. */
  landing: Point
  /**
   * Repouso da bola sobre o retrato: o selo na diagonal de baixo à direita. Num passe
   * recebido é onde o VOO termina — a bola deixa a trajetória no fim e entra aqui.
   *
   * Não confundir com `landing`, que é a recepção EM CAMPO: é de lá que saem a marca de
   * chegada, o pulso, a haste e o início do trecho rasteiro, e é lá que o tracejado termina.
   */
  hand: Point
  /** Onde o lance termina, depois do trecho rasteiro. */
  endX: number
  /** Onde fica a marca de chegada — na corrida é o fim, não a "recepção". */
  arrivalX: number
  scrimmage: FieldLine
  firstDown: FieldLine | null
  airPath: string | null
  runPath: string | null
  pathTone: PathTone
  flowEndOpacity: number
  arrivalMark: 'dot' | 'cross'
  /**
   * Alguém termina o lance com a bola na mão: ela sobe para o selo no retrato, em vez de
   * ficar no gramado. Vale para o touchdown também — quem cruza a linha cruza CARREGANDO a
   * bola, e deixá-la no chão da end zone contava que ela tinha sido largada ali.
   */
  carriesBall: boolean
  /**
   * A bola fica onde parou. Sobra para o chute ao gol, onde a posição final dela entre os
   * postes é a informação do lance, e para o touchdown que ninguém carregou (uma corrida,
   * que não tem recepção para levar a bola ao retrato).
   */
  keepsBall: boolean
  /**
   * O voo vai DIRETO para a mão: a bola chega ao selo sobre o retrato sem encostar no
   * gramado. Só em passe recebido. Num chute com retorno ela continua caindo no campo e
   * subindo depois — quem retorna pega a bola do chão, e é isso que o lance tem para
   * contar; num passe que cai não há mão nenhuma para mirar.
   */
  catchesInHand: boolean
  /** Há avanço rasteiro depois da chegada. */
  hasGroundLeg: boolean
  /** Passe que cai: a bola some ao chegar e o X fica no lugar dela. */
  fallsIncomplete: boolean
  /** A placa gira no fim mostrando as jardas. */
  flipsToGain: boolean
  /** Quem aparece no retrato na saída, e quem aparece na chegada. */
  originName: string | null
  targetName: string | null
  /** O foco não passa para a chegada: ninguém ficou com a bola do outro lado. */
  staysAtOrigin: boolean
  /**
   * Repouso da bola sobre o retrato, depois de recebida. `x`/`y` são a posição em relação ao
   * centro do retrato; `fromX`/`fromY` dizem de onde ela vem (a chegada), para a transição
   * sair do ponto certo mesmo com a bola já desenhada no ponto de repouso.
   */
  carry: { x: number; y: number; fromX: number; fromY: number }
}

export function buildPlayScene(play: NflPlay): PlayScene {
  const direction = directionForSide(play.side as 'home' | 'away')
  const startYard = play.startYard ?? 0
  const animatable = isAnimatable(play)
  const outcome = getPlayOutcome(play)

  /**
   * Jogada anulada por penalidade que aconteceu mesmo. Ela é desenhada porque a bola foi
   * snapada e alguém correu ou lançou — o que não vale é o resultado. O fixture extrai isso
   * do texto oficial, já separando as anuladas em que o lance não chegou a existir.
   */
  const voidPlay = hasNullifiedPlay(play) ? play.nullified : null
  const flies = hasBallFlight(play) || voidPlay?.kind === 'pass'
  /* A falta seca também anda rasteiro: a bola sai da linha e é empurrada até a jarda nova.
     O sinal da marcação cuida do sentido, como o ganho negativo cuida do sack. */
  const march = penaltyMarchYards(play)
  // O sack entra como corrida porque é isso que ele é no desenho: trecho rasteiro saindo da
  // linha, só que no sentido contrário. O ganho negativo cuida do sentido sozinho.
  const runs = isRun(play) || voidPlay?.kind === 'run' || isSack(play) || march !== 0
  const kick = isKick(play)
  // Field goal e ponto extra não andam `kickDistance` no campo: esse número é a distância
  // da TENTATIVA, que já inclui as 10 jardas da end zone e a profundidade do snap. Um field
  // goal de 28 jardas da MIA 10 cairia na jarda 118, fora do campo. O que a bola percorre é
  // daqui até as traves, ou seja, até a linha de gol.
  const atGoal = play.type === 'field_goal' || play.type === 'extra_point'
  const kind: FlightKind = atGoal ? 'goal' : (kick ? 'kick' : 'pass')

  // Onde a bola cai e para onde vai depois.
  //
  // No kickoff `posteam` é quem RECEBE, e a bola parte da linha de onde o adversário chuta:
  // no referencial de quem recebe, ela voa para TRÁS (rumo à própria end zone) e só o
  // retorno anda para frente. Em punt, field goal e ponto extra o chute é do próprio
  // `posteam` e segue para frente.
  const kickBackwards = play.type === 'kickoff'
  let catchYard: number
  let endYard: number

  if (kick) {
    const distance = play.kickDistance ?? 0
    catchYard = kickBackwards ? startYard - distance : startYard + distance
    endYard = kickBackwards ? catchYard + play.returnYards : catchYard
  } else if (voidPlay) {
    // O texto traz o ganho total, mas não as jardas aéreas. Num passe anulado COMPLETO o
    // arco cobre o ganho inteiro: separar voo de avanço exigiria um número que a súmula não
    // dá. No INCOMPLETO não há ganho nenhum para cobrir, e a profundidade sai do balde.
    const span = voidPlay.kind === 'run' ? voidPlay.yards : voidPassSpan(voidPlay)
    catchYard = voidPlay.kind === 'run' ? startYard : startYard + span
    endYard = startYard + span
  } else if (runs) {
    // A corrida inteira é o trecho rasteiro: sai da linha e vai até onde parou. Origem e
    // "recepção" no mesmo ponto, porque não há bola no ar entre os dois.
    //
    // Na falta seca o lance não credita jarda nenhuma (`play.yards` é zero, e tem de ser):
    // o que a bola andou foi a marcação da falta.
    catchYard = startYard
    endYard = startYard + (march !== 0 ? march : play.yards)
  } else if (flies) {
    catchYard = startYard + (play.airYards ?? 0)
    // Passe que cai termina onde caiu: não há avanço depois dele.
    endYard = outcome === 'incomplete' ? catchYard : startYard + play.yards
  } else {
    catchYard = startYard + play.yards
    endYard = startYard + play.yards
  }

  // Touchdown termina DENTRO da end zone, não em cima da linha de gol: `startYard + yards`
  // dá exatamente a linha, e a bola ficava em cima dela em vez de no roxo.
  if (play.touchdown && !kick) endYard = TOUCHDOWN_YARD
  const firstDownYard = play.distance !== null ? startYard + play.distance : null

  // Profundidade deste lance, conforme o lado do campo em que ele aconteceu. Chute ao gol e
  // kickoff chegam marcados como `middle`.
  const depthY = depthForPlaySide(play.playSide as PlaySide | null, direction)
  // Toda jarda deste lance é lida NESTA profundidade: o campo alarga na direção da câmera,
  // então o x de uma jarda depende da linha em que ela é desenhada.
  const atDepth = (yard: number) => yardToXAtDepth(yard, direction, depthY)
  // Origem = a própria jarda do snap, em cima da linha azul, para todo tipo de lance.
  const originX = atDepth(startYard)
  // Chute ao gol tem alvo próprio: o meio da abertura, no alto, e não uma jarda no gramado.
  // Por isso ele não passa pelo mapeamento de jardas.
  const goal = atGoal ? GOAL_TARGET[direction] : null
  const origin: Point = { x: originX, y: depthY }
  const landing: Point = goal ? { x: goal.x, y: goal.y } : { x: atDepth(catchYard), y: depthY }
  const endX = goal ? goal.x : atDepth(endYard)

  const hasGroundLeg = Math.abs(endX - landing.x) > 0.5
  // Na corrida a segunda bolinha é onde o corredor foi parado. Sem esta distinção ela caía
  // em cima da bolinha de saída (origem e "recepção" são o mesmo ponto) e o fim do lance
  // ficava sem marca nenhuma.
  const arrivalX = runs ? endX : landing.x

  // Num passe que cai o foco NÃO passa para o alvo: quem apareceria ali não ficou com a
  // bola, e trocar a foto dava a entender que ficou. Quem chuta também não sai do lugar
  // quando não há ninguém do outro lado (field goal, ponto extra, punt sem retorno).
  const fallsIncomplete = animatable && BALL_FALLS[outcome]
  const staysAtOrigin = fallsIncomplete || (kick && !play.returner)

  /**
   * Alguém termina o lance COM a bola: daí em diante ela é desenhada no selo, sobre o
   * retrato, e não mais no gramado.
   *
   * A regra é de POSSE, e não de tipo de lance: vale para o recebedor de um passe completo,
   * para o corredor — que sai com a bola da própria linha de scrimmage — e para o retornador
   * de um chute. Vale também quando a penalidade anulou o lance: ele aconteceu em campo, e
   * alguém estava com a bola.
   *
   * Ficam de fora:
   * - passe que cai e touchback, onde a bola morre sem dono;
   * - chute ao gol, onde a posição final dela entre os postes é a informação do lance;
   * - chute sem retornador (punt dominado, posse justa): a bola para no gramado longe de
   *   quem chutou, e mandá-la para o selo do chutador a faria voltar no tempo.
   */
  const carriesBall = !atGoal
    && KEEPS_POSSESSION[outcome]
    && (kick ? !!play.returner : (flies || runs))

  /**
   * Passe recebido: a bola vai DIRETO para a mão. Antes o voo terminava no gramado e ela
   * subia depois, num segundo movimento — dois gestos para uma coisa só, e no meio deles a
   * bola encostava no chão num lance em que ela nunca encostou.
   *
   * Vale só para passe, e é por isso que o tipo entra na conta: no chute com retorno a bola
   * cai mesmo no campo e é de lá que o retornador sai com ela; na corrida não há voo; num
   * passe que cai não existe mão para mirar.
   */
  const catchesInHand = flies && kind === 'pass' && carriesBall
  /* O retrato já está sobre a chegada durante o voo (ver `focusX` em `frameAt`), então a mão
     é o selo em torno DELE: o mesmo deslocamento do repouso, para o voo terminar exatamente
     onde a bola vai ficar. */
  const hand: Point = {
    x: landing.x + CARRY_OFFSET_X * PORTRAIT_RADIUS,
    y: PORTRAIT_CENTER_Y + CARRY_OFFSET_Y * PORTRAIT_RADIUS,
  }
  /** Onde a bola está quando a fase de recepção começa. */
  const ballEnd = catchesInHand ? hand : landing

  return {
    outcome,
    animatable,
    flies,
    atGoal,
    kind,
    direction,
    depthY,
    origin,
    landing,
    hand,
    endX,
    arrivalX,
    scrimmage: fieldLine(startYard, direction),
    firstDown: firstDownYard !== null ? fieldLine(firstDownYard, direction) : null,
    // Sem voo não há arco: numa corrida, origem e destino do trecho aéreo são o mesmo ponto
    // e o `path` sairia degenerado.
    airPath: flies ? arcPath(origin, landing, kind) : null,
    runPath: hasGroundLeg ? `M ${landing.x} ${depthY} L ${endX} ${depthY}` : null,
    pathTone: PATH_TONE[outcome],
    flowEndOpacity: FLOW_END_OPACITY[outcome],
    arrivalMark: ARRIVAL_MARK[outcome],
    carriesBall,
    keepsBall: atGoal || (play.touchdown && !carriesBall),
    catchesInHand,
    hasGroundLeg,
    fallsIncomplete,
    staysAtOrigin,
    flipsToGain: showsGainBadge(play),
    // Numa corrida não há passador: quem sai com a bola é o próprio corredor. Sem isto o
    // nome sumia durante a preparação e reaparecia quando a bola andava.
    // Na falta seca quem cometeu a falta é a única pessoa que fez alguma coisa no lance: é
    // ela que aparece, e não um capacete cinza sem nome.
    originName: kick
      ? play.kicker
      : (voidPlay?.passer || voidPlay?.rusher || play.passer || play.rusher || play.penaltyBy),
    targetName: kick
      ? (play.returner ?? play.kicker)
      : (voidPlay?.receiver ?? voidPlay?.rusher ?? play.receiver ?? play.rusher ?? play.passer
        ?? play.penaltyBy),
    // O selo fica sempre no mesmo canto do retrato, como no estudo — não espelha com o
    // sentido do ataque. Se algum dia precisar espelhar, é só multiplicar o `x` pela direção.
    carry: {
      x: CARRY_OFFSET_X * PORTRAIT_RADIUS,
      y: CARRY_OFFSET_Y * PORTRAIT_RADIUS,
      // No instante da recepção o retrato está em cima da chegada, então a bola precisa
      // partir de onde o VOO a deixou: o deslocamento é o caminho de volta ao ponto de
      // repouso, e é fixo porque nem a chegada nem o retrato mudam durante o lance.
      //
      // Num passe recebido o voo já termina na mão, e a conta dá zero: a bola não anda mais
      // nada, só encolhe para o tamanho do selo enquanto o aro aparece em volta dela.
      fromX: ballEnd.x - hand.x,
      fromY: ballEnd.y - hand.y,
    },
  }
}

/** O que muda a cada quadro. */
export interface PlayFrame {
  ball: Point
  /** Sombra e bola somem juntas num passe que cai: o X fica no lugar das duas. */
  showsBall: boolean
  /** A sombra fica no CHÃO, sob quem corre — não sob a bola, que sobe para o retrato. */
  shadow: { x: number; rx: number; opacity: number }
  trail: TrailDot[]
  /**
   * O que acontece com a bola no fim: nada, carregada pelo jogador, ou apagando onde parou.
   * `carried` não é uma saída de cena — a bola continua na tela, encolhida sobre o retrato.
   */
  ballEnding: 'none' | 'carried' | 'settled'
  focusName: string | null
  focusX: number
  /**
   * Retrato que está SAINDO de cena, enquanto o de quem recebe entra. Só existe na troca de
   * foco do lançamento, e é o que permite desenhar os dois ao mesmo tempo: sem ele, um
   * sumiria e o outro apareceria no mesmo quadro, que era o corte seco de antes.
   *
   * Vem com o próprio x porque quem sai fica onde estava — na linha de scrimmage —, e não
   * acompanha o marcador novo. Enquanto ele existe, quem está em foco é quem ENTRA.
   */
  leavingFocus: { name: string; x: number } | null
  showsPath: boolean
  showsRunFlow: boolean
  showsArrival: boolean
  pulse: { radius: number; opacity: number } | null
  flipsToGain: boolean
}

/**
 * Onde a bola está em `t` durante o voo. Bola e rastro saem daqui — os dois, sempre, para não
 * existirem duas contas do mesmo movimento que podem divergir por descuido.
 *
 * Num passe recebido a bola tem CURVA PRÓPRIA, e ela é diferente do tracejado de propósito.
 * O destino dela é a mão, e o teto de altura do arco (ver `flightHeight`) faz a subida ser
 * contínua até lá: a bola sai da linha de scrimmage e chega ao selo no ponto mais alto do
 * voo, sem descer em momento nenhum. Uma bola que cai e depois sobe conta que ela encostou
 * em algo no meio do caminho, e num passe recebido ela não encosta.
 *
 * O tracejado é outra coisa e mira o gramado: é a trajetória do passe SOBRE O CAMPO, com a
 * corcova inteira, e é o que emenda no trecho rasteiro e mantém o desenho legível depois que
 * o lance termina. Levá-lo junto com a bola larga um degrau entre o fim do arco, lá em cima,
 * e a linha da corrida, no chão — comparado quadro a quadro e descartado.
 *
 * As duas curvas partem do mesmo ponto e se afastam no fim; o rastro acompanha a bola, então
 * o caminho dela até a mão fica desenhado enquanto ela anda.
 */
export function flightPoint(scene: PlayScene, t: number): Point {
  return arcPoint(scene.origin, scene.catchesInHand ? scene.hand : scene.landing, t, scene.kind)
}

/** Rastro curto atrás da bola, amostrado da MESMA função que a move. */
const trailFrom = (at: (t: number) => Point, progress: number): TrailDot[] => (
  Array.from({ length: TRAIL_SAMPLES }, (_, index) => {
    const t = progress - (TRAIL_SPAN * (index + 1)) / TRAIL_SAMPLES
    if (t <= 0) return null

    return { point: at(t), opacity: (1 - (index + 1) / (TRAIL_SAMPLES + 1)) * 0.75, radius: 3.2 - index * 0.32 }
  }).filter(Boolean) as TrailDot[]
)

export function frameAt(scene: PlayScene, phase: ReplayPhase, progress: number): PlayFrame {
  const { origin, landing, endX, depthY, animatable } = scene

  // Posição no GRAMADO por fase: é onde a bola está enquanto ela é a bola, e continua sendo
  // onde quem corre está depois que ele a pega. O rastro e a sombra amostram esta mesma
  // função, então caminho, rastro e sombra não podem divergir.
  let ground: Point
  if (!animatable || phase === 'idle' || phase === 'preparing') ground = origin
  else if (phase === 'air') ground = flightPoint(scene, progress)
  else if (phase === 'catch') ground = landing
  else if (phase === 'run') ground = groundPoint(landing.x, endX, progress, depthY)
  else ground = { x: endX, y: scene.atGoal ? landing.y : depthY }

  // Altura sobre o gramado: a sombra fica presa ao chão e só acompanha o x.
  const height = depthY - ground.y

  // Duas coisas podem acontecer com a bola, e nenhuma delas em chute ao gol — ali a posição
  // final dela, entre os postes, é o que o lance tem para contar.
  //
  // 1) AO SER RECEBIDA, quando ainda há chão pela frente: ela encolhe e passa a ser
  //    CARREGADA pelo jogador, andando com o retrato. Antes ela apagava aqui, e o elo causal
  //    "pegou a bola e correu com ela" se perdia: o retrato saía sozinho e a bola evaporava.
  // 2) AO ASSENTAR no fim de um lance sem corrida pela frente, para não ficar um objeto
  //    solto enquanto se lê o resultado. Lance sem animação não apaga: não houve queda, a
  //    bola só marca a posição.
  const carried = scene.carriesBall
    && (phase === 'catch' || phase === 'run' || phase === 'result')
  const settled = phase === 'result' && !scene.keepsBall

  let ballEnding: PlayFrame['ballEnding'] = 'none'
  if (animatable && carried) ballEnding = 'carried'
  else if (animatable && settled) ballEnding = 'settled'

  // O foco alterna: lançador na preparação, recebedor a partir do voo. Em passe curto isso
  // evita dois retratos sobrepostos sem afastar artificialmente os pontos.
  const focusOnPasser = animatable && (scene.staysAtOrigin || phase === 'preparing' || phase === 'idle')
  const focusX = focusOnPasser
    ? origin.x
    : (phase === 'run' || phase === 'result' ? ground.x : landing.x)

  /**
   * A troca de foco acontece no instante do lançamento: até ali o lance é de quem tem a
   * bola, e dali em diante é de quem vai recebê-la — o retrato precisa estar no destino bem
   * antes de a bola chegar, porque é nele que o voo termina.
   *
   * Não vale quando o foco não troca de pessoa: passe que cai e chute sem retornador ficam
   * no passador (`staysAtOrigin`), e na corrida quem sai e quem chega são o mesmo jogador.
   */
  const swappingFocus = animatable
    && phase === 'air'
    && progress < FOCUS_SWAP_SPAN
    && !scene.staysAtOrigin
    && !!scene.originName
    && scene.originName !== scene.targetName

  const inFlight = phase === 'air' || phase === 'catch' || phase === 'run'
  const arrived = phase !== 'idle' && phase !== 'preparing'
  // No trecho rasteiro o rastro seria uma fileira de pontos no chão enquanto a bola já está
  // na mão do jogador, lá em cima: duas histórias diferentes sobre o mesmo lance.
  const trail = phase === 'air'
    ? trailFrom((t) => flightPoint(scene, t), progress)
    : (phase === 'run' && !carried ? trailFrom((t) => groundPoint(landing.x, endX, t, depthY), progress) : [])

  return {
    // Carregada, a bola anda com o retrato: quem corre corre COM ela.
    ball: ballEnding === 'carried'
      ? { x: focusX + scene.carry.x, y: PORTRAIT_CENTER_Y + scene.carry.y }
      : ground,
    showsBall: !(scene.fallsIncomplete && (phase === 'catch' || phase === 'result')),
    shadow: {
      x: ground.x,
      rx: (10 + Math.min(2, height / 14)) / 2,
      opacity: 0.45 - Math.min(0.2, height / 220),
    },
    trail,
    ballEnding,
    focusName: focusOnPasser ? scene.originName : scene.targetName,
    focusX,
    leavingFocus: swappingFocus ? { name: scene.originName as string, x: origin.x } : null,
    showsPath: animatable && (inFlight || phase === 'result'),
    // O fluxo do trecho rasteiro só entra quando a bola chega lá.
    showsRunFlow: phase === 'run' || phase === 'result',
    showsArrival: animatable && !scene.atGoal && arrived,
    pulse: phase === 'catch' && CONFIRMS_CATCH[scene.outcome]
      ? { radius: 8 + progress * 16, opacity: Math.max(0, 0.55 * (1 - progress)) }
      : null,
    flipsToGain: phase === 'result' && scene.flipsToGain,
  }
}

/**
 * Quanto a bola percorre no ar e quanto no chão, por tipo de lance. É daqui que a máquina
 * de estados tira a duração de cada fase.
 *
 * Mora aqui, e não no painel, porque tem DOIS consumidores: o painel, que anima o lance, e o
 * feed ao vivo, que precisa saber quanto tempo o lance leva para ser apresentado — é esse tempo
 * que segura o placar até a jogada acontecer na tela.
 *
 * `hasFlight` não é `airYards > 0`: um passe na linha tem zero jarda aérea e mesmo assim
 * voa. Quem não voa é a corrida.
 */
export function segmentsFor(play: NflPlay): ReplaySegments {
  // Chute: a bola voa a distância chutada e, quando alguém a pega, o retornador corre com
  // ela. Não dá para usar `complete`/`yardsAfterCatch` aqui — são campos de passe, valem 0
  // em qualquer chute, e por isso o retorno do kickoff não animava: ele ficava com zero
  // jarda dos dois lados e a fase de corrida nunca abria.
  if (isKick(play)) {
    return {
      airYards: play.kickDistance ?? 0,
      runYards: Math.max(0, play.returnYards ?? 0),
      hasFlight: true,
    }
  }

  // Anulada que aconteceu: o texto dá o ganho total, mas não as jardas aéreas. Num passe o
  // arco cobre o ganho inteiro — ou o balde de profundidade, quando o passe caiu e não há
  // ganho; numa corrida é tudo chão, como em qualquer corrida.
  if (play.noPlay && play.nullified) {
    const anulada = play.nullified

    return anulada.kind === 'run'
      ? { airYards: 0, runYards: Math.abs(anulada.yards), hasFlight: false }
      : { airYards: voidPassSpan(anulada), runYards: 0, hasFlight: true }
  }

  // Falta seca: nada no ar e ninguém correu. O que se percorre é a marcação da falta.
  const march = penaltyMarchYards(play)
  if (march !== 0) return { airYards: 0, runYards: Math.abs(march), hasFlight: false }

  // Sack: nada no ar. A bola nunca saiu da mão, e o que se percorre é a perda, no chão.
  if (isSack(play)) return { airYards: 0, runYards: Math.abs(play.yards), hasFlight: false }

  // Corrida: nada no ar, tudo no chão.
  if (isRun(play)) return { airYards: 0, runYards: Math.abs(play.yards), hasFlight: false }

  // Passe: voo até a recepção e, se completou, o avanço depois dela. Passe que cai não tem
  // avanço: o voo termina e acabou.
  if (hasBallFlight(play)) {
    return {
      airYards: play.airYards ?? 0,
      runYards: play.complete ? Math.max(0, play.yardsAfterCatch ?? 0) : 0,
      hasFlight: true,
    }
  }

  return { airYards: Math.abs(play.yards), runYards: 0, hasFlight: true }
}
