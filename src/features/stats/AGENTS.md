# Stats Feature

Stats page with goal dashboard, balance score, actionable categories, category composition charts, and frequency ranking. Exports its public API via `index.ts` barrel.

**Important**: The Stats page analytics (balance score, composition, actionable categories) currently only analyze food entries. However, the goal dashboard and detail pages support both food and activity items/categories.

## Utils

- **`stats-engine.ts`** — Weekly food analytics, balance scores (based on category sentiment), actionable category rankings, and shared color helpers (`SENTIMENT_COLORS`, chart palette lookup). `processFoodEntriesByWeekFromIndexes()` is the index-backed path used by the Stats page; the legacy `processFoodEntriesByWeek()` wrapper stays available for compatibility. `getLastNWeeks()` derives week boundaries from ISO year/week so New Year week ranges stay correct.
- **`stats-view-models.ts`** — Pure builders for goal dashboard cards, category detail, item detail, and shared weekly item/category count indexes. Keeps rolling 4-week baselines and partial-week prorating unchanged while avoiding repeated whole-store scans.
- **`weekly-chart-axis.ts`** — Shared Recharts axis presets for weekly stats charts. Weekly labels must always set `interval={0}` and `minTickGap={0}` through this helper rather than relying on Recharts default tick pruning.

## Hooks

- **`use-stats-view-models.ts`** — Thin stats-facing hooks built on shared slice hooks plus tracking indexes: `useWeeklyFoodStats`, `useGoalDashboardViewModels`, `useCategoryDetailViewModel`, `useItemDetailViewModel`, and `useItemAccentColorById`.

## Components

- **`StatsPage.tsx`** — Layout shell orchestrating all stats sections. The top-level weekly/monthly segmented toggle was removed; the page is weekly-only. When weekly stats data exists, the balance overview renders before the goal dashboard so the overall score appears at the top of the stats content. Uses shared slice hooks plus precomputed weekly food stats instead of reading the full `TrackerData` object.
- **`GoalDashboard.tsx`** — Goal cards grid. Now renders prebuilt card view models from `useGoalDashboardViewModels()` so per-card sparkline counts come from shared weekly indexes rather than repeated date-range filters. Supports both food and activity items/categories. When no dashboard cards are configured, it only shows the section title and trailing add button (no empty placeholder card).
- **`GoalCard.tsx`** — Individual sparkline card showing this week's count vs. 4-week rolling baseline average. Uses Recharts `<Line>`. Accepts optional `accentColor` prop to override sentiment-derived color (used for item cards).
- **`AddCategoryModal.tsx`** — Modal for adding new dashboard goal cards. Has a `SegmentedControl` toggle between "Categories" and "Items" tabs. Both tabs show food and activity entries. Category dots use sentiment colors; item dots use `getItemAccentColor()`. Item rows also display default-category sentiment pills. The container now exposes `role="dialog"` / `aria-modal` semantics with a labeled close button so Playwright and assistive tech can target it reliably.
- **`ItemDetailPage.tsx`** — Thin item detail view for `/stats/item/:itemId`, backed by `useItemDetailViewModel()`. Header actions use the shared warning-tone edit icon button style (`IconActionButton`) and route to `/library` with deep-link query params so the correct item edit sheet opens immediately. Monthly and yearly sections now receive the item's prefiltered entry slice instead of refiltering the full store.
- **`CategoryDetailPage.tsx`** — Thin category detail view for `/stats/category/:categoryId`, backed by `useCategoryDetailViewModel()`. Header actions use the shared warning-tone edit icon button style (`IconActionButton`) and route to `/library` with deep-link query params so the correct category edit sheet opens immediately. The `limit` sentiment "days since last logged" pill still uses the same calculation; monthly and yearly sections use the category's prefiltered entry slice.
- **`BalanceOverview.tsx`** — Overall balance score visualization (score card, trend chart, weekly breakdown).
- **`BalanceScoreTrendChart.tsx`** — 8-week balance score line chart (Recharts `<Line>`). Shows score % above each dot and small positive/limit counts below. Modeled after `CategoryTrendChart`.
- **`ActionableCategories.tsx`** — Top limit categories to reduce. Reads from precomputed weekly food stats plus dashboard-card slices instead of full `TrackerData`.
- **`CategoryComposition.tsx`** — Stacked/bar chart showing category distribution.
- **`FrequencyRanking.tsx`** — Ranked list of most-logged items or categories ordered by count, with SegmentedControl filters for time period (all time/7 days/30 days), type (all/activities/food), and view mode (items/categories). Uses tracking indexes plus `useItemAccentColorById()` instead of whole-store lookups. Rows are tappable and navigate to category/item detail pages.
- **`PeriodNavigator.tsx`** — Shared header component used by `MonthCalendarView` and `YearlyActivityGrid`. Shows total logged count in accent color and a styled pill-shaped prev/next navigation button. Callers pass explicit accessible labels (`Previous month`, `Next month`, `Previous year`, `Next year`) for the icon-only controls.
- **`MonthCalendarView.tsx`** — Month calendar grid on category/item detail page. Accepts the already-filtered entry slice for the current entity, then applies only the displayed month range.
- **`YearlyActivityGrid.tsx`** — GitHub-style yearly heatmap on category/item detail page. Accepts the already-filtered entry slice for the current entity, then applies only the displayed year range.
- **`CategoryMostLogged.tsx`** — Ranked list of most-logged items within a specific category on the category detail page. Uses item lookup/accent maps passed from the page view model instead of rehydrating item metadata from `TrackerData`.

## Known Quirks

- **Recharts in GoalCard**: The `dot` prop on `<Line>` uses a render function with explicit typing to satisfy TypeScript. The last data point gets a larger filled dot.
- Weekly stats axes must not rely on Recharts default tick interval behavior. Use the shared weekly-axis helper so all 8 week labels remain visible after responsive re-measurements.
- Chart colors use `--chart-color-1` through `--chart-color-9` CSS custom properties.

## Tests

- `__tests__/stats-engine.test.ts`
- `__tests__/stats-view-models.test.ts`
- `../../e2e/stats.spec.ts` covers seeded dashboard cards, frequency ranking filters, resize-stable weekly chart labels, detail routes, and dashboard-card persistence through the shared mocked localStorage + GitHub harness.

- `index.ts` re-exports `SENTIMENT_COLORS` and `getItemAccentColor` from `utils/stats-engine.ts` for cross-feature consumption via the feature barrel.
