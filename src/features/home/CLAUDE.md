# Home Feature

Home page orchestrating quick-log and monthly stats.

## Components

- **`HomePage.tsx`** — Composes `QuickLogForm` from `@/features/quick-log` with monthly stats summary.

## URL-Based Quick Logging

The Home page reads `?add=itemName` from the URL to instantly log an entry for a matching item name. Feedback is shown via toast.
