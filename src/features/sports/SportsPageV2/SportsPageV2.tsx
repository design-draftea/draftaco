import { useMemo, useState } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'
import { BannerCarousel } from '../../../components/BannerCarousel'
import { ContentFilterChips } from '../../../components/ContentFilterChips'
import { HeaderV2 } from '../../../components/HeaderV2'
import { HomeCompetitionSection } from '../../../components/HomeCompetitionSection'
import { SportRail } from '../../../components/SportRail'
import type { Banner, HomeCompetitionMatch } from '../../../shared/types/home'
import type { CompetitionLinkTarget } from '../../../shared/utils/competitionNavigation'
import { Home } from '../../home/Home'
import {
  getDefaultSportsPageV2Competition,
  getSportsPageV2CompetitionHighlight,
  sportsPageV2Banners,
  sportsPageV2Competitions,
  type SportsPageV2Competition,
  type SportsPageV2Sport,
} from './sportsPageV2Data'
import './SportsPageV2.css'

interface SportsPageV2Props {
  authVariant?: 'logged-in' | 'logged-out'
  balanceCents?: number
  depositStatus?: 'deposit-pending' | 'identity-pending' | 'limits-pending'
  isProfileOpen?: boolean
  onCreateAccountClick?: () => void
  onDepositOpen?: () => void
  onIdentityOpen?: () => void
  onLimitsOpen?: () => void
  onLoginClick?: () => void
  onProfileOpen?: () => void
  onLiveEventOpenChange?: (isOpen: boolean) => void
  onLogoDoubleClick?: () => void
  onSportsHomeClick?: () => void
}

const supportedSports = new Set<SportsPageV2Sport>(['futebol', 'basquete'])

const isSportsPageV2Sport = (sport: string): sport is SportsPageV2Sport => (
  supportedSports.has(sport as SportsPageV2Sport)
)

export function SportsPageV2({
  authVariant = 'logged-out',
  balanceCents,
  depositStatus,
  isProfileOpen,
  onCreateAccountClick,
  onDepositOpen,
  onIdentityOpen,
  onLimitsOpen,
  onLoginClick,
  onProfileOpen,
  onLiveEventOpenChange,
  onLogoDoubleClick,
  onSportsHomeClick,
}: SportsPageV2Props = {}) {
  const [activeSport, setActiveSport] = useState<SportsPageV2Sport | null>(null)
  const [selectedCompetition, setSelectedCompetition] = useState<SportsPageV2Competition>(() => (
    getDefaultSportsPageV2Competition('futebol')
  ))
  const [isCompetitionOpen, setIsCompetitionOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>()
  const competitionOptions = activeSport ? sportsPageV2Competitions[activeSport] : []
  const competitionHighlight = useMemo(() => (
    activeSport ? getSportsPageV2CompetitionHighlight(activeSport, selectedCompetition) : undefined
  ), [activeSport, selectedCompetition])

  const handleSportsHome = () => {
    setActiveSport(null)
    setSelectedCompetition(getDefaultSportsPageV2Competition('futebol'))
    setIsCompetitionOpen(false)
    setSelectedEventId(undefined)
    onSportsHomeClick?.()
  }

  const handleSportChange = (sportId: string) => {
    if (sportId === 'destaques') {
      handleSportsHome()
      return
    }

    if (!isSportsPageV2Sport(sportId)) return

    setActiveSport(sportId)
    setSelectedCompetition(getDefaultSportsPageV2Competition(sportId))
    setIsCompetitionOpen(false)
    setSelectedEventId(undefined)
  }

  const handleCompetitionChipChange = (competitionId: string) => {
    const competition = competitionOptions.find((option) => option.id === competitionId)
    if (!competition) return

    setSelectedCompetition(competition)
    setIsCompetitionOpen(false)
    setSelectedEventId(undefined)
  }

  const handleOpenCompetition = (target: CompetitionLinkTarget) => {
    if (!isSportsPageV2Sport(target.sport)) return

    setActiveSport(target.sport)
    setSelectedCompetition({
      id: target.id,
      label: target.name.toUpperCase(),
      name: target.name,
    })
    setSelectedEventId(undefined)
    setIsCompetitionOpen(true)
  }

  const handleOverviewMatchClick = (match: HomeCompetitionMatch) => {
    setSelectedEventId(match.id)
    setIsCompetitionOpen(true)
  }

  const handleBannerClick = (banner: Banner) => {
    const eventLink = banner.eventLink
    if (!eventLink || !isSportsPageV2Sport(eventLink.sport)) return

    setActiveSport(eventLink.sport)
    setSelectedCompetition({
      id: eventLink.competitionId,
      label: eventLink.competitionName.toUpperCase(),
      name: eventLink.competitionName,
    })
    setSelectedEventId(eventLink.eventId)
    setIsCompetitionOpen(true)
  }

  if (!activeSport) {
    return (
      <Home
        activeProduct="apostas"
        authVariant={authVariant}
        balanceCents={balanceCents}
        depositStatus={depositStatus}
        isProfileOpen={isProfileOpen}
        onCreateAccountClick={onCreateAccountClick}
        onDepositOpen={onDepositOpen}
        onIdentityOpen={onIdentityOpen}
        onLimitsOpen={onLimitsOpen}
        onLoginClick={onLoginClick}
        onProfileOpen={onProfileOpen}
        onLiveEventOpenChange={onLiveEventOpenChange}
        onLogoDoubleClick={onLogoDoubleClick}
        onSportsOverviewChange={handleSportChange}
        key="sports-v2-highlights"
      />
    )
  }

  if (isCompetitionOpen) {
    return (
      <Home
        activeProduct="apostas"
        authVariant={authVariant}
        balanceCents={balanceCents}
        depositStatus={depositStatus}
        isProfileOpen={isProfileOpen}
        initialActiveSport={activeSport}
        initialCompetition={{ id: selectedCompetition.id, name: selectedCompetition.name }}
        initialEventId={selectedEventId}
        onCreateAccountClick={onCreateAccountClick}
        onDepositOpen={onDepositOpen}
        onIdentityOpen={onIdentityOpen}
        onLimitsOpen={onLimitsOpen}
        onLoginClick={onLoginClick}
        onProfileOpen={onProfileOpen}
        onLiveEventOpenChange={onLiveEventOpenChange}
        onLogoDoubleClick={onLogoDoubleClick}
        onSportsOverviewChange={handleSportChange}
        key={`${activeSport}:${selectedCompetition.id}:${selectedEventId ?? 'competition'}`}
      />
    )
  }

  const rail = (
    <SportRail
      activeSport={activeSport}
      allowCompetitionInteraction
      allowHighlightsInteraction
      onOpenCompetition={handleOpenCompetition}
      onSportChange={handleSportChange}
    />
  )

  const pageClassName = [
    'home',
    'home--v2',
    'sports-page-v2',
  ].filter(Boolean).join(' ')

  return (
    <main className={pageClassName}>
      <HeaderV2
        activeProduct="apostas"
        activeSport={activeSport}
        authVariant={authVariant}
        balanceCents={balanceCents}
        depositStatus={depositStatus}
        isProfileOpen={isProfileOpen}
        onCreateAccountClick={onCreateAccountClick}
        onDepositOpen={onDepositOpen}
        onIdentityOpen={onIdentityOpen}
        onLimitsOpen={onLimitsOpen}
        onLoginClick={onLoginClick}
        onProfileOpen={onProfileOpen}
        onLogoClick={handleSportsHome}
        onLogoDoubleClick={onLogoDoubleClick}
        rail={rail}
      />

      <section className="sports-page-v2__overview" aria-label={`Destaques de ${activeSport}`}>
          <BannerCarousel
            banners={sportsPageV2Banners[activeSport]}
            marketLayout="compact"
            onBannerClick={handleBannerClick}
          />

          <div className="home__content-filter-anchor" aria-hidden="true" />

          <ContentFilterChips
            filters={competitionOptions}
            activeFilter={selectedCompetition.id}
            ariaLabel={`Competições de ${activeSport}`}
            className="content-filter-chips--sport-markets sports-page-v2__competition-chips"
            onFilterChange={handleCompetitionChipChange}
            scrollMode="sticky-reset"
          />

          <HomeCompetitionSection
            className="sports-page-v2__competition-content"
            competition={competitionHighlight}
            hideMarketChips
            hideTitleRow
            showPlayerPropsWithMatches
            onMatchClick={handleOverviewMatchClick}
          />

          <button
            type="button"
            className="sports-page-v2__competition-cta"
            onClick={() => {
              setSelectedEventId(undefined)
              setIsCompetitionOpen(true)
            }}
          >
            <span>Mais {selectedCompetition.name}</span>
            <CaretRightIcon size={14} weight="bold" aria-hidden="true" />
          </button>
      </section>
    </main>
  )
}
