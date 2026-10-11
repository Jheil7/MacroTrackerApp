// Start: Share complete Tailwind color classes so daily and weekly cards use the same macro palette.
export const nutritionStyles = {
  calories: {
    card: 'border-blue-200 bg-blue-50',
    label: 'text-blue-800',
    value: 'text-blue-900',
  },
  protein: {
    card: 'border-emerald-200 bg-emerald-50',
    label: 'text-emerald-800',
    value: 'text-emerald-900',
  },
  carbs: {
    card: 'border-amber-200 bg-amber-50',
    label: 'text-amber-800',
    value: 'text-amber-900',
  },
  fats: {
    card: 'border-violet-200 bg-violet-50',
    label: 'text-violet-800',
    value: 'text-violet-900',
  },
} as const
// End: Nutrition card colors.
