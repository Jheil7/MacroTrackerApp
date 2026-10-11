import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { formatCalendarDay } from '../lib/dates'
import { formatNutrition, nutritionFields } from '../lib/nutrition'
import { nutritionStyles } from '../lib/nutritionStyles'
import { getWeekDates, getWeeklySummary } from '../lib/weekly'
import type { FoodEntry } from '../types/food'
import SectionHeader from './SectionHeader'
import WeeklyBarChart from './WeeklyBarChart'

// Start: Describe query results and the series shown in the calorie and macro charts.
type WeeklyDashboardProps = { selectedDate: string }

type WeeklyFoodsResult = {
  weekStart: string
  foods: FoodEntry[]
  error: string | null
}

const calorieSeries = [{ key: 'calories', label: 'Calories', color: '#2563eb' }] as const
const macroSeries = [
  { key: 'protein', label: 'Protein', color: '#059669' },
  { key: 'carbs', label: 'Carbs', color: '#d97706' },
  { key: 'fats', label: 'Fats', color: '#7c3aed' },
] as const
// End: Weekly data and chart series definitions.

function WeeklyDashboard({ selectedDate }: WeeklyDashboardProps) {
  // Start: Find the week containing the shared selected date and track query retries.
  const [queryAttempt, setQueryAttempt] = useState(0)
  const dates = getWeekDates(selectedDate)
  const weekStart = dates[0]
  const weekEnd = dates[6]
  // End: Weekly query state and date range.

  // Start: Subscribe to the selected week so additions, removals, and date moves refresh the charts.
  const result = useLiveQuery(async (): Promise<WeeklyFoodsResult> => {
    try {
      const foods = await db.foodEntries.where('date').between(weekStart, weekEnd, true, true).toArray()
      return { weekStart, foods, error: null }
    } catch {
      return { weekStart, foods: [], error: 'Could not load foods for the selected week.' }
    }
  }, [weekStart, weekEnd, queryAttempt])
  // End: Live weekly diary query.

  // Start: Show loading and retry feedback before displaying the weekly summary.
  if (!result || result.weekStart !== weekStart) {
    return <p role="status" className="mt-5 text-sm text-slate-500">Loading the selected week's totals...</p>
  }
  if (result.error) {
    return (
      <div className="mt-5">
        <p role="alert" className="text-sm text-red-700">{result.error}</p>
        <button type="button" onClick={() => setQueryAttempt((current) => current + 1)}
          className="mt-3 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
          Try again
        </button>
      </div>
    )
  }
  // End: Loading and error views.

  // Start: Derive totals and averages for the selected week, with readable local date labels.
  const { days, loggedDayCount, averages } = getWeeklySummary(result.foods, selectedDate)
  const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' } as const
  const weekLabel = `${formatCalendarDay(weekStart, dateOptions)} - ${formatCalendarDay(weekEnd, dateOptions)}`
  // End: Weekly summary values and labels.

  return (
    <div className="mt-5 space-y-8">
      {/* Start: Averaging guidance and the selected week's empty state. */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="mt-1 text-xs text-blue-800">
          Monday-Sunday. Averages include only days with entries ({loggedDayCount} logged {loggedDayCount === 1 ? 'day' : 'days'}).
        </p>
        {result.foods.length === 0 && (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No foods logged for this week yet. Choose a day in Daily to add food.</p>
        )}
      </div>
      {/* End: Week context and empty state. */}

      {/* Start: Blue calorie header, daily average, and matching blue daily bars. */}
      <section aria-labelledby="weekly-calories-heading">
        <SectionHeader id="weekly-calories-heading" title="Calories by day">
          <div>
            <p className="text-xs text-blue-800">Average calories per day</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-blue-700">
              {formatNutrition(averages.calories)} <span className="text-sm font-normal text-blue-800">kcal</span>
            </p>
          </div>
        </SectionHeader>
        <WeeklyBarChart title="Weekly calories" days={days} series={calorieSeries} unit="kcal" selectedDate={selectedDate} />
      </section>
      {/* End: Calorie chart and average. */}

      {/* Start: Shared blue macro heading and color-coded average cards above the daily macro bars. */}
      <section aria-labelledby="weekly-macros-heading" className="border-t border-slate-200 pt-6">
        <SectionHeader id="weekly-macros-heading" title="Macros by day" />
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {macroSeries.map((item) => (
            <div key={item.key} className={`rounded-xl border p-4 ${nutritionStyles[item.key].card}`}>
              <dt className={`text-xs ${nutritionStyles[item.key].label}`}>Average {item.label.toLowerCase()} per day</dt>
              <dd className="mt-2 text-2xl font-semibold tabular-nums" style={{ color: item.color }}>
                {formatNutrition(averages[item.key])} <span className={`text-sm font-normal ${nutritionStyles[item.key].label}`}>g</span>
              </dd>
            </div>
          ))}
        </dl>
        <WeeklyBarChart title="Weekly macros" days={days} series={macroSeries} unit="g" selectedDate={selectedDate} />
        <p className="mt-1 text-xs text-slate-500">Each day has three bars: P = protein, C = carbs, F = fats. All values are in grams.</p>
      </section>
      {/* End: Macro chart and averages. */}

      {/* Start: Expandable daily totals table for exact values and screen reader access. */}
      <details className="border-t border-slate-200 pt-5">
        <summary className="w-fit cursor-pointer rounded text-sm font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
          View daily totals
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[440px] text-left text-sm tabular-nums">
            <caption className="sr-only">Daily nutrition totals and averages for {weekLabel}</caption>
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th scope="col" className="px-2 py-3 font-medium">Day</th>
                {nutritionFields.map((field) => (
                  <th key={field.key} scope="col" className="px-2 py-3 text-right font-medium">{field.label} ({field.unit})</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.date} aria-current={day.date === selectedDate ? 'date' : undefined} className={`border-b border-slate-100 ${day.date === selectedDate ? 'bg-blue-50' : ''}`}>
                  <th scope="row" className="px-2 py-3 font-normal">{formatCalendarDay(day.date, { weekday: 'short', month: 'short', day: 'numeric' })}</th>
                  {nutritionFields.map((field) => (
                    <td key={field.key} className="px-2 py-3 text-right">{formatNutrition(day[field.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <th scope="row" className="px-2 py-3">Daily average</th>
                {nutritionFields.map((field) => (
                  <td key={field.key} className="px-2 py-3 text-right">{formatNutrition(averages[field.key])}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </details>
      {/* End: Daily totals table. */}
    </div>
  )
}

export default WeeklyDashboard
