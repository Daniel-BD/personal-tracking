# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Workflow Rules

- **Always verify changes build successfully** before considering a task complete. Run `npm run build` after making changes and fix any errors before finishing. Pre-existing warnings (e.g. a11y warnings) can be ignored, but new errors must be resolved.
- You may need to run `npm install` first if `node_modules` is missing.

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build (always run before finishing)
npm run check        # TypeScript/Svelte type checking
npm run check:watch  # TypeScript check in watch mode
npm run preview      # Preview production build
```

No test framework is configured — there are no unit or integration tests.

## Project Overview

A personal activity and food tracking PWA built for mobile-first usage. Users log activities and food items with dates, times, notes, and categories. Data persists in LocalStorage and optionally syncs to GitHub Gist for backup.

## Tech Stack

- **Framework**: SvelteKit 2 with Svelte 5 (runes syntax exclusively)
- **Styling**: Tailwind CSS v4 (Vite plugin, not PostCSS)
- **Language**: TypeScript (strict mode)
- **Build**: Vite 7, static adapter (`@sveltejs/adapter-static`)
- **Storage**: LocalStorage (source of truth) + optional GitHub Gist sync (backup only, no conflict resolution)
- **Charts**: LayerChart with D3 scales

## Architecture

### Data Flow

All data lives in a single `TrackerData` object containing items, categories, and entries for both activity and food types. The architecture follows this pattern:

1. **`src/lib/types.ts`** — Data interfaces (`Entry`, `ActivityItem`, `FoodItem`, `Category`, `TrackerData`) and utility functions like `generateId()`
2. **`src/lib/store.ts`** — Svelte writable store (`trackerData`) with derived stores and all CRUD operations. Every data mutation goes through this file. Includes merge logic for Gist sync with pending deletion tracking.
3. **`src/lib/analysis.ts`** — Pure functions for date filtering, statistics, chart data generation, and insights. No side effects.
4. **`src/lib/github.ts`** — GitHub Gist API integration for backup sync.

### Key Patterns

- **Two parallel type hierarchies**: Activity and food share identical structures (`ActivityItem`/`FoodItem`, separate category lists) but are kept separate throughout. Functions often take an `EntryType` ('activity' | 'food') parameter to select the right list.
- **Category overrides**: Entries can override their item's default categories via `categoryOverrides`. Use `getEntryCategoryIds()` from `analysis.ts` to get effective categories.
- **Entity references**: `EntityRef` (`{ type, entityType: 'item' | 'category', id }`) is used throughout stats pages to generically reference items or categories.

### Routes

- `/` — Home page with quick log form and summary stats
- `/log` — Full log view with filtering and entry history
- `/library` — Manage items and categories (CRUD)
- `/stats` — Statistics dashboard with charts, rankings, and insights
- `/stats/[type]/[entityType]/[id]` — Individual item/category stats with comparison
- `/settings` — GitHub Gist sync configuration

Navigation uses a bottom nav bar defined in `+layout.svelte`.

### Import Paths

- Use `$lib/` for library imports (SvelteKit default alias)
- Components are imported via relative paths (no `$components` alias)
- Use `base` from `$app/paths` for all internal links (required for static adapter with configurable base path)

## Svelte 5 Conventions

This project uses Svelte 5 runes syntax exclusively — never use Svelte 4 patterns:

```svelte
<script lang="ts">
  let { type, onsave }: Props = $props();
  let selectedItem = $state<Item | null>(null);
  const items = $derived(type === 'activity' ? $activityItems : $foodItems);
  const filtered = $derived(() => {
    // Use function form for complex computations
    return $entries.filter(e => e.type === type);
  });
</script>
```

## Styling

### Reusable CSS Classes (defined in `app.css`)

Use these instead of repeating Tailwind utilities: `.form-label`, `.form-input`, `.form-input-sm`, `.btn`, `.btn-primary`, `.btn-success`, `.btn-secondary`, `.btn-danger`, `.btn-sm`, `.btn-lg`.

### Color Conventions

- Activity = blue (`blue-600`), Food = green (`green-600`)
- Cards: `bg-white rounded-lg shadow p-4`
- Category pills: `bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm`

### LayerChart Theme

`app.css` defines CSS custom properties for LayerChart using space-separated HSL values (e.g., `--color-primary: 217 91% 60%`). Also includes `@source` directives to scan LayerChart and svelte-ux node_modules for Tailwind class detection.

## Known Quirks

- **HTML5 date/time input width**: Browsers set intrinsic minimum widths that can cause overflow. Handled in `app.css` with `min-width: 0` and `max-width: 100%` overrides on date/time inputs.
- **Gist sync**: Fire-and-forget with merge logic. LocalStorage is always the source of truth. The store tracks pending deletions to prevent deleted items from being restored during merge.
- **Entry sorting**: Within each day, entries sort by time (latest first); entries without time come after entries with time.
- **Static adapter**: Uses `fallback: 'index.html'` for SPA-style routing. The `base` path is configurable via `BASE_PATH` env var.
