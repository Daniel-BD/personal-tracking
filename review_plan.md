# Codebase Review Plan

Systematic review of the entire codebase for bugs, DRY violations, hardcoded values, unnecessary comments, file size issues, unused imports, and other code quality problems.

## Review Checklist (applied to every file)

- **Bugs**: Logic errors, off-by-one, null/undefined handling, race conditions
- **DRY violations**: Duplicated logic across files/features that should be shared
- **Hardcoded values**: Magic numbers/strings that should be constants
- **Unnecessary comments**: Obvious comments, stale comments, commented-out code
- **File size**: Components over ~250 lines that should be split
- **Unused imports/variables**: Dead code (TypeScript strict mode catches some, but not all)
- **Import boundary violations**: shared/ui importing from store, cross-feature imports bypassing barrels
- **Type safety**: `any` types, missing null checks, unsafe casts
- **Consistency**: Naming conventions, patterns that differ from the rest of the codebase
- **Performance**: Missing memoization where needed, unnecessary re-renders, expensive operations in render

## Review Order (14 steps)

### Step 1: `src/shared/lib/` — Core utilities
Files: `types.ts` (96L), `schemas.ts` (101L), `date-utils.ts` (78L), `cn.ts` (6L), `i18n.ts` (37L), `theme.ts` (39L), `animation.ts` (98L), `github.ts` (140L)

Focus: Type correctness, utility completeness, DRY between `types.ts` helpers and store helpers, hardcoded strings in `i18n.ts`/`theme.ts`.

### Step 2: `src/shared/store/store.ts` — Main store (561L, over limit)
Focus: File size (561L vs 400L limit per CLAUDE.md), CRUD correctness, race conditions in sync coordination, duplicated patterns across add/update/delete operations.

### Step 3: `src/shared/store/sync.ts` — Gist sync (439L)
Focus: Merge logic correctness, error handling, tombstone pruning, race conditions with `activeSync` lock, hardcoded timeouts/intervals.

### Step 4: `src/shared/store/` — Remaining store files
Files: `hooks.ts` (80L), `migration.ts` (56L), `import-export.ts` (38L)

Focus: Hook selector stability, migration completeness, import validation edge cases.

### Step 5: `src/shared/ui/` — Reusable UI components
Files: `BottomSheet.tsx` (100L), `SegmentedControl.tsx` (90L), `MultiSelectFilter.tsx` (123L), `NativePickerInput.tsx` (52L), `ConfirmDialog.tsx` (33L), `Toast.tsx` (61L), `SyncToast.tsx` (62L), `ErrorBoundary.tsx` (75L), `SentimentPills.tsx` (24L), `NavIcon.tsx` (15L), `StarIcon.tsx` (12L), `ReloadPrompt.tsx` (26L)

Focus: Import boundary violations (no store/features imports), accessibility (aria attributes, keyboard handling), hardcoded z-index/colors, consistency across components.

### Step 6: `src/app/` — Root layout & entry point
Files: `App.tsx`, `main.tsx`, `app.css`

Focus: Route configuration, nav bar, global CSS variables, hardcoded values.

### Step 7: `src/features/tracking/` — Core tracking feature
Files: `EntryList.tsx` (287L, over limit), `CategoryPicker.tsx` (154L), `CategoryLine.tsx` (43L), `DaySentimentSummary.tsx` (14L), `useSwipeGesture.ts` (106L), `entry-filters.ts` (38L), `entry-grouping.ts` (207L), `category-utils.ts` (54L)

Focus: `EntryList.tsx` size (287L vs 250L limit), swipe gesture edge cases, filter/grouping logic correctness, DRY between entry-grouping and stats-engine.

### Step 8: `src/features/quick-log/` — Quick logging
Files: `QuickLogForm.tsx` (218L), `QuickLogButton.tsx` (102L), `QuickLogSearchInput.tsx` (100L), `QuickLogItemsList.tsx` (85L), `useQuickLogForm.ts` (133L), `useQuickLogSearch.ts` (88L)

Focus: Search algorithm correctness, form state management, render prop pattern consistency, edge cases in quick-log flow.

### Step 9: `src/features/stats/utils/stats-engine.ts` — Stats calculations (411L)
Focus: Calculation correctness, hardcoded week/period constants, DRY with entry-grouping utilities, edge cases (empty data, single entry).

### Step 10: `src/features/stats/components/` — Stats UI (13 components)
Files: `StatsPage.tsx` (90L), `GoalDashboard.tsx` (133L), `GoalCard.tsx` (184L), `BalanceOverview.tsx` (142L), `BalanceScoreTrendChart.tsx` (86L), `CategoryComposition.tsx` (217L), `FrequencyRanking.tsx` (179L), `ActionableCategories.tsx` (126L), `AddCategoryModal.tsx` (104L), `CategoryDetailPage.tsx` (187L), `CategoryTrendChart.tsx` (136L), `WeekHistoryGrid.tsx` (82L), `WeekBreakdownTooltip.tsx` (53L), `MonthCalendarView.tsx` (154L), `YearlyActivityGrid.tsx` (184L)

Focus: Recharts usage consistency, hardcoded colors/dimensions, DRY across chart components, data transformation duplication.

### Step 11: `src/features/library/` — CRUD management
Files: `LibraryPage.tsx` (138L), `ItemsTab.tsx` (255L, borderline), `CategoriesTab.tsx` (262L, over limit), `SentimentPicker.tsx` (41L), `useLibraryForm.ts` (64L)

Focus: File sizes (`CategoriesTab` 262L, `ItemsTab` 255L), DRY between ItemsTab and CategoriesTab (likely similar CRUD patterns), form validation.

### Step 12: `src/features/log/` — Entry list & filters
Files: `LogPage.tsx` (182L), `ItemDetailPage.tsx` (37L), `useLogFilters.ts` (140L)

Focus: Filter logic vs tracking/entry-filters DRY, performance with large entry lists, edge cases.

### Step 13: `src/features/home/` — Home page
Files: `HomePage.tsx` (79L), `DailyBalanceScore.tsx` (45L), `daily-balance.ts` (30L)

Focus: DRY with stats balance calculations, component composition.

### Step 14: `src/features/settings/` — Settings
Files: `SettingsPage.tsx` (107L), `BackupSection.tsx` (184L), `GistConfigSection.tsx` (157L), `ExportImportSection.tsx` (75L), `ThemeSection.tsx` (32L), `types.ts` (5L)

Focus: Error handling in Gist config, backup flow correctness, hardcoded URLs/tokens.

## Cross-cutting reviews (done alongside per-file review)

- **DRY across features**: Compare entry-grouping (tracking) vs stats-engine (stats) vs daily-balance (home) for duplicated date/week logic
- **DRY in CRUD UI**: Compare ItemsTab vs CategoriesTab (library) for extractable shared patterns
- **Barrel export completeness**: Verify index.ts files export everything that's imported cross-feature
- **Test coverage gaps**: Note features/files with no tests (library, settings have zero tests)

## How to conduct each step

1. Read all files in the section
2. Note issues with file path, line number, and severity (bug/improvement/style)
3. Compile findings into this file under each step heading
4. After all steps, prioritize fixes
