import assert from 'node:assert/strict'
import test from 'node:test'
import { getWeekDates, getWeeklySummary } from '../src/lib/weekly.ts'
import type { FoodEntry } from '../src/types/food.ts'

// Start: Create diary fixtures with distinct dates and nutrition values for aggregation checks.
function entry(id: number, date: string, calories: number, protein = 0, carbs = 0, fats = 0): FoodEntry {
  return { id, date, name: `Food ${id}`, calories, protein, carbs, fats, createdAt: 0 }
}
// End: Weekly test fixture helper.

// Start: Verify Monday-Sunday boundaries, including local calendar transitions.
test('Monday, Saturday, and Sunday select the same Monday-Sunday week', () => {
  const expected = [
    '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08',
    '2026-10-09', '2026-10-10', '2026-10-11',
  ]
  for (const today of ['2026-10-05', '2026-10-10', '2026-10-11']) {
    assert.deepEqual(getWeekDates(today), expected)
  }
  assert.equal(getWeekDates('2026-10-12')[0], '2026-10-12')
})

test('weeks cross month and year boundaries without losing dates', () => {
  assert.deepEqual(getWeekDates('2026-01-01'), [
    '2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01',
    '2026-01-02', '2026-01-03', '2026-01-04',
  ])
})

test('weeks containing a leap day or daylight-saving change still have seven calendar days', () => {
  assert.deepEqual(getWeekDates('2028-02-29'), [
    '2028-02-28', '2028-02-29', '2028-03-01', '2028-03-02',
    '2028-03-03', '2028-03-04', '2028-03-05',
  ])
  assert.deepEqual(getWeekDates('2026-03-08'), [
    '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05',
    '2026-03-06', '2026-03-07', '2026-03-08',
  ])
})
// End: Calendar week tests.

// Start: Verify chart totals, zero days, averages, and changes after an entry is removed.
test('multiple entries on a day sum all nutrients and each logged day counts once in averages', () => {
  const result = getWeeklySummary([
    entry(1, '2026-10-05', 600, 30, 70, 20),
    entry(2, '2026-10-05', 450, 20, 50, 15),
    entry(3, '2026-10-11', 350, 20, 20, 7),
  ], '2026-10-10')
  assert.deepEqual(result.days[0], { date: '2026-10-05', calories: 1050, protein: 50, carbs: 120, fats: 35 })
  assert.deepEqual(result.days[1], { date: '2026-10-06', calories: 0, protein: 0, carbs: 0, fats: 0 })
  assert.equal(result.days[6].calories, 350)
  assert.equal(result.loggedDayCount, 2)
  assert.deepEqual(result.averages, { calories: 700, protein: 35, carbs: 70, fats: 21 })
})

test('entries outside the week do not affect any bars or averages', () => {
  const result = getWeeklySummary([
    entry(1, '2026-10-04', 9000, 900, 900, 900),
    entry(2, '2026-10-05', 700, 70, 140, 35),
    entry(3, '2026-10-12', 9000, 900, 900, 900),
  ], '2026-10-10')
  assert.equal(result.loggedDayCount, 1)
  assert.deepEqual(result.averages, { calories: 700, protein: 70, carbs: 140, fats: 35 })
})

test('an empty week has seven separate zero-valued days and zero averages', () => {
  const result = getWeeklySummary([], '2026-10-10')
  assert.equal(result.days.length, 7)
  assert.equal(result.loggedDayCount, 0)
  assert.deepEqual(result.averages, { calories: 0, protein: 0, carbs: 0, fats: 0 })
  result.days[0].calories = 100
  assert.equal(result.days[1].calories, 0)
  assert.equal(getWeeklySummary([], '2026-10-10').days[0].calories, 0)
})

test('decimal nutrition is preserved until display formatting and diary records are not mutated', () => {
  const food = Object.freeze(entry(1, '2026-10-05', 124.5, 4.98, 49.8, 1.245))
  const records = Object.freeze([food])
  const result = getWeeklySummary(records, '2026-10-10')
  assert.equal(result.days[0].fats, 1.245)
  assert.equal(result.averages.calories, 124.5)
  assert.deepEqual(food, entry(1, '2026-10-05', 124.5, 4.98, 49.8, 1.245))
})

test('removing an entry reduces the daily bar and weekly average', () => {
  const foods = [entry(1, '2026-10-05', 700), entry(2, '2026-10-05', 350)]
  const before = getWeeklySummary(foods, '2026-10-10')
  const after = getWeeklySummary(foods.filter((food) => food.id !== 1), '2026-10-10')
  assert.equal(before.days[0].calories, 1050)
  assert.equal(after.days[0].calories, 350)
  assert.equal(before.averages.calories, 1050)
  assert.equal(after.averages.calories, 350)
})
test('a single logged day uses that day for all nutrient averages', () => {
  const result = getWeeklySummary([entry(1, '2026-10-10', 1800, 120, 180, 60)], '2026-10-10')

  assert.equal(result.days.length, 7)
  assert.equal(result.loggedDayCount, 1)
  assert.deepEqual(result.averages, { calories: 1800, protein: 120, carbs: 180, fats: 60 })
})

test('a logged day with zero nutrients still counts toward the average', () => {
  const result = getWeeklySummary([
    entry(1, '2026-10-05', 600, 60, 80, 20),
    entry(2, '2026-10-06', 0),
  ], '2026-10-10')

  assert.equal(result.loggedDayCount, 2)
  assert.deepEqual(result.averages, { calories: 300, protein: 30, carbs: 40, fats: 10 })
})

test('removing the last entry on a day updates the divisor and handles an empty week', () => {
  const foods = [
    entry(1, '2026-10-05', 700, 70, 140, 35),
    entry(2, '2026-10-06', 500, 50, 100, 25),
  ]
  const before = getWeeklySummary(foods, '2026-10-10')
  const after = getWeeklySummary(foods.slice(0, 1), '2026-10-10')
  const empty = getWeeklySummary([], '2026-10-10')

  assert.equal(before.loggedDayCount, 2)
  assert.deepEqual(before.averages, { calories: 600, protein: 60, carbs: 120, fats: 30 })
  assert.equal(after.loggedDayCount, 1)
  assert.deepEqual(after.averages, { calories: 700, protein: 70, carbs: 140, fats: 35 })
  assert.equal(empty.loggedDayCount, 0)
  assert.deepEqual(empty.averages, { calories: 0, protein: 0, carbs: 0, fats: 0 })
})
// End: Weekly aggregation tests.
