# Quick Log Feature

Command-palette style quick logging used on the Home page. Exports its public API via `index.ts` barrel.

## Architecture

Business logic is extracted into hooks; `QuickLogForm` is a presentational component wiring hooks to UI.

## Hooks

- **`useQuickLogSearch.ts`** — Search query state, filtered results, favorites list. Merges activity and food items for unified search.
- **`useQuickLogForm.ts`** — Form state, submit handlers, create-vs-log mode, instant quick-log. Handles both creating new items and logging existing ones.

## Components

- **`QuickLogForm.tsx`** — Presentational: borderless search input at top, inline search results, favorites list. Tapping an item opens a BottomSheet with date+time (defaulting to today/now), categories, and note. Tapping "Create" opens BottomSheet with type selector. The Log/Create action button sits in the sheet header (top-right, small rounded pill) via `headerAction` prop.

## UX Flow

- Fast path: open → type → tap → Log (3 interactions). No blocking modals, no collapsible sections.
- **Instant quick-log (Zap)**: Favorite items have a Zap icon button. Tapping it creates an entry with today's date and current time immediately (no sheet), with an undo toast.
- Favorites show instead of recent items on the Home page.

## Tests

- `__tests__/quick-log-search.test.ts` — Search, merge, favorites logic
- `__tests__/quick-log-form.test.ts` — Instant quick-log entry creation
