# Home Feature

Home page with quick-log and daily balance score.

## Layout

`HomePage` uses a **flex column full-height layout** (`flex flex-col h-full`):

1. **Non-scrolling header** (`flex-shrink-0`): page title + refresh button, search input (`QuickLogForm` search slot), and `DailyBalanceScore` — in that top-to-bottom order.
2. **Scrollable list** (`flex-1 min-h-0 overflow-y-auto`): favorites / recent items list (`QuickLogForm` items slot).

`QuickLogForm` is used via its render prop to extract the search input and items list into the correct layout positions, while keeping all quick-log state inside `QuickLogForm`.

## Components

- **`HomePage.tsx`** — Composes `QuickLogForm` (via render prop) and `DailyBalanceScore`. Handles URL-based quick logging and Gist sync refresh button.
- **`DailyBalanceScore.tsx`** — Today's food sentiment balance percentage with animated progress bar and `SentimentPills`. Returns `null` if no food entries today.

## URL-Based Quick Logging

The Home page reads `?add=itemName` from the URL to instantly log an entry for a matching item name. Feedback is shown via toast.
