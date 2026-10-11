import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { db, deleteStoredItem, saveStoredMeal, StoredFoodInUseError } from '../src/db.ts'
import { getDailyTotals } from '../src/lib/nutrition.ts'
import { getMealNutrition, resolveStoredSelection } from '../src/lib/storedFoods.ts'
import type { FoodEntry, StoredFood, StoredMeal } from '../src/types/food.ts'

// Start: Use an in-memory IndexedDB with fixed/weight foods, recipes, and existing diary snapshots.
// These nutrition values are test fixtures, not nutritional recommendations.
const foods: StoredFood[] = [
  { id: 1, name: 'Egg', serving: '1 egg', calories: 70, protein: 6, carbs: 1, fats: 5, createdAt: 0 },
  { id: 2, name: 'Tortilla', serving: '1 tortilla', calories: 100, protein: 3, carbs: 20, fats: 2, createdAt: 0 },
  { id: 3, name: 'Rice', serving: '100 g', servingMode: 'weight', referenceGrams: 100,
    calories: 200, protein: 4, carbs: 40, fats: 1, createdAt: 0 },
]
const meals: StoredMeal[] = [
  { id: 1, name: 'Breakfast wrap', ingredients: [{ foodId: 2, quantity: 1 }, { foodId: 1, quantity: 3 }], createdAt: 0 },
  { id: 2, name: 'Scrambled eggs', ingredients: [{ foodId: 1, quantity: 2, unit: 'serving' }], createdAt: 0 },
]
const diaryEntries: FoodEntry[] = [
  { ...resolveStoredSelection('food:3', '124', foods, meals), id: 1, date: '2026-10-10', createdAt: 0 },
  { ...resolveStoredSelection('meal:1', '1', foods, meals), id: 2, date: '2026-10-10', createdAt: 0 },
]

beforeEach(async () => {
  await db.transaction('rw', db.storedFoods, db.meals, db.foodEntries, async () => {
    await db.storedFoods.clear()
    await db.meals.clear()
    await db.foodEntries.clear()
    await db.storedFoods.bulkPut(foods)
    await db.meals.bulkPut(meals)
    await db.foodEntries.bulkPut(diaryEntries)
  })
})
after(async () => { await db.delete() })
// End: Isolated database fixtures and cleanup.

// Start: Verify actual database deletion, recipe protection, and historical nutrition retention.
test('deleting an unused weight-based food retains other foods, recipes, and logged grams', async () => {
  await deleteStoredItem('food', 3)

  assert.equal(await db.storedFoods.get(3), undefined)
  assert.deepEqual(await db.storedFoods.toArray(), foods.slice(0, 2))
  assert.deepEqual(await db.meals.toArray(), meals)
  assert.deepEqual(await db.foodEntries.toArray(), diaryEntries)
  assert.deepEqual(getDailyTotals(await db.foodEntries.toArray()), getDailyTotals(diaryEntries))
})

test('a referenced food cannot be deleted and the error identifies every dependent meal', async () => {
  await assert.rejects(deleteStoredItem('food', 1), (cause: unknown) => {
    assert.ok(cause instanceof StoredFoodInUseError)
    assert.match(cause.message, /Breakfast wrap/)
    assert.match(cause.message, /Scrambled eggs/)
    return true
  })

  assert.deepEqual(await db.storedFoods.toArray(), foods)
  assert.deepEqual(await db.meals.toArray(), meals)
  assert.deepEqual(await db.foodEntries.toArray(), diaryEntries)
})

test('deleting a meal retains the food with the same ID and past logged meal nutrition', async () => {
  await deleteStoredItem('meal', 1)

  assert.equal(await db.meals.get(1), undefined)
  assert.deepEqual(await db.meals.toArray(), [meals[1]])
  assert.deepEqual(await db.storedFoods.toArray(), foods)
  assert.deepEqual(await db.foodEntries.toArray(), diaryEntries)
  assert.deepEqual(getDailyTotals(await db.foodEntries.toArray()), getDailyTotals(diaryEntries))
})

test('removing all dependent meals allows the ingredient to be deleted without changing diary entries', async () => {
  await deleteStoredItem('meal', 1)
  await assert.rejects(deleteStoredItem('food', 1), StoredFoodInUseError)
  await deleteStoredItem('meal', 2)
  await deleteStoredItem('food', 1)

  assert.equal(await db.storedFoods.get(1), undefined)
  assert.deepEqual(await db.storedFoods.toArray(), foods.slice(1))
  assert.equal(await db.meals.count(), 0)
  assert.deepEqual(await db.foodEntries.toArray(), diaryEntries)
})
// End: Library deletion and diary preservation tests.

// Start: Exercise both transaction orderings when a meal save competes with ingredient deletion.
for (const saveFirst of [false, true]) {
  test(`concurrent ${saveFirst ? 'meal save then food deletion' : 'food deletion then meal save'} cannot create a broken recipe`, async () => {
    await db.meals.clear()
    const recipe = { name: 'New egg meal', ingredients: [{ foodId: 1, quantity: 1 }] }
    const operations = saveFirst
      ? [saveStoredMeal(recipe), deleteStoredItem('food', 1)]
      : [deleteStoredItem('food', 1), saveStoredMeal(recipe)]
    const outcomes = await Promise.allSettled(operations)
    const currentFoods = await db.storedFoods.toArray()
    const currentMeals = await db.meals.toArray()

    assert.equal(outcomes.filter((outcome) => outcome.status === 'fulfilled').length, 1)
    assert.equal(outcomes.filter((outcome) => outcome.status === 'rejected').length, 1)
    if (currentFoods.some((food) => food.id === 1)) {
      assert.equal(currentMeals.length, 1)
      assert.deepEqual(getMealNutrition(currentMeals[0], currentFoods), {
        calories: 70, protein: 6, carbs: 1, fats: 5,
      })
    } else {
      assert.equal(currentMeals.length, 0)
    }
    assert.deepEqual(await db.foodEntries.toArray(), diaryEntries)
  })
}
// End: Concurrent save/delete tests.
