import assert from 'node:assert/strict'
import test from 'node:test'
import { isCalendarDay, shiftCalendarDay } from '../src/lib/dates.ts'
import { getWeekDates } from '../src/lib/weekly.ts'

// Start: Accept complete calendar dates and reject impossible or incomplete picker values.
test('calendar validation accepts real dates, leap days, and four-digit years', () => {
  for (const date of ['2026-10-10', '2028-02-29', '0099-12-31', '0001-01-01']) {
    assert.equal(isCalendarDay(date), true, date)
  }
})

test('calendar validation rejects impossible dates, timestamps, and incomplete values', () => {
  for (const date of ['', '2026-2-01', '2026-10', '2026-02-29', '2026-02-30', '2026-13-01',
    '2026-01-00', '0000-01-01', '2026-10-10T00:30:00']) {
    assert.equal(isCalendarDay(date), false, date)
  }
})
// End: Picker date validation tests.

// Start: Exercise calendar navigation across month, leap-year, year, and daylight-saving boundaries.
test('day navigation crosses month and year boundaries and visits leap days', () => {
  assert.equal(shiftCalendarDay('2026-10-01', -1), '2026-09-30')
  assert.equal(shiftCalendarDay('2026-12-31', 1), '2027-01-01')
  assert.equal(shiftCalendarDay('2028-02-28', 1), '2028-02-29')
  assert.equal(shiftCalendarDay('2028-03-01', -1), '2028-02-29')
  assert.equal(shiftCalendarDay('0099-12-31', 1), '0100-01-01')
})

test('week navigation keeps the weekday across daylight-saving and year changes', () => {
  assert.equal(shiftCalendarDay('2026-03-07', 7), '2026-03-14')
  assert.equal(shiftCalendarDay('2026-11-07', -7), '2026-10-31')
  assert.equal(shiftCalendarDay('2026-12-31', 7), '2027-01-07')
  assert.deepEqual(getWeekDates(shiftCalendarDay('2026-10-10', -7)), [
    '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01',
    '2026-10-02', '2026-10-03', '2026-10-04',
  ])
})

test('navigation rejects an invalid date or a fractional day interval', () => {
  assert.throws(() => shiftCalendarDay('2026-02-30', 1), RangeError)
  assert.throws(() => shiftCalendarDay('2026-10-10', 0.5), RangeError)
})
// End: Calendar navigation tests.
