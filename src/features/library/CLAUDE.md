# Library Feature

Library page for item & category CRUD management. Compact card list with inline action icon buttons (edit/delete) on each row, tap-to-edit via BottomSheet, and a `+` icon button in the header for adding.

## Components

- **`LibraryPage.tsx`** — Layout shell with header, segment controls (Items/Categories tabs), and search bar.
- **`ItemsTab.tsx`** — Item list with inline action buttons (favorite star, edit, delete) + add/edit BottomSheets. Uses `CategoryPicker` for category assignment. Edit sheet includes "Merge into..." button.
- **`CategoriesTab.tsx`** — Category list with inline action buttons (edit, delete) + add/edit BottomSheets. Non-neutral sentiments display as colored badges (green for positive, red for limit) next to the category name. Edit sheet includes "Merge into..." button.
- **`SentimentPicker.tsx`** — Positive/neutral/limit radio group for setting category sentiment when creating or editing categories.
- **`MergeTargetSheet.tsx`** — BottomSheet with search input for selecting a merge target. Used by both items and categories.
- **`MergeConfirmSheet.tsx`** — BottomSheet showing merge summary (affected counts), optional note input (items only), and confirm/cancel buttons.

## Hooks

- **`useLibraryForm`** — Shared hook used by both `ItemsTab` and `CategoriesTab` for the add/edit/delete sheet lifecycle. Manages form fields, editing entity, deleting state, and form reset on sheet open. Generic over entity type (`TEditing`), form fields (`TFields`), and deleting state (`TDeleting`).
- **`useMergeFlow`** — State machine hook for the merge flow (idle → selectingTarget → confirming → idle). Used by both `ItemsTab` and `CategoriesTab`.

## Utils

- **`merge-utils.ts`** — Pure functions for computing merge preview counts: `countAffectedEntriesForItemMerge()`, `countAffectedForCategoryMerge()`.

## Design Notes

- Items can be favorited/unfavorited via a star icon button (uses `toggleFavorite()` from store).
- Adding a new item/category uses a `+` icon button in the page header.
- **Merge flow**: Edit sheet → "Merge into..." button → close edit sheet → MergeTargetSheet (search/select) → MergeConfirmSheet (summary + optional note) → execute merge via `mergeItem()`/`mergeCategory()` from store → toast notification.
