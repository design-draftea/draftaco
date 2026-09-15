import { CaretRightIcon } from '@phosphor-icons/react'
import iconAoVivo from '../../assets/iconAoVivo.png'
import type { CasinoCategoryId } from '../../shared/types/home'
import { casinoCarouselSections } from './casinoCarouselSections'
import './CasinoContent.css'

export interface CasinoGameOpenPayload {
  section: CasinoCarouselSection
  selectedIndex: number
}

interface CasinoContentProps {
  activeCategory: CasinoCategoryId
  onGameOpen?: (payload: CasinoGameOpenPayload) => void
}

export interface CasinoCarouselGame {
  id: string
  name: string
  image: string
  provider?: string
  categoryLabel?: string
  dealerName?: string
  minimumBet?: string
  winnerNamePrefix?: string
  winningAmount?: string
}

export interface CasinoCarouselSection {
  id: string
  title: string
  games: CasinoCarouselGame[]
}

const maskWinnerNamePrefix = (winnerNamePrefix: string) => {
  const visibleName = Array.from(winnerNamePrefix.trim()).slice(0, 3).join('')

  return visibleName ? `${visibleName}***` : '***'
}

const crashGameImages = Object.entries(
  import.meta.glob<string>('../../assets/jogosCassino/categoriaCrash/*.{avif,jpeg,jpg,png,webp}', {
    eager: true,
    import: 'default',
  })
)
  .sort(([firstPath], [secondPath]) => firstPath.localeCompare(secondPath))
  .map(([path, image]) => {
    const fileName = path.split('/').pop() ?? ''
    const id = fileName.replace(/\.[^.]+$/, '')
    const title = id
      .replace(/@poster-alternative-q80$/, '')
      .split('-')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    return {
      id,
      image,
      name: title,
    }
  })

export function CasinoContent({ activeCategory, onGameOpen }: CasinoContentProps) {
  if (activeCategory === 'crash') {
    return (
      <div className="casino-content casino-content--crash">
        <section className="casino-crash-page" aria-labelledby="casino-crash-title">
          <h2 id="casino-crash-title" className="casino-crash-page__title">Crash</h2>
          <div className="casino-crash-page__grid">
            {crashGameImages.map((game) => (
              <button
                key={game.id}
                type="button"
                className="casino-crash-card"
                aria-label={game.name}
              >
                <span className="casino-game-card__image-wrap casino-crash-card__image-wrap">
                  <img src={game.image} alt="" className="casino-game-card__image" />
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="casino-content">
      {casinoCarouselSections.map((section) => (
        <section key={section.id} className="casino-games-section">
          <div className="casino-games-section__header">
            <div className="casino-games-section__title">
              <span>{section.title}</span>
              <CaretRightIcon aria-hidden="true" className="casino-games-section__arrow" weight="bold" />
            </div>
          </div>

          <div className="casino-games-section__list">
            {section.games.map((game, gameIndex) => {
              const maskedWinnerName = game.winnerNamePrefix ? maskWinnerNamePrefix(game.winnerNamePrefix) : ''
              const isOpenableGame = !!onGameOpen

              return (
                <button
                  key={game.id}
                  type="button"
                  className={[
                    'casino-game-card',
                    isOpenableGame ? 'casino-game-card--openable' : '',
                    section.id === 'cassino-ao-vivo' ? 'casino-game-card--live' : '',
                    section.id === 'ganhando-agora' ? 'casino-game-card--winning' : '',
                  ].filter(Boolean).join(' ')}
                  aria-label={[
                    game.name,
                    game.dealerName ? `Dealer ${game.dealerName}` : '',
                    game.minimumBet ?? '',
                    maskedWinnerName && game.winningAmount ? `${maskedWinnerName} ganhou ${game.winningAmount}` : '',
                  ].filter(Boolean).join(', ')}
                  onClick={isOpenableGame ? () => onGameOpen?.({ section, selectedIndex: gameIndex }) : undefined}
                >
                  <span className="casino-game-card__image-wrap">
                    <img src={game.image} alt="" className="casino-game-card__image" />
                    {section.id === 'cashback' && (
                      <span className="casino-game-card__tag">Cashback</span>
                    )}
                    {section.id === 'cassino-ao-vivo' && (
                      <span className="casino-game-card__live-tag">
                        <span className="casino-game-card__live-icon-wrap" aria-hidden="true">
                          <img src={iconAoVivo} alt="" className="casino-game-card__live-icon" />
                        </span>
                        <span>Ao Vivo</span>
                      </span>
                    )}
                  </span>
                  {section.id === 'ganhando-agora' && maskedWinnerName && game.winningAmount && (
                    <span className="casino-game-card__winning-meta">
                      <span className="casino-game-card__winner-name">{maskedWinnerName} ganhou</span>
                      <span className="casino-game-card__winning-amount">{game.winningAmount}</span>
                    </span>
                  )}
                  {section.id === 'cassino-ao-vivo' && game.dealerName && game.minimumBet && (
                    <span className="casino-game-card__live-meta">
                      <span className="casino-game-card__live-meta-text">
                        {game.dealerName} - {game.minimumBet}
                      </span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      ))}

    </div>
  )
}
