# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Workflow Rules

- **Always verify changes build successfully** before considering a task complete. Run `npm run build` after making changes and fix any errors before finishing.
- **Always update this CLAUDE.md file** when making changes to the codebase (new components, changed patterns, modified architecture, renamed files, etc.) so it continues to accurately reflect the actual code.
- **Add or update tests** when creating or modifying features. Keep tests focused and minimal — a few good tests that cover core logic and edge cases are better than many fragile tests that are expensive to maintain. Test files live alongside the code they test in `__tests__/` directories (e.g., `src/shared/store/__tests__/`, `src/features/tracking/__tests__/`, `src/features/stats/__tests__/`).
- You may need to run `npm install` first if `node_modules` is missing.

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build (tsc + vite build — always run before finishing)
npm run preview      # Preview production build
npm run test         # Run tests once (vitest run)
npm run test:watch   # Run tests in watch mode (vitest)
```

Tests use **Vitest** with **happy-dom** environment. Config is in `vitest.config.ts`. Test files live in `__tests__/` directories colocated with the code they test. Shared test helpers (factory functions like `makeEntry`, `makeItem`, `makeCategory`, `makeValidData`) live in `src/shared/store/__tests__/fixtures.ts`.

## Project Overview

A personal activity and food tracking PWA built for mobile-first usage. Users log activities and food items with dates, times, notes, and categories. Data persists in LocalStorage and optionally syncs to GitHub Gist for backup. Includes a Stats page focused on food-category sentiment analysis (balance scores, category composition, goal tracking).

## Tech Stack

- **Framework**: React 19 with React Router 7
- **Styling**: Tailwind CSS v4 (Vite plugin, not PostCSS)
- **Language**: TypeScript (strict mode)
- **Build**: Vite 7
- **Icons**: Lucide React (tree-shakeable, outline-style icons used throughout the app)
- **Charting**: Recharts 3 (used on Stats page for sparklines, bar charts, and stacked charts)
- **Storage**: LocalStorage (source of truth) + optional GitHub Gist sync (backup only)

## Architecture

### Data Flow

All data lives in a single `TrackerData` object containing items, categories, entries, and dashboard cards for both activity and food types. The architecture follows a **feature-based** pattern:

**Shared layer** (cross-feature, reusable):
1. **`src/shared/lib/types.ts`** — Data interfaces (`Entry`, `ActivityItem`, `FoodItem`, `Category`, `TrackerData`, `DashboardCard`) and utility functions (`generateId()`, `getTodayDate()`, `getCurrentTime()`, collection accessor helpers like `getItems()`, `getCategories()`).
2. **`src/shared/store/store.ts`** — Singleton external store with `useSyncExternalStore`-compatible API (`dataStore`, `syncStatusStore`). All CRUD operations (items, categories, entries, dashboard cards) and thin export/import wrappers live here. Every data mutation goes through this file. Store initialization is guarded by a module-level flag and invoked from `App.tsx`.
3. **`src/shared/store/sync.ts`** — Gist sync/merge logic. Contains `pushToGist`, `loadFromGistFn`, `mergeTrackerData`, `pendingDeletions` tracking, and backup operations. Called by store.ts through wrapper functions.
4. **`src/shared/store/migration.ts`** — Data migration (`migrateData()` for sentiment field) and dashboard initialization (`initializeDefaultDashboardCards()`).
4b. **`src/shared/store/import-export.ts`** — Import validation (`validateAndParseImport()`) and export download (`triggerExportDownload()`). Field-level validation of entries, items, and categories lives here. Called by store.ts wrappers.
5. **`src/shared/store/hooks.ts`** — React hooks that wrap the external store for use in components. Provides `useTrackerData()` for full data access, `useSyncStatus()`, and fine-grained selector hooks (`useEntries()`, `useActivityItems()`, `useFoodItems()`, `useActivityCategories()`, `useFoodCategories()`, `useDashboardCards()`, `useFavoriteItems()`) that prevent re-renders when unrelated data changes.
6. **`src/shared/hooks/useIsMobile.ts`** — Browser-only hook for responsive breakpoint detection (not store-related).
7. **`src/shared/lib/date-utils.ts`** — Shared date/time formatting utilities (`formatTime`, `formatDate`, `formatDateWithYear`, `formatDateLocal`, `formatMonthYear`, `formatWeekLabel`).
8. **`src/shared/lib/github.ts`** — GitHub Gist API integration for backup sync.
9. **`src/shared/lib/theme.ts`** — Theme preference management (light/dark/system).

**Feature layer** (self-contained domains):
10. **`src/features/tracking/`** — Core entry/item/category logic. Contains `utils/entry-filters.ts` (date range, type, item, category filtering), `utils/entry-grouping.ts` (group by date/week, month comparisons, totals), `utils/category-utils.ts` (category ID resolution, name lookup), `hooks/useSwipeGesture.ts` (extracted touch/swipe gesture logic), plus `EntryList` and `CategoryPicker` components. This is the foundational feature used by most other features.
11. **`src/features/quick-log/`** — Quick-log command palette used on the Home page. Business logic is extracted into `hooks/useQuickLogSearch.ts` (search/filter) and `hooks/useQuickLogForm.ts` (form state, submit, create-vs-log mode, instant quick-log). `QuickLogForm` is a presentational component wiring hooks to UI. Each favorite item has a Zap icon button for instant logging (today's date + current time, no sheet).
12. **`src/features/stats/`** — Stats page with goal dashboard, balance score, actionable categories, and category composition charts. Contains `utils/stats-engine.ts` (weekly food analytics, balance scores, actionable category rankings) and all chart components.
13. **`src/features/library/`** — Library page for item & category CRUD management. Split into `LibraryPage.tsx` (layout shell with tabs/search), `ItemsTab.tsx` (item list + add/edit forms), `CategoriesTab.tsx` (category list + add/edit forms), and `SentimentPicker.tsx` (positive/neutral/limit selector).
14. **`src/features/settings/`** — Settings page split into section components: `SettingsPage.tsx` (layout shell), `ThemeSection.tsx` (light/dark/system picker), `GistConfigSection.tsx` (token + Gist ID config), `ExportImportSection.tsx` (JSON export/import), `BackupSection.tsx` (backup Gist management).
15. **`src/features/log/`** — Log page with filterable entry list. Filter logic is extracted into `hooks/useLogFilters.ts` (filter state, filtered entries, active filter count). `LogPage.tsx` is a presentational shell.
16. **`src/features/home/`** — Home page orchestrating quick-log and monthly stats.

### Key Patterns

- **Path aliases**: All imports use `@/` alias (mapped to `src/`) configured in `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts`. Shared modules use `@/shared/...`, pages/components use relative imports for local siblings.
- **Two parallel type hierarchies**: Activity and food share identical structures (`ActivityItem`/`FoodItem`, separate category lists) but are kept separate throughout. Functions often take an `EntryType` ('activity' | 'food') parameter to select the right list.
- **Category overrides**: Entries can override their item's default categories via `categoryOverrides`. Use `getEntryCategoryIds()` from `@/features/tracking` to get effective categories.
- **Category sentiment**: Each category has a `sentiment` property (`'positive' | 'neutral' | 'limit'`, defined as `CategorySentiment` in `types.ts`). Defaults to `'neutral'`. Set via a `SentimentPicker` in the Library page when creating or editing categories. Categories created inline via `CategoryPicker` default to neutral. Non-neutral sentiments display as colored badges (green for positive, red for limit) next to the category name. Legacy data without the field is auto-migrated to `'neutral'` on load via `migrateData()` in `migration.ts`.
- **External store pattern**: Instead of React Context, the store uses a module-level singleton with `useSyncExternalStore` for reactivity. This allows store functions (CRUD operations) to be called from anywhere without prop drilling. Fine-grained selector hooks (`useEntries()`, `useActivityItems()`, etc.) prevent unnecessary re-renders by returning specific data slices — since `updateData()` uses object spread, unchanged sub-arrays keep the same reference, so `useSyncExternalStore` skips re-renders for unaffected slices. Prefer the most specific hook available; use `useTrackerData()` only when the full object is needed (e.g., passing to utility functions that take `TrackerData`).
- **Dashboard cards**: `TrackerData.dashboardCards` stores user-configured goal cards (each tied to a `categoryId`). Cards compare this week's count against a rolling 4-week baseline average. CRUD operations: `addDashboardCard()`, `removeDashboardCard()` in `store.ts`.
- **Toast system**: `showToast()` from `shared/ui/Toast.tsx` is a module-level function (no provider needed). Toasts auto-dismiss after 3.5s and optionally include an action button. Used for Quick Log success feedback (with Undo action) and URL-based quick logging.
- **URL-based quick logging**: The Home page reads `?add=itemName` from the URL to instantly log an entry for a matching item name. Feedback is shown via toast.
- **Bottom sheet pattern**: `BottomSheet` component provides a slide-up sheet (~85vh max) with backdrop, handle bar, and escape-to-close. Used by Quick Log for Create+Log flow, Log page for filters, and EntryList for editing entries. Locks body scroll when open. Supports optional `headerAction` prop (ReactNode) rendered trailing in the header row alongside the title.
- **Favorites**: `TrackerData.favoriteItems` stores an array of item IDs. Items can be favorited/unfavorited via a star icon on the Library page (items tab) and on the Log page (entry rows). `toggleFavorite()` and `isFavorite()` in `store.ts` handle the logic. Favorites are cleaned up when items are deleted. On the Home page, the QuickLogForm shows favorited items instead of recent items.
- **Log page design**: Minimal layout with title + entry count, segment-style type filter on page background (no card container), filter icon top-right opening a BottomSheet with category/item multi-select filters. Active filters shown as removable chips. Entry list uses grouped flat rows (no individual card styling), swipe-left for edit/delete actions, tap row to edit in a BottomSheet. Date headers are sticky, uppercase, muted.
- **Swipe gestures**: `useSwipeGesture` hook (in `features/tracking/hooks/`) encapsulates touch-based swipe-left logic to reveal Edit (blue) and Delete (red) action buttons. Uses a 70px threshold. Returns `swipedEntryId`, `swipeOffset`, touch handlers, `resetSwipe`, and `handleRowTap`. EntryList consumes this hook.
- **Quick Log flow**: Command-palette style — borderless search input at top, inline search results, favorites list (items starred by the user). Tapping an item or "Create" opens a BottomSheet with type selector (create mode), date+time (defaulting to today/now), categories, and note. The Log/Create action button sits in the sheet header (top-right, small rounded pill) via `headerAction` prop. All fields visible — no collapsible sections. No blocking modals. Fast path: open → type → tap → Log (3 interactions). Favorites also have a Zap (⚡) icon button for instant logging — tapping it creates an entry with today's date and current time immediately (no sheet), with an undo toast.

### Routes

- `/` — Home page with command-palette quick log, favorite items, bottom sheet create+log, and demoted monthly stats
- `/log` — Minimal log view with segment-style type filter, filter bottom sheet, swipeable entry list with tap-to-edit
- `/stats` — Stats page: goal dashboard with sparkline cards, balance score, actionable categories (top limit & lagging positive), and category composition chart
- `/library` — Manage items and categories (CRUD) with search, split into Items and Categories sub-tabs
- `/settings` — Theme preferences, GitHub Gist sync configuration, export/import, and backup Gist management

Navigation uses a 5-tab bottom nav bar defined in `App.tsx` (Home, Log, Stats, Library, Settings).

### File Structure

```
src/
├── app/
│   ├── App.tsx                      # Root layout: routes + bottom nav bar + toast container + store init
│   ├── main.tsx                     # Entry point: BrowserRouter + StrictMode
│   └── app.css                      # Global CSS: color system, utility classes, dark mode
├── shared/
│   ├── lib/
│   │   ├── types.ts                 # All TypeScript interfaces + utility functions
│   │   ├── github.ts               # GitHub Gist API client
│   │   ├── theme.ts                # Theme (light/dark/system) persistence + application
│   │   ├── date-utils.ts           # Shared date/time formatting utilities
│   │   └── __tests__/
│   │       ├── types.test.ts        # Tests for utility functions in types.ts
│   │       ├── date-utils.test.ts   # Tests for date/time formatting
│   │       └── theme.test.ts        # Tests for theme persistence + application
│   ├── store/
│   │   ├── store.ts                # Singleton store: CRUD, backup wrappers (~400 lines)
│   │   ├── sync.ts                 # Gist sync/merge logic, pending deletions
│   │   ├── migration.ts            # Data migration + dashboard initialization
│   │   ├── import-export.ts        # Import validation + export download logic
│   │   ├── hooks.ts                # useTrackerData, useSyncStatus + selector hooks
│   │   └── __tests__/
│   │       ├── fixtures.ts         # Shared test helpers (makeEntry, makeItem, makeCategory, makeValidData, flushPromises)
│   │       ├── store-crud.test.ts   # Tests for store CRUD operations (categories, items, entries, dashboard cards)
│   │       ├── migration.test.ts    # Tests for data migration + dashboard initialization
│   │       ├── import-export.test.ts
│   │       ├── gist-sync.test.ts
│   │       └── favorites.test.ts
│   ├── hooks/
│   │   └── useIsMobile.ts          # Responsive breakpoint hook
│   └── ui/
│       ├── BottomSheet.tsx          # Reusable slide-up bottom sheet with backdrop
│       ├── SegmentedControl.tsx     # Generic pill/segment toggle (used throughout)
│       ├── MultiSelectFilter.tsx    # Searchable multi-select dropdown (used on Log page)
│       ├── NativePickerInput.tsx    # iOS-safe date/time picker
│       ├── NavIcon.tsx              # Navigation icon component (Lucide icons for bottom nav)
│       ├── StarIcon.tsx             # Reusable star icon (Lucide Star, filled/unfilled) for favorites
│       └── Toast.tsx                # Toast notification system (module-level showToast())
├── features/
│   ├── tracking/                    # Core: entries, items, categories (shared logic)
│   │   ├── utils/
│   │   │   ├── entry-filters.ts     # filterEntriesByDateRange, byType, byItem, byCategory, etc.
│   │   │   ├── entry-grouping.ts    # getEntriesGroupedByDate, countByItem, month comparisons, etc.
│   │   │   └── category-utils.ts    # getEntryCategoryIds, getCategoryNameById, getEntryCategoryNames
│   │   ├── __tests__/
│   │   │   ├── entry-filters.test.ts
│   │   │   ├── entry-grouping.test.ts
│   │   │   └── category-utils.test.ts
│   │   ├── hooks/
│   │   │   └── useSwipeGesture.ts   # Touch swipe-left gesture logic (extracted from EntryList)
│   │   ├── components/
│   │   │   ├── EntryList.tsx        # Grouped-by-date entry display with swipe actions + edit sheet
│   │   │   └── CategoryPicker.tsx   # Multi-select category chips with inline creation
│   │   └── index.ts                 # Public API
│   ├── quick-log/                   # Quick-log command palette (Home page)
│   │   ├── hooks/
│   │   │   ├── useQuickLogSearch.ts # Search query state, filtered results, favorites list
│   │   │   └── useQuickLogForm.ts   # Form state, submit handlers, create-vs-log mode
│   │   ├── __tests__/
│   │   │   ├── quick-log-search.test.ts # Tests for search, merge, favorites logic
│   │   │   └── quick-log-form.test.ts  # Tests for instant quick-log entry creation
│   │   ├── components/
│   │   │   └── QuickLogForm.tsx     # Presentational: search input + results + favorites + create/log sheet
│   │   └── index.ts
│   ├── stats/                       # Stats page: goals, balance, composition
│   │   ├── utils/
│   │   │   └── stats-engine.ts      # Weekly food analytics, balance scores, actionable categories
│   │   ├── __tests__/
│   │   │   └── stats-engine.test.ts
│   │   ├── components/
│   │   │   ├── StatsPage.tsx
│   │   │   ├── GoalDashboard.tsx
│   │   │   ├── GoalCard.tsx
│   │   │   ├── AddCategoryModal.tsx
│   │   │   ├── BalanceOverview.tsx
│   │   │   ├── ActionableCategories.tsx
│   │   │   └── CategoryComposition.tsx
│   │   └── index.ts
│   ├── library/                     # Library page: item & category CRUD
│   │   ├── components/
│   │   │   ├── LibraryPage.tsx      # Layout shell: tabs, search bar
│   │   │   ├── ItemsTab.tsx         # Items list + add/edit forms with CategoryPicker
│   │   │   ├── CategoriesTab.tsx    # Categories list + add/edit forms with SentimentPicker
│   │   │   └── SentimentPicker.tsx  # Positive/neutral/limit radio group
│   │   └── index.ts
│   ├── settings/                    # Settings page: theme, sync, export
│   │   ├── components/
│   │   │   ├── SettingsPage.tsx     # Layout shell: section composition + shared gist list
│   │   │   ├── ThemeSection.tsx     # Theme picker (light/dark/system)
│   │   │   ├── GistConfigSection.tsx # GitHub token + Gist ID configuration
│   │   │   ├── ExportImportSection.tsx # Export/import JSON data
│   │   │   └── BackupSection.tsx    # Backup Gist management
│   │   └── index.ts
│   ├── log/                         # Log page: filterable entry list
│   │   ├── hooks/
│   │   │   └── useLogFilters.ts     # Filter state, filtered entries, chip generation
│   │   ├── __tests__/
│   │   │   └── log-filters.test.ts  # Tests for filter pipeline composition + type-change cleanup
│   │   ├── components/
│   │   │   └── LogPage.tsx          # Presentational shell: type filter, filter sheet, entry list
│   │   └── index.ts
│   └── home/                        # Home page: quick-log + monthly stats
│       ├── components/
│       │   └── HomePage.tsx
│       └── index.ts
└── vite-env.d.ts
```

### Import Paths

- Use `@/` path alias for all imports (mapped to `src/` in `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`):
  - **Shared modules**: `@/shared/store/store`, `@/shared/store/hooks`, `@/shared/lib/types`, `@/shared/lib/date-utils`, `@/shared/ui/Toast`, `@/shared/hooks/useIsMobile`, etc.
  - **Feature public APIs** (via barrel `index.ts`): `@/features/tracking`, `@/features/quick-log`, `@/features/stats`, `@/features/library`, `@/features/settings`, `@/features/log`, `@/features/home`
  - **Feature internals** (within the same feature): use relative imports (e.g., `../utils/entry-filters`, `./GoalCard`)
  - **Cross-feature imports**: always import from the feature's `index.ts` barrel (e.g., `@/features/tracking`), never reach into internal files (e.g., `@/features/tracking/utils/entry-filters`)
- Feature-specific business logic lives inside `features/<name>/utils/`
- Shared pure utilities live in `shared/lib/`
- Reusable UI components (no business logic) live in `shared/ui/`

## Code Standards

### File Size Limits

- **Components and pages**: ~250 lines max. If a component grows beyond this, extract hooks, sub-components, or utility functions.
- **Utility files** (pure functions in `utils/` directories): can be longer than 250 lines.
- **`store.ts`**: kept under 400 lines, focused on CRUD operations only.

### Naming Conventions

| Category | Pattern | Example |
|----------|---------|---------|
| React components | PascalCase `.tsx` | `EntryList.tsx` |
| Hooks | `use` prefix, camelCase `.ts` | `useSwipeGesture.ts` |
| Utility modules | kebab-case `.ts` | `entry-filters.ts` |
| Test files | colocated `__tests__/` folder | `features/tracking/__tests__/entry-filters.test.ts` |
| Barrel exports | `index.ts` per feature | `features/tracking/index.ts` |

Avoid generic dump files like `helpers.ts`, `utils.ts` (without a descriptive prefix), or `misc.ts`.

### Import Boundary Rules

- **Cross-feature**: always import from the feature's `index.ts` barrel, never internal files.
- **Shared code** (`shared/`): must NOT import from `features/`. Data flows one way: features depend on shared, not the reverse.
- **Shared UI** (`shared/ui/`): must NOT import from `shared/store/` or `features/`. UI components are pure and generic.
- **Within a feature**: use relative imports for siblings (e.g., `../utils/entry-filters`, `./GoalCard`).

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

- **iOS date/time inputs**: iOS Safari enforces native control sizing on `<input type="date|time">` that CSS cannot override. The `NativePickerInput` component works around this by rendering a styled `<div>` for display with a transparent native `<input>` overlay on top that captures taps directly, reliably opening the OS picker. Previous approach using `showPicker()` was unreliable on iOS Safari. Used in `QuickLogForm` and `EntryList` for all date/time fields. Supports optional `onClear` prop for clearable time fields (clear button uses `z-10` to sit above the transparent input).
- **HTML5 date/time input width**: Browsers set intrinsic minimum widths that can cause overflow. Handled in `app.css` with `min-width: 0` and `max-width: 100%` overrides on date/time inputs.
- **Gist sync**: Fire-and-forget with merge logic. LocalStorage is always the source of truth. The store tracks `pendingDeletions` (by entity type) in `sync.ts` to prevent deleted items from being restored during merge.
- **Entry sorting**: Within each day, entries sort by time (latest first); entries without time come after entries with time.
- **SPA routing**: The `BASE_PATH` env var can configure the base path for deployment. `main.tsx` strips trailing slashes from `import.meta.env.BASE_URL` for the BrowserRouter basename.
- **Dashboard initialization**: On first load, `initializeDefaultDashboardCards()` (in `migration.ts`) auto-creates dashboard cards for categories named "Fruit", "Vegetables", or "Sugary drinks" if they exist. This runs once (guarded by `dashboardInitialized` flag).
- **Stats page focus**: The Stats page currently only analyzes food entries (eating patterns). Activity analytics may be added later.
- **Recharts in GoalCard**: The `dot` prop on `<Line>` uses a render function with explicit typing to satisfy TypeScript. The last data point gets a larger filled dot.
- **SegmentedControl variants**: Supports `'pill'` (default, gap-separated buttons) and `'segment'` (iOS-style connected segments with inset background). Also supports `size` prop (`'default'`, `'sm'`, `'xs'`).
