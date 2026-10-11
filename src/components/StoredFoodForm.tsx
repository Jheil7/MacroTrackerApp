import { useState } from 'react'
import type { FormEvent } from 'react'
import { parseStoredFoodInput } from '../lib/storedFoods'
import type { ServingMode, StoredFoodFormValues, StoredFoodInput } from '../types/food'
import NutritionFields from './NutritionFields'

type StoredFoodFormProps = {
  onSave: (food: StoredFoodInput) => Promise<void>
  onClose: () => void
}

const emptyValues: StoredFoodFormValues = {
  name: '', serving: '1 serving', calories: '0', protein: '0', carbs: '0', fats: '0',
  servingMode: 'fixed', referenceGrams: '100',
}

const inputClassName =
  'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 disabled:bg-slate-100'

function StoredFoodForm({ onSave, onClose }: StoredFoodFormProps) {
  // Start: Track the input values, saving status, and error message.
  const [values, setValues] = useState(emptyValues)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // End: Form state.

  // Start: Update form values and save the food with validation and error handling.
  function updateField(key: Exclude<keyof StoredFoodFormValues, 'servingMode'>, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function changeServingMode(servingMode: ServingMode) {
    setValues((current) => ({ ...current, servingMode }))
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return
    let food: StoredFoodInput
    try {
      food = parseStoredFoodInput(values)
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : 'Check your food values.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await onSave(food)
      onClose()
    } catch {
      setError('Could not save this food. Your values are still here; please try again.')
    } finally {
      setIsSaving(false)
    }
  }
  // End: Update and save handlers.

  return (
    <form id="stored-food-form" aria-label="Save a base food" onSubmit={handleSubmit}
      className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <fieldset disabled={isSaving}>
        {/* Start: Choose a fixed serving or nutrition measured against a reference weight. */}
        <fieldset aria-describedby="base-food-serving-help" className="mb-4">
          <legend className="text-sm font-medium text-slate-700">Serving type</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {([
              { value: 'fixed', label: 'Fixed serving' },
              { value: 'weight', label: 'By weight (grams)' },
            ] as const).map((mode) => (
              <label key={mode.value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${values.servingMode === mode.value ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-slate-300 bg-white text-slate-700'}`}>
                <input type="radio" name="base-food-serving-mode" value={mode.value}
                  checked={values.servingMode === mode.value}
                  onChange={() => changeServingMode(mode.value)} className="accent-emerald-700" />
                {mode.label}
              </label>
            ))}
          </div>
          <p id="base-food-serving-help" className="mt-2 text-xs text-slate-500">
            {values.servingMode === 'weight'
              ? 'Save nutrition per a reference weight, then log the actual grams you eat.'
              : 'Save nutrition for a repeatable unit, such as 1 egg or 1 tortilla.'}
          </p>
        </fieldset>
        {/* End: Serving type selector. */}

        {/* Start: Food name alongside a serving description or reference weight. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="base-food-name" className="text-sm font-medium text-slate-700">Food name</label>
            <input id="base-food-name" type="text" autoFocus required maxLength={120}
              placeholder="e.g. Egg" value={values.name}
              onChange={(event) => updateField('name', event.target.value)} className={inputClassName} />
          </div>
          <div>
            {values.servingMode === 'weight' ? (
              <>
                <label htmlFor="base-food-reference-grams" className="text-sm font-medium text-slate-700">Nutrition per (grams)</label>
                <input id="base-food-reference-grams" type="number" inputMode="decimal" min="0" step="any" required
                  placeholder="e.g. 100" value={values.referenceGrams}
                  onChange={(event) => updateField('referenceGrams', event.target.value)} className={inputClassName} />
              </>
            ) : (
              <>
                <label htmlFor="base-food-serving" className="text-sm font-medium text-slate-700">One serving</label>
                <input id="base-food-serving" type="text" required maxLength={80}
                  placeholder="e.g. 1 egg" value={values.serving}
                  onChange={(event) => updateField('serving', event.target.value)} className={inputClassName} />
              </>
            )}
          </div>
        </div>
        {/* End: Name and serving fields. */}

        {/* Start: Nutrition inputs for the fixed serving or reference weight. */}
        <p className="mt-3 text-xs text-slate-500">
          {values.servingMode === 'weight'
            ? values.referenceGrams
              ? `Enter the nutrition per ${values.referenceGrams} g of this food.`
              : 'Enter the nutrition for your reference weight in grams.'
            : 'Enter the nutrition for one serving of this food.'}
        </p>
        <NutritionFields idPrefix="base-food" values={values} onChange={updateField} />
        {/* End: Nutrition inputs. */}

        {/* Start: Save feedback and form action buttons. */}
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="submit" className="cursor-pointer rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-wait disabled:opacity-60">
            {isSaving ? 'Saving...' : 'Save food'}
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

export default StoredFoodForm
