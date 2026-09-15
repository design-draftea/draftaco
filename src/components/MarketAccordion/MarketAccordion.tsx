import { useState, type ReactNode } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'
import './MarketAccordion.css'

// Acordeão de mercado usado na tela do evento e no bottom sheet de estatísticas da NFL.
// As classes mantêm o prefixo `live-event-inline__market-*` porque é de lá que ele veio;
// renomear só mudaria o CSS de lugar sem ganho.
export interface MarketAccordionProps {
  title: string
  subtitle?: string
  badges?: string[]
  className?: string
  defaultOpen?: boolean
  children: ReactNode
}

const normalizeMarketBadge = (badge: string) => badge.replace(/90['\u2019]?/g, '90\u2019')

export function MarketAccordion({
  title,
  subtitle,
  badges = ['PA', '90\u2019'],
  className = '',
  defaultOpen = true,
  children,
}: MarketAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section className={[
      'live-event-inline__market-section',
      isOpen ? '' : 'live-event-inline__market-section--collapsed',
      className,
    ].filter(Boolean).join(' ')}>
      <header className="live-event-inline__market-header">
        <h3>
          {title}
          {subtitle && <span className="live-event-inline__market-subtitle">{subtitle}</span>}
        </h3>
        <div className="live-event-inline__market-actions">
          <span className="home-competition__tags live-event-inline__market-badges">
            {badges.map((badge) => (
              <span key={badge} className="home-competition__tag">{normalizeMarketBadge(badge)}</span>
            ))}
          </span>
          <button
            type="button"
            className="live-event-inline__market-toggle"
            aria-expanded={isOpen}
            aria-label={`${isOpen ? 'Recolher' : 'Expandir'} ${title}`}
            onClick={() => setIsOpen((current) => !current)}
          >
            <CaretRightIcon aria-hidden="true" className="live-event-inline__market-chevron" weight="bold" />
          </button>
        </div>
      </header>
      <div className="live-event-inline__market-body" aria-hidden={!isOpen}>
        <div className="live-event-inline__market-body-inner">
          {children}
        </div>
      </div>
    </section>
  )
}
