import { pitaco } from '../../brands/pitaco/config'
import { draftea } from '../../brands/draftea/config'
import { currentBrand, brandPath, parseBrandPath } from './routing'
import type { BrandId } from './types'

export const brands = { pitaco, draftea }
export const getBrandConfig = (brand: BrandId = currentBrand()) => brands[brand]

export function initializeBrand() {
  const config = getBrandConfig()
  const route = parseBrandPath(window.location.pathname)
  const isUnavailable = (!config.features.signup && route.path === '/criar-conta')
    || (!config.features.casino && /^\/cassino(?:\/|$)/.test(route.path))
  const path = isUnavailable ? '/apostas' : route.path
  if (!route.explicitBrand || path !== route.path) {
    window.history.replaceState({}, '', `${brandPath(path)}${window.location.search}${window.location.hash}`)
  }
  document.documentElement.lang = config.locale
  document.documentElement.dataset.brandMode = config.id
  document.title = `${config.name} — Draftaco`
}
