import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { getFoodQuantityUnit, getMealNutrition, parseMealInput } from '../lib/storedFoods'
import type { MealIngredientFormValues, NutritionTotals, StoredFood, StoredMealInput } from '../types/food'
import NutritionDetails from './NutritionDetails'

type IngredientRow = MealIngredientFormValues & { rowId: number }
type MealFormProps = {
  foods: StoredFood[]
  onSave: (meal: StoredMealInput) => Promise<void>
  onClose: () => void
}

const inputClassName =
  'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 disabled:bg-slate-100'

function MealForm({ foods, onSave, onClose }: MealFormProps) {
  // Start: Track the meal draft and use a ref to assign stable IDs to ingredient rows.
  const [name, setName] = useState('')
  const [rows, setRows] = useState<IngredientRow[]>([{ rowId: 0, foodId: '', quantity: '1' }])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nextRowId = useRef(1)
  // End: Form state and row ID ref.

  // Start: Recalculate the whole meal's nutrition when the ingredient choices change.
  let preview: NutritionTotals | null = null
  try {
    preview = getMealNutrition(parseMealInput(name.trim() || 'Meal', rows, foods), foods)
  } catch {
    // Incomplete ingredient rows have no preview until a food and quantity are chosen.
  }
  // End: Nutrition preview.

  // Start: Update ingredient amounts, reset units when changing foods, or append a new row.
  function updateRow(rowId: number, key: keyof MealIngredientFormValues, value: string) {
    setRows((current) => current.map((row) => row.rowId === rowId ? { ...row, [key]: value } : row))
  }

  function selectRowFood(rowId: number, foodId: string) {
    const food = foods.find((item) => String(item.id) === foodId)
    const quantity = food?.servingMode === 'weight' ? String(food.referenceGrams ?? '') : '1'
    setRows((current) => current.map((row) => row.rowId === rowId ? { ...row, foodId, quantity } : row))
  }

  function addIngredient() {
    const row = { rowId: nextRowId.current, foodId: '', quantity: '1' }
    nextRowId.current += 1
    setRows((current) => [...current, row])
  }
  // End: Ingredient row handlers.

  // Start: Validate the recipe, save it, and retain the draft if a save fails.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return
    let meal: StoredMealInput
    try {
      meal = parseMealInput(name, rows, foods)
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : 'Check your ingredients.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await onSave(meal)
      onClose()
    } catch {
      setError('Could not save this meal. Your ingredients are still here; please try again.')
    } finally {
      setIsSaving(false)
    }
  }
  // End: Submit handler and error handling.

  return (
    <form id="stored-meal-form" aria-label="Save a meal" onSubmit={handleSubmit}
      className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <fieldset disabled={isSaving}>
        {/* Start: Meal name input. */}
        <label htmlFor="meal-name" className="text-sm font-medium text-slate-700">Meal name</label>
        <input id="meal-name" type="text" autoFocus required maxLength={120}
          placeholder="e.g. Breakfast wrap" value={name}
          onChange={(event) => setName(event.target.value)} className={inputClassName} />
        {/* End: Meal name input. */}

        {/* Start: Ingredient dropdowns, serving/gram inputs, and controls in a responsive grid. */}
        <div className="mt-4 space-y-4">
          {rows.map((row, index) => {
            const food = foods.find((item) => String(item.id) === row.foodId)
            const usesGrams = food !== undefined && getFoodQuantityUnit(food) === 'g'
            return (
              <div key={row.rowId} className="grid grid-cols-[minmax(0,1fr)_5rem] gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_auto]">
                <div>
                  <label htmlFor={`meal-food-${row.rowId}`} className="text-sm font-medium text-slate-700">
                    Base food <span className="sr-only">{index + 1}</span>
                  </label>
                  <select id={`meal-food-${row.rowId}`} required value={row.foodId}
                    onChange={(event) => selectRowFood(row.rowId, event.target.value)} className={inputClassName}>
                    <option value="">Select a base food</option>
                    {foods.map((food) => (
                      <option key={food.id} value={food.id}>
                        {food.name} ({food.servingMode === 'weight' ? 'per ' : ''}{food.serving})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`meal-quantity-${row.rowId}`} className="text-sm font-medium text-slate-700">
                    {usesGrams ? 'Grams (g)' : 'Servings'} <span className="sr-only">for ingredient {index + 1}</span>
                  </label>
                  <input id={`meal-quantity-${row.rowId}`} type="number" inputMode="decimal" min="0"
                    step="any" required value={row.quantity}
                    onChange={(event) => updateRow(row.rowId, 'quantity', event.target.value)} className={inputClassName} />
                </div>
                <button type="button" disabled={rows.length === 1} aria-label={`Remove ingredient ${index + 1}`}
                  onClick={() => setRows((current) => current.filter((item) => item.rowId !== row.rowId))}
                  className="col-span-2 cursor-pointer self-end justify-self-end rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-default disabled:opacity-40 sm:col-span-1">
                  Remove
                </button>
              </div>
            )
          })}
        </div>

        <button type="button" onClick={addIngredient}
          className="mt-4 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-wait disabled:opacity-60">
          + Add ingredient
        </button>
        {/* End: Ingredient rows and add button. */}

        {/* Start: Whole meal nutrition preview. */}
        <div className="mt-5 border-t border-slate-200 pt-4">
          <h4 className="text-sm font-semibold">Nutrition for the whole meal</h4>
          {preview ? <NutritionDetails nutrition={preview} /> : (
            <p className="mt-2 text-sm text-slate-500">Select foods and positive quantities to preview the totals.</p>
          )}
        </div>
        {/* End: Nutrition preview. */}

        {/* Start: Validation feedback and save/cancel buttons. */}
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="submit" className="cursor-pointer rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-wait disabled:opacity-60">
            {isSaving ? 'Saving...' : 'Save meal'}
          </button>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-wait disabled:opacity-60">
            Cancel
          </button>
        </div>
        {/* End: Feedback and actions. */}
      </fieldset>
    </form>
  )
}

export default MealForm
