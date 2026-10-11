import { nutritionFields } from '../lib/nutrition'
import type { FoodFormValues, NutritionTotals } from '../types/food'

type NutritionFieldsProps = {
  idPrefix: string
  values: FoodFormValues | NutritionTotals
  readOnly?: boolean
  onChange?: (key: keyof NutritionTotals, value: string) => void
}

function NutritionFields({ idPrefix, values, readOnly = false, onChange }: NutritionFieldsProps) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {/* Start: Shared macro inputs; the parent controls their values and editability. */}
      {nutritionFields.map((field) => (
        <div key={field.key}>
          <label htmlFor={`${idPrefix}-${field.key}`} className="text-sm font-medium text-slate-700">
            {field.label} <span className="font-normal text-slate-500">({field.unit})</span>
          </label>
          <input
            id={`${idPrefix}-${field.key}`}
            name={field.key}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            required
            readOnly={readOnly}
            value={readOnly ? Number(Number(values[field.key]).toFixed(3)) : values[field.key]}
            onChange={onChange ? (event) => onChange(field.key, event.target.value) : undefined}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600 read-only:bg-slate-100 disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>
      ))}
      {/* End: Nutrition input grid. */}
    </div>
  )
}

export default NutritionFields
