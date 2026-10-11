import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useToday } from '../hooks/useToday'
import { getLocalDay } from '../lib/dates'
import { formatNutrition, formatQuantity, getDailyTotals, nutritionFields } from '../lib/nutrition'
import { nutritionStyles } from '../lib/nutritionStyles'
import type { FoodEntry, FoodLogInput } from '../types/food'
import AddFoodForm from './AddFoodForm'
import SectionHeader from './SectionHeader'

type DailyFoodsResult = {
  date: string
  foods: FoodEntry[]
  error: string | null
}

function DailyDashboard() {
  // Start: Track today's date, form visibility, query retries, removal feedback, and button focus.
  const today = useToday()
  const [isAdding, setIsAdding] = useState(false)
  const [queryAttempt, setQueryAttempt] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  // End: Daily view state and refs.

  // Start: Subscribe to today's saved entries so totals refresh after database changes.
  const result = useLiveQuery(async (): Promise<DailyFoodsResult> => {
    try {
      const foods = await db.foodEntries.where('date').equals(today).toArray()
      return { date: today, foods, error: null }
    } catch {
      return { date: today, foods: [], error: 'Could not load foods for today.' }
    }
  }, [today, queryAttempt])
  // End: Live daily food query.

  // Start: Save a nutrition snapshot and restore button focus when the form closes.
  async function handleAddFood(food: FoodLogInput) {
    await db.foodEntries.add({ ...food, date: getLocalDay(), createdAt: Date.now() })
    setAnnouncement(`${food.name} added.`)
  }

  function closeForm() {
    setIsAdding(false)
    addButtonRef.current?.focus()
  }
  // End: Add and close handlers.

  // Start: Delete a diary entry; the live query refreshes the list and totals after a successful removal.
  async function handleRemoveFood(food: FoodEntry) {
    if (removingId !== null) return
    setRemovingId(food.id)
    setRemoveError(null)
    setAnnouncement('')

    try {
      await db.foodEntries.delete(food.id)
      setAnnouncement(`${food.name} removed.`)
      addButtonRef.current?.focus()
    } catch {
      setRemoveError(`Could not remove ${food.name}. Please try again.`)
    } finally {
      setRemovingId(null)
    }
  }
  // End: Remove handler and error handling.

  // Start: Show loading or retry feedback before rendering the daily overview.
  if (!result || result.date !== today) {
    return (
      <p role="status" className="mt-5 text-sm text-slate-500">
        Loading foods for today...
      </p>
    )
  }

  if (result.error) {
    return (
      <div className="mt-5">
        <p role="alert" className="text-sm text-red-700">
          {result.error}
        </p>
        <button
          type="button"
          onClick={() => setQueryAttempt((current) => current + 1)}
          className="mt-3 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          Try again
        </button>
      </div>
    )
  }
  // End: Loading and error views.

  // Start: Derive totals from the saved entries instead of storing duplicate total state.
  const totals = getDailyTotals(result.foods)
  // End: Daily totals calculation.

  return (
    <>
      {/* Start: Color-coded nutrition cards in a responsive grid, matching the weekly chart palette. */}
      <dl
        aria-label="Daily nutrition totals"
        className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {nutritionFields.map((metric) => (
          <div
            key={metric.key}
            className={`rounded-xl border p-4 sm:p-5 ${nutritionStyles[metric.key].card}`}
          >
            <dt className={`text-sm font-medium ${nutritionStyles[metric.key].label}`}>{metric.label}</dt>
            <dd className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className={`text-3xl font-semibold tracking-tight tabular-nums ${nutritionStyles[metric.key].value}`}>
                {formatNutrition(totals[metric.key])}
              </span>
              <span className={`text-sm ${nutritionStyles[metric.key].label}`}>{metric.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
      {/* End: Daily nutrition cards. */}

      <section aria-labelledby="daily-foods-heading" className="mt-8 border-t border-slate-200 pt-6">
        {/* Start: Shared blue food heading, add button, and expandable entry form. */}
        <SectionHeader id="daily-foods-heading" title="Foods today">
          <button
            ref={addButtonRef}
            type="button"
            aria-expanded={isAdding}
            aria-controls={isAdding ? 'add-food-form' : undefined}
            onClick={() => {
              setAnnouncement('')
              setIsAdding(true)
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-3 py-2.5 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              +
            </span>
            Add food
          </button>
        </SectionHeader>

        {isAdding && <AddFoodForm onAdd={handleAddFood} onClose={closeForm} />}
        {/* End: Add food controls. */}

        {/* Start: Announce additions/removals and show feedback if an entry could not be removed. */}
        <p role="status" className="sr-only">
          {announcement}
        </p>
        {removeError && <p role="alert" className="mt-4 text-sm text-red-700">{removeError}</p>}
        {/* End: Diary change feedback. */}

        {/* Start: Daily entry cards with an emerald accent border and a remove button. */}
        {result.foods.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No foods added yet.</p>
        ) : (
          <ul aria-label="Foods logged today" className="mt-4 space-y-3">
            {result.foods.map((food) => (
              <li key={food.id} className="flex items-start gap-3 rounded-xl border border-emerald-100 border-l-4 border-l-emerald-300 bg-emerald-50/40 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-words">{food.name}</p>
                  {food.source && (
                    <p className="mt-1 text-xs text-slate-500">
                      {food.source.kind === 'meal' ? 'Meal' : 'Base food'} - {food.source.unit === 'g'
                        ? `${formatQuantity(food.source.quantity)} g`
                        : `${formatQuantity(food.source.quantity)} x ${food.source.serving}`}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                    {nutritionFields.map((field) => (
                      <span key={field.key}>
                        {field.label}: {formatNutrition(food[field.key])} {field.unit}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Start: Accessible remove control; disable removals while a delete is pending. */}
                <button
                  type="button"
                  onClick={() => handleRemoveFood(food)}
                  disabled={removingId !== null}
                  aria-label={`Remove ${food.name} entry`}
                  aria-busy={removingId === food.id}
                  title="Remove entry"
                  className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-2xl text-slate-500 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-wait disabled:opacity-50"
                >
                  <span aria-hidden="true">{removingId === food.id ? '...' : '\u00d7'}</span>
                </button>
                {/* End: Remove entry control. */}
              </li>
            ))}
          </ul>
        )}
        {/* End: Daily food list. */}
      </section>
    </>
  )
}

export default DailyDashboard
