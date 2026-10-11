import assert from 'node:assert/strict'
import test from 'node:test'
import { getDailyTotals } from '../src/lib/nutrition.ts'
import { getFoodNutrition, getFoodQuantityUnit, getMealNutrition, parseMealInput, parseStoredFoodInput, resolveStoredSelection, scaleNutrition } from '../src/lib/storedFoods.ts'
import type { StoredFood, StoredFoodFormValues, StoredMeal } from '../src/types/food.ts'

// Start: Fixtures include old foods without serving metadata and a new food measured by weight.
// These values are test fixtures, not nutritional recommendations.
const foods: StoredFood[] = [
  { id: 1, name: 'Egg', serving: '1 egg', calories: 70, protein: 6, carbs: 1, fats: 5, createdAt: 0 },
  { id: 2, name: 'Tortilla', serving: '1 tortilla', calories: 100, protein: 3, carbs: 20, fats: 2, createdAt: 0 },
  { id: 3, name: 'Cheese', serving: '30 g', calories: 80, protein: 5, carbs: 1, fats: 6, createdAt: 0 },
]
const meal: StoredMeal = {
  id: 1, name: 'Breakfast wrap', createdAt: 0,
  ingredients: [{ foodId: 1, quantity: 3 }, { foodId: 2, quantity: 1 }, { foodId: 3, quantity: 1 }],
}
const fixedValues: StoredFoodFormValues = {
  name: 'Egg', serving: '1 egg', servingMode: 'fixed', referenceGrams: '100',
  calories: '70', protein: '6', carbs: '1', fats: '5',
}
const weightValues: StoredFoodFormValues = {
  name: 'Rice', serving: '', servingMode: 'weight', referenceGrams: '100',
  calories: '200', protein: '4', carbs: '40', fats: '1',
}
const rice: StoredFood = {
  id: 4, name: 'Rice', serving: '100 g', servingMode: 'weight', referenceGrams: 100,
  calories: 200, protein: 4, carbs: 40, fats: 1, createdAt: 0,
}
const mixedFoods = [...foods, rice]
// End: Serving test fixtures.

// Start: Check fixed servings, legacy recipes, validation, and diary nutrition snapshots.
test('a base food saves trimmed names, serving descriptions, and per-serving nutrition', () => {
  assert.deepEqual(parseStoredFoodInput({
    ...fixedValues, name: ' Egg ', serving: ' 1 egg ',
  }), { name: 'Egg', serving: '1 egg', servingMode: 'fixed', calories: 70, protein: 6, carbs: 1, fats: 5 })
})

test('base foods require a name and serving description', () => {
  const values = fixedValues
  assert.throws(() => parseStoredFoodInput({ ...values, name: ' ' }))
  assert.throws(() => parseStoredFoodInput({ ...values, serving: ' ' }))
  assert.throws(() => parseStoredFoodInput({ ...values, serving: 'x'.repeat(81) }))
})

test('three eggs, a tortilla, and cheese sum all four nutrients', () => {
  assert.deepEqual(getMealNutrition(meal, foods), { calories: 390, protein: 26, carbs: 24, fats: 23 })
})

test('repeated ingredients are combined into one quantity for the base food', () => {
  const result = parseMealInput(' Wrap ', [
    { foodId: '1', quantity: '1' }, { foodId: '1', quantity: '2' }, { foodId: '2', quantity: '1' },
  ], foods)
  assert.deepEqual(result, {
    name: 'Wrap', ingredients: [
      { foodId: 1, quantity: 3, unit: 'serving' }, { foodId: 2, quantity: 1, unit: 'serving' },
    ],
  })
})

test('fractional ingredient quantities are allowed', () => {
  const result = parseMealInput('Half an egg', [{ foodId: '1', quantity: '0.5' }], foods)
  assert.deepEqual(getMealNutrition(result, foods), { calories: 35, protein: 3, carbs: 0.5, fats: 2.5 })
})

test('incomplete recipes and unavailable ingredients are rejected', () => {
  assert.throws(() => parseMealInput(' ', [{ foodId: '1', quantity: '1' }], foods))
  assert.throws(() => parseMealInput('Meal', [], foods))
  assert.throws(() => parseMealInput('Meal', [{ foodId: '', quantity: '1' }], foods))
  assert.throws(() => parseMealInput('Meal', [{ foodId: '99', quantity: '1' }], foods))
  assert.throws(() => getMealNutrition(meal, foods.slice(1)))
})

test('ingredient quantities must be positive and finite', () => {
  for (const quantity of ['0', '-1', '', 'NaN', 'Infinity', '1e309']) {
    assert.throws(() => parseMealInput('Meal', [{ foodId: '1', quantity }], foods))
  }
})

test('food and meal options with the same numeric ID resolve to different records', () => {
  const foodLog = resolveStoredSelection('food:1', '1', foods, [meal])
  const mealLog = resolveStoredSelection('meal:1', '1', foods, [meal])
  assert.equal(foodLog.calories, 70)
  assert.equal(mealLog.calories, 390)
  assert.equal(foodLog.source?.kind, 'food')
  assert.equal(mealLog.source?.kind, 'meal')
})

test('logging multiple food servings scales nutrition and retains the serving description', () => {
  const result = resolveStoredSelection('food:1', '3', foods, [meal])
  assert.deepEqual(result, {
    name: 'Egg', calories: 210, protein: 18, carbs: 3, fats: 15,
    source: { kind: 'food', id: 1, quantity: 3, serving: '1 egg', unit: 'serving' },
  })
})

test('logging half a meal scales every nutrient without rounding the stored numbers', () => {
  const result = resolveStoredSelection('meal:1', '0.5', foods, [meal])
  assert.deepEqual(getDailyTotals([result]), { calories: 195, protein: 13, carbs: 12, fats: 11.5 })
  assert.equal(result.source?.quantity, 0.5)
})

test('unavailable selections and invalid log quantities cannot create a diary entry', () => {
  for (const selection of ['food:99', 'meal:99', 'food:', 'meal:0', 'unknown:1']) {
    assert.throws(() => resolveStoredSelection(selection, '1', foods, [meal]))
  }
  for (const quantity of ['0', '-1', '', 'Infinity']) {
    assert.throws(() => resolveStoredSelection('food:1', quantity, foods, [meal]))
  }
})

test('changing a base food or recipe affects future meals while logged totals stay unchanged', () => {
  const library = foods.map((food) => ({ ...food }))
  const recipe = { ...meal, ingredients: meal.ingredients.map((ingredient) => ({ ...ingredient })) }
  const logged = resolveStoredSelection('meal:1', '1', library, [recipe])
  library[0].calories = 700
  recipe.ingredients[0].quantity = 4
  assert.equal(getMealNutrition(recipe, library).calories, 2980)
  assert.deepEqual(getDailyTotals([logged]), { calories: 390, protein: 26, carbs: 24, fats: 23 })
})

test('overflowing nutrition and invalid quantities are rejected rather than logged', () => {
  assert.throws(() => scaleNutrition({ calories: 1e308, protein: 0, carbs: 0, fats: 0 }, 3))
  for (const quantity of [0, -1, Infinity, NaN]) {
    assert.throws(() => scaleNutrition(foods[0], quantity))
  }
})
// End: Fixed serving and existing diary behavior.

// Start: Verify gram-based nutrition, mixed meals, and compatibility with previously saved data.
test('a weight-based food stores its reference grams and generates a serving label', () => {
  assert.deepEqual(parseStoredFoodInput({ ...weightValues, name: ' Rice ', referenceGrams: ' 100 ' }), {
    name: 'Rice', serving: '100 g', servingMode: 'weight', referenceGrams: 100,
    calories: 200, protein: 4, carbs: 40, fats: 1,
  })
})

test('reference weights must be positive and finite', () => {
  for (const referenceGrams of ['', ' ', '0', '-1', 'NaN', 'Infinity', '1e309']) {
    assert.throws(() => parseStoredFoodInput({ ...weightValues, referenceGrams }))
  }
})

test('only fields for the chosen serving mode are used when saving', () => {
  const fixed = parseStoredFoodInput({ ...fixedValues, referenceGrams: '' })
  assert.equal(fixed.servingMode, 'fixed')
  assert.equal(fixed.referenceGrams, undefined)
  const weighted = parseStoredFoodInput({ ...weightValues, serving: '' })
  assert.equal(weighted.referenceGrams, 100)
})

test('124 grams of a food saved per 100 grams scales all four nutrients by 1.24', () => {
  const logged = resolveStoredSelection('food:4', '124', mixedFoods, [meal])
  assert.deepEqual(getDailyTotals([logged]), { calories: 248, protein: 4.96, carbs: 49.6, fats: 1.24 })
  assert.deepEqual(logged.source, { kind: 'food', id: 4, quantity: 124, serving: '100 g', unit: 'g' })
})

test('reference weights other than 100 grams and fractional eaten weights are supported', () => {
  const smallServing = { ...rice, serving: '25 g', referenceGrams: 25 }
  assert.deepEqual(getFoodNutrition(smallServing, 12.5), { calories: 100, protein: 2, carbs: 20, fats: 0.5 })
  const logged = resolveStoredSelection('food:4', '124.5', mixedFoods, [])
  assert.ok(Math.abs(logged.calories - 249) < 1e-10)
  assert.ok(Math.abs(logged.protein - 4.98) < 1e-10)
  assert.ok(Math.abs(logged.carbs - 49.8) < 1e-10)
  assert.ok(Math.abs(logged.fats - 1.245) < 1e-10)
  assert.equal(logged.source?.quantity, 124.5)
})

test('mixed meals keep serving counts for eggs and gram amounts for rice', () => {
  const recipe = parseMealInput('Eggs and rice', [
    { foodId: '1', quantity: '2' }, { foodId: '4', quantity: '124' },
  ], mixedFoods)
  assert.deepEqual(recipe.ingredients, [
    { foodId: 1, quantity: 2, unit: 'serving' }, { foodId: 4, quantity: 124, unit: 'g' },
  ])
  assert.deepEqual(getMealNutrition(recipe, mixedFoods), { calories: 388, protein: 16.96, carbs: 51.6, fats: 11.24 })
  const logged = resolveStoredSelection('meal:2', '0.5', mixedFoods, [{ ...recipe, id: 2, createdAt: 0 }])
  assert.deepEqual(getDailyTotals([logged]), { calories: 194, protein: 8.48, carbs: 25.8, fats: 5.62 })
})

test('repeated weight-based ingredients combine grams without treating them as servings', () => {
  const recipe = parseMealInput('Rice', [
    { foodId: '4', quantity: '80' }, { foodId: '4', quantity: '44' },
  ], mixedFoods)
  assert.deepEqual(recipe.ingredients, [{ foodId: 4, quantity: 124, unit: 'g' }])
  assert.equal(getMealNutrition(recipe, mixedFoods).calories, 248)
})

test('old foods and recipe quantities keep their original serving behavior', () => {
  assert.equal(getFoodQuantityUnit(foods[2]), 'serving')
  assert.equal(resolveStoredSelection('food:3', '2', foods, []).calories, 160)
  assert.deepEqual(getMealNutrition(meal, foods), { calories: 390, protein: 26, carbs: 24, fats: 23 })
  const legacyRecipe = { ingredients: [{ foodId: 4, quantity: 2 }] }
  assert.equal(getMealNutrition(legacyRecipe, mixedFoods).calories, 400)
})

test('invalid eaten weights and foods missing a reference cannot be logged in grams', () => {
  for (const quantity of ['', ' ', '0', '-1', 'NaN', 'Infinity', '1e309']) {
    assert.throws(() => resolveStoredSelection('food:4', quantity, mixedFoods, []))
    assert.throws(() => parseMealInput('Rice', [{ foodId: '4', quantity }], mixedFoods))
  }
  for (const referenceGrams of [undefined, 0, -1, NaN, Infinity]) {
    assert.throws(() => getFoodNutrition({ ...rice, referenceGrams }, 124))
  }
  assert.throws(() => getFoodNutrition(foods[0], 124, 'g'))
  assert.throws(() => getFoodNutrition({ ...rice, referenceGrams: 1e-308 }, 1e308))
})

test('logged grams and nutrition remain a snapshot when reference weights change', () => {
  const library = mixedFoods.map((food) => ({ ...food }))
  const logged = resolveStoredSelection('food:4', '124', library, [])
  library[3].referenceGrams = 50
  library[3].serving = '50 g'
  assert.equal(resolveStoredSelection('food:4', '124', library, []).calories, 496)
  assert.equal(logged.calories, 248)
  assert.deepEqual(logged.source, { kind: 'food', id: 4, quantity: 124, serving: '100 g', unit: 'g' })
})
// End: Weight-based food tests.
