# Stats Feature

Stats page with goal dashboard, balance score, actionable categories, category composition charts, and frequency ranking. Exports its public API via `index.ts` barrel.

**Important**: The Stats page currently only analyzes food entries (eating patterns). Activity analytics may be added later.

## Utils

- **`stats-engine.ts`** — Weekly food analytics, balance scores (based on category sentiment), actionable category rankings (top limit categories to reduce, lagging positive categories to increase).

## Components

- **`StatsPage.tsx`** — Layout shell orchestrating all stats sections.
- **`GoalDashboard.tsx`** — Goal cards grid. Each card tied to a `categoryId` or `itemId` from `TrackerData.dashboardCards`. Category cards use sentiment-derived colors; item cards use a neutral blue accent (`--color-activity`).
- **`GoalCard.tsx`** — Individual sparkline card showing this week's count vs. 4-week rolling baseline average. Uses Recharts `<Line>`. Accepts optional `accentColor` prop to override sentiment-derived color (used for item cards).
- **`AddCategoryModal.tsx`** — Modal for adding new dashboard goal cards. Has a `SegmentedControl` toggle between "Categories" and "Items" tabs. Items tab shows food items with blue accent dots.
- **`ItemDetailPage.tsx`** — Detail page for item-based dashboard cards (`/stats/item/:itemId`). Shows weekly stats, trend chart, week history, calendar, and yearly grid — all with blue accent color. Displays the item's default categories as colored sentiment pills at the top.
- **`BalanceOverview.tsx`** — Overall balance score visualization (score card, trend chart, weekly breakdown).
- **`BalanceScoreTrendChart.tsx`** — 8-week balance score line chart (Recharts `<Line>`). Shows score % above each dot and small positive/limit counts below. Modeled after `CategoryTrendChart`.
- **`ActionableCategories.tsx`** — Top limit categories to reduce + lagging positive categories to increase.
- **`CategoryComposition.tsx`** — Stacked/bar chart showing category distribution.
- **`FrequencyRanking.tsx`** — Ranked list of most-logged items or categories ordered by count, with SegmentedControl filters for time period (all time/7 days/30 days), type (all/activities/food), and view mode (items/categories).
- **`PeriodNavigator.tsx`** — Shared header component used by `MonthCalendarView` and `YearlyActivityGrid`. Shows total logged count in accent color and a styled pill-shaped prev/next navigation button.
- **`MonthCalendarView.tsx`** — Month calendar grid on category/item detail page. Shows days with logged entries highlighted using sentiment or accent color with intensity-based saturation (more entries = more saturated). Accepts optional `itemId` and `accentColor` props. Prev/next month navigation via `PeriodNavigator`.
- **`YearlyActivityGrid.tsx`** — GitHub-style yearly heatmap on category/item detail page. SVG grid of day squares colored by entry count with sentiment or accent color. Accepts optional `itemId` and `accentColor` props. Prev/next year navigation via `PeriodNavigator`.

## Known Quirks

- **Recharts in GoalCard**: The `dot` prop on `<Line>` uses a render function with explicit typing to satisfy TypeScript. The last data point gets a larger filled dot.
- Chart colors use `--chart-color-1` through `--chart-color-9` CSS custom properties.

## Tests

- `__tests__/stats-engine.test.ts`
