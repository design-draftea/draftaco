// Resultado de uma seleção ao vivo ou de jogo encerrado: se ela está acertando ou
// errando. Funções puras, fora de `betSuccessSelections.tsx` para poderem ser usadas
// também pela tela Entradas — o arquivo de componentes só pode exportar componentes.
import { normalizeBetslipIdPart, type BetslipSelection } from '../../../shared/hooks/betslipUtils'
import {
  getSelectionEventTeams,
  getSelectionTitle,
  isDrawSelection,
} from '../BetslipPageV2/betslipDisplayUtils'

export type SelectionResultState = 'hit' | 'miss'

const resultFinalMarketKeys = new Set([
  'resultado-final',
  'resultado-final-pagamento-antecipado',
  '1x2',
  'vencer',
  'vencedor',
  'vencedor-pagamento-antecipado',
])

export const isResultFinalSelection = (selection: BetslipSelection) => {
  const marketKey = normalizeBetslipIdPart(selection.marketLabel || selection.marketId)
  const marketIdKey = normalizeBetslipIdPart(selection.marketId)

  return resultFinalMarketKeys.has(marketKey) || resultFinalMarketKeys.has(marketIdKey)
}

export const isSelectedResultFinalTeam = (selection: BetslipSelection, teamName: string) => (
  normalizeBetslipIdPart(getSelectionTitle(selection)) === normalizeBetslipIdPart(teamName)
)

const parseResultFinalScore = (score: BetslipSelection['homeScore']) => {
  if (score === undefined || score === null) return null
  if (typeof score === 'string' && !score.trim()) return null

  const numericScore = Number(score)
  return Number.isFinite(numericScore) ? numericScore : null
}

export const getResultFinalLiveStatus = (
  selection: BetslipSelection,
  homeTeam: string,
  awayTeam: string
) => {
  const homeScore = parseResultFinalScore(selection.homeScore)
  const awayScore = parseResultFinalScore(selection.awayScore)

  if (homeScore === null || awayScore === null) return null

  const isDraw = isDrawSelection(selection)
  const isHomeSelected = !isDraw && isSelectedResultFinalTeam(selection, homeTeam)
  const isAwaySelected = !isDraw && isSelectedResultFinalTeam(selection, awayTeam)
  const isHit = (
    (homeScore > awayScore && isHomeSelected)
    || (awayScore > homeScore && isAwaySelected)
    || (homeScore === awayScore && isDraw)
  )

  return {
    state: isHit ? 'hit' : 'miss',
    isDraw,
    isHomeSelected,
    isAwaySelected,
  } as const
}

export type PlayerPropResult = {
  line: number
  value: number
  state: SelectionResultState
}

// Aposta de jogador em jogo encerrado: compara a estatística final com a linha do
// mercado ("2.5+" é mais de 2,5). Sem os dois números, não há resultado a mostrar.
export const getPlayerPropResult = (selection: BetslipSelection): PlayerPropResult | null => {
  if (selection.eventStatus !== 'finished' || selection.selectionType !== 'player') return null
  if (typeof selection.playerStatValue !== 'number') return null

  const lineMatch = selection.selectionLabel.match(/^(\d+(?:[.,]\d+)?)\+$/)
  if (!lineMatch) return null

  const line = Number(lineMatch[1].replace(',', '.'))
  const value = selection.playerStatValue

  return { line, value, state: value > line ? 'hit' : 'miss' }
}

// Resultado final de uma seleção de jogo encerrado, para quem só precisa saber se ela
// acertou: resultado final pelo placar, aposta de jogador pela estatística. Outros
// mercados, ou jogo que não terminou, não têm resultado.
export const getFinishedSelectionResult = (selection: BetslipSelection): SelectionResultState | null => {
  if (selection.eventStatus !== 'finished') return null
  if (selection.selectionType === 'player') return getPlayerPropResult(selection)?.state ?? null
  if (!isResultFinalSelection(selection)) return null

  const { homeTeam, awayTeam } = getSelectionEventTeams(selection)
  if (!homeTeam || !awayTeam) return null

  return getResultFinalLiveStatus(selection, homeTeam, awayTeam)?.state ?? null
}
