import logo from './assets/logoReidoPitaco.svg'
import logoLight from './assets/logoReidoPitacoLight.svg'
import type { BrandConfig } from '../../shared/brand/types'

export const pitaco: BrandConfig = {
  id: 'pitaco', name: 'Rei do Pitaco', locale: 'pt-BR',
  assets: { logo, logoLight },
  features: { casino: false, signup: true, freeBetsAvailable: false, unifiedSportsBottomSheetV2: true },
  messages: { createAccount: 'Criar conta', login: 'Entrar' },
}
