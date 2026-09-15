import { brandStorage } from './shared/brand/storage'
export type AppTheme = 'dark' | 'light'
export type AppThemePreference = AppTheme | 'system'

const appThemeStorageKey = 'draftaco-theme'
const appThemePreferenceStorageKey = 'pitaco-theme-preference'
export const appThemePreferenceChangeEvent = 'pitaco-theme-preference-change'
const defaultAppThemePreference: AppThemePreference = 'dark'
const supportedThemes = new Set<AppTheme>(['dark', 'light'])
const supportedThemePreferences = new Set<AppThemePreference>(['dark', 'light', 'system'])

const isAppTheme = (theme: string | null): theme is AppTheme => Boolean(theme && supportedThemes.has(theme as AppTheme))
const isAppThemePreference = (themePreference: string | null): themePreference is AppThemePreference =>
  Boolean(themePreference && supportedThemePreferences.has(themePreference as AppThemePreference))

const getSystemAppTheme = (): AppTheme => {
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light'

  return 'dark'
}

export const applyAppTheme = (theme: AppTheme) => {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export const resolveAppThemePreference = (themePreference: AppThemePreference): AppTheme => {
  if (themePreference === 'system') return getSystemAppTheme()

  return themePreference
}

export const applyAppThemePreference = (themePreference: AppThemePreference) => {
  document.documentElement.dataset.themePreference = themePreference
  applyAppTheme(resolveAppThemePreference(themePreference))
}

export const setAppThemePreference = (themePreference: AppThemePreference) => {
  applyAppThemePreference(themePreference)

  try {
    brandStorage.setItem(appThemePreferenceStorageKey, themePreference)

    if (themePreference === 'system') {
      brandStorage.removeItem(appThemeStorageKey)
    } else {
      brandStorage.setItem(appThemeStorageKey, themePreference)
    }
  } catch {
    // Theme still applies for the current session when storage is unavailable.
  }

  window.dispatchEvent(new CustomEvent<AppThemePreference>(appThemePreferenceChangeEvent, {
    detail: themePreference,
  }))
}

const getThemeFromUrl = () => {
  const theme = new URLSearchParams(window.location.search).get('theme')
  return isAppTheme(theme) ? theme : null
}

export const getStoredAppThemePreference = (): AppThemePreference => {
  try {
    const themePreference = brandStorage.getItem(appThemePreferenceStorageKey)

    if (isAppThemePreference(themePreference)) return themePreference

    const theme = brandStorage.getItem(appThemeStorageKey)
    if (isAppTheme(theme)) return theme
  } catch {
    return defaultAppThemePreference
  }

  return defaultAppThemePreference
}

export const getCurrentAppThemePreference = (): AppThemePreference => {
  const themePreference = document.documentElement.dataset.themePreference ?? null

  if (isAppThemePreference(themePreference)) return themePreference

  const theme = document.documentElement.dataset.theme ?? null
  if (isAppTheme(theme)) return theme

  return getStoredAppThemePreference()
}

export const initializeAppTheme = () => {
  const queryTheme = getThemeFromUrl()

  if (queryTheme) {
    setAppThemePreference(queryTheme)
    return
  }

  setAppThemePreference(defaultAppThemePreference)
}
