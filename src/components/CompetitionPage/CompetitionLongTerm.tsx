import { useRef, useState } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'
import './CompetitionLongTerm.css'
import { TeamLogo } from '../TeamLogo'
import { useSlidingActiveIndicator } from '../../shared/hooks/useSlidingActiveIndicator'

import type { LongTermOdd } from './competitionData'

interface CompetitionLongTermProps {
  tabs: { id: string; label: string }[]
  oddsByTab: Record<string, LongTermOdd[]>
  sport?: string
}

export function CompetitionLongTerm({ tabs, oddsByTab, sport = '' }: CompetitionLongTermProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? '')
  const chipsRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([])
  const odds = oddsByTab[activeTab] ?? []
  const activeTabIndex = tabs.findIndex((tab) => tab.id === activeTab)
  const activeTabIndicatorKey = `${activeTab}:${tabs.map((tab) => tab.id).join('|')}`

  useSlidingActiveIndicator({
    activeKey: activeTabIndicatorKey,
    containerRef: chipsRef,
    getActiveElement: () => chipRefs.current[activeTabIndex],
  })

  return (
    <section className="competition-longterm">
      <div className="competition-longterm__header">
        <span>Longo Prazo</span>
      </div>

      <div className="competition-longterm__chips sliding-chip-group" ref={chipsRef}>
        <span className="sliding-chip-indicator" aria-hidden="true" />
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => { chipRefs.current[index] = el }}
            className={`competition-longterm__chip sliding-chip ${activeTab === tab.id ? 'competition-longterm__chip--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="competition-longterm__list">
        {odds.map((row) => (
          <button key={row.id} type="button" className="competition-longterm__row">
            {row.icon ? (
              <TeamLogo
                teamName={row.label}
                currentLogo={row.icon}
                sport={sport}
                className="competition-longterm__row-icon"
                placeholderClassName="competition-longterm__row-icon competition-longterm__row-icon--placeholder"
              />
            ) : (
              <span className="competition-longterm__row-icon competition-longterm__row-icon--placeholder" />
            )}
            <span className="competition-longterm__row-copy">
              <span className="competition-longterm__row-label">{row.label}</span>
              <span className="competition-longterm__row-market">{row.market}</span>
            </span>
            <span className="competition-longterm__row-odd">{row.odd}</span>
            <CaretRightIcon aria-hidden="true" className="competition-longterm__row-arrow" weight="bold" />
          </button>
        ))}
      </div>
    </section>
  )
}
