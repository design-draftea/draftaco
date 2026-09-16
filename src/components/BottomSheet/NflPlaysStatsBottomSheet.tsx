import { useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { ContentFilterChips } from '../ContentFilterChips'
import { MarketAccordion } from '../MarketAccordion'
import { ProductRail } from '../SportRail'
import { TeamLogo } from '../TeamLogo'
import type { ProductRailBaseItem, ProductRailSection } from '../../shared/types/home'
import { currentBrand } from '../../shared/brand/routing'
import { getTeamLogo } from '../../data/teamLogos'
import { getLocalPlayerImage } from '../../data/playerImages'
import playerAvatarNFL from '../../assets/playerAvatarNFL.svg'
import nflLiveGame from '../../data/nflLiveGame.json'
import { NflPlayReplayPanel } from '../../features/sports/NflPlayReplay/NflPlayReplayPanel'
import { REPLAY_SPEEDS, REPLAY_TIMING, type ReplaySpeed } from '../../features/sports/NflPlayReplay/usePlayReplay'
import { getDriveTitle, getPlayTitle, isAnimatable, showsGainBadge, type NflPlay } from '../../features/sports/NflPlayReplay/playNarrative'
import campinhoNFL from '../../assets/iconsDraftaco/campinhoNFL.png'
import campoDraftea from '../../assets/iconsDraftaco/campoDraftea.png'
import campoPitaco from '../../assets/iconsDraftaco/campoPitaco.png'
import endzoneChiefs from '../../assets/iconsDraftaco/Chiefs.svg'
import endzoneDolphins from '../../assets/iconsDraftaco/Dolphins.svg'
import iconPlayPeq from '../../assets/iconsDraftaco/iconPlayPeq.svg'
import './NflPlaysStatsBottomSheet.css'

// Dados reais do jogo, extraídos do play-by-play do nflverse e acumulados até a jogada
// em que o protótipo está "ao vivo". Ver scripts/build-nfl-live-fixture.mjs.
type NflLiveGame = typeof nflLiveGame
type TeamSide = 'home' | 'away'

interface StatColumn {
  key: string
  label: string
  // Alguns valores do Figma são compostos ("23/33"), então a célula recebe o jogador
  // inteiro em vez de um campo solto.
  value: (player: Record<string, number>) => string
}

interface StatCategory {
  key: keyof NflLiveGame['players']['KC']
  title: string
  columns: StatColumn[]
  startsOpen: boolean
}

const n = (player: Record<string, number>, key: string) => player[key] ?? 0

const statCategories: StatCategory[] = [
  {
    key: 'passing',
    title: 'Passes',
    startsOpen: true,
    columns: [
      { key: 'ct', label: 'C/T', value: (p) => `${n(p, 'completions')}/${n(p, 'attempts')}` },
      { key: 'yds', label: 'JDS', value: (p) => String(n(p, 'yards')) },
      { key: 'td', label: 'TD', value: (p) => String(n(p, 'tds')) },
      { key: 'int', label: 'INT', value: (p) => String(n(p, 'interceptions')) },
    ],
  },
  {
    key: 'rushing',
    title: 'Corridas',
    startsOpen: true,
    columns: [
      { key: 'att', label: 'TENT', value: (p) => String(n(p, 'carries')) },
      { key: 'yds', label: 'JDS', value: (p) => String(n(p, 'yards')) },
      { key: 'td', label: 'TD', value: (p) => String(n(p, 'tds')) },
    ],
  },
  {
    key: 'receiving',
    title: 'Recepções',
    startsOpen: true,
    columns: [
      { key: 'rec', label: 'REC', value: (p) => String(n(p, 'receptions')) },
      { key: 'yds', label: 'JDS', value: (p) => String(n(p, 'yards')) },
      { key: 'td', label: 'TD', value: (p) => String(n(p, 'tds')) },
    ],
  },
  {
    key: 'kicking',
    title: 'Chutes',
    startsOpen: true,
    columns: [
      { key: 'fg', label: 'FG', value: (p) => `${n(p, 'fgMade')}/${n(p, 'fgAtt')}` },
      { key: 'xp', label: 'XP', value: (p) => `${n(p, 'xpMade')}/${n(p, 'xpAtt')}` },
    ],
  },
  {
    key: 'defense',
    title: 'Defesa',
    startsOpen: false,
    columns: [
      { key: 'tck', label: 'TCK', value: (p) => String(n(p, 'tackles')) },
      { key: 'sck', label: 'SCK', value: (p) => String(n(p, 'sacks')) },
      { key: 'int', label: 'INT', value: (p) => String(n(p, 'interceptions')) },
    ],
  },
  {
    key: 'returns',
    title: 'Retornos',
    startsOpen: false,
    columns: [
      { key: 'ret', label: 'RET', value: (p) => String(n(p, 'returns')) },
      { key: 'yds', label: 'JDS', value: (p) => String(n(p, 'yards')) },
    ],
  },
  {
    key: 'punting',
    title: 'Punts',
    startsOpen: false,
    columns: [
      { key: 'punts', label: 'PUNT', value: (p) => String(n(p, 'punts')) },
      { key: 'yds', label: 'JDS', value: (p) => String(n(p, 'yards')) },
    ],
  },
]

// As abas usam o mesmo componente de chips dos mercados da tela do evento. Jogadas fica
// visível e desabilitada enquanto o Figma dessa aba não chega.
const viewChips = [
  { id: 'jogadas', label: 'JOGADAS' },
  { id: 'estatisticas', label: 'ESTATÍSTICAS' },
] as const

type ViewId = typeof viewChips[number]['id']

type NflTeams = Record<TeamSide, NflLiveGame['game']['home']>

// A arte base do campo não traz marca: o logo do meio-campo e os números das jardas vêm
// de um overlay por marca, no mesmo canvas de 1559x628, então empilha alinhado.
const getFieldOverlay = () => (currentBrand() === 'draftea' ? campoDraftea : campoPitaco)

type NflDrive = NflLiveGame['drives'][number]

// "4º quarter" no Pitaco, "4º cuarto" na Draftea. O número na frente quebra a string em
// vários filhos, então o catálogo não alcança a linha inteira.
const getQuarterLabel = (quarter: number) => (
  `${quarter}º ${currentBrand() === 'draftea' ? 'cuarto' : 'quarter'}`
)

// "6 jogadas · 78 yd · 3:12" no Pitaco, "6 jugadas · ..." na Draftea. Os números no meio
// quebram a string em vários filhos, então o catálogo não consegue casar a linha inteira
// e o texto é resolvido por marca aqui — mesma saída do rótulo de descida do evento.
const getDriveStatsLabel = (drive: NflDrive) => {
  const plays = currentBrand() === 'draftea' ? 'jugadas' : 'jogadas'

  return `${drive.plays} ${plays} · ${drive.yards} yd · ${drive.duration}`
}

// A lista lê do mais recente para o mais antigo, então a campanha em andamento — que é a
// destacada — fica no topo, como o primeiro item destacado do Figma. Uma campanha que
// atravessa o intervalo entra no quarter em que começou.
const groupDrivesByQuarter = (drives: readonly NflDrive[]) => {
  const quarters = new Map<number, NflDrive[]>()
  for (const drive of drives) {
    if (!quarters.has(drive.quarter)) quarters.set(drive.quarter, [])
    quarters.get(drive.quarter)!.unshift(drive)
  }

  return [...quarters.entries()]
    .sort(([a], [b]) => b - a)
    .map(([quarter, quarterDrives]) => ({ quarter, drives: quarterDrives }))
}

/** Lances de cada campanha em ordem cronológica — é a ordem em que o replay percorre. */
const groupPlaysByDrive = (plays: readonly NflPlay[]) => {
  const byDrive = new Map<string, NflPlay[]>()
  for (const play of plays) {
    if (!byDrive.has(play.driveId)) byDrive.set(play.driveId, [])
    byDrive.get(play.driveId)!.push(play)
  }

  return byDrive
}

/**
 * Respiro entre um lance e o seguinte ao reproduzir uma campanha inteira.
 *
 * Precisa comportar as duas saídas em sequência: a bola apaga (180 + 420 = 600ms) e então
 * o palco inteiro apaga (1020 + 380 = 1400ms). Trocar antes disso atropela a transição — era
 * o que acontecia com os 320ms originais e ainda com 780ms. Os ~100ms que sobram são o
 * campo limpo antes do próximo lance entrar, que por sua vez leva 480ms para aparecer.
 *
 * Quem manda no respiro de LEITURA é o `stageExitDelay`: até ele o lance está inteiro na
 * tela, e daqui em diante é campo vazio. Este número acompanha aquele.
 */
const SEQUENCE_PAUSE = 1500

/**
 * Respiro maior quando a placa gira mostrando as jardas. Sem isto o lance trocava com o
 * número ainda aparecendo, e a informação não chegava a ser lida.
 *
 * Contas: giro pronto em 700ms, brilho assenta perto de 870ms, o palco começa a sair em
 * 1680ms (`stageExitDelayGain`) e leva 380ms. Sobram ~90ms de campo limpo antes da troca,
 * o mesmo do caso sem placa.
 */
const SEQUENCE_PAUSE_GAIN = 2150

const nextSpeed = (speed: ReplaySpeed): ReplaySpeed => (
  REPLAY_SPEEDS[(REPLAY_SPEEDS.indexOf(speed) + 1) % REPLAY_SPEEDS.length]
)

const formatSpeed = (speed: ReplaySpeed) => `${String(speed).replace('.', ',')}×`

// Primeiro e último marcador encostam nas extremidades úteis do trilho (4px de raio),
// com espaçamento uniforme entre os demais — como no desenho aprovado.
const markerOffset = (index: number, total: number) => (
  total <= 1 ? '50%' : `calc(4px + (100% - 8px) * ${index} / ${total - 1})`
)

const timelineProgress = (index: number, total: number) => (
  total <= 1 ? '0px' : `calc((100% - 8px) * ${index} / ${total - 1})`
)

// Aba Jogadas (Figma 1909:7558). Tudo aqui é visual: os botões de reproduzir e a linha do
// tempo ainda não têm interação, e os dados vêm de `nflPlaysReplay.ts`, que é mock.
function PlaysView({
  teams,
  drives,
  plays,
  isOpen,
}: {
  teams: NflTeams
  drives: readonly NflDrive[]
  plays: readonly NflPlay[]
  isOpen: boolean
}) {
  const quarters = useMemo(() => groupDrivesByQuarter(drives), [drives])
  const playsByDrive = useMemo(() => groupPlaysByDrive(plays), [plays])

  // Campanha em andamento como ponto de partida, que é a que a lista destaca.
  const initialDriveId = drives.find((drive) => drive.inProgress)?.id ?? drives[drives.length - 1]?.id ?? null
  const [driveId, setDriveId] = useState<string | null>(initialDriveId)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [speed, setSpeed] = useState<ReplaySpeed>(1)
  /**
   * Abre no lance mais recente que TEM replay. A porta de entrada é a faixa de situação, e o
   * que ela promete é o lance que explica a descida e a distância de agora — não a campanha
   * desde o começo, que leva de 15 a 48 segundos para chegar até aqui.
   *
   * "Tem replay" é `isAnimatable`, e não `hasBallFlight`. A diferença é a corrida: ela não
   * tem arco, mas tem trecho rasteiro, retrato e nome — tem o que mostrar. Com o teste do
   * voo, uma campanha que acabou de terminar em corrida abria numa jogada anterior e parava
   * ali, porque na abertura não há encadeamento: quem tocou em "3ª & 4" via um lance de duas
   * descidas atrás. E não é caso de borda — simulando cada estado pelo qual as campanhas
   * deste fixture passam ao vivo (cada campanha passa por todos os próprios prefixos), 17 dos
   * 56 abriam antes da última jogada; com `isAnimatable`, 1.
   *
   * A volta para trás continua existindo, e é ela que sobra nesse 1: um lance anulado antes
   * do snap não tem nada para desenhar, e abrir nele deixaria o botão de reproduzir
   * desabilitado, dando a impressão de que nada funciona.
   */
  const [playIndex, setPlayIndex] = useState(() => {
    const initialPlays = playsByDrive.get(initialDriveId ?? '') ?? []
    const lastWithReplay = initialPlays.map(isAnimatable).lastIndexOf(true)

    return lastWithReplay >= 0 ? lastWithReplay : Math.max(0, initialPlays.length - 1)
  })
  const [runId, setRunId] = useState(0)
  // O sheet desmonta este componente ao fechar, então "primeira montagem" é o mesmo que
  // "acabou de abrir". Só aí o replay espera a tela assentar; trocar de lance começa na
  // hora, porque aí não há animação de abertura disputando espaço.
  const [isFirstOpen, setIsFirstOpen] = useState(true)

  const drivePlays = driveId ? playsByDrive.get(driveId) ?? [] : []
  const playCount = drivePlays.length
  const play = drivePlays[playIndex] ?? drivePlays[0] ?? null
  const drive = drives.find((item) => item.id === driveId) ?? null

  // Encadeamento de campanha: ao terminar um lance, espera um pouco e vai para o próximo.
  const advanceTimer = useRef<number | null>(null)
  // Sem useCallback: o hook do replay guarda este retorno numa ref, então a identidade
  // mudar entre renders não reinicia o laço.
  const handleEnded = () => {
    if (!autoAdvance) return
    if (playIndex >= playCount - 1) {
      setAutoAdvance(false)
      return
    }
    advanceTimer.current = window.setTimeout(() => {
      setPlayIndex((current) => current + 1)
      setRunId((current) => current + 1)
    }, (showsGainBadge(play) ? SEQUENCE_PAUSE_GAIN : SEQUENCE_PAUSE) / speed)
  }

  useEffect(() => () => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
  }, [])

  /**
   * `sequence` diz se a campanha SEGUE depois deste lance. Hoje é sempre verdadeiro: a
   * timeline se parece com um scrubber de vídeo (barra de progresso, marcadores, botão de
   * play ao lado), e todo player continua tocando depois de um seek. Parar no lance clicado
   * contrariava o desenho e ainda deixava a mesma superfície com dois comportamentos, já
   * que abrir uma campanha pela lista sempre encadeou.
   *
   * Quem quiser ver um lance só tem o botão de pausa ali do lado.
   */
  /** Para a campanha onde está: cancela o avanço agendado e não encadeia mais. */
  const stopSequence = () => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
    setAutoAdvance(false)
  }

  const playsRef = useRef<HTMLDivElement>(null)

  /**
   * Leva a pessoa até o campo ao disparar uma campanha pela lista. O botão de play fica lá
   * embaixo, entre as campanhas do quarter, e sem isto o lance corria fora da tela: tocava
   * em play e continuava olhando para a lista.
   *
   * Rola o CORPO do sheet até o topo, e não o campo até a borda: o campo é o primeiro bloco
   * depois dos chips, então o topo já o mostra inteiro, e é uma posição estável — não depende
   * de quanto o conteúdo acima mede nem mexe em rolagem de outro elemento.
   *
   * Não vale para os marcadores da timeline: eles já ficam colados no campo.
   */
  const scrollToField = () => {
    playsRef.current?.closest('.bottom-sheet__body')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const selectPlay = (nextDriveId: string, index: number, sequence: boolean) => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
    setIsFirstOpen(false)
    setAutoAdvance(sequence)
    setDriveId(nextDriveId)
    setPlayIndex(index)
    setRunId((current) => current + 1)
  }

  return (
    <div className="nfl-plays" ref={playsRef}>
      {play && (
        <NflPlayReplayPanel
          // A key por lance faz a troca ser uma remontagem: o laço de animação morre na
          // limpeza e nada do lance anterior sobrevive. `runId` permite repetir o mesmo
          // lance do zero. Fechar o sheet desmonta tudo e para a reprodução.
          key={`${driveId}:${play.id}:${runId}:${isOpen}`}
          play={play}
          contextLabel={`${getQuarterLabel(play.quarter)} · ${teams[play.side as TeamSide].nickname}`}
          counterLabel={`${playIndex + 1} de ${playCount}`}
          opponent={teams[(play.side === 'home' ? 'away' : 'home') as TeamSide].nickname}
          speed={speed}
          onSpeedChange={() => setSpeed(nextSpeed(speed))}
          formatSpeed={formatSpeed}
          onEnded={handleEnded}
          startDelay={isFirstOpen ? REPLAY_TIMING.openDelay : 0}
          isSequence={autoAdvance}
          isLastPlay={playIndex === playCount - 1}
          onReplaySequence={() => driveId && selectPlay(driveId, 0, true)}
          onStopSequence={stopSequence}
        >
          {/* Campo em sangria total: a arte é mais larga que a tela e sobra dos dois lados. */}
          <div className="nfl-plays__field-art">
            <img src={campinhoNFL} alt="" className="nfl-plays__field-image" />
            <img src={getFieldOverlay()} alt="" className="nfl-plays__field-image" />
            <img src={endzoneChiefs} alt="" className="nfl-plays__endzone nfl-plays__endzone--home" />
            <img src={endzoneDolphins} alt="" className="nfl-plays__endzone nfl-plays__endzone--away" />
          </div>
        </NflPlayReplayPanel>
      )}

      <section className="nfl-plays__timeline" aria-label="Linha do tempo das jogadas">
        <div className="nfl-plays__timeline-track">
          <span className="nfl-plays__timeline-rail" aria-hidden="true" />
          <span
            className="nfl-plays__timeline-progress"
            style={{ width: timelineProgress(playIndex, playCount) }}
            aria-hidden="true"
          />
          {drivePlays.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={[
                'nfl-plays__timeline-marker',
                index < playIndex ? 'nfl-plays__timeline-marker--done' : '',
                index === playIndex ? 'nfl-plays__timeline-marker--current' : '',
              ].filter(Boolean).join(' ')}
              style={{ left: markerOffset(index, playCount) }}
              aria-label={getPlayTitle(item)}
              onClick={() => driveId && selectPlay(driveId, index, true)}
            />
          ))}
        </div>
        <div className="nfl-plays__timeline-clock">
          <span>{drivePlays[0]?.clock ?? '--:--'}</span>
          <span>{drivePlays[playCount - 1]?.clock ?? '--:--'}</span>
        </div>
      </section>

      <section className="nfl-plays__drives" aria-label="Campanhas por quarter">
        {quarters.map(({ quarter, drives: quarterDrives }) => (
          <div className="nfl-plays__quarter" key={quarter}>
            <h3 className="nfl-plays__quarter-title">{getQuarterLabel(quarter)}</h3>
            <ul className="nfl-plays__drive-list">
              {quarterDrives.map((item) => {
                const team = teams[item.side as TeamSide]

                return (
                  <li
                    key={item.id}
                    className={[
                      'nfl-plays__drive',
                      item.id === drive?.id ? 'nfl-plays__drive--active' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {/* A LINHA INTEIRA é o gatilho, e não só o ícone de play: ele é um alvo
                        de 44px numa linha de 72, e o resto do card parecia tocável sem ser.
                        O ícone fica como sinal do que o toque faz. */}
                    <button
                      type="button"
                      className="nfl-plays__drive-row"
                      aria-label={`Reproduzir campanha ${getDriveTitle(item, team.nickname)}`}
                      onClick={() => {
                        selectPlay(item.id, 0, true)
                        scrollToField()
                      }}
                    >
                      <TeamLogo
                        teamName={team.name}
                        sport="nfl"
                        className="nfl-plays__drive-logo"
                        placeholderClassName="nfl-plays__drive-logo"
                      />
                      <div className="nfl-plays__drive-info">
                        <p className="nfl-plays__drive-name">{getDriveTitle(item, team.nickname)}</p>
                        <p className="nfl-plays__drive-stats">{getDriveStatsLabel(item)}</p>
                      </div>
                      <span className="nfl-plays__drive-play" aria-hidden="true">
                        <img src={iconPlayPeq} alt="" />
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </section>
    </div>
  )
}

const comparisonLabels: Record<string, string> = {
  'total-yards': 'Jardas totais',
  'pass-yards': 'Jardas de passe',
  'rush-yards': 'Jardas de corrida',
  'first-downs': 'Primeiras descidas',
  'third-down': 'Conversões de 3ª descida',
  turnovers: 'Turnovers',
  penalties: 'Penalidades - quantidade/jardas',
  possession: 'Tempo de posse',
}

// A barra compara as duas equipes na mesma linha. Quando o valor exibido é composto
// ("5/16", "7-50", "34:17") o gerador manda um número separado só para a proporção.
const getRatio = (row: NflLiveGame['teamComparison'][number], side: TeamSide) => {
  const raw = side === 'home'
    ? ('homeRatio' in row ? row.homeRatio : row.home)
    : ('awayRatio' in row ? row.awayRatio : row.away)
  const value = typeof raw === 'number' ? raw : Number(raw)

  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function StatTable({
  category,
  players,
}: {
  category: StatCategory
  players: Record<string, number | string>[]
}) {
  if (players.length === 0) {
    return <p className="nfl-stats-bs__empty">Nada registrado até aqui.</p>
  }

  return (
    <table className="nfl-stats-bs__table">
      <thead>
        <tr>
          <th scope="col">Jogador</th>
          {category.columns.map((column) => (
            <th scope="col" key={column.key}>{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {players.map((player) => {
          const name = String(player.name)
          const stats = player as unknown as Record<string, number>

          return (
            <tr key={String(player.id)}>
              <th scope="row">
                <img
                  src={getLocalPlayerImage('', name) ?? playerAvatarNFL}
                  alt=""
                  className="nfl-stats-bs__player-photo"
                />
                <span>{name}</span>
              </th>
              {category.columns.map((column) => (
                <td key={column.key}>{column.value(stats)}</td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function NflPlaysStatsBottomSheet({
  isOpen,
  onClose,
  liveClock,
}: {
  isOpen: boolean
  onClose: () => void
  liveClock?: string
}) {
  const game = nflLiveGame
  const [activeTeam, setActiveTeam] = useState<TeamSide>('home')
  const [activeView, setActiveView] = useState<ViewId>('jogadas')

  // O sheet continua montado entre aberturas (o LiveEventPage o renderiza junto da
  // situação, não só quando aberto), então sem este reset a segunda abertura lembraria a
  // última aba. Resetar no fechamento evita um efeito e acontece com o sheet já oculto.
  const handleClose = () => {
    setActiveView('jogadas')
    onClose()
  }

  const teams = useMemo(() => ({
    home: game.game.home,
    away: game.game.away,
  }), [game])

  // O trilho de times reusa o mesmo componente do trilho de esporte e competição, então
  // recebe os escudos como ícone e a sigla do lado como id.
  const teamRailSections = useMemo<ProductRailSection<ProductRailBaseItem>[]>(() => [{
    id: 'equipes',
    items: (['home', 'away'] as const).map((side) => ({
      id: side,
      label: teams[side].nickname,
      icon: getTeamLogo(teams[side].name),
      clickable: true,
    })),
  }], [teams])

  const activeTeamAbbr = teams[activeTeam].abbr as keyof NflLiveGame['players']
  const teamPlayers = game.players[activeTeamAbbr]
  const clock = liveClock ?? `Q${game.live.quarter} ${game.live.clock}`

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="Jogadas e Estatísticas"
      sheetClassName="nfl-stats-bs"
      bodyClassName={[
        'nfl-stats-bs__body',
        activeView === 'jogadas' ? 'nfl-stats-bs__body--plays' : '',
      ].filter(Boolean).join(' ')}
      blurBackdrop
    >
      <ContentFilterChips
        filters={viewChips}
        activeFilter={activeView}
        onFilterChange={setActiveView}
        ariaLabel="Jogadas e estatísticas"
        className="live-event-inline__market-chips nfl-stats-bs__chips"
      />

      {activeView === 'jogadas' ? (
        <PlaysView teams={teams} drives={game.drives} plays={game.plays} isOpen={isOpen} />
      ) : (
      <>
      <section className="nfl-stats-bs__scoreboard" aria-label="Placar por quarter">
        <header className="nfl-stats-bs__scoreboard-head">
          <h3>{teams.home.nickname} × {teams.away.nickname}</h3>
          <span className="nfl-stats-bs__live">
            <span className="nfl-stats-bs__live-dot" aria-hidden="true" />
            {clock}
          </span>
        </header>
        <table className="nfl-stats-bs__score-table">
          <thead>
            <tr>
              <th scope="col"><span className="nfl-stats-bs__sr">Equipe</span></th>
              <th scope="col">1º</th>
              <th scope="col">2º</th>
              <th scope="col">3º</th>
              <th scope="col">4º</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {(['home', 'away'] as const).map((side) => {
              const team = teams[side]
              const quarters = game.quarterScores[side]
              const total = side === 'home' ? game.quarterScores.homeTotal : game.quarterScores.awayTotal

              return (
                <tr key={team.abbr}>
                  <th scope="row">
                    <TeamLogo
                      teamName={team.name}
                      sport="nfl"
                      className="nfl-stats-bs__score-logo"
                      placeholderClassName="nfl-stats-bs__score-logo"
                    />
                    <span>{team.abbr} · {team.nickname}</span>
                  </th>
                  {quarters.map((points, index) => (
                    <td key={`${team.abbr}-q${index + 1}`}>{points}</td>
                  ))}
                  <td className="nfl-stats-bs__score-total"><span>{total}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="nfl-stats-bs__note">Estatísticas acumuladas da partida</p>
      </section>

      <section className="nfl-stats-bs__players" aria-label="Estatísticas por jogador">
        <h2 className="nfl-stats-bs__section-title">Jogadores</h2>
        <ProductRail
          sections={teamRailSections}
          activeItemId={activeTeam}
          onSelectItem={(item) => setActiveTeam(item.id as TeamSide)}
        />
        {statCategories.map((category) => (
          <MarketAccordion
            key={category.key}
            title={category.title}
            badges={[]}
            defaultOpen={category.startsOpen}
            className="nfl-stats-bs__accordion"
          >
            <StatTable
              category={category}
              players={teamPlayers[category.key] as Record<string, number | string>[]}
            />
          </MarketAccordion>
        ))}
      </section>

      <section className="nfl-stats-bs__comparison" aria-label="Comparação entre equipes">
        <h2 className="nfl-stats-bs__section-title">Comparação entre equipes</h2>
        <div className="nfl-stats-bs__comparison-head">
          <span>{teams.home.nickname}</span>
          <span className="nfl-stats-bs__comparison-scope">Partida completa</span>
          <span>{teams.away.nickname}</span>
        </div>
        <ul className="nfl-stats-bs__comparison-list">
          {game.teamComparison.map((row) => {
            const homeRatio = getRatio(row, 'home')
            const awayRatio = getRatio(row, 'away')
            const total = homeRatio + awayRatio
            const homeShare = total > 0 ? (homeRatio / total) * 100 : 50

            return (
              <li className="nfl-stats-bs__comparison-row" key={row.key}>
                <div className="nfl-stats-bs__comparison-values">
                  <strong>{row.home}</strong>
                  <span>{comparisonLabels[row.key] ?? row.key}</span>
                  <strong>{row.away}</strong>
                </div>
                <div className="nfl-stats-bs__comparison-bar" aria-hidden="true">
                  <span style={{ width: `${homeShare}%`, background: teams.home.color }} />
                  <span style={{ width: `${100 - homeShare}%`, background: teams.away.color }} />
                </div>
              </li>
            )
          })}
        </ul>
      </section>
      </>
      )}
    </BottomSheet>
  )
}
