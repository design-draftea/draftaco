import { getLocalPlayerImageByName } from '../../../data/playerImages'
import playerAvatarNFL from '../../../assets/playerAvatarNFL.svg'
import bolaNFL from '../../../assets/bolaNFL.png'
import { FIELD_FRAME } from './fieldGeometry'
import { getGainValue, getYardAbbr, shortName, type NflPlay } from './playNarrative'
import {
  buildPlayScene,
  frameAt,
  NAME_BASELINE_Y,
  PORTRAIT_CENTER_Y,
  PORTRAIT_RADIUS,
  STEM_TOP_Y,
  type PathTone,
} from './playScene'
import { REPLAY_TIMING, timeScaler, type ReplayPhase, type ReplaySpeed } from './usePlayReplay'

// Camadas sobre a arte 3D, na ordem do Figma: linhas -> sombra -> rastro -> bola ->
// marcadores no gramado -> haste -> retrato -> pulso. Nada aqui redesenha o campo: é um
// SVG transparente com o mesmo viewBox do frame de referência, então tudo escala junto
// com a imagem e continua alinhado em qualquer largura.
//
// Este arquivo só DESENHA. O que desenhar — geometria, desfecho, fases e visibilidade —
// vem pronto de `playScene.ts`, que é puro e não sabe de React.

/* Cores amostradas do estudo aprovado no Figma. NÃO existe token equivalente no design
   system para nenhuma delas: `--ds-*` não tem cor de linha de scrimmage, de primeira
   descida, de trajetória nem de lance anulado (conferido em `design-system-tokens.css`).
   São valores desta visualização, e não do sistema — trocá-los por um token "parecido"
   porque um hex solto parece errado mudaria o desenho aprovado. Se um dia virarem token de
   verdade, isso é decisão de marca e precisa entrar nos tokens das DUAS marcas. */
const SCRIMMAGE_COLOR = '#40b8ff'
const FIRST_DOWN_COLOR = '#ffd63d'
const TRAIL_COLOR = '#a877ff'
/* Passe que cai é vermelho, como na referência: o lilás é cor de confirmação e não pode
   aparecer num lance que não deu certo. É o mesmo vermelho do ponto de "ao vivo" do sheet
   (`--ds-live`), mas entra aqui como valor: o ponto ao vivo é um estado do produto, e esta
   é a cor de um lance que falhou — as duas mudariam por motivos diferentes. */
const INCOMPLETE_COLOR = '#f43f5e'
/* Jogada anulada: cinza neutro. O lilás é cor de confirmação e o vermelho é de erro do
   lance; aqui a jogada saiu bem, só não conta. Cinza é o que diz "não vale" sem dizer
   "deu errado". */
const VOID_COLOR = '#9aa0a6'

/** Papel da cor no caminho -> a cor em si. O palco é quem conhece a paleta. */
const PATH_COLOR: Record<PathTone, string> = {
  success: TRAIL_COLOR,
  error: INCOMPLETE_COLOR,
  void: VOID_COLOR,
}

/** Braço do X que marca onde o passe caiu. */
const INCOMPLETE_MARK = 4.5

/* Um pouco menor que os 18 do estudo: em 375px de largura a bola competia com o retrato e
   com os marcadores do gramado. */
const BALL_SIZE = 15

/* Selo da bola carregada, do estudo aprovado: círculo de 16 com borda de 1, e a bola dentro
   com 2 de respiro de cada lado. O fundo e a borda são os MESMOS do retrato — é o que faz os
   dois lerem como uma peça só, o jogador com a bola na mão.

   O raio desconta meia borda para o diâmetro externo fechar em 16: no SVG o traço nasce em
   cima do raio e sobra metade para cada lado. */
const CARRY_BADGE_SIZE = 16
const CARRY_BADGE_BORDER = 1
const CARRY_BADGE_PADDING = 2
const CARRY_BADGE_RADIUS = (CARRY_BADGE_SIZE - CARRY_BADGE_BORDER) / 2
const CARRY_BALL_SIZE = CARRY_BADGE_SIZE - CARRY_BADGE_PADDING * 2

/* Fundo e aro do retrato. Ficam em constantes porque o selo da bola carregada precisa
   repetir exatamente os dois. */
const PORTRAIT_FILL = '#1b1b1b'

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

/** Tracejado que corre sobre o caminho: contorno escuro por baixo, cor por cima. */
function FlowPath({ d, casingId, flowId }: { d: string; casingId: string; flowId: string }) {
  return (
    <>
      <path d={d} fill="none" stroke={`url(#${casingId})`} strokeWidth={FLOW_CASING_STROKE} strokeDasharray={FLOW_DASH} strokeLinecap="round">
        <animate attributeName="stroke-dashoffset" from={FLOW_PERIOD} to="0" dur={FLOW_DURATION} repeatCount="indefinite" />
      </path>
      <path d={d} fill="none" stroke={`url(#${flowId})`} strokeWidth={FLOW_STROKE} strokeDasharray={FLOW_DASH} strokeLinecap="round">
        <animate attributeName="stroke-dashoffset" from={FLOW_PERIOD} to="0" dur={FLOW_DURATION} repeatCount="indefinite" />
      </path>
    </>
  )
}

interface NflFieldStageProps {
  play: NflPlay
  phase: ReplayPhase
  progress: number
  /** Só para as animações em CSS acompanharem a velocidade da reprodução. */
  speed: ReplaySpeed
  /** Verdadeiro quando este lance vai dar lugar ao próximo: o palco sai apagando. */
  leaving: boolean
}

export function NflFieldStage({ play, phase, progress, speed, leaving }: NflFieldStageProps) {
  const scene = buildPlayScene(play)
  const frame = frameAt(scene, phase, progress)
  const ms = timeScaler(speed)

  const pathColor = PATH_COLOR[scene.pathTone]
  const photo = frame.focusName ? getLocalPlayerImageByName(frame.focusName) ?? playerAvatarNFL : playerAvatarNFL
  const clipId = `nfl-portrait-${play.id}`
  const flowId = `nfl-flow-${play.id}`
  const casingId = `nfl-flow-casing-${play.id}`

  /**
   * A placa gira no fim e mostra as jardas. São DUAS faces empilhadas com animações em
   * fases opostas — a da frente encolhe na primeira metade, a de trás cresce na segunda.
   * Assim o próprio CSS faz a troca de conteúdo no meio do giro, sem um temporizador em JS
   * para sincronizar.
   */
  const flipStyle = {
    '--flip-delay': ms(REPLAY_TIMING.badgeFlipDelay),
    '--flip-out': ms(REPLAY_TIMING.badgeFlipOut),
    '--flip-in': ms(REPLAY_TIMING.badgeFlipIn),
  } as React.CSSProperties

  // A bola tem de chegar à mão do jogador ANTES de a corrida começar, então a passagem cabe
  // dentro da fase de recepção. O apagar do fim do lance não tem pressa e pode ser mais longo.
  const carried = frame.ballEnding === 'carried'
  const ballDuration = carried
    ? REPLAY_TIMING.catchPulse - REPLAY_TIMING.ballFadeDelay
    : REPLAY_TIMING.ballFadeDuration
  // Numa corrida não existe recepção: o corredor já sai com a bola da linha, então a
  // passagem para a mão começa junto com o lance em vez de esperar a bola assentar. No passe
  // que vai direto para a mão a espera também não cabe: a bola chega ao selo no fim do voo,
  // e o que sobra é só ela encolher com o aro aparecendo em volta. A espera fica para quem
  // ainda precisa pegar a bola do chão — o retornador de um chute.
  const carryStartsAtOnce = carried && (!scene.flies || scene.catchesInHand)
  const ballTiming = frame.ballEnding === 'none'
    ? undefined
    : {
      animationDelay: ms(carryStartsAtOnce ? 0 : REPLAY_TIMING.ballFadeDelay),
      animationDuration: ms(ballDuration),
    }
  // A sombra apaga no lugar mesmo quando a bola é carregada: ela é a marca do chão, e subir
  // junto com a bola contaria que o gramado se moveu.
  const shadowClass = frame.ballEnding === 'none' ? undefined : 'nfl-plays__fade-out'
  const ballStyle = carried
    ? {
      ...ballTiming,
      '--carry-from-x': `${scene.carry.fromX}px`,
      '--carry-from-y': `${scene.carry.fromY}px`,
      // A bola solta é maior que a do selo: a passagem encolhe o conjunto até o tamanho
      // final, então ela parte exatamente do tamanho em que estava voando.
      '--carry-from-scale': BALL_SIZE / CARRY_BALL_SIZE,
    } as React.CSSProperties
    : ballTiming

  /**
   * Em que camada a bola entra. Carregada, ela fecha a pilha do retrato, por cima do
   * jogador. Solta, fica ATRÁS dele, sobre o gramado — com uma exceção: o passe que vai
   * direto para a mão termina o voo EM CIMA do retrato, e deixá-lo atrás faria a bola sumir
   * por trás da foto no último instante e reaparecer no selo. Aí ela sobe por cima desde o
   * início do voo, onde ainda está longe do retrato e a camada não faz diferença.
   */
  const ballOnTop = carried || scene.catchesInHand

  /**
   * A bola vira duas coisas diferentes conforme o momento: solta, é só a bola; carregada, é
   * um selo com o mesmo fundo e o mesmo aro do retrato, que é o que faz os dois lerem como
   * uma peça só. Trocar de forma remonta o elemento, e é justamente no instante da recepção
   * que a passagem deve começar.
   */
  const ball = frame.showsBall && (
    carried
      ? (
        <g className="nfl-plays__ball-carry" style={ballStyle}>
          {/* O aro entra junto com a bola: antes da recepção não existe selo nenhum, só a
              bola no ar. */}
          <circle
            className="nfl-plays__ball-carry-ring"
            cx={frame.ball.x}
            cy={frame.ball.y}
            r={CARRY_BADGE_RADIUS}
            fill={PORTRAIT_FILL}
            stroke={TRAIL_COLOR}
            strokeWidth={CARRY_BADGE_BORDER}
          />
          <image
            href={bolaNFL}
            x={frame.ball.x - CARRY_BALL_SIZE / 2}
            y={frame.ball.y - CARRY_BALL_SIZE / 2}
            width={CARRY_BALL_SIZE}
            height={CARRY_BALL_SIZE}
          />
        </g>
      )
      : (
        <image
          href={bolaNFL}
          x={frame.ball.x - BALL_SIZE / 2}
          y={frame.ball.y - BALL_SIZE / 2}
          width={BALL_SIZE}
          height={BALL_SIZE}
          className={shadowClass}
          style={ballTiming}
        />
      )
  )

  // Saída do palco inteiro, quando o próximo lance vem em seguida. A classe substitui a
  // animação de entrada (já terminada), então as duas não brigam pelo mesmo `animation`.
  const exitStyle = leaving
    ? {
      animationDelay: ms(frame.flipsToGain ? REPLAY_TIMING.stageExitDelayGain : REPLAY_TIMING.stageExitDelay),
      animationDuration: ms(REPLAY_TIMING.stageExitDuration),
    }
    : undefined

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
          <circle cx={frame.focusX} cy={PORTRAIT_CENTER_Y} r={PORTRAIT_RADIUS - 2} />
        </clipPath>
        <linearGradient id={casingId} gradientUnits="userSpaceOnUse" x1={scene.origin.x} y1={scene.depthY} x2={scene.endX} y2={scene.depthY}>
          <stop offset="0" stopColor="#000000" stopOpacity="0.2" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id={flowId} gradientUnits="userSpaceOnUse" x1={scene.origin.x} y1={scene.depthY} x2={scene.endX} y2={scene.depthY}>
          <stop offset="0" stopColor={pathColor} stopOpacity="0.28" />
          <stop offset="1" stopColor={pathColor} stopOpacity={scene.flowEndOpacity} />
        </linearGradient>
      </defs>

      <line
        x1={scene.scrimmage.x1}
        y1={scene.scrimmage.y1}
        x2={scene.scrimmage.x2}
        y2={scene.scrimmage.y2}
        stroke={SCRIMMAGE_COLOR}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.9}
      />
      {scene.firstDown && (
        <line
          x1={scene.firstDown.x1}
          y1={scene.firstDown.y1}
          x2={scene.firstDown.x2}
          y2={scene.firstDown.y2}
          stroke={FIRST_DOWN_COLOR}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.9}
        />
      )}

      {frame.showsPath && (
        <g className="nfl-plays__stage-path">
          {scene.airPath && <FlowPath d={scene.airPath} casingId={casingId} flowId={flowId} />}
          {scene.runPath && frame.showsRunFlow && <FlowPath d={scene.runPath} casingId={casingId} flowId={flowId} />}
        </g>
      )}

      {frame.showsBall && (
        <ellipse
          cx={frame.shadow.x}
          cy={scene.depthY + 0.5}
          rx={frame.shadow.rx}
          ry={1.5}
          fill="#000"
          opacity={frame.shadow.opacity}
          className={shadowClass}
          style={ballTiming}
        />
      )}

      {frame.trail.map((segment, index) => (
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
      <ellipse cx={scene.origin.x} cy={scene.depthY} rx={4} ry={2} fill={pathColor} opacity={0.9} />
      {frame.showsArrival && (
        scene.arrivalMark === 'dot'
          ? <ellipse cx={scene.arrivalX} cy={scene.depthY} rx={4} ry={2} fill={pathColor} opacity={0.9} />
          : (
            // X no ponto onde o passe caiu, como na referência.
            <g className="nfl-plays__stage-miss" stroke={INCOMPLETE_COLOR} strokeWidth={2.4} strokeLinecap="round">
              <line
                x1={scene.landing.x - INCOMPLETE_MARK}
                y1={scene.depthY - INCOMPLETE_MARK / 2}
                x2={scene.landing.x + INCOMPLETE_MARK}
                y2={scene.depthY + INCOMPLETE_MARK / 2}
              />
              <line
                x1={scene.landing.x - INCOMPLETE_MARK}
                y1={scene.depthY + INCOMPLETE_MARK / 2}
                x2={scene.landing.x + INCOMPLETE_MARK}
                y2={scene.depthY - INCOMPLETE_MARK / 2}
              />
            </g>
          )
      )}

      {/* O pulso nasce ONDE A BOLA CHEGOU, e não no gramado: num chute ao gol a bola para
          entre os postes, no alto, e um anel na grama marcaria um ponto em que ela nunca
          encostou. */}
      {frame.pulse && (
        <circle
          cx={scene.landing.x}
          cy={scene.landing.y}
          r={frame.pulse.radius}
          fill="none"
          stroke={pathColor}
          strokeWidth={2}
          opacity={frame.pulse.opacity}
        />
      )}

      {/* Num passe que cai, a bola some ao chegar e o X fica no lugar dela: as duas coisas
          empilhadas no mesmo ponto só sujariam a leitura. */}
      {!ballOnTop && ball}

      <line x1={frame.focusX} y1={STEM_TOP_Y} x2={frame.focusX} y2={scene.depthY} stroke="#fbfbfb" strokeWidth={1} opacity={0.8} />
      <g className={frame.flipsToGain ? 'nfl-plays__badge-front' : undefined} style={frame.flipsToGain ? flipStyle : undefined}>
        <circle cx={frame.focusX} cy={PORTRAIT_CENTER_Y} r={PORTRAIT_RADIUS} fill={PORTRAIT_FILL} stroke={TRAIL_COLOR} strokeWidth={1.5} />
        <image
          href={photo}
          x={frame.focusX - (PORTRAIT_RADIUS - 2)}
          y={PORTRAIT_CENTER_Y - (PORTRAIT_RADIUS - 2)}
          width={(PORTRAIT_RADIUS - 2) * 2}
          height={(PORTRAIT_RADIUS - 2) * 2}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
        />
      </g>
      {frame.flipsToGain && (
        <g className="nfl-plays__badge-back" style={flipStyle}>
          <circle cx={frame.focusX} cy={PORTRAIT_CENTER_Y} r={PORTRAIT_RADIUS} fill={PORTRAIT_FILL} stroke={TRAIL_COLOR} strokeWidth={1.5} />
          <text x={frame.focusX} y={PORTRAIT_CENTER_Y + 2} textAnchor="middle" className="nfl-plays__badge-gain">
            {getGainValue(play)}
          </text>
          <text x={frame.focusX} y={PORTRAIT_CENTER_Y + 11} textAnchor="middle" className="nfl-plays__badge-unit">
            {getYardAbbr()}
          </text>
        </g>
      )}
      {/* Anel que abre no instante em que a face vira — fora do grupo que gira, senão ele
          sairia achatado junto com a placa. */}
      {frame.flipsToGain && (
        <circle
          className="nfl-plays__badge-ring"
          style={flipStyle}
          cx={frame.focusX}
          cy={PORTRAIT_CENTER_Y}
          r={PORTRAIT_RADIUS}
          fill="none"
          stroke="var(--ds-current-score, #bb78ff)"
          strokeWidth={2}
        />
      )}
      {/* Por cima da foto, da placa que gira e do anel: é o jogador com a bola na mão, e é
          também para onde o passe vai enquanto ainda voa. */}
      {ballOnTop && ball}
      {frame.focusName && (
        <text
          x={frame.focusX}
          y={NAME_BASELINE_Y}
          textAnchor="middle"
          className="nfl-plays__stage-name"
        >
          {shortName(frame.focusName)}
        </text>
      )}
    </svg>
  )
}
