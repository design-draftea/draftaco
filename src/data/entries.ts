// Dados mockados da tela Entradas.
// O conteúdo do card é o mesmo do recibo da tela de sucesso, como o desenho pede
// (nó Figma 1993:6822), então as seleções usam o tipo `BetslipSelection` do
// betslip. Nada aqui está ligado à carteira ou ao betslip reais: é só layout.
import type { BetslipSelection } from '../shared/hooks/betslipUtils'

export type EntryTabId = 'open' | 'won' | 'past'

export interface EntrySummary {
  id: string
  /** Código do bilhete, mostrado no rodapé do card. */
  code: string
  createdAtLabel: string
  stakeLabel: string
  totalOddsLabel: string
  potentialWinLabel: string
  /** Só as entradas em aberto trazem o botão de encerrar. */
  cashOutLabel?: string
  selections: BetslipSelection[]
}

const base = {
  createdAtMs: new Date(2026, 8, 1, 10, 0).getTime(),
  eventStatus: 'prematch' as const,
  selectionType: 'team' as const,
  marketId: 'resultado-final',
  marketLabel: 'Resultado Final',
  marketTags: ['90’', 'PA'],
  leagueName: 'Brasil - Série A',
  sport: 'futebol',
}

const criarSelecaoDeTime = (
  id: string,
  homeTeam: string,
  awayTeam: string,
  escolha: string,
  oddLabel: string,
  eventTimeLabel: string,
): BetslipSelection => ({
  ...base,
  id,
  eventId: `${homeTeam}-${awayTeam}`,
  outcomeId: `${id}-outcome`,
  label: escolha,
  selectionLabel: escolha,
  selectionTeamName: escolha,
  oddLabel,
  oddValue: Number(oddLabel.replace('x', '')),
  homeTeam,
  awayTeam,
  eventName: `${homeTeam} x ${awayTeam}`,
  eventTimeLabel,
})

const criarSelecaoDeJogador = (
  id: string,
  playerName: string,
  homeTeam: string,
  awayTeam: string,
  oddLabel: string,
  eventTimeLabel: string,
): BetslipSelection => ({
  ...base,
  id,
  eventId: `${homeTeam}-${awayTeam}-jogador`,
  outcomeId: `${id}-outcome`,
  selectionType: 'player',
  marketId: 'finalizacoes-ao-gol',
  marketLabel: 'Finalizações ao Gol',
  marketTags: ['B+'],
  label: `${playerName} 2.5+`,
  selectionLabel: '2.5+',
  playerName,
  selectionTeamName: homeTeam,
  oddLabel,
  oddValue: Number(oddLabel.replace('x', '')),
  homeTeam,
  awayTeam,
  eventName: `${homeTeam} x ${awayTeam}`,
  eventTimeLabel,
})

export const openEntries: EntrySummary[] = [
  {
    id: 'entry-open-1',
    code: 'DRFT248NMSJB54N',
    createdAtLabel: 'Criado: 01/09 (10:00)',
    stakeLabel: 'R$ 200,00',
    totalOddsLabel: '3.50x',
    potentialWinLabel: 'R$ 700,00',
    cashOutLabel: 'Encerrar aposta: R$ 200,00',
    selections: [
      criarSelecaoDeTime('open-1-a', 'Flamengo', 'Cruzeiro', 'Flamengo', '1.25x', 'Amanhã (21:30)'),
      criarSelecaoDeTime('open-1-b', 'Internacional', 'Bragantino', 'Empate', '3.40x', 'Amanhã (19:00)'),
      criarSelecaoDeJogador('open-1-c', 'Pedro', 'Flamengo', 'Cruzeiro', '1.78x', 'Amanhã (21:30)'),
    ],
  },
  {
    id: 'entry-open-2',
    code: 'DRFT91КZQ4XP07T'.replace('К', 'K'),
    createdAtLabel: 'Criado: 01/09 (09:12)',
    stakeLabel: 'R$ 50,00',
    totalOddsLabel: '2.10x',
    potentialWinLabel: 'R$ 105,00',
    cashOutLabel: 'Encerrar aposta: R$ 50,00',
    selections: [
      criarSelecaoDeTime('open-2-a', 'Mirassol', 'São Paulo', 'São Paulo', '1.70x', 'Hoje (16:00)'),
    ],
  },
]

export const wonEntries: EntrySummary[] = [
  {
    id: 'entry-won-1',
    code: 'DRFT7T2KLMW9QZ1',
    createdAtLabel: 'Criado: 31/08 (18:40)',
    stakeLabel: 'R$ 100,00',
    totalOddsLabel: '2.45x',
    potentialWinLabel: 'R$ 245,00',
    selections: [
      criarSelecaoDeTime('won-1-a', 'Palmeiras', 'Fluminense', 'Palmeiras', '1.45x', '31/08 (20:00)'),
      criarSelecaoDeTime('won-1-b', 'Botafogo', 'Bahia', 'Botafogo', '1.69x', '31/08 (18:30)'),
    ],
  },
]

export const pastEntries: EntrySummary[] = [
  ...wonEntries,
  {
    id: 'entry-past-1',
    code: 'DRFT5NQX83BVKD2',
    createdAtLabel: 'Criado: 30/08 (14:05)',
    stakeLabel: 'R$ 30,00',
    totalOddsLabel: '5.50x',
    potentialWinLabel: 'R$ 165,00',
    selections: [
      criarSelecaoDeTime('past-1-a', 'Flamengo', 'Cruzeiro', 'Empate', '5.50x', '30/08 (16:00)'),
    ],
  },
]

export const entriesByTab: Record<EntryTabId, EntrySummary[]> = {
  open: openEntries,
  won: wonEntries,
  past: pastEntries,
}
