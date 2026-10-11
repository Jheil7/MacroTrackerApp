import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, moveFoodEntryDate, saveFoodEntry } from '../db'
import { formatCalendarDay } from '../lib/dates'
import { formatNutrition, formatQuantity, getDailyTotals, nutritionFields } from '../lib/nutrition'
import { nutritionStyles } from '../lib/nutritionStyles'
import type { FoodEntry, FoodLogInput } from '../types/food'
import AddFoodForm from './AddFoodForm'
import DiaryEntryDateEditor from './DiaryEntryDateEditor'
import SectionHeader from './SectionHeader'

// Start: Describe date-specific query results and the dashboard's shared mutation state.
type DailyDashboardProps = {
  selectedDate: string
  isBusy: boolean
  onBusyChange: (busy: boolean) => void
}

type DailyFoodsResult = {
  date: string
  foods: FoodEntry[]
  error: string | null
}
// End: Daily query and component props.

function DailyDashboard({ selectedDate, isBusy, onBusyChange }: DailyDashboardProps) {
  // Start: Track the selected day's label, form visibility, query retries, removal feedback, and button focus.
  const dateLabel = formatCalendarDay(selectedDate)
  const [isAdding, setIsAdding] = useState(false)
  const [queryAttempt, setQueryAttempt] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  // End: Daily view state and refs.

  // Start: Subscribe to the selected day's saved entries so totals refresh after database changes.
  const result = useLiveQuery(async (): Promise<DailyFoodsResult> => {
    try {
      const foods = await db.foodEntries.where('date').equals(selectedDate).toArray()
      return { date: selectedDate, foods, error: null }
    } catch {
      return { date: selectedDate, foods: [], error: 'Could not load foods for this date.' }
    }
  }, [selectedDate, queryAttempt])
  // End: Live daily food query.

  // Start: Save to the chosen diary day and pause date navigation until the snapshot is persisted.
  async function handleAddFood(food: FoodLogInput) {
    if (isBusy) throw new Error('Please wait for the current change to finish.')
    onBusyChange(true)
    try {
      await saveFoodEntry(food, selectedDate)
      setAnnouncement(`${food.name} added to ${dateLabel}.`)
    } finally {
      onBusyChange(false)
    }
  }

  function closeForm() {
    setIsAdding(false)
    addButtonRef.current?.focus()
  }
  // End: Add and close handlers.

  // Start: Delete a diary entry; the live query refreshes the list and totals after a successful removal.
  async function handleRemoveFood(food: FoodEntry) {
    if (isBusy) return
    onBusyChange(true)
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
      onBusyChange(false)
    }
  }
  // End: Remove handler and error handling.

  // Start: Reassign an entry without changing nutrition; live daily and weekly queries refresh.
  async function handleMoveFood(food: FoodEntry, date: string) {
    if (isBusy) throw new Error('Please wait for the current change to finish.')
    onBusyChange(true)
    setRemoveError(null)
    setAnnouncement('')
    try {
      await moveFoodEntryDate(food.id, date)
      setAnnouncement(`${food.name} moved to ${formatCalendarDay(date)}.`)
      addButtonRef.current?.focus()
    } finally {
      onBusyChange(false)
    }
  }
  // End: Entry date change handler.

  // Start: Use only the selected day's results and keep the form mounted while new dates load.
  const dailyResult = result?.date === selectedDate ? result : undefined
  const isLoading = !dailyResult
  const loadError = dailyResult?.error
  const foods = dailyResult?.foods ?? []
  const totals = getDailyTotals(foods)
  // End: Daily query status and derived totals.

  return (
    <>
      {/* Start: Loading and retry feedback without unmounting an unfinished add-food draft. */}
      {isLoading && <p role="status" className="mt-5 text-sm text-slate-500">Loading foods for {dateLabel}...</p>}
      {loadError && (
        <div className="mt-5">
          <p role="alert" className="text-sm text-red-700">{loadError}</p>
          <button type="button" onClick={() => setQueryAttempt((current) => current + 1)}
            className="mt-3 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            Try again
          </button>
        </div>
      )}
      {/* End: Daily query feedback. */}

      {/* Start: Color-coded nutrition cards in a responsive grid, matching the weekly chart palette. */}
      <dl
        aria-label="Daily nutrition totals"
        aria-busy={isLoading}
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
                {isLoading || loadError ? '—' : formatNutrition(totals[metric.key])}
              </span>
              <span className={`text-sm ${nutritionStyles[metric.key].label}`}>{metric.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
      {/* End: Daily nutrition cards. */}

      <section aria-labelledby="daily-foods-heading" className="mt-8 border-t border-slate-200 pt-6">
        {/* Start: Shared blue food heading, add button, and expandable entry form. */}
        <SectionHeader id="daily-foods-heading" title="Foods for this day">
          <button
            ref={addButtonRef}
            type="button"
            disabled={isBusy || isLoading || Boolean(loadError)}
            aria-expanded={isAdding}
            aria-controls={isAdding ? 'add-food-form' : undefined}
            onClick={() => {
              setAnnouncement('')
              setIsAdding(true)
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-3 py-2.5 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-50"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              +
            </span>
            Add food
          </button>
        </SectionHeader>

        {isAdding && (
          <div>
            <p className="mt-4 text-sm text-slate-600">Adding food to <span className="font-medium">{dateLabel}</span>.</p>
            <AddFoodForm onAdd={handleAddFood} onClose={closeForm} disabled={isBusy || isLoading || Boolean(loadError)} />
          </div>
        )}
        {/* End: Add food controls. */}

        {/* Start: Announce additions/removals and show feedback if an entry could not be removed. */}
        <p role="status" className="sr-only">
          {announcement}
        </p>
        {removeError && <p role="alert" className="mt-4 text-sm text-red-700">{removeError}</p>}
        {/* End: Diary change feedback. */}

        {/* Start: Entries for the selected day with nutrition, date correction, and removal controls. */}
        {isLoading || loadError ? null : foods.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No foods logged for this date yet.</p>
        ) : (
          <ul aria-label={`Foods logged for ${dateLabel}`} className="mt-4 space-y-3">
            {foods.map((food) => (
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
                  {/* Start: Move this entry to another calendar day while retaining its snapshot. */}
                  <DiaryEntryDateEditor food={food} disabled={isBusy} onMove={(date) => handleMoveFood(food, date)} />
                  {/* End: Entry date correction. */}
                </div>

                {/* Start: Accessible remove control; disable removals while any diary change is pending. */}
                <button
                  type="button"
                  onClick={() => handleRemoveFood(food)}
                  disabled={isBusy}
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
