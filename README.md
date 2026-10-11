# Macro Tracker

A personal calorie and macro tracking app built with React, TypeScript, and Vite.

The starting dashboard has Daily, Weekly, and Stored Foods tabs styled with
Tailwind CSS. Daily opens by default. Select a tab with a click or use the arrow
keys, Home, and End while a tab is focused.

The Daily tab displays calories, protein, carbs, and fats. Use **+ Add food** to
enter calories in kcal and macros in grams. A food name is optional. Added foods
appear below the totals and are saved in the browser with Dexie, so they remain
after a refresh. Daily totals are calculated from foods logged on the current
local calendar day.

The Weekly tab shows the current Monday-Sunday week with blue daily calorie
bars and grouped protein, carb, and fat bars. Protein is green, carbs are amber,
and fats are purple. Daily averages include all seven days, counting days
without entries as zero. Charts refresh when diary entries are added or
removed. Hover over a bar for its value, or expand **View daily totals** for
the full table. Charts use SVG without an additional chart library.

The Stored Foods tab has two sections:

- **Base foods:** choose **Fixed serving** for a repeatable unit, such as 1 egg
  or 1 tortilla, or **By weight (grams)** to save nutrition per a reference
  weight, such as 100 g of rice. The reference can be any positive gram amount.
- **Meals:** combine base foods and quantities, such as 3 eggs plus 1 tortilla
  and 25 g of cheese. Ingredient amounts use serving counts for fixed foods and
  grams for weight-based foods. A meal's nutrition is calculated from its ingredients.

Use the **×** on a base food or meal row to delete it from the library. If a base
food is still used by a saved meal, delete that meal first; the app lists the
meals that need it. Library deletions do not remove previously logged diary entries.

The Daily add-food dropdown groups **Base foods** and **Meals** separately.
Choose either and enter a quantity to log servings, grams, or whole meals,
including fractional amounts. For example, 124 g of a food saved per 100 g uses
1.24 times its saved calories and macros. Nutrition is calculated automatically. Manual entry is
also available. Each diary entry stores its nutrition at the time it is added,
so later changes to the library do not alter past daily totals.

Foods and meals are saved in the browser with Dexie. Existing foods without a
serving type continue to use fixed servings, and old recipes retain their
serving counts. The serving metadata does not change database indexes, so no
database upgrade is needed for weight-based foods.

## Development

```sh
npm install
npm run dev
```

## Checks and production build

```sh
npm run lint
npm test
npm run build
npm run preview
```

The production build is written to `dist/`. `npm run preview` serves that build
locally.
