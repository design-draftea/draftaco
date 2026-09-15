import { currentBrand } from './routing'

const keyFor = (key: string) => `draftaco:${currentBrand()}:${key.replace(/^draftaco:/, '')}`
export const brandStorage = {
  getItem(key: string) { try { return window.localStorage.getItem(keyFor(key)) } catch { return null } },
  setItem(key: string, value: string) { try { window.localStorage.setItem(keyFor(key), value) } catch { /* Storage is optional in the prototype. */ } },
  removeItem(key: string) { try { window.localStorage.removeItem(keyFor(key)) } catch { /* Storage is optional. */ } },
}
