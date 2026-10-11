import { useId } from 'react'
import { formatCalendarDay } from '../lib/dates'
import { formatNutrition } from '../lib/nutrition'
import type { WeeklyDay } from '../lib/weekly'
import type { NutritionTotals } from '../types/food'

// Start: Define chart series, colors, and dimensions shared by both weekly graphs.
type ChartSeries = {
  key: keyof NutritionTotals
  label: string
  color: string
}

type WeeklyBarChartProps = {
  title: string
  days: readonly WeeklyDay[]
  series: readonly ChartSeries[]
  unit: 'kcal' | 'g'
  selectedDate: string
}

const width = 640
const height = 280
const margin = { top: 20, right: 12, bottom: 56, left: 58 }
const plotWidth = width - margin.left - margin.right
const plotHeight = height - margin.top - margin.bottom
// End: Chart configuration.

function WeeklyBarChart({ title, days, series, unit, selectedDate }: WeeklyBarChartProps) {
  // Start: Derive the chart scale and bar positions directly from this week's totals.
  const chartId = useId()
  const highestValue = Math.max(unit === 'kcal' ? 100 : 10, ...days.flatMap((day) => series.map((item) => day[item.key])))
  const step = 10 ** Math.floor(Math.log10(highestValue)) / 2
  const axisMaximum = Math.ceil(highestValue / step) * step
  const groupWidth = plotWidth / days.length
  const innerWidth = groupWidth * 0.62
  const barGap = 3
  const barWidth = (innerWidth - barGap * (series.length - 1)) / series.length
  const dayLabels = days.map((day) => formatCalendarDay(day.date, { weekday: 'short' }))
  const legend = series.map((item) => ({ label: item.label, color: item.color }))
  // End: Derived chart layout and legend.

  return (
    <figure className="mt-4">
      {/* Start: Color legend and a scrollable SVG graph that stays readable on narrow screens. */}
      <figcaption className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
        {legend.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </figcaption>
      <div role="region" aria-label={`${title} chart`} tabIndex={0}
        className="mt-3 overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
        <svg viewBox={`0 0 ${width} ${height}`} role="img"
          aria-labelledby={`${chartId}-title`} aria-describedby={`${chartId}-description`} className="block min-w-[520px] w-full">
          <title id={`${chartId}-title`}>{`${title} by day`}</title>
          <desc id={`${chartId}-description`}>
            {`${series.map((item) => item.label).join(', ')} in ${unit}, Monday through Sunday. Selected date: ${selectedDate}. Hover over a bar for its exact total, or expand View daily totals below both charts.`}
          </desc>

          {/* Start: Horizontal grid lines and numeric labels with a shared zero baseline. */}
          {[0, 1, 2, 3, 4].map((tick) => {
            const value = axisMaximum * tick / 4
            const y = margin.top + plotHeight * (1 - tick / 4)
            return (
              <g key={tick}>
                <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#e2e8f0" />
                <text x={margin.left - 8} y={y + 4} textAnchor="end" className="fill-slate-500 text-[11px]">
                  {formatNutrition(value)}
                </text>
              </g>
            )
          })}
          {/* End: Chart grid and vertical scale. */}

          {/* Start: One group per day, containing calorie or macro bars and highlighting the selected date. */}
          {days.map((day, dayIndex) => {
            const center = margin.left + groupWidth * (dayIndex + 0.5)
            return (
              <g key={day.date}>
                {series.map((item, seriesIndex) => {
                  const value = day[item.key]
                  const barHeight = value / axisMaximum * plotHeight
                  const x = center - innerWidth / 2 + seriesIndex * (barWidth + barGap)
                  const y = margin.top + plotHeight - barHeight
                  return (
                    <g key={item.key}>
                      <rect x={x} y={y} width={barWidth} height={barHeight} rx={3}
                        fill={item.color} className="hover:opacity-80">
                        <title>{`${dayLabels[dayIndex]} (${day.date}): ${item.label} ${formatNutrition(value)} ${unit}`}</title>
                      </rect>
                      {series.length === 1 ? (
                        <text x={center} y={y - 7} textAnchor="middle" className="fill-slate-700 text-[11px]">
                          {formatNutrition(value)}
                        </text>
                      ) : (
                        <text x={x + barWidth / 2} y={margin.top + plotHeight + 15} textAnchor="middle"
                          className="fill-slate-500 text-[10px]">
                          {item.label[0]}
                        </text>
                      )}
                    </g>
                  )
                })}
                <text x={center} y={margin.top + plotHeight + 34} textAnchor="middle"
                  className={`text-xs ${day.date === selectedDate ? 'fill-blue-800 font-semibold' : 'fill-slate-600'}`}>
                  {dayLabels[dayIndex]}
                </text>
              </g>
            )
          })}
          {/* End: Daily bar groups. */}
        </svg>
      </div>
      {/* End: Legend and chart display. */}
    </figure>
  )
}

export default WeeklyBarChart
