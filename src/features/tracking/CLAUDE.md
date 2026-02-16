# Tracking Feature

Core entry/item/category logic. This is the foundational feature used by most other features. Exports its public API via `index.ts` barrel.

## Utils

- **`entry-filters.ts`** — `filterEntriesByDateRange`, `byType`, `byItem`, `byCategory`, etc.
- **`entry-grouping.ts`** — `getEntriesGroupedByDate`, `countByItem`, month comparisons, weekly totals, etc.
- **`category-utils.ts`** — `getEntryCategoryIds` (resolves category overrides), `getCategoryNameById`, `getEntryCategoryNames`, `getCategorySentimentCounts`.

### Category Overrides

Entries can override their item's default categories via `categoryOverrides`. Always use `getEntryCategoryIds()` to get effective categories — it checks overrides first, then falls back to the item's defaults.

### Category Sentiment

Each category has a `sentiment` property (`'positive' | 'neutral' | 'limit'`). `getCategorySentimentCounts()` computes positive/limit counts for display. The `CategoryLine` component renders sentiment indicators: green `+` for positive, red `−` for limit (positives first).

## Hooks

- **`useSwipeGesture.ts`** — Touch-based swipe-left logic to reveal Edit (blue) and Delete (red) action buttons. Uses a 70px threshold. Returns `swipedEntryId`, `swipeOffset`, touch handlers, `resetSwipe`, and `handleRowTap`. Used by EntryList, ItemsTab, and CategoriesTab.

## Components

- **`EntryList.tsx`** — Grouped-by-date entry display with swipe actions + edit sheet. Date headers are sticky, uppercase, muted. Uses `BottomSheet` for editing entries. Tap row to edit.
- **`CategoryLine.tsx`** — Shared category display with sentiment indicators (green `+`, red `−`). Used on item/entry rows across Log and Library pages.
- **`CategoryPicker.tsx`** — Multi-select category chips with inline creation. New categories created inline default to neutral sentiment.

## Entry Sorting

Within each day, entries sort by time (latest first); entries without time come after entries with time.

## Tests

- `__tests__/entry-filters.test.ts`
- `__tests__/entry-grouping.test.ts`
- `__tests__/category-utils.test.ts`
