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
  showsGainBadge,
  type NflPlay,
  type PlayOutcome,
} from './playNarrative'
import type { ReplayPhase } from './usePlayReplay'

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
  touchback: 'error',
  // Cinza: o lance saiu bem, só não conta. Nem confirmação, nem erro.
  voided: 'void',
}

/** Marca de chegada: bolinha onde a posse ficou, X onde a bola caiu. */
const ARRIVAL_MARK: Record<PlayOutcome, 'dot' | 'cross'> = {
  gain: 'dot',
  noGain: 'dot',
  voided: 'dot',
  incomplete: 'cross',
  touchback: 'cross',
}

/** O pulso é confirmação de recepção: só onde alguém ficou com a bola. */
const CONFIRMS_CATCH: Record<PlayOutcome, boolean> = {
  gain: true,
  noGain: true,
  voided: true,
  incomplete: false,
  touchback: false,
}

/** Força do fim do gradiente: o caminho chega forte quando o lance chegou. */
const FLOW_END_OPACITY: Record<PlayOutcome, number> = {
  gain: 0.95,
  noGain: 0.95,
  voided: 0.95,
  incomplete: 0.6,
  touchback: 0.6,
}

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
  const runs = isRun(play) || voidPlay?.kind === 'run'
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
    // O texto traz o ganho total, mas não as jardas aéreas. Num passe anulado o arco cobre
    // o ganho inteiro: separar voo de avanço exigiria um número que a súmula não dá.
    catchYard = voidPlay.kind === 'run' ? startYard : startYard + voidPlay.yards
    endYard = startYard + voidPlay.yards
  } else if (runs) {
    // A corrida inteira é o trecho rasteiro: sai da linha e vai até onde parou. Origem e
    // "recepção" no mesmo ponto, porque não há bola no ar entre os dois.
    catchYard = startYard
    endYard = startYard + play.yards
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
  const fallsIncomplete = animatable && outcome === 'incomplete'
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
    && outcome !== 'incomplete'
    && outcome !== 'touchback'
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
    originName: kick ? play.kicker : (voidPlay?.passer || voidPlay?.rusher || play.passer || play.rusher),
    targetName: kick
      ? (play.returner ?? play.kicker)
      : (voidPlay?.receiver ?? voidPlay?.rusher ?? play.receiver ?? play.rusher ?? play.passer),
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
