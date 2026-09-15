import type { HomeCompetitionMarketChip, HomeCompetitionMatch } from '../types/home'
import { currentBrand } from '../brand/routing'

// Mercados da NFL compartilhados entre a página de competição e o detalhe do evento.
// Mantidos aqui para que as duas telas usem as mesmas linhas, rótulos e ordem.

// "3ª & 8" no Pitaco, "3ra & 8" na Draftea. Os ordinais em espanhol não seguem um
// sufixo único, então não dá para resolver por substituição de texto no catálogo.
// Mora aqui, e não no LiveEventPage, porque o replay de jogadas também precisa dele — e
// importar de lá criaria ciclo, do mesmo jeito que aconteceu com o MarketAccordion.
const spanishDownOrdinals: Record<number, string> = { 1: '1ra', 2: '2da', 3: '3ra', 4: '4ta' }

export const getDownOrdinal = (down: number) => (
  currentBrand() === 'draftea'
    ? spanishDownOrdinals[down] ?? `${down}ta`
    : `${down}ª`
)

export const getDownAndDistanceLabel = (down: number, distance: number) => {
  // Dentro da linha de 10 jardas o alvo é a end zone, não uma distância.
  const distanceLabel = distance <= 0 ? 'Gol' : String(distance)

  return `${getDownOrdinal(down)} & ${distanceLabel}`
}

export const formatNflLine = (line: number) => (
  Number.isInteger(line) ? String(line) : line.toFixed(1)
)

const parseNflOdd = (odd: string | undefined) => {
  const parsed = Number(String(odd ?? '').replace(',', '.').replace(/[^\d.]/g, ''))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1.9
}

// Mercados de tempo têm odds levemente diferentes do jogo inteiro, como nos quartos do basquete.
export const adjustNflOdd = (odd: string | undefined, delta: number) => (
  `${Math.max(1.05, parseNflOdd(odd) + delta).toFixed(2)}x`
)

export interface NflMarketColumnsInput {
  homeLabel: string
  awayLabel: string
  homeOdd: string
  awayOdd: string
  hasEarlyPayout: boolean
  totalLine?: number
  totalOver?: string
  totalUnder?: string
  handicapLine?: number
  handicapHome?: string
  handicapAway?: string
}

// Colunas do card `leagueMarkets` do Figma: RF (com badge PA quando há pagamento
// antecipado), Handicap e Total. Nos mercados de tempo (1º/2º) as linhas de total e
// handicap são derivadas da linha do jogo inteiro.
export const getNflMarketColumns = (
  input: NflMarketColumnsInput,
  marketId?: string
): HomeCompetitionMatch['marketColumns'] => {
  const fullTotalLine = input.totalLine ?? 44.5
  const fullHandicapLine = Math.abs(input.handicapLine ?? 3.5)
  const isHalfMarket = marketId === 'h1' || marketId === 'h2'
  const totalLine = isHalfMarket
    ? Math.max(3.5, Math.round(fullTotalLine / 2) + (marketId === 'h2' ? 0.5 : -0.5))
    : fullTotalLine
  const handicapLine = isHalfMarket
    ? Math.max(0.5, Math.round(fullHandicapLine / 2) - 0.5)
    : fullHandicapLine
  const periodTag = marketId === 'h1' ? '1T' : marketId === 'h2' ? '2T' : undefined
  const oddOffset = marketId === 'h1' ? 0.1 : marketId === 'h2' ? 0.06 : 0

  return [
    {
      label: 'RF',
      fullLabel: 'Resultado Final',
      // "PA" = pagamento antecipado; mesma convenção das tags de futebol.
      tag: periodTag ?? (input.hasEarlyPayout ? 'PA' : undefined),
      homeOdd: {
        label: input.homeLabel,
        value: oddOffset ? adjustNflOdd(input.homeOdd, oddOffset) : input.homeOdd,
      },
      awayOdd: {
        label: input.awayLabel,
        value: oddOffset ? adjustNflOdd(input.awayOdd, -oddOffset) : input.awayOdd,
      },
    },
    {
      label: 'Handicap',
      homeOdd: {
        label: `${input.homeLabel} +${formatNflLine(handicapLine)}`,
        value: oddOffset
          ? adjustNflOdd(input.handicapHome ?? '1.88x', oddOffset / 2)
          : input.handicapHome ?? '1.88x',
      },
      awayOdd: {
        label: `${input.awayLabel} -${formatNflLine(handicapLine)}`,
        value: oddOffset
          ? adjustNflOdd(input.handicapAway ?? '1.92x', -(oddOffset / 2))
          : input.handicapAway ?? '1.92x',
      },
    },
    {
      label: 'Total',
      homeOdd: {
        label: `${formatNflLine(totalLine)}+`,
        value: oddOffset
          ? adjustNflOdd(input.totalOver ?? '1.90x', oddOffset / 2)
          : input.totalOver ?? '1.90x',
      },
      awayOdd: {
        label: `${formatNflLine(totalLine)}-`,
        value: oddOffset
          ? adjustNflOdd(input.totalUnder ?? '1.90x', -(oddOffset / 2))
          : input.totalUnder ?? '1.90x',
      },
    },
  ]
}

// Pills do detalhe do evento (Figma 1825-51678). São decorativas, como as do basquete.
export const nflEventMarketChips: HomeCompetitionMarketChip[] = [
  { id: 'populares', label: 'POPULARES' },
  { id: 'tempo-integral', label: 'TEMPO INTEGRAL' },
  { id: 'tempos', label: 'TEMPOS' },
  { id: 'quartos', label: 'QUARTOS' },
  { id: 'recepcoes', label: 'RECEPÇÕES' },
  { id: 'touchdown', label: 'TOUCHDOWN' },
  { id: 'corrida', label: 'CORRIDA' },
  { id: 'h2', label: '2º TEMPO' },
]
