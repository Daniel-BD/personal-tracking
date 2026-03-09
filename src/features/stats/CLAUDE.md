# Stats Feature

Stats page with goal dashboard, balance score, actionable categories, category composition charts, and frequency ranking. Exports its public API via `index.ts` barrel.

**Important**: The Stats page analytics (balance score, composition, actionable categories) currently only analyze food entries. However, the goal dashboard and detail pages support both food and activity items/categories.

## Utils

- **`stats-engine.ts`** — Weekly food analytics, balance scores (based on category sentiment), actionable category rankings (top limit categories to reduce, lagging positive categories to increase).

## Components

- **`StatsPage.tsx`** — Layout shell orchestrating all stats sections.
- **`GoalDashboard.tsx`** — Goal cards grid. Each card tied to a `categoryId` or `itemId` from `TrackerData.dashboardCards`. Category cards use sentiment-derived colors; item cards use sentiment-based accent color derived from their categories via `getItemAccentColor()`. Supports both food and activity items/categories.
- **`GoalCard.tsx`** — Individual sparkline card showing this week's count vs. 4-week rolling baseline average. Uses Recharts `<Line>`. Accepts optional `accentColor` prop to override sentiment-derived color (used for item cards).
- **`AddCategoryModal.tsx`** — Modal for adding new dashboard goal cards. Has a `SegmentedControl` toggle between "Categories" and "Items" tabs. Both tabs show food and activity entries. Category dots use sentiment colors; item dots use `getItemAccentColor()`. Item rows also display default-category sentiment pills.
- **`ItemDetailPage.tsx`** — Detail page for item-based dashboard cards (`/stats/item/:itemId`). Supports both food and activity items — looks up the item in both collections and uses the corresponding categories. Shows weekly stats summary text (`% + event delta` compared to 4-week average), trend chart with week breakdown tooltip, calendar, and yearly grid with sentiment-based accent color. Displays the item's default categories as tappable sentiment pills that navigate to category detail pages.
- **`CategoryDetailPage.tsx`** — Detail page for category-based dashboard cards (`/stats/category/:categoryId`). Shows weekly summary and, for `limit` sentiment categories, a small card-styled motivation pill above the weekly summary displaying days since the last logged entry.
- **`BalanceOverview.tsx`** — Overall balance score visualization (score card, trend chart, weekly breakdown).
- **`BalanceScoreTrendChart.tsx`** — 8-week balance score line chart (Recharts `<Line>`). Shows score % above each dot and small positive/limit counts below. Modeled after `CategoryTrendChart`.
- **`ActionableCategories.tsx`** — Top limit categories to reduce + lagging positive categories to increase.
- **`CategoryComposition.tsx`** — Stacked/bar chart showing category distribution.
- **`FrequencyRanking.tsx`** — Ranked list of most-logged items or categories ordered by count, with SegmentedControl filters for time period (all time/7 days/30 days), type (all/activities/food), and view mode (items/categories). Progress bars use sentiment colors for categories and `getItemAccentColor()` for items. Rows are tappable and navigate to category/item detail pages.
- **`PeriodNavigator.tsx`** — Shared header component used by `MonthCalendarView` and `YearlyActivityGrid`. Shows total logged count in accent color and a styled pill-shaped prev/next navigation button.
- **`MonthCalendarView.tsx`** — Month calendar grid on category/item detail page. Shows days with logged entries highlighted using sentiment or accent color with intensity-based saturation (more entries = more saturated). Accepts optional `itemId` and `accentColor` props. Prev/next month navigation via `PeriodNavigator`.
- **`YearlyActivityGrid.tsx`** — GitHub-style yearly heatmap on category/item detail page. SVG grid of day squares colored by entry count with sentiment or accent color. Accepts optional `itemId` and `accentColor` props. Prev/next year navigation via `PeriodNavigator`.
- **`CategoryMostLogged.tsx`** — Ranked list of most-logged items within a specific category on the category detail page. SegmentedControl filter for time period (all time/7 days/30 days). Each row shows rank, item name, percentage of total, absolute count, and an item accent color bar derived via `getItemAccentColor()`. Rows navigate to item detail pages.

## Known Quirks

- **Recharts in GoalCard**: The `dot` prop on `<Line>` uses a render function with explicit typing to satisfy TypeScript. The last data point gets a larger filled dot.
- Chart colors use `--chart-color-1` through `--chart-color-9` CSS custom properties.

## Tests

- `__tests__/stats-engine.test.ts`

- `index.ts` re-exports `SENTIMENT_COLORS` and `getItemAccentColor` from `utils/stats-engine.ts` for cross-feature consumption via the feature barrel.
