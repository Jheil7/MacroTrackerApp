import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { isCalendarDay } from '../lib/dates'
import type { FoodEntry } from '../types/food'

// Start: Receive an existing diary snapshot and the handler that changes only its assigned date.
type DiaryEntryDateEditorProps = {
  food: FoodEntry
  disabled: boolean
  onMove: (date: string) => Promise<void>
}
// End: Entry date editor props.

function DiaryEntryDateEditor({ food, disabled, onMove }: DiaryEntryDateEditorProps) {
  // Start: Keep the destination date, editor visibility, and save errors local to this diary row.
  const inputId = useId()
  const [isEditing, setIsEditing] = useState(false)
  const [targetDate, setTargetDate] = useState(food.date)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editButtonRef = useRef<HTMLButtonElement>(null)
  // End: Editor state and focus ref.

  // Start: Validate the destination and retain it if the database update fails.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving || disabled) return
    if (!isCalendarDay(targetDate)) {
      setError('Choose a valid calendar date.')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await onMove(targetDate)
      setIsEditing(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not change this entry date. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }
  // End: Move handler and error handling.

  return (
    <div className="mt-2">
      {/* Start: Expand the date editor without changing any saved food values. */}
      <button ref={editButtonRef} type="button" disabled={disabled || isSaving}
        aria-expanded={isEditing} aria-controls={isEditing ? inputId + '-form' : undefined}
        onClick={() => {
          setTargetDate(food.date)
          setError(null)
          setIsEditing(true)
        }}
        className="min-h-9 cursor-pointer rounded px-1 text-xs font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-50">
        Change date
      </button>
      {/* End: Entry date control. */}

      {/* Start: Calendar destination, save/cancel actions, and validation feedback for this entry. */}
      {isEditing && (
        <form id={inputId + '-form'} aria-label={'Change date for ' + food.name} onSubmit={handleSubmit} className="mt-2">
          <fieldset disabled={disabled || isSaving} className="flex flex-wrap items-end gap-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor={inputId} className="text-xs font-medium text-slate-700">Move to date</label>
              <input id={inputId} type="date" min="0001-01-01" max="9999-12-31" required autoFocus
                value={targetDate}
                onChange={(event) => {
                  setTargetDate(event.target.value)
                  setError(null)
                }}
                className="min-h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" />
            </div>
            <button type="submit" disabled={!isCalendarDay(targetDate) || targetDate === food.date}
              className="min-h-11 cursor-pointer rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-default disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save date'}
            </button>
            <button type="button" onClick={() => {
              setIsEditing(false)
              editButtonRef.current?.focus()
            }}
              className="min-h-11 cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
              Cancel
            </button>
          </fieldset>
          {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        </form>
      )}
      {/* End: Entry date editor and feedback. */}
    </div>
  )
}

export default DiaryEntryDateEditor
