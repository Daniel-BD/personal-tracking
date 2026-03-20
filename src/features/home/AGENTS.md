# Home Feature

Home page with quick-log and daily balance score.

## Layout

`HomePage` uses a **flex column fill layout** (`flex flex-1 flex-col min-h-0`) inside the app shell's route wrapper:

1. **Non-scrolling header** (`flex-shrink-0`): page title + refresh button, search input (`QuickLogForm` search slot), and `DailyBalanceScore` — in that top-to-bottom order.
2. **Scrollable list** (`flex-1 min-h-0 overflow-y-auto`): favorites / recent items list (`QuickLogForm` items slot).

The browser document owns page scrolling at the shell level. Home keeps only the favorites/recent list as an internal scroll region so the quick-log header stays pinned within the visible page area above the fixed bottom nav.

`QuickLogForm` is used via its render prop to extract the search input and items list into the correct layout positions, while keeping all quick-log state inside `QuickLogForm`.

## Components

- **`HomePage.tsx`** — Composes `QuickLogForm` (via render prop) and `DailyBalanceScore`. Handles Gist sync refresh button.
- **`DailyBalanceScore.tsx`** — Today's food sentiment balance percentage. Delegates the animated score row, gradient meter, and sentiment pills to shared `BalanceScoreMeter` and returns `null` if no food entries today.

## Tests

- `e2e/quick-log.spec.ts` — Home-route quick-log coverage for Favorites/Recent tab behavior, instant-log undo, Recent reordering, search/result-sheet flows, manual refresh sync-state transitions, and the setup-required warning when sync config is absent.
