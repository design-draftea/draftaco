import { exactDrafteaTranslations, drafteaReplacements } from '../../brands/draftea/legacyCopy'
import type { BrandId as BrandMode } from '../brand/types'
import type { ProductMode } from '../types/home'

const productLabelsByBrand: Record<BrandMode, Record<ProductMode, string>> = {
  pitaco: {
    apostas: 'APOSTAS',
    cassino: 'CASSINO',
  },
  draftea: {
    apostas: 'APUESTAS',
    cassino: 'CASINO',
  },
}

export const getProductLabelForBrand = (product: ProductMode, brandMode: BrandMode) => (
  productLabelsByBrand[brandMode][product]
)

export const localizeCopy = (value: string, brandMode: BrandMode) => {
  if (brandMode === 'pitaco') return value
  const exactTranslation = exactDrafteaTranslations[value]
  if (exactTranslation) return exactTranslation

  return drafteaReplacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value)
}

