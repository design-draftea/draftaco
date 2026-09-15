import { useEffect, useState } from 'react'
import { getSportsDbTeamLogo, isSportsDbTeamLogoUrl } from '../../services/theSportsDbTeamLogos'
import { TEAM_LOGO_FALLBACK, normalizeTeamLogoSource } from '../utils/teamLogoFallback'

interface ResolvedTeamLogo {
  teamName: string
  sport: string
  logoUrl: string
}

interface UseSportsDbTeamLogoOptions {
  useCurrentLogoFallback?: boolean
}

export function useSportsDbTeamLogo(
  teamName: string,
  currentLogo: string | undefined,
  sport: string,
  fallbackLogo?: string,
  options: UseSportsDbTeamLogoOptions = {}
) {
  const { useCurrentLogoFallback = true } = options
  const [resolvedLogo, setResolvedLogo] = useState<ResolvedTeamLogo | null>(null)
  const normalizedTeamName = teamName.trim()
  const currentTeamLogo = normalizeTeamLogoSource(currentLogo)
  const fallbackTeamLogo = normalizeTeamLogoSource(fallbackLogo) ?? TEAM_LOGO_FALLBACK

  useEffect(() => {
    let cancelled = false

    if (!normalizedTeamName || sport === 'tenis' || isSportsDbTeamLogoUrl(currentTeamLogo)) return

    getSportsDbTeamLogo(normalizedTeamName, sport).then((logoUrl) => {
      if (!cancelled && logoUrl) setResolvedLogo({ teamName: normalizedTeamName, sport, logoUrl })
    })

    return () => {
      cancelled = true
    }
  }, [currentTeamLogo, normalizedTeamName, sport])

  if (isSportsDbTeamLogoUrl(currentTeamLogo)) return currentTeamLogo
  if (resolvedLogo?.teamName === normalizedTeamName && resolvedLogo.sport === sport) return resolvedLogo.logoUrl

  return (useCurrentLogoFallback ? currentTeamLogo : undefined) || (normalizedTeamName ? fallbackTeamLogo : undefined)
}
