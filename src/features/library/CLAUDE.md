# Library Feature

Library page for item & category CRUD management. Compact card list with inline action icon buttons (favorite/edit/delete on items, edit/delete on categories), cross-type listing (activity + food), and a `+` icon button in the header for adding.

## Components

- **`LibraryPage.tsx`** — Layout shell with header, Items/Categories segmented control, unified cross-type search, and add button. Activity/Food top-level segmented control was removed from the page list UI.
- **`ItemsTab.tsx`** — Item list across both activity and food types with sentiment accent dot, type pill, and default-category sentiment pills. Row tap navigates to `/stats/item/:itemId`; inline favorite/edit/delete icon buttons are preserved. Add/edit BottomSheets include an in-sheet type picker (`TypeSegmentedPicker`) and use `CategoryPicker` for category assignment. Edit sheet includes "Merge into..." button.
- **`CategoriesTab.tsx`** — Category list across both activity and food types with sentiment dot + type pill metadata. Row tap navigates to `/stats/category/:categoryId`; inline edit/delete icon buttons are preserved. Add/edit BottomSheets include an in-sheet type picker (`TypeSegmentedPicker`). Edit sheet includes "Merge into..." button.
- **`SentimentPicker.tsx`** — Positive/neutral/limit radio group for setting category sentiment when creating or editing categories.
- **`TypeSegmentedPicker.tsx`** — Shared activity/food segmented picker used by both item and category add/edit sheets, with translated labels from `common:type.*`.
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

- List rows that navigate to stats detail pages are keyboard-accessible (`role="button"`, `tabIndex=0`, Enter/Space support) while keeping inline edit/delete/favorite icon buttons.
