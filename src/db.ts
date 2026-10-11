import { Dexie } from 'dexie'
import type { EntityTable } from 'dexie'
import { getMealNutrition } from './lib/storedFoods.ts'
import type { FoodEntry, StoredFood, StoredMeal, StoredMealInput } from './types/food'

// Start: Define typed browser database tables and retain version 1 data when adding the library.
class MacroTrackerDatabase extends Dexie {
  foodEntries!: EntityTable<FoodEntry, 'id'>
  storedFoods!: EntityTable<StoredFood, 'id'>
  meals!: EntityTable<StoredMeal, 'id'>

  constructor() {
    super('macro-tracker')
    this.version(1).stores({ foodEntries: '++id, date' })
    this.version(2).stores({
      foodEntries: '++id, date',
      storedFoods: '++id, name',
      meals: '++id, name',
    })
  }
}

export const db = new MacroTrackerDatabase()
// End: Database schema and shared instance.

// Start: Validate ingredient references and save the meal within one database transaction.
export async function saveStoredMeal(meal: StoredMealInput): Promise<void> {
  await db.transaction('rw', db.storedFoods, db.meals, async () => {
    const ingredients = await db.storedFoods.bulkGet(meal.ingredients.map((item) => item.foodId))
    const foods = ingredients.filter((food): food is StoredFood => food !== undefined)
    getMealNutrition(meal, foods)
    await db.meals.add({ ...meal, createdAt: Date.now() })
  })
}
// End: Transactional meal save.

// Start: Give the dashboard a clear explanation when a saved meal still needs a base food.
export class StoredFoodInUseError extends Error {
  constructor(mealNames: string[]) {
    super(`This food is used in saved meals: ${mealNames.join(', ')}. Delete these meals first.`)
    this.name = 'StoredFoodInUseError'
  }
}
// End: Referenced ingredient error.

// Start: Delete a library item while protecting recipe ingredients and retaining diary snapshots.
export async function deleteStoredItem(kind: 'food' | 'meal', id: number): Promise<void> {
  if (kind === 'meal') {
    await db.meals.delete(id)
    return
  }

  await db.transaction('rw', db.storedFoods, db.meals, async () => {
    const dependentMeals = await db.meals
      .filter((meal) => meal.ingredients.some((ingredient) => ingredient.foodId === id))
      .toArray()

    if (dependentMeals.length > 0) {
      throw new StoredFoodInUseError(dependentMeals.map((meal) => meal.name))
    }
    await db.storedFoods.delete(id)
  })
}
// End: Transactional library deletion.
