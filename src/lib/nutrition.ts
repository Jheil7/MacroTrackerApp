import type { FoodFormValues, FoodInput, NutritionTotals } from '../types/food'

// Start: Share macro labels, units, and display order across forms and dashboards.
export const nutritionFields = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fats', label: 'Fats', unit: 'g' },
] as const
// End: Nutrition field definitions.

// Start: Convert form strings to valid non-negative numbers and normalize the food name.
export function parseFoodInput(values: FoodFormValues): FoodInput {
  const nutrition: NutritionTotals = { calories: 0, protein: 0, carbs: 0, fats: 0 }

  for (const field of nutritionFields) {
    const rawValue = values[field.key].trim()
    const value = Number(rawValue)

    if (rawValue === '' || !Number.isFinite(value) || value < 0) {
      throw new Error(`${field.label} must be zero or a positive number.`)
    }

    nutrition[field.key] = value
  }

  const name = values.name.trim() || 'Food'

  if (name.length > 120) {
    throw new Error('Food names must be 120 characters or fewer.')
  }

  return { name, ...nutrition }
}
// End: Manual food validation.

// Start: Sum each macro without changing the original food entries.
export function getDailyTotals(foods: readonly NutritionTotals[]): NutritionTotals {
  return foods.reduce(
    (totals, food) => ({
      calories: totals.calories + food.calories,
      protein: totals.protein + food.protein,
      carbs: totals.carbs + food.carbs,
      fats: totals.fats + food.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  )
}
// End: Nutrition totals calculation.

// Start: Format displayed nutrition and quantities using the browser's number locale.
export function formatNutrition(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export function formatQuantity(value: number): string {
  return value.toLocaleString(undefined, { maximumSignificantDigits: 12 })
}
// End: Display formatting helpers.
