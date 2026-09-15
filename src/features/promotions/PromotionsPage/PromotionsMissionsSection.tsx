import { getBrandConfig } from '../../../shared/brand/config'
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import imgPromoAumentada from '../../../assets/img-promo-aumentada.png'
import imgPromoCashback from '../../../assets/img-promo-cashback.png'
import imgPromoMultiplaTurbinada from '../../../assets/img-promo-multipla-turbinada.png'
import imgPromoPagamentoAntecipadoFutebol from '../../../assets/img-promo-pagamento-antecipado-futebol.png'
import imgPromoPechincha from '../../../assets/img-promo-pechincha.png'
import imgPromoPitacoClub from '../../../assets/img-promo-pitaco-club.png'
import imgPromoPiggy from '../../../assets/img-promo-piggy.png'
import imgPromoRabbit from '../../../assets/img-promo-rabbit.webp'
import imgPromoSuperAumentada from '../../../assets/img-promo-super-aumentada.png'
import imgPromoSubstituicaoProtegida from '../../../assets/img-promo-substituicao-protegida.png'
import imgPromoTesouroDoRei from '../../../assets/img-promo-tesouro-do-rei.png'
import imgMissaoVerdao from '../../../assets/imgMissaoVerdao.png'
import type { ProductMode } from '../../../shared/types/home'

type PromotionsFilterId = 'todos' | ProductMode

interface PromotionSectionCard {
  id: string
  expiresLabel?: string
  mediaImage?: string
  mediaTitleLines: string[]
  products: ProductMode[]
  title: string
  description: string
  primaryActionLabel?: string
}

interface PromotionsMissionsSectionProps {
  activeFilter: PromotionsFilterId
}

interface PromotionCarouselSectionProps {
  id: string
  title: string
  ariaLabel: string
  cards: PromotionSectionCard[]
  activeFilter: PromotionsFilterId
}

const missionCards: PromotionSectionCard[] = [
  {
    id: 'palmeiras-libertadores',
    expiresLabel: 'Termina em 3 dias',
    mediaImage: imgMissaoVerdao,
    mediaTitleLines: ['Aposte no', 'Verdão'],
    products: ['apostas'],
    title: 'Aposte no Palmeiras na Liberta e ganhe 10 Créditos.',
    description: 'Aposte R$50 no jogo do Palmeiras na Libertadores e ganhe R$10 em créditos para usar no Pitaco.',
    primaryActionLabel: 'Ativar Missão',
  },
  {
    id: 'fortune-rabbit-coroas',
    expiresLabel: 'Termina em 3 dias',
    mediaImage: imgPromoRabbit,
    mediaTitleLines: ['Missão', 'Fortune Rabbit'],
    products: ['cassino'],
    title: 'Aposte no Fortune Rabbit e ganhe 50 coroas.',
    description: 'Aposte R$100 no jogo Fortune Rabbit e ganhe 50 coroas para continuar jogando no Rei.',
    primaryActionLabel: 'Ativar Missão',
  },
  {
    id: 'lucky-piggy-rodadas',
    expiresLabel: 'Termina em 3 dias',
    mediaImage: imgPromoPiggy,
    mediaTitleLines: ['Missão', 'Lucky Piggy'],
    products: ['cassino'],
    title: 'Aposte no Lucky Piggy e ganhe 5 rodadas.',
    description: 'Aposte R$20 no Lucky Piggy e ganhe 5 rodadas grátis para tentar a sorte no Pitaco.',
    primaryActionLabel: 'Ativar Missão',
  },
]

const advantageCards: PromotionSectionCard[] = [
  {
    id: 'pagamento-antecipado-futebol',
    mediaImage: imgPromoPagamentoAntecipadoFutebol,
    mediaTitleLines: ['Pagamento', 'Antecipado', 'Futebol'],
    products: ['apostas'],
    title: 'Se o time abrir dois gols, seu pagamento cai na conta já.',
    description: 'Receba o pagamento da sua aposta automaticamente assim que o time em que você apostou abrir uma vantagem de 2 gols.',
  },
  {
    id: 'multipla-turbinada',
    mediaImage: imgPromoMultiplaTurbinada,
    mediaTitleLines: ['Múltipla', 'Turbinada'],
    products: ['apostas'],
    title: 'Aposte em múltiplas e o Rei turbina o seu prêmio em até 200%.',
    description: 'Ganhe até 200% a mais sobre o lucro da sua aposta montando uma múltipla com mercados participantes.',
  },
  {
    id: 'substituicao-protegida',
    mediaImage: imgPromoSubstituicaoProtegida,
    mediaTitleLines: ['Substituição', 'Protegida'],
    products: ['apostas'],
    title: 'Sua aposta continua valendo mesmo se seu jogador for substituído.',
    description: 'Caso o jogador que você apostou for substituído, sua aposta passará a contar com o jogador que entrou no lugar dele.',
  },
]

const programCards: PromotionSectionCard[] = [
  {
    id: 'tesouro-do-rei',
    mediaImage: imgPromoTesouroDoRei,
    mediaTitleLines: ['Tesouro do Pitaco'],
    products: ['apostas', 'cassino'],
    title: 'Jogue, conquiste chaves e descubra se o Tesouro é seu.',
    description: 'A cada R$50 apostados em Betting ou Cassino, você ganha uma chave para tentar abrir o Tesouro do Pitaco que está acumulado.',
    primaryActionLabel: 'Abrir Baú Grátis',
  },
  {
    id: 'pitaco-club',
    mediaImage: imgPromoPitacoClub,
    mediaTitleLines: ['Pitaco Club'],
    products: ['apostas', 'cassino'],
    title: 'Acumule pontos e conquiste prêmios exclusivos!',
    description: 'Receba o pagamento da sua aposta automaticamente assim que o time em que você apostou abrir uma vantagem de 2 gols.',
    primaryActionLabel: 'Acessar Club',
  },
  {
    id: 'cashback',
    mediaImage: imgPromoCashback,
    mediaTitleLines: ['Cashback'],
    products: ['cassino'],
    title: 'Se o time abrir 20 pontos, seu pagamento cai na conta já.',
    description: 'Receba o pagamento automaticamente assim que o time em que você apostou abrir uma vantagem de 20 pontos.',
    primaryActionLabel: 'Acessar Jogos',
  },
]

const mustSeeCards: PromotionSectionCard[] = [
  {
    id: 'pechincha',
    mediaImage: imgPromoPechincha,
    mediaTitleLines: ['Pechincha'],
    products: ['apostas'],
    title: 'Pechinchas exclusivas para suas chances aumentarem.',
    description: 'Reduzimos os valores das linhas para você ter mais chances de vencer! Aproveite e multiplique suas conquistas!',
  },
  {
    id: 'aumentada',
    mediaImage: imgPromoAumentada,
    mediaTitleLines: ['Aumentada'],
    products: ['apostas'],
    title: 'Odds maiores para que você possa ganhar ainda mais.',
    description: 'Um boost exclusivo que aumenta o valor de algumas ofertas selecionadas, garantindo um ganho extra em cada aposta realizada.',
  },
  {
    id: 'super-aumentada',
    mediaImage: imgPromoSuperAumentada,
    mediaTitleLines: ['Super Aumentada'],
    products: ['apostas'],
    title: 'Odds ainda maiores para você alcançar vitórias gigantes.',
    description: 'Quando a Aumentada não é o suficiente, entra a Super Aumentada, com odds turbinadas para quem busca os maiores ganhos.',
  },
]

const productLabels: Record<ProductMode, string> = {
  apostas: 'Apostas',
  cassino: 'Cassino',
}

export function PromotionsMissionsSection({ activeFilter }: PromotionsMissionsSectionProps) {
  return (
    <>
      <PromotionCarouselSection
        id="section-promocoes-missoes"
        title="Missões"
        ariaLabel="Cards de missões promocionais"
        cards={missionCards}
        activeFilter={activeFilter}
      />
      <PromotionCarouselSection
        id="section-promocoes-vantagens"
        title="Vantagens"
        ariaLabel="Cards de vantagens promocionais"
        cards={advantageCards}
        activeFilter={activeFilter}
      />
      <PromotionCarouselSection
        id="section-promocoes-programa"
        title="Programa"
        ariaLabel="Cards de programas promocionais"
        cards={programCards}
        activeFilter={activeFilter}
      />
      <PromotionCarouselSection
        id="section-promocoes-imperdiveis"
        title="Imperdíveis"
        ariaLabel="Cards de promoções imperdíveis"
        cards={mustSeeCards}
        activeFilter={activeFilter}
      />
    </>
  )
}

function PromotionCarouselSection({
  id,
  title,
  ariaLabel,
  cards,
  activeFilter,
}: PromotionCarouselSectionProps) {
  const [isDragging, setIsDragging] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  const visibleCards = cards.filter((card) =>
    (getBrandConfig().features.casino || !card.products.includes('cassino'))
    && (activeFilter === 'todos' || card.products.includes(activeFilter))
  )

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0
    }
  }, [activeFilter])

  if (visibleCards.length === 0) return null

  const snapToNearestCard = (dragDelta: number = 0) => {
    if (!scrollRef.current) return
    const cardWidth = 304 + 8
    const currentScroll = scrollRef.current.scrollLeft
    const currentIndex = currentScroll / cardWidth

    let targetIndex: number
    if (dragDelta > 30) {
      targetIndex = Math.ceil(currentIndex)
    } else if (dragDelta < -30) {
      targetIndex = Math.floor(currentIndex)
    } else {
      targetIndex = Math.round(currentIndex)
    }

    const maxIndex = Math.max(
      0,
      Math.ceil((scrollRef.current.scrollWidth - scrollRef.current.clientWidth) / cardWidth)
    )
    targetIndex = Math.max(0, Math.min(targetIndex, maxIndex))

    scrollRef.current.scrollTo({
      left: targetIndex * cardWidth,
      behavior: 'smooth',
    })
  }

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return
    setIsDragging(true)
    startX.current = event.pageX - scrollRef.current.offsetLeft
    scrollLeft.current = scrollRef.current.scrollLeft
  }

  const handleMouseUp = () => {
    const delta = scrollRef.current ? scrollRef.current.scrollLeft - scrollLeft.current : 0
    setIsDragging(false)
    snapToNearestCard(delta)
  }

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollRef.current) return
    event.preventDefault()
    const x = event.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX.current) * 1.5
    scrollRef.current.scrollLeft = scrollLeft.current - walk
  }

  const handleMouseLeave = () => {
    if (!isDragging) return
    const delta = scrollRef.current ? scrollRef.current.scrollLeft - scrollLeft.current : 0
    setIsDragging(false)
    snapToNearestCard(delta)
  }

  return (
    <section id={id} className="promotions-missions-section">
      <div className="promotions-missions-section__header">
        <h2 className="promotions-missions-section__title">{title}</h2>
      </div>

      <div
        className={[
          'promotions-missions-section__list',
          isDragging ? 'promotions-missions-section__list--dragging' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        aria-label={ariaLabel}
      >
        {visibleCards.map((card) => (
          <article key={card.id} className="promotions-mission-card">
            <div
              className="promotions-mission-card__media"
              style={
                card.mediaImage
                  ? ({
                      '--promotions-mission-card-image': `url(${card.mediaImage})`,
                    } as CSSProperties)
                  : undefined
              }
            >
              {card.expiresLabel ? (
                <div className="promotions-mission-card__expires">
                  <span className="promotions-mission-card__expires-dot" aria-hidden="true" />
                  <span className="promotions-mission-card__expires-text">{card.expiresLabel}</span>
                </div>
              ) : null}

              <div className="promotions-mission-card__media-title">
                {card.mediaTitleLines.map((line) => (
                  <span key={line} className="promotions-mission-card__media-title-line">
                    {line}
                  </span>
                ))}
              </div>
            </div>

            <div className="promotions-mission-card__body">
              <div className="promotions-mission-card__tags" aria-label="Produtos">
                {card.products.map((product) => (
                  <span key={product} className="promotions-mission-card__tag">
                    {productLabels[product]}
                  </span>
                ))}
              </div>

              <h3 className="promotions-mission-card__title">{card.title}</h3>
              <p className="promotions-mission-card__description">{card.description}</p>

              <div className="promotions-mission-card__actions">
                {card.primaryActionLabel ? (
                  <button type="button" className="promotions-mission-card__button">
                    {card.primaryActionLabel}
                  </button>
                ) : null}
                <button type="button" className="promotions-mission-card__link-button">
                  Saiba Mais
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
