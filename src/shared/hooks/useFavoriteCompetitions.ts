import { brandStorage } from '../brand/storage'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { CompetitionLinkTarget } from '../utils/competitionNavigation'

const favoriteCompetitionsStorageKey = 'draftaco:favorite-competitions'

const getCompetitionKey = (competition: CompetitionLinkTarget) => (
  `${competition.sport}:${competition.id}`
)

const isCompetitionLinkTarget = (value: unknown): value is CompetitionLinkTarget => {
  if (!value || typeof value !== 'object') return false

  const target = value as Partial<Record<keyof CompetitionLinkTarget, unknown>>

  return (
    typeof target.id === 'string' && target.id.trim().length > 0 &&
    typeof target.name === 'string' && target.name.trim().length > 0 &&
    typeof target.sport === 'string' && target.sport.trim().length > 0
  )
}

const getUniqueCompetitionTargets = (values: CompetitionLinkTarget[]) => {
  const seenKeys = new Set<string>()

  return values.filter((competition) => {
    const key = getCompetitionKey(competition)
    if (seenKeys.has(key)) return false

    seenKeys.add(key)
    return true
  })
}

const readFavoriteCompetitions = (): CompetitionLinkTarget[] => {
  try {
    const storedValue = brandStorage.getItem(favoriteCompetitionsStorageKey)
    if (!storedValue) return []

    const parsedValue = JSON.parse(storedValue) as unknown
    if (!Array.isArray(parsedValue)) return []

    return getUniqueCompetitionTargets(parsedValue.filter(isCompetitionLinkTarget))
  } catch {
    return []
  }
}

export function useFavoriteCompetitions() {
  const [favorites, setFavorites] = useState<CompetitionLinkTarget[]>(readFavoriteCompetitions)
  const favoriteKeys = useMemo(
    () => new Set(favorites.map(getCompetitionKey)),
    [favorites]
  )

  useEffect(() => {
    try {
      brandStorage.setItem(favoriteCompetitionsStorageKey, JSON.stringify(favorites))
    } catch {
      // Mantém a experiência funcional em memória quando o storage não está disponível.
    }
  }, [favorites])

  const isFavorite = useCallback((competition: CompetitionLinkTarget) => (
    favoriteKeys.has(getCompetitionKey(competition))
  ), [favoriteKeys])

  const toggleFavorite = useCallback((competition: CompetitionLinkTarget) => {
    setFavorites((currentFavorites) => {
      const competitionKey = getCompetitionKey(competition)
      const isAlreadyFavorite = currentFavorites.some((favorite) => (
        getCompetitionKey(favorite) === competitionKey
      ))

      return isAlreadyFavorite
        ? currentFavorites.filter((favorite) => getCompetitionKey(favorite) !== competitionKey)
        : [...currentFavorites, competition]
    })
  }, [])

  const moveFavorite = useCallback((fromIndex: number, toIndex: number) => {
    setFavorites((currentFavorites) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= currentFavorites.length ||
        toIndex >= currentFavorites.length
      ) return currentFavorites

      const nextFavorites = [...currentFavorites]
      const [movedFavorite] = nextFavorites.splice(fromIndex, 1)
      nextFavorites.splice(toIndex, 0, movedFavorite)

      return nextFavorites
    })
  }, [])

  return {
    favorites,
    isFavorite,
    moveFavorite,
    toggleFavorite,
  }
}
