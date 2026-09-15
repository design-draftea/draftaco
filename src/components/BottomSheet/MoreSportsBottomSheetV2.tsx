import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import iconBaseball from '../../assets/iconSports/baseball.png'
import iconBasketball from '../../assets/iconSports/basketball.png'
import iconBoxing from '../../assets/iconSports/boxing.png'
import iconCsgo from '../../assets/iconSports/csgo.png'
import iconDarts from '../../assets/iconSports/darts.png'
import iconDota from '../../assets/iconSports/dota.png'
import iconEBasketball from '../../assets/iconSports/e-basketball.png'
import iconESoccer from '../../assets/iconSports/e-soccer.png'
import iconF1 from '../../assets/iconSports/f1.png'
import iconFootball from '../../assets/iconSports/football.png'
import iconGolf from '../../assets/iconSports/golf.png'
import iconHandball from '../../assets/iconSports/handball.png'
import iconHockey from '../../assets/iconSports/hockey.png'
import iconKingsLeague from '../../assets/iconSports/kings-league.png'
import iconLol from '../../assets/iconSports/lol.png'
import iconRainbowSix from '../../assets/iconSports/rainbow-six.png'
import iconSoccer from '../../assets/iconSports/soccer.png'
import iconTableTennis from '../../assets/iconSports/table-tennis.png'
import iconTennis from '../../assets/iconSports/tennis.png'
import iconUfc from '../../assets/iconSports/ufc.png'
import iconValorant from '../../assets/iconSports/valorant.png'
import iconVolleyball from '../../assets/iconSports/volleyball.png'
import iconVirtuais from '../../assets/iconVirtuais.png'
import chevronUp from '../../assets/iconsDraftaco/chevronUp.svg'
import iconCloseEvents from '../../assets/iconsDraftaco/iconCloseEvents.svg'
import iconFavorito from '../../assets/iconsDraftaco/iconFavorito.svg'
import iconFavoritoAtivo from '../../assets/iconsDraftaco/iconFavoritoAtivo.svg'
import iconOrdenacao from '../../assets/iconsDraftaco/iconOrdenacao.svg'
import marcacao from '../../assets/iconsDraftaco/marcacao.svg'
import type { CompetitionLinkTarget } from '../../shared/utils/competitionNavigation'
import {
  isCompetitionEnabled,
  isCompetitionRailClickable,
} from '../SportFilterBar/competicaoData'
import { BottomSheet } from './BottomSheet'
import './MoreSportsBottomSheetV2.css'

interface MoreSportsBottomSheetV2Props {
  isOpen: boolean
  onClose: () => void
  activeSport?: string | null
  favoriteCompetitions: CompetitionLinkTarget[]
  onMoveFavorite: (fromIndex: number, toIndex: number) => void
  onSelectSport?: (sportId: string) => void
  onSelectCompetition?: (target: CompetitionLinkTarget) => void
  onToggleFavorite: (competition: CompetitionLinkTarget) => void
}

interface MenuCompetition extends CompetitionLinkTarget {
  gameCount: number
}

interface SportItem {
  id: string
  label: string
  icon: string
  competitions: MenuCompetition[]
}

interface AccordionCollapseProps {
  isOpen: boolean
  children: ReactNode
}

interface FavoriteDragState {
  key: string
  pointerId: number
  startIndex: number
  targetIndex: number
  clientY: number
  grabOffsetY: number
  left: number
  width: number
  height: number
}

interface KeyboardSortState {
  key: string
  startIndex: number
  targetIndex: number
}

interface FavoriteAnimation {
  key: string
  action: 'adding' | 'removing'
}

const favoriteOrderRowHeight = 61
const accordionScrollDuration = 160
const accordionLayoutDuration = 320
const selectableSportIds = new Set(['futebol', 'basquete'])

// Contagens que refletem os jogos modelados no protótipo.
const availableGameCounts: Record<string, number> = {
  'fut-brasileiro': 8,
  'fut-libertadores': 9,
  'fut-champions': 7,
  'fut-premier-league': 4,
  'fut-bundesliga': 4,
  'fut-laliga': 4,
  'bsq-nba': 7,
  'bsq-ncaab': 4,
  'bsq-nbb': 4,
  'bsq-euro-cup': 3,
  'ten-roma-masters': 3,
  'ten-roma-f': 3,
  'ten-parma-f': 3,
  'ten-bordeaux': 3,
}

const competitionRegionById: Record<string, string> = {
  'fut-brasileiro': 'Brasil',
  'fut-libertadores': 'América do Sul',
  'fut-champions': 'Europa',
  'fut-sul-americana': 'América do Sul',
  'fut-uefa-champions': 'Europa',
  'fut-premier-league': 'Inglaterra',
  'fut-bundesliga': 'Alemanha',
  'fut-laliga': 'Espanha',
  'fut-serie-a': 'Itália',
  'fut-brasileirao-b': 'Brasil',
  'fut-copa-do-brasil': 'Brasil',
  'fut-liga-mx': 'México',
  'fut-arg-liga-profesional': 'Argentina',
  'bsq-nba': 'Estados Unidos',
  'bsq-ncaab': 'Estados Unidos',
  'bsq-nbb': 'Brasil',
  'bsq-euro-cup': 'Europa',
  'ten-roma-masters': 'Itália',
  'ten-roma-f': 'Itália',
  'ten-parma-f': 'Itália',
  'ten-bordeaux': 'França',
  'eso-fifa-cup': 'Mundo',
  'eso-efl-cup': 'Inglaterra',
  'fa-nfl': 'Estados Unidos',
  'fa-ncaa': 'Estados Unidos',
  'vol-superliga': 'Brasil',
  'vol-vnl': 'Mundo',
  'tm-setka-cup': 'Ucrânia',
  'tm-elite-series': 'Mundo',
  'val-vct-americas': 'Américas',
  'val-challengers-br': 'Brasil',
  'vir-esoccer-battle': 'Mundo',
  'vir-ebasket-h2h': 'Mundo',
  'eb-nba-2k': 'Estados Unidos',
  'eb-cyberbasket': 'Mundo',
  'han-champions': 'Europa',
  'han-bundesliga': 'Alemanha',
  'base-mlb': 'Estados Unidos',
  'base-npb': 'Japão',
  'cs-esl-pro-league': 'Europa',
  'cs-blast-premier': 'Mundo',
  'ufc-fight-night': 'Estados Unidos',
  'ufc-ppv': 'Estados Unidos',
  'dota-dreamleague': 'Mundo',
  'dota-pgl-wallachia': 'Romênia',
  'kings-brasil': 'Brasil',
  'kings-espanha': 'Espanha',
  'lol-lck': 'Coreia do Sul',
  'lol-lpl': 'China',
  'hoc-nhl': 'Estados Unidos e Canadá',
  'hoc-khl': 'Rússia',
  'dados-pdc-world-series': 'Mundo',
  'dados-premier-league': 'Inglaterra',
  'r6-invitational': 'Mundo',
  'r6-north-america': 'América do Norte',
  'box-top-rank': 'Estados Unidos',
  'box-matchroom': 'Inglaterra',
  'gol-pga-tour': 'Estados Unidos',
  'gol-dp-world-tour': 'Europa',
}

const getCompetitionListLabel = (competition: MenuCompetition) => {
  const region = competitionRegionById[competition.id]
  return region && !competition.name.startsWith(`${region} -`)
    ? `${region} - ${competition.name}`
    : competition.name
}

const createCompetition = (
  sport: string,
  id: string,
  name: string,
  gameCount: number
): MenuCompetition => ({
  sport,
  id,
  name,
  gameCount: availableGameCounts[id] ?? gameCount,
})

const sports: SportItem[] = [
  {
    id: 'futebol',
    label: 'Futebol',
    icon: iconSoccer,
    competitions: [
      createCompetition('futebol', 'fut-brasileiro', 'Brasil - Brasileirão Série A', 8),
      createCompetition('futebol', 'fut-libertadores', 'Libertadores', 9),
      createCompetition('futebol', 'fut-champions', 'Champions League', 7),
      createCompetition('futebol', 'fut-sul-americana', 'Sul-Americana', 4),
      createCompetition('futebol', 'fut-uefa-champions', 'UEFA Champions League', 7),
      createCompetition('futebol', 'fut-premier-league', 'Inglaterra - Premier League', 4),
      createCompetition('futebol', 'fut-bundesliga', 'Alemanha - Bundesliga', 4),
      createCompetition('futebol', 'fut-laliga', 'Espanha - LaLiga', 4),
      createCompetition('futebol', 'fut-serie-a', 'Itália - Serie A', 6),
      createCompetition('futebol', 'fut-brasileirao-b', 'Brasil - Brasileirão Série B', 5),
      createCompetition('futebol', 'fut-copa-do-brasil', 'Brasil - Copa do Brasil', 4),
      createCompetition('futebol', 'fut-liga-mx', 'México - Liga MX', 5),
      createCompetition('futebol', 'fut-arg-liga-profesional', 'Argentina - Liga Profesional', 4),
    ],
  },
  {
    id: 'basquete',
    label: 'Basquete',
    icon: iconBasketball,
    competitions: [
      createCompetition('basquete', 'bsq-nba', 'NBA', 6),
      createCompetition('basquete', 'bsq-ncaab', 'NCAAB', 4),
      createCompetition('basquete', 'bsq-nbb', 'NBB', 3),
      createCompetition('basquete', 'bsq-euro-cup', 'Euro Cup', 2),
    ],
  },
  {
    id: 'tenis',
    label: 'Tênis',
    icon: iconTennis,
    competitions: [
      createCompetition('tenis', 'ten-roma-masters', 'Roma Masters', 5),
      createCompetition('tenis', 'ten-roma-f', 'Roma (F)', 4),
      createCompetition('tenis', 'ten-parma-f', 'Parma (F)', 3),
      createCompetition('tenis', 'ten-bordeaux', 'Bordeaux', 2),
    ],
  },
  {
    id: 'f1',
    label: 'Fórmula 1',
    icon: iconF1,
    competitions: [],
  },
  {
    id: 'esoccer',
    label: 'Esoccer',
    icon: iconESoccer,
    competitions: [
      createCompetition('esoccer', 'eso-fifa-cup', 'FIFA Cup', 7),
      createCompetition('esoccer', 'eso-efl-cup', 'EFL Cup', 5),
    ],
  },
  {
    id: 'futebol-americano',
    label: 'Fut. Americano',
    icon: iconFootball,
    competitions: [
      createCompetition('futebol-americano', 'fa-nfl', 'NFL', 4),
      createCompetition('futebol-americano', 'fa-ncaa', 'NCAA', 6),
    ],
  },
  {
    id: 'volei',
    label: 'Vôlei',
    icon: iconVolleyball,
    competitions: [
      createCompetition('volei', 'vol-superliga', 'Superliga', 5),
      createCompetition('volei', 'vol-vnl', 'VNL', 4),
    ],
  },
  {
    id: 'tenis-mesa',
    label: 'Tênis de Mesa',
    icon: iconTableTennis,
    competitions: [
      createCompetition('tenis-mesa', 'tm-setka-cup', 'Setka Cup', 9),
      createCompetition('tenis-mesa', 'tm-elite-series', 'TT Elite Series', 7),
    ],
  },
  {
    id: 'valorant',
    label: 'Valorant',
    icon: iconValorant,
    competitions: [],
  },
  {
    id: 'virtuais',
    label: 'Virtuais',
    icon: iconVirtuais,
    competitions: [
      createCompetition('virtuais', 'vir-esoccer-battle', 'eSoccer Battle', 12),
      createCompetition('virtuais', 'vir-ebasket-h2h', 'eBasketball H2H', 10),
    ],
  },
  {
    id: 'ebasketball',
    label: 'Ebasketball',
    icon: iconEBasketball,
    competitions: [
      createCompetition('ebasketball', 'eb-nba-2k', 'NBA 2K League', 8),
      createCompetition('ebasketball', 'eb-cyberbasket', 'CyberBasketball', 6),
    ],
  },
  {
    id: 'handebol',
    label: 'Handebol',
    icon: iconHandball,
    competitions: [
      createCompetition('handebol', 'han-champions', 'Liga dos Campeões', 3),
      createCompetition('handebol', 'han-bundesliga', 'Handebol Bundesliga', 5),
    ],
  },
  {
    id: 'beisebol',
    label: 'Beisebol',
    icon: iconBaseball,
    competitions: [
      createCompetition('beisebol', 'base-mlb', 'MLB', 7),
      createCompetition('beisebol', 'base-npb', 'NPB', 4),
    ],
  },
  {
    id: 'cs',
    label: 'CS',
    icon: iconCsgo,
    competitions: [
      createCompetition('cs', 'cs-esl-pro-league', 'ESL Pro League', 6),
      createCompetition('cs', 'cs-blast-premier', 'BLAST Premier', 5),
    ],
  },
  {
    id: 'ufc',
    label: 'UFC',
    icon: iconUfc,
    competitions: [],
  },
  {
    id: 'dota',
    label: 'Dota 2',
    icon: iconDota,
    competitions: [
      createCompetition('dota', 'dota-dreamleague', 'DreamLeague', 4),
      createCompetition('dota', 'dota-pgl-wallachia', 'PGL Wallachia', 3),
    ],
  },
  {
    id: 'kings-of-league',
    label: 'Kings of League',
    icon: iconKingsLeague,
    competitions: [
      createCompetition('kings-of-league', 'kings-brasil', 'Kings League Brasil', 5),
      createCompetition('kings-of-league', 'kings-espanha', 'Kings League Spain', 4),
    ],
  },
  {
    id: 'lol',
    label: 'LoL',
    icon: iconLol,
    competitions: [
      createCompetition('lol', 'lol-lck', 'LCK', 6),
      createCompetition('lol', 'lol-lpl', 'LPL', 7),
    ],
  },
  {
    id: 'hoquei',
    label: 'Hoquei',
    icon: iconHockey,
    competitions: [
      createCompetition('hoquei', 'hoc-nhl', 'NHL', 5),
      createCompetition('hoquei', 'hoc-khl', 'KHL', 3),
    ],
  },
  {
    id: 'dados',
    label: 'Dados',
    icon: iconDarts,
    competitions: [
      createCompetition('dados', 'dados-pdc-world-series', 'PDC World Series', 2),
      createCompetition('dados', 'dados-premier-league', 'Premier League Darts', 4),
    ],
  },
  {
    id: 'rainbow-six',
    label: 'Rainbow Six',
    icon: iconRainbowSix,
    competitions: [
      createCompetition('rainbow-six', 'r6-invitational', 'Six Invitational', 3),
      createCompetition('rainbow-six', 'r6-north-america', 'R6 North America', 5),
    ],
  },
  {
    id: 'boxe',
    label: 'Boxe',
    icon: iconBoxing,
    competitions: [],
  },
  {
    id: 'golfe',
    label: 'Golfe',
    icon: iconGolf,
    competitions: [],
  },
]

const sportsById = new Map(sports.map((sport) => [sport.id, sport]))

const getCompetitionKey = (competition: CompetitionLinkTarget) => (
  `${competition.sport}:${competition.id}`
)

const moveArrayItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  if (fromIndex === toIndex) return items
  const nextItems = [...items]
  const [movedItem] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, movedItem)
  return nextItems
}

function AccordionCollapse({ isOpen, children }: AccordionCollapseProps) {
  const collapseRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const collapseEl = collapseRef.current
    const innerEl = innerRef.current
    if (!collapseEl || !innerEl) return

    const updateHeight = () => {
      collapseEl.style.setProperty(
        '--more-sports-v2-accordion-height',
        `${innerEl.scrollHeight}px`
      )
    }

    updateHeight()
    if (typeof ResizeObserver === 'undefined') return

    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(innerEl)
    return () => resizeObserver.disconnect()
  }, [children])

  return (
    <div
      ref={collapseRef}
      className={`more-sports-v2__collapse${isOpen ? ' more-sports-v2__collapse--open' : ''}`}
      aria-hidden={!isOpen}
    >
      <div ref={innerRef} className="more-sports-v2__collapse-inner">
        {children}
      </div>
    </div>
  )
}

export function MoreSportsBottomSheetV2({
  isOpen,
  onClose,
  activeSport,
  favoriteCompetitions,
  onMoveFavorite,
  onSelectSport,
  onSelectCompetition,
  onToggleFavorite,
}: MoreSportsBottomSheetV2Props) {
  const [openSportId, setOpenSportId] = useState<string | null>(null)
  const [isOrderingFavorites, setIsOrderingFavorites] = useState(false)
  const [favoriteDrag, setFavoriteDrag] = useState<FavoriteDragState | null>(null)
  const [favoriteDrop, setFavoriteDrop] = useState<FavoriteDragState | null>(null)
  const [isCommittingFavoriteDrag, setIsCommittingFavoriteDrag] = useState(false)
  const [keyboardSort, setKeyboardSort] = useState<KeyboardSortState | null>(null)
  const [sortAnnouncement, setSortAnnouncement] = useState('')
  const [favoriteAnimation, setFavoriteAnimation] = useState<FavoriteAnimation | null>(null)
  const [removingFavoriteKey, setRemovingFavoriteKey] = useState<string | null>(null)
  const [isFavoritesEmptyEntering, setIsFavoritesEmptyEntering] = useState(false)
  const [isOpenSportSticky, setIsOpenSportSticky] = useState(false)
  const resetTimerRef = useRef<number | null>(null)
  const favoriteRemovalTimerRef = useRef<number | null>(null)
  const favoriteDropTimerRef = useRef<number | null>(null)
  const favoriteCommitTimerRef = useRef<number | null>(null)
  const accordionScrollStartFrameRef = useRef<number | null>(null)
  const accordionScrollFrameRef = useRef<number | null>(null)
  const accordionScrollTargetRef = useRef<string | null>(null)
  const favoriteDragFrameRef = useRef<number | null>(null)
  const favoriteDragRef = useRef<FavoriteDragState | null>(null)
  const favoriteDragOverlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const favoriteOrderListRef = useRef<HTMLUListElement>(null)
  const favoriteOrderItemRefs = useRef(new Map<string, HTMLLIElement>())

  const favoriteKeys = useMemo(
    () => new Set(favoriteCompetitions.map(getCompetitionKey)),
    [favoriteCompetitions]
  )
  const canConfigureFavorites = favoriteCompetitions.length > 0
  const orderingFavorites = useMemo(() => (
    keyboardSort
      ? moveArrayItem(favoriteCompetitions, keyboardSort.startIndex, keyboardSort.targetIndex)
      : favoriteCompetitions
  ), [keyboardSort, favoriteCompetitions])
  const activeDragOverlay = favoriteDrag ?? favoriteDrop
  const draggedCompetition = activeDragOverlay
    ? favoriteCompetitions.find((competition) => getCompetitionKey(competition) === activeDragOverlay.key) ?? null
    : null

  const resetSheetState = () => {
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current)
    if (favoriteRemovalTimerRef.current !== null) window.clearTimeout(favoriteRemovalTimerRef.current)
    if (favoriteDropTimerRef.current !== null) window.clearTimeout(favoriteDropTimerRef.current)
    if (favoriteCommitTimerRef.current !== null) window.clearTimeout(favoriteCommitTimerRef.current)
    if (accordionScrollStartFrameRef.current !== null) window.cancelAnimationFrame(accordionScrollStartFrameRef.current)
    if (accordionScrollFrameRef.current !== null) window.cancelAnimationFrame(accordionScrollFrameRef.current)
    if (favoriteDragFrameRef.current !== null) window.cancelAnimationFrame(favoriteDragFrameRef.current)

    resetTimerRef.current = null
    favoriteRemovalTimerRef.current = null
    favoriteDropTimerRef.current = null
    favoriteCommitTimerRef.current = null
    accordionScrollStartFrameRef.current = null
    accordionScrollFrameRef.current = null
    accordionScrollTargetRef.current = null
    favoriteDragFrameRef.current = null
    favoriteDragRef.current = null
    setOpenSportId(null)
    setIsOrderingFavorites(false)
    setFavoriteDrag(null)
    setFavoriteDrop(null)
    setIsCommittingFavoriteDrag(false)
    setKeyboardSort(null)
    setSortAnnouncement('')
    setFavoriteAnimation(null)
    setRemovingFavoriteKey(null)
    setIsFavoritesEmptyEntering(false)
    setIsOpenSportSticky(false)
  }

  const handleCloseSheet = () => {
    resetSheetState()
    onClose()
  }

  const handleSelectSport = (sportId: string) => {
    if (!onSelectSport) return

    onSelectSport(sportId)
    closeAndResetAfterAnimation()
  }

  const closeAndResetAfterAnimation = () => {
    onClose()
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current)

    resetTimerRef.current = window.setTimeout(() => {
      resetTimerRef.current = null
      resetSheetState()
    }, 320)
  }

  useEffect(() => () => {
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current)
    if (favoriteRemovalTimerRef.current !== null) window.clearTimeout(favoriteRemovalTimerRef.current)
    if (favoriteDropTimerRef.current !== null) window.clearTimeout(favoriteDropTimerRef.current)
    if (favoriteCommitTimerRef.current !== null) window.clearTimeout(favoriteCommitTimerRef.current)
    if (accordionScrollStartFrameRef.current !== null) window.cancelAnimationFrame(accordionScrollStartFrameRef.current)
    if (accordionScrollFrameRef.current !== null) window.cancelAnimationFrame(accordionScrollFrameRef.current)
    if (favoriteDragFrameRef.current !== null) window.cancelAnimationFrame(favoriteDragFrameRef.current)
  }, [])

  const toggleSportAccordion = (sportId: string) => {
    const willOpen = openSportId !== sportId
    setOpenSportId(willOpen ? sportId : null)
  }

  useLayoutEffect(() => {
    if (!isOpen || !openSportId) return

    const sportId = openSportId
    accordionScrollTargetRef.current = sportId

    accordionScrollStartFrameRef.current = window.requestAnimationFrame(() => {
      accordionScrollStartFrameRef.current = null

      const content = contentRef.current
      const scrollContainer = content?.closest<HTMLElement>('.bottom-sheet__body')
      const sportRow = content?.querySelector<HTMLElement>(
        `[data-sport-id="${sportId}"].more-sports-v2__sport-row--open`
      )
      if (!scrollContainer || !sportRow || accordionScrollTargetRef.current !== sportId) return

      const initialSportTop = sportRow.getBoundingClientRect().top
      const startTime = window.performance.now()

      const correctScrollPosition = (targetTop: number) => {
        const sportTop = sportRow.getBoundingClientRect().top
        const correction = sportTop - targetTop
        if (Math.abs(correction) < 0.5) return

        const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight)
        scrollContainer.scrollTop = Math.max(0, Math.min(scrollContainer.scrollTop + correction, maxScrollTop))
      }

      const step = (currentTime: number) => {
        if (accordionScrollTargetRef.current !== sportId) {
          accordionScrollFrameRef.current = null
          return
        }

        const elapsed = currentTime - startTime
        const scrollProgress = Math.min(elapsed / accordionScrollDuration, 1)
        const easedProgress = 1 - Math.pow(1 - scrollProgress, 3)
        const stickyTop = scrollContainer.getBoundingClientRect().top
        const desiredTop = initialSportTop + (stickyTop - initialSportTop) * easedProgress

        correctScrollPosition(desiredTop)

        if (elapsed < accordionLayoutDuration) {
          accordionScrollFrameRef.current = window.requestAnimationFrame(step)
          return
        }

        correctScrollPosition(scrollContainer.getBoundingClientRect().top)
        accordionScrollFrameRef.current = null
      }

      accordionScrollFrameRef.current = window.requestAnimationFrame(step)
    })

    return () => {
      if (accordionScrollStartFrameRef.current !== null) {
        window.cancelAnimationFrame(accordionScrollStartFrameRef.current)
        accordionScrollStartFrameRef.current = null
      }
      if (accordionScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(accordionScrollFrameRef.current)
        accordionScrollFrameRef.current = null
      }
      if (accordionScrollTargetRef.current === sportId) {
        accordionScrollTargetRef.current = null
      }
    }
  }, [isOpen, openSportId])

  useEffect(() => {
    const content = contentRef.current
    const scrollContainer = content?.closest<HTMLElement>('.bottom-sheet__body')
    if (!isOpen || !openSportId || !content || !scrollContainer) {
      setIsOpenSportSticky(false)
      return
    }

    const updateStickyState = () => {
      const sportActions = content.querySelector<HTMLElement>(
        '.more-sports-v2__sport-row--open .more-sports-v2__sport-actions'
      )
      if (!sportActions) return setIsOpenSportSticky(false)

      const scrollTop = scrollContainer.getBoundingClientRect().top
      const actionsRect = sportActions.getBoundingClientRect()
      const isSticky = actionsRect.top <= scrollTop + 1 && actionsRect.bottom > scrollTop + 1
      setIsOpenSportSticky((current) => current === isSticky ? current : isSticky)
    }

    updateStickyState()
    scrollContainer.addEventListener('scroll', updateStickyState, { passive: true })
    window.addEventListener('resize', updateStickyState)

    return () => {
      scrollContainer.removeEventListener('scroll', updateStickyState)
      window.removeEventListener('resize', updateStickyState)
    }
  }, [isOpen, openSportId])

  const handleSelectCompetition = (target: CompetitionLinkTarget) => {
    if (
      !onSelectCompetition
      || !isCompetitionEnabled(target.id)
      || !isCompetitionRailClickable(target.sport)
    ) return

    onSelectCompetition(target)
    closeAndResetAfterAnimation()
  }

  const handleToggleFavorite = (target: CompetitionLinkTarget) => {
    const key = getCompetitionKey(target)
    const isAlreadyFavorite = favoriteKeys.has(key)

    setFavoriteAnimation({
      key,
      action: isAlreadyFavorite ? 'removing' : 'adding',
    })
    onToggleFavorite(target)
  }

  const getSportLabel = (sportId: string) => (
    sportsById.get(sportId)?.label ?? sportId
  )

  const renderStarButton = (
    target: CompetitionLinkTarget,
    className: string,
    labelPrefix?: string
  ) => {
    const key = getCompetitionKey(target)
    const isFavorite = favoriteKeys.has(key)
    const animationClass = favoriteAnimation?.key === key
      ? ` more-sports-v2__favorite-star--${favoriteAnimation.action}`
      : ''

    return (
      <button
        type="button"
        className={`${className}${isFavorite ? ` ${className}--active` : ''}${animationClass}`}
        aria-label={labelPrefix ?? `${isFavorite ? 'Remover' : 'Adicionar'} ${target.name} ${isFavorite ? 'dos' : 'aos'} favoritos`}
        aria-pressed={isFavorite}
        disabled={isFavorite && removingFavoriteKey !== null}
        onClick={() => isFavorite ? requestFavoriteRemoval(target) : handleToggleFavorite(target)}
        onAnimationEnd={() => {
          if (favoriteAnimation?.key === key) setFavoriteAnimation(null)
        }}
      >
        <img src={isFavorite ? iconFavoritoAtivo : iconFavorito} alt="" aria-hidden="true" />
      </button>
    )
  }

  const setDropTargetFromClientY = (clientY: number) => {
    const drag = favoriteDragRef.current
    if (!drag) return
    const listRect = favoriteOrderListRef.current?.getBoundingClientRect()
    if (!listRect) return

    const draggedCenter = clientY - drag.grabOffsetY + drag.height / 2
    const firstRowCenter = listRect.top + drag.height / 2
    const targetIndex = Math.max(
      0,
      Math.min(
        favoriteCompetitions.length - 1,
        Math.round((draggedCenter - firstRowCenter) / favoriteOrderRowHeight)
      )
    )

    const nextDrag = { ...drag, clientY, targetIndex }
    favoriteDragRef.current = nextDrag

    if (targetIndex !== drag.targetIndex) setFavoriteDrag(nextDrag)
  }

  const paintFavoriteDragPosition = (clientY: number) => {
    const drag = favoriteDragRef.current
    if (!drag) return
    favoriteDragRef.current = { ...drag, clientY }

    if (favoriteDragFrameRef.current !== null) return
    favoriteDragFrameRef.current = window.requestAnimationFrame(() => {
      favoriteDragFrameRef.current = null
      const currentDrag = favoriteDragRef.current
      if (!currentDrag || !favoriteDragOverlayRef.current) return
      favoriteDragOverlayRef.current.style.top = `${currentDrag.clientY - currentDrag.grabOffsetY}px`
    })
  }

  const handleFavoritePointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    competition: CompetitionLinkTarget,
    index: number
  ) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    const itemEl = favoriteOrderItemRefs.current.get(getCompetitionKey(competition))
    if (!itemEl) return

    event.preventDefault()
    if (favoriteDropTimerRef.current !== null) window.clearTimeout(favoriteDropTimerRef.current)
    if (favoriteCommitTimerRef.current !== null) window.clearTimeout(favoriteCommitTimerRef.current)
    favoriteDropTimerRef.current = null
    favoriteCommitTimerRef.current = null
    setFavoriteDrop(null)
    setIsCommittingFavoriteDrag(false)
    event.currentTarget.setPointerCapture(event.pointerId)
    const itemRect = itemEl.getBoundingClientRect()
    setKeyboardSort(null)
    const nextDrag: FavoriteDragState = {
      key: getCompetitionKey(competition),
      pointerId: event.pointerId,
      startIndex: index,
      targetIndex: index,
      clientY: event.clientY,
      grabOffsetY: event.clientY - itemRect.top,
      left: itemRect.left,
      width: itemRect.width,
      height: itemRect.height,
    }
    favoriteDragRef.current = nextDrag
    setFavoriteDrag(nextDrag)
    setSortAnnouncement(`${competition.name} selecionada para ordenar.`)
  }

  const animateFavoriteDrop = (drag: FavoriteDragState, targetIndex: number) => {
    if (favoriteDropTimerRef.current !== null) window.clearTimeout(favoriteDropTimerRef.current)
    if (favoriteDragFrameRef.current !== null) window.cancelAnimationFrame(favoriteDragFrameRef.current)
    favoriteDragFrameRef.current = null
    favoriteDragRef.current = null
    const listRect = favoriteOrderListRef.current?.getBoundingClientRect()
    const settledTop = listRect
      ? listRect.top + targetIndex * favoriteOrderRowHeight
      : drag.clientY - drag.grabOffsetY
    setFavoriteDrag(null)
    setFavoriteDrop({
      ...drag,
      targetIndex,
      clientY: settledTop + drag.grabOffsetY,
    })
    favoriteDropTimerRef.current = window.setTimeout(() => {
      favoriteDropTimerRef.current = null
      setFavoriteDrop(null)
    }, 180)
  }

  const handleFavoritePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = favoriteDragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    event.preventDefault()

    const scrollableBody = contentRef.current?.closest<HTMLElement>('.bottom-sheet__body')
    if (scrollableBody) {
      const bodyRect = scrollableBody.getBoundingClientRect()
      const edgeSize = 56
      const topDistance = event.clientY - bodyRect.top
      const bottomDistance = bodyRect.bottom - event.clientY
      if (topDistance < edgeSize) {
        scrollableBody.scrollTop -= Math.ceil((1 - Math.max(0, topDistance) / edgeSize) * 14)
      } else if (bottomDistance < edgeSize) {
        scrollableBody.scrollTop += Math.ceil((1 - Math.max(0, bottomDistance) / edgeSize) * 14)
      }
    }

    paintFavoriteDragPosition(event.clientY)
    setDropTargetFromClientY(event.clientY)
  }

  const finishFavoritePointerSort = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = favoriteDragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    const { startIndex, targetIndex, key } = drag
    const competition = favoriteCompetitions.find((favorite) => getCompetitionKey(favorite) === key)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (startIndex !== targetIndex) {
      setIsCommittingFavoriteDrag(true)
      onMoveFavorite(startIndex, targetIndex)
      if (favoriteCommitTimerRef.current !== null) window.clearTimeout(favoriteCommitTimerRef.current)
      favoriteCommitTimerRef.current = window.setTimeout(() => {
        favoriteCommitTimerRef.current = null
        setIsCommittingFavoriteDrag(false)
      }, 48)
    }
    animateFavoriteDrop(drag, targetIndex)
    if (competition) setSortAnnouncement(`${competition.name} movida para a posição ${targetIndex + 1}.`)
  }

  const cancelFavoritePointerSort = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = favoriteDragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    animateFavoriteDrop(drag, drag.startIndex)
    setSortAnnouncement('Ordenação cancelada.')
  }

  const handleFavoriteSortKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    competition: CompetitionLinkTarget,
    index: number
  ) => {
    const key = getCompetitionKey(competition)
    const isPickedUp = keyboardSort?.key === key

    if (!isPickedUp && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault()
      setFavoriteDrag(null)
      setKeyboardSort({ key, startIndex: index, targetIndex: index })
      setSortAnnouncement(`${competition.name} selecionada. Use as setas para mover.`)
      return
    }

    if (!isPickedUp || !keyboardSort) return

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      const delta = event.key === 'ArrowUp' ? -1 : 1
      const targetIndex = Math.max(
        0,
        Math.min(favoriteCompetitions.length - 1, keyboardSort.targetIndex + delta)
      )
      setKeyboardSort({ ...keyboardSort, targetIndex })
      setSortAnnouncement(`${competition.name}, posição ${targetIndex + 1} de ${favoriteCompetitions.length}.`)
      return
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      if (keyboardSort.startIndex !== keyboardSort.targetIndex) {
        onMoveFavorite(keyboardSort.startIndex, keyboardSort.targetIndex)
      }
      setKeyboardSort(null)
      setSortAnnouncement(`${competition.name} movida para a posição ${keyboardSort.targetIndex + 1}.`)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setKeyboardSort(null)
      setSortAnnouncement('Ordenação cancelada.')
    }
  }

  const toggleOrderingMode = () => {
    if (isOrderingFavorites && keyboardSort && keyboardSort.startIndex !== keyboardSort.targetIndex) {
      onMoveFavorite(keyboardSort.startIndex, keyboardSort.targetIndex)
    }
    setFavoriteDrag(null)
    setKeyboardSort(null)
    setIsOrderingFavorites((current) => !current)
  }

  const requestFavoriteRemoval = (competition: CompetitionLinkTarget) => {
    const key = getCompetitionKey(competition)
    if (removingFavoriteKey || favoriteRemovalTimerRef.current !== null) return

    setRemovingFavoriteKey(key)
    setFavoriteAnimation(null)
    if (favoriteDrag?.key === key) setFavoriteDrag(null)
    if (keyboardSort?.key === key) setKeyboardSort(null)
    setSortAnnouncement(`Removendo ${competition.name} dos favoritos.`)

    favoriteRemovalTimerRef.current = window.setTimeout(() => {
      favoriteRemovalTimerRef.current = null
      onToggleFavorite(competition)
      if (favoriteCompetitions.length === 1) {
        setIsOrderingFavorites(false)
        setIsFavoritesEmptyEntering(true)
      }
      setRemovingFavoriteKey(null)
      setSortAnnouncement(`${competition.name} foi removida dos favoritos.`)
    }, 240)
  }

  const getFavoriteDragOffset = (index: number, key: string) => {
    if (!favoriteDrag) return 0
    const { startIndex, targetIndex } = favoriteDrag

    if (key === favoriteDrag.key) return (targetIndex - startIndex) * favoriteOrderRowHeight
    if (startIndex < targetIndex && index > startIndex && index <= targetIndex) return -favoriteOrderRowHeight
    if (startIndex > targetIndex && index >= targetIndex && index < startIndex) return favoriteOrderRowHeight
    return 0
  }

  const renderFavoriteCard = (competition: CompetitionLinkTarget) => {
    const key = getCompetitionKey(competition)
    const canOpen = (
      !!onSelectCompetition
      && isCompetitionEnabled(competition.id)
      && isCompetitionRailClickable(competition.sport)
    )
    const isAdding = favoriteAnimation?.key === key && favoriteAnimation.action === 'adding'
    const isRemoving = removingFavoriteKey === key

    return (
      <li
        className={`more-sports-v2__favorite-card${isAdding ? ' more-sports-v2__favorite-card--adding' : ''}${isRemoving ? ' more-sports-v2__favorite-card--removing' : ''}`}
        key={key}
      >
        {renderStarButton(
          competition,
          'more-sports-v2__favorite-card-star',
          `Remover ${competition.name} dos favoritos`
        )}
        <button
          type="button"
          className="more-sports-v2__favorite-card-main"
          disabled={!canOpen}
          onClick={() => handleSelectCompetition(competition)}
          aria-label={`Abrir ${competition.name}`}
        >
          <span className="more-sports-v2__favorite-card-copy">
            <span className="more-sports-v2__favorite-card-name">{competition.name}</span>
            <span className="more-sports-v2__favorite-card-sport">{getSportLabel(competition.sport)}</span>
          </span>
        </button>
      </li>
    )
  }

  const renderFavoriteOrdering = () => (
    <ul
      ref={favoriteOrderListRef}
      className={`more-sports-v2__favorite-order-list${isCommittingFavoriteDrag ? ' more-sports-v2__favorite-order-list--committing' : ''}`}
    >
      {orderingFavorites.map((competition, index) => {
        const key = getCompetitionKey(competition)
        const isDragging = favoriteDrag?.key === key
        const isKeyboardPicked = keyboardSort?.key === key
        const isRemoving = removingFavoriteKey === key
        const dragOffset = getFavoriteDragOffset(index, key)
        const originalIndex = favoriteCompetitions.findIndex((favorite) => getCompetitionKey(favorite) === key)

        return (
          <li
            key={key}
            ref={(element) => {
              if (element) favoriteOrderItemRefs.current.set(key, element)
              else favoriteOrderItemRefs.current.delete(key)
            }}
            className={`more-sports-v2__favorite-order-item${isDragging ? ' more-sports-v2__favorite-order-item--dragging' : ''}${isKeyboardPicked ? ' more-sports-v2__favorite-order-item--keyboard' : ''}${isRemoving ? ' more-sports-v2__favorite-order-item--removing' : ''}`}
            style={favoriteDrag ? { transform: `translate3d(0, ${dragOffset}px, 0)` } : undefined}
          >
            <button
              type="button"
              className="more-sports-v2__favorite-remove-button"
              aria-label={`Remover ${competition.name} dos favoritos`}
              disabled={isRemoving}
              onClick={() => requestFavoriteRemoval(competition)}
            >
              <img src={iconCloseEvents} alt="" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="more-sports-v2__favorite-drag-area"
              aria-label={`Reordenar ${competition.name}. Posição ${index + 1} de ${favoriteCompetitions.length}`}
              aria-pressed={isDragging || isKeyboardPicked}
              disabled={isRemoving}
              onPointerDown={(event) => handleFavoritePointerDown(event, competition, originalIndex)}
              onPointerMove={handleFavoritePointerMove}
              onPointerUp={finishFavoritePointerSort}
              onPointerCancel={cancelFavoritePointerSort}
              onKeyDown={(event) => handleFavoriteSortKeyDown(event, competition, originalIndex)}
            >
              <span className="more-sports-v2__favorite-order-copy">
                <span>{competition.name}</span>
                <small>{getSportLabel(competition.sport)}</small>
              </span>
              <img src={iconOrdenacao} alt="" />
            </button>
          </li>
        )
      })}
    </ul>
  )

  const renderFavorites = () => {
    if (favoriteCompetitions.length === 0) {
      return (
        <div
          className={`more-sports-v2__favorites-empty${isFavoritesEmptyEntering ? ' more-sports-v2__favorites-empty--entering' : ''}`}
          onAnimationEnd={() => setIsFavoritesEmptyEntering(false)}
        >
          <p>Toque na estrela de uma competição para adicioná-la aos favoritos.</p>
          <span className="more-sports-v2__favorites-empty-illustration" aria-hidden="true">
            <img src={marcacao} alt="" className="more-sports-v2__favorites-empty-mark" />
            <img src={iconFavorito} alt="" className="more-sports-v2__favorites-empty-star" />
          </span>
        </div>
      )
    }

    if (isOrderingFavorites) return renderFavoriteOrdering()

    return (
      <ul className="more-sports-v2__favorite-cards">
        {favoriteCompetitions.map(renderFavoriteCard)}
      </ul>
    )
  }

  const renderCompetitionRows = (competitions: MenuCompetition[]) => {
    const orderedCompetitions = [
      ...competitions.filter((competition) => isCompetitionEnabled(competition.id)),
      ...competitions.filter((competition) => !isCompetitionEnabled(competition.id)),
    ]

    return (
      <ul className="more-sports-v2__competition-list">
        {orderedCompetitions.map((competition) => {
        const competitionListLabel = getCompetitionListLabel(competition)
        const canOpen = (
          !!onSelectCompetition
          && isCompetitionEnabled(competition.id)
          && isCompetitionRailClickable(competition.sport)
        )

        return (
          <li key={competition.id} className="more-sports-v2__competition-item">
            {renderStarButton(competition, 'more-sports-v2__competition-star')}
            <button
              type="button"
              className={`more-sports-v2__competition-main${canOpen ? '' : ' more-sports-v2__competition-main--disabled'}`}
              disabled={!canOpen}
              onClick={() => handleSelectCompetition(competition)}
              aria-label={`Abrir ${competitionListLabel}`}
            >
              <span className="more-sports-v2__competition-name">{competitionListLabel}</span>
              <span className="more-sports-v2__competition-count" aria-label={`${competition.gameCount} jogos disponíveis`}>
                {competition.gameCount}
              </span>
            </button>
          </li>
        )
        })}
      </ul>
    )
  }

  const renderSportsList = () => (
    <ul className="more-sports-v2__sport-list" aria-label="Esportes">
      {sports.map((sport) => {
        const isOpen = openSportId === sport.id
        const hasCompetitions = sport.competitions.length > 0
        const canSelectSport = !!onSelectSport && selectableSportIds.has(sport.id)
        const isActive = activeSport === sport.id

        return (
          <li
            key={sport.id}
            data-sport-id={sport.id}
            className={`more-sports-v2__sport-row${isOpen ? ' more-sports-v2__sport-row--open' : ''}`}
          >
            <div className={`more-sports-v2__sport-actions${hasCompetitions ? '' : ' more-sports-v2__sport-actions--no-competitions'}${isOpen && isOpenSportSticky ? ' more-sports-v2__sport-actions--stuck' : ''}`}>
              <button
                type="button"
                className="more-sports-v2__sport-main"
                disabled={!canSelectSport}
                onClick={() => handleSelectSport(sport.id)}
                aria-current={isActive ? 'true' : undefined}
              >
                <img src={sport.icon} alt="" className="more-sports-v2__sport-icon" />
                <span className="more-sports-v2__sport-label">{sport.label}</span>
              </button>
              {hasCompetitions ? (
                <button
                  type="button"
                  className="more-sports-v2__sport-toggle"
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? 'Fechar' : 'Ver'} competições de ${sport.label}`}
                  onClick={() => toggleSportAccordion(sport.id)}
                >
                  <img
                    src={chevronUp}
                    alt=""
                    className={`more-sports-v2__sport-chevron${isOpen ? ' more-sports-v2__sport-chevron--open' : ''}`}
                  />
                </button>
              ) : null}
            </div>
            {hasCompetitions ? (
              <AccordionCollapse isOpen={isOpen}>
                {renderCompetitionRows(sport.competitions)}
              </AccordionCollapse>
            ) : null}
          </li>
        )
      })}
    </ul>
  )

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleCloseSheet}
        title="Esportes e competições"
        sheetClassName="more-sports-v2"
        bodyClassName="more-sports-v2__body"
        blurBackdrop
      >
        <div ref={contentRef} className="more-sports-v2__root">
          <section className="more-sports-v2__favorites">
            <div className="more-sports-v2__section-heading">
              <h2>Favoritos</h2>
              {canConfigureFavorites ? (
                <button type="button" onClick={toggleOrderingMode}>
                  {isOrderingFavorites ? 'Concluir' : 'Ordenar'}
                </button>
              ) : null}
            </div>
            {renderFavorites()}
          </section>

          <section className="more-sports-v2__all-sports">
            <div className="more-sports-v2__section-heading">
              <h2>Todos os esportes</h2>
            </div>
            {renderSportsList()}
          </section>
          <span className="more-sports-v2__sr-only" aria-live="polite">{sortAnnouncement}</span>
        </div>
      </BottomSheet>

      {activeDragOverlay && draggedCompetition ? createPortal(
        <div
          ref={favoriteDragOverlayRef}
          className={`more-sports-v2__favorite-drag-overlay${favoriteDrop ? ' more-sports-v2__favorite-drag-overlay--dropping' : ''}`}
          style={{
            top: activeDragOverlay.clientY - activeDragOverlay.grabOffsetY,
            left: activeDragOverlay.left,
            width: activeDragOverlay.width,
            height: activeDragOverlay.height,
          }}
          aria-hidden="true"
        >
          <img src={iconCloseEvents} alt="" />
          <span>
            <strong>{draggedCompetition.name}</strong>
            <small>{getSportLabel(draggedCompetition.sport)}</small>
          </span>
          <img src={iconOrdenacao} alt="" />
        </div>,
        document.body
      ) : null}
    </>
  )
}
