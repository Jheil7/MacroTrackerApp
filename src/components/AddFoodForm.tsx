import { useState } from 'react'
import type { FormEvent } from 'react'
import { useStoredLibrary } from '../hooks/useStoredLibrary'
import { parseFoodInput } from '../lib/nutrition'
import { getFoodQuantityUnit, resolveStoredSelection } from '../lib/storedFoods'
import type { FoodFormValues, FoodLogInput } from '../types/food'
import NutritionFields from './NutritionFields'

// Start: Receive persistence callbacks and pause the form while another diary mutation runs.
type AddFoodFormProps = {
  disabled: boolean
  onAdd: (food: FoodLogInput) => Promise<void>
  onClose: () => void
}
// End: Add food form props.

const emptyValues: FoodFormValues = {
  name: '',
  calories: '0',
  protein: '0',
  carbs: '0',
  fats: '0',
}

const inputClassName =
  'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 disabled:bg-slate-100 disabled:text-slate-500'

function AddFoodForm({ onAdd, onClose, disabled }: AddFoodFormProps) {
  // Start: Load saved items and track the manual draft, selection, quantity, and save status.
  const library = useStoredLibrary()
  const [values, setValues] = useState(emptyValues)
  const [selection, setSelection] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // End: Library and form state.

  // Start: Check the saved selection and calculate its nutrition for the chosen quantity.
  const selectedBaseFood = library.foods.find((food) => selection === `food:${food.id}`)
  const isWeightBased = selectedBaseFood !== undefined && getFoodQuantityUnit(selectedBaseFood) === 'g'
  const selectionAvailable = !selection
    || library.foods.some((food) => selection === `food:${food.id}`)
    || library.meals.some((meal) => selection === `meal:${meal.id}`)

  let selectedFood: FoodLogInput | null = null
  let selectionError: string | null = null
  if (selection) {
    try {
      selectedFood = resolveStoredSelection(selection, quantity, library.foods, library.meals)
    } catch (cause) {
      selectionError = cause instanceof Error ? cause.message : 'Check your stored food selection.'
    }
  }
  // End: Selection validation and nutrition preview.

  // Start: Reset quantity to one serving, one meal, or the food's reference grams when switching items.
  function changeSelection(nextSelection: string) {
    const food = library.foods.find((item) => nextSelection === `food:${item.id}`)
    setSelection(nextSelection)
    setQuantity(food?.servingMode === 'weight' ? String(food.referenceGrams ?? '') : '1')
    setError(null)
  }
  // End: Stored item selection handler.

  // Start: Validate and log to the selected day, avoiding competing mutations and retaining failed drafts.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving || disabled) return

    let food: FoodLogInput

    try {
      food = selection
        ? resolveStoredSelection(selection, quantity, library.foods, library.meals)
        : parseFoodInput(values)
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : 'Check your food values.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onAdd(food)
      onClose()
    } catch {
      setError('Could not add this food. Your values are still here; please try again.')
    } finally {
      setIsSaving(false)
    }
  }
  // End: Submit handler and error handling.

  return (
    <form
      id="add-food-form"
      aria-label="Add food"
      onSubmit={handleSubmit}
      className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
    >
      <fieldset disabled={isSaving || disabled}>
        {/* Start: Food name and grouped dropdown for manual entries, base foods, and meals. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="food-name" className="text-sm font-medium text-slate-700">
              Food name {!selection && <span className="font-normal text-slate-500">(optional)</span>}
            </label>
            <input
              id="food-name"
              name="name"
              type="text"
              autoFocus
              maxLength={120}
              placeholder="e.g. Greek yogurt"
              readOnly={Boolean(selection)}
              value={selection ? selectedFood?.name ?? '' : values.name}
              onChange={(event) => {
                const name = event.target.value
                setValues((current) => ({ ...current, name }))
              }}
              className={inputClassName}
            />
          </div>
          <div>
            <label htmlFor="daily-stored-choice" className="text-sm font-medium text-slate-700">
              Manual entry, base food, or meal
            </label>
            <select
              id="daily-stored-choice"
              value={selection}
              onChange={(event) => changeSelection(event.target.value)}
              aria-describedby="stored-food-help"
              className={inputClassName}
            >
              <option value="">Manual entry</option>
              {!selectionAvailable && <option value={selection} disabled>Selected item is unavailable</option>}
              {library.foods.length > 0 && (
                <optgroup label="Base foods">
                  {library.foods.map((food) => (
                    <option key={food.id} value={`food:${food.id}`}>
                      {food.name} ({food.servingMode === 'weight' ? 'per ' : ''}{food.serving})
                    </option>
                  ))}
                </optgroup>
              )}
              {library.meals.length > 0 && (
                <optgroup label="Meals">
                  {library.meals.map((meal) => (
                    <option key={meal.id} value={`meal:${meal.id}`}>{meal.name} (1 meal)</option>
                  ))}
                </optgroup>
              )}
            </select>
            <p id="stored-food-help" className="mt-1.5 text-xs text-slate-500">
              {library.isLoading ? 'Loading saved foods and meals...' : library.error
                ? 'Saved items could not be loaded. Manual entry is still available.'
                : 'Save base foods and meals in the Stored Foods tab to reuse them here.'}
            </p>
            {library.error && <button type="button" onClick={library.retry} className="mt-2 cursor-pointer rounded text-xs font-medium text-emerald-800 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">Retry saved foods</button>}
          </div>
        </div>
        {/* End: Name and stored item dropdown. */}

        {/* Start: Enter grams for a weight-based food, or a serving/meal count for other selections. */}
        {selection && (
          <div className="mt-4 max-w-xs">
            <label htmlFor="daily-stored-quantity" className="text-sm font-medium text-slate-700">
              {isWeightBased ? 'Grams eaten (g)' : selection.startsWith('meal:') ? 'Meal quantity' : 'Serving quantity'}
            </label>
            <input id="daily-stored-quantity" type="number" inputMode="decimal" min="0" step="any"
              required aria-describedby="daily-quantity-help" value={quantity}
              onChange={(event) => setQuantity(event.target.value)} className={inputClassName} />
            <p id="daily-quantity-help" className="mt-1.5 text-xs text-slate-500">
              {isWeightBased
                ? `Saved nutrition is per ${selectedBaseFood.serving}. The totals below use the grams you enter.`
                : selectedFood?.source
                  ? `One unit: ${selectedFood.source.serving}. The totals below include your quantity.`
                  : 'Choose an available item and enter a positive quantity.'}
            </p>
          </div>
        )}
        {/* End: Stored item quantity. */}

        {/* Start: Editable manual macros or calculated, read-only nutrition for a saved item. */}
        <NutritionFields
          idPrefix="daily-food"
          values={selection ? selectedFood ?? emptyValues : values}
          readOnly={Boolean(selection)}
          onChange={selection ? undefined : (key, value) => setValues((current) => ({ ...current, [key]: value }))}
        />
        {/* End: Nutrition fields. */}

        {/* Start: Validation feedback and add/cancel buttons. */}
        {(error || selectionError) && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error || selectionError}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={Boolean(selectionError)}
            className="cursor-pointer rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-wait disabled:opacity-60"
          >
            {isSaving ? 'Adding...' : 'Add food'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-wait disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
        {/* End: Feedback and actions. */}
      </fieldset>
    </form>
  )
}

export default AddFoodForm
