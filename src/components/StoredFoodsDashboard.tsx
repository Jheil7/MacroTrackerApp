import { useRef, useState } from 'react'
import { db, deleteStoredItem, saveStoredMeal, StoredFoodInUseError } from '../db'
import { useStoredLibrary } from '../hooks/useStoredLibrary'
import { formatQuantity } from '../lib/nutrition'
import { getMealNutrition } from '../lib/storedFoods'
import type { NutritionTotals, StoredFood, StoredFoodInput, StoredMeal, StoredMealInput } from '../types/food'
import MealForm from './MealForm'
import NutritionDetails from './NutritionDetails'
import SectionHeader from './SectionHeader'
import StoredFoodForm from './StoredFoodForm'

function StoredFoodsDashboard() {
  // Start: Load the library and track forms, deletion progress, feedback, and button focus.
  const { foods, meals, isLoading, error, retry } = useStoredLibrary()
  const [isAddingFood, setIsAddingFood] = useState(false)
  const [isAddingMeal, setIsAddingMeal] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [deletingItem, setDeletingItem] = useState<{ kind: 'food' | 'meal'; id: number } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const foodButtonRef = useRef<HTMLButtonElement>(null)
  const mealButtonRef = useRef<HTMLButtonElement>(null)
  // End: Library and dashboard state.

  // Start: Save base foods or meals and announce successful saves.
  async function saveFood(food: StoredFoodInput) {
    await db.storedFoods.add({ ...food, createdAt: Date.now() })
    setAnnouncement(`${food.name} saved as a base food.`)
  }

  async function saveMeal(meal: StoredMealInput) {
    await saveStoredMeal(meal)
    setAnnouncement(`${meal.name} saved as a meal.`)
  }
  // End: Persistence handlers.

  // Start: Delete a stored item, announce success, and report protected ingredients or save failures.
  async function handleDeleteItem(kind: 'food' | 'meal', item: StoredFood | StoredMeal) {
    if (deletingItem !== null) return
    setDeletingItem({ kind, id: item.id })
    setDeleteError(null)
    setAnnouncement('')

    try {
      await deleteStoredItem(kind, item.id)
      setAnnouncement(`${item.name} deleted from ${kind === 'food' ? 'base foods' : 'meals'}.`)
      const addButton = kind === 'meal' && foods.length > 0 ? mealButtonRef : foodButtonRef
      addButton.current?.focus()
    } catch (cause) {
      setDeleteError(cause instanceof StoredFoodInUseError
        ? `${item.name} could not be deleted. ${cause.message}`
        : `Could not delete ${item.name}. Please try again.`)
    } finally {
      setDeletingItem(null)
    }
  }
  // End: Library deletion and error handling.

  // Start: Close each form and return keyboard focus to its add button.
  function closeFoodForm() {
    setIsAddingFood(false)
    foodButtonRef.current?.focus()
  }

  function closeMealForm() {
    setIsAddingMeal(false)
    mealButtonRef.current?.focus()
  }
  // End: Form close handlers.

  // Start: Handle initial loading and provide a retry if the library query fails.
  if (isLoading) {
    return <p role="status" className="mt-5 text-sm text-slate-500">Loading stored foods...</p>
  }
  if (error) {
    return (
      <div className="mt-5">
        <p role="alert" className="text-sm text-red-700">{error}</p>
        <button type="button" onClick={retry} className="mt-3 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">Try again</button>
      </div>
    )
  }
  // End: Loading and error views.

  return (
    <div className="mt-6 space-y-8">
      {/* Start: Announce successful saves/deletions and show any deletion errors. */}
      <p role="status" className="sr-only">{announcement}</p>
      {deleteError && <p role="alert" className="text-sm text-red-700">{deleteError}</p>}
      {/* End: Library change feedback. */}

      {/* Start: Base food header, creation form, and a full-width list with aligned nutrition columns. */}
      <section aria-labelledby="base-foods-heading">
        <SectionHeader id="base-foods-heading" title="Base foods"
          description="Save nutrition for a fixed serving, such as 1 egg, or a reference weight, such as 100 g of rice.">
          <button ref={foodButtonRef} type="button" aria-expanded={isAddingFood}
            aria-controls={isAddingFood ? 'stored-food-form' : undefined}
            onClick={() => { setAnnouncement(''); setDeleteError(null); setIsAddingFood(true) }}
            className="cursor-pointer rounded-lg bg-blue-700 px-3 py-2.5 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            + Add base food
          </button>
        </SectionHeader>
        {isAddingFood && <StoredFoodForm onSave={saveFood} onClose={closeFoodForm} />}
        {foods.length === 0 ? <p className="mt-4 text-sm text-slate-500">No base foods saved yet.</p> : (
          <ul aria-label="Saved base foods" className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-slate-50/50">
            {foods.map((food) => (
              <li key={food.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]">
                {/* Start: Keep the food name and serving details together at the start of the row. */}
                <div className="min-w-0">
                  <h4 className="text-sm font-medium break-words">{food.name}</h4>
                  <p className="mt-0.5 text-xs break-words text-slate-500">
                    {food.servingMode === 'weight' ? 'By weight' : 'Fixed serving'} - Per {food.serving}
                  </p>
                </div>
                {/* End: Food name and serving. */}

                {/* Start: Align macros beside the name on wider screens and beneath it on smaller screens. */}
                <div className="col-span-2 col-start-1 row-start-2 min-w-0 md:col-span-1 md:col-start-2 md:row-start-1">
                  <NutritionDetails nutrition={food} layout="columns" />
                </div>
                {/* End: Row nutrition. */}

                {/* Start: Keep the accessible delete button at the right edge, with progress feedback. */}
                <button type="button" onClick={() => handleDeleteItem('food', food)}
                  disabled={deletingItem !== null}
                  aria-label={`Delete ${food.name} base food`}
                  aria-busy={deletingItem?.kind === 'food' && deletingItem.id === food.id}
                  title="Delete base food"
                  className="col-start-2 row-start-1 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-2xl text-slate-500 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-wait disabled:opacity-50 md:col-start-3">
                  <span aria-hidden="true">{deletingItem?.kind === 'food' && deletingItem.id === food.id ? '...' : '×'}</span>
                </button>
                {/* End: Base food delete button. */}
              </li>
            ))}
          </ul>
        )}
      </section>
      {/* End: Base foods section. */}

      {/* Start: Meal header, recipe form, and compact rows with nutrition and inline ingredient lists. */}
      <section aria-labelledby="stored-meals-heading" className="border-t border-slate-200 pt-6">
        <SectionHeader id="stored-meals-heading" title="Meals"
          description="Combine base foods using serving counts or grams into a reusable meal.">
          <button ref={mealButtonRef} type="button" disabled={foods.length === 0}
            aria-expanded={isAddingMeal} aria-controls={isAddingMeal ? 'stored-meal-form' : undefined}
            aria-describedby={foods.length === 0 ? 'meal-prerequisite' : undefined}
            onClick={() => { setAnnouncement(''); setDeleteError(null); setIsAddingMeal(true) }}
            className="cursor-pointer rounded-lg bg-blue-700 px-3 py-2.5 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-default disabled:bg-slate-200 disabled:text-slate-500">
            + Add meal
          </button>
        </SectionHeader>
        {foods.length === 0 && <p id="meal-prerequisite" className="mt-2 text-sm text-slate-500">Save a base food first to build a meal.</p>}
        {isAddingMeal && <MealForm foods={foods} onSave={saveMeal} onClose={closeMealForm} />}
        {meals.length === 0 ? <p className="mt-4 text-sm text-slate-500">No meals saved yet.</p> : (
          <ul aria-label="Saved meals" className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-slate-50/50">
            {meals.map((meal) => {
              // Start: Calculate this meal's totals and report missing or invalid ingredients.
              let nutrition: NutritionTotals | null = null
              let mealError: string | null = null
              try {
                nutrition = getMealNutrition(meal, foods)
              } catch (cause) {
                mealError = cause instanceof Error ? cause.message : 'Could not calculate this meal.'
              }
              // End: Meal nutrition and error handling.
              return (
                <li key={meal.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]">
                  {/* Start: Identify the meal and clarify that the displayed nutrition covers the whole meal. */}
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium break-words">{meal.name}</h4>
                    <p className="mt-0.5 text-xs text-slate-500">Nutrition for the whole meal.</p>
                  </div>
                  {/* End: Meal name and nutrition context. */}

                  {/* Start: Align meal totals with the same macro columns used by base food rows. */}
                  <div className="col-span-2 col-start-1 row-start-2 min-w-0 md:col-span-1 md:col-start-2 md:row-start-1">
                    {nutrition ? <NutritionDetails nutrition={nutrition} layout="columns" /> : <p className="text-sm text-red-700">{mealError}</p>}
                  </div>
                  {/* End: Meal row nutrition or error. */}

                  {/* Start: Keep the accessible meal delete button at the right edge of the row. */}
                  <button type="button" onClick={() => handleDeleteItem('meal', meal)}
                    disabled={deletingItem !== null}
                    aria-label={`Delete ${meal.name} meal`}
                    aria-busy={deletingItem?.kind === 'meal' && deletingItem.id === meal.id}
                    title="Delete meal"
                    className="col-start-2 row-start-1 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-2xl text-slate-500 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-wait disabled:opacity-50 md:col-start-3">
                    <span aria-hidden="true">{deletingItem?.kind === 'meal' && deletingItem.id === meal.id ? '...' : '×'}</span>
                  </button>
                  {/* End: Meal delete button. */}

                  {/* Start: Let ingredient details run across the full row and wrap without hiding any values. */}
                  <ul aria-label={`${meal.name} ingredients`} className="col-span-2 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 md:col-span-3">
                    {meal.ingredients.map((ingredient) => {
                      const food = foods.find((item) => item.id === ingredient.foodId)
                      return (
                        <li key={ingredient.foodId} className="min-w-0 break-words">
                          {ingredient.unit === 'g'
                            ? `${formatQuantity(ingredient.quantity)} g of ${food?.name ?? 'Missing base food'}`
                            : `${formatQuantity(ingredient.quantity)} x ${food ? `${food.name} (${food.serving})` : 'Missing base food'}`}
                        </li>
                      )
                    })}
                  </ul>
                  {/* End: Inline meal ingredients. */}
                </li>
              )
            })}
          </ul>
        )}
      </section>
      {/* End: Meals section. */}
    </div>
  )
}

export default StoredFoodsDashboard
