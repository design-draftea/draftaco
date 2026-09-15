import { getTeamLogo } from '../../data/teamLogos'
import { useSportsDbTeamLogo } from '../../shared/hooks/useSportsDbTeamLogo'
import { getTennisPlayerCountryIcon } from '../../data/tennisCountryIcons'
import { isTeamLogoFallback } from '../../shared/utils/teamLogoFallback'

interface TeamLogoProps {
  teamName: string
  sport: string
  currentLogo?: string
  className: string
  fallbackClassName?: string
  placeholderClassName?: string
  alt?: string
  useCurrentLogoFallback?: boolean
}

export function TeamLogo({
  teamName,
  sport,
  currentLogo,
  className,
  fallbackClassName = '',
  placeholderClassName = '',
  alt = '',
  useCurrentLogoFallback = true,
}: TeamLogoProps) {
  const mappedLogo = getTeamLogo(teamName)
  const currentTeamLogo = mappedLogo || currentLogo
  const sportsDbResolvedLogo = useSportsDbTeamLogo(teamName, currentTeamLogo, sport, undefined, {
    useCurrentLogoFallback,
  })
  const tennisCountryIcon = sport === 'tenis' ? getTennisPlayerCountryIcon(teamName) : ''
  const resolvedLogo = tennisCountryIcon || sportsDbResolvedLogo

  if (!resolvedLogo) {
    return placeholderClassName ? <span className={placeholderClassName} /> : null
  }

  const isFallback = isTeamLogoFallback(resolvedLogo)
  const fallbackClassIsSportSpecific = fallbackClassName.includes('--sport') || fallbackClassName.includes('--basketball')
  const logoClassName = [
    className,
    isFallback && !fallbackClassIsSportSpecific ? fallbackClassName : '',
  ].filter(Boolean).join(' ')

  return <img src={resolvedLogo} alt={alt} className={logoClassName} />
}
