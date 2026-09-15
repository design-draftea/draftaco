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
  messages: { createAccount: string; login: string }
}
