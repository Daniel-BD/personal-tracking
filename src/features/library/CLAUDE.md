# Library Feature

Library page for item & category CRUD management. Visually aligned with the Log page — compact card list with swipe-left actions (edit/delete), tap-to-edit via BottomSheet, and a `+` icon button in the header for adding.

## Components

- **`LibraryPage.tsx`** — Layout shell with header, segment controls (Items/Categories tabs), and search bar.
- **`ItemsTab.tsx`** — Item list with swipe gestures + add/edit BottomSheets. Uses `CategoryPicker` for category assignment. Star icon for toggling favorites. Edit sheet includes "Merge into..." button.
- **`CategoriesTab.tsx`** — Category list with swipe gestures + add/edit BottomSheets. Non-neutral sentiments display as colored badges (green for positive, red for limit) next to the category name. Edit sheet includes "Merge into..." button.
- **`SentimentPicker.tsx`** — Positive/neutral/limit radio group for setting category sentiment when creating or editing categories.
- **`MergeTargetSheet.tsx`** — BottomSheet with search input for selecting a merge target. Used by both items and categories.
- **`MergeConfirmSheet.tsx`** — BottomSheet showing merge summary (affected counts), optional note input (items only), and confirm/cancel buttons.

## Hooks

- **`useLibraryForm`** — Shared hook used by both `ItemsTab` and `CategoriesTab` for the add/edit/delete sheet lifecycle. Manages form fields, editing entity, deleting state, and form reset on sheet open. Generic over entity type (`TEditing`), form fields (`TFields`), and deleting state (`TDeleting`).
- **`useMergeFlow`** — State machine hook for the merge flow (idle → selectingTarget → confirming → idle). Used by both `ItemsTab` and `CategoriesTab`.

## Utils

- **`merge-utils.ts`** — Pure functions for computing merge preview counts: `countAffectedEntriesForItemMerge()`, `countAffectedForCategoryMerge()`.

## Design Notes

- Uses `useSwipeGesture` from `@/features/tracking` for swipe-left actions (matching Log page behavior).
- Items can be favorited/unfavorited via a star icon (uses `toggleFavorite()` from store).
- Adding a new item/category uses a `+` icon button in the page header.
- **Merge flow**: Edit sheet → "Merge into..." button → close edit sheet → MergeTargetSheet (search/select) → MergeConfirmSheet (summary + optional note) → execute merge via `mergeItem()`/`mergeCategory()` from store → toast notification.
