# Stats Feature

Stats page with goal dashboard, balance score, actionable categories, category composition charts, and frequency ranking. Exports its public API via `index.ts` barrel.

**Important**: The Stats page currently only analyzes food entries (eating patterns). Activity analytics may be added later.

## Utils

- **`stats-engine.ts`** — Weekly food analytics, balance scores (based on category sentiment), actionable category rankings (top limit categories to reduce, lagging positive categories to increase).

## Components

- **`StatsPage.tsx`** — Layout shell orchestrating all stats sections.
- **`GoalDashboard.tsx`** — Goal cards grid. Each card tied to a `categoryId` from `TrackerData.dashboardCards`.
- **`GoalCard.tsx`** — Individual sparkline card showing this week's count vs. 4-week rolling baseline average. Uses Recharts `<Line>`.
- **`AddCategoryModal.tsx`** — Modal for adding new dashboard goal cards.
- **`BalanceOverview.tsx`** — Overall balance score visualization.
- **`ActionableCategories.tsx`** — Top limit categories to reduce + lagging positive categories to increase.
- **`CategoryComposition.tsx`** — Stacked/bar chart showing category distribution.
- **`FrequencyRanking.tsx`** — Ranked list of most-logged items or categories ordered by count, with SegmentedControl filters for time period (all time/7 days/30 days), type (all/activities/food), and view mode (items/categories).

## Known Quirks

- **Recharts in GoalCard**: The `dot` prop on `<Line>` uses a render function with explicit typing to satisfy TypeScript. The last data point gets a larger filled dot.
- Chart colors use `--chart-color-1` through `--chart-color-9` CSS custom properties.

## Tests

- `__tests__/stats-engine.test.ts`
