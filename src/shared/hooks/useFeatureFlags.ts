import { useContext } from 'react'

import { FeatureFlagsContext } from './featureFlagsContext'

export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext)

  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider')
  }

  return context
}
