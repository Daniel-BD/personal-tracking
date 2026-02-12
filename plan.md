# Codebase Architecture Refactoring Plan

## Analysis Summary

**Total: ~6,100 lines across 31 files.** The codebase is well-structured with clear separation of concerns. The issues below are ordered by impact — dead code removal first, then duplication consolidation, then structural improvements.

---

## 1. Remove Dead Code (~260 lines saved)

### 1a. Delete `UnifiedItemPicker.tsx` (140 lines)
- **File**: `src/components/UnifiedItemPicker.tsx`
- **Why**: Marked as "legacy, unused by Quick Log" in CLAUDE.md. No imports found anywhere in the codebase. `QuickLogForm.tsx` reimplemented this functionality inline with a different approach.
- **Action**: Delete the file entirely.

### 1b. Delete `ItemPicker.tsx` (116 lines)
- **File**: `src/components/ItemPicker.tsx`
- **Why**: Not imported by any other file. The Quick Log flow uses its own inline search, and the Library page handles item selection differently. This component is orphaned.
- **Action**: Delete the file entirely.

### 1c. Remove unused exports from `analysis.ts` (~65 lines)
- `getFrequencyChartData()` (lines 415-437) — not imported anywhere
- `getAvailableEntities()` (lines 862-893) — not imported anywhere
- `countEntries()` (line 132-134) — trivial wrapper around `.length`, only called once in `compareMonths` which could just use `.length` directly

---

## 2. Consolidate Duplicated Logic (~80 lines saved)

### 2a. Duplicate `getCategoryNames` implementations (4 copies)
The same "resolve category IDs to names" logic exists in:
- `QuickLogForm.tsx:87-93` — local function
- `ItemPicker.tsx:36-42` — local function (will be deleted per 1b)
- `UnifiedItemPicker.tsx:47-54` — local function (will be deleted per 1a)
- `EntryList.tsx:77-79` — calls `store.getCategoryNames()`

**The store already has `getCategoryNames(type, ids)`** (`store.ts:462-466`). QuickLogForm should use it instead of reimplementing.

**Action**: In `QuickLogForm.tsx`, replace the local `getCategoryNames` function with a call to the store's version (imported from `../lib/store`).

### 2b. Duplicate time formatting (2 independent implementations)
- `NativePickerInput.tsx:18-24` — `formatTimeDisplay()`
- `EntryList.tsx:14-20` — `formatTime()`

These are identical in logic (12-hour AM/PM formatting).

**Action**: Move the function to `analysis.ts` as `formatTime()` (alongside the existing `formatDate()`), and import from both consumers.

### 2c. Redundant `formatWeekLabel` wrapper in `stats.ts`
- `stats.ts:404-409` wraps `analysis.ts:formatWeekLabel()` by formatting a `Date` to a string, then calling the analysis version.
- This is used in `BalanceOverview.tsx` and `CategoryComposition.tsx`.

**Action**: Add a `Date`-accepting overload to `analysis.ts`'s `formatWeekLabel` instead of having the wrapper in `stats.ts`. Remove the wrapper from `stats.ts`.

---

## 3. Fix Naming Inconsistencies

### 3a. Trailing underscore on function names in `LibraryPage.tsx`
- `handleAddCategory_()` (line 92) and `handleDeleteCategory_()` (line 120) have trailing underscores — likely to avoid a name collision with the imported `addCategory`/`deleteCategory` from the store.
- **Action**: Rename to `handleAddCategorySubmit` and `handleDeleteCategoryConfirm` (or similar) to follow standard naming without the awkward underscore suffix. This also makes the distinction clearer — these are form handlers that wrap the store operations.

---

## 4. Reduce `analysis.ts` Bloat (971 lines → ~840 lines)

This file mixes three distinct concerns:
1. **Date range utilities** (getMonthRange, getWeekRange, formatDateLocal, etc.)
2. **Entry filtering/counting** (filterEntries*, countEntries*, getEntryCategoryIds)
3. **Analytics/chart data** (selectTimeSeries, selectStats, groupEntriesBy*, insights)

### Action: No file split needed, but:
- Remove dead exports (per 1c above): `-65 lines`
- Inline `countEntries()` at its one call site: `-3 lines`
- The file stays manageable at ~840 lines with clearer sections

---

## 5. Structural Issues Worth Addressing

### 5a. `GoalDashboard.tsx` uses `toISOString()` for date formatting (bug-prone)
**File**: `src/components/GoalDashboard.tsx:33-36`
```ts
const range = {
    start: week.start.toISOString().split('T')[0],
    end: week.end.toISOString().split('T')[0]
};
```
`toISOString()` returns UTC, but the dates are local. This can produce off-by-one errors near midnight. The rest of the codebase correctly uses local formatting via `formatDateLocal()` (in `analysis.ts`).

**Action**: Export `formatDateLocal` from `analysis.ts` and use it here instead of the `toISOString().split('T')[0]` pattern.

### 5b. `getLastNWeeks()` called with `useMemo(() => ..., [])`
**File**: `GoalDashboard.tsx:13`
```ts
const weeks = useMemo(() => getLastNWeeks(8), []);
```
Empty dependency array means this never recalculates. If the app stays open past midnight into a new week, the dashboard will show stale week boundaries until a page refresh.

**Action**: Add `data.entries` or a date-based key to the dependency array so it recalculates when entries change (which implies new data that may span a new week). Alternatively, accept this as a known limitation and add a comment.

### 5c. `HomePage.tsx` calls `initializeStore()` on every mount
**File**: `src/pages/HomePage.tsx:27-31`
`initializeStore()` calls `loadFromGist()` which is async and fire-and-forget. If the user navigates away and back, this fires again. The store doesn't guard against concurrent syncs.

**Action**: Add a module-level `initialized` flag in `store.ts` so `initializeStore()` is truly a one-time call, and move the invocation to `App.tsx` (app-level) rather than `HomePage.tsx` (page-level).

### 5d. `importData()` has weak validation
**File**: `src/lib/store.ts:493-514`
Only checks that top-level arrays exist. Doesn't validate that entries have `id`, `type`, `itemId`, `date`, etc. Importing a malformed file could silently corrupt data.

**Action**: Add field-level validation for at least the required `Entry` fields (`id`, `type`, `itemId`, `date`) and `Item` fields (`id`, `name`, `categories`). Reject the import if any object is malformed.

### 5e. Sentiment fallback `?? 'neutral'` scattered across components
The `Category.sentiment` field is typed as required in the interface, but several places still guard with `?? 'neutral'`:
- `LibraryPage.tsx:103` — `category.sentiment ?? 'neutral'`
- `stats.ts:127` — `category?.sentiment ?? 'neutral'`
- `GoalDashboard.tsx:29` — `category.sentiment ?? 'neutral'`

**Action**: Since `createEmptyData()` and `addCategory()` always set sentiment, this fallback is only needed for data created before the sentiment field was added. Add a data migration in `loadFromLocalStorage()` that ensures all categories have `sentiment` set, then remove the scattered fallbacks.

---

## 6. Lower-Priority Improvements (Not Planned for This PR)

These are real issues but lower ROI for this refactoring pass:

- **Split `LibraryPage.tsx` (471 lines)** into `ItemList`/`CategoryList` sub-components — would reduce cognitive complexity but doesn't reduce total lines much
- **Split `SettingsPage.tsx` (434 lines)** into section components — same reasoning
- **Add error boundaries** around Recharts components — defensive but not currently causing issues
- **LogPage pagination** — performance concern only at scale, not needed now
- **QuickLogForm `recentItems`** sorts all entries on every render — could be optimized but only matters with thousands of entries

---

## Implementation Order

1. Delete dead files (`UnifiedItemPicker.tsx`, `ItemPicker.tsx`)
2. Remove unused exports from `analysis.ts`
3. Consolidate `getCategoryNames` duplication
4. Consolidate `formatTime` duplication
5. Remove `formatWeekLabel` wrapper from `stats.ts`
6. Fix `GoalDashboard` UTC date bug
7. Fix naming (`handleAddCategory_` → `handleAddCategorySubmit`)
8. Move `initializeStore()` to `App.tsx` with guard
9. Add data migration for sentiment field
10. Strengthen `importData()` validation
11. Update CLAUDE.md
12. Build verification
