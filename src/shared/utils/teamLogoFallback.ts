import flagFallback from '../../assets/iconsDraftaco/flagFallback.svg'
import iconBasquete from '../../assets/iconSports/basketball.png'
import iconFutebol from '../../assets/iconSports/soccer.png'
import iconTenis from '../../assets/iconSports/tennis.png'
import escudoDefaultBasquete from '../../assets/escudoDefaultBasquete.png'

export const TEAM_LOGO_FALLBACK = flagFallback

const legacyTeamLogoFallbacks = new Set([
  iconBasquete,
  iconFutebol,
  iconTenis,
  escudoDefaultBasquete,
])

export function isTeamLogoFallback(src: string | undefined) {
  return src === TEAM_LOGO_FALLBACK
}

export function isLegacyTeamLogoFallback(src: string | undefined) {
  return Boolean(src && legacyTeamLogoFallbacks.has(src))
}

export function normalizeTeamLogoSource(src: string | undefined) {
  if (!src || isTeamLogoFallback(src) || isLegacyTeamLogoFallback(src)) return undefined
  return src
}
