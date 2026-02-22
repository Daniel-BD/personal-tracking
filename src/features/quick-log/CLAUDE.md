# Quick Log Feature

Command-palette style quick logging used on the Home page. Exports its public API via `index.ts` barrel.

## Architecture

Business logic is extracted into hooks; the components are presentational, wiring hook state to UI.

`QuickLogForm` uses a **render prop** (`children`) to let the parent (`HomePage`) control layout placement of the search input and items list while keeping all state internal. When no `children` is passed, it renders both parts in a simple stacked layout.

## Hooks

- **`useQuickLogSearch.ts`** — Search query state, filtered results, favorites list, and recent items list. Merges activity and food items for unified search. Takes `activityItems`, `foodItems`, `favoriteIds`, and `entries` as arguments. Returns `favoriteItemsList` (ordered by favorite IDs) and `recentItemsList` (20 most recently logged unique items, sorted by date+time desc).
- **`useQuickLogForm.ts`** — Form state, submit handlers, create-vs-log mode, instant quick-log. Handles both creating new items and logging existing ones.

## Components

- **`QuickLogForm.tsx`** — Orchestrator: uses both hooks, renders `QuickLogSearchInput` + `QuickLogItemsList` + BottomSheet. Accepts an optional `children` render prop `(slots: { searchInput, itemsList }) => ReactNode` to let parent components position the slots within a custom layout.
- **`QuickLogSearchInput.tsx`** — Borderless search input with dropdown results. Accepts search state as props. Contains the blur-delay logic for dropdown click handling.
- **`QuickLogItemsList.tsx`** — Favorites / Recent segmented list. Has internal `tab` state ('favorites' | 'recent'). Favorites show a star toggle button; recent items show a spacer in place of the star. Both rows use `QuickLogButton` for instant quick-log.
- **`QuickLogButton.tsx`** — Animated Zap icon button with a 5-phase microinteraction (press → spring snap → glow/burst/sparks → confirmation flash). Uses Motion's `useAnimate` (WAAPI-based) for all animations; CSS in `app.css` only provides static positioning for effect layers (`.ql-glow`, `.ql-burst`, `.ql-spark`, `.ql-flash-overlay`). Prevents double-clicks during animation via a ref guard. Respects `prefers-reduced-motion` via Motion's `useReducedMotion` hook.

## UX Flow

- Fast path: open → type → tap → Log (3 interactions). No blocking modals, no collapsible sections.
- **Instant quick-log (Zap)**: Items in both the Favorites and Recent tabs have a Zap icon button. Tapping it creates an entry with today's date and current time immediately (no sheet), with an undo toast.
- **Favorites tab** (default): shows items in favorite order, with star button to remove.
- **Recent tab**: shows the 20 most recently logged unique items, no star button.

## Tests

- `__tests__/quick-log-search.test.ts` — Search, merge, favorites logic
- `__tests__/quick-log-form.test.ts` — Instant quick-log entry creation
- `__tests__/quick-log-button.test.tsx` — QuickLogButton rendering, click handling, double-click prevention, effect layers (mocks `motion/react`)
