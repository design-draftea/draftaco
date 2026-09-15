import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { BottomSheet } from './BottomSheet'
import './MoreSportsBottomSheet.css'

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
import chevronLeftHeader from '../../assets/iconsDraftaco/chevronLeftHeader.svg'
import chevronRight from '../../assets/iconsDraftaco/chevronRight.svg'
import chevronUp from '../../assets/iconsDraftaco/chevronUp.svg'
import type { Competition, CompetitionCountry } from './CompeticaoBottomSheet'
import {
  competicaoConfigBySport,
  isCompetitionEnabled,
  type CompeticaoConfig,
} from '../SportFilterBar/competicaoData'
import type { CompetitionLinkTarget } from '../../shared/utils/competitionNavigation'

interface MoreSportsBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  activeSport?: string | null
  onSelectSport?: (sportId: string) => void
  onSelectCompetition?: (target: CompetitionLinkTarget) => void
}

interface SportItem {
  id: string
  label: string
  icon: string
}

type SheetView = 'sports' | 'competitions'

interface SheetTransition {
  to: SheetView
  direction: 'forward' | 'backward'
  key: number
  phase: 'idle' | 'active'
}

interface AccordionCollapseProps {
  isOpen: boolean
  children: ReactNode
}

const selectableSports = new Set(['futebol', 'basquete'])
const configuredCompetitionSports = new Set(Object.keys(competicaoConfigBySport))

const sports: SportItem[] = [
  { id: 'futebol', label: 'Futebol', icon: iconSoccer },
  { id: 'basquete', label: 'Basquete', icon: iconBasketball },
  { id: 'tenis', label: 'Tênis', icon: iconTennis },
  { id: 'esoccer', label: 'Esoccer', icon: iconESoccer },
  { id: 'volei', label: 'Vôlei', icon: iconVolleyball },
  { id: 'virtuais', label: 'Virtuais', icon: iconVirtuais },
  { id: 'f1', label: 'Fórmula 1', icon: iconF1 },
  { id: 'futebol-americano', label: 'Fut. Americano', icon: iconFootball },
  { id: 'tenis-mesa', label: 'Tênis Mesa', icon: iconTableTennis },
  { id: 'valorant', label: 'Valorant', icon: iconValorant },
  { id: 'ebasketball', label: 'Ebasketball', icon: iconEBasketball },
  { id: 'handebol', label: 'Handebol', icon: iconHandball },
  { id: 'beisebol', label: 'Beisebol', icon: iconBaseball },
  { id: 'cs', label: 'CS', icon: iconCsgo },
  { id: 'ufc', label: 'UFC', icon: iconUfc },
  { id: 'dota', label: 'Dota 2', icon: iconDota },
  { id: 'kings-of-league', label: 'Kings of League', icon: iconKingsLeague },
  { id: 'lol', label: 'LoL', icon: iconLol },
  { id: 'hoquei', label: 'Hoquei', icon: iconHockey },
  { id: 'dados', label: 'Dados', icon: iconDarts },
  { id: 'rainbow-six', label: 'Rainbow Six', icon: iconRainbowSix },
  { id: 'boxe', label: 'Boxe', icon: iconBoxing },
  { id: 'golfe', label: 'Golfe', icon: iconGolf },
]

const getCompetitionConfig = (sportId: string): CompeticaoConfig | null => (
  configuredCompetitionSports.has(sportId) ? competicaoConfigBySport[sportId] : null
)

function AccordionCollapse({ isOpen, children }: AccordionCollapseProps) {
  const collapseRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const readyFrameRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const collapseEl = collapseRef.current
    const innerEl = innerRef.current
    if (!collapseEl || !innerEl) return

    const updateHeight = () => {
      collapseEl.style.setProperty(
        '--more-sports-accordion-height',
        `${innerEl.scrollHeight}px`
      )
    }

    updateHeight()

    if (typeof ResizeObserver === 'undefined') return

    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(innerEl)

    return () => resizeObserver.disconnect()
  }, [children])

  useEffect(() => {
    const collapseEl = collapseRef.current
    if (!collapseEl) return

    readyFrameRef.current = window.requestAnimationFrame(() => {
      readyFrameRef.current = window.requestAnimationFrame(() => {
        readyFrameRef.current = null
        collapseEl.dataset.ready = 'true'
      })
    })

    return () => {
      if (readyFrameRef.current !== null) {
        window.cancelAnimationFrame(readyFrameRef.current)
      }
      delete collapseEl.dataset.ready
    }
  }, [])

  return (
    <div
      ref={collapseRef}
      className={`more-sports-bs__competition-collapse${isOpen ? ' more-sports-bs__competition-collapse--open' : ''}`}
      aria-hidden={!isOpen}
    >
      <div ref={innerRef} className="more-sports-bs__competition-collapse-inner">
        {children}
      </div>
    </div>
  )
}

export function MoreSportsBottomSheet({
  isOpen,
  onClose,
  activeSport,
  onSelectSport,
  onSelectCompetition,
}: MoreSportsBottomSheetProps) {
  const [currentView, setCurrentView] = useState<SheetView>('sports')
  const [transition, setTransition] = useState<SheetTransition | null>(null)
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null)
  const [topOpen, setTopOpen] = useState(true)
  const [openCountries, setOpenCountries] = useState<string[]>([])
  const transitionTimerRef = useRef<number | null>(null)
  const transitionFrameRef = useRef<number | null>(null)
  const resetTimerRef = useRef<number | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const selectedSport = sports.find((sport) => sport.id === selectedSportId) ?? null
  const selectedConfig = selectedSportId ? getCompetitionConfig(selectedSportId) : null
  const displayView = transition?.to ?? currentView

  const resetSheetState = () => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current)
      transitionTimerRef.current = null
    }
    if (transitionFrameRef.current !== null) {
      window.cancelAnimationFrame(transitionFrameRef.current)
      transitionFrameRef.current = null
    }
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }

    setCurrentView('sports')
    setTransition(null)
    setSelectedSportId(null)
    setTopOpen(true)
    setOpenCountries([])
  }

  const handleCloseSheet = () => {
    resetSheetState()
    onClose()
  }

  const closeAndResetAfterAnimation = () => {
    onClose()

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current)
    }

    resetTimerRef.current = window.setTimeout(() => {
      resetTimerRef.current = null
      resetSheetState()
    }, 320)
  }

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current)
      }
      if (transitionFrameRef.current !== null) {
        window.cancelAnimationFrame(transitionFrameRef.current)
      }
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const scrollableBody = contentRef.current?.closest<HTMLElement>('.bottom-sheet__body')
    scrollableBody?.scrollTo({ top: 0, behavior: 'auto' })
  }, [displayView, selectedSportId])

  const completeTransition = (nextView: SheetView) => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current)
      transitionTimerRef.current = null
    }
    if (transitionFrameRef.current !== null) {
      window.cancelAnimationFrame(transitionFrameRef.current)
      transitionFrameRef.current = null
    }

    setCurrentView(nextView)
    setTransition(null)
  }

  const navigateTo = (nextView: SheetView) => {
    if (nextView === displayView || transition) return

    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current)
    }
    if (transitionFrameRef.current !== null) {
      window.cancelAnimationFrame(transitionFrameRef.current)
    }

    const nextTransition: SheetTransition = {
      to: nextView,
      direction: nextView === 'competitions' ? 'forward' : 'backward',
      key: Date.now(),
      phase: 'idle',
    }

    setTransition(nextTransition)

    transitionFrameRef.current = window.requestAnimationFrame(() => {
      transitionFrameRef.current = window.requestAnimationFrame(() => {
        transitionFrameRef.current = null
        setTransition((current) => (
          current?.key === nextTransition.key
            ? { ...current, phase: 'active' }
            : current
        ))
      })
    })

    transitionTimerRef.current = window.setTimeout(() => {
      completeTransition(nextView)
    }, 560)
  }

  const handleSelectSport = (sportId: string, enabled: boolean) => {
    if (!enabled) return
    onSelectSport?.(sportId)
    closeAndResetAfterAnimation()
  }

  const handleOpenCompetitions = (sportId: string) => {
    const competitionConfig = getCompetitionConfig(sportId)
    if (!competitionConfig) return

    setSelectedSportId(sportId)
    setTopOpen(true)
    setOpenCountries([])
    navigateTo('competitions')
  }

  const handleBackToSports = () => {
    navigateTo('sports')
  }

  const toggleCountry = (countryId: string) => {
    setOpenCountries((current) => (
      current.includes(countryId)
        ? current.filter((id) => id !== countryId)
        : [...current, countryId]
    ))
  }

  const handleSelectCompetition = (competition: Competition) => {
    if (!selectedSportId || !isCompetitionEnabled(competition.id)) return

    onSelectCompetition?.({
      id: competition.id,
      name: competition.name,
      sport: selectedSportId,
    })
    closeAndResetAfterAnimation()
  }

  const renderChevronUp = (isOpenSection: boolean, className: string) => (
    <img
      src={chevronUp}
      alt=""
      className={`${className}${isOpenSection ? ` ${className}--open` : ''}`}
    />
  )

  const renderSportsList = () => (
    <div className="more-sports-bs__list" aria-label="Esportes">
      {sports.map((sport) => {
        const enabled = !!onSelectSport && selectableSports.has(sport.id)
        const isActive = activeSport === sport.id
        const hasCompetitionConfig = !!getCompetitionConfig(sport.id)

        return (
          <div
            key={sport.id}
            className={`more-sports-bs__row${isActive ? ' more-sports-bs__row--active' : ''}`}
          >
            <button
              type="button"
              className="more-sports-bs__row-main"
              onClick={() => handleSelectSport(sport.id, enabled)}
              disabled={!enabled}
              aria-current={isActive ? 'true' : undefined}
            >
              <img src={sport.icon} alt="" className="more-sports-bs__row-icon" />
              <span className="more-sports-bs__row-label">{sport.label}</span>
            </button>

            {hasCompetitionConfig && (
              <button
                type="button"
                className="more-sports-bs__row-link"
                onClick={() => handleOpenCompetitions(sport.id)}
                aria-label={`Ver todas competições de ${sport.label}`}
              >
                <span>Ver todas competições</span>
                <img src={chevronRight} alt="" className="more-sports-bs__row-link-icon" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )

  const renderCompetitionRows = (competitions: Competition[], nested = false) => {
    if (competitions.length === 0) return null

    return (
      <ul className={`more-sports-bs__competition-list${nested ? ' more-sports-bs__competition-list--nested' : ''}`}>
        {competitions.map((competition) => {
          const enabled = !!onSelectCompetition && isCompetitionEnabled(competition.id)

          return (
            <li key={competition.id} className="more-sports-bs__competition-item">
              <button
                type="button"
                className={`more-sports-bs__competition-row${enabled ? '' : ' more-sports-bs__competition-row--disabled'}`}
                onClick={() => handleSelectCompetition(competition)}
                disabled={!enabled}
              >
                <span className="more-sports-bs__competition-row-label">{competition.name}</span>
                <img src={chevronRight} alt="" className="more-sports-bs__competition-row-icon" />
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  const renderCountry = (country: CompetitionCountry) => {
    const isOpenCountry = openCountries.includes(country.id)

    return (
      <li
        key={country.id}
        className={`more-sports-bs__country${isOpenCountry ? ' more-sports-bs__country--open' : ''}`}
      >
        <button
          type="button"
          className="more-sports-bs__country-header"
          aria-expanded={isOpenCountry}
          onClick={() => toggleCountry(country.id)}
        >
          <img src={country.flag} alt="" className="more-sports-bs__country-flag" />
          <span className="more-sports-bs__country-label">{country.name}</span>
          {renderChevronUp(isOpenCountry, 'more-sports-bs__country-chevron')}
        </button>

        {country.competitions.length > 0 && (
          <AccordionCollapse isOpen={isOpenCountry}>
            {renderCompetitionRows(country.competitions, true)}
          </AccordionCollapse>
        )}
      </li>
    )
  }

  const renderCompetitionView = () => {
    if (!selectedConfig) {
      return (
        <p className="more-sports-bs__empty">
          Nenhuma competição disponível.
        </p>
      )
    }

    return (
      <div className="more-sports-bs__competitions" aria-label={`Competições de ${selectedConfig.sportLabel}`}>
        <section className={`more-sports-bs__competition-group${topOpen ? ' more-sports-bs__competition-group--open' : ''}`}>
          <button
            type="button"
            className="more-sports-bs__competition-header"
            aria-expanded={topOpen}
            onClick={() => setTopOpen((open) => !open)}
          >
            <img src={selectedConfig.sportIcon} alt="" className="more-sports-bs__competition-header-icon" />
            <span className="more-sports-bs__competition-header-label">Principais escolhas</span>
            {renderChevronUp(topOpen, 'more-sports-bs__competition-chevron')}
          </button>

          <AccordionCollapse isOpen={topOpen}>
            {renderCompetitionRows(selectedConfig.topCompetitions)}
          </AccordionCollapse>
        </section>

        {selectedConfig.countries.length > 0 && (
          <ul className="more-sports-bs__countries">
            {selectedConfig.countries.map(renderCountry)}
          </ul>
        )}
      </div>
    )
  }

  const renderContent = (view: SheetView) => (
    view === 'sports' ? renderSportsList() : renderCompetitionView()
  )

  const sheetTitle = displayView === 'competitions'
    ? selectedConfig?.sportLabel ?? selectedSport?.label ?? 'Competições'
    : 'Outros esportes e competições'

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleCloseSheet}
      title={sheetTitle}
      leadingContent={displayView === 'competitions' ? (
        <button
          type="button"
          className="more-sports-bs__back"
          onClick={handleBackToSports}
          aria-label="Voltar para esportes"
        >
          <img src={chevronLeftHeader} alt="" className="more-sports-bs__back-icon" />
        </button>
      ) : undefined}
      sheetClassName="more-sports-bs more-sports-bs--sport-list"
      bodyClassName="more-sports-bs__body"
      blurBackdrop
    >
      <div
        ref={contentRef}
        className="more-sports-bs__transition-shell"
      >
        {transition ? (
          <div
            key={transition.key}
            className={`more-sports-bs__transition-track more-sports-bs__transition-track--${transition.direction} more-sports-bs__transition-track--${transition.phase}`}
            onTransitionEnd={(event) => {
              if (event.target !== event.currentTarget || event.propertyName !== 'transform') return
              completeTransition(transition.to)
            }}
          >
            <div
              className="more-sports-bs__content"
              aria-hidden={displayView !== 'sports'}
            >
              {renderSportsList()}
            </div>
            <div
              className="more-sports-bs__content"
              aria-hidden={displayView !== 'competitions'}
            >
              {renderCompetitionView()}
            </div>
          </div>
        ) : (
          <div className="more-sports-bs__content more-sports-bs__content--single">
            {renderContent(currentView)}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
