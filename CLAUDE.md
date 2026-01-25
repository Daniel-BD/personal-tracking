# CLAUDE.md

This file provides guidance for Claude (or any AI assistant) when working on this codebase.

## Project Overview

A personal activity and food tracking PWA (Progressive Web App) built for mobile-first usage. Users can log activities and food items with dates, times, notes, and categories. Data persists locally and optionally syncs to GitHub Gist for backup.

## Tech Stack

- **Framework**: SvelteKit 2 with Svelte 5 (uses runes: `$state`, `$derived`, `$props`)
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript (strict mode)
- **Build**: Vite 7
- **Storage**: LocalStorage + optional GitHub Gist sync

## Project Structure

```
src/
├── app.css              # Global styles, CSS component classes
├── components/          # Reusable UI components
│   ├── EntryForm.svelte    # Form for logging entries
│   ├── EntryList.svelte    # Displays logged entries grouped by date
│   ├── ItemPicker.svelte   # Search/select dropdown for items
│   └── CategoryPicker.svelte # Category tag management
├── lib/
│   ├── types.ts         # TypeScript interfaces and utility functions
│   ├── store.ts         # Svelte stores, CRUD operations, sync logic
│   ├── analysis.ts      # Date filtering, statistics, grouping utilities
│   └── github.ts        # GitHub Gist API integration
└── routes/
    ├── +layout.svelte   # App shell with nav bar
    ├── +page.svelte     # Home/dashboard
    ├── activities/      # Activity logging page
    ├── food/            # Food logging page
    ├── library/         # Manage items (activities/food)
    ├── stats/           # Statistics and insights
    └── settings/        # GitHub sync configuration
```

## Key Data Types

```typescript
interface Entry {
  id: string;
  type: 'activity' | 'food';
  itemId: string;
  date: string;           // YYYY-MM-DD
  time: string | null;    // HH:MM (optional)
  notes: string | null;
  categoryOverrides: string[] | null;
}

interface ActivityItem | FoodItem {
  id: string;
  name: string;
  categories: string[];
}
```

## Styling Guidelines

### Reusable CSS Classes (defined in `app.css`)

Use these shared classes instead of repeating Tailwind utilities:

| Class | Purpose |
|-------|---------|
| `.form-label` | Standard label for form fields |
| `.form-input` | Text, date, time inputs (includes width constraints for proper sizing) |
| `.form-input-sm` | Smaller input variant |
| `.btn-primary` | Blue primary button |
| `.btn-success` | Green action button |
| `.btn-secondary` | Gray secondary button |
| `.btn-danger` | Red danger button |
| `.btn-sm`, `.btn-lg` | Button size modifiers |

### Color Palette

- **Primary (Blue)**: `blue-600` / `--color-primary: #3b82f6`
- **Success (Green)**: `green-600` / `--color-success: #22c55e`
- **Danger (Red)**: `red-500` / `--color-danger: #ef4444`
- **Text**: `gray-700` (body), `gray-500` (secondary), `gray-400` (muted)
- **Backgrounds**: `gray-50` (page), `white` (cards)

### Common Patterns

- Cards: `bg-white rounded-lg shadow p-4`
- Selected state: `bg-blue-50 border border-blue-200`
- Category pills: `bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm`
- Focus rings: `focus:outline-none focus:ring-2 focus:ring-blue-500`

## Development Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run check    # TypeScript check
npm run preview  # Preview production build
```

## Important Conventions

### Svelte 5 Runes

This project uses Svelte 5 runes syntax:
- `$state()` for reactive state
- `$derived()` for computed values
- `$props()` for component props
- `$effect()` for side effects

### Store Pattern

All data mutations go through `src/lib/store.ts`:
- Functions like `addEntry()`, `deleteEntry()`, etc.
- Auto-saves to localStorage on every change
- Auto-syncs to GitHub Gist if configured

### Date/Time Formats

- Dates stored as `YYYY-MM-DD` strings
- Times stored as `HH:MM` strings (24-hour)
- Display uses locale formatting via `analysis.ts` utilities

### Mobile-First Design

- Bottom navigation bar with safe area padding
- Max width `4xl` for content
- Touch-friendly tap targets

## Common Tasks

### Adding a New Form Field

1. Add the field to the relevant type in `types.ts`
2. Add state in the component using `$state()`
3. Use `.form-label` and `.form-input` classes for styling
4. Update the store function to handle the new field

### Adding a New Page

1. Create `src/routes/[page-name]/+page.svelte`
2. Add navigation item in `+layout.svelte` navItems array
3. Follow existing page patterns for consistency

### Modifying Styles

1. Check if a shared class exists in `app.css`
2. If creating new shared styles, add to `app.css` with `@apply`
3. Use existing color variables when possible

## Known Quirks

- **HTML5 date/time input width**: Browsers set intrinsic minimum widths on `<input type="date">` and `<input type="time">` that can cause overflow. This is handled in `app.css` with:
  - `.form-input` includes `min-w-0` and `max-w-full` to constrain width
  - Explicit CSS rules for `input[type='date']`, `input[type='time']`, `input[type='datetime-local']` that reset `min-width: 0` and `max-width: 100%`
- GitHub Gist sync is fire-and-forget (no conflict resolution)
- LocalStorage is the source of truth; Gist is backup only
