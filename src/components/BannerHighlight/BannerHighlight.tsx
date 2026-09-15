import { BannerCarousel } from '../BannerCarousel'
import './BannerHighlight.css'
import type { Banner } from '../../shared/types/home'

interface BannerHighlightProps {
  hideBanner?: boolean
  banners?: Banner[]
  disableInteractions?: boolean
  onBannerClick?: (banner: Banner) => void
}

export function BannerHighlight({ hideBanner, banners, disableInteractions = false, onBannerClick }: BannerHighlightProps = {}) {
  if (hideBanner) return null
  return (
    <section className="banner-highlight">
      <BannerCarousel banners={banners} disableInteractions={disableInteractions} onBannerClick={onBannerClick} />
    </section>
  )
}
