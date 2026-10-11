import { getLocalDay, shiftCalendarDay } from './dates.ts'
import { getDailyTotals } from './nutrition.ts'
import type { FoodEntry, NutritionTotals } from '../types/food'

// Start: Describe daily chart totals and the daily averages for a calendar week.
export type WeeklyDay = NutritionTotals & { date: string }

export type WeeklySummary = {
  days: WeeklyDay[]
  loggedDayCount: number
  averages: NutritionTotals
}
// End: Weekly summary types.

// Start: Build Monday-Sunday date keys using local calendar arithmetic across month and DST changes.
export function getWeekDates(selectedDate: string): string[] {
  const localDate = new Date(`${selectedDate}T12:00:00`)
  const monday = shiftCalendarDay(selectedDate, -(localDate.getDay() + 6) % 7)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${monday}T12:00:00`)
    date.setDate(date.getDate() + index)
    return getLocalDay(date)
  })
}
// End: Local week date calculation.

// Start: Sum all seven chart days, but average only over distinct days with diary entries.
export function getWeeklySummary(foods: readonly FoodEntry[], selectedDate: string): WeeklySummary {
  const weekDates = getWeekDates(selectedDate)
  const days = weekDates.map((date) => ({
    date,
    ...getDailyTotals(foods.filter((food) => food.date === date)),
  }))
  const totals = getDailyTotals(days)
  const loggedDayCount = new Set(foods
    .filter((food) => weekDates.includes(food.date))
    .map((food) => food.date)).size
  const averageDivisor = Math.max(loggedDayCount, 1)

  return {
    days,
    loggedDayCount,
    averages: {
      calories: totals.calories / averageDivisor,
      protein: totals.protein / averageDivisor,
      carbs: totals.carbs / averageDivisor,
      fats: totals.fats / averageDivisor,
    },
  }
}
// End: Weekly totals and averages.
