// Dados mockados da tela Entradas, portados do protótipo Pulse.
// Só o layout foi trazido: nada aqui está ligado à carteira, ao betslip ou a
// qualquer estado real do Draftaco. Os valores reproduzem os previews que o
// Pulse usa para conferir os cards no Figma (856:7277, 856:6341 e 856:7618).

export type EntrySide = 'up' | 'down'

export type SettledEntryOutcome = 'won' | 'lost' | 'sold' | 'canceled'

export interface OpenEntrySummary {
  side: EntrySide
  participations: number
  amountCents: number
  averagePriceCents: number
  potentialPayoutCents: number
}

export interface SettledEntrySummary {
  id: string
  roundStart: number
  roundEnd: number
  side: EntrySide
  outcome: SettledEntryOutcome
  amountCents: number
  participations: number
  payoutCents: number
  targetPrice: number | null
  finalPrice: number | null
}

/** Janela da rodada aberta, no formato que o card mostra no header. */
export const openRoundWindow = {
  startTime: '10:00',
  endTime: '10:15',
  minutes: '07',
  seconds: '42',
  targetPrice: 80_194.33,
  currentPrice: 80_196.12,
}

export const openEntries: OpenEntrySummary[] = [
  {
    side: 'down',
    participations: 588.24,
    amountCents: 20_000,
    averagePriceCents: 34,
    potentialPayoutCents: 58_824,
  },
  {
    side: 'up',
    participations: 588.24,
    amountCents: 20_000,
    averagePriceCents: 34,
    potentialPayoutCents: 58_824,
  },
]

const wonEntry: SettledEntrySummary = {
  id: 'entry-won',
  roundStart: new Date(2026, 8, 1, 10, 0).getTime(),
  roundEnd: new Date(2026, 8, 1, 10, 15).getTime(),
  side: 'down',
  outcome: 'won',
  amountCents: 20_000,
  participations: 588.24,
  payoutCents: 58_824,
  targetPrice: 80_194.33,
  finalPrice: 80_193.64,
}

export const wonEntries: SettledEntrySummary[] = [
  wonEntry,
  {
    ...wonEntry,
    id: 'entry-won-2',
    roundStart: new Date(2026, 8, 1, 8, 45).getTime(),
    roundEnd: new Date(2026, 8, 1, 9, 0).getTime(),
    side: 'up',
    amountCents: 10_000,
    participations: 312.5,
    payoutCents: 31_250,
    targetPrice: 80_120.5,
    finalPrice: 80_144.18,
  },
]

export const pastEntries: SettledEntrySummary[] = [
  wonEntry,
  {
    ...wonEntry,
    id: 'entry-lost',
    roundStart: new Date(2026, 8, 1, 9, 45).getTime(),
    roundEnd: new Date(2026, 8, 1, 10, 0).getTime(),
    outcome: 'lost',
    payoutCents: 0,
    finalPrice: 80_195.64,
  },
  {
    ...wonEntry,
    id: 'entry-sold',
    roundStart: new Date(2026, 8, 1, 9, 30).getTime(),
    roundEnd: new Date(2026, 8, 1, 9, 45).getTime(),
    side: 'up',
    outcome: 'sold',
    amountCents: 20_000,
    participations: 298.51,
    payoutCents: 20_000,
    finalPrice: null,
  },
  {
    ...wonEntry,
    id: 'entry-canceled',
    roundStart: new Date(2026, 8, 1, 9, 15).getTime(),
    roundEnd: new Date(2026, 8, 1, 9, 30).getTime(),
    outcome: 'canceled',
    payoutCents: 0,
    finalPrice: 80_195.64,
  },
]
