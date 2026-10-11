// Start: Build a YYYY-MM-DD key from the local date for daily diary queries.
export function getLocalDay(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
// End: Local date helper.
