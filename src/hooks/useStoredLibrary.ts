import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { StoredFood, StoredMeal } from '../types/food'

type StoredLibraryResult = {
  foods: StoredFood[]
  meals: StoredMeal[]
  error: string | null
}

export function useStoredLibrary() {
  // Start: Read both library tables together and refresh when data changes or a retry is requested.
  const [attempt, setAttempt] = useState(0)
  const result = useLiveQuery(async (): Promise<StoredLibraryResult> => {
    try {
      return await db.transaction('r', db.storedFoods, db.meals, async () => {
        const foods = await db.storedFoods.orderBy('name').toArray()
        const meals = await db.meals.orderBy('name').toArray()
        return { foods, meals, error: null }
      })
    } catch {
      return { foods: [], meals: [], error: 'Could not load stored foods and meals.' }
    }
  }, [attempt])
  // End: Live library query and error handling.

  // Start: Expose the library, loading/error status, and a callback to retry the query.
  return {
    foods: result?.foods ?? [],
    meals: result?.meals ?? [],
    error: result?.error ?? null,
    isLoading: result === undefined,
    retry: () => setAttempt((current) => current + 1),
  }
  // End: Library hook result.
}
