// Peças de exibição das seleções de uma aposta, extraídas de BetSuccessPage.tsx
// para serem compartilhadas com a tela Entradas. São componentes puros: recebem
// `selection`/`group` e renderizam, sem depender de estado de nenhuma das telas.
// As classes continuam `bet-success__*` e o CSS é o mesmo arquivo, para o visual
// não mudar em lugar nenhum — todas as regras dele são prefixadas, então importar
// aqui não vaza estilo para a tela que consumir.
import './BetSuccessPage.css'

import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'

import iconBetslipAumentada from '../../../assets/iconsDraftaco/iconBetslipAumentada.svg'
import iconBetslipGarantida from '../../../assets/iconsDraftaco/iconBetslipGarantida.svg'
import iconBetslipSuperAumentada from '../../../assets/iconsDraftaco/iconBetslipSuperAumentada.svg'
import iconCircleCheckSuccess from '../../../assets/iconsDraftaco/iconCircleCheckSuccess.svg'
import iconCircleXError from '../../../assets/iconsDraftaco/iconCircleXError.svg'
import iconShieldVersusPlaceholder from '../../../assets/iconsDraftaco/iconShieldVersusPlaceholder.svg'
import imgAdebayoPromo from '../../../assets/iconsDraftaco/imgAdebayoPromo.png'
import imgDembelePromo from '../../../assets/iconsDraftaco/imgDembelePromo.png'
import lewandowskiCard from '../../../assets/iconsDraftaco/LewandowskiCard.png'
import { getTeamLogo } from '../../../data/teamLogos'
import { useSportsDbTeamLogo } from '../../../shared/hooks/useSportsDbTeamLogo'
import { getTeamAbbreviation } from '../../../shared/utils/teamAbbreviations'
import { TEAM_LOGO_FALLBACK } from '../../../shared/utils/teamLogoFallback'
import {
  normalizeBetslipIdPart,
  type BetslipPromoVariant,
  type BetslipSelection,
} from '../../../shared/hooks/betslipUtils'
import {
  getPlayerAvatarFallbackSrc,
  getBetslipPlayerImage,
  getPlayerSelectionValueLabel,
  getSelectionAvatarDrawContext,
  getSelectionAvatarFallback,
  getSelectionAvatarTeamContext,
  getSelectionBadges,
  getSelectionEventTeams,
  getSelectionEventMeta,
  getSelectionMarketLabel,
  getSelectionScoreLabel,
  getSelectionTeamSuffix,
  getSelectionTimeLabel,
  getSelectionTitle,
  isDrawSelection,
  type BetslipSelectionGroup,
} from '../BetslipPageV2/betslipDisplayUtils'
import {
  getPlayerPropResult,
  getResultFinalLiveStatus,
  isResultFinalSelection,
  isSelectedResultFinalTeam,
  type PlayerPropResult,
  type SelectionResultState,
} from './selectionResult'

// Quem reaproveita estas linhas pode trocar a odd de todas elas por outra peça: a
// tela Entradas põe ali a tag de seleção cancelada. Sem o provedor, nada muda — é
// o caso do recibo da tela de sucesso.
const OddOverrideContext = createContext<ReactNode>(null)

export function BetSuccessOddOverride({ children, override }: { children: ReactNode; override: ReactNode }) {
  return <OddOverrideContext.Provider value={override}>{children}</OddOverrideContext.Provider>
}

function BetSuccessOdd({
  className,
  oddLabel,
  result,
}: {
  className: string
  oddLabel: string
  result?: SelectionResultState | null
}) {
  const override = useContext(OddOverrideContext)
  if (override) return override

  // Jogo encerrado (tela Entradas, nós Figma 1993:6893 e 1993:6923): ao lado da odd, o
  // check verde na seleção certa e o X vermelho na errada.
  if (result) {
    return (
      <span className="bet-success__odd-status">
        <strong className={className}>{oddLabel}</strong>
        <img
          src={result === 'hit' ? iconCircleCheckSuccess : iconCircleXError}
          alt={result === 'hit' ? 'Acertou' : 'Errou'}
        />
      </span>
    )
  }

  return <strong className={className}>{oddLabel}</strong>
}

// Barra de progresso da estatística do jogador — componente "points" do Figma
// (nó 1993:6440). Abaixo da linha, a bolinha com o valor avança proporcionalmente
// até a marca; passou da linha, a barra enche até a marca e a bolinha vai para a
// faixa de 40px depois dela.
function BetSuccessPlayerStatProgress({ result }: { result: PlayerPropResult }) {
  const isOverLine = result.value > result.line
  const ratio = Math.min(Math.max(result.value / result.line, 0), 1)

  return (
    <div
      className={`bet-success__stat-progress bet-success__stat-progress--${result.state}`}
      aria-label={`${result.value} / ${result.line}`}
    >
      <div className="bet-success__stat-track" aria-hidden="true">
        <span className="bet-success__stat-track-bar" />
        <span className="bet-success__stat-track-line" />
        <span className="bet-success__stat-track-rest" />
        {isOverLine ? (
          <span className="bet-success__stat-fill bet-success__stat-fill--over">
            <span className="bet-success__stat-fill-bar" />
            <span className="bet-success__stat-fill-line" />
            <span className="bet-success__stat-fill-rest">
              <span className="bet-success__stat-fill-solid" />
              <span className="bet-success__stat-value">{result.value}</span>
            </span>
          </span>
        ) : (
          <span
            className="bet-success__stat-fill"
            style={{ '--bet-success-stat-ratio': ratio } as CSSProperties}
          >
            <span className="bet-success__stat-fill-bar" />
            <span className="bet-success__stat-value">{result.value}</span>
          </span>
        )}
      </div>
    </div>
  )
}

const resultFinalBadgeOrder = ['90’', 'PA', 'B+']
const promoIconByVariant: Record<BetslipPromoVariant, string> = {
  garantida: iconBetslipGarantida,
  aumentada: iconBetslipAumentada,
  'super-aumentada': iconBetslipSuperAumentada,
}
const promoPlayerImageFallbackByVariant: Record<BetslipPromoVariant, string> = {
  garantida: lewandowskiCard,
  aumentada: imgDembelePromo,
  'super-aumentada': imgAdebayoPromo,
}
const promoVariantClassNameByVariant: Record<BetslipPromoVariant, string> = {
  garantida: 'bet-success__selection-title--promo-garantida',
  aumentada: 'bet-success__selection-title--promo-aumentada',
  'super-aumentada': 'bet-success__selection-title--promo-super-aumentada',
}

const getOrderedResultFinalBadges = (selection: BetslipSelection) => {
  const badges = getSelectionBadges(selection)
  const orderedBadges = resultFinalBadgeOrder.filter((badge) => badges.includes(badge))
  const remainingBadges = badges.filter((badge) => !resultFinalBadgeOrder.includes(badge))

  return [...orderedBadges, ...remainingBadges]
}

const isPlayerAvatarLogo = (logo?: string) => Boolean(logo?.includes('playerAvatar'))

const getResultFinalTeamLogo = (teamName: string, logo?: string) => (
  getTeamLogo(teamName) ?? (isPlayerAvatarLogo(logo) ? undefined : logo)
)

const getSelectionPromoVariant = (selection: BetslipSelection): BetslipPromoVariant | null => {
  if (selection.promoVariant) return selection.promoVariant

  const normalizedValues = [
    selection.marketId,
    selection.comboTypeLabel,
    selection.comboTitle,
    selection.marketLabel,
    selection.id,
  ].map((value) => normalizeBetslipIdPart(value ?? ''))

  if (normalizedValues.some((value) => value.includes('super-aumentada'))) return 'super-aumentada'
  if (normalizedValues.some((value) => value.includes('aumentada'))) return 'aumentada'
  if (normalizedValues.some((value) => value.includes('garantida'))) return 'garantida'

  return null
}

export function BetSuccessSelectionAvatar({
  promoVariant = null,
  selection,
}: {
  promoVariant?: BetslipPromoVariant | null
  selection: BetslipSelection
}) {
  const isPlayerSelection = selection.selectionType === 'player'
  const drawContext = isPlayerSelection ? null : getSelectionAvatarDrawContext(selection)
  const teamContext = isPlayerSelection ? null : getSelectionAvatarTeamContext(selection)
  const resolvedDrawHomeLogo = useSportsDbTeamLogo(
    drawContext?.homeTeam ?? '',
    drawContext?.homeLogo,
    selection.sport ?? '',
    undefined,
    { useCurrentLogoFallback: true }
  )
  const resolvedDrawAwayLogo = useSportsDbTeamLogo(
    drawContext?.awayTeam ?? '',
    drawContext?.awayLogo,
    selection.sport ?? '',
    undefined,
    { useCurrentLogoFallback: true }
  )
  const resolvedTeamLogo = useSportsDbTeamLogo(
    teamContext?.teamName ?? '',
    teamContext?.currentLogo,
    selection.sport ?? '',
    teamContext?.fallbackLogo,
    { useCurrentLogoFallback: true }
  )
  const iconSrc = isPlayerSelection
    ? getBetslipPlayerImage(selection) || (promoVariant ? promoPlayerImageFallbackByVariant[promoVariant] : undefined) || getPlayerAvatarFallbackSrc(selection)
    : resolvedTeamLogo || teamContext?.fallbackLogo || getSelectionAvatarFallback(selection)

  if (drawContext) {
    const hasVersusTeamLogos = Boolean(resolvedDrawHomeLogo && resolvedDrawAwayLogo)

    return (
      <span className="bet-success__selection-avatar bet-success__selection-avatar--versus" aria-hidden="true">
        {hasVersusTeamLogos ? (
          <span className="bet-success__avatar-stack">
            <img
              className="bet-success__avatar-stack-logo bet-success__avatar-stack-logo--home"
              src={resolvedDrawHomeLogo}
              alt=""
              draggable="false"
            />
            <img
              className="bet-success__avatar-stack-logo bet-success__avatar-stack-logo--away"
              src={resolvedDrawAwayLogo}
              alt=""
              draggable="false"
            />
          </span>
        ) : (
          <img src={iconShieldVersusPlaceholder} alt="" draggable="false" />
        )}
      </span>
    )
  }

  return (
    <span
      className={[
        'bet-success__selection-avatar',
        isPlayerSelection ? 'bet-success__selection-avatar--player' : '',
        promoVariant ? 'bet-success__selection-avatar--promo' : '',
      ].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <img src={iconSrc} alt="" draggable="false" />
    </span>
  )
}

export function BetSuccessResultFinalLiveTeamRow({
  isSelected,
  logo,
  score,
  selection,
  teamName,
}: {
  isSelected: boolean
  logo?: string
  score: string
  selection: BetslipSelection
  teamName: string
}) {
  const currentLogo = getResultFinalTeamLogo(teamName, logo)
  const resolvedLogo = useSportsDbTeamLogo(
    teamName,
    currentLogo,
    selection.sport ?? '',
    TEAM_LOGO_FALLBACK,
    { useCurrentLogoFallback: true }
  )

  return (
    <div className="bet-success__result-live-team">
      <span className="bet-success__result-team-icon" aria-hidden="true">
        <img src={resolvedLogo || currentLogo || TEAM_LOGO_FALLBACK} alt="" draggable="false" />
      </span>
      <span
        className={[
          'bet-success__result-live-team-copy',
          isSelected ? 'bet-success__result-live-team-copy--selected' : '',
        ].filter(Boolean).join(' ')}
      >
        <span className="bet-success__result-team-name">{teamName}</span>
        <strong className="bet-success__result-live-score">{score}</strong>
      </span>
    </div>
  )
}

export function BetSuccessResultFinalTeamRow({
  isSelected,
  logo,
  selection,
  teamName,
}: {
  isSelected: boolean
  logo?: string
  selection: BetslipSelection
  teamName: string
}) {
  const currentLogo = getResultFinalTeamLogo(teamName, logo)
  const resolvedLogo = useSportsDbTeamLogo(
    teamName,
    currentLogo,
    selection.sport ?? '',
    TEAM_LOGO_FALLBACK,
    { useCurrentLogoFallback: true }
  )

  return (
    <div className="bet-success__result-team">
      <span className="bet-success__result-team-icon" aria-hidden="true">
        <img src={resolvedLogo || currentLogo || TEAM_LOGO_FALLBACK} alt="" draggable="false" />
      </span>
      <span
        className={[
          'bet-success__result-team-name',
          isSelected ? 'bet-success__result-team-name--selected' : '',
        ].filter(Boolean).join(' ')}
      >
        {teamName}
      </span>
    </div>
  )
}

export function BetSuccessResultFinalLiveSelectionRow({
  awayTeam,
  homeTeam,
  selection,
}: {
  awayTeam: string
  homeTeam: string
  selection: BetslipSelection
}) {
  const liveStatus = getResultFinalLiveStatus(selection, homeTeam, awayTeam)
  const badges = getOrderedResultFinalBadges(selection)
  const title = getSelectionTitle(selection)

  if (!liveStatus) return <BetSuccessResultFinalPrematchSelectionRow selection={selection} />

  const isDrawHit = liveStatus.isDraw && liveStatus.state === 'hit'
  const visibleBadges = isDrawHit
    ? badges.filter((badge) => badge === '90’')
    : badges
  // Jogo encerrado (tela Entradas, nó Figma 1993:6893): "Final" no lugar do ao vivo e,
  // na seleção certa, o check ao lado da odd e o selo PA em verde.
  const isFinished = selection.eventStatus === 'finished'
  const isFinishedHit = isFinished && liveStatus.state === 'hit'

  return (
    <article
      className={[
        'bet-success__selection-row',
        'bet-success__selection-row--result-final',
        'bet-success__selection-row--result-final-live',
        `bet-success__selection-row--result-final-live-${liveStatus.state}`,
        isFinished ? 'bet-success__selection-row--result-final-finished' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="bet-success__result-live-meta">
        {isFinished ? (
          <span className="bet-success__result-final-status">Final</span>
        ) : (
          <>
            <span className="bet-success__result-live-label">
              <span className="bet-success__result-live-dot-wrap" aria-hidden="true">
                <span className="bet-success__result-live-dot" />
              </span>
              <span>AO VIVO</span>
            </span>
            <span className="bet-success__result-live-clock">{getSelectionTimeLabel(selection)}</span>
          </>
        )}
      </div>
      <div className="bet-success__result-selection-line">
        <div className="bet-success__result-selection-main">
          <span className="bet-success__result-market">
            {isDrawHit ? 'EMPATE' : getSelectionMarketLabel(selection)}
          </span>
          {visibleBadges.map((badge) => (
            <em
              className={[
                'bet-success__selection-badge',
                isFinishedHit && badge === 'PA' ? 'bet-success__selection-badge--success' : '',
              ].filter(Boolean).join(' ')}
              key={badge}
            >
              {badge}
            </em>
          ))}
          {isDrawHit ? null : (
            <strong
              className={[
                'bet-success__result-choice',
                `bet-success__result-choice--${liveStatus.state}`,
              ].join(' ')}
            >
              {title}
            </strong>
          )}
        </div>
        <BetSuccessOdd
          className="bet-success__result-odd"
          oddLabel={selection.oddLabel}
          result={isFinished ? liveStatus.state : null}
        />
      </div>
      <div
        className="bet-success__result-live-match"
        aria-label={`Placar ${getSelectionScoreLabel(selection.homeScore)} a ${getSelectionScoreLabel(selection.awayScore)}`}
      >
        <div className="bet-success__result-live-teams">
          <BetSuccessResultFinalLiveTeamRow
            isSelected={liveStatus.isHomeSelected}
            logo={selection.homeTeamIcon}
            score={getSelectionScoreLabel(selection.homeScore)}
            selection={selection}
            teamName={homeTeam}
          />
          <BetSuccessResultFinalLiveTeamRow
            isSelected={liveStatus.isAwaySelected}
            logo={selection.awayTeamIcon}
            score={getSelectionScoreLabel(selection.awayScore)}
            selection={selection}
            teamName={awayTeam}
          />
        </div>
        <div className="bet-success__result-live-status-bars" aria-hidden="true">
          {isDrawHit ? (
            <>
              <span className="bet-success__result-live-status-bar bet-success__result-live-status-bar--active bet-success__result-live-status-bar--hit" />
              <span className="bet-success__result-live-status-bar bet-success__result-live-status-bar--active bet-success__result-live-status-bar--hit" />
            </>
          ) : liveStatus.isDraw ? (
            <span
              className={[
                'bet-success__result-live-status-bar',
                'bet-success__result-live-status-bar--active',
                `bet-success__result-live-status-bar--${liveStatus.state}`,
                'bet-success__result-live-status-bar--draw',
              ].join(' ')}
            />
          ) : (
            <>
              <span
                className={[
                  'bet-success__result-live-status-bar',
                  liveStatus.isHomeSelected ? 'bet-success__result-live-status-bar--active' : '',
                  liveStatus.isHomeSelected ? `bet-success__result-live-status-bar--${liveStatus.state}` : '',
                ].filter(Boolean).join(' ')}
              />
              <span
                className={[
                  'bet-success__result-live-status-bar',
                  liveStatus.isAwaySelected ? 'bet-success__result-live-status-bar--active' : '',
                  liveStatus.isAwaySelected ? `bet-success__result-live-status-bar--${liveStatus.state}` : '',
                ].filter(Boolean).join(' ')}
              />
            </>
          )}
        </div>
      </div>
    </article>
  )
}

export function BetSuccessResultFinalPrematchSelectionRow({ selection }: { selection: BetslipSelection }) {
  const badges = getOrderedResultFinalBadges(selection)
  const title = getSelectionTitle(selection)
  const { homeTeam, awayTeam } = getSelectionEventTeams(selection)
  const isDraw = isDrawSelection(selection)
  const visibleBadges = isDraw ? badges.filter((badge) => badge === '90’') : badges

  if (!homeTeam || !awayTeam) return <BetSuccessDefaultSelectionRow selection={selection} />

  if (isDraw) {
    return (
      <article className="bet-success__selection-row bet-success__selection-row--result-final">
        <div className="bet-success__selection-meta">{getSelectionTimeLabel(selection)}</div>
        <div className="bet-success__result-selection-line">
          <div className="bet-success__result-selection-main">
            <span className="bet-success__result-market">EMPATE</span>
            {visibleBadges.map((badge) => (
              <em className="bet-success__selection-badge" key={badge}>{badge}</em>
            ))}
          </div>
        </div>
        <div className="bet-success__result-match">
          <BetSuccessResultFinalTeamRow
            isSelected={false}
            logo={selection.homeTeamIcon}
            selection={selection}
            teamName={homeTeam}
          />
          <BetSuccessResultFinalTeamRow
            isSelected={false}
            logo={selection.awayTeamIcon}
            selection={selection}
            teamName={awayTeam}
          />
        </div>
      </article>
    )
  }

  return (
    <article className="bet-success__selection-row bet-success__selection-row--result-final">
      <div className="bet-success__selection-meta">{getSelectionTimeLabel(selection)}</div>
      <div className="bet-success__result-selection-line">
        <div className="bet-success__result-selection-main">
          <span className="bet-success__result-market">{getSelectionMarketLabel(selection)}</span>
          {visibleBadges.map((badge) => (
            <em className="bet-success__selection-badge" key={badge}>{badge}</em>
          ))}
          <strong className="bet-success__result-choice">{title}</strong>
        </div>
        <BetSuccessOdd className="bet-success__result-odd" oddLabel={selection.oddLabel} />
      </div>
      <div className="bet-success__result-match">
        <BetSuccessResultFinalTeamRow
          isSelected={isSelectedResultFinalTeam(selection, homeTeam)}
          logo={selection.homeTeamIcon}
          selection={selection}
          teamName={homeTeam}
        />
        <BetSuccessResultFinalTeamRow
          isSelected={isSelectedResultFinalTeam(selection, awayTeam)}
          logo={selection.awayTeamIcon}
          selection={selection}
          teamName={awayTeam}
        />
      </div>
    </article>
  )
}

export function BetSuccessResultFinalSelectionRow({ selection }: { selection: BetslipSelection }) {
  const { homeTeam, awayTeam } = getSelectionEventTeams(selection)

  if (!homeTeam || !awayTeam) return <BetSuccessDefaultSelectionRow selection={selection} />

  if (selection.eventStatus === 'live' || selection.eventStatus === 'finished') {
    return (
      <BetSuccessResultFinalLiveSelectionRow
        awayTeam={awayTeam}
        homeTeam={homeTeam}
        selection={selection}
      />
    )
  }

  return <BetSuccessResultFinalPrematchSelectionRow selection={selection} />
}

export function BetSuccessTitleLine({
  promoVariant = null,
  selection,
}: {
  promoVariant?: BetslipPromoVariant | null
  selection: BetslipSelection
}) {
  const title = getSelectionTitle(selection)
  const teamSuffix = getSelectionTeamSuffix(selection)
  const playerChoice = getPlayerSelectionValueLabel(selection)
  const promoIcon = promoVariant ? promoIconByVariant[promoVariant] : null

  return (
    <div
      className={[
        'bet-success__selection-title',
        promoVariant ? 'bet-success__selection-title--promo' : '',
        promoVariant ? promoVariantClassNameByVariant[promoVariant] : '',
      ].filter(Boolean).join(' ')}
    >
      <strong className={promoVariant ? 'bet-success__promo-gradient-text' : undefined}>{title}</strong>
      {teamSuffix ? <span>{teamSuffix}</span> : null}
      {playerChoice ? (
        <>
          <span aria-hidden="true">|</span>
          <strong className={promoVariant ? 'bet-success__promo-gradient-text' : undefined}>{playerChoice}</strong>
          {promoIcon ? (
            <img className="bet-success__promo-value-icon" src={promoIcon} alt="" aria-hidden="true" />
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export function BetSuccessSelectionMeta({
  prematchLabel,
  selection,
}: {
  prematchLabel?: string
  selection: BetslipSelection
}) {
  if (selection.eventStatus === 'finished') {
    const { homeTeam, awayTeam } = getSelectionEventTeams(selection)

    return (
      <div className="bet-success__result-live-meta bet-success__selection-live-meta">
        <span className="bet-success__result-final-status">Final</span>
        {homeTeam && awayTeam ? (
          <>
            <span className="bet-success__selection-live-separator" aria-hidden="true">•</span>
            <span className="bet-success__selection-live-matchup">
              {`${getTeamAbbreviation(homeTeam)} (${getSelectionScoreLabel(selection.homeScore)}) `}
              <span className="bet-success__selection-final-away">
                {`vs (${getSelectionScoreLabel(selection.awayScore)}) ${getTeamAbbreviation(awayTeam)}`}
              </span>
            </span>
          </>
        ) : null}
      </div>
    )
  }

  if (selection.eventStatus !== 'live') {
    return <div className="bet-success__selection-meta">{prematchLabel ?? getSelectionEventMeta(selection)}</div>
  }

  const { homeTeam, awayTeam } = getSelectionEventTeams(selection)
  if (!homeTeam || !awayTeam) {
    return <div className="bet-success__selection-meta">{getSelectionEventMeta(selection)}</div>
  }

  return (
    <div className="bet-success__result-live-meta bet-success__selection-live-meta">
      <span className="bet-success__result-live-label">
        <span className="bet-success__result-live-dot-wrap" aria-hidden="true">
          <span className="bet-success__result-live-dot" />
        </span>
        <span>AO VIVO</span>
      </span>
      <span className="bet-success__selection-live-clock">{getSelectionTimeLabel(selection)}</span>
      <span className="bet-success__selection-live-separator" aria-hidden="true">•</span>
      <span className="bet-success__selection-live-matchup">
        {`${getTeamAbbreviation(homeTeam)} (${getSelectionScoreLabel(selection.homeScore)}) vs (${getSelectionScoreLabel(selection.awayScore)}) ${getTeamAbbreviation(awayTeam)}`}
      </span>
    </div>
  )
}

export function BetSuccessDefaultSelectionRow({ selection }: { selection: BetslipSelection }) {
  const badges = getSelectionBadges(selection)
  const promoVariant = getSelectionPromoVariant(selection)
  const playerPropResult = getPlayerPropResult(selection)

  return (
    <article className="bet-success__selection-row">
      <BetSuccessSelectionMeta selection={selection} />
      <div className="bet-success__selection-body">
        <BetSuccessSelectionAvatar promoVariant={promoVariant} selection={selection} />
        <div className="bet-success__selection-copy">
          <div className="bet-success__market-line">
            <span>{getSelectionMarketLabel(selection)}</span>
            {badges.map((badge) => <em key={badge}>{badge}</em>)}
          </div>
          <BetSuccessTitleLine promoVariant={promoVariant} selection={selection} />
        </div>
        <BetSuccessOdd
          className="bet-success__selection-odd"
          result={playerPropResult?.state}
          oddLabel={selection.oddLabel}
        />
      </div>
      {playerPropResult ? <BetSuccessPlayerStatProgress result={playerPropResult} /> : null}
    </article>
  )
}

export function BetSuccessSelectionRow({ selection }: { selection: BetslipSelection }) {
  if (isResultFinalSelection(selection)) {
    return <BetSuccessResultFinalSelectionRow selection={selection} />
  }

  return <BetSuccessDefaultSelectionRow selection={selection} />
}

const getGroupedHeaderSelection = (selections: BetslipSelection[]) => (
  selections.find(isResultFinalSelection) ?? selections[0]
)

const isGroupedTeamSelected = (selections: BetslipSelection[], teamName: string) => (
  selections.some((selection) => isResultFinalSelection(selection) && isSelectedResultFinalTeam(selection, teamName))
)

export function BetSuccessGroupedSelectionLeg({ selection }: { selection: BetslipSelection }) {
  const badges = getSelectionBadges(selection)
  const promoVariant = getSelectionPromoVariant(selection)

  return (
    <article className="bet-success__group-leg">
      <BetSuccessSelectionAvatar promoVariant={promoVariant} selection={selection} />
      <div className="bet-success__group-leg-copy">
        <div className="bet-success__market-line">
          <span>{getSelectionMarketLabel(selection)}</span>
          {badges.map((badge) => <em className="bet-success__selection-badge" key={badge}>{badge}</em>)}
        </div>
        <BetSuccessTitleLine promoVariant={promoVariant} selection={selection} />
      </div>
    </article>
  )
}

export function BetSuccessGroupedSelectionRow({ group }: { group: BetslipSelectionGroup }) {
  const headerSelection = getGroupedHeaderSelection(group.selections)
  const { homeTeam, awayTeam } = getSelectionEventTeams(headerSelection)

  if (!homeTeam || !awayTeam) {
    return (
      <>
        {group.selections.map((selection) => (
          <BetSuccessSelectionRow key={selection.id} selection={selection} />
        ))}
      </>
    )
  }

  return (
    <article className="bet-success__selection-row bet-success__selection-row--grouped">
      <BetSuccessSelectionMeta
        prematchLabel={getSelectionTimeLabel(headerSelection)}
        selection={headerSelection}
      />
      <div className="bet-success__group-match">
        <BetSuccessResultFinalTeamRow
          isSelected={isGroupedTeamSelected(group.selections, homeTeam)}
          logo={headerSelection.homeTeamIcon}
          selection={headerSelection}
          teamName={homeTeam}
        />
        <BetSuccessResultFinalTeamRow
          isSelected={isGroupedTeamSelected(group.selections, awayTeam)}
          logo={headerSelection.awayTeamIcon}
          selection={headerSelection}
          teamName={awayTeam}
        />
      </div>
      <div className="bet-success__group-legs">
        <span className="bet-success__group-rail" aria-hidden="true" />
        <div className="bet-success__group-leg-list">
          {group.selections.map((selection) => (
            <BetSuccessGroupedSelectionLeg key={selection.id} selection={selection} />
          ))}
        </div>
      </div>
    </article>
  )
}

export function BetSuccessSelectionGroupRow({ group }: { group: BetslipSelectionGroup }) {
  if (group.selections.length > 1) {
    return <BetSuccessGroupedSelectionRow group={group} />
  }

  return <BetSuccessSelectionRow selection={group.selections[0]} />
}
