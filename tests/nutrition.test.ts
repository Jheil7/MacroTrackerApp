import assert from 'node:assert/strict'
import test from 'node:test'
import { getLocalDay } from '../src/lib/dates.ts'
import { getDailyTotals, parseFoodInput } from '../src/lib/nutrition.ts'

const validValues = { name: ' Yogurt ', calories: '150', protein: '15.5', carbs: '8', fats: '4' }

test('manual input preserves decimal macros and trims the food name', () => {
  assert.deepEqual(parseFoodInput(validValues), {
    name: 'Yogurt', calories: 150, protein: 15.5, carbs: 8, fats: 4,
  })
})

test('a food can be added using only nutrition values', () => {
  assert.equal(parseFoodInput({ ...validValues, name: '   ' }).name, 'Food')
})

test('zero is accepted for each nutrition field', () => {
  assert.deepEqual(parseFoodInput({ name: 'Water', calories: '0', protein: '0', carbs: '0', fats: '0' }), {
    name: 'Water', calories: 0, protein: 0, carbs: 0, fats: 0,
  })
})

for (const field of ['calories', 'protein', 'carbs', 'fats']) {
  test(`${field} rejects negative, empty, and non-finite values`, () => {
    for (const value of ['-1', '', ' ', 'NaN', 'Infinity', '1e309']) {
      assert.throws(() => parseFoodInput({ ...validValues, [field]: value }))
    }
  })
}

test('adding multiple foods sums every nutrient without changing the food records', () => {
  const first = Object.freeze(parseFoodInput(validValues))
  const second = Object.freeze(parseFoodInput({
    name: 'Lunch', calories: '425', protein: '32.5', carbs: '50.5', fats: '10',
  }))

  assert.deepEqual(getDailyTotals([first, second]), {
    calories: 575, protein: 48, carbs: 58.5, fats: 14,
  })
})

test('an empty day has zero totals and does not reuse a previous result', () => {
  const first = getDailyTotals([])
  first.calories = 100
  assert.deepEqual(getDailyTotals([]), { calories: 0, protein: 0, carbs: 0, fats: 0 })
})

test('food names longer than the form limit are rejected', () => {
  assert.throws(() => parseFoodInput({ ...validValues, name: 'x'.repeat(121) }))
})

test('diary days use the local calendar date, including near midnight', () => {
  assert.equal(getLocalDay(new Date(2026, 0, 2, 0, 15)), '2026-01-02')
  assert.equal(getLocalDay(new Date(2026, 11, 31, 23, 45)), '2026-12-31')
})
