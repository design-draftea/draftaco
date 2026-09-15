import { brandStorage } from '../../../shared/brand/storage'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import avatarBasketball from '../../../assets/iconsDraftaco/avatarMemoriaBasquete.png'
import avatarEsports from '../../../assets/iconsDraftaco/avatarMemoriaEsports.png'
import avatarF1 from '../../../assets/iconsDraftaco/avatarMemoriaF1.png'
import avatarAmericanFootball from '../../../assets/iconsDraftaco/avatarMemoriaFutAmericano.png'
import avatarFootball from '../../../assets/iconsDraftaco/avatarMemoriaFutebol.png'
import avatarTennis from '../../../assets/iconsDraftaco/avatarMemoriaTenis.png'
import connectionIcon from '../../../assets/iconsDraftaco/iconConexao.png'
import cardLogo from '../../../assets/iconsDraftaco/iconLogoOpacity.png'
import { OfflineRetryButton } from '../../../components/OfflineRetryButton'
import './MemoriaPage.css'

type Sport = 'tenis' | 'futebol-americano' | 'esports' | 'f1' | 'futebol' | 'basquete'
type RoundPhase = 'playing' | 'closing' | 'gathering' | 'shuffling' | 'dealing'

type MemoryCard = {
  id: string
  sport: Sport
  label: string
  image: string
}

type BoardMetrics = {
  width: number
  height: number
  cardWidth: number
  cardHeight: number
}

const SPORTS: ReadonlyArray<Omit<MemoryCard, 'id'>> = [
  { sport: 'tenis', label: 'Tênis', image: avatarTennis },
  { sport: 'futebol-americano', label: 'Futebol americano', image: avatarAmericanFootball },
  { sport: 'esports', label: 'eSports', image: avatarEsports },
  { sport: 'f1', label: 'Fórmula 1', image: avatarF1 },
  { sport: 'futebol', label: 'Futebol', image: avatarFootball },
  { sport: 'basquete', label: 'Basquete', image: avatarBasketball },
]

const CARD_GAP_PX = 4
const EMPTY_BOARD_METRICS: BoardMetrics = {
  width: 0,
  height: 0,
  cardWidth: 0,
  cardHeight: 0,
}

const CARD_FLIP_DURATION_MS = 460
const MISMATCH_VISIBLE_DURATION_MS = 700
const WIN_HOLD_DURATION_MS = 400
const CLOSE_DURATION_MS = 420
const CLOSE_STAGGER_MS = 25
const GATHER_DURATION_MS = 420
const GATHER_STAGGER_MS = 18
const STACK_HOLD_DURATION_MS = 120
const DEAL_DURATION_MS = 520
const DEAL_STAGGER_MS = 40
const CLOSE_TOTAL_DURATION_MS = CLOSE_DURATION_MS + CLOSE_STAGGER_MS * 11
const GATHER_TOTAL_DURATION_MS = GATHER_DURATION_MS + GATHER_STAGGER_MS * 11
const DEAL_TOTAL_DURATION_MS = DEAL_DURATION_MS + DEAL_STAGGER_MS * 11
const RECORD_STORAGE_KEY = 'draftaco-memoria-record'

let inMemoryRecord = 0

const formatScore = (score: number) => String(score).padStart(2, '0')

const getCardPosition = (index: number, metrics: BoardMetrics) => ({
  x: (index % 3) * (metrics.cardWidth + CARD_GAP_PX),
  y: Math.floor(index / 3) * (metrics.cardHeight + CARD_GAP_PX),
})

const getCardTransform = (index: number, metrics: BoardMetrics) => {
  const { x, y } = getCardPosition(index, metrics)
  return `translate3d(${x}px, ${y}px, 0)`
}

const getStackPosition = (metrics: BoardMetrics) => ({
  x: (metrics.width - metrics.cardWidth) / 2,
  y: (metrics.height - metrics.cardHeight) / 2,
})

const getStackTransform = (metrics: BoardMetrics) => {
  const { x, y } = getStackPosition(metrics)
  return `translate3d(${x}px, ${y}px, 0)`
}

const getDealApproachTransform = (index: number, metrics: BoardMetrics) => {
  const stack = getStackPosition(metrics)
  const destination = getCardPosition(index, metrics)
  const x = stack.x + (destination.x - stack.x) * 0.94
  const y = stack.y + (destination.y - stack.y) * 0.94 - 4

  return `translate3d(${x}px, ${y}px, 12px) scale(1.01)`
}

const shuffleCards = (cards: MemoryCard[]) => {
  const shuffledCards = [...cards]

  for (let index = shuffledCards.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const currentCard = shuffledCards[index]
    shuffledCards[index] = shuffledCards[randomIndex]
    shuffledCards[randomIndex] = currentCard
  }

  return shuffledCards
}

const createDeck = () => shuffleCards(
  SPORTS.flatMap((sport) => ([
    { ...sport, id: `${sport.sport}-a` },
    { ...sport, id: `${sport.sport}-b` },
  ])),
)

const createNextDeck = (currentCards: MemoryCard[]) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = shuffleCards(currentCards)
    const movedCards = candidate.reduce((total, card, index) => (
      total + (card.id === currentCards[index]?.id ? 0 : 1)
    ), 0)

    if (movedCards >= 8) return candidate
  }

  return [...currentCards.slice(1), currentCards[0]]
}

const readRecord = () => {
  try {
    const storedRecord = Number.parseInt(brandStorage.getItem(RECORD_STORAGE_KEY) ?? '', 10)

    if (Number.isInteger(storedRecord) && storedRecord > 0) {
      inMemoryRecord = storedRecord
    }
  } catch {
    // Keep using the in-memory fallback when browser storage is unavailable.
  }

  return inMemoryRecord
}

const writeRecord = (record: number) => {
  inMemoryRecord = record

  try {
    brandStorage.setItem(RECORD_STORAGE_KEY, String(record))
  } catch {
    // The current session still keeps the record in memory.
  }
}

/** Standalone memory game used by the offline experience. */
export function MemoriaPage() {
  const boardViewportRef = useRef<HTMLDivElement>(null)
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const timersRef = useRef<Set<number>>(new Set())
  const layoutAnimationsRef = useRef<Set<Animation>>(new Set())
  const selectionRef = useRef<string[]>([])
  const matchedSportsRef = useRef<Set<Sport>>(new Set())
  const movesRef = useRef(0)
  const recordRef = useRef(0)
  const resolvingRef = useRef(false)
  const phaseRef = useRef<RoundPhase>('playing')
  const motionGenerationRef = useRef(0)
  const cardsRef = useRef<MemoryCard[]>([])
  const pendingDealDeckRef = useRef<MemoryCard[] | null>(null)
  const boardMetricsRef = useRef<BoardMetrics>(EMPTY_BOARD_METRICS)
  const [cards, setCards] = useState(createDeck)
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([])
  const [matchedSports, setMatchedSports] = useState<Set<Sport>>(() => new Set())
  const [closingCardIds, setClosingCardIds] = useState<Set<string>>(() => new Set())
  const [liftingCardIds, setLiftingCardIds] = useState<Set<string>>(() => new Set())
  const [moves, setMoves] = useState(0)
  const [record, setRecord] = useState(readRecord)
  const [isResolving, setIsResolving] = useState(false)
  const [roundPhase, setRoundPhase] = useState<RoundPhase>('playing')
  const [boardMetrics, setBoardMetrics] = useState<BoardMetrics>(EMPTY_BOARD_METRICS)
  const [announcement, setAnnouncement] = useState('')

  useLayoutEffect(() => {
    cardsRef.current = cards
  }, [cards])

  useEffect(() => {
    recordRef.current = record
  }, [record])

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer)
      callback()
    }, delay)

    timersRef.current.add(timer)
    return timer
  }, [])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current.clear()
  }, [])

  const cancelLayoutAnimations = useCallback(() => {
    layoutAnimationsRef.current.forEach((animation) => animation.cancel())
    layoutAnimationsRef.current.clear()
  }, [])

  const updateRoundPhase = useCallback((phase: RoundPhase) => {
    phaseRef.current = phase
    setRoundPhase(phase)
  }, [])

  const updateResolving = useCallback((resolving: boolean) => {
    resolvingRef.current = resolving
    setIsResolving(resolving)
  }, [])

  const triggerCardLift = useCallback((cardIds: string[]) => {
    setLiftingCardIds((currentIds) => {
      const nextIds = new Set(currentIds)
      cardIds.forEach((cardId) => nextIds.add(cardId))
      return nextIds
    })

    cardIds.forEach((cardId) => {
      schedule(() => {
        setLiftingCardIds((currentIds) => {
          const nextIds = new Set(currentIds)
          nextIds.delete(cardId)
          return nextIds
        })
      }, CARD_FLIP_DURATION_MS)
    })
  }, [schedule])

  const resetRoundImmediately = useCallback(() => {
    motionGenerationRef.current += 1
    clearTimers()
    cancelLayoutAnimations()
    const nextDeck = createNextDeck(cardsRef.current)
    cardsRef.current = nextDeck
    pendingDealDeckRef.current = null
    selectionRef.current = []
    matchedSportsRef.current = new Set()
    movesRef.current = 0
    updateResolving(false)
    updateRoundPhase('playing')
    setCards(nextDeck)
    setSelectedCardIds([])
    setMatchedSports(new Set())
    setClosingCardIds(new Set())
    setLiftingCardIds(new Set())
    setMoves(0)
    setAnnouncement('Nova rodada iniciada.')
  }, [cancelLayoutAnimations, clearTimers, updateResolving, updateRoundPhase])

  const beginGathering = useCallback((generation: number) => {
    if (generation !== motionGenerationRef.current) return

    matchedSportsRef.current = new Set()
    setMatchedSports(new Set())
    setClosingCardIds(new Set())
    updateRoundPhase('gathering')

    const metrics = boardMetricsRef.current
    const stackTransform = getStackTransform(metrics)

    cardsRef.current.forEach((card, index) => {
      const slot = slotRefs.current.get(card.id)
      if (!slot) return

      const animation = slot.animate([
        {
          transform: getCardTransform(index, metrics),
          filter: 'drop-shadow(0 0 0 rgb(0 0 0 / 0))',
        },
        {
          transform: stackTransform,
          filter: 'drop-shadow(0 12px 18px rgb(0 0 0 / 0.42))',
        },
      ], {
        duration: GATHER_DURATION_MS,
        delay: index * GATHER_STAGGER_MS,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards',
      })

      layoutAnimationsRef.current.add(animation)
    })

    schedule(() => {
      if (generation !== motionGenerationRef.current) return

      updateRoundPhase('shuffling')
      schedule(() => {
        if (generation !== motionGenerationRef.current) return

        const nextDeck = createNextDeck(cardsRef.current)
        pendingDealDeckRef.current = nextDeck
        cardsRef.current = nextDeck
        selectionRef.current = []
        matchedSportsRef.current = new Set()
        movesRef.current = 0
        setSelectedCardIds([])
        setMatchedSports(new Set())
        setClosingCardIds(new Set())
        setLiftingCardIds(new Set())
        setMoves(0)
        setCards(nextDeck)
      }, STACK_HOLD_DURATION_MS)
    }, GATHER_TOTAL_DURATION_MS)
  }, [schedule, updateRoundPhase])

  const beginVictorySequence = useCallback(() => {
    const generation = motionGenerationRef.current

    schedule(() => {
      if (generation !== motionGenerationRef.current) return

      updateRoundPhase('closing')
      cardsRef.current.forEach((card, index) => {
        schedule(() => {
          if (generation !== motionGenerationRef.current) return

          triggerCardLift([card.id])
          setClosingCardIds((currentIds) => {
            const nextIds = new Set(currentIds)
            nextIds.add(card.id)
            return nextIds
          })
        }, index * CLOSE_STAGGER_MS)
      })

      schedule(() => beginGathering(generation), CLOSE_TOTAL_DURATION_MS)
    }, CARD_FLIP_DURATION_MS + WIN_HOLD_DURATION_MS)
  }, [beginGathering, schedule, triggerCardLift, updateRoundPhase])

  useLayoutEffect(() => {
    if (roundPhase !== 'shuffling' || pendingDealDeckRef.current !== cards) return

    const generation = motionGenerationRef.current
    const metrics = boardMetricsRef.current
    const stackTransform = getStackTransform(metrics)
    cancelLayoutAnimations()

    cards.forEach((card, index) => {
      const slot = slotRefs.current.get(card.id)
      if (!slot) return

      const animation = slot.animate([
        {
          offset: 0,
          transform: `${stackTransform} scale(0.985)`,
          filter: 'drop-shadow(0 12px 18px rgb(0 0 0 / 0.42))',
          easing: 'cubic-bezier(0.25, 0.55, 0.35, 1)',
        },
        {
          offset: 0.82,
          transform: getDealApproachTransform(index, metrics),
          filter: 'drop-shadow(0 8px 12px rgb(0 0 0 / 0.3))',
          easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
        },
        {
          offset: 1,
          transform: getCardTransform(index, metrics),
          filter: 'drop-shadow(0 0 0 rgb(0 0 0 / 0))',
        },
      ], {
        duration: DEAL_DURATION_MS,
        delay: index * DEAL_STAGGER_MS,
        easing: 'linear',
        fill: 'both',
      })

      layoutAnimationsRef.current.add(animation)
    })

    pendingDealDeckRef.current = null
    schedule(() => {
      if (generation !== motionGenerationRef.current) return
      updateRoundPhase('dealing')
    }, 0)
    schedule(() => {
      if (generation !== motionGenerationRef.current) return

      cancelLayoutAnimations()
      updateResolving(false)
      updateRoundPhase('playing')
      setAnnouncement('Nova rodada iniciada.')
    }, DEAL_TOTAL_DURATION_MS)
  }, [cards, cancelLayoutAnimations, roundPhase, schedule, updateResolving, updateRoundPhase])

  const handleCardClick = useCallback((card: MemoryCard) => {
    if (
      phaseRef.current !== 'playing' ||
      resolvingRef.current ||
      matchedSportsRef.current.has(card.sport) ||
      selectionRef.current.includes(card.id)
    ) {
      return
    }

    triggerCardLift([card.id])
    const firstSelectedId = selectionRef.current[0]

    if (!firstSelectedId) {
      selectionRef.current = [card.id]
      setSelectedCardIds([card.id])
      return
    }

    const firstCard = cardsRef.current.find((candidate) => candidate.id === firstSelectedId)
    if (!firstCard) return

    const nextSelection = [firstSelectedId, card.id]
    const nextMoves = movesRef.current + 1
    selectionRef.current = nextSelection
    movesRef.current = nextMoves
    updateResolving(true)
    setSelectedCardIds(nextSelection)
    setMoves(nextMoves)

    if (firstCard.sport === card.sport) {
      const nextMatchedSports = new Set(matchedSportsRef.current)
      nextMatchedSports.add(card.sport)
      matchedSportsRef.current = nextMatchedSports
      selectionRef.current = []
      setMatchedSports(nextMatchedSports)
      setSelectedCardIds([])

      if (nextMatchedSports.size === SPORTS.length) {
        const currentRecord = recordRef.current
        const nextRecord = currentRecord === 0 ? nextMoves : Math.min(currentRecord, nextMoves)

        if (nextRecord !== currentRecord) {
          recordRef.current = nextRecord
          setRecord(nextRecord)
          writeRecord(nextRecord)
        }

        setAnnouncement(`Jogo concluído em ${nextMoves} jogadas. Recorde: ${nextRecord}.`)
        beginVictorySequence()
        return
      }

      setAnnouncement(`Par de ${card.label} encontrado.`)
      schedule(() => updateResolving(false), CARD_FLIP_DURATION_MS)
      return
    }

    setAnnouncement('As cartas não formam um par.')
    schedule(() => {
      triggerCardLift(nextSelection)
      selectionRef.current = []
      setSelectedCardIds([])
      schedule(() => updateResolving(false), CARD_FLIP_DURATION_MS)
    }, CARD_FLIP_DURATION_MS + MISMATCH_VISIBLE_DURATION_MS)
  }, [beginVictorySequence, schedule, triggerCardLift, updateResolving])

  const handleCardKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, card: MemoryCard) => {
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    handleCardClick(card)
  }, [handleCardClick])

  useLayoutEffect(() => {
    const boardViewport = boardViewportRef.current
    if (!boardViewport) return undefined

    const updateBoardMetrics = () => {
      const width = boardViewport.clientWidth
      const height = boardViewport.clientHeight

      if (width <= 0 || height <= 0) return

      const nextMetrics = {
        width,
        height,
        cardWidth: (width - CARD_GAP_PX * 2) / 3,
        cardHeight: (height - CARD_GAP_PX * 3) / 4,
      }
      const previousMetrics = boardMetricsRef.current
      const hasResized = previousMetrics.width > 0 && (
        Math.abs(previousMetrics.width - nextMetrics.width) > 0.5 ||
        Math.abs(previousMetrics.height - nextMetrics.height) > 0.5
      )

      boardMetricsRef.current = nextMetrics
      setBoardMetrics(nextMetrics)

      if (hasResized) resetRoundImmediately()
    }

    updateBoardMetrics()
    const resizeObserver = new ResizeObserver(updateBoardMetrics)
    resizeObserver.observe(boardViewport)

    return () => resizeObserver.disconnect()
  }, [resetRoundImmediately])

  useEffect(() => () => {
    motionGenerationRef.current += 1
    clearTimers()
    cancelLayoutAnimations()
  }, [cancelLayoutAnimations, clearTimers])

  return (
    <main className="memoria-page">
      <div className="memoria-page__surface">
        <div className="memoria-page__glow" aria-hidden="true" />
        <div className="memoria-page__header-space" aria-hidden="true" />

        <div className="memoria-page__content">
          <header className="memoria-page__intro">
            <span className="memoria-page__connection-icon" aria-hidden="true">
              <img src={connectionIcon} alt="" />
            </span>
            <h1>OPS, SEM CONEXÃO!</h1>
            <p>O VAR tá revisando a sua internet. Bora testar a memória enquanto ela não volta?</p>
            <OfflineRetryButton />
          </header>

          <section className="memoria-game" aria-label="Jogo da memória">
            <div className="memoria-game__board-viewport" ref={boardViewportRef}>
              <div
                className={`memoria-game__board memoria-game__board--${roundPhase}`}
                data-phase={roundPhase}
              >
                {cards.map((card, index) => {
                  const isMatched = matchedSports.has(card.sport)
                  const isClosing = closingCardIds.has(card.id)
                  const isLifting = liftingCardIds.has(card.id)
                  const isFaceUp = !isClosing && (isMatched || selectedCardIds.includes(card.id))
                  const interactionsLocked = isMatched || isResolving || roundPhase !== 'playing'
                  const isDealPhase = roundPhase === 'shuffling' || roundPhase === 'dealing'
                  const slotStyle: CSSProperties = {
                    width: `${boardMetrics.cardWidth}px`,
                    height: `${boardMetrics.cardHeight}px`,
                    transform: getCardTransform(index, boardMetrics),
                    visibility: boardMetrics.width > 0 ? 'visible' : 'hidden',
                    zIndex: isLifting
                      ? 50
                      : roundPhase === 'playing'
                        ? 1
                        : isDealPhase
                          ? cards.length - index
                          : index + 1,
                  }

                  return (
                    <div
                      className="memoria-card-slot"
                      data-card-id={card.id}
                      key={card.id}
                      ref={(element) => {
                        if (element) {
                          slotRefs.current.set(card.id, element)
                        } else {
                          slotRefs.current.delete(card.id)
                        }
                      }}
                      style={slotStyle}
                    >
                      <div className={`memoria-card__lift${isLifting ? ' memoria-card__lift--active' : ''}`}>
                        <button
                          className={`memoria-card${isFaceUp ? ' memoria-card--face-up' : ''}`}
                          type="button"
                          aria-label={isFaceUp ? `${card.label}, carta virada` : `Carta fechada ${index + 1}`}
                          aria-pressed={isFaceUp}
                          aria-disabled={interactionsLocked}
                          onClick={() => handleCardClick(card)}
                          onKeyDown={(event) => handleCardKeyDown(event, card)}
                        >
                          <span className="memoria-card__face memoria-card__back" aria-hidden="true">
                            <img src={cardLogo} alt="" draggable="false" />
                          </span>
                          <span
                            className={`memoria-card__face memoria-card__front memoria-card__front--${card.sport}`}
                            aria-hidden="true"
                          >
                            <img src={card.image} alt="" draggable="false" />
                          </span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="memoria-game__scoreboard">
              <div className="memoria-game__score-pair">
                <span className="memoria-game__tag memoria-game__tag--label">JOGADAS</span>
                <span className="memoria-game__tag memoria-game__tag--score" aria-label={`${moves} jogadas`}>
                  <span className="memoria-game__score-value">{formatScore(moves)}</span>
                </span>
              </div>

              <div className="memoria-game__score-pair">
                <span className="memoria-game__tag memoria-game__tag--score" aria-label={`Recorde: ${record}`}>
                  <span className="memoria-game__score-value">{formatScore(record)}</span>
                </span>
                <span className="memoria-game__tag memoria-game__tag--label">RECORDE</span>
              </div>
            </div>

            <p className="memoria-game__announcement" role="status" aria-live="polite">
              {announcement}
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
