// Dados da tela Entradas.
// O conteúdo do card é o mesmo do recibo da tela de sucesso, como o desenho pede
// (nó Figma 1993:6822), então as seleções usam o tipo `BetslipSelection` do
// betslip. As entradas de Próximas nascem das apostas feitas no protótipo
// (`createEntryFromReceipt`); as de Vencedoras e Anteriores são exemplos fixos.
// Os rótulos guardam só valores: o texto em volta ("Criado:", "Encerrar aposta:")
// fica no card, para passar pela tradução da Draftea.
import type { BetslipSelection } from '../shared/hooks/betslipUtils'

export type EntryTabId = 'open' | 'won' | 'past' | 'cashed-out'

/**
 * Resultado de uma entrada já decidida; é ele que escolhe a tag do card. `cashed-out` é a
 * aposta que a pessoa encerrou antes do fim, e vai para a aba Encerradas.
 */
export type EntryOutcome = 'won' | 'lost' | 'canceled' | 'cashed-out'

/**
 * Etapas do encerramento de uma entrada de Próximas: o carregamento de 2s no botão, a
 * confirmação na tela, o card se recolhendo e a saída animada antes de ir para Encerradas.
 */
export type EntryCashOutStatus = 'processing' | 'closed' | 'settled' | 'leaving'

export interface EntrySummary {
  id: string
  /** Código do bilhete, mostrado no rodapé do card. */
  code: string
  /** Data e hora da aposta, no formato `dd/mm (HH:MM)`. */
  createdAtLabel: string
  stakeLabel: string
  totalOddsLabel: string
  potentialWinLabel: string
  /** Valor do encerramento; só as entradas em aberto trazem o botão de encerrar. */
  cashOutValueLabel?: string
  /** Só as entradas encerradas têm resultado. */
  outcome?: EntryOutcome
  /** Só existe enquanto a entrada está sendo encerrada, ainda em Próximas. */
  cashOutStatus?: EntryCashOutStatus
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

// Placar final de um jogo encerrado; com ele, o card mostra "Final", o placar e se a
// seleção acertou (nó Figma 1993:6893).
interface Resultado {
  casa: number
  fora: number
}

const comResultado = (resultado?: Resultado) => (resultado ? {
  eventStatus: 'finished' as const,
  homeScore: resultado.casa,
  awayScore: resultado.fora,
} : {})

const criarSelecaoDeTime = (
  id: string,
  homeTeam: string,
  awayTeam: string,
  escolha: string,
  oddLabel: string,
  eventTimeLabel: string,
  resultado?: Resultado,
): BetslipSelection => ({
  ...base,
  ...comResultado(resultado),
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
  resultado?: Resultado & { finalizacoes: number },
): BetslipSelection => ({
  ...base,
  ...comResultado(resultado),
  playerStatValue: resultado?.finalizacoes,
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

// Os valores seguem o `formatMoney` do betslip, o mesmo das entradas criadas por
// aposta, para os cards de exemplo e os reais ficarem iguais.
const vitoriaDupla: EntrySummary = {
  id: 'entry-won-1',
  code: 'DRFT7T2KLMW9QZ1',
  createdAtLabel: '31/08 (18:40)',
  stakeLabel: 'R$100,00',
  totalOddsLabel: '2.45x',
  potentialWinLabel: 'R$245,00',
  outcome: 'won',
  selections: [
    criarSelecaoDeTime('won-1-a', 'Palmeiras', 'Fluminense', 'Palmeiras', '1.45x', '31/08 (20:00)', { casa: 2, fora: 0 }),
    criarSelecaoDeTime('won-1-b', 'Botafogo', 'Bahia', 'Botafogo', '1.69x', '31/08 (18:30)', { casa: 1, fora: 0 }),
  ],
}

const vitoriaComJogador: EntrySummary = {
  id: 'entry-won-2',
  code: 'DRFT248NMSJB54N',
  createdAtLabel: '29/08 (20:50)',
  stakeLabel: 'R$80,00',
  totalOddsLabel: '2.23x',
  potentialWinLabel: 'R$178,40',
  outcome: 'won',
  selections: [
    // Jogos diferentes, para as linhas saírem separadas como no desenho: uma de time,
    // com placar, e uma de jogador, com a barra da estatística.
    criarSelecaoDeTime('won-2-a', 'Internacional', 'Bragantino', 'Internacional', '1.25x', '29/08 (19:00)', { casa: 2, fora: 0 }),
    criarSelecaoDeJogador('won-2-b', 'Pedro', 'Flamengo', 'São Paulo', '1.78x', '29/08 (21:30)', { casa: 3, fora: 1, finalizacoes: 4 }),
  ],
}

const naoGanhou: EntrySummary = {
  id: 'entry-past-1',
  code: 'DRFT5NQX83BVKD2',
  createdAtLabel: '30/08 (14:05)',
  stakeLabel: 'R$30,00',
  totalOddsLabel: '5.51x',
  potentialWinLabel: 'R$165,30',
  outcome: 'lost',
  // Como no nó Figma 1993:6923: uma escolha errada derruba a aposta mesmo com as
  // outras certas.
  selections: [
    criarSelecaoDeTime('past-1-a', 'Flamengo', 'Cruzeiro', 'Empate', '3.40x', '30/08 (16:00)', { casa: 2, fora: 1 }),
    criarSelecaoDeTime('past-1-b', 'São Paulo', 'Bahia', 'São Paulo', '1.62x', '30/08 (18:30)', { casa: 1, fora: 0 }),
  ],
}

const cancelada: EntrySummary = {
  id: 'entry-past-2',
  code: 'DRFT8YRD41MFTE6',
  createdAtLabel: '28/08 (11:30)',
  stakeLabel: 'R$20,00',
  totalOddsLabel: '3.20x',
  potentialWinLabel: 'R$64,00',
  outcome: 'canceled',
  selections: [
    criarSelecaoDeTime('past-2-a', 'Mirassol', 'São Paulo', 'Mirassol', '3.20x', '28/08 (16:00)'),
  ],
}

export const wonEntries: EntrySummary[] = [vitoriaDupla, vitoriaComJogador]

// Da mais recente para a mais antiga.
export const pastEntries: EntrySummary[] = [vitoriaDupla, naoGanhou, vitoriaComJogador, cancelada]
