import { useState } from 'react'
import { ProductRail } from '../SportRail'
import { casinoRailSections } from '../../data/homeProducts'
import { MoreCasinoBottomSheet } from '../BottomSheet'
import type { CasinoCategoryId, CasinoRailItem } from '../../shared/types/home'

interface CasinoRailProps {
  activeCategory: CasinoCategoryId
  disableInteractions?: boolean
  onCategoryChange?: (categoryId: CasinoCategoryId) => void
}

const liveCasinoCategoryIds = new Set<CasinoCategoryId>(['ao-vivo', 'roletas', 'blackjack'])

export function CasinoRail({
  activeCategory,
  disableInteractions = false,
  onCategoryChange,
}: CasinoRailProps) {
  const [isMoreCasinoOpen, setIsMoreCasinoOpen] = useState(false)
  const activeItemId = `casino:${activeCategory}`

  const handleSelectItem = (item: CasinoRailItem) => {
    if (item.isMore) {
      setIsMoreCasinoOpen(true)
      return
    }

    if (item.clickable === false) return
    onCategoryChange?.(item.categoryId)
  }

  return (
    <ProductRail
      sections={casinoRailSections}
      activeItemId={activeItemId}
      disableInteractions={disableInteractions}
      hasLiveIndicator={(item) => liveCasinoCategoryIds.has(item.categoryId)}
      onSelectItem={disableInteractions ? undefined : handleSelectItem}
      renderAfter={disableInteractions ? null : (
        <MoreCasinoBottomSheet
          isOpen={isMoreCasinoOpen}
          onClose={() => setIsMoreCasinoOpen(false)}
          activeCategory={activeCategory}
          onSelectCategory={onCategoryChange}
        />
      )}
    />
  )
}
