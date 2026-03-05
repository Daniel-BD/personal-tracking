# Codebase Review — Findings

Systematic review of the entire codebase for bugs, DRY violations, hardcoded values, unnecessary comments, file size issues, unused imports, and other code quality problems.

---

## Priority 1: Bugs

### date-utils.ts:28 — Timezone bug in `formatDateWithYear()`
```typescript
const [year, month, day] = dateString.split('-').map(Number);
const date = new Date(year, month - 1, day);
```
Creates a Date in **local timezone** but the dateString is ISO format. This causes dates to shift by the user's timezone offset (e.g., "2025-01-15" in UTC-5 becomes Jan 14). Compare with `formatDate()` line 18 which correctly uses `new Date(dateString + 'T00:00:00')`.

**Fix:** Change to `const date = new Date(dateString + 'T00:00:00');`

### types.ts:61 — Unsafe time string extraction
```typescript
return now.toTimeString().slice(0, 5); // HH:MM format
```
`toTimeString()` format varies by browser/locale. More reliable: parse `getHours()` and `getMinutes()` directly, matching the pattern in `formatDateLocal()`.

### GoalDashboard.tsx:60 & CategoryDetailPage.tsx:64 — Hardcoded baseline slice
```typescript
const baselineWeeks = sparklineData.slice(3, 7);
```
Assumes exactly 8 weeks of data. If `weeks` length differs, this silently calculates an incorrect baseline. No guard against insufficient data.

### StarIcon.tsx:9 — `getComputedStyle()` called on every render
Performs a reflow on every render. The CSS variable `--color-favorite` should be read once and cached, or passed as a prop.

---

## Priority 2: File Size Violations

| File | Lines | Limit | Action |
|------|-------|-------|--------|
| `store.ts` | 561 | 400 | Extract Entry CRUD (~53 lines) into `entry-crud.ts` |
| `stats-engine.ts` | 411 | 400 | Extract `getChartColors`, `buildCategoryColorMap`, `getTopLimitCategories` into separate files |
| `EntryList.tsx` | 287 | 250 | Extract edit-related logic into `useEntryEdit()` hook |
| `CategoriesTab.tsx` | 262 | 250 | Extract shared CRUD row component with ItemsTab |
| `ItemsTab.tsx` | 255 | 250 | Extract shared CRUD row component with CategoriesTab |

---

## Priority 3: DRY Violations

### SENTIMENT_COLORS duplicated in 6 files
The same `SENTIMENT_COLORS` object (`{ positive, neutral, limit }`) is defined in:
- `GoalCard.tsx`
- `CategoryDetailPage.tsx`
- `BalanceScoreTrendChart.tsx`
- `WeekHistoryGrid.tsx`
- `CategoryTrendChart.tsx`
- `BalanceOverview.tsx`

**Fix:** Extract to a shared constant in `stats-engine.ts` or a dedicated `chart-constants.ts`.

### Balance score calculation duplicated
- `daily-balance.ts:11-30`: `(counts.positive / total) * 100`
- `stats-engine.ts:169-173`: `(positive / (positive + limit)) * 100`

**Fix:** Extract to a shared utility function.

### ItemsTab & CategoriesTab — nearly identical CRUD components
Both share identical patterns for: swipe gesture setup, row rendering with swipe actions, empty state structure, BottomSheet add/edit forms, and `useLibraryForm` hook usage.

**Fix:** Extract a parameterized `<LibraryCRUDList>` component.

### sync.ts:198-230 — `clearConfirmedDeletions()` has 7 near-identical loops
Each loop iterates a pending deletion set and removes confirmed IDs.

**Fix:** Extract into a helper function called 7 times with different parameters.

### entry-grouping.ts:65-144 — Duplicate week-start logic
`getWeekStart()` and `getWeekRange()` both calculate Monday of a week independently.

**Fix:** Extract common `calculateWeekMonday()` helper.

### Recharts inline type workarounds duplicated
`GoalCard.tsx:148` and `CategoryTrendChart.tsx:81` both repeat the same verbose Recharts dot prop type.

**Fix:** Extract shared Recharts type definitions.

---

## Priority 4: Hardcoded Values to Extract

| File | Line | Value | Suggested Constant |
|------|------|-------|--------------------|
| `schemas.ts` | 37-38 | `'rolling_4_week_avg'`, `'last_week'` | `DASHBOARD_BASELINE`, `DASHBOARD_COMPARISON` (also hardcoded in migration.ts:45-46 and store.ts:369-370) |
| `stats-engine.ts` | 162 | `weekEntries.length < 5` | `LOW_DATA_THRESHOLD = 5` |
| `GoalCard.tsx` | 41 | `Math.abs(deltaPercent) < 0.1` | `STABLE_CHANGE_THRESHOLD = 0.1` |
| `ActionableCategories.tsx` | 11 | `MAX_DASHBOARD_CARDS = 6` | Document why 6 |
| `import-export.ts` | 16 | `'tracker-backup-'` | `BACKUP_FILENAME_PREFIX` |
| `GoalDashboard.tsx` | 99 | `maxHeight: 'calc(3 * 180px + 2 * 1rem)'` | Use CSS Grid auto-fit or data-driven height |

---

## Priority 5: Accessibility Issues

- **SegmentedControl.tsx** — Missing keyboard navigation (arrow keys). Should support `aria-pressed` or implement keyboard handling for WCAG 2.1 AA.
- **App.tsx:107** — Active NavLink should have `aria-current="page"` for assistive technology.
- **BottomSheet.tsx:64** — Missing `aria-label` fallback when no `title` prop is provided.
- **Toast.tsx** — Individual toasts should have `role="status"` and `aria-live="polite"`.
- **Toast.tsx:42** — Button missing explicit `type="button"`.
- **ReloadPrompt.tsx:18** — Button missing explicit `type="button"`.
- **ItemsTab.tsx:101,110** — Hardcoded aria-labels "Edit item" / "Delete item" not localized.
- **CategoriesTab.tsx:116,125** — Same: hardcoded aria-labels not localized.

---

## Priority 6: Stale `useMemo` Dependencies

Several `useMemo` calls have empty dependency arrays `[]` but should track data changes:

- **StatsPage.tsx:19** — `getLastNWeeks(8)` won't recalculate after week rollover.
- **ActionableCategories.tsx:19** — Same issue.
- **GoalDashboard.tsx:19** — Depends on `data.entries` but not time.
- **CategoryComposition.tsx:45-46** — `topCategoryIds` has empty deps but should depend on `weeklyData`.

---

## Priority 7: Type Safety & Validation

- **github.ts:128** — `as unknown as { description: string }` cast. Fix: add `description` field to `GistResponseSchema`.
- **import-export.ts:34** — Unsafe cast `result.data as TrackerData`. Fix: validate with `TrackerDataSchema.safeParse()` after migration.
- **SentimentPicker.tsx:10-14** — `getActiveStyle()` doesn't exhaustively check all `CategorySentiment` values. Use exhaustive switch.

---

## Priority 8: Improvements (Lower Priority)

### Performance
- **LogPage.tsx:13-14** — Imports `useActivityItems()` and `useFoodItems()` but only checks `.length > 0`. Create a `useHasAnyItems()` selector.
- **stats-engine.ts:148-150** — Multiple filter-reduce chains for sentiment calculations. Consolidate into single pass.
- **FrequencyRanking.tsx:22** — `rankItems` and `rankCategories` are nearly identical. Refactor into single generic function.

### Error Handling
- **BackupSection.tsx & GistConfigSection.tsx** — Generic `.catch()` blocks suppress errors. Log error details.
- **ExportImportSection.tsx:32-44** — `FileReader.onload` doesn't validate `e.target?.result` is a string before parsing.

### Style
- **EntryList.tsx:118,124** — Remove obvious JSX comments.
- **EntryList.tsx:196** — Hardcoded emoji strings. Use `getTypeIcon()` consistently.
- **hooks.ts:5-7** — Empty array constants should use `Object.freeze()` to prevent accidental mutation.
- **types.ts:65-79** — Type display utilities (`getTypeColor`, `getTypeLabel`, etc.) could be data-driven with a config map.
- **app.css:351-385** — `.btn-primary`, `.btn-success`, `.btn-secondary`, `.btn-danger` duplicate the base `.btn` styles.

### Testing Gaps
- `src/features/library/` — No tests for ItemsTab, CategoriesTab, or LibraryPage.
- `src/features/settings/` — No tests at all.

---

## Summary

| Category | Count |
|----------|-------|
| Bugs | 4 |
| File size violations | 5 |
| DRY violations | 6 |
| Hardcoded values | 6+ |
| Accessibility | 8 |
| Stale useMemo deps | 4 |
| Type safety | 3 |
| Performance | 3 |
| Error handling | 2 |
| Style/cleanup | 5+ |
| Testing gaps | 2 areas |

**Most impactful fixes:** The timezone bug in `formatDateWithYear()`, the `SENTIMENT_COLORS` DRY violation (6 files), and the file size violations (5 files over limit).
