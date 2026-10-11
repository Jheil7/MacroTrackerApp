import { useEffect, useState } from 'react'
import { getLocalDay } from '../lib/dates'

export function useToday(): string {
  // Start: Store the current local date so a day change triggers a React update.
  const [today, setToday] = useState(getLocalDay)
  // End: Date state.

  // Start: Refresh at local midnight and when the tab becomes visible; clean up on unmount.
  useEffect(() => {
    let timeoutId: number

    function scheduleNextDay() {
      const now = new Date()
      const nextDay = new Date(now)
      nextDay.setHours(24, 0, 0, 0)
      timeoutId = window.setTimeout(refreshDay, nextDay.getTime() - now.getTime() + 100)
    }

    function refreshDay() {
      setToday(getLocalDay())
      scheduleNextDay()
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        window.clearTimeout(timeoutId)
        refreshDay()
      }
    }

    scheduleNextDay()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
  // End: Date synchronization effect.

  return today
}
