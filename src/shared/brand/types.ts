export type BrandId = 'pitaco' | 'draftea'

export interface BrandConfig {
  id: BrandId
  name: string
  locale: 'pt-BR' | 'es-MX'
  assets: { logo: string; logoLight: string }
  features: {
    casino: boolean
    signup: boolean
    freeBetsAvailable: boolean
    unifiedSportsBottomSheetV2: boolean
  }
  messages: {
    createAccount: string
    login: string
    // Rótulos da navbar por id de item. A Draftea usa nomes próprios (Bets, Mis entradas,
    // Gaming, Rewards) que não são tradução do texto da Pitaco, então não passam pelo
    // catálogo legado — cada marca declara os seus.
    navbarItems: Record<string, string>
  }
}
