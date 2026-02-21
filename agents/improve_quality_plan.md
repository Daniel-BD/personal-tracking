# Codebase Quality Improvement Plan

Comprehensive audit of the personal-tracking PWA codebase. Items are ordered by priority within each tier, based on impact to code quality, maintainability, and professional standards.

## Progress

- [x] 1. Add ESLint with TypeScript support
- [x] 2. Add pre-commit hooks (Husky + lint-staged)
- [x] 3. Add format check to CI pipeline
- [x] 4. Fix inconsistent callback prop naming
- [x] 5. Replace native `confirm()` dialogs with custom UI
- [x] 6. Add Error Boundaries
- [x] 7. ~~Add test coverage for React components~~ SKIPPED
- [x] 8. Implement PWA service worker for offline support
- [x] 9. Enable stricter TypeScript checks
- [x] 10. Add Zod for runtime data validation
- [x] 11. Add timeout and retry logic to GitHub API calls
- [x] 12. Add Vite build optimizations and route-level code splitting
- [x] 13. Consistent use of predefined CSS utility classes
- [x] 14. Extract hardcoded UI strings for i18n readiness
- [ ] 15. Add `clsx` + `tailwind-merge` for conditional classNames
- [ ] 16. Extract duplicated form state patterns into a shared hook
- [ ] 17. Document magic timeout values
- [ ] 18. Add a `type-check` npm script
- [ ] 19. Consider adding `.editorconfig`

---

## Tier 1 — High Priority (Foundational quality gaps)

### 1. Add ESLint with TypeScript support ✅ DONE

**Problem:** No linter exists in the project. Prettier only handles formatting (whitespace, quotes, semicolons) — it does not catch logical issues, unused imports, React hook rule violations, accessibility problems, or TypeScript anti-patterns.

**Current state:** Zero linting. Tests and `tsc` run in CI, but the only static analysis gate is `tsc` during `npm run build` — there is no lint step.

**What to do:**
- Install `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Consider `eslint-plugin-jsx-a11y` for accessibility linting
- Create `eslint.config.js` (flat config — the modern ESLint standard)
- Add `"lint": "eslint src/"` script to `package.json`
- Add lint step to CI workflow (`test.yml`)

**Why it matters:** Every professional React/TypeScript project uses a linter. Without it, hook dependency bugs, unused imports, accessibility violations, and subtle React anti-patterns go undetected.

---

### 2. Add pre-commit hooks (Husky + lint-staged) ✅ DONE

**Problem:** `CLAUDE.md` says "Always run `npm run format` before committing" — but this is purely manual. Nothing enforces it. Unformatted code can (and likely does) slip into commits.

**What to do:**
- Install `husky` and `lint-staged`
- Configure lint-staged to run Prettier and ESLint on staged files
- Add `"prepare": "husky"` script to `package.json`

**Why it matters:** Manual discipline doesn't scale. Pre-commit hooks make formatting and linting automatic and zero-effort.

---

### 3. Add format check to CI pipeline ✅ DONE

**Problem:** The `test.yml` GitHub Actions workflow runs tests and builds, but never checks formatting. A PR with bad formatting would pass CI.

**What to do:**
- Add a step: `npm run format:check` to the PR workflow
- Add lint step once ESLint is configured: `npm run lint`

**Files:** `.github/workflows/test.yml`

---

### 4. Fix inconsistent callback prop naming (`onchange` vs `onChange`) ✅ DONE

**Problem:** Several shared UI components use lowercase `onchange` and `onclose` for callback props, violating React's universal camelCase convention. This is confusing for anyone reading the code and inconsistent with the rest of the React ecosystem.

**Affected files:**
- `src/shared/ui/BottomSheet.tsx` — `onclose` should be `onClose`
- `src/shared/ui/SegmentedControl.tsx` — `onchange` should be `onChange`
- `src/shared/ui/MultiSelectFilter.tsx` — `onchange` should be `onChange`
- `src/features/tracking/components/CategoryPicker.tsx` — `onchange` should be `onChange`

**What to do:** Rename these props and update all call sites. This is a mechanical find-and-replace within each file and its consumers.

---

### 5. Replace native `confirm()` dialogs with custom UI

**Problem:** The app uses the browser's native `confirm()` for destructive actions (delete entry, delete item, delete category, import data). These dialogs are:
- Ugly and unstyled (break the app's visual design)
- Blocking (freeze the main thread)
- Uncontrollable (can't style, animate, or add undo)
- Not accessible in the same way as in-app UI

**Affected files:**
- `src/features/tracking/components/EntryList.tsx` — delete entry
- `src/features/library/components/ItemsTab.tsx` — delete item
- `src/features/library/components/CategoriesTab.tsx` — delete category
- `src/features/settings/components/ExportImportSection.tsx` — import data
- `src/features/settings/components/BackupSection.tsx` — restore backup

**What to do:** Create a `ConfirmDialog` component (reusing the existing `BottomSheet` pattern) and replace all `confirm()` calls.

---

### 6. Add Error Boundaries

**Problem:** No error boundaries exist anywhere in the app. If any component throws during render (bad data, edge case, network issue), the entire app crashes to a white screen with no recovery path.

**What to do:**
- Create a reusable `ErrorBoundary` component (must be a class component — React requirement)
- Wrap each route in `App.tsx` with an error boundary
- Show a user-friendly fallback with a "reload" button

**Why it matters:** This is a data-tracking app. A crash that loses the user's context or makes them think data is lost is especially bad.

---

## Tier 2 — Medium Priority (Architecture and robustness)

### 7. Add test coverage for React components

**Problem:** The test suite is strong for utility functions and store logic (~380 tests), but **zero React components** are meaningfully tested (only `BottomSheet` has a test, plus a minimal 2-test file for `CategoryPicker`). 30+ components have no tests.

**What to do (prioritized):**
- Test page-level components: `HomePage`, `LogPage`, `StatsPage`, `LibraryPage`
- Test interactive components: `EntryList` (swipe actions), `QuickLogForm`, `ItemsTab`, `CategoriesTab`
- Test shared UI: `Toast`, `SegmentedControl`, `MultiSelectFilter`
- Add `@testing-library/user-event` for realistic interaction testing
- Consider adding coverage thresholds to vitest config

**Why it matters:** Utility tests catch logic bugs. Component tests catch rendering bugs, interaction bugs, and regressions when refactoring UI.

---

### 8. Implement PWA service worker for offline support

**Problem:** The app has a `manifest.json` and PWA meta tags in `index.html`, but **no service worker**. This means:
- The app doesn't work offline (data is in localStorage, but the shell won't load)
- It doesn't qualify as a true installable PWA on most platforms
- No asset caching strategy exists

**What to do:**
- Install `vite-plugin-pwa` (handles service worker generation, caching strategies, and update prompts)
- Configure a cache-first strategy for app shell assets
- Configure network-first for API calls (Gist sync)
- Add an update prompt so users know when a new version is available

---

### 9. Enable stricter TypeScript checks

**Problem:** Two important strict flags are disabled:
```json
"noUnusedLocals": false,
"noUnusedParameters": false
```
This allows dead code and unused function parameters to accumulate silently.

**What to do:**
- Enable `noUnusedLocals: true` and `noUnusedParameters: true`
- Fix any resulting errors (prefix truly unused params with `_`)
- Consider enabling `exactOptionalPropertyTypes` for stricter optional property handling

---

### 10. Add a schema validation library (Zod) for runtime data validation

**Problem:** `import-export.ts` has ~50 lines of hand-written runtime type validation (`isValidEntry`, `isValidItem`, `isValidCategory`). The Gist sync also receives untyped JSON from the GitHub API. These manual validators are fragile, verbose, and don't generate TypeScript types.

**What to do:**
- Install `zod`
- Define data schemas (`EntrySchema`, `ItemSchema`, `CategorySchema`, `TrackerDataSchema`)
- Use `z.infer<typeof Schema>` to derive TypeScript types from schemas (single source of truth)
- Replace manual validators in `import-export.ts` and `github.ts` with `Schema.safeParse()`

**Why it matters:** Schema validation gives you runtime safety + type safety from a single definition. It eliminates an entire class of bugs where the manual validator drifts from the TypeScript type.

---

### 11. Add timeout and retry logic to GitHub API calls

**Problem:** `src/shared/lib/github.ts` uses `fetch()` with no timeout. If the GitHub API hangs, the sync operation blocks indefinitely with no user feedback.

**What to do:**
- Add `AbortController` with a timeout (e.g., 15 seconds) to all fetch calls in `github.ts`
- Add a toast notification when sync fails (currently fails silently — status goes to 'error' but user isn't notified)
- Consider retry with backoff for transient failures

**Files:** `src/shared/lib/github.ts`, `src/shared/store/sync.ts`

---

### 12. Add Vite build optimizations and route-level code splitting

**Problem:** The Vite config is minimal — no explicit chunk splitting, no source maps config, no minification strategy. All route components are eagerly imported in `App.tsx`, so the Stats page (with Recharts) and Settings page (with GitHub integration) add weight even if the user never visits them.

**What to do:**
- Add `build.rollupOptions.output.manualChunks` to split `recharts` into its own chunk
- Lazy-load heavy routes with `React.lazy()` + `<Suspense>` in `App.tsx` (Stats and Settings pages are the best candidates)
- Add `build.sourcemap: 'hidden'` for production debugging without exposing maps
- Add `vite-plugin-visualizer` as a dev dependency for bundle analysis

---

### 13. Consistent use of predefined CSS utility classes

**Problem:** `app.css` defines reusable classes (`.card`, `.btn-*`, `.form-input`, etc.), but some components re-implement the same styles with raw Tailwind classes instead of using the predefined ones.

**Examples:**
- Several places use `rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden shadow-sm` instead of the `.card` class
- Filter chip styling (`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[var(--color-activity-bg)] ...`) is repeated across `LogPage.tsx` — could be a `.chip` or `.filter-tag` utility class

**What to do:**
- Audit all components for patterns that duplicate existing CSS classes
- Extract the filter chip pattern into a `.chip` class in `app.css`
- Replace raw Tailwind duplicates with the predefined class names

---

## Tier 3 — Lower Priority (Polish and future-proofing)

### 14. Extract hardcoded UI strings for i18n readiness

**Problem:** ~300+ hardcoded user-facing strings are scattered across 34 `.tsx` files. Every label, button, placeholder, toast message, empty state, and error message is an inline string literal. This makes future internationalization very expensive.

**Scale of the problem:**
- Settings-related components: ~70 strings
- Library management: ~40 strings
- Log/tracking: ~30 strings
- Stats: ~40 strings
- Quick-log: ~18 strings
- Shared UI: ~10 strings
- Navigation, toasts, confirmations: ~30 strings

**What to do (when i18n becomes a goal):**
- Install `react-i18next` + `i18next`
- Create translation files organized by feature (`en/settings.json`, `en/tracking.json`, etc.)
- Extract strings to translation keys (e.g., `t('settings.title')` instead of `"Settings"`)
- Handle pluralization via i18next's built-in plural rules (currently manual: `entry`/`entries`, `event`/`events`)

**Note:** This is a large refactor with no immediate user benefit unless you plan to support multiple languages. Keeping it as Tier 3 is appropriate — but be aware that the longer you wait, the more strings accumulate.

---

### 15. Add `clsx` + `tailwind-merge` for conditional classNames

**Problem:** Conditional className logic uses template literals with ternaries:
```tsx
className={`base-classes ${condition ? 'active-classes' : ''}`}
```
This works but gets hard to read with multiple conditions, and empty strings can result in double spaces (cosmetic, not functional). Additionally, when composing Tailwind classes from multiple sources (e.g., a component's base classes + props), conflicting classes like `p-2` and `p-4` both apply instead of the last one winning.

**What to do:**
- Install `clsx` and `tailwind-merge`
- Create a `cn()` utility (the standard pattern in Tailwind projects):
  ```ts
  import { clsx, type ClassValue } from 'clsx';
  import { twMerge } from 'tailwind-merge';
  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```
- Refactor complex className expressions to use `cn()`:
  ```tsx
  className={cn('base-classes', condition && 'active-classes', otherCondition && 'other-classes')}
  ```

**Why it's Tier 3:** The current approach works fine. This is a readability and composability improvement, not a correctness fix.

---

### 16. Extract duplicated form state patterns into a shared hook

**Problem:** `ItemsTab.tsx` and `CategoriesTab.tsx` both have nearly identical patterns for:
- Form state (`formName`, `formCategories`, `editingItem`)
- Sheet open/close state (`showAddSheet`, `showEditSheet`)
- useEffect to reset form when sheet opens
- Save/delete handlers

**What to do:**
- Extract a `useSheetForm` or `useLibraryForm` hook that encapsulates the open/close/reset/save cycle
- This reduces each tab component by ~40 lines and prevents the patterns from drifting apart

---

### 17. Document magic timeout values

**Problem:** Three components use `setTimeout` with unexplained magic numbers:
- `QuickLogForm.tsx:90` — `setTimeout(() => setIsFocused(false), 200)`
- `MultiSelectFilter.tsx:80` — `setTimeout(() => setShowDropdown(false), 200)`
- `CategoryPicker.tsx:18-20` — `setTimeout(() => scrollIntoView(), 100)`

These delays exist to work around browser focus/blur timing, but there's no comment explaining why the specific value was chosen.

**What to do:**
- Extract as named constants with explanatory comments:
  ```ts
  /** Delay to allow click events to fire before closing dropdown on blur */
  const BLUR_DEBOUNCE_MS = 200;
  ```

---

### 18. Add a `type-check` npm script

**Problem:** Type checking currently only happens as part of `npm run build` (which runs `tsc -b`). There's no standalone way to type-check without building.

**What to do:**
- Add `"type-check": "tsc --noEmit"` to `package.json` scripts
- Add to CI pipeline as an explicit step (gives clearer error messages than build failure)

---

### 19. Consider adding `.editorconfig`

**Problem:** Without `.editorconfig`, contributors using editors other than those with Prettier integration may use different indentation, line endings, or charset defaults.

**What to do:** Add a `.editorconfig` file matching the Prettier config (tabs, UTF-8, LF line endings, final newline).

---

## Summary Matrix

| # | Item | Impact | Effort | Category |
|---|------|--------|--------|----------|
| 1 | Add ESLint | High | Medium | Tooling |
| 2 | Add pre-commit hooks | High | Low | Tooling |
| 3 | Add format check to CI | High | Low | CI/CD |
| 4 | Fix callback prop naming | Medium | Low | Code quality |
| 5 | Replace `confirm()` dialogs | Medium | Medium | UX / Code quality |
| 6 | Add Error Boundaries | High | Low | Reliability |
| 7 | Add component tests | High | High | Testing |
| 8 | PWA service worker | Medium | Medium | Feature completeness |
| 9 | Stricter TypeScript checks | Medium | Low | Code quality |
| 10 | Add Zod for validation | Medium | Medium | Architecture |
| 11 | API timeout + retry | Medium | Low | Reliability |
| 12 | Vite build optimizations + code splitting | Medium | Low | Performance |
| 13 | Consistent CSS classes | Low | Low | Code quality |
| 14 | i18n string extraction | Low (until needed) | High | Architecture |
| 15 | Add clsx + tailwind-merge | Low | Low | Code quality |
| 16 | Extract form hook | Low | Low | Code quality |
| 17 | Document timeouts | Low | Low | Code quality |
| 18 | Add type-check script | Low | Low | Tooling |
| 19 | Add .editorconfig | Low | Low | Tooling |

---

## What's Already Good

The audit also revealed many things that are done well — worth noting so you don't fix what isn't broken:

- **Store architecture**: The `useSyncExternalStore` singleton pattern with fine-grained selector hooks is excellent. No Context bloat, no prop drilling, minimal re-renders.
- **Feature-based file structure**: Clean separation between features and shared code, with proper barrel exports and import boundaries.
- **CSS variable system**: All colors centralized in `app.css` with CSS custom properties. Zero hardcoded colors in components. Dark mode works via variable swapping, not Tailwind `dark:` prefixes.
- **Tailwind v4 setup**: Correct use of Vite plugin, CSS-first config, `@custom-variant` for dark mode.
- **TypeScript strict mode**: Enabled and respected throughout. No `any` types, no `@ts-ignore`.
- **Data layer**: Store CRUD, migration, import/export validation, and Gist sync merge logic are all well-tested (~380 tests) and cleanly separated from UI.
- **No console.log leaks**: Production code is clean.
- **Proper React patterns**: No class components, no `React.FC`, proper fragment usage, correct useEffect dependencies, function updater form for state, no prop spreading.
