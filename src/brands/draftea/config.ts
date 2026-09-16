import logo from './assets/logoDraftea.svg'
import type { BrandConfig } from '../../shared/brand/types'

export const draftea: BrandConfig = {
  id: 'draftea', name: 'Draftea', locale: 'es-MX',
  assets: { logo, logoLight: logo },
  features: { casino: false, signup: false, freeBetsAvailable: false, unifiedSportsBottomSheetV2: true },
  messages: {
    createAccount: 'Crear cuenta',
    login: 'Iniciar sesión',
    navbarItems: {
      home: 'Bets',
      entradas: 'Mis entradas',
      'ao-vivo': 'Gaming',
      promocoes: 'Rewards',
      buscar: 'Buscar',
    },
  },
}
