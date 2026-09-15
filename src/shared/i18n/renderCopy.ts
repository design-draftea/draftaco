import { currentBrand } from '../brand/routing'
import { localizeCopy } from './brandLocalization'

// Compatibility for the existing Portuguese copy. New features should use explicit
// brand messages. Translate during React element creation, never mutate React's DOM.
function translate(value: string): string {
  if (currentBrand() === 'pitaco') return value
  return value.replace(/^(\s*)([\s\S]*?)(\s*)$/, (_, start, text, end) => `${start}${localizeCopy(text, 'draftea')}${end}`)
}
function childrenCopy(value: unknown): unknown {
  if (typeof value === 'string') return translate(value)
  if (Array.isArray(value)) return value.map(childrenCopy)
  return value
}
export function localizeProps(type: unknown, props: unknown): unknown {
  if (!props || typeof props !== 'object' || currentBrand() === 'pitaco') return props
  const original = props as Record<string, unknown>
  if (original['data-brand-localization-skip'] === 'true' || ['script', 'style', 'svg'].includes(String(type))) return props
  // Component props stay intact. Intrinsic elements and fragments own rendered copy.
  if (typeof type !== 'string' && typeof type !== 'symbol') return props
  const next = { ...original }
  if ('children' in next) next.children = childrenCopy(next.children)
  for (const attr of ['aria-label', 'alt', 'placeholder', 'title']) {
    if (typeof next[attr] === 'string') next[attr] = translate(next[attr] as string)
  }
  return next
}
