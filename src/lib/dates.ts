// Start: Build a YYYY-MM-DD key from the local date for diary queries.
export function getLocalDay(date = new Date()): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return [year, month, day].join('-')
}
// End: Local date helper.

// Start: Parse calendar keys at local noon so UTC offsets and midnight cannot shift the day.
function getCalendarDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  const localDate = new Date(0)
  localDate.setHours(12, 0, 0, 0)
  localDate.setFullYear(year, month - 1, day)
  return localDate
}
// End: Local calendar parsing.

// Start: Reject incomplete keys and impossible dates before navigating or saving diary entries.
export function isCalendarDay(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number(date.slice(0, 4)) === 0) return false
  return getLocalDay(getCalendarDate(date)) === date
}
// End: Calendar date validation.

// Start: Move by local calendar days rather than fixed 24-hour durations across daylight-saving changes.
export function shiftCalendarDay(date: string, days: number): string {
  if (!isCalendarDay(date) || !Number.isInteger(days)) {
    throw new RangeError('Choose a valid calendar date and a whole number of days.')
  }
  const shiftedDate = getCalendarDate(date)
  shiftedDate.setDate(shiftedDate.getDate() + days)
  return getLocalDay(shiftedDate)
}
// End: Calendar day navigation.

// Start: Share readable local date labels between navigation, food entries, and weekly summaries.
export function formatCalendarDay(
  date: string,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
): string {
  return getCalendarDate(date).toLocaleDateString(undefined, options)
}
// End: Calendar date formatting.
