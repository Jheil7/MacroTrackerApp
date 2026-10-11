import { useId } from 'react'
import { useToday } from '../hooks/useToday'
import { formatCalendarDay, getLocalDay, isCalendarDay, shiftCalendarDay } from '../lib/dates'
import { getWeekDates } from '../lib/weekly'

// Start: Accept the shared date, navigation interval, and pending diary state from the dashboard.
type DateNavigationProps = {
  selectedDate: string
  onDateChange: (date: string) => void
  mode: 'day' | 'week'
  disabled: boolean
}

const buttonClassName = 'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-default disabled:opacity-50'
// End: Navigation props and shared button styling.

function DateNavigation({ selectedDate, onDateChange, mode, disabled }: DateNavigationProps) {
  // Start: Track the actual current day only for Today; the chosen diary day remains independent.
  const today = useToday()
  const inputId = useId()
  const interval = mode === 'week' ? 7 : 1
  const previousDate = shiftCalendarDay(selectedDate, -interval)
  const nextDate = shiftCalendarDay(selectedDate, interval)
  const weekDates = getWeekDates(selectedDate)
  const shortDateOptions = { month: 'short', day: 'numeric', year: 'numeric' } as const
  const label = mode === 'week'
    ? formatCalendarDay(weekDates[0], shortDateOptions) + ' – ' + formatCalendarDay(weekDates[6], shortDateOptions)
    : formatCalendarDay(selectedDate)
  // End: Navigation dates and readable labels.

  return (
    <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
      {/* Start: Announce the selected day or week and make the logging destination clear. */}
      <h3 aria-live="polite" aria-atomic="true" className="font-semibold text-blue-950">{label}</h3>
      <p className="mt-1 text-xs text-blue-800">
        {mode === 'day'
          ? 'Meals are logged to this date. It stays selected after midnight.'
          : 'Showing the week containing your selected date. Daily uses the same selection.'}
      </p>
      {/* End: Selected date context. */}

      {/* Start: Calendar picker and day/week controls; pause navigation while a diary change saves. */}
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="mr-2 flex min-w-0 flex-col gap-1.5">
          <label htmlFor={inputId} className="text-xs font-medium text-blue-900">
            {mode === 'day' ? 'Log date' : 'Date in week'}
          </label>
          <input
            id={inputId}
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            required
            value={selectedDate}
            disabled={disabled}
            onChange={(event) => {
              if (isCalendarDay(event.target.value)) onDateChange(event.target.value)
            }}
            className="min-h-11 min-w-0 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
          />
        </div>
        <button type="button" aria-label={'Previous ' + mode}
          disabled={disabled || !isCalendarDay(previousDate)}
          onClick={() => onDateChange(previousDate)} className={buttonClassName}>
          <span aria-hidden="true">←</span> Previous {mode}
        </button>
        <button type="button" aria-label={'Next ' + mode}
          disabled={disabled || !isCalendarDay(nextDate)}
          onClick={() => onDateChange(nextDate)} className={buttonClassName}>
          Next {mode} <span aria-hidden="true">→</span>
        </button>
        <button type="button" disabled={disabled || selectedDate === today}
          onClick={() => onDateChange(getLocalDay())} className={buttonClassName}>
          Today
        </button>
      </div>
      {/* End: Calendar navigation controls. */}
    </div>
  )
}

export default DateNavigation
