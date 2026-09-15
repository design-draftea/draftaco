import { useRef, useState } from 'react'
import { useSlidingActiveIndicator } from '../../shared/hooks/useSlidingActiveIndicator'
import './ContentFilterChips.css'

const contentFilters = [
  { id: 'populares', label: 'POPULARES' },
  { id: 'ao-vivo', label: 'PARTIDAS AO VIVO' },
  { id: 'em-breve', label: 'PARTIDAS EM BREVE' },
  { id: 'jogadores', label: 'JOGADORES' },
] as const

const CONTENT_FILTER_STICKY_LOCK_OVERSCROLL = 8

export type ContentFilterId = typeof contentFilters[number]['id']
type ContentFilterScrollMode = 'sticky-lock' | 'sticky-reset' | 'top'

export interface ContentFilterChipOption<TId extends string = ContentFilterId> {
  id: TId
  label: string
}

interface ContentFilterChipsProps<TId extends string = ContentFilterId> {
  filters?: readonly ContentFilterChipOption<TId>[]
  activeFilter?: TId
  onFilterChange?: (filterId: TId, meta?: { shouldLockScroll: boolean }) => void
  ariaLabel?: string
  className?: string
  disabled?: boolean
  scrollMode?: ContentFilterScrollMode
}

export function ContentFilterChips<TId extends string = ContentFilterId>({
  filters,
  activeFilter: controlledActiveFilter,
  onFilterChange,
  ariaLabel = 'Filtros de conteúdo',
  className,
  disabled = false,
  scrollMode = 'sticky-lock',
}: ContentFilterChipsProps<TId> = {}) {
  const filterItems = (filters ?? contentFilters) as readonly ContentFilterChipOption<TId>[]
  const chipsRef = useRef<HTMLElement | null>(null)
  const chipListRef = useRef<HTMLDivElement | null>(null)
  const chipRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [internalActiveFilter, setInternalActiveFilter] = useState<TId | undefined>(filterItems[0]?.id)
  const activeFilter = controlledActiveFilter ?? internalActiveFilter ?? filterItems[0]?.id
  const activeFilterIndex = Math.max(0, filterItems.findIndex((filter) => filter.id === activeFilter))

  useSlidingActiveIndicator({
    activeKey: activeFilter,
    containerRef: chipListRef,
    getActiveElement: () => chipRefs.current[activeFilterIndex],
  })

  const isStickyLocked = () => {
    const chipsEl = chipsRef.current
    const homeEl = chipsEl?.closest<HTMLElement>('.home')

    if (!chipsEl || !homeEl) return false

    const homeStyle = window.getComputedStyle(homeEl)
    const chipsStyle = window.getComputedStyle(chipsEl)
    const usesHomeScroll = (
      homeStyle.position === 'fixed' &&
      (homeStyle.overflowY === 'auto' || homeStyle.overflowY === 'scroll')
    )
    const homePaddingTop = usesHomeScroll ? parseFloat(homeStyle.paddingTop) || 0 : 0
    const stickyTop = parseFloat(chipsStyle.top) || 0
    const chipsRect = chipsEl.getBoundingClientRect()
    const homeRect = homeEl.getBoundingClientRect()
    const stickyLockedTop = (usesHomeScroll ? homeRect.top + homePaddingTop : 0) + stickyTop

    return chipsRect.top <= stickyLockedTop + 1
  }

  const scrollToStickyLock = () => {
    const applyStickyScroll = () => {
      const chipsEl = chipsRef.current
      const homeEl = chipsEl?.closest<HTMLElement>('.home')
      const targetEl = homeEl?.querySelector<HTMLElement>('.home__content-filter-anchor') ?? chipsEl

      if (!chipsEl || !homeEl || !targetEl) return

      const homeStyle = window.getComputedStyle(homeEl)
      const chipsStyle = window.getComputedStyle(chipsEl)
      const usesHomeScroll = (
        homeStyle.position === 'fixed' &&
        (homeStyle.overflowY === 'auto' || homeStyle.overflowY === 'scroll')
      )
      const homePaddingTop = usesHomeScroll ? parseFloat(homeStyle.paddingTop) || 0 : 0
      const stickyTop = parseFloat(chipsStyle.top) || 0
      const stickyLockTop = homePaddingTop + Math.max(stickyTop, 0)
      const targetTop = stickyLockTop - CONTENT_FILTER_STICKY_LOCK_OVERSCROLL
      const targetRect = targetEl.getBoundingClientRect()
      const homeRect = homeEl.getBoundingClientRect()
      const homeTargetTop = homeEl.scrollTop + targetRect.top - homeRect.top - targetTop
      const windowTargetTop = window.scrollY + targetRect.top - (
        usesHomeScroll ? targetTop + homeRect.top : Math.max(stickyTop, 0) - CONTENT_FILTER_STICKY_LOCK_OVERSCROLL
      )

      homeEl.scrollTo({ top: Math.max(homeTargetTop, 0), left: 0, behavior: 'auto' })
      window.scrollTo({ top: Math.max(windowTargetTop, 0), left: 0, behavior: 'auto' })
    }

    applyStickyScroll()
    window.requestAnimationFrame(() => {
      applyStickyScroll()
      window.requestAnimationFrame(applyStickyScroll)
    })
    window.setTimeout(applyStickyScroll, 120)
  }

  const scrollToPageTop = () => {
    const applyTopScroll = () => {
      const chipsEl = chipsRef.current
      const homeEl = chipsEl?.closest<HTMLElement>('.home')

      homeEl?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }

    applyTopScroll()
    window.requestAnimationFrame(() => {
      applyTopScroll()
      window.requestAnimationFrame(applyTopScroll)
    })
    window.setTimeout(applyTopScroll, 120)
  }

  const handleFilterChange = (filterId: TId) => {
    if (disabled) return

    const shouldLockScroll = isStickyLocked()

    if (controlledActiveFilter === undefined) {
      setInternalActiveFilter(filterId)
    }
    onFilterChange?.(filterId, { shouldLockScroll })
    if (scrollMode === 'top') {
      scrollToPageTop()
    } else if (scrollMode === 'sticky-reset' || shouldLockScroll) {
      scrollToStickyLock()
    }
  }

  return (
    <section
      ref={chipsRef}
      className={['content-filter-chips', className].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
      data-node-id="331:7821"
    >
      <div className="content-filter-chips__list sliding-chip-group" ref={chipListRef}>
        <span className="sliding-chip-indicator" aria-hidden="true" />
        {filterItems.map((filter, index) => {
          const isActive = activeFilter === filter.id

          return (
            <button
              key={filter.id}
              ref={(node) => {
                chipRefs.current[index] = node
              }}
              type="button"
              className={`content-filter-chips__item sliding-chip${isActive ? ' content-filter-chips__item--active' : ''}`}
              aria-pressed={isActive}
              disabled={disabled}
              onClick={disabled ? undefined : () => handleFilterChange(filter.id)}
            >
              <span>{filter.label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
