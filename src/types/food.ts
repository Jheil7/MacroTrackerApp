// Start: Define numeric nutrition, optional source details, and saved daily diary entries.
export type NutritionTotals = {
  calories: number
  protein: number
  carbs: number
  fats: number
}

export type FoodInput = NutritionTotals & {
  name: string
}

export type FoodQuantityUnit = 'serving' | 'g'

export type FoodLogInput = FoodInput & {
  source?: {
    kind: 'food' | 'meal'
    id: number
    quantity: number
    serving: string
    unit?: FoodQuantityUnit | 'meal'
  }
}

export type FoodEntry = FoodLogInput & {
  id: number
  date: string
  createdAt: number
}
// End: Nutrition and diary types.

// Start: Keep editable input values as strings, then validate them before saving numeric data.
export type FoodFormValues = {
  name: string
  calories: string
  protein: string
  carbs: string
  fats: string
}
// End: Form value type.

// Start: Describe fixed servings or nutrition for a reference weight in grams.
export type ServingMode = 'fixed' | 'weight'

export type StoredFoodInput = FoodInput & {
  serving: string
  // Optional metadata lets previously saved foods continue to use fixed servings.
  servingMode?: ServingMode
  referenceGrams?: number
}

export type StoredFood = StoredFoodInput & {
  id: number
  createdAt: number
}

export type StoredFoodFormValues = FoodFormValues & {
  serving: string
  servingMode: ServingMode
  referenceGrams: string
}
// End: Stored base food types.

// Start: Represent meals as base food IDs and serving/gram amounts, with editable row values.
export type MealIngredient = {
  foodId: number
  quantity: number
  // Older recipes have no unit and retain their original serving quantities.
  unit?: FoodQuantityUnit
}

export type MealIngredientFormValues = {
  foodId: string
  quantity: string
}

export type StoredMealInput = {
  name: string
  ingredients: MealIngredient[]
}

export type StoredMeal = StoredMealInput & {
  id: number
  createdAt: number
}
// End: Meal recipe types.
