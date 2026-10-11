import { getLocalDay } from './dates.ts'
import { getDailyTotals } from './nutrition.ts'
import type { FoodEntry, NutritionTotals } from '../types/food'

// Start: Describe daily chart totals and the daily averages for a calendar week.
export type WeeklyDay = NutritionTotals & { date: string }

export type WeeklySummary = {
  days: WeeklyDay[]
  averages: NutritionTotals
}
// End: Weekly summary types.

// Start: Build Monday-Sunday date keys using local calendar arithmetic across month and DST changes.
export function getWeekDates(today: string): string[] {
  const [year, month, day] = today.split('-').map(Number)
  const monday = new Date(year, month - 1, day, 12)
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return getLocalDay(date)
  })
}
// End: Local week date calculation.

// Start: Sum diary entries by date and average over all seven days, including days with no entries.
export function getWeeklySummary(foods: readonly FoodEntry[], today: string): WeeklySummary {
  const days = getWeekDates(today).map((date) => ({
    date,
    ...getDailyTotals(foods.filter((food) => food.date === date)),
  }))
  const totals = getDailyTotals(days)

  return {
    days,
    averages: {
      calories: totals.calories / days.length,
      protein: totals.protein / days.length,
      carbs: totals.carbs / days.length,
      fats: totals.fats / days.length,
    },
  }
}
// End: Weekly totals and averages.
