# Tracking Feature

Core entry/item/category logic. This is the foundational feature used by most other features. Exports its public API via `index.ts` barrel.

## Utils

- **`entry-filters.ts`** — `filterEntriesByDateRange`, `byType`, `byItem`, `byCategory`, etc.
- **`entry-grouping.ts`** — `getEntriesGroupedByDate`, `countByItem`, month comparisons, weekly totals, etc.
- **`category-utils.ts`** — `getEntryCategoryIds` (resolves category overrides), `getCategoryNameById`, `getEntryCategoryNames`, `getCategorySentimentCounts`.

### Category Overrides

Entries can override their item's default categories via `categoryOverrides`. Always use `getEntryCategoryIds()` to get effective categories — it checks overrides first, then falls back to the item's defaults.

### Category Sentiment

Each category has a `sentiment` property (`'positive' | 'neutral' | 'limit'`). `getCategorySentimentCounts()` computes positive/limit counts for display. The `CategoryLine` component now renders sentiment-colored category pills (wrapping to multiple rows when needed), sorted as positive → limit → neutral.

## Components

- **`EntryList.tsx`** — Grouped-by-date entry display with inline quick-add, edit, and delete icon buttons on each row. Date headers are sticky, uppercase, muted. Uses `BottomSheet` for editing entries. Tap row to navigate to item detail.
- Entry row titles use smaller text and clamp to two lines with ellipsis to avoid overlapping action buttons.
- **`CategoryLine.tsx`** — Shared category display with sentiment-colored pills (wrapping rows). Used on item/entry rows.
- **`CategoryPicker.tsx`** — Multi-select category chips with inline creation. New categories created inline default to neutral sentiment.

## Entry Sorting

Within each day, entries sort by time (latest first); entries without time come after entries with time.

## Tests

- `__tests__/entry-filters.test.ts`
- `__tests__/entry-grouping.test.ts`
- `__tests__/category-utils.test.ts`
- `__tests__/CategoryLine.test.tsx`
