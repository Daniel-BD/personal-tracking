# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Important Workflow Rules

- **Always run `npm run format` before committing** to auto-format all code with Prettier. Pre-commit hooks (Husky + lint-staged) enforce this automatically, but run it manually when needed.
- **Always verify changes build successfully** before considering a task complete. Run `npm run build` after making changes and fix any errors before finishing.
- **Always update the relevant CLAUDE.md file(s)** when making changes to the codebase (new components, changed patterns, modified architecture, renamed files, etc.) so they continue to accurately reflect the actual code. Update the root file for app-wide changes, or the subdirectory file for localized changes.
- **Add or update tests** when creating or modifying features. Keep tests focused and minimal — a few good tests that cover core logic and edge cases are better than many fragile tests that are expensive to maintain. Test files live alongside the code they test in `__tests__/` directories.
- You may need to run `npm install` first if `node_modules` is missing.

## Checking PR Review Comments

The `gh` CLI is not pre-authenticated in this environment. To check PR review comments, use the `WebFetch` tool on the GitHub PR URL (e.g., `https://github.com/Daniel-BD/personal-tracking/pull/123`). First fetch the PR list page to find the PR number, then fetch the individual PR page to read comments.

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build (tsc + vite build — always run before finishing)
npm run preview      # Preview production build
npm run test         # Run tests once (vitest run)
npm run test:watch   # Run tests in watch mode (vitest)
npm run lint         # Run ESLint on src/ (always run before finishing)
npm run format       # Auto-format all code with Prettier (always run before committing)
npm run format:check # Check if code is formatted (CI-friendly, no writes)
```

Tests use **Vitest** with **happy-dom** environment. Config is in `vitest.config.ts`. Shared test helpers (factory functions like `makeEntry`, `makeItem`, `makeCategory`, `makeValidData`) live in `src/shared/store/__tests__/fixtures.ts`.

## Project Overview

A personal activity and food tracking PWA built for mobile-first usage. Users log activities and food items with dates, times, notes, and categories. Data persists in LocalStorage and optionally syncs to GitHub Gist for backup. Includes a Stats page focused on food-category sentiment analysis (balance scores, category composition, goal tracking).

## Tech Stack

- **Framework**: React 19 with React Router 7
- **Styling**: Tailwind CSS v4 (Vite plugin, not PostCSS)
- **Language**: TypeScript (strict mode)
- **Build**: Vite 7
- **Icons**: Lucide React (tree-shakeable, outline-style icons)
- **Charting**: Recharts 3 (Stats page: sparklines, bar charts, stacked charts)
- **Linting**: ESLint 9 (flat config in `eslint.config.js` — typescript-eslint, react-hooks, react-refresh, jsx-a11y)
- **Formatting**: Prettier (config in `.prettierrc` — tabs, single quotes, 120 print width)
- **Pre-commit**: Husky + lint-staged (auto-runs ESLint and Prettier on staged files)
- **Storage**: LocalStorage (source of truth) + optional GitHub Gist sync (backup only)

## Architecture Overview

All data lives in a single `TrackerData` object containing items, categories, entries, and dashboard cards for both activity and food types. The architecture follows a **feature-based** pattern with a shared layer.

### Routes

- `/` — Home (quick-log command palette, favorites, daily balance score)
- `/log` — Filterable entry list with swipe actions
- `/stats` — Goal dashboard, balance score, category composition, frequency ranking
- `/library` — Item & category CRUD management
- `/settings` — Theme, Gist sync, export/import, backup

Navigation uses a 5-tab bottom nav bar defined in `App.tsx`.

### Key Architectural Patterns

- **Path aliases**: All imports use `@/` alias (mapped to `src/`) configured in `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts`.
- **Two parallel type hierarchies**: Activity and food share identical structures (`ActivityItem`/`FoodItem`, separate category lists) but are kept separate. Functions often take an `EntryType` ('activity' | 'food') parameter.
- **External store pattern**: Module-level singleton with `useSyncExternalStore` instead of React Context. Fine-grained selector hooks prevent unnecessary re-renders. Prefer the most specific hook available; use `useTrackerData()` only when the full object is needed.
- **Category overrides**: Entries can override their item's default categories via `categoryOverrides`. Use `getEntryCategoryIds()` from `@/features/tracking` to get effective categories.
- **Category sentiment**: Each category has a `sentiment` property (`'positive' | 'neutral' | 'limit'`). Defaults to `'neutral'`. Legacy data auto-migrated on load.
- **Toast system**: `showToast()` from `shared/ui/Toast.tsx` is a module-level function (no provider needed). Toasts auto-dismiss after 3.5s, optionally include an action button.
- **Bottom sheet pattern**: `BottomSheet` component provides slide-up sheets with backdrop, handle bar, escape-to-close. Accepts `title`, `actionLabel`, `onAction`, and `actionDisabled` props — the component renders the pill-shaped action button itself (no raw `ReactNode` for the header action).
- **Favorites**: `TrackerData.favoriteItems` stores item IDs. `toggleFavorite()` and `isFavorite()` in `store.ts`.
- **Swipe gestures**: `useSwipeGesture` hook from `@/features/tracking` encapsulates touch-based swipe-left to reveal Edit/Delete actions.
- **Sentiment pills**: `SentimentPills` from `@/shared/ui/SentimentPills` renders compact positive/limit count pills (green `N+`, red `N−`). Used by `DaySentimentSummary` (log screen day headers) and `DailyBalanceScore` (home screen). Takes `{ positive, limit }` number props.

### High-Level File Structure

```
src/
├── app/          # Root layout, entry point, global CSS
├── shared/       # Cross-feature: store, types, hooks, UI components
│   ├── lib/      # Pure utilities (types, date-utils, github, theme)
│   ├── store/    # Singleton store, sync, migration, hooks
│   ├── hooks/    # Browser hooks (useIsMobile)
│   └── ui/       # Reusable UI components (no business logic)
└── features/     # Self-contained feature domains
    ├── tracking/ # Core entry/item/category logic (used by most features)
    ├── quick-log/# Command-palette quick logging
    ├── stats/    # Analytics: goals, balance, composition, ranking
    ├── library/  # Item & category CRUD management
    ├── settings/ # Theme, sync config, export/import
    ├── log/      # Filterable entry list
    └── home/     # Home page orchestration
```

## Code Standards

### File Size Limits

- **Components and pages**: ~250 lines max. Extract hooks, sub-components, or utilities if larger.
- **Utility files** (pure functions in `utils/`): can be longer than 250 lines.
- **`store.ts`**: kept under 400 lines, focused on CRUD only.

### Naming Conventions

| Category | Pattern | Example |
|----------|---------|---------|
| React components | PascalCase `.tsx` | `EntryList.tsx` |
| Hooks | `use` prefix, camelCase `.ts` | `useSwipeGesture.ts` |
| Utility modules | kebab-case `.ts` | `entry-filters.ts` |
| Test files | colocated `__tests__/` folder | `features/tracking/__tests__/entry-filters.test.ts` |
| Barrel exports | `index.ts` per feature | `features/tracking/index.ts` |

Avoid generic dump files like `helpers.ts`, `utils.ts` (without a descriptive prefix), or `misc.ts`.

### Import Boundary Rules

- **Cross-feature**: always import from the feature's `index.ts` barrel, never internal files.
- **Shared code** (`shared/`): must NOT import from `features/`. Data flows one way: features depend on shared, not the reverse.
- **Shared UI** (`shared/ui/`): must NOT import from `shared/store/` or `features/`. UI components are pure and generic.
- **Within a feature**: use relative imports for siblings (e.g., `../utils/entry-filters`, `./GoalCard`).

### Import Paths

- `@/shared/...` for shared modules
- `@/features/<name>` for cross-feature imports (always via barrel `index.ts`)
- Relative imports within a feature

## Styling

### Color System (CSS Custom Properties in `app.css`)

All colors are defined as CSS custom properties on `:root` (light) and `.dark` (dark mode). Use `var(--property-name)` rather than hardcoded Tailwind color classes. Key groups:

- **Backgrounds**: `--bg-page`, `--bg-card`, `--bg-card-hover`, `--bg-elevated`, `--bg-inset`, `--bg-input`
- **Text**: `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-muted`
- **Borders**: `--border-default`, `--border-input`, `--border-subtle`
- **Activity (blue)**: `--color-activity`, `--color-activity-hover`, `--color-activity-bg`, `--color-activity-bg-strong`, `--color-activity-text`, `--color-activity-border`
- **Food (green)**: `--color-food`, `--color-food-hover`, `--color-food-bg`, `--color-food-bg-strong`, `--color-food-text`, `--color-food-border`
- **Status**: `--color-success*`, `--color-danger*`, `--color-warning*`, `--color-neutral`
- **Other**: `--color-favorite` (star yellow), `--chart-color-1` through `--chart-color-9`, `--bg-toast`, `--shadow-card`, `--shadow-elevated`

Dark mode is applied via `.dark` class on `<html>`, managed by `theme.ts`. Tailwind v4 custom variant: `@custom-variant dark (&:where(.dark, .dark *))`.

### Reusable CSS Classes (defined in `app.css`)

- **Forms**: `.form-label`, `.form-input`, `.form-input-sm`
- **Buttons**: `.btn`, `.btn-primary`, `.btn-success`, `.btn-secondary`, `.btn-danger`, `.btn-sm`, `.btn-lg`
- **Layout**: `.card`, `.bg-surface`, `.bg-inset`
- **Text**: `.text-heading`, `.text-body`, `.text-label`, `.text-subtle`
- **Type accents**: `.type-activity`, `.type-food`, `.type-activity-muted`, `.type-food-muted`
- **Animation**: `.animate-fade-in`, `.animate-slide-up`

### Color Conventions

- Activity = blue (`--color-activity`), Food = green (`--color-food`)
- Positive sentiment = success green, Limit sentiment = danger red, Neutral = gray
- Cards use the `.card` utility class
- Category pills: `bg-[var(--bg-inset)] text-label px-2 py-0.5 rounded`
