import { formatNutrition, nutritionFields } from '../lib/nutrition'
import type { NutritionTotals } from '../types/food'

// Start: Support inline form previews and aligned nutrition columns for stored food rows.
type NutritionDetailsProps = {
  nutrition: NutritionTotals
  layout?: 'inline' | 'columns'
}
// End: Nutrition detail props.

function NutritionDetails({ nutrition, layout = 'inline' }: NutritionDetailsProps) {
  const hasColumns = layout === 'columns'

  return (
    <dl className={hasColumns
      ? 'grid min-w-0 grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4'
      : 'mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600'}>
      {/* Start: Show labels above values in columns, or beside values in the default inline layout. */}
      {nutritionFields.map((field) => (
        <div key={field.key} className={hasColumns ? 'min-w-0' : 'flex gap-1'}>
          <dt className={hasColumns ? 'text-xs text-slate-500' : undefined}>
            {field.label}{hasColumns ? '' : ':'}
          </dt>
          <dd className={hasColumns ? 'mt-0.5 text-sm font-medium break-words text-slate-700 tabular-nums' : undefined}>
            {formatNutrition(nutrition[field.key])}{' '}
            <span className={hasColumns ? 'text-xs font-normal text-slate-500' : undefined}>{field.unit}</span>
          </dd>
        </div>
      ))}
      {/* End: Nutrition details. */}
    </dl>
  )
}

export default NutritionDetails
