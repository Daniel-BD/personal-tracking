# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Workflow Rules

- **Always verify changes build successfully** before considering a task complete. Run `npm run build` after making changes and fix any errors before finishing.
- You may need to run `npm install` first if `node_modules` is missing.

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build (tsc + vite build — always run before finishing)
npm run preview      # Preview production build
```

No test framework is configured — there are no unit or integration tests.

## Project Overview

A personal activity and food tracking PWA built for mobile-first usage. Users log activities and food items with dates, times, notes, and categories. Data persists in LocalStorage and optionally syncs to GitHub Gist for backup.

## Tech Stack

- **Framework**: React 19 with React Router 7
- **Styling**: Tailwind CSS v4 (Vite plugin, not PostCSS)
- **Language**: TypeScript (strict mode)
- **Build**: Vite 7
- **Storage**: LocalStorage (source of truth) + optional GitHub Gist sync (backup only, no conflict resolution)

## Architecture

### Data Flow

All data lives in a single `TrackerData` object containing items, categories, and entries for both activity and food types. The architecture follows this pattern:

1. **`src/lib/types.ts`** — Data interfaces (`Entry`, `ActivityItem`, `FoodItem`, `Category`, `TrackerData`) and utility functions like `generateId()`
2. **`src/lib/store.ts`** — Singleton external store with `useSyncExternalStore`-compatible API (`dataStore`, `syncStatusStore`). All CRUD operations and Gist sync logic live here. Every data mutation goes through this file.
3. **`src/lib/hooks.ts`** — React hooks (`useTrackerData()`, `useSyncStatus()`) that wrap the external store for use in components.
4. **`src/lib/analysis.ts`** — Pure functions for date filtering, statistics, and comparisons. No side effects.
5. **`src/lib/github.ts`** — GitHub Gist API integration for backup sync.
6. **`src/lib/theme.ts`** — Theme preference management (light/dark/system).

### Key Patterns

- **Two parallel type hierarchies**: Activity and food share identical structures (`ActivityItem`/`FoodItem`, separate category lists) but are kept separate throughout. Functions often take an `EntryType` ('activity' | 'food') parameter to select the right list.
- **Category overrides**: Entries can override their item's default categories via `categoryOverrides`. Use `getEntryCategoryIds()` from `analysis.ts` to get effective categories.
- **External store pattern**: Instead of React Context, the store uses a module-level singleton with `useSyncExternalStore` for reactivity. This allows store functions (CRUD operations) to be called from anywhere without prop drilling.

### Routes

- `/` — Home page with quick log form and summary stats
- `/log` — Full log view with filtering and entry history
- `/library` — Manage items and categories (CRUD)
- `/settings` — GitHub Gist sync configuration and theme preferences

Navigation uses a bottom nav bar defined in `App.tsx`.

### Import Paths

- Use relative imports from `src/` (e.g., `../lib/store`, `../components/EntryList`)
- Components are in `src/components/`
- Pages are in `src/pages/`
- Business logic is in `src/lib/`

## Styling

### Reusable CSS Classes (defined in `app.css`)

Use these instead of repeating Tailwind utilities: `.form-label`, `.form-input`, `.form-input-sm`, `.btn`, `.btn-primary`, `.btn-success`, `.btn-secondary`, `.btn-danger`, `.btn-sm`, `.btn-lg`.

### Color Conventions

- Activity = blue (`blue-600`), Food = green (`green-600`)
- Cards use the `.card` utility class
- Category pills: `bg-[var(--bg-inset)] text-label px-2 py-0.5 rounded`
- CSS custom properties defined in `app.css` for both light and dark modes

## Known Quirks

- **HTML5 date/time input width**: Browsers set intrinsic minimum widths that can cause overflow. Handled in `app.css` with `min-width: 0` and `max-width: 100%` overrides on date/time inputs.
- **Gist sync**: Fire-and-forget with merge logic. LocalStorage is always the source of truth. The store tracks pending deletions to prevent deleted items from being restored during merge.
- **Entry sorting**: Within each day, entries sort by time (latest first); entries without time come after entries with time.
- **SPA routing**: The `BASE_PATH` env var can configure the base path for deployment.
