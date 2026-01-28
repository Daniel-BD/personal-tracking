# CLAUDE.md

This file provides guidance for Claude (or any AI assistant) when working on this codebase.

## Project Overview

A personal activity and food tracking PWA (Progressive Web App) built for mobile-first usage. Users can log activities and food items with dates, times, notes, and categories. Data persists locally and optionally syncs to GitHub Gist for backup.

## Tech Stack

- **Framework**: SvelteKit 2 with Svelte 5 (uses runes: `$state`, `$derived`, `$props`, `$effect`)
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript (strict mode)
- **Build**: Vite 7
- **Storage**: LocalStorage + optional GitHub Gist sync
- **Charts**: LayerChart with D3 scales

## Project Structure

```
src/
├── app.css              # Global styles, CSS component classes
├── app.d.ts             # SvelteKit type declarations
├── components/          # Reusable UI components
│   ├── CategoryPicker.svelte     # Category selection with create-on-the-fly
│   ├── Chart.svelte              # Bar/line charts using LayerChart
│   ├── ComparisonSelector.svelte # Entity comparison picker
│   ├── EntryForm.svelte          # Form for logging entries (activity/food)
│   ├── EntryList.svelte          # Displays logged entries grouped by date
│   ├── InsightList.svelte        # Displays analytics insights/highlights
│   ├── ItemPicker.svelte         # Search/select dropdown for items
│   ├── RankedList.svelte         # Displays ranked items with bar visualization
│   ├── StatsRow.svelte           # Summary stats display (total, avg, all-time)
│   └── TimeRangeSelector.svelte  # Time range picker (7d, 30d, 90d, all, custom)
├── lib/
│   ├── analysis.ts      # Date filtering, statistics, charting utilities
│   ├── github.ts        # GitHub Gist API integration
│   ├── index.ts         # Library exports
│   ├── store.ts         # Svelte stores, CRUD operations, sync logic
│   └── types.ts         # TypeScript interfaces and utility functions
└── routes/
    ├── +layout.svelte   # App shell with bottom nav bar
    ├── +layout.ts       # Layout configuration (prerender, ssr)
    ├── +page.svelte     # Home page with quick log form and summary stats
    ├── library/         # Manage items and categories (CRUD)
    ├── log/             # Full log view with filtering and entry history
    ├── settings/        # GitHub Gist sync configuration
    └── stats/           # Statistics dashboard and individual entity pages
        ├── +page.svelte                    # Main stats overview
        └── [type]/[entityType]/[id]/       # Individual item/category stats
```

## Key Data Types

```typescript
interface Category {
  id: string;
  name: string;
}

interface ActivityItem {
  id: string;
  name: string;
  categories: string[];  // Array of category IDs
}

interface FoodItem {
  id: string;
  name: string;
  categories: string[];  // Array of category IDs
}

type EntryType = 'activity' | 'food';

interface Entry {
  id: string;
  type: EntryType;
  itemId: string;
  date: string;                    // YYYY-MM-DD format
  time: string | null;             // HH:MM format (24-hour), optional
  notes: string | null;
  categoryOverrides: string[] | null;  // Override item's default categories
}

interface TrackerData {
  activityItems: ActivityItem[];
  foodItems: FoodItem[];
  activityCategories: Category[];
  foodCategories: Category[];
  entries: Entry[];
}

// Analytics Types (from analysis.ts)
type TimeRangeType = '7d' | '30d' | '90d' | 'all' | 'custom';

interface TimeRange {
  type: TimeRangeType;
  startDate?: string;  // For 'custom' type
  endDate?: string;    // For 'custom' type
}

interface ChartDataPoint {
  date: string;
  value: number;
}

interface ChartSeries {
  id: string;
  label: string;
  points: ChartDataPoint[];
}

interface EntityRef {
  type: EntryType;
  entityType: 'item' | 'category';
  id: string;
}

interface EntityStats {
  total: number;
  averagePerWeek: number;
  allTimeTotal: number;
}

interface RankedItem {
  id: string;
  label: string;
  count: number;
}

interface Insight {
  id: string;
  text: string;
  target?: {
    type: 'activity' | 'food';
    entityType: 'item' | 'category';
    entityId: string;
  };
}

type Grouping = 'daily' | 'weekly' | 'monthly';
```

## Component Props Reference

### EntryForm
```typescript
interface Props {
  type: EntryType;         // 'activity' or 'food'
  onsave?: () => void;     // Callback after successful save
}
```

### EntryList
```typescript
interface Props {
  entries: Entry[];
  showType?: boolean;      // Show entry type icon (default: false)
}
```

### ItemPicker
```typescript
interface Props {
  items: (ActivityItem | FoodItem)[];
  selectedId: string | null;
  onselect: (item: ActivityItem | FoodItem) => void;
  oncreate: (searchQuery: string) => void;
  placeholder?: string;
  categories?: Category[];  // For displaying category names
}
```

### CategoryPicker
```typescript
interface Props {
  selected: string[];           // Selected category IDs
  categories: Category[];       // Available categories
  onchange: (categoryIds: string[]) => void;
  type?: EntryType;            // Required to enable creating new categories
}
```

### Chart
```typescript
interface Props {
  data: ChartSeries[];          // Array of series to display
  chartType?: 'bar' | 'line';   // Chart type (default: 'bar')
  grouping?: Grouping;          // 'daily' | 'weekly' | 'monthly' (default: 'weekly')
  title?: string;               // Chart title
  onseriesclick?: (seriesId: string) => void;
}
```

### TimeRangeSelector
```typescript
interface Props {
  value: TimeRange;             // Current time range selection
  onchange: (timeRange: TimeRange) => void;
}
```

### RankedList
```typescript
interface Props {
  title: string;                // Section title
  items: RankedItem[];          // Items to display with counts
  accentColor?: 'blue' | 'green';  // Bar color (default: 'blue')
  onselect?: (item: RankedItem) => void;  // Click handler
}
```

### ComparisonSelector
```typescript
interface Props {
  availableEntities: Array<{ ref: EntityRef; name: string }>;
  selectedEntities: EntityRef[];
  maxSelections?: number;       // Max comparisons (default: 2)
  onchange: (entities: EntityRef[]) => void;
}
```

### StatsRow
```typescript
interface Props {
  stats: EntityStats;           // Stats to display
  showAllTime?: boolean;        // Show all-time total (default: true)
}
```

### InsightList
```typescript
interface Props {
  insights: Insight[];          // Insights to display
  onselect?: (insight: Insight) => void;  // Click handler for insights with targets
}
```

## Styling Guidelines

### Reusable CSS Classes (defined in `app.css`)

Use these shared classes instead of repeating Tailwind utilities:

| Class | Purpose |
|-------|---------|
| `.form-label` | Standard label for form fields |
| `.form-input` | Text, date, time inputs (includes width constraints) |
| `.form-input-sm` | Smaller input variant |
| `.btn` | Base button styles |
| `.btn-primary` | Blue primary button |
| `.btn-success` | Green action button |
| `.btn-secondary` | Gray secondary button |
| `.btn-danger` | Red danger button |
| `.btn-sm`, `.btn-lg` | Button size modifiers |

### Color Palette

- **Primary (Blue)**: `blue-600` / `--color-primary: #3b82f6`
- **Success (Green)**: `green-600` / `--color-success: #22c55e`
- **Danger (Red)**: `red-500` / `--color-danger: #ef4444`
- **Text**: `gray-900` (headings), `gray-700` (body), `gray-500` (secondary), `gray-400` (muted)
- **Backgrounds**: `gray-50` (page), `white` (cards)

### Common Patterns

- Cards: `bg-white rounded-lg shadow p-4`
- Selected state: `bg-blue-50 border border-blue-200`
- Category pills: `bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm`
- Focus rings: `focus:outline-none focus:ring-2 focus:ring-blue-500`
- Activity color: `blue-600` (buttons, badges)
- Food color: `green-600` (buttons, badges)

## Development Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run check      # TypeScript/Svelte check
npm run check:watch  # TypeScript check in watch mode
npm run preview    # Preview production build
```

## Important Conventions

### Svelte 5 Runes

This project uses Svelte 5 runes syntax exclusively:
- `$state()` for reactive state
- `$derived()` for computed values (can take a value or a function)
- `$props()` for component props
- `$effect()` for side effects

```svelte
<script lang="ts">
  // Props
  let { type, onsave }: Props = $props();

  // State
  let selectedItem = $state<Item | null>(null);

  // Derived (value)
  const items = $derived(type === 'activity' ? $activityItems : $foodItems);

  // Derived (function - for complex computations)
  const filtered = $derived(() => {
    let result = $entries;
    if (typeFilter !== 'all') {
      result = filterEntriesByType(result, typeFilter);
    }
    return result;
  });
</script>
```

### Store Pattern

All data mutations go through `src/lib/store.ts`:

**Stores:**
- `trackerData` - Main writable store containing all data
- `activityItems`, `foodItems`, `entries` - Derived stores
- `activityCategories`, `foodCategories`, `allCategories` - Category stores
- `syncStatus` - Sync state ('idle' | 'syncing' | 'error')

**Category CRUD:**
- `addCategory(type, name)` - Creates new category, returns Category
- `updateCategory(type, id, name)` - Updates category name
- `deleteCategory(type, categoryId)` - Deletes and removes from items/entries

**Item CRUD:**
- `addActivityItem(name, categoryIds)` / `addFoodItem(name, categoryIds)`
- `updateActivityItem(id, name, categoryIds)` / `updateFoodItem(id, name, categoryIds)`
- `deleteActivityItem(id)` / `deleteFoodItem(id)` - Also deletes related entries

**Entry CRUD:**
- `addEntry(type, itemId, date, time?, notes?, categoryOverrides?)`
- `updateEntry(id, updates)` - Partial update
- `deleteEntry(id)`

**Helpers:**
- `getItemById(type, itemId)` - Get item by ID
- `getCategoryById(type, categoryId)` - Get category by ID
- `getCategoryName(type, categoryId)` - Get category name
- `getCategoryNames(type, categoryIds)` - Get multiple category names

**Sync:**
- `loadFromGist()` - Load data from GitHub Gist
- `forceRefresh()` - Force reload from Gist
- `initializeStore()` - Initialize and load if configured

### Analysis Utilities (`src/lib/analysis.ts`)

**Date Ranges:**
- `getMonthRange(date?)` - Get start/end of month
- `getPreviousMonthRange(date?)` - Get previous month range
- `getWeekRange(date?)` - Get current week range
- `getDateRangeFromTimeRange(timeRange)` - Convert TimeRange to DateRange
- `getPreviousPeriodRange(timeRange)` - Get previous period for comparison

**Filtering:**
- `filterEntriesByDateRange(entries, range)`
- `filterEntriesByType(entries, type)`
- `filterEntriesByItem(entries, itemId)`
- `filterEntriesByCategory(entries, categoryId, data)`
- `getEntriesForEntity(entries, entityRef, data)` - Get entries for item or category

**Statistics:**
- `countEntries(entries)`
- `countEntriesByItem(entries)` - Returns Map<itemId, count>
- `countEntriesByCategory(entries, data)` - Returns Map<categoryName, count>
- `getItemTotals(entries, items, range?)` - Sorted item counts
- `getCategoryTotals(entries, data, range?)` - Sorted category counts
- `compareMonths(entries, date?)` - Month-over-month comparison
- `compareMonthsForItem(entries, itemId, date?)`

**Chart Data:**
- `getFrequencyChartData(entries, timeRange)` - Get activities/food series
- `groupEntriesByDay(entries, range)` - Daily chart data points
- `groupEntriesByWeek(entries, range)` - Weekly chart data points
- `groupEntriesByMonth(entries, range)` - Monthly chart data points
- `selectTimeSeries(entries, entityRef, data, timeRange, grouping)` - Time series for entity
- `selectCumulativeSeries(series)` - Convert to cumulative values
- `selectRollingAverage(series, window)` - Apply rolling average ('7d' | '30d')

**Analytics:**
- `selectStats(entries, entityRef, data, timeRange)` - Get EntityStats
- `selectTopEntities(entries, items, type, limit)` - Get top RankedItems
- `selectInsights(entries, data, timeRange, threshold)` - Generate Insights
- `getAvailableEntities(data, type, excludeId?)` - Get entities for comparison

**Formatting:**
- `formatDate(dateString)` - "Mon, Jan 15" format
- `formatMonthYear(date?)` - "January 2025" format
- `formatWeekLabel(dateString)` - "Jan 15" format for chart labels
- `formatDateLabel(dateString, grouping)` - Format based on grouping type
- `getTimeRangeLabel(timeRange)` - Human-readable range label
- `getEntriesGroupedByDate(entries)` - Groups by date, sorted newest first

**Entity Helpers:**
- `getEntryCategoryIds(entry, data)` - Get effective category IDs
- `getEntryCategoryNames(entry, data)` - Get category names for display
- `getEntityName(entityRef, data)` - Get display name for item or category
- `getCategoryNameById(categoryId, data)` - Get category name by ID

### Date/Time Formats

- Dates stored as `YYYY-MM-DD` strings
- Times stored as `HH:MM` strings (24-hour format)
- Display uses locale formatting via `analysis.ts` utilities
- Time display converts to 12-hour format with AM/PM

### Mobile-First Design

- Bottom navigation bar with safe area padding (`env(safe-area-inset-bottom)`)
- Max width `4xl` (896px) for content
- Touch-friendly tap targets
- PWA manifest at `/manifest.json`

## Common Tasks

### Adding a New Form Field

1. Add the field to the relevant interface in `types.ts`
2. Add state in the component using `$state()`
3. Use `.form-label` and `.form-input` classes for styling
4. Update the store function to handle the new field
5. Update any affected derived stores or helpers

### Adding a New Page

1. Create `src/routes/[page-name]/+page.svelte`
2. Add navigation item in `+layout.svelte` navItems array
3. Follow existing page patterns for consistency
4. Use `base` from `$app/paths` for internal links

### Modifying Styles

1. Check if a shared class exists in `app.css`
2. If creating new shared styles, add to `app.css` with `@apply`
3. Use existing color variables when possible
4. Test on mobile viewport sizes

### Working with Categories

Categories are stored separately from items and referenced by ID:
- Activity categories and food categories are separate lists
- Items store category IDs in their `categories` array
- Entries can override categories via `categoryOverrides`
- Deleting a category removes it from all items and entries

### Working with Charts

The app uses LayerChart for visualizations:

```svelte
<script lang="ts">
  import Chart from '$components/Chart.svelte';
  import { getFrequencyChartData } from '$lib/analysis';

  const { activities, food } = getFrequencyChartData($entries, timeRange);
  const chartData = [activities, food];
</script>

<Chart data={chartData} chartType="bar" grouping="weekly" />
```

Chart patterns:
- Use `getFrequencyChartData()` for overview charts with activities/food series
- Use `selectTimeSeries()` for single entity time series
- Combine multiple `ChartSeries` in the `data` array for comparison charts
- Grouping options: `'daily'`, `'weekly'`, `'monthly'`
- Chart types: `'bar'` for discrete periods, `'line'` for trends

### Working with Stats Pages

Individual item/category stats use dynamic routes:
- Route: `/stats/[type]/[entityType]/[id]`
- Example: `/stats/activity/item/abc123` or `/stats/food/category/xyz789`
- Use `EntityRef` to reference entities: `{ type, entityType, id }`
- Use `getAvailableEntities()` to populate comparison selectors

## Known Quirks

- **HTML5 date/time input width**: Browsers set intrinsic minimum widths on `<input type="date">` and `<input type="time">` that can cause overflow. This is handled in `app.css` with:
  - `.form-input` includes `min-w-0` and `max-w-full` to constrain width
  - Explicit CSS rules for `input[type='date']`, `input[type='time']`, `input[type='datetime-local']` that reset `min-width: 0` and `max-width: 100%`
- **GitHub Gist sync** is fire-and-forget (no conflict resolution)
- **LocalStorage** is the source of truth; Gist is backup only
- **Entry grouping** shows most recently logged entries first within each day (reverse insertion order)
- **ID generation** uses timestamp + random string (`generateId()` in types.ts)
