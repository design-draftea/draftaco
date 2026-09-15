import { useEffect, useMemo, useState, useRef, type CSSProperties } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'
import './PromotionSection.css'
import { sportsPromotions } from '../../data/homeProducts'
import type { Promotion } from '../../shared/types/home'

const MINUTE_IN_MS = 60_000

const formatCountdown = (totalMinutes: number) => {
  const safeMinutes = Math.max(0, totalMinutes)
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60

  return `${hours.toString().padStart(2, '0')}h : ${minutes.toString().padStart(2, '0')}m`
}

interface PromotionSectionProps {
  promotions?: Promotion[]
  title?: string
  variant?: 'standard' | 'highlight'
  highlightCardSize?: 'default' | 'wide'
}

export function PromotionSection({
  promotions = sportsPromotions,
  title = 'Promoções',
  variant = 'standard',
  highlightCardSize = 'default',
}: PromotionSectionProps = {}) {
  const [isDragging, setIsDragging] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const scrollLeft = useRef(0)
  const [countdownStartedAt] = useState(() => Date.now())
  const [currentTime, setCurrentTime] = useState(countdownStartedAt)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    setIsDragging(true)
    startX.current = e.pageX - scrollRef.current.offsetLeft
    scrollLeft.current = scrollRef.current.scrollLeft
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX.current) * 1.5
    scrollRef.current.scrollLeft = scrollLeft.current - walk
  }

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false)
    }
  }

  const isHighlightVariant = variant === 'highlight'
  const isWideHighlight = isHighlightVariant && highlightCardSize === 'wide'

  const countdownEndsAt = useMemo(() => {
    return promotions.reduce<Record<string, number>>((endsAt, promo) => {
      if (promo.countdownMinutes == null) return endsAt

      endsAt[promo.id] = countdownStartedAt + promo.countdownMinutes * MINUTE_IN_MS
      return endsAt
    }, {})
  }, [countdownStartedAt, promotions])

  useEffect(() => {
    if (!isHighlightVariant) return undefined

    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isHighlightVariant])

  const getCountdownLabel = (promo: Promotion) => {
    const endTime = countdownEndsAt[promo.id]

    if (promo.countdownMinutes == null || endTime == null) {
      return promo.countdownLabel ?? promo.timeLabel
    }

    const remainingMs = endTime - currentTime
    const remainingMinutes = Math.ceil(Math.max(0, remainingMs) / MINUTE_IN_MS)

    return formatCountdown(remainingMinutes)
  }

  const renderHighlightCard = (promo: Promotion) => {
    const titleLines = promo.titleLines ?? promo.title.split('\n')
    const cardStyle = {
      '--promo-card-background-image': `url(${promo.image})`,
    } as CSSProperties

    return (
      <article
        key={promo.id}
        className={`promo-highlight-card promo-highlight-card--${promo.accent ?? 'mint'}`}
        style={cardStyle}
        data-node-id="469:13062"
      >
        <div className="promo-highlight-card__content">
          <p className="promo-highlight-card__headline">{promo.headline ?? promo.label.join(' ')}</p>
          <div className="promo-highlight-card__title">
            {titleLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
          <div className="promo-highlight-card__footer">
            <span className="promo-highlight-card__countdown">{getCountdownLabel(promo)}</span>
            <span className="promo-highlight-card__rules">{promo.rulesLabel ?? 'Ver regras'}</span>
          </div>
        </div>
      </article>
    )
  }

  return (
    <section
      id="section-promocoes"
      className={[
        'promotion-section',
        isHighlightVariant ? 'promotion-section--highlight' : '',
        isWideHighlight ? 'promotion-section--highlight-wide' : '',
      ].filter(Boolean).join(' ')}
      aria-label={isHighlightVariant ? title : undefined}
    >
      {!isHighlightVariant && (
        <div className="promotion-section__header">
          <div className="promotion-section__title">
            <span>{title}</span>
            <CaretRightIcon aria-hidden="true" className="promotion-section__arrow" weight="bold" />
          </div>
        </div>
      )}

      <div 
        className={`promotion-section__list ${isDragging ? 'promotion-section__list--dragging' : ''}`}
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {promotions.map((promo) => (
          isHighlightVariant ? renderHighlightCard(promo) : (
            <div key={promo.id} className="promo-card">
              <div className="promo-card__image-wrapper">
                <img src={promo.image} alt="" className="promo-card__image" />
                <div className="promo-card__label">
                  {promo.label.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
              <div className="promo-card__content">
                <p className="promo-card__description">{promo.description}</p>
              </div>
            </div>
          )
        ))}
      </div>

    </section>
  )
}
