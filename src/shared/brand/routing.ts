import type { BrandId } from './types'

export function deploymentBase(pathname = window.location.pathname): string {
  const configured = import.meta.env.BASE_URL.replace(/\/+$/, '')
  if (configured) return configured
  return /^\/draftaco(?:\/|$)/.test(pathname) ? '/draftaco' : ''
}

export function parseBrandPath(pathname: string) {
  const base = deploymentBase(pathname)
  const path = base && (pathname === base || pathname.startsWith(`${base}/`))
    ? pathname.slice(base.length) : pathname
  const segments = path.split('/').filter(Boolean)
  const explicitBrand = segments[0] === 'pitaco' || segments[0] === 'draftea'
  const brand: BrandId = explicitBrand ? segments.shift() as BrandId : 'pitaco'
  return { brand, explicitBrand, path: `/${segments.join('/')}` }
}

export const currentBrand = () => parseBrandPath(window.location.pathname).brand
export const brandBasePath = (brand = currentBrand()) => `${deploymentBase()}/${brand}`
export const brandPath = (path: string, brand = currentBrand()) => `${brandBasePath(brand)}/${path.replace(/^\/+/, '')}`

// Brand changes reload the application so transient state and styles cannot cross brands.
export function navigateToBrand(brand: BrandId) {
  const current = parseBrandPath(window.location.pathname)
  const path = brand === 'draftea' && current.path === '/criar-conta' ? '/apostas' : current.path
  window.location.assign(`${brandPath(path, brand)}${window.location.search}${window.location.hash}`)
}
