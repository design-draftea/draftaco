import { useEffect, useRef } from 'react'
import { ArrowCounterClockwiseIcon, PauseIcon } from '@phosphor-icons/react'
import iconPlayGde from '../../../assets/iconsDraftaco/iconPlayGde.svg'
import { NflFieldStage } from './NflFieldStage'
import {
  getNextSituation,
  getPlayResult,
  getPlaySituation,
  getPlayTitle,
  hasBallFlight,
  isAnimatable,
  isKick,
  isRun,
  type NflPlay,
} from './playNarrative'
import { REPLAY_TIMING, timeScaler, usePlayReplay, type ReplaySegments, type ReplaySpeed } from './usePlayReplay'

/**
 * "Touchdown" com as letras subindo e descendo em onda. Fica na linha de resultado, abaixo
 * do campo, e não como selo sobre o gramado — o estudo aprovado é explícito nos dois
 * pontos ("não colocar um selo grande sobre o gramado", "sem transformar o campo em uma
 * celebração cheia de efeitos").
 *
 * A onda corre UMA vez e assenta. Em laço, ela competiria para sempre com a lista de
 * campanhas logo abaixo; passando uma vez, marca o momento e sai do caminho.
 */
function TouchdownLabel({ label }: { label: string }) {
  return (
    <span className="nfl-plays__touchdown" aria-label={label}>
      {[...label].map((letter, index) => (
        <span
          key={index}
          className="nfl-plays__touchdown-letter"
          style={{ animationDelay: `${index * 45}ms` }}
          aria-hidden="true"
        >
          {letter}
        </span>
      ))}
    </span>
  )
}

/**
 * Quanto a bola percorre no ar e quanto no chão, por tipo de lance. É daqui que a máquina
 * de estados tira a duração de cada fase.
 *
 * `hasFlight` não é `airYards > 0`: um passe na linha tem zero jarda aérea e mesmo assim
 * voa. Quem não voa é a corrida.
 */
function segmentsFor(play: NflPlay): ReplaySegments {
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
  // arco cobre o ganho inteiro; numa corrida é tudo chão, como em qualquer corrida.
  if (play.noPlay && play.nullified?.complete) {
    const anulada = play.nullified

    return anulada.kind === 'run'
      ? { airYards: 0, runYards: Math.abs(anulada.yards), hasFlight: false }
      : { airYards: anulada.yards, runYards: 0, hasFlight: true }
  }

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

/**
 * Fogos de artifício do touchdown.
 *
 * A faísca é montada em TRÊS camadas aninhadas porque cada uma resolve um eixo do
 * movimento, e uma só não daria conta:
 *
 *   span  -> gravidade, em `ease-in` (começa parada e acelera para baixo)
 *   i     -> giro fixo do ângulo da faísca
 *   ::before -> disparo para fora, em `ease-out` (sai rápido e desacelera)
 *
 * Somando um `ease-out` para fora com um `ease-in` para baixo sai uma PARÁBOLA de verdade,
 * que é o que um estilhaço faz. Com uma camada só, a faísca andaria em linha reta — era o
 * problema da versão anterior. A gravidade precisa ficar FORA do giro, senão ela apontaria
 * para a direção da faísca em vez de para baixo.
 *
 * O rastro vem de graça do giro: a faísca é uma cápsula deitada com `transform-origin` na
 * ponta de trás, então ela aponta para fora sozinha e a cauda fica virada para o centro da
 * explosão. O degradê nasce transparente atrás e termina branco na frente — cabeça quente,
 * cauda esfriando, sem custar uma animação de cor.
 */
const FW_MAIN = 26
const FW_SECOND = 14

const FIREWORK_SPARKS = Array.from({ length: FW_MAIN + FW_SECOND }, (_, index) => {
  // Duas camadas de estilhaço, a segunda saindo um pouco depois: um estouro só, de raio
  // uniforme, vira um anel. Duas com velocidades diferentes dão volume.
  const second = index >= FW_MAIN
  const n = second ? index - FW_MAIN : index
  const count = second ? FW_SECOND : FW_MAIN
  // A defasagem a cada três impede que o passo constante desenhe uma estrela regular.
  const angle = (n * 360) / count + (n % 3) * 6 + (second ? 13 : 0)
  const rad = (angle * Math.PI) / 180
  // Abre mais para os lados do que para cima e para baixo. Não é enfeite: o campo é largo e
  // baixo, e um estouro circular invadiria o gramado e estouraria o topo do frame. Fazendo
  // pela DISTÂNCIA, e não achatando o container, as faíscas não saem deformadas.
  const spread = 1.55 - 0.85 * Math.abs(Math.sin(rad))
  const speed = (second ? 0.66 : 0.82) + ((n * 7) % 5) * 0.085

  return {
    angle,
    dist: spread * speed * 10.5,
    gravity: (second ? 1.8 : 2.4) + ((n * 3) % 4) * 0.3,
    len: 1.7 + ((n * 5) % 4) * 0.5,
    thick: 0.5 + ((n * 3) % 3) * 0.14,
    delay: (second ? 95 : 0) + ((n * 13) % 5) * 14,
    duration: (second ? 820 : 720) + ((n * 11) % 4) * 90,
    // Só uma parte pisca: se todas piscassem, viraria ruído em vez de brasa.
    twinkle: n % 4 === 1,
    color: ['var(--ds-current-score, #bb78ff)', '#d8bcff', 'var(--ds-fill-primary, #fbfbfb)'][n % 3],
  }
})

function TouchdownParticles({ speed }: { speed: ReplaySpeed }) {
  const ms = timeScaler(speed)

  return (
    <div
      className="nfl-plays__fw"
      aria-hidden="true"
      style={{ '--fw-flash': ms(260) } as React.CSSProperties}
    >
      {FIREWORK_SPARKS.map((spark, index) => (
        <span
          key={index}
          style={{
            '--fw-a': `${spark.angle.toFixed(1)}deg`,
            '--fw-d': `${spark.dist.toFixed(2)}cqw`,
            '--fw-g': `${spark.gravity.toFixed(2)}cqw`,
            '--fw-len': `${spark.len.toFixed(2)}cqw`,
            '--fw-th': `${spark.thick.toFixed(2)}cqw`,
            '--fw-c': spark.color,
            '--fw-delay': ms(spark.delay),
            '--fw-dur': ms(spark.duration),
            '--fw-tw': spark.twinkle ? 'nfl-plays-fw-twinkle' : 'none',
          } as React.CSSProperties}
        >
          <i />
        </span>
      ))}
    </div>
  )
}

/**
 * "TOUCHDOWN" sobre o campo, na faixa escura acima do gramado — nunca por cima da grama.
 * Num touchdown a bola está numa end zone, então o retrato vai para o extremo e o centro do
 * topo fica livre.
 *
 * É HTML sobreposto ao campo, e não `<text>` no SVG, porque cada letra precisa ESCALAR por
 * conta própria: `<tspan>` não aceita `transform` de forma confiável entre navegadores (é
 * SVG2, e o suporte varia). Com `<span>` inline-block a escala sai de graça e não empurra
 * as vizinhas. O tamanho acompanha o campo por `cqw`, com um px de reserva para quem não
 * tiver container queries.
 *
 * Duas animações na mesma letra, e a ordem importa: a entrada usa `both` para segurar o
 * estado final, e a onda usa `forwards` — com `both` ela aplicaria o próprio quadro inicial
 * durante a espera e atropelaria a entrada, já que as duas mexem em `transform`.
 */
function FieldTouchdown({ speed }: { speed: ReplaySpeed }) {
  const ms = timeScaler(speed)
  const style = {
    '--td-in': ms(REPLAY_TIMING.touchdownLetterIn),
    '--td-wave': ms(REPLAY_TIMING.touchdownWave),
  } as React.CSSProperties

  return (
    <div className="nfl-plays__field-touchdown" style={style} aria-hidden="true">
      {[...'TOUCHDOWN'].map((letter, index) => (
        <span
          key={index}
          style={{
            animationDelay: [
              ms(index * REPLAY_TIMING.touchdownLetterStep),
              ms(REPLAY_TIMING.touchdownWaveStart + index * REPLAY_TIMING.touchdownWaveStep),
            ].join(', '),
          }}
        >
          {letter}
        </span>
      ))}
    </div>
  )
}

/**
 * Seletor de velocidade escondido a pedido da pessoa responsável pelo protótipo.
 *
 * O ESTADO de velocidade continua valendo e fica fixo em 1x — é ele que escala a duração de
 * todas as animações (voo, fadeOut da bola, giro da placa, saída do palco, respiro entre
 * lances). Por isso ele não foi removido: só o controle saiu da tela.
 *
 * Para trazer de volta, trocar para `true`. Nada mais foi apagado — nem o botão, nem o
 * estilo, nem a lista de velocidades.
 */
const SHOW_SPEED_CONTROL: boolean = false

// Palco de um lance: campo animado + card de contexto + botão de reproduzir.
//
// Quem usa monta este componente com `key` por lance. Assim a troca de lance é uma
// remontagem: o laço de animação morre na limpeza do efeito e o estado nasce zerado, sem
// resíduo do lance anterior. A seleção, a velocidade e a lista ficam fora, no pai, porque
// precisam sobreviver à troca.

interface NflPlayReplayPanelProps {
  play: NflPlay
  /** Rótulo "2º quarter · Chiefs". */
  contextLabel: string
  /** Rótulo "2 de 13". */
  counterLabel: string
  /** Time adversário, para o punt poder dizer a quem a posse passou. */
  opponent: string
  speed: ReplaySpeed
  onSpeedChange: () => void
  formatSpeed: (speed: ReplaySpeed) => string
  onEnded: () => void
  /** Espera antes de começar; vale só na primeira abertura do sheet. */
  startDelay: number
  /** Verdadeiro durante a reprodução de uma campanha inteira. */
  isSequence: boolean
  /** Último lance da campanha: ali o botão reinicia a campanha, não o lance. */
  isLastPlay: boolean
  onReplaySequence: () => void
  /** Interrompe o encadeamento da campanha, para o botão de pausa valer no respiro. */
  onStopSequence: () => void
  /** Campo em sangria: a arte e os overlays de marca vêm do pai. */
  children: React.ReactNode
}

export function NflPlayReplayPanel({
  play,
  contextLabel,
  counterLabel,
  opponent,
  speed,
  onSpeedChange,
  formatSpeed,
  onEnded,
  startDelay,
  isSequence,
  isLastPlay,
  onReplaySequence,
  onStopSequence,
  children,
}: NflPlayReplayPanelProps) {
  const animatable = isAnimatable(play)
  // O aviso de fim vive numa ref para o efeito abaixo não reiniciar a cada render do pai.
  const onEndedRef = useRef(onEnded)
  useEffect(() => {
    onEndedRef.current = onEnded
  }, [onEnded])

  const segments = segmentsFor(play)

  const replay = usePlayReplay({ segments, speed, autoPlay: animatable, startDelay, onEnded })

  // Um lance sem animação (kickoff, incompleto, jogada anulada) não tem voo para terminar,
  // então sozinho ele travaria a reprodução de uma campanha logo no primeiro lance. Aqui
  // ele fica um tempo na tela, em estado informativo, e cede a vez. A limpeza cancela o
  // aviso se a pessoa trocar de lance antes da hora.
  useEffect(() => {
    if (animatable || !isSequence) return

    // Único `/ speed` que sobra em milissegundos crus: aqui é argumento de `setTimeout`,
    // não duração de CSS, então não passa pelo `timeScaler`.
    const timer = window.setTimeout(() => onEndedRef.current(), REPLAY_TIMING.staticHold / speed)

    return () => window.clearTimeout(timer)
  }, [animatable, isSequence, speed])

  // No fim do último lance não sobra nada para repetir dentro dele: o gesto natural ali é
  // rever a campanha desde o começo, e não assistir de novo ao mesmo lance.
  const ended = replay.isEnded && animatable
  const restartsSequence = ended && isLastPlay

  /**
   * Este lance acabou mas a campanha continua: estamos no respiro antes do próximo entrar.
   *
   * Sem distinguir isso, o botão virava "repetir" por 1 a 1,7 segundos A CADA troca de
   * lance, e o ícone de reset piscava a campanha inteira em vez de aparecer só no fim. Do
   * ponto de vista de quem assiste a reprodução ainda está correndo, então o botão segue
   * sendo o de pausar.
   */
  const holdingForNext = ended && isSequence && !isLastPlay

  const showsPause = replay.isPlaying || holdingForNext
  const showsReset = !showsPause && ended

  const buttonLabel = showsPause
    ? (holdingForNext ? 'Pausar campanha' : 'Pausar jogada')
    : (restartsSequence ? 'Repetir campanha' : (ended ? 'Repetir jogada' : 'Reproduzir jogada'))

  const result = getPlayResult(play, opponent)
  const showResult = replay.isEnded || !animatable
  // No fim do lance a linha de baixo mostra a nova situação, como no estudo:
  // "Maye → Henry · 2ª para 7" vira "Maye → Henry · 1ª descida".
  const nextSituation = showResult ? getNextSituation(play) : null
  const situation = getPlaySituation(play)
  const detail = nextSituation ? `${situation.split(' · ')[0]} · ${nextSituation}` : situation

  return (
    <>
      <div className="nfl-plays__field">
        {children}
        <NflFieldStage
          play={play}
          phase={replay.phase}
          progress={replay.progress}
          speed={speed}
          // Só sai apagando quando há um próximo lance para entrar. No último da campanha o
          // palco fica: ali a pessoa está olhando o desfecho, não esperando a troca.
          leaving={replay.isEnded && isSequence && !isLastPlay}
        />
        {play.touchdown && (replay.phase === 'run' || replay.phase === 'result') && (
          <>
            {/* Antes da palavra na ordem do DOM, para as faíscas passarem por trás dela. */}
            <TouchdownParticles speed={speed} />
            <FieldTouchdown speed={speed} />
          </>
        )}
      </div>

      <section className="nfl-plays__context" aria-label="Jogada em foco">
        <header className="nfl-plays__context-head">
          <p className="nfl-plays__context-title">{contextLabel}</p>
          <div className="nfl-plays__context-actions">
            <span className="nfl-plays__context-count">{counterLabel}</span>
            {SHOW_SPEED_CONTROL && (
              <button
                type="button"
                className="nfl-plays__speed"
                onClick={onSpeedChange}
                aria-label="Velocidade da reprodução"
              >
                {formatSpeed(speed)}
              </button>
            )}
          </div>
        </header>
        <div className="nfl-plays__play">
          <div className="nfl-plays__play-text">
            <p className="nfl-plays__play-title">
              {showResult && play.touchdown
                ? <TouchdownLabel label={result.label} />
                : (showResult ? result.label : getPlayTitle(play))}
              {showResult && result.gain && <span className="nfl-plays__play-gain"> · {result.gain}</span>}
            </p>
            <p className="nfl-plays__play-detail">{detail}</p>
          </div>
          <button
            type="button"
            className="nfl-plays__play-button"
            aria-label={buttonLabel}
            onClick={() => {
              if (replay.isPlaying) replay.pause()
              // No respiro entre lances não há o que pausar aqui dentro: quem segura o
              // próximo é o encadeamento, no componente de cima.
              else if (holdingForNext) onStopSequence()
              else if (restartsSequence) onReplaySequence()
              else if (replay.isEnded) replay.restart()
              else replay.resume()
            }}
            disabled={!animatable}
          >
            {/* Três estados, três ícones: o botão precisa dizer o que vai acontecer. No
                fim do lance ele repete, e um triângulo de play ali dava a entender que
                havia mais alguma coisa para tocar. */}
            {showsPause && <PauseIcon size={20} weight="fill" color="#fbfbfb" />}
            {showsReset && <ArrowCounterClockwiseIcon size={20} weight="bold" color="#fbfbfb" />}
            {!showsPause && !showsReset && <img src={iconPlayGde} alt="" />}
          </button>
        </div>
      </section>
    </>
  )
}
