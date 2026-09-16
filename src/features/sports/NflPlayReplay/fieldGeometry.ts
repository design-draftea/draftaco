// Geometria do campinho da NFL: converte jardas em pontos sobre a arte 3D.
//
// Tudo vive no frame de referência do Figma (375 x 185), que o SVG reproduz por viewBox.
// Assim bola, sombra, rastro, marcadores e retratos compartilham um único sistema de
// coordenadas e continuam alinhados em qualquer largura de tela.
//
// Por que o mapeamento jarda -> x é LINEAR mesmo com o campo em perspectiva: numa linha
// de profundidade constante da imagem, a projeção de um plano é linear. A perspectiva
// aparece entre profundidades diferentes (o campo alarga na direção da câmera), não ao
// longo de uma mesma linha. Por isso a jogada inteira é desenhada numa profundidade só —
// o que também é o que o Figma e a referência do Twitter fazem.
//
// Calibração: as linhas de gol foram medidas na própria arte (`campinhoNFL.png`, 1559 x
// 628) na profundidade da jogada, achando a fronteira entre a end zone e o gramado, e
// convertidas para o frame. Conferência: o centro do mapeamento cai sobre o "50" pintado
// no overlay de marca.

/** Frame de referência do Figma. O SVG usa isto como viewBox. */
export const FIELD_FRAME = { width: 375, height: 185 } as const

/** A arte fica mais larga que o frame e sangra dos dois lados (ver NflPlaysStatsBottomSheet.css). */
export const FIELD_ART = { x: -7.367, width: 389.734, y: 20, height: 157 } as const

/** Linha do chão: onde a bola encosta, as hastes terminam e as sombras ficam. */
export const GROUND_Y = 132

/** Linhas de gol na profundidade da jogada, medidas na arte. */
const GOAL_LEFT_X = 65.63
const GOAL_RIGHT_X = 308.62
const FIELD_SPAN = GOAL_RIGHT_X - GOAL_LEFT_X

/**
 * Altura do arco. O Figma dá um ponto: 37,7px de distância -> 27px de altura. Manter a
 * proporção pura estouraria o campo num passe longo (53 jardas passariam por cima do
 * retrato), então há teto; e um passe atrás da linha precisa de piso para não virar uma
 * linha reta.
 */
const ARC_RATIO = 0.72
const ARC_MIN_HEIGHT = 14
const ARC_MAX_HEIGHT = 44

/**
 * Chute sobe muito mais que passe: um kickoff de 50 jardas não pode ter o mesmo arco de
 * um passe curto. O teto existe para o arco não estourar o topo do frame; o ápice fica na
 * altura do retrato, mas em outro x — a foto acompanha o foco, não o meio do voo.
 */
const KICK_ARC_RATIO = 1.15
const KICK_ARC_MIN_HEIGHT = 26
const KICK_ARC_MAX_HEIGHT = 66

/**
 * Chute ao gol termina NO MEIO DO GOL, entre os dois postes — não no gramado nem em cima
 * do travessão.
 *
 * O x é o meio da ABERTURA na altura em que a bola para, medido na arte em y=66: postes em
 * 317,5 e 354,6 à direita (meio 336,1) e em 20,1 e 57,0 à esquerda (meio 38,6).
 *
 * Tem de ser medido nessa altura, e não na base: a trave é um "Y" em perspectiva, o mastro
 * inclina e os postes abrem conforme sobem. Na base do mastro o eixo passa por 330,0 /
 * 44,6, e usar esses valores lá em cima joga a bola para dentro, encostada num dos postes.
 * A base serve para outra coisa — é ela que define a profundidade do eixo central do campo
 * (ver FIELD_MID_Y).
 *
 * A altura do arco é fixa, e não proporcional: um field goal sobe alto sendo de 28 ou de
 * 50 jardas.
 */
export const GOAL_TARGET = {
  right: { x: 336.1, y: 66 },
  left: { x: 38.6, y: 66 },
} as const
const GOAL_ARC_HEIGHT = 78

export type FlightKind = 'pass' | 'kick' | 'goal'

/**
 * Eixo central do campo, de onde sai o chute ao gol: um field goal é batido do meio do
 * campo, não de perto de uma lateral.
 *
 * Medido na arte pela BASE das duas traves — elas ficam sobre o eixo central, uma em cada
 * fundo, e as duas encontram o gramado exatamente em y=116,75 (o dourado some em y=117 nos
 * dois lados). Logo o eixo é horizontal nessa altura, e uma reta ligando a origem do chute
 * à base do gol precisa ser horizontal também.
 *
 * Não confundir com o meio em pixels da superfície: de y=84 a y=162,5 daria 123,25, que é
 * 6,5px abaixo do eixo real. A perspectiva comprime a metade distante, então o centro do
 * campo projeta ACIMA do meio da faixa desenhada. As traves são a régua confiável aqui.
 */
export const FIELD_MID_Y = 116.75

/**
 * As três profundidades em que um lance pode ser desenhado, conforme o lado do campo em
 * que ele aconteceu. A profundidade é UMA por jogada e não muda enquanto ela corre: a bola
 * não sai da base e vai para o topo. O que muda é de uma jogada para a outra.
 *
 * - `near` (base) é o y=132 do estudo aprovado, que era a profundidade única até aqui.
 * - `center` é o eixo medido pela base das traves.
 * - `far` (topo) fica à mesma distância em PIXELS do centro que `near`: 15,25 para cada
 *   lado.
 *
 * A primeira versão colocava `far` à mesma distância REAL em campo (26,7 pés dos dois
 * lados), o que dava 105,83 — fisicamente correto, mas a perspectiva comprime a metade
 * distante e a faixa de cima lia como colada no centro. Aqui a leitura vence a física: as
 * três faixas precisam se distinguir de relance. O preço é que um lance no topo é desenhado
 * um pouco mais perto da lateral do que um na base (37,3 pés do centro contra 26,7).
 *
 * Não são as marcas de hash. As hashes ficam a 5,6m uma da outra num campo de 49m: dariam
 * ±4px aqui, invisíveis. Estas faixas representam o lado do campo em que o lance correu —
 * um dado inferido, não medido: ver `PlaySide`.
 */
export const PLAY_DEPTH = {
  far: 101.5,
  center: FIELD_MID_Y,
  near: GROUND_Y,
} as const

/**
 * Lado do campo em que o lance ACONTECEU, na perspectiva de quem ataca.
 *
 * NÃO é a posição lateral da bola no snap, e o nome diz isso de propósito: o play-by-play
 * não traz essa posição — não existe coluna de hash mark nem coordenada. O que existe é
 * para onde o lance FOI (`pass_location` / `run_location`), e é dele que este campo é
 * inferido no gerador do fixture (ver `playSideOf` em `scripts/build-nfl-live-fixture.mjs`).
 *
 * A inferência é causalmente invertida — um passe da hash esquerda para a lateral direita
 * sai desenhado inteiro na faixa direita, origem inclusive — e isso é deliberado: lido como
 * "de que lado do campo o lance correu", o desenho é coerente, e o visual foi aprovado
 * assim. Quando um fornecedor trouxer a posição real da bola, é `playSideOf` que muda.
 */
export type PlaySide = 'left' | 'middle' | 'right'

/**
 * Lado do campo -> profundidade. Depende do sentido do ataque: quem ataca para a direita
 * está de frente para a direita da tela, então a SUA esquerda aponta para longe da câmera
 * (topo). Quem ataca para a esquerda tem a própria esquerda apontando para a câmera (base).
 */
export function depthForPlaySide(playSide: PlaySide | null | undefined, direction: AttackDirection): number {
  if (playSide === 'left') return direction === 'right' ? PLAY_DEPTH.far : PLAY_DEPTH.near
  if (playSide === 'right') return direction === 'right' ? PLAY_DEPTH.near : PLAY_DEPTH.far

  return PLAY_DEPTH.center
}

/*
 * SEM recuo do passador: todo lance sai de cima da linha de scrimmage.
 *
 * Isto diverge do estudo aprovado por decisão da pessoa responsável pelo protótipo. No
 * estudo a bola fica em x=106 com a linha de scrimmage em x=114,9 na mesma profundidade —
 * o QB desenhado em shotgun, ~3,6 jardas atrás da linha. A referência do Twitter faz o
 * contrário, e a linha azul marca justamente ONDE A BOLA ESTAVA: num diagrama, começar o
 * lance em cima dela lê mais direto do que reproduzir a formação.
 *
 * O recuo também valia só para passe, então a mesma jarda de snap aparecia em dois lugares
 * conforme o tipo do lance. Agora passe, corrida e chute saem todos do mesmo ponto.
 */

export type AttackDirection = 'right' | 'left'

/**
 * Na arte, a end zone dos Chiefs (mandante) fica à esquerda e a dos Dolphins à direita,
 * então o mandante ataca para a direita.
 */
export const directionForSide = (side: 'home' | 'away'): AttackDirection => (
  side === 'home' ? 'right' : 'left'
)

export interface Point {
  x: number
  y: number
}

/**
 * Profundidade da end zone. Medida na arte: a faixa roxa tem 23px na profundidade da
 * jogada e uma jarda vale 2,43px, ou seja, as 10 jardas regulamentares. A jarda 110 é o
 * fundo da end zone, que é onde ficam as traves.
 */
export const END_ZONE_DEPTH = 10
/** Meio da end zone: onde a bola descansa depois de um touchdown. */
export const TOUCHDOWN_YARD = 105
/** Fundo da end zone: a linha das traves, alvo de field goal e ponto extra. */
export const GOALPOST_YARD = 110

/**
 * Jarda absoluta -> x no frame. Aceita de -10 a 110 para alcançar as duas end zones: a
 * bola precisa parar DENTRO do roxo num touchdown, e o chute precisa chegar às traves.
 */
export function yardToX(yard: number, direction: AttackDirection): number {
  const clamped = Math.max(-END_ZONE_DEPTH, Math.min(100 + END_ZONE_DEPTH, yard))
  const offset = (clamped / 100) * FIELD_SPAN

  return direction === 'right' ? GOAL_LEFT_X + offset : GOAL_RIGHT_X - offset
}

/** Ponto sobre o gramado para uma jarda — origem, recepção, marcadores e hastes. */
export function yardToGroundPoint(yard: number, direction: AttackDirection): Point {
  return { x: yardToX(yard, direction), y: GROUND_Y }
}

/**
 * Mesma jarda, em outra profundidade. O campo alarga na direção da câmera, então o x de
 * uma jarda muda conforme a linha em que ela é desenhada — daí o fator de largura.
 */
export function yardToXAtDepth(yard: number, direction: AttackDirection, depthY: number): number {
  const base = yardToX(yard, direction)

  return FIELD_CENTER_X + (base - FIELD_CENTER_X) * depthSpan(depthY)
}

export function arcHeight(fromX: number, toX: number, kind: FlightKind = 'pass'): number {
  const span = Math.abs(toX - fromX)
  if (kind === 'kick') {
    return Math.max(KICK_ARC_MIN_HEIGHT, Math.min(KICK_ARC_MAX_HEIGHT, span * KICK_ARC_RATIO))
  }

  return Math.max(ARC_MIN_HEIGHT, Math.min(ARC_MAX_HEIGHT, span * ARC_RATIO))
}

/**
 * Ponto do arco em `t` (0..1). Parábola simétrica com ápice no meio, como no guia oculto
 * do Figma. A bola segue exatamente esta função, e o rastro é amostrado dela — é o mesmo
 * caminho, não dois cálculos que podem divergir.
 */
/**
 * Ponto do arco em `t` (0..1). A base é a reta entre origem e destino, e a parábola faz a
 * corcova por cima dela — com destino no chão vira a parábola simétrica do estudo, e com
 * destino no alto (chute ao gol) a mesma conta serve sem caso especial.
 */
/**
 * Voo que termina LÁ EM CIMA — o passe que chega à mão do jogador, no selo sobre o retrato —
 * tem teto para a corcova: UM QUARTO DA SUBIDA é a altura em que a bola chega ao destino no
 * ponto mais alto do arco, com velocidade vertical zero. Até esse valor ela sobe o caminho
 * inteiro e assenta na mão; acima dele passa por cima do retrato e desce nele de volta,
 * atravessando a foto — e volta a ser o que não podia ser, uma bola que cai e sobe.
 *
 * Não é constante ajustada: sai da própria parábola. Com `y(t) = y0 + Δt - 4h·t(1-t)`, a
 * derivada em t=1 é `Δ + 4h`, que zera em `h = -Δ/4`.
 *
 * Quem mira o gramado não passa por aqui — a subida é zero e a corcova fica inteira. É o
 * caso do tracejado do passe, que continua desenhando o arco sobre o campo.
 *
 * Chute ao gol também fica de fora: lá a altura é fixa e a bola PRECISA subir bem acima do
 * alvo para descer entre os postes.
 */
const flightHeight = (from: Point, to: Point, kind: FlightKind) => {
  if (kind === 'goal') return GOAL_ARC_HEIGHT

  const height = arcHeight(from.x, to.x, kind)
  const climb = from.y - to.y

  return climb > 0 ? Math.min(height, climb / 4) : height
}

export function arcPoint(from: Point, to: Point, t: number, kind: FlightKind = 'pass'): Point {
  const clamped = Math.max(0, Math.min(1, t))
  const height = flightHeight(from, to, kind)
  const base = from.y + (to.y - from.y) * clamped

  return {
    x: from.x + (to.x - from.x) * clamped,
    y: base - 4 * height * clamped * (1 - clamped),
  }
}

/**
 * O mesmo arco como `path` de SVG, para o traço e o fluxo direcional correrem exatamente
 * sobre o caminho da bola. Uma Bézier quadrática com o controle a `2h` acima do meio é
 * algebricamente idêntica à parábola de `arcPoint` — não é aproximação.
 */
export function arcPath(from: Point, to: Point, kind: FlightKind = 'pass'): string {
  const height = flightHeight(from, to, kind)
  const mid = (from.x + to.x) / 2
  const control = (from.y + to.y) / 2 - 2 * height

  return `M ${from.x} ${from.y} Q ${mid} ${control} ${to.x} ${to.y}`
}

/** Trecho rasteiro: o avanço depois da recepção não voa. */
export function groundPoint(fromX: number, toX: number, t: number, depthY: number = GROUND_Y): Point {
  const clamped = Math.max(0, Math.min(1, t))

  return { x: fromX + (toX - fromX) * clamped, y: depthY }
}

/**
 * Linha vertical do campo (scrimmage e primeira descida) acompanhando a perspectiva: ela
 * se inclina porque o campo alarga na direção da câmera. As bordas foram medidas na arte
 * nas mesmas profundidades das pontas da linha.
 */
// A linha vai de lateral a lateral: a superfície de jogo da arte começa em y=84 e termina
// em y=162,5 (medido, e constante ao longo de todo o campo).
//
// As larguras nessas bordas vêm de um ajuste linear sobre as linhas de gol medidas de 10
// em 10 entre y=88 e y=148 — `span(y) = 1,19727*y + 85,2126`, que reproduz as medições
// com erro desprezível. Foi preciso ajustar em vez de medir direto nas bordas porque, ali,
// a faixa branca do limite confunde a detecção da fronteira end zone/gramado.
const LINE_TOP_Y = 84
const LINE_BOTTOM_Y = 162.5
const LINE_TOP_SPAN = 0.7637
const LINE_BOTTOM_SPAN = 1.1501
const FIELD_CENTER_X = 187.25

/** Largura do campo numa profundidade, como fração da largura na linha da jogada. */
const depthSpan = (y: number) => (
  LINE_TOP_SPAN + ((y - LINE_TOP_Y) / (LINE_BOTTOM_Y - LINE_TOP_Y)) * (LINE_BOTTOM_SPAN - LINE_TOP_SPAN)
)

export function fieldLine(yard: number, direction: AttackDirection): { x1: number; y1: number; x2: number; y2: number } {
  return {
    x1: yardToXAtDepth(yard, direction, LINE_TOP_Y),
    y1: LINE_TOP_Y,
    x2: yardToXAtDepth(yard, direction, LINE_BOTTOM_Y),
    y2: LINE_BOTTOM_Y,
  }
}
