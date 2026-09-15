import { createContext } from 'react'

export type FeatureFlagId = 'freeBetsAvailable' | 'unifiedSportsBottomSheetV2'
export type { BrandId as BrandMode } from '../brand/types'
import type { BrandId as BrandMode } from '../brand/types'

export interface FeatureFlagDefinition {
  id: FeatureFlagId
  title: string
  description: string
  defaultEnabled: boolean
  lockToDefault?: boolean
  visibleInPanel?: boolean
}

export interface BrandModeDefinition {
  id: BrandMode
  label: string
}

export const featureFlagDefinitions: FeatureFlagDefinition[] = [
  {
    id: 'unifiedSportsBottomSheetV2',
    title: 'Esportes e favoritos V2',
    description: 'Alterna entre o novo bottom sheet unificado e a versão atual.',
    defaultEnabled: true,
  },
  {
    id: 'freeBetsAvailable',
    title: 'Apostas Gratis disponivel',
    description: 'Ativa a experiencia em prototipo de Apostas Gratis.',
    defaultEnabled: false,
    lockToDefault: true,
    visibleInPanel: false,
  },
]

export const brandModeDefinitions: BrandModeDefinition[] = [
  { id: 'draftea', label: 'Draftea' },
  { id: 'pitaco', label: 'Pitaco' },
]

export type FeatureFlagsState = Record<FeatureFlagId, boolean>

export interface FeatureFlagsContextValue {
  flags: FeatureFlagsState
  definitions: FeatureFlagDefinition[]
  brandMode: BrandMode
  brandModeDefinitions: BrandModeDefinition[]
  setFeatureFlag: (flagId: FeatureFlagId, enabled: boolean) => void
  toggleFeatureFlag: (flagId: FeatureFlagId) => void
  isFeatureEnabled: (flagId: FeatureFlagId) => boolean
  setBrandMode: (brandMode: BrandMode) => void
}

export const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null)
