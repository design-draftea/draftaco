import lewandowskiCard from '../assets/iconsDraftaco/LewandowskiCard.png'
import {
  createBetslipSelection,
  getBetslipEventId,
  getBetslipMarketGroupId,
} from '../hooks/betslipUtils'

export const GARANTIDA_LEWANDOWSKI_EVENT_ID = getBetslipEventId({
  sport: 'futebol',
  homeTeam: 'BAR',
  awayTeam: 'REA',
})
export const GARANTIDA_LEWANDOWSKI_MARKET_ID = 'garantida-finalizacoes-ao-gol-r-lewandowski'
export const GARANTIDA_LEWANDOWSKI_OUTCOME_ID = '0-5'
export const GARANTIDA_LEWANDOWSKI_GROUP_ID = getBetslipMarketGroupId({
  eventId: GARANTIDA_LEWANDOWSKI_EVENT_ID,
  marketId: GARANTIDA_LEWANDOWSKI_MARKET_ID,
})

export const createGarantidaLewandowskiSelection = () => createBetslipSelection({
  eventId: GARANTIDA_LEWANDOWSKI_EVENT_ID,
  marketId: GARANTIDA_LEWANDOWSKI_MARKET_ID,
  outcomeId: GARANTIDA_LEWANDOWSKI_OUTCOME_ID,
  label: '0.5+',
  odd: '1.85x',
  marketLabel: 'Finalizações ao gol',
  selectionType: 'player',
  sport: 'futebol',
  playerName: 'R. Lewandowski',
  selectionTeamName: 'BAR',
  eventName: 'BAR vs REA',
  eventTimeLabel: 'Hoje, 20:00',
  playerImage: lewandowskiCard,
  badgeType: 'boost',
  promoVariant: 'garantida',
})
