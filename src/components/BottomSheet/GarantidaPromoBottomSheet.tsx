import { useEffect, useMemo, useRef, type MouseEvent, type ReactNode } from 'react'
import { BottomSheet } from './BottomSheet'
import {
  createBetslipSelection,
  getBetslipEventId,
  getBetslipMarketGroupId,
  normalizeBetslipIdPart,
} from '../../hooks/betslipUtils'
import { useOddSelection } from '../../hooks/useOddSelection'
import {
  createGarantidaLewandowskiSelection,
  GARANTIDA_LEWANDOWSKI_GROUP_ID,
} from '../../data/garantidaLewandowskiSelection'
import './GarantidaPromoBottomSheet.css'

import closeIcon from '../../assets/iconsDraftaco/garantidaBsClose.svg'
import glowImage from '../../assets/iconsDraftaco/garantidaBsGlow.svg'
import infoIcon from '../../assets/iconsDraftaco/garantidaBsInfoIcon.svg'
import playerImage from '../../assets/iconsDraftaco/garantidaBsPlayer.png'
import tagIcon from '../../assets/iconsDraftaco/iconBetslipGarantida.svg'
import aumentadaTagIcon from '../../assets/iconsDraftaco/iconAumentada.svg'
import superAumentadaTagIcon from '../../assets/iconsDraftaco/iconBetslipSuperAumentada.svg'
import dembeleImage from '../../assets/iconsDraftaco/imgDembelePromo.png'
import adebayoImage from '../../assets/iconsDraftaco/imgAdebayoPromo.png'

interface PromoCountdownParts {
  hours: number
  minutes: number
}

interface GarantidaPromoBottomSheetProps {
  countdown: PromoCountdownParts
  isOpen: boolean
  onClose: () => void
  variant?: PromoBottomSheetVariant
}

export type PromoBottomSheetVariant = 'garantida' | 'aumentada' | 'super-aumentada'

interface PromoBottomSheetConfig {
  variant: PromoBottomSheetVariant
  sport: 'futebol' | 'basquete'
  tag: string
  playerName: string
  market: string
  value: string
  previousValue?: string
  matchHome: string
  matchAway: string
  selectionTeamName: string
  odd: string
  playerImage: string
  tagIcon: string
  rules: string[]
}

const boostedPromotionRules = [
  'Mínimo 3 seleções.',
  'Permitido usar apenas 1 oferta aumentada por bilhete.',
  'Odd mínima do bilhete: 3x.',
  'Odd máxima do bilhete: 5x.',
  'Valor de entrada: mínimo de R$10 e máximo de R$350.',
  'Não é combinável com outras promoções.',
  'Se alguma seleção for cancelada e o bilhete deixar de atingir a odd mínima de 3x, a oferta aumentada será removida da aposta.',
]

const promoConfigs: Record<PromoBottomSheetVariant, PromoBottomSheetConfig> = {
  garantida: {
    variant: 'garantida',
    sport: 'futebol',
    tag: 'IMPERDÍVEL',
    playerName: 'R. Lewandowski',
    market: 'Finalizações ao gol',
    value: '0.5+',
    previousValue: '3.5',
    matchHome: 'BAR',
    matchAway: 'REA',
    selectionTeamName: 'BAR',
    odd: '1.85x',
    playerImage,
    tagIcon,
    rules: [
      'Mínimo 3 seleções.',
      'Permitido usar apenas 1 oferta Imperdível por bilhete.',
      'Odd mínima do bilhete: 4x.',
      'Odd máxima do bilhete: 8x.',
      'Valor de entrada: mínimo de R$10 e máximo de R$500.',
      'Não é combinável com outras promoções',
      'Se alguma seleção for cancelada e o bilhete deixar de atingir a odd mínima de 4x, a oferta Imperdível será removida da aposta.',
    ],
  },
  aumentada: {
    variant: 'aumentada',
    sport: 'futebol',
    tag: 'AUMENTADA',
    playerName: 'O. Dembélé',
    market: 'Finalizações ao gol',
    value: '1.5+',
    matchHome: 'PSG',
    matchAway: 'MCI',
    selectionTeamName: 'PSG',
    odd: '2.50x',
    playerImage: dembeleImage,
    tagIcon: aumentadaTagIcon,
    rules: boostedPromotionRules,
  },
  'super-aumentada': {
    variant: 'super-aumentada',
    sport: 'basquete',
    tag: 'SUPER AUMENTADA',
    playerName: 'Bam Adebayo',
    market: 'Pontos',
    value: '11.5+',
    matchHome: 'CHI',
    matchAway: 'MIA',
    selectionTeamName: 'MIA',
    odd: '2.50x',
    playerImage: adebayoImage,
    tagIcon: superAumentadaTagIcon,
    rules: boostedPromotionRules,
  },
}

const formatSheetCountdown = ({ hours, minutes }: PromoCountdownParts) => (
  `${hours}h : ${String(minutes).padStart(2, '0')}m`
)

function MatchInfo({ promo }: { promo: PromoBottomSheetConfig }) {
  return (
    <div className="garantida-promo-bs__match">
      <span className="garantida-promo-bs__teams">
        <strong>{promo.matchHome}</strong>
        <span> vs {promo.matchAway}</span>
      </span>
      <span className="garantida-promo-bs__dot">•</span>
      <span className="garantida-promo-bs__market">{promo.market}</span>
    </div>
  )
}

function OddsInfo({ promo }: { promo: PromoBottomSheetConfig }) {
  return (
    <div className="garantida-promo-bs__odds">
      {promo.previousValue && (
        <span className="garantida-promo-bs__previous-odd">{promo.previousValue}</span>
      )}
      <span className="garantida-promo-bs__boosted-odd">
        <strong>{promo.value}</strong>
      </span>
    </div>
  )
}

function PromoTag({ children, promo }: { children: ReactNode; promo: PromoBottomSheetConfig }) {
  return (
    <div className="garantida-promo-bs__tag">
      <img src={promo.tagIcon} alt="" aria-hidden="true" />
      <strong>{promo.tag}</strong>
      <span className="garantida-promo-bs__tag-separator">-</span>
      <strong>{children}</strong>
    </div>
  )
}

export function GarantidaPromoBottomSheet({
  countdown,
  isOpen,
  onClose,
  variant = 'garantida',
}: GarantidaPromoBottomSheetProps) {
  const promo = promoConfigs[variant]
  const getOddButtonProps = useOddSelection('garantida-promo-bs__odd-button')
  const closeTimerRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
  }, [])

  // The boosted promo odd, added to / removed from the real betslip on tap.
  const oddSelection = useMemo(() => (
    variant === 'garantida'
      ? createGarantidaLewandowskiSelection()
      : createBetslipSelection({
        eventId: getBetslipEventId({ sport: promo.sport, homeTeam: promo.matchHome, awayTeam: promo.matchAway }),
        marketId: `${promo.variant}-${normalizeBetslipIdPart(promo.market)}-${normalizeBetslipIdPart(promo.playerName)}`,
        outcomeId: normalizeBetslipIdPart(promo.value),
        label: promo.value,
        odd: promo.odd,
        marketLabel: promo.market,
        selectionType: 'player',
        sport: promo.sport,
        playerName: promo.playerName,
        selectionTeamName: promo.selectionTeamName,
        eventName: `${promo.matchHome} vs ${promo.matchAway}`,
        eventTimeLabel: 'Hoje, 20:00',
        playerImage: promo.playerImage,
        badgeType: 'boost',
        promoVariant: promo.variant,
      })
  ), [promo, variant])
  const oddGroupId = oddSelection
    ? getBetslipMarketGroupId({ eventId: oddSelection.eventId, marketId: oddSelection.marketId })
    : GARANTIDA_LEWANDOWSKI_GROUP_ID
  const oddButtonProps = getOddButtonProps(
    oddSelection?.id ?? 'garantida-promo-odd',
    oddGroupId,
    'garantida-promo-bs__odd-button',
    oddSelection,
  )
  const isSelected = oddButtonProps['aria-pressed'] === true

  const handleToggleOdd = (event: MouseEvent<HTMLButtonElement>) => {
    // Add/remove the boosted odd in the betslip, then let the sheet slide down.
    oddButtonProps.onClick?.(event)
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      onClose()
    }, 220)
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      sheetClassName={`garantida-promo-bs garantida-promo-bs--${promo.variant}`}
      bodyClassName="garantida-promo-bs__body"
      hideScrollIndicator
      blurBackdrop
    >
      <div className="garantida-promo-bs__content">
        <img className="garantida-promo-bs__glow" src={glowImage} alt="" aria-hidden="true" />

        <section className="garantida-promo-bs__main" aria-labelledby="garantida-promo-bs-title">
          <div className="garantida-promo-bs__options">
            <div className="garantida-promo-bs__profile">
              <span className="garantida-promo-bs__info-icon" aria-hidden="true">
                <img src={infoIcon} alt="" />
              </span>

              <div className="garantida-promo-bs__player-shell" aria-hidden="true">
                <div className="garantida-promo-bs__player-mask">
                  <img src={promo.playerImage} alt="" />
                </div>
              </div>

              <div className="garantida-promo-bs__headline">
                <h2 id="garantida-promo-bs-title">{promo.playerName}</h2>
                <MatchInfo promo={promo} />
                <OddsInfo promo={promo} />
              </div>
            </div>

            <button
              type="button"
              className={[
                'garantida-promo-bs__odd-button',
                isSelected ? 'garantida-promo-bs__odd-button--selected' : '',
              ].filter(Boolean).join(' ')}
              aria-pressed={isSelected}
              aria-label={`Selecionar odd ${promo.odd}`}
              onClick={handleToggleOdd}
            >
              {promo.odd}
            </button>

            <ol className="garantida-promo-bs__rules">
              {promo.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
          </div>

          <PromoTag promo={promo}>{formatSheetCountdown(countdown)}</PromoTag>

          <button
            type="button"
            className="garantida-promo-bs__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <img src={closeIcon} alt="" aria-hidden="true" />
          </button>
        </section>

      </div>
    </BottomSheet>
  )
}
