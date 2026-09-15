import { getLocalPlayerImageByName } from '../../../data/playerImages'
import playerAvatarNFL from '../../../assets/playerAvatarNFL.svg'
import bolaNFL from '../../../assets/bolaNFL.png'
import {
  FIELD_FRAME,
  arcPath,
  arcPoint,
  depthForLateral,
  directionForSide,
  fieldLine,
  GOAL_TARGET,
  yardToXAtDepth,
  TOUCHDOWN_YARD,
  type FlightKind,
  type PlayLateral,
  groundPoint,
  type Point,
} from './fieldGeometry'
import { getGainValue, getYardAbbr, hasBallFlight, hasNullifiedPlay, isAnimatable, isKick, isRun, shortName, showsGainBadge, type NflPlay } from './playNarrative'
import { REPLAY_TIMING, type ReplayPhase, type ReplaySpeed } from './usePlayReplay'

// Camadas sobre a arte 3D, na ordem do Figma: linhas -> sombra -> rastro -> bola ->
// marcadores no gramado -> haste -> retrato -> pulso. Nada aqui redesenha o campo: é um
// SVG transparente com o mesmo viewBox do frame de referência, então tudo escala junto
// com a imagem e continua alinhado em qualquer largura.

// Cores amostradas do estudo aprovado.
const SCRIMMAGE_COLOR = '#40b8ff'
const FIRST_DOWN_COLOR = '#ffd63d'
const TRAIL_COLOR = '#a877ff'
/* Passe que cai é vermelho, como na referência: o lilás é cor de confirmação e não pode
   aparecer num lance que não deu certo. É o mesmo vermelho do ponto de "ao vivo" do
   sheet (`--ds-feedback-error-default`). */
const INCOMPLETE_COLOR = '#f43f5e'
/* Jogada anulada: cinza neutro. O lilás é cor de confirmação e o vermelho é de erro do
   lance; aqui a jogada saiu bem, só não conta. Cinza é o que diz "não vale" sem dizer
   "deu errado". */
const VOID_COLOR = '#9aa0a6'
/** Braço do X que marca onde o passe caiu. */
const INCOMPLETE_MARK = 4.5

/* Um pouco menor que os 18 do estudo: em 375px de largura a bola competia com o retrato e
   com os marcadores do gramado. */
const BALL_SIZE = 15

const PORTRAIT_RADIUS = 20
/* Retrato, haste e nome sobem 6px em relação ao estudo (centro em 58, haste em 78, nome em
   30). Os três andam juntos: a haste tem de continuar saindo da base do círculo
   (PORTRAIT_CENTER_Y + PORTRAIT_RADIUS) e o nome tem de manter a mesma folga acima dele. */
const PORTRAIT_CENTER_Y = 52
const STEM_TOP_Y = PORTRAIT_CENTER_Y + PORTRAIT_RADIUS
const NAME_BASELINE_Y = 24

/** Quantidade e alcance do rastro: trecho curto atrás da bola, não a rota inteira. */
const TRAIL_SAMPLES = 7
const TRAIL_SPAN = 0.17

// Fluxo direcional do caminho, mesma técnica da referência do Twitter: tracejado correndo
// por `stroke-dashoffset` com `<animate>` do SVG, e um gradiente ao longo do caminho que
// nasce fraco na origem e chega forte no destino, indicando o sentido.
//
// É SMIL, e não o laço de `rAF`: a animação é do próprio SVG, então corre sozinha e não
// trava se um quadro atrasar.
//
// Medidas convertidas do Twitter (viewBox 1200 para um campo de ~1083) para o nosso frame
// (375 para ~243): fator ~4,46. O tracejado `6 26` vira `1,6 5,4`, e a duração fica em
// 0,32s porque período e velocidade escalam juntos. A LARGURA não segue essa conversão:
// escalada ao pé da letra daria 1,6 e o traço sumia num campo desenhado em 375px (ver
// FLOW_STROKE abaixo).
const FLOW_DASH = '1.6 5.4'
const FLOW_PERIOD = 7
const FLOW_DURATION = '0.32s'

/**
 * Espessura do tracejado: a cor por cima, o contorno escuro por baixo sobrando 0,4 de cada
 * lado. O contorno existe para o traço não sumir quando cruza a grama clara.
 *
 * Cuidado ao subir mais: com `stroke-linecap: round` cada traço rende a própria largura a
 * mais de comprimento (1,6 de traço com 2,8 de largura ocupa 4,4), e o período é fixo em 7.
 * Nestes valores sobram 2,6 de vão na cor e 1,8 no contorno. Passar disso começa a emendar
 * um traço no outro, e aí o `FLOW_DASH` e o `FLOW_PERIOD` têm de crescer junto — com a
 * duração acompanhando, senão o fluxo muda de velocidade.
 */
const FLOW_STROKE = 2.8
const FLOW_CASING_STROKE = 3.6

interface NflFieldStageProps {
  play: NflPlay
  phase: ReplayPhase
  progress: number
  /** Só para o fadeOut acompanhar a velocidade da reprodução. */
  speed: ReplaySpeed
  /** Verdadeiro quando este lance vai dar lugar ao próximo: o palco sai apagando. */
  leaving: boolean
}

export function NflFieldStage({ play, phase, progress, speed, leaving }: NflFieldStageProps) {
  const direction = directionForSide(play.side as 'home' | 'away')
  const startYard = play.startYard ?? 0
  const animatable = isAnimatable(play)
  /**
   * Jogada anulada por penalidade que aconteceu mesmo. Ela é desenhada porque a bola foi
   * snapada e alguém correu ou lançou — o que não vale é o resultado. O fixture extrai isso
   * do texto oficial, já separando as anuladas em que o lance não chegou a existir.
   */
  const voided = hasNullifiedPlay(play)
  const voidPlay = voided ? play.nullified : null
  /** A bola voa (passe ou chute). Corrida anda, não voa: não tem arco nem recepção. */
  const flies = hasBallFlight(play) || voidPlay?.kind === 'pass'
  const runPlay = isRun(play) || voidPlay?.kind === 'run'

  const kick = isKick(play)
  const kickAtGoalKind = play.type === 'field_goal' || play.type === 'extra_point'
  const kind: FlightKind = kickAtGoalKind ? 'goal' : (kick ? 'kick' : 'pass')
  // Corrida não tem "completo": a bola andou. Sem isto ela cairia no ramo do passe que
  // falhou e o caminho inteiro sairia vermelho.
  const complete = kick ? !play.touchback : (runPlay || voided || play.complete)

  // Onde a bola cai e para onde vai depois.
  //
  // No kickoff `posteam` é quem RECEBE, e a bola parte da linha de onde o adversário
  // chuta: no referencial de quem recebe, ela voa para TRÁS (rumo à própria end zone) e só
  // o retorno anda para frente. Em punt, field goal e ponto extra o chute é do próprio
  // `posteam` e segue para frente.
  const kickBackwards = play.type === 'kickoff'
  // Field goal e ponto extra não andam `kickDistance` no campo: esse número é a distância
  // da TENTATIVA, que já inclui as 10 jardas da end zone e a profundidade do snap. Um
  // field goal de 28 jardas da MIA 10 cairia na jarda 118, fora do campo. O que a bola
  // percorre é daqui até as traves, ou seja, até a linha de gol.
  const kickAtGoal = play.type === 'field_goal' || play.type === 'extra_point'
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
  } else if (runPlay) {
    // A corrida inteira é o trecho rasteiro: sai da linha e vai até onde parou. Origem e
    // "recepção" no mesmo ponto, porque não há bola no ar entre os dois.
    catchYard = startYard
    endYard = startYard + play.yards
  } else if (flies) {
    catchYard = startYard + (play.airYards ?? 0)
    endYard = complete ? startYard + play.yards : catchYard
  } else {
    catchYard = startYard + play.yards
    endYard = startYard + play.yards
  }

  // Touchdown termina DENTRO da end zone, não em cima da linha de gol: `startYard + yards`
  // dá exatamente a linha, e a bola ficava em cima dela em vez de no roxo.
  if (play.touchdown && !kick) endYard = TOUCHDOWN_YARD
  const firstDownYard = play.distance !== null ? startYard + play.distance : null

  // Profundidade deste lance. É UMA só e não muda enquanto ele corre: a bola não sai da
  // base e vai para o topo. O que muda é de uma jogada para a outra, conforme o lado do
  // campo em que ela aconteceu. Chute ao gol e kickoff chegam marcados como `middle`.
  const playGroundY = depthForLateral(play.lateral as PlayLateral | null, direction)
  // Toda jarda deste lance é lida NESTA profundidade: o campo alarga na direção da câmera,
  // então o x de uma jarda depende da linha em que ela é desenhada.
  const atDepth = (yard: number) => yardToXAtDepth(yard, direction, playGroundY)
  // Origem = a própria jarda do snap, em cima da linha azul, para todo tipo de lance.
  const originX = atDepth(startYard)
  // Chute ao gol tem alvo próprio: o meio da abertura, no alto, e não uma jarda no gramado.
  // Por isso ele não passa pelo mapeamento de jardas.
  const goal = kickAtGoal ? GOAL_TARGET[direction] : null
  const catchX = goal ? goal.x : atDepth(catchYard)
  const catchY = goal ? goal.y : playGroundY
  const endX = goal ? goal.x : atDepth(endYard)
  const originPoint: Point = { x: originX, y: playGroundY }
  const catchPoint: Point = { x: catchX, y: catchY }

  const scrimmage = fieldLine(startYard, direction)
  const firstDown = firstDownYard !== null ? fieldLine(firstDownYard, direction) : null

  // Posição da bola por fase. O rastro amostra esta mesma função, então caminho e rastro
  // não podem divergir.
  let ball: Point
  if (!animatable || phase === 'idle') ball = originPoint
  else if (phase === 'preparing') ball = originPoint
  else if (phase === 'air') ball = arcPoint(originPoint, catchPoint, progress, kind)
  else if (phase === 'catch') ball = catchPoint
  else if (phase === 'run') ball = groundPoint(catchX, endX, progress, playGroundY)
  else ball = { x: endX, y: goal ? goal.y : playGroundY }

  // Altura da bola sobre o gramado: a sombra fica presa ao chão e só acompanha o x.
  const height = playGroundY - ball.y
  const shadowWidth = 10 + Math.min(2, height / 14)
  const shadowOpacity = 0.45 - Math.min(0.2, height / 220)

  // O foco alterna: lançador na preparação, recebedor a partir do voo. Em passe curto
  // isso evita dois retratos sobrepostos sem afastar artificialmente os pontos.
  // Num passe que cai o foco NÃO passa para o alvo: quem apareceria ali não ficou com a
  // bola, e trocar a foto dava a entender que ficou. O lançador permanece o lance inteiro.
  const incompletePass = animatable && !kick && !complete
  // Quem chuta não sai do lugar: sem alguém do outro lado para receber (field goal, ponto
  // extra, punt sem retorno), quem viaja é só a bola. Kickoff tem retornador, e aí o foco
  // passa para ele.
  const staysAtOrigin = incompletePass || (kick && !play.returner)
  const focusOnPasser = animatable && (staysAtOrigin || phase === 'preparing' || phase === 'idle')
  // Numa corrida não há passador: quem sai com a bola é o próprio corredor. Sem isto o
  // nome sumia durante a preparação e reaparecia quando a bola andava.
  const origin = kick ? play.kicker : (voidPlay?.passer || voidPlay?.rusher || play.passer || play.rusher)
  const target = kick
    ? (play.returner ?? play.kicker)
    : (voidPlay?.receiver ?? voidPlay?.rusher ?? play.receiver ?? play.rusher ?? play.passer)
  const focusName = focusOnPasser ? origin : target
  const focusX = focusOnPasser
    ? originX
    : (phase === 'run' || phase === 'result' ? ball.x : catchX)

  const photo = focusName ? getLocalPlayerImageByName(focusName) ?? playerAvatarNFL : playerAvatarNFL
  const clipId = `nfl-portrait-${play.id}`


  // Rastro curto atrás da bola, amostrado da MESMA função que move a bola — no ar, o arco;
  // no chão, a reta. Assim caminho e rastro não podem divergir.
  const trailFrom = (at: (t: number) => Point) => Array.from({ length: TRAIL_SAMPLES }, (_, index) => {
    const t = progress - (TRAIL_SPAN * (index + 1)) / TRAIL_SAMPLES
    if (t <= 0) return null

    return { point: at(t), opacity: (1 - (index + 1) / (TRAIL_SAMPLES + 1)) * 0.75, radius: 3.2 - index * 0.32 }
  }).filter(Boolean) as { point: Point; opacity: number; radius: number }[]

  // A bola some em dois momentos, e nunca em touchdown nem em chute ao gol — nesses dois a
  // posição final dela é o que o lance tem para contar.
  const keepsBall = play.touchdown || kickAtGoal
  const hasGroundLeg = Math.abs(endX - catchX) > 0.5

  // 1) AO SER RECEBIDA, quando ainda há chão pela frente: dali em diante quem anda é o
  //    jogador com a bola na mão. Manter a bola desenhada fazia parecer que ela estava
  //    rolando sozinha pelo gramado ao lado do retrato.
  const caught = flies && hasGroundLeg && !keepsBall
    && (phase === 'catch' || phase === 'run' || phase === 'result')

  // No trecho rasteiro o rastro só existe se a bola estiver visível: depois da recepção ela
  // some, e uma fileira de pontos atrás de nada ficava sem leitura.
  const trail = phase === 'air'
    ? trailFrom((t) => arcPoint(originPoint, catchPoint, t, kind))
    : (phase === 'run' && !caught ? trailFrom((t) => groundPoint(catchX, endX, t, playGroundY)) : [])

  // Caminho percorrido: arco do passe e, quando há avanço pós-recepção, o trecho rasteiro.
  const inFlight = phase === 'air' || phase === 'catch' || phase === 'run'
  const showPath = animatable && (inFlight || phase === 'result')
  // Sem voo não há arco: numa corrida, origem e destino do trecho aéreo são o mesmo ponto
  // e o `path` sairia degenerado.
  const airPath = flies ? arcPath(originPoint, catchPoint, kind) : null
  const runPath = Math.abs(endX - catchX) > 0.5 ? `M ${catchX} ${playGroundY} L ${endX} ${playGroundY}` : null
  const flowId = `nfl-flow-${play.id}`
  const casingId = `nfl-flow-casing-${play.id}`
  // O fluxo do trecho rasteiro só entra quando a bola chega lá.
  const showRunFlow = phase === 'run' || phase === 'result'

  // Cor do caminho do lance. As duas bolinhas — saída e recepção —, o rastro, o fluxo e o
  // pulso usam todos esta mesma cor: são o mesmo caminho, e as bolinhas são as pontas dele.
  // Passe que cai vira vermelho por inteiro, marcador de saída incluído.
  const pathColor = voided ? VOID_COLOR : (complete ? TRAIL_COLOR : INCOMPLETE_COLOR)

  // Onde a segunda bolinha fica: no passe é a recepção; na corrida é onde o corredor foi
  // parado. Sem esta distinção, numa corrida ela caía em cima da bolinha de saída (origem e
  // "recepção" são o mesmo ponto) e o fim do lance ficava sem marca nenhuma.
  const arrivalX = runPlay ? endX : catchX

  /**
   * A placa gira no fim e mostra as jardas. Só onde houve avanço para contar: passe
   * completo e corrida. Passe que cai não tem número, e em chute o "quanto andou" é
   * ambíguo (distância do chute ou do retorno?), então ficam de fora.
   *
   * São DUAS faces empilhadas com animações em fases opostas — a da frente encolhe na
   * primeira metade, a de trás cresce na segunda. Assim o próprio CSS faz a troca de
   * conteúdo no meio do giro, sem um temporizador em JS para sincronizar.
   */
  const flipsToGain = phase === 'result' && showsGainBadge(play)
  const flipStyle = {
    '--flip-delay': `${REPLAY_TIMING.badgeFlipDelay / speed}ms`,
    '--flip-out': `${REPLAY_TIMING.badgeFlipOut / speed}ms`,
    '--flip-in': `${REPLAY_TIMING.badgeFlipIn / speed}ms`,
  } as React.CSSProperties

  // 2) AO ASSENTAR no fim do lance, para não ficar um objeto solto enquanto se lê o
  //    resultado. Lance sem animação não apaga: não houve queda, a bola só marca a posição.
  const settled = phase === 'result' && !keepsBall

  const ballFades = animatable && (caught || settled)
  // Recebida, a bola tem de sumir ANTES de a corrida começar, então o fade cabe dentro da
  // fase de recepção. No fim do lance não há pressa e ele pode ser mais longo.
  const fadeDuration = caught
    ? REPLAY_TIMING.catchPulse - REPLAY_TIMING.ballFadeDelay
    : REPLAY_TIMING.ballFadeDuration
  const fadeStyle = ballFades
    ? {
      animationDelay: `${REPLAY_TIMING.ballFadeDelay / speed}ms`,
      animationDuration: `${fadeDuration / speed}ms`,
    }
    : undefined
  const fadeClass = ballFades ? 'nfl-plays__fade-out' : undefined

  // Saída do palco inteiro, quando o próximo lance vem em seguida. A classe substitui a
  // animação de entrada (já terminada), então as duas não brigam pelo mesmo `animation`.
  const exitStyle = leaving
    ? {
      animationDelay: `${(flipsToGain ? REPLAY_TIMING.stageExitDelayGain : REPLAY_TIMING.stageExitDelay) / speed}ms`,
      animationDuration: `${REPLAY_TIMING.stageExitDuration / speed}ms`,
    }
    : undefined

  // O pulso é confirmação de recepção, então não existe em passe que cai.
  //
  // Ele nasce ONDE A BOLA CHEGOU, e não no gramado: num chute ao gol a bola para entre os
  // postes, no alto, e um anel na grama marcaria um ponto em que ela nunca encostou. Como
  // `catchY` é a própria linha do chão em todo lance rasteiro, usar o ponto de chegada aqui
  // muda só o chute ao gol.
  const showCatchPulse = phase === 'catch' && complete
  const pulseRadius = 8 + progress * 16
  const pulseOpacity = Math.max(0, 0.55 * (1 - progress))

  return (
    <svg
      className={`nfl-plays__stage${leaving ? ' nfl-plays__stage--leaving' : ''}`}
      style={exitStyle}
      viewBox={`0 0 ${FIELD_FRAME.width} ${FIELD_FRAME.height}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={focusX} cy={PORTRAIT_CENTER_Y} r={PORTRAIT_RADIUS - 2} />
        </clipPath>
        <linearGradient id={casingId} gradientUnits="userSpaceOnUse" x1={originX} y1={playGroundY} x2={endX} y2={playGroundY}>
          <stop offset="0" stopColor="#000000" stopOpacity="0.2" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id={flowId} gradientUnits="userSpaceOnUse" x1={originX} y1={playGroundY} x2={endX} y2={playGroundY}>
          <stop offset="0" stopColor={pathColor} stopOpacity="0.28" />
          <stop offset="1" stopColor={pathColor} stopOpacity={complete ? '0.95' : '0.6'} />
        </linearGradient>
      </defs>

      <line
        x1={scrimmage.x1}
        y1={scrimmage.y1}
        x2={scrimmage.x2}
        y2={scrimmage.y2}
        stroke={SCRIMMAGE_COLOR}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.9}
      />
      {firstDown && (
        <line
          x1={firstDown.x1}
          y1={firstDown.y1}
          x2={firstDown.x2}
          y2={firstDown.y2}
          stroke={FIRST_DOWN_COLOR}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.9}
        />
      )}

      {showPath && (
        <g className="nfl-plays__stage-path">
          {airPath && (
            <>
              <path d={airPath} fill="none" stroke={`url(#${casingId})`} strokeWidth={FLOW_CASING_STROKE} strokeDasharray={FLOW_DASH} strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" from={FLOW_PERIOD} to="0" dur={FLOW_DURATION} repeatCount="indefinite" />
              </path>
              <path d={airPath} fill="none" stroke={`url(#${flowId})`} strokeWidth={FLOW_STROKE} strokeDasharray={FLOW_DASH} strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" from={FLOW_PERIOD} to="0" dur={FLOW_DURATION} repeatCount="indefinite" />
              </path>
            </>
          )}
          {runPath && showRunFlow && (
            <>
              <path d={runPath} fill="none" stroke={`url(#${casingId})`} strokeWidth={FLOW_CASING_STROKE} strokeDasharray={FLOW_DASH} strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" from={FLOW_PERIOD} to="0" dur={FLOW_DURATION} repeatCount="indefinite" />
              </path>
              <path d={runPath} fill="none" stroke={`url(#${flowId})`} strokeWidth={FLOW_STROKE} strokeDasharray={FLOW_DASH} strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" from={FLOW_PERIOD} to="0" dur={FLOW_DURATION} repeatCount="indefinite" />
              </path>
            </>
          )}
        </g>
      )}

      {!(incompletePass && (phase === 'catch' || phase === 'result')) && (
        <ellipse cx={ball.x} cy={playGroundY + 0.5} rx={shadowWidth / 2} ry={1.5} fill="#000" opacity={shadowOpacity} className={fadeClass} style={fadeStyle} />
      )}

      {trail.map((segment, index) => (
        <circle
          key={index}
          cx={segment.point.x}
          cy={segment.point.y}
          r={segment.radius}
          fill={pathColor}
          opacity={segment.opacity}
        />
      ))}

      {/* A bolinha de saída tem a cor da linha da trajetória, como na referência: ela é o
          ponto onde esse caminho começa, não um marcador separado. */}
      <ellipse cx={originX} cy={playGroundY} rx={4} ry={2} fill={pathColor} opacity={0.9} />
      {animatable && !kickAtGoal && phase !== 'idle' && phase !== 'preparing' && (
        complete
          ? <ellipse cx={arrivalX} cy={playGroundY} rx={4} ry={2} fill={pathColor} opacity={0.9} />
          : (
            // X no ponto onde o passe caiu, como na referência.
            <g className="nfl-plays__stage-miss" stroke={INCOMPLETE_COLOR} strokeWidth={2.4} strokeLinecap="round">
              <line
                x1={catchX - INCOMPLETE_MARK}
                y1={playGroundY - INCOMPLETE_MARK / 2}
                x2={catchX + INCOMPLETE_MARK}
                y2={playGroundY + INCOMPLETE_MARK / 2}
              />
              <line
                x1={catchX - INCOMPLETE_MARK}
                y1={playGroundY + INCOMPLETE_MARK / 2}
                x2={catchX + INCOMPLETE_MARK}
                y2={playGroundY - INCOMPLETE_MARK / 2}
              />
            </g>
          )
      )}

      {showCatchPulse && (
        <circle
          cx={catchX}
          cy={catchY}
          r={pulseRadius}
          fill="none"
          stroke={pathColor}
          strokeWidth={2}
          opacity={pulseOpacity}
        />
      )}

      {/* Num passe que cai, a bola some ao chegar e o X fica no lugar dela: as duas coisas
          empilhadas no mesmo ponto só sujariam a leitura. */}
      {!(incompletePass && (phase === 'catch' || phase === 'result')) && (
        <image
          href={bolaNFL}
          x={ball.x - BALL_SIZE / 2}
          y={ball.y - BALL_SIZE / 2}
          width={BALL_SIZE}
          height={BALL_SIZE}
          className={fadeClass}
          style={fadeStyle}
        />
      )}

      <line x1={focusX} y1={STEM_TOP_Y} x2={focusX} y2={playGroundY} stroke="#fbfbfb" strokeWidth={1} opacity={0.8} />
      <g className={flipsToGain ? 'nfl-plays__badge-front' : undefined} style={flipsToGain ? flipStyle : undefined}>
        <circle cx={focusX} cy={PORTRAIT_CENTER_Y} r={PORTRAIT_RADIUS} fill="#1b1b1b" stroke={TRAIL_COLOR} strokeWidth={1.5} />
        <image
          href={photo}
          x={focusX - (PORTRAIT_RADIUS - 2)}
          y={PORTRAIT_CENTER_Y - (PORTRAIT_RADIUS - 2)}
          width={(PORTRAIT_RADIUS - 2) * 2}
          height={(PORTRAIT_RADIUS - 2) * 2}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
        />
      </g>
      {flipsToGain && (
        <g className="nfl-plays__badge-back" style={flipStyle}>
          <circle cx={focusX} cy={PORTRAIT_CENTER_Y} r={PORTRAIT_RADIUS} fill="#1b1b1b" stroke={TRAIL_COLOR} strokeWidth={1.5} />
          <text x={focusX} y={PORTRAIT_CENTER_Y + 2} textAnchor="middle" className="nfl-plays__badge-gain">
            {getGainValue(play)}
          </text>
          <text x={focusX} y={PORTRAIT_CENTER_Y + 11} textAnchor="middle" className="nfl-plays__badge-unit">
            {getYardAbbr()}
          </text>
        </g>
      )}
      {/* Anel que abre no instante em que a face vira — fora do grupo que gira, senão ele
          sairia achatado junto com a placa. */}
      {flipsToGain && (
        <circle
          className="nfl-plays__badge-ring"
          style={flipStyle}
          cx={focusX}
          cy={PORTRAIT_CENTER_Y}
          r={PORTRAIT_RADIUS}
          fill="none"
          stroke="var(--ds-current-score, #bb78ff)"
          strokeWidth={2}
        />
      )}
      {focusName && (
        <text
          x={focusX}
          y={NAME_BASELINE_Y}
          textAnchor="middle"
          className="nfl-plays__stage-name"
        >
          {shortName(focusName)}
        </text>
      )}
    </svg>
  )
}
