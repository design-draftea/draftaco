import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type WheelEvent } from 'react'
import './CompetitionPlayerProps.css'
import { getLocalPlayerImageByName } from '../../data/playerImages'
import { useSlidingActiveIndicator } from '../../shared/hooks/useSlidingActiveIndicator'

import type { PlayerPropCard, PlayerPropOption } from './competitionData'

interface CompetitionPlayerPropsProps {
  statChips: { id: string; label: string }[]
  cards: PlayerPropCard[]
}

const getInitialOptionIndex = (options: PlayerPropOption[]) => {
  const activeIndex = options.findIndex((opt) => opt.active)
  return activeIndex >= 0 ? activeIndex : Math.floor(options.length / 2)
}

const getCardOptions = (card: PlayerPropCard, activeStat: string) =>
  card.optionsByStat[activeStat] ?? Object.values(card.optionsByStat)[0] ?? []

const getOptionKey = (cardId: string, activeStat: string) => `${cardId}:${activeStat}`

const renderMatchLabel = (card: PlayerPropCard) => {
  const [home, away] = card.matchLabel.split(' X ')
  if (!home || !away) return card.matchLabel

  return (
    <>
      <span className={home === card.highlightedTeam ? 'competition-players__match-team--active' : ''}>
        {home}
      </span>
      <span className="competition-players__match-separator"> X </span>
      <span className={away === card.highlightedTeam ? 'competition-players__match-team--active' : ''}>
        {away}
      </span>
    </>
  )
}

const getPlayerImageStyle = (card: PlayerPropCard, isLocalPlayerImage: boolean) => {
  const adjustment = card.playerImageAdjustment ?? { scale: isLocalPlayerImage ? 1 : 0.6, x: 0, y: 0 }

  return {
    '--player-scale': adjustment.scale,
    '--player-x': `${adjustment.x}px`,
    '--player-y': `${adjustment.y}px`,
  } as CSSProperties
}

export function CompetitionPlayerProps({ statChips, cards }: CompetitionPlayerPropsProps) {
  const [activeStat, setActiveStat] = useState(statChips[0]?.id ?? '')
  const [activeOptionByKey, setActiveOptionByKey] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      cards.flatMap((card) =>
        Object.entries(card.optionsByStat).map(([statId, options]) => [
          getOptionKey(card.id, statId),
          getInitialOptionIndex(options),
        ])
      )
    )
  )
  const [draggingOptionKey, setDraggingOptionKey] = useState<string | null>(null)
  const activeOptionByKeyRef = useRef(activeOptionByKey)
  const optionScrollRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const optionDrag = useRef<{
    optionKey: string
    startX: number
    scrollLeft: number
    startIndex: number
    moved: boolean
  } | null>(null)
  const suppressOptionClick = useRef<Record<string, boolean>>({})
  const wheelLock = useRef<Record<string, number>>({})
  const chipsRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([])
  const activeStatIndex = statChips.findIndex((chip) => chip.id === activeStat)
  const activeStatIndicatorKey = `${activeStat}:${statChips.map((chip) => chip.id).join('|')}`

  useSlidingActiveIndicator({
    activeKey: activeStatIndicatorKey,
    containerRef: chipsRef,
    getActiveElement: () => chipRefs.current[activeStatIndex],
  })

  const scrollOptionIntoCenter = useCallback((optionKey: string, index: number, behavior: ScrollBehavior = 'smooth') => {
    const containerEl = optionScrollRefs.current[optionKey]
    const optionEl = containerEl?.children.item(index) as HTMLElement | null
    if (!containerEl || !optionEl) return

    const optionCenter = optionEl.offsetLeft + optionEl.offsetWidth / 2
    const targetScroll = optionCenter - containerEl.clientWidth / 2
    containerEl.scrollTo({ left: Math.max(0, targetScroll), behavior })
  }, [])

  const getCenteredOptionIndex = useCallback((optionKey: string) => {
    const containerEl = optionScrollRefs.current[optionKey]
    if (!containerEl || containerEl.children.length === 0) return -1

    const containerCenter = containerEl.scrollLeft + containerEl.clientWidth / 2
    let nearestIndex = 0
    let nearestDistance = Number.POSITIVE_INFINITY

    Array.from(containerEl.children).forEach((child, index) => {
      const optionEl = child as HTMLElement
      const optionCenter = optionEl.offsetLeft + optionEl.offsetWidth / 2
      const distance = Math.abs(optionCenter - containerCenter)

      if (distance < nearestDistance) {
        nearestIndex = index
        nearestDistance = distance
      }
    })

    return nearestIndex
  }, [])

  const clampOptionScroll = useCallback((optionKey: string) => {
    const containerEl = optionScrollRefs.current[optionKey]
    if (!containerEl) return

    const maxScroll = Math.max(0, containerEl.scrollWidth - containerEl.clientWidth)
    const nextScroll = Math.min(maxScroll, Math.max(0, containerEl.scrollLeft))

    if (Math.abs(containerEl.scrollLeft - nextScroll) > 0.5) {
      containerEl.scrollLeft = nextScroll
    }
  }, [])

  const setActiveOptionIndex = (optionKey: string, index: number) => {
    if (activeOptionByKeyRef.current[optionKey] === index) return

    activeOptionByKeyRef.current = { ...activeOptionByKeyRef.current, [optionKey]: index }
    setActiveOptionByKey((current) => ({ ...current, [optionKey]: index }))
  }

  useEffect(() => {
    activeOptionByKeyRef.current = activeOptionByKey
  }, [activeOptionByKey])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      cards.forEach((card) => {
        const optionKey = getOptionKey(card.id, activeStat)
        const options = getCardOptions(card, activeStat)
        const activeIndex = activeOptionByKeyRef.current[optionKey] ?? getInitialOptionIndex(options)
        scrollOptionIntoCenter(optionKey, activeIndex, 'auto')
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [activeStat, cards, scrollOptionIntoCenter])

  const scrollChipIntoView = (chipEl: HTMLButtonElement | null) => {
    const containerEl = chipsRef.current
    if (!chipEl || !containerEl) return

    const chipLeft = chipEl.offsetLeft
    const chipWidth = chipEl.offsetWidth
    const containerWidth = containerEl.offsetWidth
    const containerScroll = containerEl.scrollLeft
    const padding = 20

    if (chipLeft + chipWidth > containerScroll + containerWidth - padding) {
      containerEl.scrollTo({ left: chipLeft - padding, behavior: 'smooth' })
    } else if (chipLeft < containerScroll + padding) {
      containerEl.scrollTo({ left: chipLeft - padding, behavior: 'smooth' })
    }
  }

  const resetOptionsForStat = (statId: string) => {
    setActiveOptionByKey((current) => {
      const next = { ...current }
      cards.forEach((card) => {
        const options = getCardOptions(card, statId)
        next[getOptionKey(card.id, statId)] = getInitialOptionIndex(options)
      })
      activeOptionByKeyRef.current = next
      return next
    })
  }

  const centerOption = (optionKey: string, index: number, behavior: ScrollBehavior = 'smooth') => {
    setActiveOptionIndex(optionKey, index)
    window.requestAnimationFrame(() => scrollOptionIntoCenter(optionKey, index, behavior))
  }

  const stepOption = (optionKey: string, optionsLength: number, direction: number) => {
    const currentIndex = activeOptionByKeyRef.current[optionKey] ?? Math.max(0, getCenteredOptionIndex(optionKey))
    const nextIndex = Math.min(optionsLength - 1, Math.max(0, currentIndex + direction))

    if (currentIndex !== nextIndex) {
      centerOption(optionKey, nextIndex)
    }
  }

  const updateCenteredOption = (optionKey: string) => {
    clampOptionScroll(optionKey)

    const centeredIndex = getCenteredOptionIndex(optionKey)
    if (centeredIndex < 0) return
    setActiveOptionIndex(optionKey, centeredIndex)
  }

  const snapToNearestOption = (optionKey: string, dragDelta = 0, startIndex?: number) => {
    const containerEl = optionScrollRefs.current[optionKey]
    if (!containerEl) return

    const nearestIndex = getCenteredOptionIndex(optionKey)
    const lastIndex = containerEl.children.length - 1
    const initialIndex = startIndex ?? activeOptionByKeyRef.current[optionKey] ?? nearestIndex
    let targetIndex = nearestIndex

    if (Math.abs(dragDelta) > 30 && nearestIndex === initialIndex) {
      targetIndex = initialIndex + (dragDelta > 0 ? 1 : -1)
    }

    targetIndex = Math.max(0, Math.min(lastIndex, targetIndex))
    centerOption(optionKey, targetIndex)
  }

  const handleOptionMouseDown = (optionKey: string, event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return

    const containerEl = optionScrollRefs.current[optionKey]
    if (!containerEl) return

    setDraggingOptionKey(optionKey)
    optionDrag.current = {
      optionKey,
      startX: event.pageX - containerEl.offsetLeft,
      scrollLeft: containerEl.scrollLeft,
      startIndex: activeOptionByKeyRef.current[optionKey] ?? getCenteredOptionIndex(optionKey),
      moved: false,
    }
  }

  const handleOptionMouseMove = (optionKey: string, event: MouseEvent<HTMLDivElement>) => {
    const drag = optionDrag.current
    const containerEl = optionScrollRefs.current[optionKey]
    if (!drag || drag.optionKey !== optionKey || !containerEl) return

    event.preventDefault()
    const x = event.pageX - containerEl.offsetLeft
    const walk = (x - drag.startX) * 1.5
    drag.moved = drag.moved || Math.abs(walk) > 4
    containerEl.scrollLeft = drag.scrollLeft - walk
    clampOptionScroll(optionKey)
  }

  const finishOptionDrag = (optionKey: string) => {
    const drag = optionDrag.current
    const containerEl = optionScrollRefs.current[optionKey]
    if (!drag || drag.optionKey !== optionKey) return

    const dragDelta = containerEl ? containerEl.scrollLeft - drag.scrollLeft : 0
    optionDrag.current = null
    setDraggingOptionKey(null)

    if (drag.moved) {
      suppressOptionClick.current[optionKey] = true
      window.setTimeout(() => {
        suppressOptionClick.current[optionKey] = false
      }, 0)
    }

    snapToNearestOption(optionKey, dragDelta, drag.startIndex)
  }

  const handleOptionTouchEnd = (optionKey: string) => {
    window.setTimeout(() => snapToNearestOption(optionKey), 120)
  }

  const handleOptionWheel = (
    optionKey: string,
    optionsLength: number,
    event: WheelEvent<HTMLDivElement>
  ) => {
    const movement = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (Math.abs(movement) < 12) return
    event.preventDefault()

    const now = event.timeStamp
    if (now - (wheelLock.current[optionKey] ?? 0) < 220) return
    wheelLock.current[optionKey] = now

    stepOption(optionKey, optionsLength, movement > 0 ? 1 : -1)
  }

  return (
    <section className="competition-players">
      <div className="competition-players__header">
        <span>Jogadores</span>
      </div>

      <div className="competition-players__chips sliding-chip-group" ref={chipsRef}>
        <span className="sliding-chip-indicator" aria-hidden="true" />
        {statChips.map((chip, index) => (
          <button
            key={chip.id}
            ref={(el) => { chipRefs.current[index] = el }}
            className={`competition-players__chip sliding-chip ${activeStat === chip.id ? 'competition-players__chip--active' : ''}`}
            onClick={() => {
              setActiveStat(chip.id)
              resetOptionsForStat(chip.id)
              scrollChipIntoView(chipRefs.current[index])
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="competition-players__list">
        {cards.map((card) => {
          const options = getCardOptions(card, activeStat)
          const optionKey = getOptionKey(card.id, activeStat)
          const activeOptionIndex = activeOptionByKey[optionKey] ?? getInitialOptionIndex(options)
          const localPlayerImage = getLocalPlayerImageByName(card.playerName)

          return (
          <div key={card.id} className="competition-players__card">
            <div className="competition-players__card-header">
              <div className="competition-players__match-row">
                <span className="competition-players__match-label">{renderMatchLabel(card)}</span>
                <span className="competition-players__match-time">{card.matchTime}</span>
              </div>
              <div className="competition-players__player-image-wrapper">
                <img
                  src={localPlayerImage ?? card.playerImage}
                  alt=""
                  className={`competition-players__player-image${localPlayerImage ? ' competition-players__player-image--real' : ''}`}
                  style={getPlayerImageStyle(card, Boolean(localPlayerImage))}
                />
              </div>
            </div>
            <div className="competition-players__card-name">{card.playerName}</div>
            <div
              className="competition-players__card-options"
              aria-label={`Odds de ${card.playerName}`}
              onWheel={(e) => handleOptionWheel(optionKey, options.length, e)}
            >
              <div
                ref={(el) => { optionScrollRefs.current[optionKey] = el }}
                className={`competition-players__options-scroll ${draggingOptionKey === optionKey ? 'competition-players__options-scroll--dragging' : ''}`}
                onScroll={() => updateCenteredOption(optionKey)}
                onMouseDown={(e) => handleOptionMouseDown(optionKey, e)}
                onMouseUp={() => finishOptionDrag(optionKey)}
                onMouseMove={(e) => handleOptionMouseMove(optionKey, e)}
                onMouseLeave={() => finishOptionDrag(optionKey)}
                onTouchEnd={() => handleOptionTouchEnd(optionKey)}
              >
                {options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`competition-players__option ${activeOptionIndex === idx ? 'competition-players__option--active' : ''}`}
                    onClick={(e) => {
                      if (suppressOptionClick.current[optionKey]) {
                        suppressOptionClick.current[optionKey] = false
                        e.preventDefault()
                        return
                      }
                      centerOption(optionKey, idx)
                    }}
                  >
                    <span className="competition-players__option-label">{opt.label}</span>
                    <span className="competition-players__option-odd">{opt.odd}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          )
        })}
      </div>
    </section>
  )
}
