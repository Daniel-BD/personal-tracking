# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Workflow Rules

- **Always verify changes build successfully** before considering a task complete. Run `npm run build` after making changes and fix any errors before finishing.
- **Always update this CLAUDE.md file** when making changes to the codebase (new components, changed patterns, modified architecture, renamed files, etc.) so it continues to accurately reflect the actual code.
- You may need to run `npm install` first if `node_modules` is missing.

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build (tsc + vite build — always run before finishing)
npm run preview      # Preview production build
```

No test framework is configured — there are no unit or integration tests.

## Project Overview

A personal activity and food tracking PWA built for mobile-first usage. Users log activities and food items with dates, times, notes, and categories. Data persists in LocalStorage and optionally syncs to GitHub Gist for backup. Includes a Stats page focused on food-category sentiment analysis (balance scores, category composition, goal tracking).

## Tech Stack

- **Framework**: React 19 with React Router 7
- **Styling**: Tailwind CSS v4 (Vite plugin, not PostCSS)
- **Language**: TypeScript (strict mode)
- **Build**: Vite 7
- **Charting**: Recharts 3 (used on Stats page for sparklines, bar charts, and stacked charts)
- **Storage**: LocalStorage (source of truth) + optional GitHub Gist sync (backup only)

## Architecture

### Data Flow

All data lives in a single `TrackerData` object containing items, categories, entries, and dashboard cards for both activity and food types. The architecture follows this pattern:

1. **`src/lib/types.ts`** — Data interfaces (`Entry`, `ActivityItem`, `FoodItem`, `Category`, `TrackerData`, `DashboardCard`) and utility functions (`generateId()`, `getTodayDate()`, `getCurrentTime()`, collection accessor helpers like `getItems()`, `getCategories()`).
2. **`src/lib/store.ts`** — Singleton external store with `useSyncExternalStore`-compatible API (`dataStore`, `syncStatusStore`). All CRUD operations (items, categories, entries, dashboard cards), Gist sync/merge logic, and export/import live here. Every data mutation goes through this file.
3. **`src/lib/hooks.ts`** — React hooks (`useTrackerData()`, `useSyncStatus()`, `useIsMobile()`) that wrap the external store or browser APIs for use in components.
4. **`src/lib/analysis.ts`** — Pure functions for date filtering, statistics, comparisons, time-series generation, and entity analytics. No side effects. Also contains chart data utilities (grouping by day/week/month, rolling averages, cumulative series).
5. **`src/lib/stats.ts`** — Weekly food-analytics engine. Processes food entries by week, calculates balance scores (positive vs. limit sentiment), builds category composition data, and computes actionable category rankings (top limit categories, lagging positive categories).
6. **`src/lib/github.ts`** — GitHub Gist API integration for backup sync.
7. **`src/lib/theme.ts`** — Theme preference management (light/dark/system).

### Key Patterns

- **Two parallel type hierarchies**: Activity and food share identical structures (`ActivityItem`/`FoodItem`, separate category lists) but are kept separate throughout. Functions often take an `EntryType` ('activity' | 'food') parameter to select the right list.
- **Category overrides**: Entries can override their item's default categories via `categoryOverrides`. Use `getEntryCategoryIds()` from `analysis.ts` to get effective categories.
- **Category sentiment**: Each category has a `sentiment` property (`'positive' | 'neutral' | 'limit'`, defined as `CategorySentiment` in `types.ts`). Defaults to `'neutral'`. Set via a `SentimentPicker` in the Library page when creating or editing categories. Categories created inline via `CategoryPicker` default to neutral. Non-neutral sentiments display as colored badges (green for positive, red for limit) next to the category name. Existing data without the field is handled via `?? 'neutral'` fallback.
- **External store pattern**: Instead of React Context, the store uses a module-level singleton with `useSyncExternalStore` for reactivity. This allows store functions (CRUD operations) to be called from anywhere without prop drilling.
- **Dashboard cards**: `TrackerData.dashboardCards` stores user-configured goal cards (each tied to a `categoryId`). Cards compare this week's count against a rolling 4-week baseline average. CRUD operations: `addDashboardCard()`, `removeDashboardCard()` in `store.ts`.
- **Toast system**: `showToast()` from `components/Toast.tsx` is a module-level function (no provider needed). Toasts auto-dismiss after 3.5s and optionally include an action button. Used for Quick Log success feedback (with Undo action) and URL-based quick logging.
- **URL-based quick logging**: The Home page reads `?add=itemName` from the URL to instantly log an entry for a matching item name. Feedback is shown via toast.
- **Bottom sheet pattern**: `BottomSheet` component provides a slide-up sheet (~85vh max) with backdrop, handle bar, and escape-to-close. Used by Quick Log for the Create+Log flow. Locks body scroll when open.
- **Quick Log flow**: Command-palette style — borderless search input at top, inline search results, recent items list (last 5 unique from entries). Tapping an item or "Create" opens a BottomSheet with type selector (create mode), date, collapsible optional details (time/categories/note), and a Log button. No blocking modals. Fast path: open → type → tap → Log (3 interactions).

### Routes

- `/` — Home page with command-palette quick log, recent items, bottom sheet create+log, and demoted monthly stats
- `/log` — Full log view with type/category/item filtering and entry history
- `/stats` — Stats page: goal dashboard with sparkline cards, balance score, actionable categories (top limit & lagging positive), and category composition chart
- `/library` — Manage items and categories (CRUD) with search, split into Items and Categories sub-tabs
- `/settings` — Theme preferences, GitHub Gist sync configuration, export/import, and backup Gist management

Navigation uses a 5-tab bottom nav bar defined in `App.tsx` (Home, Log, Stats, Library, Settings).

### File Structure

```
src/
├── App.tsx                          # Root layout: routes + bottom nav bar + toast container
├── main.tsx                         # Entry point: BrowserRouter + StrictMode
├── app.css                          # Global CSS: color system, utility classes, dark mode
├── lib/
│   ├── types.ts                     # All TypeScript interfaces + utility functions
│   ├── store.ts                     # Singleton store: CRUD, sync, export/import, backup
│   ├── hooks.ts                     # useTrackerData, useSyncStatus, useIsMobile
│   ├── analysis.ts                  # Date filtering, analytics, chart data utilities
│   ├── stats.ts                     # Weekly food analytics, balance scores, actionable categories
│   ├── github.ts                    # GitHub Gist API client
│   └── theme.ts                     # Theme (light/dark/system) persistence + application
├── pages/
│   ├── HomePage.tsx                 # Command-palette quick log + demoted monthly stats
│   ├── LogPage.tsx                  # Filterable entry list
│   ├── StatsPage.tsx                # Stats dashboard: goals, balance, composition
│   ├── LibraryPage.tsx              # Item & category CRUD management
│   └── SettingsPage.tsx             # Theme, Gist config, export/import, backup
├── components/
│   ├── QuickLogForm.tsx             # Command-palette search + BottomSheet create/log (used on Home)
│   ├── BottomSheet.tsx              # Reusable slide-up bottom sheet with backdrop
│   ├── EntryList.tsx                # Grouped-by-date entry display with edit/delete
│   ├── UnifiedItemPicker.tsx        # Searchable item picker across activity + food (legacy, unused by Quick Log)
│   ├── ItemPicker.tsx               # Single-type item picker
│   ├── CategoryPicker.tsx           # Multi-select category chips with inline creation
│   ├── AddCategoryModal.tsx         # Modal for adding categories to dashboard
│   ├── SegmentedControl.tsx         # Generic pill/segment toggle (used throughout)
│   ├── MultiSelectFilter.tsx        # Searchable multi-select dropdown (used on Log page)
│   ├── GoalDashboard.tsx            # Dashboard card grid with add/remove
│   ├── GoalCard.tsx                 # Individual sparkline goal card (uses Recharts)
│   ├── BalanceOverview.tsx          # Balance score meter + weekly sentiment bar chart
│   ├── ActionableCategories.tsx     # Top limit & lagging positive category lists
│   ├── CategoryComposition.tsx      # Weekly stacked category composition chart
│   └── Toast.tsx                    # Toast notification system (module-level showToast())
└── vite-env.d.ts
```

### Import Paths

- Use relative imports from `src/` (e.g., `../lib/store`, `../components/EntryList`)
- Components are in `src/components/`
- Pages are in `src/pages/`
- Business logic is in `src/lib/`

## Styling

### Color System (CSS Custom Properties in `app.css`)

All colors are defined as CSS custom properties on `:root` (light) and `.dark` (dark mode). Use `var(--property-name)` rather than hardcoded Tailwind color classes to ensure theme consistency. Key property groups:

- **Backgrounds**: `--bg-page`, `--bg-card`, `--bg-card-hover`, `--bg-elevated`, `--bg-inset`, `--bg-input`
- **Text**: `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-muted`
- **Borders**: `--border-default`, `--border-input`, `--border-subtle`
- **Activity (blue)**: `--color-activity`, `--color-activity-hover`, `--color-activity-bg`, `--color-activity-bg-strong`, `--color-activity-text`, `--color-activity-border`
- **Food (green)**: `--color-food`, `--color-food-hover`, `--color-food-bg`, `--color-food-bg-strong`, `--color-food-text`, `--color-food-border`
- **Status**: `--color-success*`, `--color-danger*`, `--color-warning*`, `--color-neutral`
- **Toast**: `--bg-toast`, `--text-toast`, `--color-toast-action`
- **Shadows**: `--shadow-card`, `--shadow-elevated`

Dark mode is applied via the `.dark` class on `<html>`, managed by `theme.ts`. A Tailwind v4 custom variant `@custom-variant dark (&:where(.dark, .dark *))` enables `dark:` utilities.

### Reusable CSS Classes (defined in `app.css`)

Use these instead of repeating Tailwind utilities:
- **Forms**: `.form-label`, `.form-input`, `.form-input-sm`
- **Buttons**: `.btn`, `.btn-primary`, `.btn-success`, `.btn-secondary`, `.btn-danger`, `.btn-sm`, `.btn-lg`
- **Layout**: `.card` (background + border + rounded + shadow), `.bg-surface`, `.bg-inset`
- **Text**: `.text-heading`, `.text-body`, `.text-label`, `.text-subtle`
- **Type accents**: `.type-activity`, `.type-food` (solid bg), `.type-activity-muted`, `.type-food-muted` (light bg + border)
- **Animation**: `.animate-fade-in`, `.animate-slide-up`

### Color Conventions

- Activity = blue (`--color-activity`), Food = green (`--color-food`)
- Positive sentiment = success green, Limit sentiment = danger red, Neutral = gray
- Cards use the `.card` utility class
- Category pills: `bg-[var(--bg-inset)] text-label px-2 py-0.5 rounded`

## Known Quirks

- **HTML5 date/time input width**: Browsers set intrinsic minimum widths that can cause overflow. Handled in `app.css` with `min-width: 0` and `max-width: 100%` overrides on date/time inputs.
- **Gist sync**: Fire-and-forget with merge logic. LocalStorage is always the source of truth. The store tracks `pendingDeletions` (by entity type) to prevent deleted items from being restored during merge.
- **Entry sorting**: Within each day, entries sort by time (latest first); entries without time come after entries with time.
- **SPA routing**: The `BASE_PATH` env var can configure the base path for deployment. `main.tsx` strips trailing slashes from `import.meta.env.BASE_URL` for the BrowserRouter basename.
- **Dashboard initialization**: On first load, `initializeDefaultDashboardCards()` auto-creates dashboard cards for categories named "Fruit", "Vegetables", or "Sugary drinks" if they exist. This runs once (guarded by `dashboardInitialized` flag).
- **Stats page focus**: The Stats page currently only analyzes food entries (eating patterns). Activity analytics may be added later.
- **Recharts in GoalCard**: The `dot` prop on `<Line>` uses a render function with explicit typing to satisfy TypeScript. The last data point gets a larger filled dot.
- **SegmentedControl variants**: Supports `'pill'` (default, gap-separated buttons) and `'segment'` (iOS-style connected segments with inset background). Also supports `size` prop (`'default'`, `'sm'`, `'xs'`).
