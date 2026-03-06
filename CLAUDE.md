## Important Workflow Rules

- **Always run `npm run format` before committing** to auto-format all code with Prettier. Pre-commit hooks (Husky + lint-staged) enforce this automatically, but run it manually when needed.
- **Always verify changes build successfully** before considering a task complete. Run `npm run build` after making changes and fix any errors before finishing.
- **Always update the relevant CLAUDE.md file(s)** when making changes to the codebase (new components, changed patterns, modified architecture, renamed files, etc.) so they continue to accurately reflect the actual code. Update the root file for app-wide changes, or the subdirectory file for localized changes.
- **Add or update tests** when creating or modifying features. Keep tests focused and minimal — a few good tests that cover core logic and edge cases are better than many fragile tests that are expensive to maintain. Test files live alongside the code they test in `__tests__/` directories.
- **Always extract shared components** — if a piece of UI or logic is used in more than one place, extract it into a reusable component. When copying a component to use in a new location, extract the shared parts first rather than duplicating code.
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
npm run type-check   # Type-check without building (tsc --noEmit)
npm run format       # Auto-format all code with Prettier (always run before committing)
npm run format:check # Check if code is formatted (CI-friendly, no writes)
```

Tests use **Vitest** with **happy-dom** environment. Config is in `vitest.config.ts`. Shared test helpers (factory functions like `makeEntry`, `makeItem`, `makeCategory`, `makeValidData`) live in `src/shared/store/__tests__/fixtures.ts`.

## Project Overview

A personal activity and food tracking PWA built for mobile-first usage. Users log activities and food items with dates, times, notes, and categories. Data persists in LocalStorage and optionally syncs to GitHub Gist for backup. Includes a Stats page focused on food-category sentiment analysis (balance scores, category composition, goal tracking).

## Tech Stack

- **Framework**: React 19 with React Router 7
- **Styling**: Tailwind CSS v4 (Vite plugin, not PostCSS) — see `src/app/CLAUDE.md` for styling guide
- **Language**: TypeScript (strict mode, `noUnusedLocals`, `noUnusedParameters` — prefix unused params with `_`)
- **Build**: Vite 7
- **Icons**: Lucide React (tree-shakeable, outline-style icons)
- **Animation**: Motion (`motion/react`) — see `src/shared/CLAUDE.md` for animation utilities
- **Charting**: Recharts 3 (Stats page: sparklines, bar charts, stacked charts)
- **Linting/Formatting**: ESLint 9 (flat config) + Prettier (tabs, single quotes, 120 print width) + Husky + lint-staged
- **PWA**: vite-plugin-pwa (Workbox-based service worker, precaching)
- **Validation**: Zod (schemas in `shared/lib/schemas.ts` — types derived via `z.infer`)
- **Class names**: `cn()` from `shared/lib/cn.ts` (`clsx` + `tailwind-merge`)
- **Storage**: LocalStorage (source of truth) + optional GitHub Gist sync (backup only)

## Architecture Overview

All data lives in a single `TrackerData` object containing items, categories, entries, and dashboard cards for both activity and food types. The architecture follows a **feature-based** pattern with a shared layer.

### Routes

- `/` — Home (quick-log command palette, favorites, daily balance score)
- `/log` — Filterable entry list with swipe actions
- `/stats` — Goal dashboard, balance score, category composition, frequency ranking
- `/stats/category/:categoryId` — Category detail page (8-week trend chart, week history grid)
- `/library` — Item & category CRUD management
- `/settings` — Theme, Gist sync, export/import, backup

Navigation uses a 5-tab bottom nav bar defined in `App.tsx`.

### Key Architectural Patterns

- **Path aliases**: `@/` maps to `src/` (configured in tsconfig, vite, vitest).
- **Two parallel type hierarchies**: Activity and food share identical structures but are kept separate. Functions take `EntryType` ('activity' | 'food').
- **External store**: Module singleton + `useSyncExternalStore` (not Context). Fine-grained selector hooks prevent re-renders. See `src/shared/CLAUDE.md`.
- **Category overrides**: Entries override item defaults via `categoryOverrides`. Use `getEntryCategoryIds()`. See `src/features/tracking/CLAUDE.md`.
- **Category sentiment**: Categories have `sentiment` ('positive' | 'neutral' | 'limit'). See `src/features/tracking/CLAUDE.md`.
- **Gist sync**: Debounced push, merge-on-load (local wins on conflict). See `src/shared/CLAUDE.md`.

Component and feature-specific patterns (bottom sheets, toasts, swipe gestures, etc.) are documented in their respective CLAUDE.md files.

### High-Level File Structure

```
src/
├── app/          # Root layout, entry point, global CSS, styling guide
├── shared/       # Cross-feature: store, types, hooks, UI components
│   ├── lib/      # Pure utilities (types, date-utils, github, theme, animation)
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

See `src/app/CLAUDE.md` for the full styling guide (color system, CSS classes, conventions). Read it when writing UI code.
