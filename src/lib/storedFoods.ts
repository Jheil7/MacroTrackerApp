import { formatQuantity, getDailyTotals, nutritionFields, parseFoodInput } from './nutrition.ts'
import type {
  FoodLogInput,
  FoodQuantityUnit,
  MealIngredient,
  MealIngredientFormValues,
  NutritionTotals,
  StoredFood,
  StoredFoodFormValues,
  StoredFoodInput,
  StoredMeal,
  StoredMealInput,
} from '../types/food'

// Start: Validate names and nutrition for a fixed serving or a positive reference weight.
function parseName(value: string, label: string): string {
  const name = value.trim()
  if (!name || name.length > 120) {
    throw new Error(`${label} must be between 1 and 120 characters.`)
  }
  return name
}

export function parseStoredFoodInput(values: StoredFoodFormValues): StoredFoodInput {
  const name = parseName(values.name, 'Food names')
  const nutrition = parseFoodInput(values)

  if (values.servingMode === 'weight') {
    const referenceGrams = Number(values.referenceGrams)
    if (!values.referenceGrams.trim() || !Number.isFinite(referenceGrams) || referenceGrams <= 0) {
      throw new Error('Reference weight must be greater than zero grams.')
    }
    return {
      ...nutrition, name, servingMode: 'weight', referenceGrams,
      serving: `${formatQuantity(referenceGrams)} g`,
    }
  }

  if (values.servingMode !== 'fixed') throw new Error('Choose a serving type.')
  const serving = values.serving.trim()
  if (!serving || serving.length > 80) {
    throw new Error('Describe one serving using between 1 and 80 characters.')
  }
  return { ...nutrition, name, serving, servingMode: 'fixed' }
}
// End: Stored food validation.

// Start: Scale every macro by a positive quantity and reject invalid or overflowing totals.
export function scaleNutrition(nutrition: NutritionTotals, quantity: number): NutritionTotals {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Quantity must be greater than zero.')
  }

  const result: NutritionTotals = { calories: 0, protein: 0, carbs: 0, fats: 0 }
  for (const field of nutritionFields) {
    const value = nutrition[field.key] * quantity
    if (!Number.isFinite(value) || value < 0) {
      throw new Error('Nutrition values must be finite and non-negative.')
    }
    result[field.key] = value
  }
  return result
}
// End: Nutrition scaling.

// Start: Choose serving or gram units and convert eaten grams to a reference-serving multiplier.
export function getFoodQuantityUnit(food: StoredFood): FoodQuantityUnit {
  return food.servingMode === 'weight' ? 'g' : 'serving'
}

export function getFoodNutrition(
  food: StoredFood,
  quantity: number,
  unit: FoodQuantityUnit = getFoodQuantityUnit(food),
): NutritionTotals {
  if (unit === 'serving') return scaleNutrition(food, quantity)

  const referenceGrams = food.referenceGrams
  if (unit !== 'g' || food.servingMode !== 'weight'
    || referenceGrams === undefined || !Number.isFinite(referenceGrams) || referenceGrams <= 0) {
    throw new Error('This food needs a valid reference weight before it can be logged in grams.')
  }
  return scaleNutrition(food, quantity / referenceGrams)
}
// End: Food quantity units and weight scaling.

// Start: Validate ingredient rows and combine repeated base foods into a single recipe entry.
export function parseMealInput(
  name: string,
  rows: readonly MealIngredientFormValues[],
  foods: readonly StoredFood[],
): StoredMealInput {
  const mealName = parseName(name, 'Meal names')
  if (rows.length === 0) throw new Error('Add at least one ingredient.')

  const ingredientsByFood = new Map<number, MealIngredient>()
  for (const row of rows) {
    const foodId = Number(row.foodId)
    const food = foods.find((item) => item.id === foodId)
    const quantity = Number(row.quantity)
    if (!Number.isSafeInteger(foodId) || !food) {
      throw new Error('Choose a base food for every ingredient.')
    }
    if (!row.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Each ingredient quantity must be greater than zero.')
    }
    const combined = (ingredientsByFood.get(foodId)?.quantity ?? 0) + quantity
    if (!Number.isFinite(combined)) throw new Error('Ingredient quantity is too large.')
    ingredientsByFood.set(foodId, { foodId, quantity: combined, unit: getFoodQuantityUnit(food) })
  }

  const ingredients = Array.from(ingredientsByFood.values())
  const meal = { name: mealName, ingredients }
  getMealNutrition(meal, foods)
  return meal
}
// End: Meal recipe validation.

// Start: Look up each ingredient's current nutrition, scale it, and sum the whole meal.
export function getMealNutrition(
  meal: Pick<StoredMealInput, 'ingredients'>,
  foods: readonly StoredFood[],
): NutritionTotals {
  if (meal.ingredients.length === 0) throw new Error('Add at least one ingredient.')
  const foodById = new Map(foods.map((food) => [food.id, food]))
  const ingredients = meal.ingredients.map((ingredient) => {
    const food = foodById.get(ingredient.foodId)
    if (!food) throw new Error('A base food used by this meal is no longer available.')
    return getFoodNutrition(food, ingredient.quantity, ingredient.unit ?? 'serving')
  })
  return scaleNutrition(getDailyTotals(ingredients), 1)
}
// End: Whole meal nutrition calculation.

// Start: Resolve a food or meal dropdown value into a scaled nutrition snapshot for the diary.
export function resolveStoredSelection(
  selection: string,
  quantityValue: string,
  foods: readonly StoredFood[],
  meals: readonly StoredMeal[],
): FoodLogInput {
  const match = /^(food|meal):([1-9]\d*)$/.exec(selection)
  if (!match) throw new Error('Choose a stored food or meal.')

  const quantity = Number(quantityValue)
  if (!quantityValue.trim() || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Quantity must be greater than zero.')
  }

  const id = Number(match[2])
  if (match[1] === 'food') {
    const food = foods.find((item) => item.id === id)
    if (!food) throw new Error('That stored food is no longer available.')
    const unit = getFoodQuantityUnit(food)
    return {
      name: food.name,
      ...getFoodNutrition(food, quantity, unit),
      source: { kind: 'food', id, quantity, serving: food.serving, unit },
    }
  }

  const meal = meals.find((item) => item.id === id)
  if (!meal) throw new Error('That stored meal is no longer available.')
  return {
    name: meal.name,
    ...scaleNutrition(getMealNutrition(meal, foods), quantity),
    source: { kind: 'meal', id, quantity, serving: '1 meal', unit: 'meal' },
  }
}
// End: Stored selection resolution.
