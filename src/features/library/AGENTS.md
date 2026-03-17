# Library Feature

Library page for item & category CRUD management. Compact card list with inline action icon buttons (favorite/edit/delete on items, edit/delete on categories), cross-type listing (activity + food), and a `+` icon button in the header for adding.

## Components

- **`LibraryPage.tsx`** — Layout shell with header, Items/Categories segmented control, unified cross-type search, and add button. It builds the typed cross-type item/category lists once and shares library lookup maps (`useLibraryIndexes`) with the active tab. The top-level search uses shared `SearchField` so it matches Home quick-log styling. Supports deep-link edit intents via query params (`?tab=...&edit=item|category&id=...`) and forwards them to the matching tab so the edit sheet opens automatically.
- **`ItemsTab.tsx`** — Item list across both activity and food types with sentiment accent dot and default-category sentiment pills. Row tap navigates to `/stats/item/:itemId`; inline favorite/edit/delete icon buttons are preserved. Add/edit BottomSheets include an in-sheet type picker (`TypeSegmentedPicker`) and use `CategoryPicker` for category assignment. Edit sheet includes "Merge into..." button. Row view models are precomputed from library lookup maps so render no longer performs repeated category lookups or repeated favorite checks through the store facade.
- **`CategoriesTab.tsx`** — Category list across both activity and food types with sentiment dot metadata. Row tap navigates to `/stats/category/:categoryId`; inline edit/delete icon buttons are preserved. Add/edit BottomSheets include an in-sheet type picker (`TypeSegmentedPicker`). Edit sheet includes "Merge into..." button. Per-row item counts and merge previews use precomputed category→item-count maps instead of scanning the full item list.
- **`SentimentPicker.tsx`** — Positive/neutral/limit radio group for setting category sentiment when creating or editing categories.
- **`TypeSegmentedPicker.tsx`** — Thin wrapper around shared `SegmentedControl` for the activity/food picker used by both item and category add/edit sheets, with translated labels from `common:type.*`.
- **`MergeTargetSheet.tsx`** — BottomSheet with search input for selecting a merge target. Used by both items and categories.
- **`MergeConfirmSheet.tsx`** — BottomSheet showing merge summary (affected counts), optional note input (items only), and confirm/cancel buttons.

## Hooks

- **`useLibraryForm`** — Shared hook used by both `ItemsTab` and `CategoriesTab` for the add/edit/delete sheet lifecycle. Manages form fields, editing entity, deleting state, and form reset on sheet open. Generic over entity type (`TEditing`), form fields (`TFields`), and deleting state (`TDeleting`).
- **`useLibraryEntityManager`** — Library-scoped scaffold that composes `useLibraryForm` and `useMergeFlow` into shared add/edit/delete/merge orchestration for both tabs. Tab-specific CRUD callbacks and delete payload shaping are passed in, but the flow sequencing stays centralized.
- **`useMergeFlow`** — State machine hook for the merge flow (idle → selectingTarget → confirming → idle). Used by both `ItemsTab` and `CategoriesTab`.
- **`use-library-indexes.ts`** — Store-backed hook for library lookup maps: categories by ID, categories by type, favorite item ID set, and item counts by category ID.

## Utils

- **`library-indexes.ts`** — Pure builders for typed cross-type items/categories plus reusable lookup maps exported through `@/features/library`.
- **`merge-utils.ts`** — Pure functions for computing merge preview counts: `countAffectedEntriesForItemMerge()`, `countAffectedEntryOverridesForCategoryMerge()`, `countAffectedForCategoryMerge()`.

## Tests

- `__tests__/library-indexes.test.tsx` — Lookup builder and hook coverage for categories-by-ID/type, favorite ID sets, and category item counts.
- `components/__tests__/ItemsTab.test.tsx` and `components/__tests__/CategoriesTab.test.tsx` also cover deep-link query edit intents opening the corresponding edit sheets.
- `components/__tests__/ItemsTab.test.tsx` — Regression coverage for item add/edit/merge/delete wiring through `LibraryPage`.
- `components/__tests__/CategoriesTab.test.tsx` — Regression coverage for category add/edit/merge/delete wiring through `LibraryPage`.
- `e2e/library.spec.ts` — Seeded cross-type item/category rendering, item edit/delete/favorite sync, item/category merge flows, category add/edit/delete with sentiment persistence, library search filtering, and add-item coverage through Home search using the Playwright mocked-storage harness.

## Design Notes

- Items can be favorited/unfavorited via a star icon button (uses `toggleFavorite()` from store).
- Adding a new item/category uses a `+` icon button in the page header.
- **Merge flow**: Edit sheet → "Merge into..." button → close edit sheet → MergeTargetSheet (search/select) → MergeConfirmSheet (summary + optional note) → execute merge via `mergeItem()`/`mergeCategory()` from store → toast notification.
- Row titles use smaller text and clamp to two lines (ellipsis) for long names in both items and categories lists.

- List rows that navigate to stats detail pages are keyboard-accessible (`role="button"`, `tabIndex=0`, Enter/Space support) while keeping inline edit/delete/favorite icon buttons.

## Row Actions

- Item/category row actions use circular, color-coded icon buttons: add (blue), edit (warning), delete (danger).
