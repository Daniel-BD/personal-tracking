# Refactor Plan

Restructuring personal-tracking from flat file organization to a feature-based architecture with clear separation of UI and logic, colocated tests, lower coupling, and predictable patterns.

---

## Current State Summary

| Metric | Value |
|--------|-------|
| Total source LOC | ~6,000 (lib: 2,200 + components: 2,200 + pages: 1,400) |
| Test LOC | 889 (3 files — store/import/sync/favorites only) |
| Largest file | `analysis.ts` (921 lines, 55+ exports) |
| Most complex pages | `LibraryPage.tsx` (482L), `SettingsPage.tsx` (438L) |
| Most complex components | `QuickLogForm.tsx` (361L), `EntryList.tsx` (340L) |
| Unused exports | ~25 functions/types in `analysis.ts` |
| Path aliases | None configured |
| Test coverage gaps | `analysis.ts`, `stats.ts`, all components — zero tests |

### Current Structure

```
src/
├── App.tsx
├── main.tsx
├── app.css
├── lib/
│   ├── types.ts          (117L)  — Data interfaces + utility fns
│   ├── store.ts          (645L)  — Singleton store: CRUD, sync, migration, export/import
│   ├── hooks.ts          (25L)   — useTrackerData, useSyncStatus, useIsMobile
│   ├── analysis.ts       (921L)  — Date filtering, analytics, chart data, formatting
│   ├── stats.ts          (402L)  — Weekly food analytics, balance scores
│   ├── github.ts         (144L)  — GitHub Gist API client
│   ├── theme.ts          (38L)   — Theme persistence + DOM application
│   └── __tests__/        (889L)  — 3 test files (store logic only)
├── pages/
│   ├── HomePage.tsx      (124L)
│   ├── LogPage.tsx       (284L)
│   ├── StatsPage.tsx     (77L)
│   ├── LibraryPage.tsx   (482L)
│   └── SettingsPage.tsx  (438L)
└── components/
    ├── QuickLogForm.tsx         (361L)
    ├── EntryList.tsx            (340L)
    ├── CategoryComposition.tsx  (241L)
    ├── BalanceOverview.tsx      (168L)
    ├── GoalCard.tsx             (153L)
    ├── CategoryPicker.tsx       (150L)
    ├── ActionableCategories.tsx (147L)
    ├── MultiSelectFilter.tsx    (140L)
    ├── GoalDashboard.tsx        (127L)
    ├── AddCategoryModal.tsx     (114L)
    ├── SegmentedControl.tsx     (90L)
    ├── BottomSheet.tsx          (79L)
    ├── Toast.tsx                (61L)
    ├── NativePickerInput.tsx    (56L)
    ├── NavIcon.tsx              (34L)
    └── StarIcon.tsx             (20L)
```

### Key Problems

1. **Flat structure** — all components in one folder, all lib in one folder; no feature grouping
2. **Mixed concerns in pages** — `LibraryPage.tsx` (482L) and `SettingsPage.tsx` (438L) contain form logic, validation, state management, and rendering all in one file
3. **Mixed concerns in components** — `QuickLogForm.tsx` (361L) mixes search logic, favorite logic, create/log flows, and form state; `EntryList.tsx` (340L) mixes swipe gestures, date grouping, and edit form
4. **Bloated analysis.ts** — 921 lines, 55+ exports; ~25 exports are unused (speculative APIs never wired to UI)
5. **No path aliases** — all imports are relative (`../../lib/store`), causing deep import chains
6. **No test coverage** for business logic (`analysis.ts`: 921L, `stats.ts`: 402L — zero tests) or any components
7. **Store re-render issue** — `useTrackerData()` returns the entire `TrackerData` object; any mutation re-renders every subscriber
8. **Direct store imports in components** — components call `addEntry()`, `deleteEntry()` etc. directly from `store.ts`, tightly coupling UI to the store

---

## Target Structure

```
src/
├── app/                              # App bootstrap & routing
│   ├── App.tsx                       # Root layout, routes, nav, toast, store init
│   ├── main.tsx                      # Entry point: BrowserRouter + StrictMode
│   └── app.css                       # Global CSS: color system, dark mode, utilities
│
├── shared/                           # Cross-feature reusable code
│   ├── ui/                           # Design-system / generic UI components
│   │   ├── BottomSheet.tsx
│   │   ├── SegmentedControl.tsx
│   │   ├── MultiSelectFilter.tsx
│   │   ├── NativePickerInput.tsx
│   │   ├── NavIcon.tsx
│   │   ├── StarIcon.tsx
│   │   └── Toast.tsx
│   ├── hooks/                        # Shared React hooks
│   │   └── useIsMobile.ts
│   ├── lib/                          # Shared pure logic & utilities
│   │   ├── types.ts                  # All data interfaces, EntryType, generateId, etc.
│   │   ├── date-utils.ts             # formatDate, formatTime, formatDateWithYear, etc.
│   │   └── github.ts                 # GitHub Gist API client
│   ├── store/                        # Global data store
│   │   ├── store.ts                  # Singleton store: updateData, dataStore, syncStatusStore
│   │   ├── hooks.ts                  # useTrackerData, useSyncStatus + selector hooks
│   │   ├── sync.ts                   # Gist sync/merge logic (extracted from store.ts)
│   │   ├── migration.ts              # Data migration logic (extracted from store.ts)
│   │   └── __tests__/
│   │       ├── import-export.test.ts
│   │       ├── gist-sync.test.ts
│   │       └── favorites.test.ts
│   └── test/                         # Shared test utilities & fixtures
│       └── fixtures.ts               # Reusable TrackerData factory functions
│
├── features/
│   ├── tracking/                     # Core: entries, items, categories (CRUD)
│   │   ├── components/
│   │   │   ├── EntryList.tsx         # Grouped-by-date entry display (presentational)
│   │   │   ├── EntryEditSheet.tsx    # Edit entry form in BottomSheet
│   │   │   ├── CategoryPicker.tsx    # Multi-select category chips
│   │   │   └── SwipeRow.tsx          # Swipe-to-reveal action buttons
│   │   ├── hooks/
│   │   │   ├── useSwipeGesture.ts    # Touch swipe logic (extracted from EntryList)
│   │   │   └── useEntryGroups.ts     # Group entries by date, sort within groups
│   │   ├── utils/
│   │   │   ├── entry-filters.ts      # filterEntriesByType, byItem, byCategory, etc.
│   │   │   ├── entry-grouping.ts     # getEntriesGroupedByDate, countByItem, countByCategory
│   │   │   └── category-utils.ts     # getEntryCategoryIds, getCategoryNameById, etc.
│   │   ├── types.ts                  # Feature-specific types (if any beyond shared)
│   │   ├── index.ts                  # Public API
│   │   └── __tests__/
│   │       ├── entry-filters.test.ts
│   │       ├── entry-grouping.test.ts
│   │       └── category-utils.test.ts
│   │
│   ├── quick-log/                    # Quick-log command palette (Home page)
│   │   ├── components/
│   │   │   ├── QuickLogForm.tsx      # Search input + results list (presentational)
│   │   │   ├── QuickLogSheet.tsx     # Create/log BottomSheet with form fields
│   │   │   └── FavoritesList.tsx     # Favorite items grid
│   │   ├── hooks/
│   │   │   ├── useQuickLogSearch.ts  # Search/filter logic
│   │   │   └── useQuickLogForm.ts    # Form state, submit, create-vs-log mode
│   │   ├── index.ts
│   │   └── __tests__/
│   │       └── useQuickLogSearch.test.ts
│   │
│   ├── log/                          # Log page: filterable entry list
│   │   ├── components/
│   │   │   ├── LogPage.tsx           # Page shell: title, type filter, filter icon
│   │   │   └── LogFilterSheet.tsx    # Filter BottomSheet with category/item multi-select
│   │   ├── hooks/
│   │   │   └── useLogFilters.ts      # Filter state management + chip generation
│   │   ├── index.ts
│   │   └── __tests__/
│   │       └── useLogFilters.test.ts
│   │
│   ├── stats/                        # Stats page: goals, balance, composition
│   │   ├── components/
│   │   │   ├── StatsPage.tsx
│   │   │   ├── GoalDashboard.tsx
│   │   │   ├── GoalCard.tsx
│   │   │   ├── AddCategoryModal.tsx
│   │   │   ├── BalanceOverview.tsx
│   │   │   ├── ActionableCategories.tsx
│   │   │   └── CategoryComposition.tsx
│   │   ├── hooks/
│   │   │   └── useWeeklyStats.ts     # Wraps stats.ts computations with memoization
│   │   ├── utils/
│   │   │   ├── stats-engine.ts       # Balance scores, actionable categories (from stats.ts)
│   │   │   └── chart-data.ts         # groupByDay/Week/Month, rolling avg, cumulative (from analysis.ts)
│   │   ├── index.ts
│   │   └── __tests__/
│   │       ├── stats-engine.test.ts
│   │       └── chart-data.test.ts
│   │
│   ├── library/                      # Library page: item & category CRUD
│   │   ├── components/
│   │   │   ├── LibraryPage.tsx       # Page shell: tabs, search
│   │   │   ├── ItemsTab.tsx          # Items list + add/edit item forms
│   │   │   ├── CategoriesTab.tsx     # Categories list + add/edit category forms
│   │   │   ├── ItemForm.tsx          # Add/edit item form (presentational)
│   │   │   ├── CategoryForm.tsx      # Add/edit category form with SentimentPicker
│   │   │   └── SentimentPicker.tsx   # Positive/neutral/limit radio group
│   │   ├── hooks/
│   │   │   └── useLibrarySearch.ts   # Search/filter across items and categories
│   │   ├── index.ts
│   │   └── __tests__/
│   │       └── useLibrarySearch.test.ts
│   │
│   ├── settings/                     # Settings page: theme, sync, export
│   │   ├── components/
│   │   │   ├── SettingsPage.tsx       # Page shell: section layout
│   │   │   ├── ThemeSection.tsx       # Theme picker (light/dark/system)
│   │   │   ├── GistConfigSection.tsx  # GitHub Gist token + ID configuration
│   │   │   ├── ExportImportSection.tsx # Export/import data (JSON)
│   │   │   └── BackupSection.tsx      # Backup Gist management
│   │   ├── index.ts
│   │   └── __tests__/
│   │       └── (tests as needed)
│   │
│   └── home/                         # Home page: orchestrates quick-log + monthly stats
│       ├── components/
│       │   ├── HomePage.tsx
│       │   └── MonthlyComparison.tsx  # The demoted monthly stats section
│       └── index.ts
│
└── vite-env.d.ts
```

---

## Phases

### Phase 0 — Preparation (infrastructure changes)

These changes lay the groundwork. No files are moved yet, no features are restructured.

- [ ] **0.1 — Configure path aliases**
  - Add `"paths": { "@/*": ["./src/*"] }` to `tsconfig.json` under `compilerOptions`
  - Add `resolve.alias` to `vite.config.ts`: `{ '@': path.resolve(__dirname, './src') }`
  - Add `resolve.alias` to `vitest.config.ts` (or inherit from vite config)
  - Verify `npm run build` and `npm run test` still pass
  - *Do NOT convert existing imports yet* — that happens during feature migration

- [ ] **0.2 — Remove dead code from `analysis.ts`**
  - The following exports are not imported anywhere in the codebase and should be deleted:
    - `selectTopEntities` (fn)
    - `selectInsights` (fn)
    - `selectTimeSeries` (fn)
    - `selectStats` (fn)
    - `selectCumulativeSeries` (fn)
    - `selectRollingAverage` (fn)
    - `getEntityListWithComparison` (fn)
    - `getEntriesForEntity` (fn)
    - `getEntityName` (fn)
    - `groupEntriesByDay` (fn)
    - `groupEntriesByMonth` (fn)
    - `formatDateLabel` (fn)
    - `getDateRangeFromTimeRange` (fn)
    - `getPreviousPeriodRange` (fn)
    - `getTimeRangeLabel` (fn)
    - `EntityRef` (interface)
    - `EntityStats` (interface)
    - `EntityListItem` (interface)
    - `Grouping`, `ChartType`, `RollingAverageWindow` (type aliases)
    - `Insight`, `RankedItem` (interfaces)
    - `ChartSeries`, `ChartDataPoint` (interfaces — verify not used in stats.ts first)
    - `TimeRangeType`, `TimeRange` (types — verify not used elsewhere first)
  - After deletion, verify build passes. This should reduce `analysis.ts` from ~921L to ~400-500L.

- [ ] **0.3 — Create shared test fixtures file**
  - Create `src/shared/test/fixtures.ts` (or `src/lib/__tests__/fixtures.ts` initially)
  - Extract the `TrackerData` factory / mock data setup that's duplicated across the 3 existing test files into reusable builder functions
  - Verify existing tests still pass

---

### Phase 1 — Create the `app/` and `shared/` scaffolding

Move cross-cutting files that don't belong to any single feature.

- [ ] **1.1 — Create `src/app/` directory**
  - Move `src/App.tsx` → `src/app/App.tsx`
  - Move `src/main.tsx` → `src/app/main.tsx`
  - Move `src/app.css` → `src/app/app.css`
  - Update the Vite entry point in `index.html` from `src/main.tsx` to `src/app/main.tsx`
  - Update all internal imports in these files to use `@/` aliases
  - Verify build passes

- [ ] **1.2 — Create `src/shared/ui/`**
  - Move these generic, feature-agnostic UI components:
    - `BottomSheet.tsx` → `src/shared/ui/BottomSheet.tsx`
    - `SegmentedControl.tsx` → `src/shared/ui/SegmentedControl.tsx`
    - `MultiSelectFilter.tsx` → `src/shared/ui/MultiSelectFilter.tsx`
    - `NativePickerInput.tsx` → `src/shared/ui/NativePickerInput.tsx`
    - `NavIcon.tsx` → `src/shared/ui/NavIcon.tsx`
    - `StarIcon.tsx` → `src/shared/ui/StarIcon.tsx`
    - `Toast.tsx` → `src/shared/ui/Toast.tsx`
  - Update all imports across the codebase to `@/shared/ui/...`
  - Verify build passes

- [ ] **1.3 — Create `src/shared/lib/`**
  - Move `src/lib/types.ts` → `src/shared/lib/types.ts`
  - Move `src/lib/github.ts` → `src/shared/lib/github.ts`
  - Move `src/lib/theme.ts` → `src/shared/lib/theme.ts`
  - Extract formatting utilities from `analysis.ts` into `src/shared/lib/date-utils.ts`:
    - `formatDateLocal`
    - `formatDate`
    - `formatDateWithYear`
    - `formatMonthYear`
    - `formatTime`
    - `formatWeekLabel`
  - Update all imports to `@/shared/lib/...`
  - Verify build passes

- [ ] **1.4 — Create `src/shared/store/`**
  - Move `src/lib/store.ts` → `src/shared/store/store.ts`
  - Move `src/lib/hooks.ts` → `src/shared/store/hooks.ts`
  - Move existing tests: `src/lib/__tests__/` → `src/shared/store/__tests__/`
  - Extract from `store.ts` into separate files (keeps store.ts focused on CRUD):
    - `src/shared/store/sync.ts` — Gist sync logic (`pushToGist`, `loadFromGist`, `mergeData`, `pendingDeletions`)
    - `src/shared/store/migration.ts` — `migrateData()` and version logic
  - Move `useIsMobile` from hooks.ts → `src/shared/hooks/useIsMobile.ts` (it's not store-related)
  - Update all imports to `@/shared/store/...` and `@/shared/hooks/...`
  - Verify build and tests pass

---

### Phase 2 — Restructure by feature (one at a time)

Each feature is migrated independently. After each one, all tests pass and the app builds.

- [ ] **2.1 — Create `features/tracking/`** (core entry/item/category logic)
  - Create `src/features/tracking/utils/`:
    - `entry-filters.ts` — extract from analysis.ts: `filterEntriesByDateRange`, `filterEntriesByType`, `filterEntriesByItem`, `filterEntriesByItems`, `filterEntriesByCategory`, `filterEntriesByCategories`
    - `entry-grouping.ts` — extract from analysis.ts: `getEntriesGroupedByDate`, `countEntriesByItem`, `countEntriesByCategory`, `groupEntriesByWeek`
    - `category-utils.ts` — extract from analysis.ts: `getEntryCategoryIds`, `getCategoryNameById`, `getEntryCategoryNames`
  - Create `src/features/tracking/hooks/`:
    - `useSwipeGesture.ts` — extract touch/swipe logic from `EntryList.tsx`
    - `useEntryGroups.ts` — extract date-grouping + sorting logic from `EntryList.tsx`
  - Move/split `src/components/EntryList.tsx`:
    - `src/features/tracking/components/EntryList.tsx` — presentational: receives grouped entries, renders rows
    - `src/features/tracking/components/EntryEditSheet.tsx` — the edit-entry BottomSheet (extracted from EntryList)
    - `src/features/tracking/components/SwipeRow.tsx` — single swipeable row component
  - Move `src/components/CategoryPicker.tsx` → `src/features/tracking/components/CategoryPicker.tsx`
  - Create `src/features/tracking/index.ts` — public exports
  - Update all imports
  - Verify build passes
  - At this point, `analysis.ts` should only contain `compareMonths`, `compareMonthsForItem`, `getItemTotals`, `getCategoryTotals`, `getMonthRange`, `getPreviousMonthRange`, `getWeekRange`, `DateRange` — which are used by home/stats. Move whatever remains to the feature that uses it or to `shared/lib/` if used by multiple features.

- [ ] **2.2 — Create `features/quick-log/`**
  - Split `src/components/QuickLogForm.tsx` (361L) into:
    - `src/features/quick-log/components/QuickLogForm.tsx` — search input + results list (presentational)
    - `src/features/quick-log/components/QuickLogSheet.tsx` — the create/log BottomSheet form
    - `src/features/quick-log/components/FavoritesList.tsx` — favorites grid display
  - Create `src/features/quick-log/hooks/`:
    - `useQuickLogSearch.ts` — search query state, filtering items by query, matching logic
    - `useQuickLogForm.ts` — form state (date, time, note, categories, selectedItem), submit handlers, create-vs-log mode
  - Create `src/features/quick-log/index.ts`
  - Update `HomePage.tsx` import
  - Verify build passes

- [ ] **2.3 — Create `features/stats/`**
  - Move stats components:
    - `GoalDashboard.tsx` → `src/features/stats/components/GoalDashboard.tsx`
    - `GoalCard.tsx` → `src/features/stats/components/GoalCard.tsx`
    - `AddCategoryModal.tsx` → `src/features/stats/components/AddCategoryModal.tsx`
    - `BalanceOverview.tsx` → `src/features/stats/components/BalanceOverview.tsx`
    - `ActionableCategories.tsx` → `src/features/stats/components/ActionableCategories.tsx`
    - `CategoryComposition.tsx` → `src/features/stats/components/CategoryComposition.tsx`
    - `StatsPage.tsx` → `src/features/stats/components/StatsPage.tsx`
  - Move logic:
    - `src/lib/stats.ts` → `src/features/stats/utils/stats-engine.ts`
    - Extract chart-data utilities (if any remain in analysis.ts) → `src/features/stats/utils/chart-data.ts`
  - Create `src/features/stats/hooks/useWeeklyStats.ts` — memoized wrapper around stats-engine computations
  - Create `src/features/stats/index.ts`
  - Update imports in `App.tsx` route definitions
  - Verify build passes

- [ ] **2.4 — Create `features/library/`**
  - Split `src/pages/LibraryPage.tsx` (482L) into:
    - `src/features/library/components/LibraryPage.tsx` — page shell: tabs, search bar
    - `src/features/library/components/ItemsTab.tsx` — items list + add/edit forms
    - `src/features/library/components/CategoriesTab.tsx` — categories list + add/edit forms
    - `src/features/library/components/ItemForm.tsx` — add/edit item form (presentational)
    - `src/features/library/components/CategoryForm.tsx` — add/edit category form + SentimentPicker
    - `src/features/library/components/SentimentPicker.tsx` — extracted from LibraryPage (the inline sub-component)
  - Create `src/features/library/hooks/useLibrarySearch.ts` — search + filter logic
  - Create `src/features/library/index.ts`
  - Verify build passes

- [ ] **2.5 — Create `features/settings/`**
  - Split `src/pages/SettingsPage.tsx` (438L) into:
    - `src/features/settings/components/SettingsPage.tsx` — page shell: section layout
    - `src/features/settings/components/ThemeSection.tsx` — theme picker
    - `src/features/settings/components/GistConfigSection.tsx` — Gist token + ID form
    - `src/features/settings/components/ExportImportSection.tsx` — export/import JSON
    - `src/features/settings/components/BackupSection.tsx` — backup Gist management
  - Create `src/features/settings/index.ts`
  - Verify build passes

- [ ] **2.6 — Create `features/log/` and `features/home/`**
  - `features/log/`:
    - Move `src/pages/LogPage.tsx` → `src/features/log/components/LogPage.tsx`
    - Extract `LogFilterSheet.tsx` — the filter BottomSheet
    - Create `src/features/log/hooks/useLogFilters.ts` — filter state, chip generation
    - Create `src/features/log/index.ts`
  - `features/home/`:
    - Move `src/pages/HomePage.tsx` → `src/features/home/components/HomePage.tsx`
    - Extract `MonthlyComparison.tsx` — the demoted monthly stats section
    - Create `src/features/home/index.ts`
  - Verify build passes

- [ ] **2.7 — Delete empty `src/pages/`, `src/components/`, `src/lib/` directories**
  - At this point all files should have been migrated
  - Delete the old empty directories
  - Do a final `grep` to confirm no imports reference the old paths
  - Verify build passes

---

### Phase 3 — Extract business logic from UI components

This phase targets the components that still mix business logic with rendering, even after the Phase 2 file moves.

- [ ] **3.1 — Extract `useSwipeGesture` hook**
  - Move all touch event handlers (touchStart, touchMove, touchEnd), swipe state (swipedEntryId, swipeOffset), and threshold logic from `EntryList.tsx` into `features/tracking/hooks/useSwipeGesture.ts`
  - The hook returns: `{ swipedEntryId, swipeOffset, touchHandlers, resetSwipe }`
  - `EntryList.tsx` becomes purely presentational: receives handlers, renders

- [ ] **3.2 — Extract `useQuickLogForm` and `useQuickLogSearch` hooks**
  - `useQuickLogSearch(items, favorites)` — owns query state, computes filtered results, handles matching
  - `useQuickLogForm()` — owns all form fields (date, time, note, categories, selectedItem, mode), submit handlers, validation
  - `QuickLogForm.tsx` becomes a presentational component that wires hooks to UI

- [ ] **3.3 — Extract `useLogFilters` hook from LogPage**
  - Owns filter state (selected categories, selected items, entry type)
  - Computes filtered entries from `useTrackerData()`
  - Generates active filter chip data
  - `LogPage.tsx` becomes shell + hook + presentational children

- [ ] **3.4 — Split LibraryPage forms into presentational components**
  - `ItemForm.tsx` — receives `onSubmit`, `initialValues`, renders form fields
  - `CategoryForm.tsx` + `SentimentPicker.tsx` — same pattern
  - `ItemsTab.tsx` and `CategoriesTab.tsx` own the form open/close state and call store functions
  - Each component should be under 150 lines

- [ ] **3.5 — Split SettingsPage into section components**
  - Each section (`ThemeSection`, `GistConfigSection`, `ExportImportSection`, `BackupSection`) owns its own local state
  - `SettingsPage.tsx` becomes a layout shell (~50 lines)

---

### Phase 4 — Add selector hooks to the store

Improve performance by preventing full-tree re-renders on every data mutation.

- [ ] **4.1 — Add selector-based hooks to `shared/store/hooks.ts`**
  - Keep `useTrackerData()` for cases that need the full object
  - Add fine-grained hooks that use `useSyncExternalStore` with a selector + `useRef`-based memoization:
    - `useEntries()` — returns only `data.entries`
    - `useFoodItems()` / `useActivityItems()` — returns items filtered by type
    - `useFoodCategories()` / `useActivityCategories()` — returns categories filtered by type
    - `useDashboardCards()` — returns only `data.dashboardCards`
    - `useFavoriteItems()` — returns only `data.favoriteItems`
  - Components should migrate from `useTrackerData()` to the most specific hook available
  - This prevents components from re-rendering when unrelated data changes

---

### Phase 5 — Extract Gist sync and migration from store.ts

Reduce `store.ts` (645 lines) to focus on CRUD operations only.

- [ ] **5.1 — Extract `shared/store/sync.ts`**
  - Move `pushToGist()`, `loadFromGist()`, `mergeData()`, `pendingDeletions` tracking
  - `store.ts` calls `sync.pushToGist()` after mutations — same fire-and-forget pattern, just in a separate file
  - Keep the public API identical; this is an internal decomposition

- [ ] **5.2 — Extract `shared/store/migration.ts`**
  - Move `migrateData()` and any version-checking logic
  - Called once during `initializeStore()`

- [ ] **5.3 — Verify store.ts is now focused**
  - Should contain: `updateData`, `dataStore`, `syncStatusStore`, CRUD functions (`addEntry`, `deleteEntry`, `addItem`, etc.), `exportData`, `importData`, `initializeStore`
  - Target: ~300-400 lines (down from 645)

---

### Phase 6 — Improve test coverage

Add tests for the pure business logic that currently has zero coverage, and for the hooks extracted in Phase 3.

- [ ] **6.1 — Test `features/tracking/utils/entry-filters.ts`**
  - Test each filter function with edge cases: empty arrays, no matches, multiple matches, date boundary conditions
  - Estimated: 15-20 test cases

- [ ] **6.2 — Test `features/tracking/utils/entry-grouping.ts`**
  - Test date grouping, sorting within groups, entries without times
  - Estimated: 10-15 test cases

- [ ] **6.3 — Test `features/tracking/utils/category-utils.ts`**
  - Test `getEntryCategoryIds` with and without overrides
  - Test `getCategoryNameById` with missing categories
  - Estimated: 8-10 test cases

- [ ] **6.4 — Test `features/stats/utils/stats-engine.ts`**
  - Test balance score calculations, weekly processing, actionable category ranking
  - Test edge cases: empty weeks, all-positive, all-limit, no entries
  - Estimated: 15-20 test cases

- [ ] **6.5 — Test extracted hooks**
  - Test `useSwipeGesture`, `useQuickLogSearch`, `useLogFilters` with `renderHook` from `@testing-library/react`
  - Focus on state transitions and computed values, not DOM rendering
  - May require adding `@testing-library/react` as a dev dependency
  - Estimated: 10-15 test cases per hook

- [ ] **6.6 — Create shared test fixtures**
  - `src/shared/test/fixtures.ts`: factory functions for `TrackerData`, `Entry`, `ActivityItem`, `FoodItem`, `Category`
  - Used across all test files to reduce duplication

---

### Phase 7 — Enforce boundaries and finalize

- [ ] **7.1 — Add feature `index.ts` barrel files**
  - Every feature folder gets an `index.ts` that explicitly exports only the public API
  - External consumers import from `@/features/tracking` not `@/features/tracking/utils/entry-filters`
  - Keeps internal refactoring from breaking consumers

- [ ] **7.2 — Convert all imports to `@/` aliases**
  - Replace all remaining relative imports (`../lib/`, `../../components/`) with `@/shared/...` and `@/features/...`
  - A single find-and-replace pass across the codebase
  - Verify build passes

- [ ] **7.3 — Add ESLint import boundary rules (optional)**
  - Install `eslint-plugin-import` or `eslint-plugin-boundaries`
  - Rules:
    - Features cannot import from another feature's internal files (only from `index.ts`)
    - Shared code cannot import from features
    - Components in `shared/ui/` cannot import from store or features
  - This prevents architectural regression

- [ ] **7.4 — Update CLAUDE.md**
  - Rewrite the Architecture, File Structure, and Import Paths sections to reflect the new feature-based structure
  - Document the naming conventions and module boundaries

- [ ] **7.5 — Final verification**
  - `npm run build` passes
  - `npm run test` passes
  - All routes work (manual check: Home, Log, Stats, Library, Settings)
  - No console errors in dev mode

---

## Naming Conventions

Adopt these consistently across the codebase:

| Category | Pattern | Example |
|----------|---------|---------|
| React components | PascalCase `.tsx` | `EntryList.tsx` |
| Hooks | `use` prefix, camelCase `.ts` | `useSwipeGesture.ts` |
| Utility modules | kebab-case `.ts` | `entry-filters.ts` |
| Types files | `types.ts` per feature | `features/tracking/types.ts` |
| Constants | `constants.ts` per feature | `features/stats/constants.ts` |
| Test files | colocated `__tests__/` folder | `features/tracking/__tests__/entry-filters.test.ts` |
| Barrel exports | `index.ts` per feature | `features/tracking/index.ts` |

Avoid: `helpers.ts`, `utils.ts` (as generic dump files), `misc.ts`

---

## Rules of Engagement

1. **One phase at a time.** Never mix architectural moves with feature work.
2. **Build must pass after every task.** Run `npm run build` after each checkbox item.
3. **Tests must pass after every task.** Run `npm run test` after each checkbox item.
4. **Move files before editing them.** Don't refactor logic and restructure in the same step.
5. **Each feature is self-contained.** If you can't delete a feature folder without only breaking route definitions in `App.tsx`, the boundaries are correct.
6. **Shared is for genuinely shared code.** If only one feature uses it, it belongs in that feature.

---

## Definition of Done

- [ ] Every feature folder is self-explanatory — open it and understand the feature in under 1 minute
- [ ] No file exceeds ~250 lines (pages/components); utility files can be longer if they're pure functions
- [ ] All imports use `@/` aliases
- [ ] Features only import from each other's `index.ts`, never internal files
- [ ] `analysis.ts` no longer exists — its functions live in the features that use them
- [ ] `store.ts` is under 400 lines, focused on CRUD
- [ ] Business logic tests cover `entry-filters`, `entry-grouping`, `category-utils`, and `stats-engine`
- [ ] Existing tests still pass
- [ ] `npm run build` succeeds
- [ ] CLAUDE.md reflects the new architecture
