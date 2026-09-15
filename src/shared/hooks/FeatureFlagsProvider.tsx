import { brandStorage } from '../brand/storage'
import { currentBrand, navigateToBrand } from '../brand/routing'
import { getBrandConfig } from '../brand/config'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  FeatureFlagsContext,
  brandModeDefinitions,
  featureFlagDefinitions,
  type FeatureFlagId,
  type FeatureFlagsContextValue,
  type FeatureFlagsState,
} from './featureFlagsContext'

interface FeatureFlagsProviderProps {
  children: ReactNode
}

const featureFlagsStorageKey = 'draftaco:feature-flags'

const getDefaultFeatureFlags = () => (
  featureFlagDefinitions.reduce((accumulator, definition) => {
    accumulator[definition.id] = getBrandConfig().features[definition.id]
    return accumulator
  }, {} as FeatureFlagsState)
)

const readStoredFeatureFlags = () => {
  const defaultFlags = getDefaultFeatureFlags()

  try {
    const storedValue = brandStorage.getItem(featureFlagsStorageKey)
    if (!storedValue) return defaultFlags

    const parsedValue = JSON.parse(storedValue) as Partial<Record<FeatureFlagId, unknown>>

    return featureFlagDefinitions.reduce((accumulator, definition) => {
      const storedFlagValue = parsedValue[definition.id]
      accumulator[definition.id] = typeof storedFlagValue === 'boolean' && !definition.lockToDefault
        ? storedFlagValue
        : getBrandConfig().features[definition.id]

      return accumulator
    }, {} as FeatureFlagsState)
  } catch {
    return defaultFlags
  }
}

const getFeatureFlagDefinition = (flagId: FeatureFlagId) => (
  featureFlagDefinitions.find((definition) => definition.id === flagId)
)

export function FeatureFlagsProvider({ children }: FeatureFlagsProviderProps) {
  const [flags, setFlags] = useState<FeatureFlagsState>(readStoredFeatureFlags)
  const brandMode = currentBrand()
  const setBrandMode = navigateToBrand

  useEffect(() => {
    brandStorage.setItem(featureFlagsStorageKey, JSON.stringify(flags))
  }, [flags])


  const setFeatureFlag = useCallback((flagId: FeatureFlagId, enabled: boolean) => {
    if (getFeatureFlagDefinition(flagId)?.lockToDefault) return

    setFlags((currentFlags) => ({
      ...currentFlags,
      [flagId]: enabled,
    }))
  }, [])

  const toggleFeatureFlag = useCallback((flagId: FeatureFlagId) => {
    if (getFeatureFlagDefinition(flagId)?.lockToDefault) return

    setFlags((currentFlags) => ({
      ...currentFlags,
      [flagId]: !currentFlags[flagId],
    }))
  }, [])

  const isFeatureEnabled = useCallback((flagId: FeatureFlagId) => {
    const definition = getFeatureFlagDefinition(flagId)
    return definition?.lockToDefault ? getBrandConfig().features[definition.id] : flags[flagId]
  }, [flags])

  const value = useMemo<FeatureFlagsContextValue>(() => ({
    flags,
    definitions: featureFlagDefinitions,
    brandMode,
    brandModeDefinitions,
    setFeatureFlag,
    toggleFeatureFlag,
    isFeatureEnabled,
    setBrandMode,
  }), [brandMode, flags, isFeatureEnabled, setFeatureFlag, toggleFeatureFlag])

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}
