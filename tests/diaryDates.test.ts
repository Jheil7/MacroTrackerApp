import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { db, moveFoodEntryDate, saveFoodEntry } from '../src/db.ts'
import { getLocalDay } from '../src/lib/dates.ts'
import { getWeeklySummary } from '../src/lib/weekly.ts'
import type { FoodLogInput } from '../src/types/food.ts'

// Start: Isolate browser persistence with synthetic nutrition snapshots for date assignment checks.
const food: FoodLogInput = { name: 'Test meal', calories: 700, protein: 70, carbs: 140, fats: 35 }
beforeEach(async () => { await db.foodEntries.clear() })
after(async () => { await db.delete() })
// End: Database fixtures and cleanup.

// Start: Verify that the chosen diary date stays independent of the current clock and midnight.
test('adding after midnight saves to the selected previous day', async (context) => {
  context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-11T00:30:00') })
  const id = await saveFoodEntry(food, '2026-10-10')
  const entry = await db.foodEntries.get(id)

  assert.equal(getLocalDay(), '2026-10-11')
  assert.equal(entry?.date, '2026-10-10')
  assert.equal(entry?.createdAt, Date.now())
  assert.equal((await db.foodEntries.where('date').equals('2026-10-11').toArray()).length, 0)
})

test('both sides of midnight can be logged to the same selected day', async (context) => {
  context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-10T23:59:00') })
  const selectedDate = '2026-10-10'
  await saveFoodEntry(food, selectedDate)
  context.mock.timers.tick(120_000)
  await saveFoodEntry(food, selectedDate)

  assert.equal(getLocalDay(), '2026-10-11')
  const entries = await db.foodEntries.where('date').equals(selectedDate).toArray()
  assert.equal(entries.length, 2)
  assert.equal(entries[1].createdAt - entries[0].createdAt, 120_000)
})

test('invalid selected dates cannot create diary entries', async () => {
  for (const date of ['', '2026-02-30', '2026-10-10T00:30:00']) {
    await assert.rejects(saveFoodEntry(food, date), /valid calendar date/)
  }
  assert.equal(await db.foodEntries.count(), 0)
})
// End: Explicit diary date persistence tests.

// Start: Verify date corrections preserve snapshots and update both daily grouping and weekly averages.
test('moving a weight-based snapshot preserves its ID, nutrition, grams, and creation time', async () => {
  const snapshot: FoodLogInput = {
    ...food,
    source: { kind: 'food', id: 3, quantity: 124, serving: '100 g', unit: 'g' },
  }
  const id = await saveFoodEntry(snapshot, '2026-10-11')
  const before = await db.foodEntries.get(id)
  await moveFoodEntryDate(id, '2026-10-10')

  assert.deepEqual(await db.foodEntries.get(id), { ...before, date: '2026-10-10' })
  assert.equal(await db.foodEntries.where('date').equals('2026-10-11').count(), 0)
  assert.equal(await db.foodEntries.where('date').equals('2026-10-10').count(), 1)
})

test('moving within a week updates bars and the number of logged days', async () => {
  await saveFoodEntry(food, '2026-10-05')
  const id = await saveFoodEntry({ ...food, calories: 350, protein: 35, carbs: 70, fats: 17.5 }, '2026-10-05')
  const before = getWeeklySummary(await db.foodEntries.toArray(), '2026-10-10')
  await moveFoodEntryDate(id, '2026-10-06')
  const after = getWeeklySummary(await db.foodEntries.toArray(), '2026-10-10')

  assert.equal(before.loggedDayCount, 1)
  assert.equal(before.averages.calories, 1050)
  assert.equal(after.loggedDayCount, 2)
  assert.deepEqual(after.averages, { calories: 525, protein: 52.5, carbs: 105, fats: 26.25 })
  assert.equal(after.days[0].calories, 700)
  assert.equal(after.days[1].calories, 350)
})

test('moving across Sunday and Monday updates both weeks and handles the now-empty week', async () => {
  await saveFoodEntry(food, '2026-10-11')
  const id = await saveFoodEntry(food, '2026-10-12')
  await moveFoodEntryDate(id, '2026-10-11')
  const entries = await db.foodEntries.toArray()
  const earlierWeek = getWeeklySummary(entries, '2026-10-10')
  const laterWeek = getWeeklySummary(entries, '2026-10-12')

  assert.equal(earlierWeek.days[6].calories, 1400)
  assert.equal(earlierWeek.loggedDayCount, 1)
  assert.deepEqual(earlierWeek.averages, { calories: 1400, protein: 140, carbs: 280, fats: 70 })
  assert.equal(laterWeek.loggedDayCount, 0)
  assert.deepEqual(laterWeek.averages, { calories: 0, protein: 0, carbs: 0, fats: 0 })
})

test('an invalid move leaves the existing entry unchanged', async () => {
  const id = await saveFoodEntry(food, '2026-10-10')
  const before = await db.foodEntries.get(id)
  await assert.rejects(moveFoodEntryDate(id, '2026-02-30'), /valid calendar date/)
  assert.deepEqual(await db.foodEntries.get(id), before)
})

test('moving a missing entry reports an error instead of creating a replacement', async () => {
  await assert.rejects(moveFoodEntryDate(999, '2026-10-10'), /no longer exists/)
  assert.equal(await db.foodEntries.count(), 0)
})
// End: Snapshot preservation and date move integration tests.
