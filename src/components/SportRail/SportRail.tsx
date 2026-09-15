import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'
import './SportRail.css'

import iconDestaque from '../../assets/iconSports/fire.png'
import iconBasquete from '../../assets/iconSports/basketball.png'
import iconBrasileirao from '../../assets/iconSports/brasileirao.png'
import iconBundesligaRailLight from '../../assets/iconSports/bundesliga-rail-text-333.png'
import iconChampions from '../../assets/iconSports/champions.png'
import iconCsgo from '../../assets/iconSports/csgo.png'
import iconEsoccer from '../../assets/iconSports/e-soccer.png'
import iconFutebol from '../../assets/iconSports/soccer.png'
import iconLibertadores from '../../assets/iconSports/libertadores.png'
import iconNfl from '../../assets/iconSports/football.png'
import iconMore from '../../assets/iconsDraftaco/iconDotDefault.png'
import iconPremier from '../../assets/iconSports/premier.png'
import iconTenis from '../../assets/iconSports/tennis.png'
import lineFavorito from '../../assets/iconsDraftaco/lineFavorito.svg'
import { getCompetitionRailBadge } from '../../data/competitionBadges'
import { useFavoriteCompetitions } from '../../shared/hooks/useFavoriteCompetitions'
import { useFeatureFlags } from '../../shared/hooks/useFeatureFlags'
import { isCompetitionEnabled, isCompetitionRailClickable } from '../SportFilterBar/competicaoData'
import type { ProductRailBaseItem, ProductRailSection } from '../../shared/types/home'
import { getRailCompetitionId, type CompetitionLinkTarget } from '../../shared/utils/competitionNavigation'
import { MoreSportsBottomSheet, MoreSportsBottomSheetV2 } from '../BottomSheet'

interface SportRailBaseItem extends ProductRailBaseItem {
  type: 'sport' | 'competition' | 'more'
  isFavorite?: boolean
}

interface SportRailSportItem extends SportRailBaseItem {
  type: 'sport'
  sportId: string
}

interface SportRailCompetitionItem extends SportRailBaseItem {
  type: 'competition'
  sportId: string
  competitionId: string
  competitionName: string
}

interface SportRailMoreItem extends SportRailBaseItem {
  type: 'more'
  isMore: true
}

type SportRailItem = SportRailSportItem | SportRailCompetitionItem | SportRailMoreItem

interface SportRailProps {
  activeSport?: string | null
  selectedCompetitionId?: string | null
  selectedCompetitionName?: string | null
  extraCompetitions?: CompetitionLinkTarget[]
  disableInteractions?: boolean
  allowHighlightsInteraction?: boolean
  allowCompetitionInteraction?: boolean
  onSportChange?: (sportId: string) => void
  onOpenCompetition?: (target: CompetitionLinkTarget) => void
}

interface ProductRailProps<TItem extends ProductRailBaseItem> {
  sections: ProductRailSection<TItem>[]
  activeItemId: string
  isSportPage?: boolean
  disableInteractions?: boolean
  allowMoreItemInteraction?: boolean
  allowDisabledItemInteraction?: (item: TItem) => boolean
  renderAfter?: ReactNode
  getScrollAnchorId?: (item: TItem | undefined) => string | null
  hasLiveIndicator?: (item: TItem) => boolean
  hasFavoriteIndicator?: (item: TItem) => boolean
  onSelectItem?: (item: TItem) => void
}

const competitionRailSections: ProductRailSection<SportRailItem>[] = [
  {
    id: 'destaques',
    className: 'sport-rail__section--lead',
    items: [
      {
        id: 'destaques',
        type: 'sport',
        sportId: 'destaques',
        icon: iconDestaque,
        label: 'Destaques',
        clickable: true,
      },
    ],
  },
  {
    id: 'futebol',
    className: 'sport-rail__section--divided',
    items: [
      {
        id: 'futebol',
        type: 'sport',
        sportId: 'futebol',
        icon: iconFutebol,
        label: 'Futebol',
        clickable: true,
      },
      {
        id: 'competition:fut-brasileiro',
        type: 'competition',
        sportId: 'futebol',
        competitionId: 'fut-brasileiro',
        competitionName: 'Brasileirão Série A',
        icon: iconBrasileirao,
        label: 'Brasileirão',
        clickable: true,
      },
      {
        id: 'competition:fut-champions',
        type: 'competition',
        sportId: 'futebol',
        competitionId: 'fut-champions',
        competitionName: 'Champions League',
        icon: iconChampions,
        label: 'Champions',
        clickable: true,
      },
      {
        id: 'competition:fut-premier-league',
        type: 'competition',
        sportId: 'futebol',
        competitionId: 'fut-premier-league',
        competitionName: 'Premier League',
        icon: iconPremier,
        label: 'Premier',
        clickable: true,
      },
      {
        id: 'competition:fut-libertadores',
        type: 'competition',
        sportId: 'futebol',
        competitionId: 'fut-libertadores',
        competitionName: 'Libertadores',
        icon: iconLibertadores,
        label: 'Libertadores',
        clickable: true,
      },
      {
        id: 'competition:fut-bundesliga',
        type: 'competition',
        sportId: 'futebol',
        competitionId: 'fut-bundesliga',
        competitionName: 'Bundesliga',
        icon: getCompetitionRailBadge('fut-bundesliga', iconFutebol),
        lightIcon: iconBundesligaRailLight,
        label: 'Bundesliga',
        clickable: true,
      },
    ],
  },
  {
    id: 'basquete',
    className: 'sport-rail__section--divided sport-rail__section--compact',
    items: [
      {
        id: 'basquete',
        type: 'sport',
        sportId: 'basquete',
        icon: iconBasquete,
        label: 'Basquete',
        clickable: true,
      },
      {
        id: 'competition:bsq-nba',
        type: 'competition',
        sportId: 'basquete',
        competitionId: 'bsq-nba',
        competitionName: 'NBA',
        icon: getCompetitionRailBadge('bsq-nba', iconBasquete),
        label: 'NBA',
        clickable: true,
      },
    ],
  },
  {
    id: 'nfl',
    className: 'sport-rail__section--divided',
    items: [
      {
        id: 'competition:nfl-liga',
        type: 'competition',
        sportId: 'nfl',
        competitionId: 'nfl-liga',
        competitionName: 'NFL',
        icon: getCompetitionRailBadge('nfl-liga', iconNfl),
        label: 'NFL',
        clickable: true,
      },
    ],
  },
  {
    id: 'tenis',
    className: 'sport-rail__section--divided',
    items: [
      {
        id: 'tenis',
        type: 'sport',
        sportId: 'tenis',
        icon: iconTenis,
        label: 'Tênis',
        clickable: false,
      },
      {
        id: 'competition:ten-roma-masters',
        type: 'competition',
        sportId: 'tenis',
        competitionId: 'ten-roma-masters',
        competitionName: 'Roma Masters',
        icon: getCompetitionRailBadge('ten-roma-masters', iconTenis),
        label: 'Roma',
        clickable: false,
      },
    ],
  },
  {
    id: 'esoccer',
    className: 'sport-rail__section--divided',
    items: [
      {
        id: 'esoccer',
        type: 'sport',
        sportId: 'esoccer',
        icon: iconEsoccer,
        label: 'Esoccer',
        clickable: false,
      },
    ],
  },
  {
    id: 'cs',
    className: 'sport-rail__section--divided',
    items: [
      {
        id: 'cs',
        type: 'sport',
        sportId: 'cs',
        icon: iconCsgo,
        label: 'CS',
        clickable: false,
      },
    ],
  },
  {
    id: 'outros',
    className: 'sport-rail__section--tail',
    items: [
      {
        id: 'outros',
        type: 'more',
        icon: iconMore,
        label: 'Mais',
        clickable: true,
        isMore: true,
      },
    ],
  },
]

const liveSports = ['futebol', 'basquete', 'tenis']

const liveCompetitionIds = new Set([
  'fut-brasileiro',
  'fut-brasileirao-a',
  'fut-champions',
  'fut-premier-league',
  'fut-libertadores',
  'fut-laliga',
  'fut-mls',
  'fut-bundesliga',
  'brasil-serie-a',
  'champions-league',
  'premier-league',
  'la-liga',
  'mls',
  'bundesliga',
  'bsq-nba',
  'bsq-nba-2',
  'bsq-ncaab',
  'bsq-nbb',
  'bsq-br-nbb',
  'nba',
  'ncaab',
  'brasil-nbb',
  'eurocup-women',
  'ten-roma-masters',
  'ten-parma-f',
  'ten-bordeaux',
])

const hasSportRailLiveIndicator = (item: SportRailItem) => {
  if (item.type === 'sport') return liveSports.includes(item.sportId)
  if (item.type === 'competition') return liveCompetitionIds.has(item.competitionId)
  return false
}

const setProductRailActiveIndicator = (
  listEl: HTMLDivElement | null,
  activeItem: HTMLElement | null | undefined
): boolean => {
  const activeIcon = activeItem?.querySelector<HTMLElement>('.sport-rail__icon')

  if (!listEl || !activeIcon) {
    return false
  }

  const listRect = listEl.getBoundingClientRect()
  const iconRect = activeIcon.getBoundingClientRect()

  listEl.style.setProperty('--sport-rail-active-x', `${iconRect.left - listRect.left}px`)
  listEl.style.setProperty('--sport-rail-active-y', `${iconRect.top - listRect.top}px`)
  listEl.style.setProperty('--sport-rail-active-width', `${iconRect.width}px`)
  listEl.style.setProperty('--sport-rail-active-height', `${iconRect.height}px`)
  return true
}

const getDefaultProductRailScrollAnchorId = <TItem extends ProductRailBaseItem>(
  item: TItem | undefined
) => item?.id ?? null

const productRailGap = 12

const getProductRailGap = () => productRailGap

const getSportRailScrollAnchorId = (item: SportRailItem | undefined) => {
  if (!item) return null
  return item.id
}

const getSportRailFallbackIcon = (sportId: string) => {
  if (sportId === 'basquete') return iconBasquete
  if (sportId === 'tenis') return iconTenis
  if (sportId === 'futebol') return iconFutebol
  if (sportId === 'nfl') return iconNfl
  return ''
}

const getDynamicCompetitionLabel = (competitionName: string) =>
  competitionName.replace(/^.+ - /, '')

const createDynamicCompetitionItem = (
  competitionId: string,
  competitionName: string,
  sportId: string
): SportRailCompetitionItem => ({
  id: `competition:${competitionId}`,
  type: 'competition',
  sportId,
  competitionId,
  competitionName,
  icon: getCompetitionRailBadge(competitionId, getSportRailFallbackIcon(sportId)),
  label: getDynamicCompetitionLabel(competitionName),
  clickable: isCompetitionRailClickable(sportId),
})

export function ProductRail<TItem extends ProductRailBaseItem>({
  sections,
  activeItemId,
  isSportPage = false,
  disableInteractions = false,
  allowMoreItemInteraction = false,
  allowDisabledItemInteraction,
  renderAfter,
  getScrollAnchorId = getDefaultProductRailScrollAnchorId,
  hasLiveIndicator,
  hasFavoriteIndicator,
  onSelectItem,
}: ProductRailProps<TItem>) {
  const [gap, setGap] = useState(() => getProductRailGap())
  const [hasMoreItemsLeft, setHasMoreItemsLeft] = useState(false)
  const [hasMoreItemsRight, setHasMoreItemsRight] = useState(false)
  const [hasUserScrolledRail, setHasUserScrolledRail] = useState(false)
  const [isRailScrolledFromStart, setIsRailScrolledFromStart] = useState(false)
  const [isActiveIndicatorReady, setIsActiveIndicatorReady] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  const hasUserScrolledRailRef = useRef(false)
  const hasAlignedActiveScrollRef = useRef(false)
  const flatRailItems = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections]
  )
  const railItemsKey = useMemo(
    () => flatRailItems.map((item) => item.id).join('|'),
    [flatRailItems]
  )
  const liveIndicatorKey = useMemo(
    () => flatRailItems
      .filter((item) => hasLiveIndicator?.(item))
      .map((item) => item.id)
      .join('|'),
    [flatRailItems, hasLiveIndicator]
  )
  const activeRailItemIndex = flatRailItems.findIndex((item) => item.id === activeItemId)
  const activeScrollAnchorItemId = getScrollAnchorId(flatRailItems[activeRailItemIndex])
  const activeScrollAnchorIndex = flatRailItems.findIndex((item) => item.id === activeScrollAnchorItemId)

  const resetRailUserScrollHint = useCallback(() => {
    hasUserScrolledRailRef.current = false
    setHasUserScrolledRail(false)
    setHasMoreItemsLeft(false)
  }, [])

  useLayoutEffect(() => {
    const railList = listRef.current
    if (!railList || !liveIndicatorKey) return

    const liveDots = Array.from(railList.querySelectorAll<HTMLElement>('.sport-rail__live-dot'))
    if (liveDots.length === 0) return

    liveDots.forEach((liveDot) => liveDot.classList.add('sport-rail__live-dot--syncing'))
    void railList.offsetWidth
    liveDots.forEach((liveDot) => liveDot.classList.remove('sport-rail__live-dot--syncing'))
  }, [liveIndicatorKey, railItemsKey])

  const updateActiveIndicator = useCallback(() => {
    const isReady = setProductRailActiveIndicator(
      listRef.current,
      itemRefs.current[activeRailItemIndex]
    )

    setIsActiveIndicatorReady((current) => (
      current === isReady ? current : isReady
    ))
  }, [activeRailItemIndex])

  useLayoutEffect(() => {
    const calculateGap = () => {
      setGap(getProductRailGap())
    }

    calculateGap()
    window.addEventListener('resize', calculateGap)
    return () => window.removeEventListener('resize', calculateGap)
  }, [])

  useLayoutEffect(() => {
    updateActiveIndicator()
  }, [gap, updateActiveIndicator])

  useEffect(() => {
    const listEl = listRef.current
    const containerEl = listEl?.parentElement
    if (!listEl || !containerEl) return

    let frame: number | null = null

    const updateScrollHint = () => {
      frame = null
      const nextIsRailScrolledFromStart = containerEl.scrollLeft > 2
      const nextHasMoreItemsLeft =
        hasUserScrolledRailRef.current && nextIsRailScrolledFromStart
      const nextHasMoreItemsRight =
        containerEl.scrollLeft + containerEl.clientWidth < containerEl.scrollWidth - 2

      setIsRailScrolledFromStart((current) => (
        current === nextIsRailScrolledFromStart ? current : nextIsRailScrolledFromStart
      ))
      setHasMoreItemsLeft((current) => (
        current === nextHasMoreItemsLeft ? current : nextHasMoreItemsLeft
      ))
      setHasMoreItemsRight((current) => (
        current === nextHasMoreItemsRight ? current : nextHasMoreItemsRight
      ))
    }

    const scheduleUpdate = () => {
      if (frame !== null) return
      frame = window.requestAnimationFrame(updateScrollHint)
    }

    const markUserScrolledRail = () => {
      if (!hasUserScrolledRailRef.current) {
        hasUserScrolledRailRef.current = true
        setHasUserScrolledRail(true)
      }

      scheduleUpdate()
    }

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) > 0 || (event.shiftKey && Math.abs(event.deltaY) > 0)) {
        markUserScrolledRail()
      }
    }

    let isPointerDown = false
    const handlePointerDown = () => {
      isPointerDown = true
    }
    const handlePointerMove = () => {
      if (isPointerDown) markUserScrolledRail()
    }
    const handlePointerUp = () => {
      isPointerDown = false
    }

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(scheduleUpdate)
      : null

    scheduleUpdate()
    containerEl.addEventListener('scroll', scheduleUpdate, { passive: true })
    containerEl.addEventListener('wheel', handleWheel, { passive: true })
    containerEl.addEventListener('touchmove', markUserScrolledRail, { passive: true })
    containerEl.addEventListener('pointerdown', handlePointerDown)
    containerEl.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    window.addEventListener('resize', scheduleUpdate)
    resizeObserver?.observe(containerEl)
    resizeObserver?.observe(listEl)

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      containerEl.removeEventListener('scroll', scheduleUpdate)
      containerEl.removeEventListener('wheel', handleWheel)
      containerEl.removeEventListener('touchmove', markUserScrolledRail)
      containerEl.removeEventListener('pointerdown', handlePointerDown)
      containerEl.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      window.removeEventListener('resize', scheduleUpdate)
      resizeObserver?.disconnect()
    }
  }, [flatRailItems.length])

  useEffect(() => {
    const listEl = listRef.current
    if (!listEl) return

    const activeItem = itemRefs.current[activeRailItemIndex]
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateActiveIndicator)
      : null

    resizeObserver?.observe(listEl)
    if (activeItem) resizeObserver?.observe(activeItem)
    window.addEventListener('resize', updateActiveIndicator)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateActiveIndicator)
    }
  }, [activeRailItemIndex, updateActiveIndicator])

  const scrollRailItemToStart = useCallback((itemIndex: number, behavior: ScrollBehavior = 'smooth') => {
    const itemEl = itemRefs.current[itemIndex]
    const containerEl = listRef.current?.parentElement
    if (!itemEl || !containerEl) return

    const itemRect = itemEl.getBoundingClientRect()
    const containerRect = containerEl.getBoundingClientRect()
    const containerStyle = window.getComputedStyle(containerEl)
    const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0
    const targetLeft = containerEl.scrollLeft + itemRect.left - containerRect.left - paddingLeft
    const maxScrollLeft = Math.max(containerEl.scrollWidth - containerEl.clientWidth, 0)
    const nextScrollLeft = Math.min(Math.max(targetLeft, 0), maxScrollLeft)

    containerEl.scrollTo({ left: nextScrollLeft, behavior })
  }, [])

  const scrollRailItemToStartById = useCallback((itemId: string | null, behavior: ScrollBehavior = 'smooth') => {
    if (!itemId) return

    const itemIndex = flatRailItems.findIndex((item) => item.id === itemId)
    if (itemIndex < 0) return

    scrollRailItemToStart(itemIndex, behavior)
  }, [flatRailItems, scrollRailItemToStart])

  useLayoutEffect(() => {
    if (activeScrollAnchorIndex < 0) return

    scrollRailItemToStart(
      activeScrollAnchorIndex,
      hasAlignedActiveScrollRef.current ? 'smooth' : 'auto'
    )
    hasAlignedActiveScrollRef.current = true
  }, [
    activeScrollAnchorIndex,
    gap,
    scrollRailItemToStart,
  ])

  const getRailItemIndex = (item: TItem) =>
    flatRailItems.findIndex((railItem) => railItem.id === item.id)

  const handleItemClick = (item: TItem) => {
    const itemIndex = getRailItemIndex(item)
    const isActive = activeRailItemIndex === itemIndex

    if (isActive) return

    if (item.isMore) {
      onSelectItem?.(item)
      return
    }

    resetRailUserScrollHint()
    scrollRailItemToStartById(getScrollAnchorId(item))
    onSelectItem?.(item)
  }

  const renderIcon = (item: TItem, isActive: boolean) => (
    <div className={`sport-rail__icon${isActive ? ' sport-rail__icon--active' : ''}${item.isMore ? ' sport-rail__icon--more' : ''}`}>
      {item.icon && (
        <img
          src={item.icon}
          alt={item.label}
          className={item.lightIcon ? 'sport-rail__theme-icon sport-rail__theme-icon--default' : undefined}
        />
      )}
      {item.lightIcon && (
        <img
          src={item.lightIcon}
          alt={item.label}
          className="sport-rail__theme-icon sport-rail__theme-icon--light"
        />
      )}
      {hasLiveIndicator?.(item) && (
        <span
          className="sport-rail__live-indicator"
          aria-label="Ao vivo"
        >
          <span className="sport-rail__live-dot" aria-hidden="true" />
        </span>
      )}
      {hasFavoriteIndicator?.(item) && <span className="sport-rail__favorite-star" aria-hidden="true" />}
      {hasFavoriteIndicator?.(item) && (
        <span className="sport-rail__favorite-indicator" aria-hidden="true">
          <img src={lineFavorito} alt="" />
        </span>
      )}
    </div>
  )

  const renderItem = (item: TItem) => {
    const itemIndex = getRailItemIndex(item)
    const isActive = activeRailItemIndex === itemIndex
    const canBypassDisabledInteraction = allowDisabledItemInteraction?.(item) ?? false
    const isClickable = !!onSelectItem && (
      item.isMore
        ? !disableInteractions || allowMoreItemInteraction
        : (!disableInteractions || canBypassDisabledInteraction) && item.clickable !== false
    )
    const isStatic = !isClickable || isActive
    const className = [
      'sport-rail__item',
      isActive ? 'sport-rail__item--active' : '',
      isStatic ? 'sport-rail__item--static' : '',
    ]
      .filter(Boolean)
      .join(' ')

    if (!isClickable) {
      return (
        <div
          key={item.id}
          ref={(el) => { itemRefs.current[itemIndex] = el }}
          className={className}
          data-sport-rail-item-id={item.id}
          aria-disabled="true"
        >
          {renderIcon(item, isActive)}
          <span className="sport-rail__label">{item.label}</span>
        </div>
      )
    }

    return (
      <button
        key={item.id}
        ref={(el) => { itemRefs.current[itemIndex] = el }}
        type="button"
        className={className}
        data-sport-rail-item-id={item.id}
        aria-pressed={item.isMore ? undefined : isActive}
        aria-haspopup={item.isMore ? 'dialog' : undefined}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => handleItemClick(item)}
      >
        {renderIcon(item, isActive)}
        <span className="sport-rail__label">{item.label}</span>
      </button>
    )
  }

  const railListStyle = { '--sport-rail-competition-item-gap': `${gap}px` } as CSSProperties
  const railClasses = [
    'sport-rail',
    isSportPage ? 'sport-rail--sport-active' : '',
    'sport-rail--competitions',
    'sport-rail--liquid-glass-new',
    hasMoreItemsLeft ? 'sport-rail--show-left-fade' : '',
    hasMoreItemsRight ? 'sport-rail--show-right-fade' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const railShellClasses = [
    'sport-rail-shell',
    'sport-rail-shell--competitions',
    !hasUserScrolledRail && !isRailScrolledFromStart && hasMoreItemsRight
      ? 'sport-rail-shell--show-right-arrow'
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <div className={railShellClasses}>
        <div className={railClasses}>
          <div
            className={[
              'sport-rail__list',
              'sport-rail__list--competitions',
              isActiveIndicatorReady ? 'sport-rail__list--indicator-ready' : '',
              'sport-rail__list--liquid-glass-new',
            ]
              .filter(Boolean)
              .join(' ')}
            ref={listRef}
            style={railListStyle}
          >
            <span className="sport-rail__active-indicator" aria-hidden="true" />
            {sections.map((section) => (
              <div
                key={section.id}
                className={`sport-rail__section${section.className ? ` ${section.className}` : ''}`}
              >
                {section.items.map(renderItem)}
              </div>
            ))}
          </div>
        </div>
        <span className="sport-rail__scroll-arrow" aria-hidden="true">
          <CaretRightIcon className="sport-rail__scroll-arrow-icon" weight="bold" />
        </span>
      </div>
      {renderAfter}
    </>
  )
}

export function SportRail({
  activeSport,
  selectedCompetitionId,
  selectedCompetitionName,
  extraCompetitions = [],
  disableInteractions = false,
  allowHighlightsInteraction = false,
  allowCompetitionInteraction = false,
  onSportChange,
  onOpenCompetition,
}: SportRailProps = {}) {
  const [isMoreSportsOpen, setIsMoreSportsOpen] = useState(false)
  const { isFeatureEnabled } = useFeatureFlags()
  const {
    favorites: favoriteCompetitions,
    moveFavorite,
    toggleFavorite,
  } = useFavoriteCompetitions()
  const isUnifiedSportsBottomSheetEnabled = isFeatureEnabled('unifiedSportsBottomSheetV2')
  const activeSportId = activeSport ?? 'destaques'
  const defaultFlatRailItems = useMemo(
    () => competitionRailSections.flatMap((section) => section.items),
    []
  )
  const defaultRailItemIds = useMemo(
    () => new Set(defaultFlatRailItems.map((item) => item.id)),
    [defaultFlatRailItems]
  )
  const normalizedSelectedCompetitionId = getRailCompetitionId(selectedCompetitionId)
  const requestedActiveItemId = normalizedSelectedCompetitionId
    ? `competition:${normalizedSelectedCompetitionId}`
    : activeSportId
  const dynamicCompetitionItem = useMemo<SportRailCompetitionItem | null>(() => {
    if (!normalizedSelectedCompetitionId || !selectedCompetitionName || activeSportId === 'destaques') return null
    if (defaultRailItemIds.has(requestedActiveItemId)) return null

    return createDynamicCompetitionItem(normalizedSelectedCompetitionId, selectedCompetitionName, activeSportId)
  }, [
    activeSportId,
    defaultRailItemIds,
    normalizedSelectedCompetitionId,
    requestedActiveItemId,
    selectedCompetitionName,
  ])
  const extraCompetitionItems = useMemo(() => {
    const itemIds = new Set<string>()

    return extraCompetitions
      .map((competition) => createDynamicCompetitionItem(
        getRailCompetitionId(competition.id) ?? competition.id,
        competition.name,
        competition.sport
      ))
      .filter((item) => {
        if (defaultRailItemIds.has(item.id) || itemIds.has(item.id)) return false

        itemIds.add(item.id)
        return true
      })
  }, [defaultRailItemIds, extraCompetitions])
  const visibleCustomCompetitionItems = useMemo(() => {
    if (!dynamicCompetitionItem) return extraCompetitionItems
    if (extraCompetitionItems.some((item) => item.id === dynamicCompetitionItem.id)) {
      return extraCompetitionItems
    }

    return [...extraCompetitionItems, dynamicCompetitionItem]
  }, [dynamicCompetitionItem, extraCompetitionItems])

  const defaultCompetitionItemsByKey = useMemo(() => {
    const itemsByKey = new Map<string, SportRailCompetitionItem>()

    defaultFlatRailItems.forEach((item) => {
      if (item.type !== 'competition') return
      itemsByKey.set(`${item.sportId}:${item.competitionId}`, item)
    })

    return itemsByKey
  }, [defaultFlatRailItems])

  const favoriteCompetitionItems = useMemo(() => {
    const seenIds = new Set<string>()

    return favoriteCompetitions
      .map((competition) => ({
        ...competition,
        id: getRailCompetitionId(competition.id) ?? competition.id,
      }))
      .filter((competition) => (
        isCompetitionEnabled(competition.id)
        && isCompetitionRailClickable(competition.sport)
      ))
      .map((competition) => (
        {
          ...(
            defaultCompetitionItemsByKey.get(`${competition.sport}:${competition.id}`) ??
            createDynamicCompetitionItem(competition.id, competition.name, competition.sport)
          ),
          isFavorite: true,
        }
      ))
      .filter((item) => {
        const hasParentSection = competitionRailSections.some((section) => section.id === item.sportId)
        if (!hasParentSection || seenIds.has(item.id)) return false

        seenIds.add(item.id)
        return true
      })
  }, [defaultCompetitionItemsByKey, favoriteCompetitions])

  const railSections = useMemo(() => {
    if (!isUnifiedSportsBottomSheetEnabled) {
      if (visibleCustomCompetitionItems.length === 0) return competitionRailSections

      return competitionRailSections.map((section) => (
        visibleCustomCompetitionItems.some((item) => item.sportId === section.id)
          ? {
              ...section,
              items: [
                ...section.items,
                ...visibleCustomCompetitionItems.filter((item) => item.sportId === section.id),
              ],
            }
          : section
      ))
    }

    const favoriteIds = new Set(favoriteCompetitionItems.map((item) => item.id))
    const sectionsWithoutFavoriteDuplicates = competitionRailSections.map((section) => {
      const staticItems = section.items.filter((item) => item.type !== 'competition')
      const remainingDefaultCompetitions = section.items.filter((item) => (
        item.type === 'competition' && !favoriteIds.has(item.id)
      ))
      const remainingCustomCompetitions = visibleCustomCompetitionItems.filter((item) => (
        item.sportId === section.id && !favoriteIds.has(item.id)
      ))

      const hadFavoriteCompetition = section.items.some((item) => (
        item.type === 'competition' && favoriteIds.has(item.id)
      ))
      if (!hadFavoriteCompetition && remainingCustomCompetitions.length === 0) return section

      return {
        ...section,
        items: [
          ...staticItems,
          ...remainingDefaultCompetitions,
          ...remainingCustomCompetitions,
        ],
      }
    })

    if (favoriteCompetitionItems.length === 0) return sectionsWithoutFavoriteDuplicates

    const favoriteSection: ProductRailSection<SportRailItem> = {
      id: 'favoritos',
      className: 'sport-rail__section--favorites',
      items: favoriteCompetitionItems,
    }

    return [
      sectionsWithoutFavoriteDuplicates[0],
      favoriteSection,
      ...sectionsWithoutFavoriteDuplicates.slice(1),
    ]
  }, [favoriteCompetitionItems, isUnifiedSportsBottomSheetEnabled, visibleCustomCompetitionItems])
  const flatRailItems = useMemo(
    () => railSections.flatMap((section) => section.items),
    [railSections]
  )
  const activeRailItemId = flatRailItems.some((item) => item.id === requestedActiveItemId)
    ? requestedActiveItemId
    : activeSportId
  const isSportPage = !!activeSport && activeSport !== 'destaques'

  const handleSelectItem = (item: SportRailItem) => {
    if (item.type === 'more') {
      setIsMoreSportsOpen(true)
      return
    }

    if (item.type === 'sport') {
      if (item.clickable) onSportChange?.(item.sportId)
      return
    }

    if (item.type === 'competition' && item.clickable) {
      onOpenCompetition?.({
        id: item.competitionId,
        name: item.competitionName,
        sport: item.sportId,
      })
    }
  }

  return (
    <ProductRail
      sections={railSections}
      activeItemId={activeRailItemId}
      isSportPage={isSportPage}
      disableInteractions={disableInteractions}
      allowMoreItemInteraction
      allowDisabledItemInteraction={(item) => (
        (allowHighlightsInteraction && item.id === 'destaques') ||
        (allowCompetitionInteraction && item.type === 'competition' && item.clickable !== false)
      )}
      getScrollAnchorId={getSportRailScrollAnchorId}
      hasLiveIndicator={hasSportRailLiveIndicator}
      hasFavoriteIndicator={(item) => item.type === 'competition' && item.isFavorite === true}
      onSelectItem={handleSelectItem}
      renderAfter={(
        isUnifiedSportsBottomSheetEnabled ? (
          <MoreSportsBottomSheetV2
            isOpen={isMoreSportsOpen}
            onClose={() => setIsMoreSportsOpen(false)}
            activeSport={activeSport}
            favoriteCompetitions={favoriteCompetitions}
            onMoveFavorite={moveFavorite}
            onSelectSport={disableInteractions ? undefined : onSportChange}
            onSelectCompetition={disableInteractions ? undefined : onOpenCompetition}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          <MoreSportsBottomSheet
            isOpen={isMoreSportsOpen}
            onClose={() => setIsMoreSportsOpen(false)}
            activeSport={activeSport}
            onSelectSport={disableInteractions ? undefined : onSportChange}
            onSelectCompetition={disableInteractions ? undefined : onOpenCompetition}
          />
        )
      )}
    />
  )
}
