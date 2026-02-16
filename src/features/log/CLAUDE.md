# Log Feature

Log page with filterable entry list. Exports its public API via `index.ts` barrel.

## Hooks

- **`useLogFilters.ts`** — Filter state, filtered entries, active filter count, chip generation. Manages type filter (all/activity/food), category multi-select, and item multi-select filters.

## Components

- **`LogPage.tsx`** — Presentational shell: title + entry count, segment-style type filter on page background (no card container), filter icon top-right opening a BottomSheet with category/item multi-select filters. Active filters shown as removable chips.

## Design Notes

- Minimal layout. Entry list uses grouped flat rows (no individual card styling).
- Swipe-left for edit/delete actions, tap row to edit in a BottomSheet.
- Date headers are sticky, uppercase, muted.
- Uses `EntryList` from `@/features/tracking` for the actual entry display.
- Entry rows show a star icon for favoriting/unfavoriting items.

## Tests

- `__tests__/log-filters.test.ts` — Filter pipeline composition + type-change cleanup
