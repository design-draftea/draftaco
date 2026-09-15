import { currentBrand } from '../../../shared/brand/routing'
import { getDownAndDistanceLabel } from '../../../shared/utils/nflMarkets'
import type nflLiveGame from '../../../data/nflLiveGame.json'

// Textos do replay resolvidos por marca em código, e não pelo catálogo: os números no
// meio ("Passe de 12 jardas") quebram a string em vários filhos React e o catálogo só
// casa nós de texto inteiros. Mesmo caminho já usado no rótulo de descida.

export type NflPlay = typeof nflLiveGame['plays'][number]

const isDraftea = () => currentBrand() === 'draftea'

/** Sobrenome legível a partir do formato do nflverse ("P.Mahomes" -> "Mahomes"). */
export const shortName = (name: string | null | undefined) => {
  if (!name) return ''
  const parts = name.split('.')

  return (parts.length > 1 ? parts.slice(1).join('.') : name).trim()
}

/**
 * Passe com voo: completo OU incompleto. Nos dois a bola percorre o ar até o alvo — o que
 * muda é o desfecho, e `air_yards` traz a profundidade pretendida mesmo quando o passe
 * cai. Deixar o incompleto parado escondia justamente o lance.
 *
 * Corrida, chute e lance anulado continuam em estado informativo: reaproveitar o voo do
 * passe neles mostraria algo que não aconteceu.
 */
const KICK_TYPES = new Set(['kickoff', 'punt', 'field_goal', 'extra_point'])

export const isKick = (play: NflPlay) => KICK_TYPES.has(play.type) && !play.noPlay && !!play.kickDistance

export const hasBallFlight = (play: NflPlay) => (
  (play.type === 'pass' && !play.noPlay && play.airYards !== null) || isKick(play)
)

/**
 * Corrida: a bola não voa, mas anda. Não entra em `hasBallFlight` justamente porque não há
 * arco — reaproveitar o voo do passe aqui mostraria algo que não aconteceu. O que ela tem é
 * o trecho rasteiro, o mesmo que já existia para o avanço depois da recepção.
 */
export const isRun = (play: NflPlay) => play.type === 'run' && !play.noPlay

/**
 * Jogada anulada que REALMENTE aconteceu em campo e dá para desenhar.
 *
 * Nem toda anulada teve jogada: falta antes do snap para o lance antes de ele existir, e ali
 * mostrar algo seria invenção. O fixture já separa isso (`nullified` vem `null`).
 *
 * Passe incompleto anulado fica de fora mesmo tendo acontecido: o texto diz "short right"
 * mas não diz quantas jardas, e arbitrar uma distância seria inventar o lance.
 */
export const hasNullifiedPlay = (play: NflPlay) => !!(play.noPlay && play.nullified?.complete)

/**
 * Nome da falta por marca. O que não estiver aqui cai no termo original em inglês — é como
 * a transmissão fala, e é melhor do que uma tradução inventada na hora.
 */
const PENALTIES: Record<string, [string, string]> = {
  'False Start': ['Falso início', 'Salida en falso'],
  'Illegal Formation': ['Formação ilegal', 'Formación ilegal'],
  'Illegal Block Above the Waist': ['Bloqueio ilegal', 'Bloqueo ilegal'],
  'Illegal Use of Hands': ['Uso ilegal das mãos', 'Uso ilegal de las manos'],
  'Illegal Shift': ['Movimentação ilegal', 'Movimiento ilegal'],
  'Defensive Holding': ['Segurar na defesa', 'Sujeción defensiva'],
  'Offensive Holding': ['Segurar no ataque', 'Sujeción ofensiva'],
  'Roughing the Passer': ['Falta sobre o passador', 'Rudeza contra el pasador'],
  'Delay of Game': ['Atraso de jogo', 'Demora de juego'],
  'Neutral Zone Infraction': ['Invasão da zona neutra', 'Invasión de zona neutral'],
  'Defensive Pass Interference': ['Interferência de passe', 'Interferencia de pase'],
  'Offensive Pass Interference': ['Interferência de passe no ataque', 'Interferencia de pase ofensiva'],
}

export const getPenaltyName = (tipo: string | null | undefined) => {
  if (!tipo) return null
  const par = PENALTIES[tipo]

  return par ? (isDraftea() ? par[1] : par[0]) : tipo
}

/** Tem alguma coisa para animar: voo, corrida, ou os dois. */
export const isAnimatable = (play: NflPlay) => hasBallFlight(play) || isRun(play) || hasNullifiedPlay(play)

/**
 * Desfecho do lance, do ponto de vista de QUEM DESENHA.
 *
 * Existe porque antes havia um booleano `complete` respondendo quatro perguntas diferentes
 * ao mesmo tempo — em passe era "foi recebido", em corrida era sempre verdadeiro, em
 * anulada era sempre verdadeiro e em chute era "não foi touchback". Ele decidia sozinho cor
 * do caminho, marcador de chegada, pulso de recepção, opacidade do gradiente e posição
 * final, e cada tipo novo de lance pendurava mais um `||` nele.
 *
 * Aqui o desfecho é derivado UMA vez, e cada consumidor pergunta o que de fato quer saber,
 * por tabela exaustiva (o TypeScript cobra a variante que faltar). Um tipo novo — sack,
 * interceptação, fumble — entra como variante e as tabelas apontam sozinhas o que falta
 * decidir.
 *
 * - `gain`: o lance valeu e a bola chegou. Passe completo com avanço, corrida, chute com
 *   posse no fim.
 * - `noGain`: aconteceu e a bola chegou, mas não andou nada. Corrida parada na linha.
 * - `incomplete`: a bola não chegou a ninguém. Passe que cai, e também a anulada em que o
 *   lance não chegou a existir (falso início) — nos dois não há posse no fim.
 * - `voided`: aconteceu em campo e a penalidade apagou. Não é erro do lance, e por isso
 *   não divide cor com `incomplete`.
 * - `touchback`: o chute morreu na end zone e não houve retorno para contar.
 */
export type PlayOutcome = 'gain' | 'noGain' | 'incomplete' | 'voided' | 'touchback'

export function getPlayOutcome(play: NflPlay): PlayOutcome {
  // A ordem importa: uma anulada é antes de tudo uma anulada, e um chute nunca é lido
  // pelas colunas de passe (`complete` vale 0 em qualquer chute).
  if (hasNullifiedPlay(play)) return 'voided'
  if (isKick(play)) return play.touchback ? 'touchback' : 'gain'
  if (play.noPlay) return 'incomplete'
  if (play.type === 'pass' && !play.complete) return 'incomplete'

  return play.yards === 0 ? 'noGain' : 'gain'
}

export function getPlayTitle(play: NflPlay): string {
  if (play.noPlay) {
    const anulada = play.nullified
    // Dizer o que foi anulado vale mais que "jogada anulada": um touchdown apagado por
    // penalidade é o lance mais dramático da campanha, e virava uma linha genérica.
    if (anulada?.touchdown) return isDraftea() ? 'Touchdown anulado' : 'Touchdown anulado'
    if (anulada?.kind === 'run') {
      const verbo = isDraftea() ? 'Carrera anulada' : 'Corrida anulada'

      return `${verbo} de ${anulada.yards} ${isDraftea() ? 'yardas' : 'jardas'}`
    }
    if (anulada?.kind === 'pass') {
      if (!anulada.complete) return isDraftea() ? 'Pase incompleto anulado' : 'Passe incompleto anulado'
      const verbo = isDraftea() ? 'Pase anulado' : 'Passe anulado'

      return `${verbo} de ${anulada.yards} ${isDraftea() ? 'yardas' : 'jardas'}`
    }

    return isDraftea() ? 'Jugada anulada' : 'Jogada anulada'
  }

  const yards = play.yards
  const yardWord = isDraftea() ? 'yardas' : 'jardas'

  if (play.type === 'pass') {
    if (!play.complete) return isDraftea() ? 'Pase incompleto' : 'Passe incompleto'
    const verb = isDraftea() ? 'Pase' : 'Passe'

    return `${verb} de ${yards} ${yardWord}`
  }

  if (play.type === 'run') {
    const verb = isDraftea() ? 'Carrera' : 'Corrida'
    if (yards === 0) return isDraftea() ? 'Sin avance' : 'Sem avanço'

    return `${verb} de ${yards} ${yardWord}`
  }

  const labels: Record<string, [string, string]> = {
    punt: ['Punt', 'Punt'],
    kickoff: ['Kickoff', 'Kickoff'],
    field_goal: ['Field goal', 'Field goal'],
    extra_point: ['Ponto extra', 'Punto extra'],
    qb_kneel: ['Joelho do QB', 'Rodilla del QB'],
    qb_spike: ['Bola ao chão', 'Balón al suelo'],
  }
  const label = labels[play.type]
  if (!label) return play.type

  const name = isDraftea() ? label[1] : label[0]
  // O que distingue um chute de outro é a distância, então ela entra no título.
  if (isKick(play)) return `${name} de ${play.kickDistance} ${yardWord}`

  return name
}

/**
 * A placa gira e mostra as jardas? Só onde houve avanço para contar: passe completo e
 * corrida. Passe que cai não tem número, e em chute "quanto andou" é ambíguo (a distância
 * do chute ou a do retorno?).
 *
 * Mora aqui, e não no palco, porque o encadeamento de campanha precisa da MESMA resposta: o
 * respiro entre lances tem de ser maior quando há um número para ler. Duas cópias da regra
 * sairiam de sincronia na primeira vez que alguém mexesse numa delas.
 */
export const showsGainBadge = (play: NflPlay) => (
  // Anulada não entra: não houve jardas para creditar, é justamente o ponto dela.
  isAnimatable(play) && !isKick(play) && !play.noPlay && (isRun(play) || play.complete)
)

/**
 * Número curto para a placa que gira no fim do lance. Só o valor com sinal: o contexto
 * ("quem" está no nome acima, "do quê" está na linha de resultado) já está na tela.
 */
export const getGainValue = (play: NflPlay) => (play.yards > 0 ? `+${play.yards}` : `${play.yards}`)

/** Abreviação da unidade na placa, onde não cabe a palavra inteira. */
export const getYardAbbr = () => (isDraftea() ? 'YD' : 'JD')

/** Como o chute terminou sem retorno — explica um retorno de 0 jardas. */
const KICK_OUTCOMES: Record<string, [string, string]> = {
  downed: ['Bola dominada', 'Balón dominado'],
  fair_catch: ['Posse justa', 'Recepción libre'],
  out_of_bounds: ['Fora de campo', 'Fuera del campo'],
  touchback: ['Touchback', 'Touchback'],
}

const getKickOutcome = (outcome: string | null | undefined) => {
  const par = outcome ? KICK_OUTCOMES[outcome] : null

  return par ? (isDraftea() ? par[1] : par[0]) : null
}

/** Linha de situação: "Mahomes → Rice · 2ª para 7". */
export function getPlaySituation(play: NflPlay): string {
  const parts: string[] = []

  // Chute tem outra dupla: quem chutou e quem retornou.
  if (isKick(play)) {
    const kicker = shortName(play.kicker)
    const returner = shortName(play.returner)
    if (kicker && returner) parts.push(`${kicker} → ${returner}`)
    else if (kicker) parts.push(kicker)
    if (play.returnYards > 0) {
      parts.push(`Retorno de ${play.returnYards} ${isDraftea() ? 'yardas' : 'jardas'}`)
    } else {
      // Sem retorno, dizer POR QUE: senão o lance termina sem explicar o que houve.
      const desfecho = getKickOutcome(play.kickOutcome)
      if (desfecho) parts.push(desfecho)
    }

    return parts.join(' · ')
  }

  // Numa anulada os nomes vêm do texto do lance, não das colunas (que o nflverse deixa
  // vazias porque a jogada não conta na súmula).
  const anulada = play.noPlay ? play.nullified : null
  const passer = shortName(anulada?.passer ?? play.passer)
  const receiver = shortName(anulada?.receiver ?? play.receiver)
  const rusher = shortName(anulada?.rusher ?? play.rusher)

  if (passer && receiver) parts.push(`${passer} → ${receiver}`)
  else if (passer) parts.push(passer)
  else if (rusher) parts.push(rusher)

  // "3ª & 8" no header ao vivo vira "3ª para 8" aqui, como no estudo. "para" serve às
  // duas marcas; o que muda é o ordinal, que já vem resolvido do util compartilhado.
  if (play.down && play.distance !== null) {
    parts.push(getDownAndDistanceLabel(play.down, play.distance).replace(' & ', ' para '))
  }

  return parts.join(' · ')
}

/** Resultado, mostrado abaixo do campo quando o lance termina. */
export function getPlayResult(play: NflPlay, opponent?: string): { label: string; gain: string | null } {
  const yardWord = isDraftea() ? 'yardas' : 'jardas'

  if (play.noPlay) {
    // O motivo é a informação que faltava: "anulada" sem dizer por quê deixa a pessoa sem
    // saber o que aconteceu no jogo.
    return { label: getPlayTitle(play), gain: getPenaltyName(play.penaltyType) }
  }

  if (play.touchdown) return { label: 'Touchdown', gain: `+${play.yards} ${yardWord}` }

  if (play.type === 'pass' && !play.complete) {
    return { label: isDraftea() ? 'Pase incompleto' : 'Passe incompleto', gain: null }
  }

  if (isKick(play)) {
    // Punt é a jogada de desistir da posse: o time chuta para longe e ENTREGA a bola ao
    // adversário. Sem dizer isso, "Punt de 28 jardas" não significa nada para quem não
    // acompanha o esporte — e a distância sozinha parece um número solto.
    if (play.type === 'punt' && opponent) {
      return { label: getPlayTitle(play), gain: `${isDraftea() ? 'Posesión para' : 'Posse para'} ${opponent}` }
    }
    if (play.touchback) return { label: getPlayTitle(play), gain: 'Touchback' }
    if (play.fieldGoalResult === 'made') return { label: getPlayTitle(play), gain: isDraftea() ? 'bueno' : 'bom' }
    if (play.fieldGoalResult && play.fieldGoalResult !== 'made') {
      return { label: getPlayTitle(play), gain: isDraftea() ? 'fallado' : 'errado' }
    }
    if (play.returnYards > 0) {
      return { label: getPlayTitle(play), gain: `+${play.returnYards} ${yardWord}` }
    }

    return { label: getPlayTitle(play), gain: null }
  }

  // Fora do passe e do chute, o próprio título já descreve o lance ("Corrida de 28
  // jardas"). Trocá-lo por um "Jogada encerrada" genérico só tirava informação.
  if (play.type !== 'pass') return { label: getPlayTitle(play), gain: null }

  const label = isDraftea() ? 'Pase completo' : 'Passe completo'

  if (play.yards === 0) return { label, gain: isDraftea() ? 'sin avance' : 'sem avanço' }

  const sign = play.yards > 0 ? '+' : ''

  return { label, gain: `${sign}${play.yards} ${yardWord}` }
}

/**
 * Título da campanha na lista. Campanha que terminou em touchdown mostra quem anotou, como
 * na referência ("Touchdown · D'Andre Swift"); as demais ficam com o nome do time, e a
 * campanha em andamento também — o desfecho dela ainda não aconteceu no jogo.
 */
export function getDriveTitle(
  drive: { result: string | null; scorer: string | null },
  teamNickname: string,
): string {
  if (drive.result === 'Touchdown' && drive.scorer) return `Touchdown · ${shortName(drive.scorer)}`
  if (drive.result === 'Field goal' && drive.scorer) return `Field goal · ${shortName(drive.scorer)}`

  return teamNickname
}

/** Nova situação depois do lance, quando os dados permitem. */
export function getNextSituation(play: NflPlay): string | null {
  if (play.noPlay || play.touchdown) return null
  if (!play.firstDown) return null

  return isDraftea() ? '1er down' : '1ª descida'
}
