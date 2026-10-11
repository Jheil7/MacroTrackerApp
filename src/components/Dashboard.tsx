import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import DailyDashboard from './DailyDashboard'
import SectionHeader from './SectionHeader'
import StoredFoodsDashboard from './StoredFoodsDashboard'
import WeeklyDashboard from './WeeklyDashboard'

// Start: Define the dashboard tabs and derive the allowed tab IDs from this list.
const tabs = [
  {
    id: 'daily',
    label: 'Daily',
    title: 'Daily overview',
  },
  {
    id: 'weekly',
    label: 'Weekly',
    title: 'Weekly overview',
  },
  {
    id: 'foods',
    label: 'Stored Foods',
    title: 'Stored foods',
  },
] as const

type TabId = (typeof tabs)[number]['id']
// End: Tab configuration and type.

function Dashboard() {
  // Start: Track which dashboard tab is visible.
  const [activeTab, setActiveTab] = useState<TabId>('daily')
  // End: Active tab state.

  // Start: Switch tabs and move keyboard focus with arrow, Home, and End keys.
  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab)
    let nextIndex: number

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % tabs.length
        break
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = tabs.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    const nextTab = tabs[nextIndex]
    setActiveTab(nextTab.id)
    event.currentTarget.querySelector<HTMLButtonElement>(`#tab-${nextTab.id}`)?.focus()
  }
  // End: Tab keyboard navigation.

  return (
    <div className="min-h-svh bg-slate-50 text-slate-900">
      {/* Start: App title and tab navigation with the same blue accent as the section headers. */}
      <header className="border-b border-blue-200 bg-blue-100">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <h1 className="text-xl font-semibold tracking-tight text-blue-950 sm:text-2xl">
            Macro Tracker
          </h1>

          <div
            role="tablist"
            aria-label="Dashboard views"
            onKeyDown={handleTabKeyDown}
            className="mt-5 flex gap-1 rounded-xl bg-blue-200/60 p-1 sm:w-fit"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 cursor-pointer rounded-lg px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:flex-none sm:px-5 ${
                  activeTab === tab.id
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-blue-900 hover:bg-blue-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      {/* End: Header and tab navigation. */}

      {/* Start: Dashboard panels; hidden panels stay mounted to preserve their state. */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {tabs.map((tab) => (
          <section
            key={tab.id}
            id={`panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
            hidden={activeTab !== tab.id}
            tabIndex={0}
            className="rounded-2xl border border-slate-200 bg-white p-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:p-8"
          >
            {/* Start: Use the shared blue heading band to separate the tab title from its cards. */}
            <SectionHeader title={tab.title} headingLevel="h2" />
            {/* End: Tab heading. */}
            {tab.id === 'daily' ? (
              <DailyDashboard />
            ) : tab.id === 'foods' ? (
              <StoredFoodsDashboard />
            ) : (
              <WeeklyDashboard />
            )}
          </section>
        ))}
      </main>
      {/* End: Dashboard panels. */}
    </div>
  )
}

export default Dashboard
