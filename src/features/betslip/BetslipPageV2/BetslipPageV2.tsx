import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { CaretRightIcon, XIcon } from '@phosphor-icons/react'
import './BetslipPageV2.css'

import { BottomSheet } from '../../../components/BottomSheet'
import closeBetslipIcon from '../../../assets/iconsDraftaco/closeBS.svg'
import iconPencil from '../../../assets/iconsDraftaco/iconPencil.svg'
import trashIcon from '../../../assets/iconsDraftaco/iconTrash.svg'
import iconShieldVersusPlaceholder from '../../../assets/iconsDraftaco/iconShieldVersusPlaceholder.svg'
import iconBetslipAumentada from '../../../assets/iconsDraftaco/iconBetslipAumentada.svg'
import iconBetslipGarantida from '../../../assets/iconsDraftaco/iconBetslipGarantida.svg'
import iconBetslipSuperAumentada from '../../../assets/iconsDraftaco/iconBetslipSuperAumentada.svg'
import ilustraExcluirSelecoes from '../../../assets/iconsDraftaco/ilustraExcluirSelecoes.svg'
import imgAdebayoPromo from '../../../assets/iconsDraftaco/imgAdebayoPromo.png'
import imgDembelePromo from '../../../assets/iconsDraftaco/imgDembelePromo.png'
import boosterIcon from '../../../assets/iconsDraftaco/iconeBooster.png'
import camisaPremiadaIcon from '../../../assets/iconsDraftaco/iconeCamisaPremiada.png'
import futebolPremiadoIcon from '../../../assets/iconeFutebolPremiado.png'
import lewandowskiCard from '../../../assets/iconsDraftaco/LewandowskiCard.png'
import { useBetslip } from '../../../shared/hooks/useBetslip'
import { useAnimatedBetslipNumber } from '../../../shared/hooks/useAnimatedBetslipNumber'
import {
  getBetslipTurboBonusCents,
  getBetslipTurboBonusPercent,
  getBetslipTurboEligibleSelectionCount,
} from '../../../shared/hooks/betslipTurboBonus'
import { useSportsDbTeamLogo } from '../../../shared/hooks/useSportsDbTeamLogo'
import {
  formatBetslipOdd,
  normalizeBetslipIdPart,
  type BetslipSelection,
} from '../../../shared/hooks/betslipUtils'
import { getTeamAbbreviation } from '../../../shared/utils/teamAbbreviations'
import type { BetSuccessReceipt } from '../BetSuccessPage'
import {
  type BetslipSelectionGroup,
  formatMoney,
  formatStakeInputValue,
  getPlayerAvatarFallbackSrc,
  getBetslipPlayerImage,
  getPlayerSelectionValueLabel,
  getSelectionAvatarDrawContext,
  getSelectionAvatarFallback,
  getSelectionAvatarTeamContext,
  getSelectionBadges,
  getSelectionEventMeta,
  getSelectionEventTeams,
  getSelectionMarketLabel,
  getSelectionScoreLabel,
  getSelectionTeamSuffix,
  getSelectionTimeLabel,
  getSelectionTitle,
  getSgpHeaderParts,
  getSgpHeaderSelection,
  groupSelectionsByEvent,
} from './betslipDisplayUtils'

type BetslipAuthVariant = 'logged-in' | 'logged-out'
export type CamisaPremiadaOutcomeOverride = 'ganhou' | 'perdeu'

type CamisaPremiadaShirtIndex = 0 | 1 | 2

interface BetslipPageV2Props {
  authVariant?: BetslipAuthVariant
  balanceCents: number
  camisaPremiadaOutcomeOverride?: CamisaPremiadaOutcomeOverride
  isCamisaPremiadaMode?: boolean
  premiadaFeatureName?: string
  isCoveredByEvent?: boolean
  onCreateAccountClick?: () => void
  onDepositClick?: () => void
  onIdentityClick?: () => void
  onLimitsClick?: () => void
  onLoginClick?: () => void
  onClose?: () => void
  onBetSuccess?: (receipt: BetSuccessReceipt) => void
  onSelectionsEmptyExitStart?: () => void
  requiresIdentity?: boolean
  requiresDeposit?: boolean
  requiresLimits?: boolean
}

const DEFAULT_STAKE_CENTS = 1000
const CLOSE_ANIMATION_MS = 320
const BET_CONFIRM_LOADING_MS = 3000
const SWIPE_COMPLETE_RATIO = 0.6
const SWIPE_COMPLETE_ANIMATION_MS = 180
const SWIPE_KNOB_SIZE_PX = 52
const SWIPE_TRACK_PADDING_PX = 4
const SELECTION_REMOVE_ANIMATION_MS = 280
const SGP_LEG_REMOVE_ANIMATION_MS = 220
const BETSLIP_INFO_BADGES = new Set(['PA', '90’'])
const TURBO_BOOST_COUNTDOWN_SECONDS = (23 * 60 * 60) + (23 * 60) + 23
const CAMISA_PREMIADA_ENTRY_FEE_CENTS = 100
const CAMISA_PREMIADA_INITIAL_JACKPOT_CENTS = 349899
const CAMISA_PREMIADA_JACKPOT_TICK_MS = 2000

let turboBoostDeadlineMs: number | null = null

const getTurboBoostDeadlineMs = () => {
  if (turboBoostDeadlineMs === null) {
    turboBoostDeadlineMs = Date.now() + (TURBO_BOOST_COUNTDOWN_SECONDS * 1000)
  }

  return turboBoostDeadlineMs
}

const formatCountdownSegment = (value: number) => String(value).padStart(2, '0')

const splitMoneyLabel = (label: string) => {
  const decimalMatch = label.match(/^(.*)(,\d{2})$/)

  return {
    major: decimalMatch?.[1] ?? label,
    decimal: decimalMatch?.[2] ?? '',
  }
}

interface TurboBoostControlProps {
  bonusPercent: number
  isDetailsOpen: boolean
  isDisabled: boolean
  isEnabled: boolean
  onDetailsToggle: () => void
  onEnabledChange: (isEnabled: boolean) => void
}

function TurboBoostControl({
  bonusPercent,
  isDetailsOpen,
  isDisabled,
  isEnabled,
  onDetailsToggle,
  onEnabledChange,
}: TurboBoostControlProps) {
  const [deadlineMs] = useState(getTurboBoostDeadlineMs)
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now)
  const remainingSeconds = Math.max(0, Math.ceil((deadlineMs - currentTimeMs) / 1000))
  const countdownHours = Math.floor(remainingSeconds / 3600)
  const countdownMinutes = Math.floor((remainingSeconds % 3600) / 60)
  const countdownSeconds = remainingSeconds % 60

  useEffect(() => {
    const countdownTimer = window.setInterval(() => {
      setCurrentTimeMs(Date.now())
    }, 1000)

    return () => window.clearInterval(countdownTimer)
  }, [])

  return (
    <section
      className={`betslip-v2__booster-control${isEnabled ? '' : ' betslip-v2__booster-control--disabled'}`}
      aria-label={`Booster ${bonusPercent}%`}
    >
      <div className="betslip-v2__booster-header">
        <button
          type="button"
          className="betslip-v2__booster-summary-button"
          aria-expanded={isDetailsOpen}
          aria-controls="betslip-v2-booster-details"
          disabled={isDisabled}
          onClick={onDetailsToggle}
        >
          <img className="betslip-v2__booster-icon" src={boosterIcon} alt="" aria-hidden="true" draggable="false" />
          <span className="betslip-v2__booster-copy">
            <span className="betslip-v2__booster-title-row">
              <strong>Booster {bonusPercent}%</strong>
              <span
                className={`betslip-v2__booster-chevron${isDetailsOpen ? ' betslip-v2__booster-chevron--open' : ''}`}
                aria-hidden="true"
              />
            </span>
            <span
              className="betslip-v2__booster-countdown"
              aria-label={`Tempo restante: ${countdownHours} horas, ${countdownMinutes} minutos e ${countdownSeconds} segundos`}
            >
              <span className="betslip-v2__booster-clock" aria-hidden="true" />
              <strong>{formatCountdownSegment(countdownHours)}h</strong>
              <span aria-hidden="true">:</span>
              <strong>{formatCountdownSegment(countdownMinutes)}m</strong>
              <span aria-hidden="true">:</span>
              <strong>{formatCountdownSegment(countdownSeconds)}s</strong>
            </span>
          </span>
        </button>

        <button
          type="button"
          className={`betslip-v2__booster-switch${isEnabled ? ' betslip-v2__booster-switch--enabled' : ''}`}
          role="switch"
          aria-checked={isEnabled}
          aria-label={`${isEnabled ? 'Desativar' : 'Ativar'} Booster ${bonusPercent}%`}
          disabled={isDisabled}
          onClick={() => onEnabledChange(!isEnabled)}
        >
          <span aria-hidden="true" />
        </button>
      </div>

      <div
        className={`betslip-v2__booster-details-reveal${isDetailsOpen ? ' betslip-v2__booster-details-reveal--open' : ''}`}
        aria-hidden={!isDetailsOpen}
      >
        <div className="betslip-v2__booster-details-clip">
          <div className="betslip-v2__booster-details" id="betslip-v2-booster-details">
            <p>Válido para qualquer múltipla com 3+ seleções elegíveis, em eventos diferentes, e odds mínimas de 1.30. Bônus de até 200% sobre o lucro.</p>
            <span className="betslip-v2__booster-learn-more">
              Saiba mais
              <CaretRightIcon aria-hidden="true" weight="bold" />
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

interface CamisaPremiadaControlProps {
  featureName: string
  isDetailsOpen: boolean
  isDisabled: boolean
  isEnabled: boolean
  jackpotCents: number
  onDetailsToggle: () => void
  onEnabledChange: (isEnabled: boolean) => void
}

const formatCamisaPremiadaJackpot = (value: number) => formatMoney(value).replace(/^R\$/, 'R$ ')

function CamisaPremiadaControl({
  featureName,
  isDetailsOpen,
  isDisabled,
  isEnabled,
  jackpotCents,
  onDetailsToggle,
  onEnabledChange,
}: CamisaPremiadaControlProps) {
  const featureIcon = featureName === 'Pênalti Premiado' ? futebolPremiadoIcon : camisaPremiadaIcon
  const animatedJackpotLabel = useAnimatedBetslipNumber(
    jackpotCents,
    formatCamisaPremiadaJackpot,
    !isDisabled
  )

  return (
    <section
      className={`betslip-v2__camisa-control${isEnabled ? ' betslip-v2__camisa-control--enabled' : ''}`}
      aria-label={featureName}
    >
      <div className="betslip-v2__camisa-header">
        <button
          type="button"
          className="betslip-v2__camisa-summary-button"
          aria-expanded={isDetailsOpen}
          aria-controls="betslip-v2-camisa-premiada-details"
          disabled={isDisabled}
          onClick={onDetailsToggle}
        >
          <img
            className="betslip-v2__camisa-icon"
            src={featureIcon}
            alt=""
            aria-hidden="true"
            draggable="false"
          />
          <span className="betslip-v2__camisa-copy">
            <span className="betslip-v2__camisa-title-row">
              <strong>{featureName}</strong>
              <span
                className={`betslip-v2__camisa-chevron${isDetailsOpen ? ' betslip-v2__camisa-chevron--open' : ''}`}
                aria-hidden="true"
              />
            </span>
            <span className="betslip-v2__camisa-jackpot">
              Acumulado: <strong>{animatedJackpotLabel}</strong>
            </span>
          </span>
        </button>

        <span className="betslip-v2__camisa-fee" aria-label="Participação por mais um real">
          +R$ 1,00
        </span>

        <button
          type="button"
          className={`betslip-v2__camisa-switch${isEnabled ? ' betslip-v2__camisa-switch--enabled' : ''}`}
          role="switch"
          aria-checked={isEnabled}
          aria-label={`${isEnabled ? 'Desativar' : 'Ativar'} ${featureName} por R$ 1,00`}
          disabled={isDisabled}
          onClick={() => onEnabledChange(!isEnabled)}
        >
          <span aria-hidden="true" />
        </button>
      </div>

      <div
        className={`betslip-v2__camisa-details-reveal${isDetailsOpen ? ' betslip-v2__camisa-details-reveal--open' : ''}`}
        aria-hidden={!isDetailsOpen}
      >
        <div className="betslip-v2__camisa-details-clip">
          <div className="betslip-v2__camisa-details" id="betslip-v2-camisa-premiada-details">
            <p>Faça uma aposta, participe por R$ 1 e concorra a jackpots sorteados centenas de vezes por dia.</p>
            <span className="betslip-v2__camisa-learn-more">
              Saiba mais
              <CaretRightIcon aria-hidden="true" weight="bold" />
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

const getRandomCamisaPremiadaShirtIndex = (): CamisaPremiadaShirtIndex => (
  Math.floor(Math.random() * 3) as CamisaPremiadaShirtIndex
)

const createCamisaPremiadaDraw = (outcomeOverride?: CamisaPremiadaOutcomeOverride) => {
  const selectedShirtIndex = getRandomCamisaPremiadaShirtIndex()

  if (outcomeOverride === 'ganhou') {
    return { selectedShirtIndex, winningShirtIndex: selectedShirtIndex }
  }

  if (outcomeOverride === 'perdeu') {
    const winningOffset = Math.random() < 0.5 ? 1 : 2
    const winningShirtIndex = ((selectedShirtIndex + winningOffset) % 3) as CamisaPremiadaShirtIndex

    return { selectedShirtIndex, winningShirtIndex }
  }

  return {
    selectedShirtIndex,
    winningShirtIndex: getRandomCamisaPremiadaShirtIndex(),
  }
}

const betslipInfoItems = [
  {
    label: 'PA',
    text: 'Pagamento antecipado: se sua seleção abrir 2 gols de vantagem no futebol, 20 pontos no basquete, ou vencer o 1º set por 6-0 ou 6-1 no tênis, essa seleção será marcada como vencedora.',
  },
  {
    label: '90’',
    text: 'Tempo regulamentar: os mercados consideram apenas os 90 minutos + acréscimos da partida. Não inclui prorrogação ou pênaltis.',
  },
]

type BetslipPromoVariant = NonNullable<BetslipSelection['promoVariant']>

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
  garantida: 'betslip-v2__selection-row--promo-garantida',
  aumentada: 'betslip-v2__selection-row--promo-aumentada',
  'super-aumentada': 'betslip-v2__selection-row--promo-super-aumentada',
}

const isIOSDevice = () => (
  /iP(hone|ad|od)/.test(navigator.platform)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
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

function SelectionEventMeta({
  nowMs,
  selection,
}: {
  nowMs: number
  selection: BetslipSelection
}) {
  if (selection.eventStatus !== 'live') {
    return <span className="betslip-v2__event-line">{getSelectionEventMeta(selection)}</span>
  }

  const { homeTeam, awayTeam } = getSelectionEventTeams(selection)
  const homeLabel = homeTeam ? getTeamAbbreviation(homeTeam) : 'HOME'
  const awayLabel = awayTeam ? getTeamAbbreviation(awayTeam) : 'AWAY'

  return (
    <span className="betslip-v2__event-line betslip-v2__event-line--live">
      <span className="betslip-v2__live-time">
        <span className="betslip-v2__live-dot-wrap" aria-hidden="true">
          <span className="betslip-v2__live-dot" />
        </span>
        {getSelectionTimeLabel(selection, nowMs)}
      </span>
      <span className="betslip-v2__event-separator" aria-hidden="true">•</span>
      <span className="betslip-v2__live-matchup">
        <span>{`${homeLabel} (${getSelectionScoreLabel(selection.homeScore)}) vs `}</span>
        <span className="betslip-v2__live-matchup-away">{`${awayLabel} (${getSelectionScoreLabel(selection.awayScore)})`}</span>
      </span>
    </span>
  )
}

function SelectionAvatar({
  selection,
  compact = false,
  promoVariant = null,
}: {
  selection: BetslipSelection
  compact?: boolean
  promoVariant?: BetslipPromoVariant | null
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
      <span
        className={[
          'betslip-v2__avatar',
          'betslip-v2__avatar--versus',
          compact ? 'betslip-v2__avatar--compact' : '',
        ].filter(Boolean).join(' ')}
        aria-hidden="true"
      >
        {hasVersusTeamLogos ? (
          <span className="betslip-v2__avatar-versus-stack">
            <img
              className="betslip-v2__avatar-versus-logo betslip-v2__avatar-versus-logo--home"
              src={resolvedDrawHomeLogo}
              alt=""
              draggable="false"
            />
            <img
              className="betslip-v2__avatar-versus-logo betslip-v2__avatar-versus-logo--away"
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
        'betslip-v2__avatar',
        compact ? 'betslip-v2__avatar--compact' : '',
        isPlayerSelection ? 'betslip-v2__avatar--player' : '',
        promoVariant ? 'betslip-v2__avatar--promo' : '',
      ].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <img src={iconSrc} alt="" draggable="false" />
    </span>
  )
}

function RemoveButton({
  disabled = false,
  label,
  onClick,
}: {
  disabled?: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="betslip-v2__row-remove"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <XIcon aria-hidden="true" weight="regular" />
    </button>
  )
}

function Badges({
  labels,
  onInfoClick,
}: {
  labels: string[]
  onInfoClick: (labels: string[]) => void
}) {
  if (labels.length === 0) return null

  const infoLabels = labels.filter((label) => BETSLIP_INFO_BADGES.has(label))

  return (
    <>
      {labels.map((label) => {
        if (BETSLIP_INFO_BADGES.has(label)) {
          return (
            <button
              type="button"
              className="betslip-v2__badge betslip-v2__badge--button"
              key={label}
              aria-label={`Abrir informações sobre ${label}`}
              onClick={(event) => {
                event.stopPropagation()
                onInfoClick(infoLabels)
              }}
            >
              {label}
            </button>
          )
        }

        return <span className="betslip-v2__badge" key={label}>{label}</span>
      })}
    </>
  )
}

function SelectionTitleLine({
  selection,
  promoVariant = null,
}: {
  selection: BetslipSelection
  promoVariant?: BetslipPromoVariant | null
}) {
  const title = getSelectionTitle(selection)
  const teamSuffix = getSelectionTeamSuffix(selection)
  const playerChoice = getPlayerSelectionValueLabel(selection)
  const promoIcon = promoVariant ? promoIconByVariant[promoVariant] : null

  return (
    <div className="betslip-v2__title-line">
      <strong className={promoVariant ? 'betslip-v2__promo-gradient-text' : undefined}>{title}</strong>
      {teamSuffix ? <span className="betslip-v2__team-suffix">{teamSuffix}</span> : null}
      {playerChoice ? (
        <>
          <span className="betslip-v2__title-separator" aria-hidden="true">|</span>
          <span
            className={[
              'betslip-v2__player-choice',
              promoVariant ? 'betslip-v2__promo-gradient-text betslip-v2__player-choice--promo' : '',
            ].filter(Boolean).join(' ')}
          >
            {playerChoice}
          </span>
          {promoIcon ? (
            <img className="betslip-v2__promo-value-icon" src={promoIcon} alt="" aria-hidden="true" />
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function SimpleSelectionRow({
  isRemoveDisabled = false,
  isRemoving = false,
  nowMs,
  selection,
  onRemove,
  onTagInfoOpen,
  showOdd = true,
}: {
  isRemoveDisabled?: boolean
  isRemoving?: boolean
  nowMs: number
  selection: BetslipSelection
  onRemove: (selectionId: string) => void
  onTagInfoOpen: (labels: string[]) => void
  showOdd?: boolean
}) {
  const title = getSelectionTitle(selection)
  const promoVariant = getSelectionPromoVariant(selection)

  return (
    <article
      className={[
        'betslip-v2__selection-row',
        showOdd ? '' : 'betslip-v2__selection-row--without-odd',
        promoVariant ? 'betslip-v2__selection-row--promo' : '',
        promoVariant ? promoVariantClassNameByVariant[promoVariant] : '',
        isRemoving ? 'betslip-v2__selection-row--removing' : '',
      ].filter(Boolean).join(' ')}
    >
      <RemoveButton
        disabled={isRemoveDisabled}
        label={`Eliminar selección ${title}`}
        onClick={() => onRemove(selection.id)}
      />
      <span className="betslip-v2__divider" aria-hidden="true" />
      <div className="betslip-v2__selection-content">
        <SelectionAvatar selection={selection} promoVariant={promoVariant} />
        <div className="betslip-v2__selection-copy">
          <div className="betslip-v2__market-line">
            <span>{getSelectionMarketLabel(selection)}</span>
            <Badges labels={getSelectionBadges(selection)} onInfoClick={onTagInfoOpen} />
          </div>
          <SelectionTitleLine selection={selection} promoVariant={promoVariant} />
          <SelectionEventMeta nowMs={nowMs} selection={selection} />
        </div>
      </div>
      {showOdd ? <strong className="betslip-v2__row-odd">{selection.oddLabel}</strong> : null}
    </article>
  )
}

function SgpGroup({
  group,
  isRemoveDisabled = false,
  isRemoving = false,
  nowMs,
  onRemoveGroup,
  onRemoveSelection,
  onTagInfoOpen,
  removingSelectionId,
}: {
  group: BetslipSelectionGroup
  isRemoveDisabled?: boolean
  isRemoving?: boolean
  nowMs: number
  onRemoveGroup: (groupId: string, selectionIds: string[]) => void
  onRemoveSelection: (selectionId: string) => void
  onTagInfoOpen: (labels: string[]) => void
  removingSelectionId?: string | null
}) {
  const headerSelection = getSgpHeaderSelection(group.selections)
  const { homeLabel, awayLabel, timeLabel, eventLabel: headerEventLabel } = getSgpHeaderParts(headerSelection, nowMs)
  const eventLabel = headerEventLabel || group.eventId

  return (
    <section
      className={[
        'betslip-v2__sgp',
        isRemoving ? 'betslip-v2__sgp--removing' : '',
      ].filter(Boolean).join(' ')}
      aria-label={`Crear apuesta ${eventLabel}`}
    >
      <div className="betslip-v2__sgp-header">
        <RemoveButton
          disabled={isRemoveDisabled}
          label={`Eliminar crear apuesta ${eventLabel}`}
          onClick={() => onRemoveGroup(group.eventId, group.selections.map((selection) => selection.id))}
        />
        <span className="betslip-v2__divider" aria-hidden="true" />
        <div className="betslip-v2__sgp-match">
          <span className="betslip-v2__sgp-team">{homeLabel}</span>
          <span className="betslip-v2__sgp-versus">vs</span>
          <span className="betslip-v2__sgp-team">{awayLabel}</span>
          {timeLabel ? (
            <>
              <span className="betslip-v2__sgp-dot" aria-hidden="true">·</span>
              <span className="betslip-v2__sgp-time">{timeLabel}</span>
            </>
          ) : null}
        </div>
      </div>
      {group.selections.map((selection) => {
        const title = getSelectionTitle(selection)

        return (
          <article
            key={selection.id}
            className={[
              'betslip-v2__sgp-leg',
              removingSelectionId === selection.id ? 'betslip-v2__sgp-leg--removing' : '',
            ].filter(Boolean).join(' ')}
          >
            <RemoveButton
              disabled={isRemoveDisabled}
              label={`Eliminar selección ${title}`}
              onClick={() => onRemoveSelection(selection.id)}
            />
            <SelectionAvatar selection={selection} compact />
            <div className="betslip-v2__sgp-copy">
              <div className="betslip-v2__market-line">
                <span>{getSelectionMarketLabel(selection)}</span>
                <Badges labels={getSelectionBadges(selection)} onInfoClick={onTagInfoOpen} />
              </div>
              <SelectionTitleLine selection={selection} />
            </div>
          </article>
        )
      })}
    </section>
  )
}

function BetslipTagInfoBottomSheet({
  badgeLabels,
  isOpen,
  onClose,
}: {
  badgeLabels: string[]
  isOpen: boolean
  onClose: () => void
}) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Informações"
      containerClassName="betslip-v2-info-sheet-container"
      sheetClassName="betslip-v2-info-sheet"
      bodyClassName="betslip-v2-info-sheet__body"
      hideScrollIndicator
      blurBackdrop
    >
      <div className="betslip-v2-info-sheet__content">
        {betslipInfoItems.filter((item) => badgeLabels.includes(item.label)).map((item) => (
          <div className="betslip-v2-info-sheet__row" key={item.label}>
            <span className="betslip-v2__badge betslip-v2-info-sheet__badge">{item.label}</span>
            <p>{item.text}</p>
          </div>
        ))}
      </div>
    </BottomSheet>
  )
}

function BetslipClearConfirmBottomSheet({
  isOpen,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onCancel}
      containerClassName="betslip-v2-clear-confirm-sheet-container"
      sheetClassName="betslip-v2-clear-confirm-sheet"
      bodyClassName="betslip-v2-clear-confirm-sheet__body"
      hideScrollIndicator
      blurBackdrop
    >
      <div className="betslip-v2-clear-confirm-sheet__content">
        <img
          className="betslip-v2-clear-confirm-sheet__illustration"
          src={ilustraExcluirSelecoes}
          alt=""
          aria-hidden="true"
          draggable="false"
        />
        <h3 className="betslip-v2-clear-confirm-sheet__heading">Excluir seleções</h3>
        <p className="betslip-v2-clear-confirm-sheet__message">
          Tem certeza que deseja excluir todas as seleções?
        </p>
        <div className="betslip-v2-clear-confirm-sheet__actions">
          <button
            type="button"
            className="betslip-v2-clear-confirm-sheet__action betslip-v2-clear-confirm-sheet__action--primary"
            onClick={onConfirm}
          >
            Sim, excluir
          </button>
          <button
            type="button"
            className="betslip-v2-clear-confirm-sheet__action betslip-v2-clear-confirm-sheet__action--secondary"
            onClick={onCancel}
          >
            Não, continuar aqui
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

const clampSwipeProgress = (progress: number) => Math.max(0, Math.min(progress, 1))

const getSwipeInnerWidth = (trackWidth: number) => (
  Math.max(
    SWIPE_KNOB_SIZE_PX,
    trackWidth - SWIPE_TRACK_PADDING_PX * 2
  )
)

const getSwipeFillWidth = (trackWidth: number, progress: number) => {
  const innerWidth = getSwipeInnerWidth(trackWidth)

  return SWIPE_KNOB_SIZE_PX + (
    innerWidth - SWIPE_KNOB_SIZE_PX
  ) * clampSwipeProgress(progress)
}

const getSwipeFillRatio = (trackWidth: number, progress: number) => (
  getSwipeFillWidth(trackWidth, progress) / getSwipeInnerWidth(trackWidth)
)

function SwipeButton({
  labelPrefix = 'Desliza para apostar',
  onLoadingChange,
  stakeLabel,
  onComplete,
}: {
  labelPrefix?: string
  onLoadingChange?: (isLoading: boolean) => void
  stakeLabel: string
  onComplete: () => void
}) {
  const trackRef = useRef<HTMLButtonElement>(null)
  const dragStartXRef = useRef(0)
  const dragStartProgressRef = useRef(0)
  const dragProgressRef = useRef(0)
  const completeTimerRef = useRef<number | null>(null)
  const [trackWidth, setTrackWidth] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isCompleting, setIsCompleting] = useState(false)
  const [hasCompleted, setHasCompleted] = useState(false)
  const [isLoadingVisible, setIsLoadingVisible] = useState(false)
  const isInteractionDisabled = isCompleting || hasCompleted
  const isCompleteState = hasCompleted || isLoadingVisible
  const fillWidth = getSwipeFillWidth(trackWidth, isCompleteState ? 1 : progress)
  const swipeStyle = {
    '--betslip-v2-swipe-fill-width': `${fillWidth}px`,
  } as CSSProperties

  const setVisualProgress = useCallback((nextProgress: number) => {
    const clampedProgress = clampSwipeProgress(nextProgress)

    dragProgressRef.current = clampedProgress
    setProgress(clampedProgress)
  }, [])

  const clearCompleteTimer = useCallback(() => {
    if (completeTimerRef.current === null) return

    window.clearTimeout(completeTimerRef.current)
    completeTimerRef.current = null
  }, [])

  const getMaxDragTravel = useCallback(() => {
    const track = trackRef.current
    if (!track) return 1

    const rect = track.getBoundingClientRect()
    const innerWidth = getSwipeInnerWidth(rect.width)

    return Math.max(1, innerWidth - SWIPE_KNOB_SIZE_PX)
  }, [])

  const completeSwipe = useCallback(() => {
    if (isInteractionDisabled) return

    clearCompleteTimer()
    setIsDragging(false)
    setHasCompleted(true)
    setIsCompleting(true)
    setIsLoadingVisible(false)
    setVisualProgress(1)

    completeTimerRef.current = window.setTimeout(() => {
      setIsCompleting(false)
      setIsLoadingVisible(true)
      completeTimerRef.current = window.setTimeout(() => {
        completeTimerRef.current = null
        onComplete()
      }, BET_CONFIRM_LOADING_MS)
    }, SWIPE_COMPLETE_ANIMATION_MS)
  }, [clearCompleteTimer, isInteractionDisabled, onComplete, setVisualProgress])

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return undefined

    const updateTrackWidth = () => {
      const nextTrackWidth = track.getBoundingClientRect().width

      setTrackWidth((currentTrackWidth) => (
        currentTrackWidth === nextTrackWidth ? currentTrackWidth : nextTrackWidth
      ))
    }

    updateTrackWidth()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateTrackWidth)

      return () => window.removeEventListener('resize', updateTrackWidth)
    }

    const resizeObserver = new ResizeObserver(updateTrackWidth)
    resizeObserver.observe(track)

    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => () => {
    clearCompleteTimer()
  }, [clearCompleteTimer])

  useEffect(() => {
    onLoadingChange?.(isLoadingVisible)

    return () => {
      if (isLoadingVisible) onLoadingChange?.(false)
    }
  }, [isLoadingVisible, onLoadingChange])

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (isInteractionDisabled || event.button !== 0) return

    event.preventDefault()
    clearCompleteTimer()
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartXRef.current = event.clientX
    dragStartProgressRef.current = dragProgressRef.current
    setIsCompleting(false)
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isDragging || isInteractionDisabled) return

    event.preventDefault()
    const dragDelta = event.clientX - dragStartXRef.current
    const nextProgress = dragStartProgressRef.current + dragDelta / getMaxDragTravel()

    setVisualProgress(nextProgress)
  }

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return

    event.preventDefault()
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const currentTrackWidth = event.currentTarget.getBoundingClientRect().width
    const filledRatio = getSwipeFillRatio(currentTrackWidth, dragProgressRef.current)

    if (filledRatio >= SWIPE_COMPLETE_RATIO) {
      completeSwipe()
      return
    }

    setVisualProgress(0)
  }

  const handlePointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    setIsDragging(false)
    setVisualProgress(0)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['Enter', ' '].includes(event.key)) return

    event.preventDefault()
    completeSwipe()
  }

  return (
    <button
      type="button"
      className={[
        'betslip-v2__swipe',
        isDragging ? 'betslip-v2__swipe--dragging' : '',
        isLoadingVisible ? 'betslip-v2__swipe--loading' : '',
        hasCompleted || isCompleting ? 'betslip-v2__swipe--complete' : '',
      ].filter(Boolean).join(' ')}
      ref={trackRef}
      aria-busy={isLoadingVisible}
      aria-label={`${labelPrefix} ${stakeLabel}`}
      disabled={isInteractionDisabled}
      style={swipeStyle}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <span className="betslip-v2__swipe-label">{labelPrefix} {stakeLabel}</span>
      <span className="betslip-v2__swipe-fill" aria-hidden="true">
        <CaretRightIcon className="betslip-v2__swipe-icon" weight="bold" />
      </span>
      <span className="betslip-v2__swipe-spinner-wrap">
        <span className="betslip-v2__swipe-spinner" />
        <span className="betslip-v2__swipe-spinner-text">Preparando sua aposta</span>
      </span>
    </button>
  )
}

export function BetslipPageV2({
  authVariant = 'logged-in',
  balanceCents,
  camisaPremiadaOutcomeOverride,
  isCamisaPremiadaMode = false,
  premiadaFeatureName = 'Camisa Premiada',
  isCoveredByEvent = false,
  onCreateAccountClick,
  onDepositClick,
  onIdentityClick,
  onLimitsClick,
  onLoginClick,
  onClose,
  onBetSuccess,
  onSelectionsEmptyExitStart,
  requiresIdentity = false,
  requiresDeposit = false,
  requiresLimits = false,
}: BetslipPageV2Props) {
  const {
    clearSelections,
    isTurboBoostEnabled,
    removeSelection,
    selections,
    setTurboBoostEnabled,
    summary,
  } = useBetslip()
  const [isLeaving, setIsLeaving] = useState(false)
  const [stakeCents, setStakeCents] = useState(DEFAULT_STAKE_CENTS)
  const [stakeInputValue, setStakeInputValue] = useState(() => formatStakeInputValue(DEFAULT_STAKE_CENTS))
  const [acceptsOddsChanges, setAcceptsOddsChanges] = useState(false)
  const [isTurboBoostDetailsOpen, setIsTurboBoostDetailsOpen] = useState(false)
  const [isCamisaPremiadaEnabled, setIsCamisaPremiadaEnabled] = useState(false)
  const [isCamisaPremiadaDetailsOpen, setIsCamisaPremiadaDetailsOpen] = useState(false)
  const [camisaPremiadaJackpotCents, setCamisaPremiadaJackpotCents] = useState(
    CAMISA_PREMIADA_INITIAL_JACKPOT_CENTS
  )
  const [tagInfoBadgeLabels, setTagInfoBadgeLabels] = useState<string[]>([])
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)
  const [isConfirmLoading, setIsConfirmLoading] = useState(false)
  const [liveClockNowMs, setLiveClockNowMs] = useState(Date.now)
  const [removingRowId, setRemovingRowId] = useState<string | null>(null)
  const [removingLegId, setRemovingLegId] = useState<string | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const rowRemoveTimerRef = useRef<number | null>(null)
  const legRemoveTimerRef = useRef<number | null>(null)
  const pageRef = useRef<HTMLElement | null>(null)
  const hadSelectionsRef = useRef(selections.length > 0)

  const selectionGroups = useMemo(() => groupSelectionsByEvent(selections), [selections])
  const totalOddsValue = summary.hasSelections ? summary.totalOdds : 0
  const totalOddsLabel = summary.hasSelections ? summary.totalOddsLabel : formatBetslipOdd(0)
  const turboEligibleSelectionCount = getBetslipTurboEligibleSelectionCount(selections)
  const turboBonusPercent = getBetslipTurboBonusPercent(turboEligibleSelectionCount)
  const isTurboBoostEligible = !isCamisaPremiadaMode && turboBonusPercent !== null
  const appliedTurboBonusPercent = !isCamisaPremiadaMode && isTurboBoostEnabled ? turboBonusPercent : null
  const hasTurboBoost = appliedTurboBonusPercent !== null
  const basePotentialWinCents = Math.round(stakeCents * totalOddsValue)
  const turboBonusCents = getBetslipTurboBonusCents({
    bonusPercent: appliedTurboBonusPercent,
    potentialWinCents: basePotentialWinCents,
    stakeCents,
  })
  const boostedTotalOddsValue = hasTurboBoost
    ? totalOddsValue * (1 + appliedTurboBonusPercent / 100)
    : totalOddsValue
  const potentialWinCents = basePotentialWinCents + turboBonusCents
  const appliedTotalOddsLabel = hasTurboBoost ? formatBetslipOdd(boostedTotalOddsValue) : totalOddsLabel
  const stakeLabel = formatMoney(stakeCents)
  const totalPayableCents = stakeCents + (
    isCamisaPremiadaMode && isCamisaPremiadaEnabled ? CAMISA_PREMIADA_ENTRY_FEE_CENTS : 0
  )
  const totalPayableLabel = isCamisaPremiadaMode
    ? formatMoney(totalPayableCents, { compactWhole: true })
    : stakeLabel
  const potentialWinLabel = formatMoney(potentialWinCents)
  const animatedTotalOddsLabel = useAnimatedBetslipNumber(
    totalOddsValue,
    formatBetslipOdd,
    !isLeaving && summary.hasSelections
  )
  const animatedBoostedTotalOddsLabel = useAnimatedBetslipNumber(
    boostedTotalOddsValue,
    formatBetslipOdd,
    !isLeaving && summary.hasSelections && hasTurboBoost
  )
  const animatedPotentialWinLabel = useAnimatedBetslipNumber(
    potentialWinCents,
    formatMoney,
    !isLeaving && summary.hasSelections
  )
  const animatedPotentialWinParts = splitMoneyLabel(animatedPotentialWinLabel)
  const hasSgp = selectionGroups.some((group) => group.selections.length > 1)
  const hasLiveSelections = selections.some((selection) => selection.eventStatus === 'live')
  const isLoggedOut = authVariant === 'logged-out'
  const balanceDisplayValue = formatMoney(Math.max(0, Number.isFinite(balanceCents) ? balanceCents : 0))
  const shouldShowIdentityPrompt = !isLoggedOut && requiresIdentity
  const shouldShowLimitsPrompt = !isLoggedOut && !requiresIdentity && requiresLimits
  const shouldShowDepositPrompt = !isLoggedOut && !requiresIdentity && !requiresLimits && requiresDeposit
  const isRemoveLocked = isConfirmLoading || isClearConfirmOpen || removingRowId !== null || removingLegId !== null

  useEffect(() => {
    if (!isCamisaPremiadaMode) return undefined

    const jackpotTimer = window.setInterval(() => {
      setCamisaPremiadaJackpotCents((current) => current + CAMISA_PREMIADA_ENTRY_FEE_CENTS)
    }, CAMISA_PREMIADA_JACKPOT_TICK_MS)

    return () => window.clearInterval(jackpotTimer)
  }, [isCamisaPremiadaMode])

  useEffect(() => {
    if (!hasLiveSelections) return undefined

    const intervalId = window.setInterval(() => {
      setLiveClockNowMs(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [hasLiveSelections])

  const handleStakeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (isConfirmLoading) return

    const digits = event.target.value.replace(/\D/g, '')

    if (!digits) {
      setStakeInputValue('')
      setStakeCents(0)
      return
    }

    const nextStakeCents = Number(digits)
    const safeStakeCents = Number.isFinite(nextStakeCents) ? nextStakeCents : 0

    setStakeInputValue(formatStakeInputValue(safeStakeCents))
    setStakeCents(safeStakeCents)
  }, [isConfirmLoading])

  const requestClose = useCallback((afterClose?: () => void) => {
    if (isLeaving) return

    setIsLeaving(true)
    closeTimerRef.current = window.setTimeout(() => {
      afterClose?.()
      onClose?.()
    }, CLOSE_ANIMATION_MS)
  }, [isLeaving, onClose])

  const handleClearAll = useCallback(() => {
    if (isConfirmLoading || isClearConfirmOpen) return

    if (selections.length > 1) {
      setIsClearConfirmOpen(true)
      return
    }

    onSelectionsEmptyExitStart?.()
    requestClose(clearSelections)
  }, [
    clearSelections,
    isClearConfirmOpen,
    isConfirmLoading,
    onSelectionsEmptyExitStart,
    requestClose,
    selections.length,
  ])

  const handleClearConfirmCancel = useCallback(() => {
    setIsClearConfirmOpen(false)
  }, [])

  const handleClearConfirmConfirm = useCallback(() => {
    if (isConfirmLoading) return

    setIsClearConfirmOpen(false)
    onSelectionsEmptyExitStart?.()
    requestClose(clearSelections)
  }, [clearSelections, isConfirmLoading, onSelectionsEmptyExitStart, requestClose])

  const handleRemoveGroup = useCallback((groupId: string, selectionIds: string[]) => {
    if (
      isConfirmLoading
      || removingRowId
      || removingLegId
      || rowRemoveTimerRef.current !== null
      || legRemoveTimerRef.current !== null
      || selectionIds.length === 0
    ) return

    setRemovingRowId(groupId)
    rowRemoveTimerRef.current = window.setTimeout(() => {
      selectionIds.forEach(removeSelection)
      setRemovingRowId(null)
      rowRemoveTimerRef.current = null
    }, SELECTION_REMOVE_ANIMATION_MS)
  }, [isConfirmLoading, removeSelection, removingLegId, removingRowId])

  const handleRemoveSelection = useCallback((selectionId: string) => {
    if (
      isConfirmLoading
      || removingRowId
      || removingLegId
      || rowRemoveTimerRef.current !== null
      || legRemoveTimerRef.current !== null
    ) return

    setRemovingRowId(selectionId)
    rowRemoveTimerRef.current = window.setTimeout(() => {
      removeSelection(selectionId)
      setRemovingRowId(null)
      rowRemoveTimerRef.current = null
    }, SELECTION_REMOVE_ANIMATION_MS)
  }, [isConfirmLoading, removeSelection, removingLegId, removingRowId])

  const handleRemoveSgpLeg = useCallback((selectionId: string) => {
    if (
      isConfirmLoading
      || removingRowId
      || removingLegId
      || rowRemoveTimerRef.current !== null
      || legRemoveTimerRef.current !== null
    ) return

    setRemovingLegId(selectionId)
    legRemoveTimerRef.current = window.setTimeout(() => {
      removeSelection(selectionId)
      setRemovingLegId(null)
      legRemoveTimerRef.current = null
    }, SGP_LEG_REMOVE_ANIMATION_MS)
  }, [isConfirmLoading, removeSelection, removingLegId, removingRowId])

  const handleConfirm = useCallback(() => {
    if (!summary.hasSelections || selections.length === 0) {
      requestClose(clearSelections)
      return
    }

    const camisaPremiadaDraw = isCamisaPremiadaMode && isCamisaPremiadaEnabled
      ? createCamisaPremiadaDraw(camisaPremiadaOutcomeOverride)
      : null
    const receipt: BetSuccessReceipt = {
      selections: selections.map((selection) => ({ ...selection })),
      stakeCents,
      totalOddsLabel: appliedTotalOddsLabel,
      potentialWinLabel,
      turboBoost: appliedTurboBonusPercent !== null ? {
        bonusPercent: appliedTurboBonusPercent,
        originalTotalOddsLabel: totalOddsLabel,
      } : undefined,
      camisaPremiada: camisaPremiadaDraw ? {
        entryFeeCents: CAMISA_PREMIADA_ENTRY_FEE_CENTS,
        featureName: premiadaFeatureName,
        jackpotCents: camisaPremiadaJackpotCents,
        ...camisaPremiadaDraw,
      } : undefined,
      createdAtMs: Date.now(),
    }

    onBetSuccess?.(receipt)
    setIsCamisaPremiadaEnabled(false)
    setTurboBoostEnabled(true)
    requestClose(clearSelections)
  }, [
    clearSelections,
    camisaPremiadaJackpotCents,
    camisaPremiadaOutcomeOverride,
    isCamisaPremiadaEnabled,
    isCamisaPremiadaMode,
    premiadaFeatureName,
    onBetSuccess,
    appliedTurboBonusPercent,
    potentialWinLabel,
    requestClose,
    selections,
    setTurboBoostEnabled,
    stakeCents,
    summary.hasSelections,
    totalOddsLabel,
    appliedTotalOddsLabel,
  ])

  const handleTagInfoOpen = useCallback((badgeLabels: string[]) => {
    if (isConfirmLoading) return

    setTagInfoBadgeLabels(badgeLabels)
  }, [isConfirmLoading])

  const handleTagInfoClose = useCallback(() => {
    setTagInfoBadgeLabels([])
  }, [])

  const blurFocusedStakeInput = useCallback(() => {
    const page = pageRef.current
    const activeElement = document.activeElement

    if (activeElement instanceof HTMLInputElement && page?.contains(activeElement)) {
      activeElement.blur()
    }
  }, [])

  const handleConfirmLoadingChange = useCallback((nextIsLoading: boolean) => {
    setIsConfirmLoading(nextIsLoading)

    if (nextIsLoading) blurFocusedStakeInput()
  }, [blurFocusedStakeInput])

  useLayoutEffect(() => {
    const page = pageRef.current
    if (!page) return undefined

    let stableViewportHeight = 0
    let keyboardInset = -1
    let viewportTop = 0
    let watchFrame: number | null = null
    let viewportUpdateTimer: number | null = null
    let blurResyncTimer: number | null = null

    const readLayoutViewportHeight = () => Math.max(
      window.innerHeight || 0,
      document.documentElement.clientHeight || 0,
      1
    )

    const hasFocusedInput = () => {
      const activeElement = document.activeElement
      return activeElement instanceof HTMLInputElement && page.contains(activeElement)
    }

    // Durante a abertura do teclado o Safari iOS faz uma "dança" de viewport
    // (barra inferior recolhendo + teclado subindo) que desloca elementos fixed
    // por alguns frames. A página segue visualViewport.offsetTop no top — SEM
    // clamp, pois o transiente pode ser negativo — apenas enquanto o input está
    // focado; o footer sobe pela altura do teclado (altura estável - visível).
    const updateKeyboardInset = () => {
      const visualViewport = window.visualViewport
      const offsetTop = visualViewport?.offsetTop ?? 0
      const visualHeight = visualViewport ? visualViewport.height : readLayoutViewportHeight()
      const visibleViewportBottom = offsetTop + visualHeight
      const isFocused = hasFocusedInput()

      if (visibleViewportBottom > stableViewportHeight + 1) {
        const nextViewportHeight = readLayoutViewportHeight()

        if (Math.abs(nextViewportHeight - stableViewportHeight) >= 1) {
          stableViewportHeight = nextViewportHeight
          page.style.setProperty('--betslip-v2-stable-height', `${nextViewportHeight}px`)
        }
      }

      const nextViewportTop = isFocused ? offsetTop : 0

      if (Math.abs(nextViewportTop - viewportTop) >= 0.5) {
        viewportTop = nextViewportTop
        page.style.setProperty('--betslip-v2-viewport-top', `${nextViewportTop}px`)
      }

      const layoutHeight = stableViewportHeight || readLayoutViewportHeight()
      const nextKeyboardInset = isFocused
        ? Math.max(0, Math.round(layoutHeight - visualHeight))
        : 0

      if (Math.abs(nextKeyboardInset - keyboardInset) < 2) return

      keyboardInset = nextKeyboardInset
      page.style.setProperty('--betslip-v2-keyboard-inset', `${nextKeyboardInset}px`)
    }

    // Watchdog por frame enquanto o input estiver focado: mantém o inset em dia
    // mesmo quando o Safari não dispara os eventos de viewport a tempo.
    const watchViewport = () => {
      updateKeyboardInset()

      if (!hasFocusedInput()) {
        watchFrame = null
        return
      }

      watchFrame = window.requestAnimationFrame(watchViewport)
    }

    const startViewportWatch = () => {
      if (watchFrame !== null) return

      watchFrame = window.requestAnimationFrame(watchViewport)
    }

    const updateStableViewportHeight = (force = false) => {
      if (force || !hasFocusedInput()) {
        const nextViewportHeight = readLayoutViewportHeight()

        if (Math.abs(nextViewportHeight - stableViewportHeight) >= 1) {
          stableViewportHeight = nextViewportHeight
          page.style.setProperty('--betslip-v2-stable-height', `${nextViewportHeight}px`)
        }
      }

      updateKeyboardInset()
    }

    const scheduleStableViewportHeightUpdate = (force = false) => {
      if (viewportUpdateTimer !== null) {
        window.clearTimeout(viewportUpdateTimer)
      }

      viewportUpdateTimer = window.setTimeout(() => {
        viewportUpdateTimer = null
        updateStableViewportHeight(force)
      }, force ? 320 : 120)
    }

    updateStableViewportHeight(true)

    const handleViewportResize = () => {
      updateKeyboardInset()
      scheduleStableViewportHeightUpdate()
    }
    const handleOrientationChange = () => scheduleStableViewportHeightUpdate(true)
    const handleVisualViewportChange = () => updateKeyboardInset()
    const handleFocusIn = () => {
      updateKeyboardInset()
      startViewportWatch()
      scheduleStableViewportHeightUpdate()
    }
    const handleFocusOut = () => {
      updateKeyboardInset()
      startViewportWatch()

      // No iOS 26 o visualViewport pode ficar com offset/altura residuais depois
      // que o teclado fecha (WebKit 297779); ressincroniza uma única vez.
      if (blurResyncTimer !== null) window.clearTimeout(blurResyncTimer)
      blurResyncTimer = window.setTimeout(() => {
        blurResyncTimer = null

        if (hasFocusedInput()) return

        if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0)
        updateStableViewportHeight(true)
      }, 450)
    }

    // Último recurso (padrão react-aria): com a supressão do reveal isso não
    // deve disparar; cobre casos exóticos em que o Safari ainda rola a janela.
    const handleWindowScroll = () => {
      if (!hasFocusedInput()) return
      if (window.scrollX === 0 && window.scrollY === 0) return

      window.scrollTo(0, 0)
    }

    window.addEventListener('resize', handleViewportResize)
    window.addEventListener('orientationchange', handleOrientationChange)
    window.addEventListener('scroll', handleWindowScroll, { passive: true })
    window.visualViewport?.addEventListener('resize', handleVisualViewportChange)
    window.visualViewport?.addEventListener('scroll', handleVisualViewportChange)
    page.addEventListener('focusin', handleFocusIn)
    page.addEventListener('focusout', handleFocusOut)

    return () => {
      if (watchFrame !== null) window.cancelAnimationFrame(watchFrame)
      if (viewportUpdateTimer !== null) window.clearTimeout(viewportUpdateTimer)
      if (blurResyncTimer !== null) window.clearTimeout(blurResyncTimer)
      page.style.removeProperty('--betslip-v2-keyboard-inset')
      page.style.removeProperty('--betslip-v2-stable-height')
      page.style.removeProperty('--betslip-v2-viewport-top')
      window.removeEventListener('resize', handleViewportResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('scroll', handleWindowScroll)
      window.visualViewport?.removeEventListener('resize', handleVisualViewportChange)
      window.visualViewport?.removeEventListener('scroll', handleVisualViewportChange)
      page.removeEventListener('focusin', handleFocusIn)
      page.removeEventListener('focusout', handleFocusOut)
    }
  }, [])

  // O Safari iOS rola a página inteira para "revelar" o input focado sob o
  // teclado — é essa rolagem que faz o conteúdo pular. Deslocar o input para
  // fora da área visível faz o reveal clampar em zero (alvo acima do topo).
  // No iOS 26 a decisão de reveal acontece DEPOIS do focus (junto do commit do
  // teclado — o debug mostrou offsetTop batendo na altura do teclado mesmo com
  // o truque de 1 frame do react-aria/Vaul), então o input fica deslocado do
  // foco até o teclado assentar; ao voltar, o footer já foi elevado pelo
  // --betslip-v2-keyboard-inset e o input está visível — nada a revelar.
  useLayoutEffect(() => {
    const page = pageRef.current
    if (!page || !isIOSDevice()) return undefined

    let displacedInput: HTMLInputElement | null = null
    let restoreFrame: number | null = null
    let restoreTimer: number | null = null

    const isKeyboardOpen = () => {
      const visualViewport = window.visualViewport

      if (!visualViewport) return false

      const layoutHeight = Math.max(
        window.innerHeight || 0,
        document.documentElement.clientHeight || 0
      )

      return layoutHeight - visualViewport.height > 60
    }

    const restoreDisplacedInput = () => {
      if (restoreFrame !== null) {
        window.cancelAnimationFrame(restoreFrame)
        restoreFrame = null
      }

      if (restoreTimer !== null) {
        window.clearTimeout(restoreTimer)
        restoreTimer = null
      }

      window.visualViewport?.removeEventListener('resize', handleViewportResize)

      if (displacedInput) {
        displacedInput.style.transform = ''
        displacedInput = null
      }
    }

    // Dois frames de folga após o teclado assentar, para a decisão de reveal
    // do Safari (e a elevação do footer) já terem acontecido.
    const scheduleRestore = () => {
      if (restoreFrame !== null) return

      restoreFrame = window.requestAnimationFrame(() => {
        restoreFrame = window.requestAnimationFrame(() => {
          restoreFrame = null
          restoreDisplacedInput()
        })
      })
    }

    const handleViewportResize = () => {
      if (isKeyboardOpen()) scheduleRestore()
    }

    const handleFocusIn = (event: Event) => {
      const target = event.target

      if (!(target instanceof HTMLInputElement)) return

      restoreDisplacedInput()
      displacedInput = target
      target.style.transform = 'translateY(-2000px)'
      window.visualViewport?.addEventListener('resize', handleViewportResize)
      restoreTimer = window.setTimeout(restoreDisplacedInput, 700)

      // Teclado já aberto (refoco): a janela de reveal é imediata e curta.
      if (isKeyboardOpen()) scheduleRestore()
    }

    const handleFocusOut = () => restoreDisplacedInput()

    page.addEventListener('focusin', handleFocusIn)
    page.addEventListener('focusout', handleFocusOut)

    return () => {
      restoreDisplacedInput()
      page.removeEventListener('focusin', handleFocusIn)
      page.removeEventListener('focusout', handleFocusOut)
    }
  }, [])

  // Arrastar o dedo numa área sem scroll faz o iOS puxar a página inteira
  // (rubber-band) — e, com o teclado aberto, o iOS 26 deixa a página presa
  // deslocada em vez de quicar de volta (o overscroll-behavior do CSS não
  // segura o rubber-band do documento no iOS). Bloqueia o touchmove na página,
  // liberando apenas alvos dentro de um container realmente rolável.
  useLayoutEffect(() => {
    const page = pageRef.current
    if (!page) return undefined

    const hasScrollableAncestor = (target: EventTarget | null) => {
      let element = target instanceof Element ? target : null

      while (element && element !== page) {
        if (element instanceof HTMLElement) {
          const { overflowY } = getComputedStyle(element)

          if (
            (overflowY === 'auto' || overflowY === 'scroll')
            && element.scrollHeight > element.clientHeight + 1
          ) {
            return true
          }
        }

        element = element.parentElement
      }

      return false
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 1 && hasScrollableAncestor(event.target)) return

      event.preventDefault()
    }

    page.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => page.removeEventListener('touchmove', handleTouchMove)
  }, [])

  // Trava o body enquanto o betslip está aberto (padrão do Vaul no iOS):
  // garante que o documento em si não tem como se mover sob a página fixed.
  useLayoutEffect(() => {
    if (!isIOSDevice()) return undefined

    const body = document.body
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      overflow: body.style.overflow,
    }

    body.style.position = 'fixed'
    body.style.top = '0'
    body.style.left = '0'
    body.style.right = '0'
    body.style.overflow = 'hidden'

    return () => {
      body.style.position = previous.position
      body.style.top = previous.top
      body.style.left = previous.left
      body.style.right = previous.right
      body.style.overflow = previous.overflow
    }
  }, [])

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    if (rowRemoveTimerRef.current !== null) window.clearTimeout(rowRemoveTimerRef.current)
    if (legRemoveTimerRef.current !== null) window.clearTimeout(legRemoveTimerRef.current)
  }, [])

  useEffect(() => {
    if (selections.length > 0) {
      hadSelectionsRef.current = true
      return undefined
    }

    if (!hadSelectionsRef.current || isLeaving) return undefined

    const emptyExitTimer = window.setTimeout(() => {
      onSelectionsEmptyExitStart?.()
      requestClose()
    }, 0)

    return () => window.clearTimeout(emptyExitTimer)
  }, [isLeaving, onSelectionsEmptyExitStart, requestClose, selections.length])

  return (
    <>
      <main
        ref={pageRef}
        className={[
          'betslip-v2',
          isLeaving ? 'betslip-v2--leaving' : 'betslip-v2--entering',
          isCamisaPremiadaMode ? 'betslip-v2--camisa-premiada' : '',
          isCoveredByEvent ? 'betslip-v2--covered-by-event' : '',
          isConfirmLoading ? 'betslip-v2--confirm-loading' : '',
        ].filter(Boolean).join(' ')}
        aria-hidden={isCoveredByEvent ? true : undefined}
        aria-busy={isConfirmLoading ? true : undefined}
        aria-labelledby="betslip-v2-title"
      >
        <div className="betslip-v2__light" aria-hidden="true" />
        <header className="betslip-v2__header">
          <button type="button" className="betslip-v2__icon-button" aria-label="Eliminar todas las selecciones" disabled={isRemoveLocked} onClick={handleClearAll}>
            <img className="betslip-v2__header-icon" src={trashIcon} alt="" aria-hidden="true" draggable="false" />
          </button>

        <div className="betslip-v2__header-title">
          <div className="betslip-v2__title-row">
            <h1 id="betslip-v2-title">Resumo da sua entrada</h1>
            <span>{Math.max(summary.selectionCount, selections.length)}</span>
          </div>
          {!isLoggedOut ? <p>Saldo disponível: {balanceDisplayValue}</p> : null}
        </div>

        <button type="button" className="betslip-v2__icon-button" aria-label="Cerrar betslip" disabled={isConfirmLoading} onClick={() => requestClose()}>
          <img className="betslip-v2__header-icon" src={closeBetslipIcon} alt="" aria-hidden="true" draggable="false" />
        </button>
      </header>

      <section className="betslip-v2__content" aria-label="Selecciones">
        <div
          className="betslip-v2__list"
          onScroll={blurFocusedStakeInput}
          onTouchMove={blurFocusedStakeInput}
          onWheel={blurFocusedStakeInput}
        >
          {selectionGroups.length === 0 ? (
            <div className="betslip-v2__empty">
              <strong>No hay selecciones</strong>
              <span>Elige una odd para crear tu entrada.</span>
            </div>
          ) : selectionGroups.map((group) => (
            group.selections.length > 1 ? (
              <SgpGroup
                key={group.eventId}
                group={group}
                isRemoveDisabled={isRemoveLocked}
                isRemoving={removingRowId === group.eventId}
                nowMs={liveClockNowMs}
                onRemoveGroup={handleRemoveGroup}
                onRemoveSelection={handleRemoveSgpLeg}
                onTagInfoOpen={handleTagInfoOpen}
                removingSelectionId={removingLegId}
              />
            ) : (
              <SimpleSelectionRow
                key={group.selections[0].id}
                isRemoveDisabled={isRemoveLocked}
                isRemoving={removingRowId === group.selections[0].id}
                nowMs={liveClockNowMs}
                selection={group.selections[0]}
                onRemove={handleRemoveSelection}
                onTagInfoOpen={handleTagInfoOpen}
                showOdd={!hasSgp}
              />
            )
          ))}
        </div>
      </section>

      <footer className="betslip-v2__footer">
        <div className="betslip-v2__footer-content">
          <div className="betslip-v2__summary" aria-label="Resumen de valores">
            <label className="betslip-v2__stake">
              <span className="betslip-v2__stake-field">
                <img className="betslip-v2__stake-icon" src={iconPencil} alt="" aria-hidden="true" draggable="false" />
                <span className="betslip-v2__stake-value">
                  <span className="betslip-v2__stake-currency" aria-hidden="true">R$</span>
                  <input
                    className="betslip-v2__stake-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    enterKeyHint="done"
                    autoComplete="off"
                    aria-label="Entrada"
                    disabled={isConfirmLoading}
                    value={stakeInputValue}
                    onChange={handleStakeChange}
                    onFocus={(event) => {
                      const input = event.currentTarget

                      // Um frame depois: após a restauração do transform da
                      // supressão do reveal iOS e do posicionamento default do
                      // caret, que sobrescreveria o select() síncrono.
                      window.requestAnimationFrame(() => {
                        if (document.activeElement === input) input.select()
                      })
                    }}
                  />
                </span>
              </span>
              <span className="betslip-v2__stake-label">Entrada</span>
            </label>

            <div className={`betslip-v2__summary-item${hasTurboBoost ? ' betslip-v2__summary-item--boost' : ''}`}>
              {hasTurboBoost ? (
                <>
                  <span className="betslip-v2__boost-badge">BOOST +{turboBonusPercent}%</span>
                  <span className="betslip-v2__boost-odds">
                    <span className="betslip-v2__boost-odds-original">{animatedTotalOddsLabel}</span>
                    <strong className="betslip-v2__boost-odds-current">{animatedBoostedTotalOddsLabel}</strong>
                  </span>
                </>
              ) : (
                <>
                  <span>Odds</span>
                  <strong>{animatedTotalOddsLabel}</strong>
                </>
              )}
              {hasSgp ? <em>SGP</em> : null}
            </div>

            <div
              className={`betslip-v2__summary-item betslip-v2__summary-item--win${hasTurboBoost ? ' betslip-v2__summary-item--win-boost' : ''}`}
              aria-label={`Para ganhar ${potentialWinLabel}`}
            >
              <span className="betslip-v2__win-label">{isCamisaPremiadaMode ? 'Para ganhar' : 'Para ganar'}</span>
              <div className="betslip-v2__win-field">
                <strong aria-hidden="true">
                  <span className="betslip-v2__win-value-major">{animatedPotentialWinParts.major}</span>
                  <span className="betslip-v2__win-value-decimal">{animatedPotentialWinParts.decimal}</span>
                </strong>
              </div>
            </div>
          </div>
        </div>

        {isCamisaPremiadaMode ? (
          <CamisaPremiadaControl
            featureName={premiadaFeatureName}
            isDetailsOpen={isCamisaPremiadaDetailsOpen}
            isDisabled={isConfirmLoading}
            isEnabled={isCamisaPremiadaEnabled}
            jackpotCents={camisaPremiadaJackpotCents}
            onDetailsToggle={() => setIsCamisaPremiadaDetailsOpen((current) => !current)}
            onEnabledChange={setIsCamisaPremiadaEnabled}
          />
        ) : isTurboBoostEligible ? (
          <TurboBoostControl
            bonusPercent={turboBonusPercent}
            isDetailsOpen={isTurboBoostDetailsOpen}
            isDisabled={isConfirmLoading}
            isEnabled={isTurboBoostEnabled}
            onDetailsToggle={() => setIsTurboBoostDetailsOpen((current) => !current)}
            onEnabledChange={setTurboBoostEnabled}
          />
        ) : null}

        {!isCamisaPremiadaMode ? (
          <button
            type="button"
            className={[
              'betslip-v2__odds-accept',
              acceptsOddsChanges ? 'betslip-v2__odds-accept--checked' : '',
            ].filter(Boolean).join(' ')}
            role="checkbox"
            aria-checked={acceptsOddsChanges}
            disabled={isConfirmLoading}
            onClick={() => setAcceptsOddsChanges((current) => !current)}
          >
            <span className="betslip-v2__odds-accept-box" aria-hidden="true">
              {acceptsOddsChanges ? <span className="betslip-v2__odds-accept-check" /> : null}
            </span>
            <span className="betslip-v2__odds-accept-label">
              Aceitar sempre alterações nas odds para agilizar a criação do seu bilhete. <span>Saiba mais.</span>
            </span>
          </button>
        ) : null}

        {isLoggedOut ? (
          <div className="betslip-v2__auth-prompt" aria-label="Acesse sua conta para apostar">
            <p>Quase lá! Entre ou crie uma conta para começar a jogar.</p>
            <div className="betslip-v2__auth-actions">
              <button
                type="button"
                className="betslip-v2__auth-action betslip-v2__auth-action--primary"
                onClick={onCreateAccountClick}
              >
                Criar conta
              </button>
              <button
                type="button"
                className="betslip-v2__auth-action betslip-v2__auth-action--secondary"
                onClick={onLoginClick}
              >
                Entrar
              </button>
            </div>
          </div>
        ) : shouldShowIdentityPrompt ? (
          <div className="betslip-v2__deposit-prompt" aria-label="Verifique sua identidade para apostar">
            <p>Quase lá! Finalize seu cadastro para começar a jogar.</p>
            <button
              type="button"
              className="betslip-v2__deposit-action"
              onClick={onIdentityClick}
            >
              Verificar Identidade
            </button>
          </div>
        ) : shouldShowLimitsPrompt ? (
          <div className="betslip-v2__deposit-prompt" aria-label="Defina os limites de jogo para apostar">
            <p>Quase lá! Finalize seu cadastro para começar a jogar.</p>
            <button
              type="button"
              className="betslip-v2__deposit-action"
              onClick={onLimitsClick}
            >
              Definir limites
            </button>
          </div>
        ) : shouldShowDepositPrompt ? (
          <div className="betslip-v2__deposit-prompt" aria-label="Adicione saldo para apostar">
            <p>Quase lá! Adicione saldo para começar a jogar.</p>
            <button
              type="button"
              className="betslip-v2__deposit-action"
              onClick={onDepositClick}
            >
              Depositar
            </button>
          </div>
        ) : (
          <SwipeButton
            labelPrefix={isCamisaPremiadaMode ? 'Deslize para apostar' : undefined}
            stakeLabel={totalPayableLabel}
            onLoadingChange={handleConfirmLoadingChange}
            onComplete={handleConfirm}
          />
        )}
        </footer>
      </main>
      <BetslipTagInfoBottomSheet
        badgeLabels={tagInfoBadgeLabels}
        isOpen={tagInfoBadgeLabels.length > 0}
        onClose={handleTagInfoClose}
      />
      <BetslipClearConfirmBottomSheet
        isOpen={isClearConfirmOpen}
        onCancel={handleClearConfirmCancel}
        onConfirm={handleClearConfirmConfirm}
      />
    </>
  )
}
