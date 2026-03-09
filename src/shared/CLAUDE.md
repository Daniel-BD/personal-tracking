# Shared Layer

Cross-feature, reusable code. Must NOT import from `features/`. Data flows one way: features depend on shared, not the reverse.

## Store (`store/`)

- **`store.ts`** — Singleton external store with `useSyncExternalStore`-compatible API (`dataStore`, `syncStatusStore`). All CRUD operations (items, categories, entries, dashboard cards) plus merge operations (`mergeItem()`, `mergeCategory()`) and thin export/import wrappers. Every data mutation goes through this file. Store initialization is guarded by a module-level flag and invoked from `App.tsx`.
- **`sync.ts`** — Gist sync/merge logic. Contains `pushToGist`, `loadFromGistFn`, `mergeTrackerData`, `pendingDeletions` tracking, and backup operations. Called by store.ts through wrapper functions.
- **`migration.ts`** — Data migration (`migrateData()` for sentiment field) and dashboard initialization (`initializeDefaultDashboardCards()`).
- **`import-export.ts`** — Import validation (`validateAndParseImport()`) and export download (`triggerExportDownload()`). Field-level validation of entries, items, and categories. Called by store.ts wrappers.
- **`hooks.ts`** — React hooks wrapping the external store. Provides `useTrackerData()` for full data access, `useSyncStatus()`, and fine-grained selector hooks (`useEntries()`, `useActivityItems()`, `useFoodItems()`, `useActivityCategories()`, `useFoodCategories()`, `useDashboardCards()`, `useFavoriteItems()`) that prevent re-renders when unrelated data changes.

### External Store Pattern Details

Instead of React Context, the store uses a module-level singleton with `useSyncExternalStore` for reactivity. Store functions (CRUD operations) can be called from anywhere without prop drilling. Since `updateData()` uses object spread, unchanged sub-arrays keep the same reference, so `useSyncExternalStore` skips re-renders for unaffected slices. Prefer the most specific hook available; use `useTrackerData()` only when the full object is needed (e.g., passing to utility functions that take `TrackerData`).

### Dashboard Cards

`TrackerData.dashboardCards` stores user-configured goal cards. Each card has either a `categoryId` or an `itemId` (both optional, exactly one set). Category cards derive accent color from sentiment; item cards use sentiment-based accent color via `getItemAccentColor()` (positive if mostly positive categories, limit if mostly limit, neutral otherwise). Cards compare this week's count against a rolling 4-week baseline average. The `getCardId()` helper in `types.ts` returns the card's unique identifier (whichever ID is set). CRUD: `addDashboardCard({ categoryId })` or `addDashboardCard({ itemId })`, `removeDashboardCard(cardId)` in `store.ts`.

### Favorites

`TrackerData.favoriteItems` stores an array of item IDs. `toggleFavorite()` and `isFavorite()` in `store.ts`. Favorites are cleaned up when items are deleted.

### Tombstones (Cross-Device Deletion Sync)

Deletions are tracked via **tombstones** — `{ id, entityType, deletedAt }` records stored in `TrackerData.tombstones` and synced to the Gist. This ensures deletions propagate across devices: when Device A deletes an item, the tombstone travels to Device B via the Gist, preventing the union merge from resurrecting the item. Tombstones are pruned after 30 days during merge. The `addTombstone()` and `removeTombstone()` helpers in `sync.ts` manage tombstone CRUD. `removeTombstone()` is used when re-favoriting an item (to undo the unfavorite tombstone). All delete operations in `store.ts` create tombstones alongside `pendingDeletions`. Dashboard cards also keep a small `pendingRestorations.dashboardCards` set: only cards re-added while a matching local pending deletion or tombstone exists are marked restored, and those markers can suppress stale remote dashboard-card tombstones until the remote tombstone is cleared. Safety rules: `pendingDeletions.dashboardCards` always wins over restorations, and any code path that tombstones/removes a dashboard card (including category merge) clears the restoration marker for that ID.

### Known Quirks

- **Gist sync**: Fire-and-forget with merge logic. LocalStorage is always the source of truth. The store tracks `pendingDeletions` (by entity type, local-only) in `sync.ts` as a buffer for unsynced deletions, plus **tombstones** (synced in the Gist) for cross-device deletion propagation. The merge function (`mergeTrackerData`) uses the union of both `pendingDeletions` and tombstones to exclude deleted items. All gist operations (`pushToGist` and `loadFromGistFn`) are serialized via a shared `activeSync` lock in `store.ts` to prevent concurrent operations from racing on `pendingDeletions`. Pushes queue behind loads; loads wait for in-flight pushes via a `while (activeSync)` loop. Defense-in-depth: `mergeById` and `mergeTrackerData` filter deletions from **both** local and remote data, and `filterPendingDeletions()` is applied at `loadFromLocalStorage` time to catch any edge cases where deleted items were written back to localStorage before the push completed.
- **Dashboard initialization**: On first load, `initializeDefaultDashboardCards()` (in `migration.ts`) auto-creates dashboard cards for categories named "Fruit", "Vegetables", or "Sugary drinks" if they exist. Runs once (guarded by `dashboardInitialized` flag).

### Tests

Test files in `store/__tests__/`:

- `fixtures.ts` — Shared test helpers (`makeEntry`, `makeItem`, `makeCategory`, `makeTombstone`, `makeValidData`, `flushPromises`)
- `store-crud.test.ts` — CRUD operations (categories, items, entries, dashboard cards)
- `migration.test.ts` — Data migration + dashboard initialization
- `import-export.test.ts` — Import validation + export
- `gist-sync.test.ts` — Gist sync
- `favorites.test.ts` — Favorites
- `tombstones.test.ts` — Cross-device deletion sync via tombstones

## Lib (`lib/`)

- **`types.ts`** — Data interfaces (`Entry`, `ActivityItem`, `FoodItem`, `Category`, `TrackerData`, `DashboardCard`, `CategorySentiment`, `Tombstone`, `TombstoneEntityType`) and utility functions (`generateId()`, `getTodayDate()`, `getCurrentTime()`, `getCardId()`, collection accessor helpers like `getItems()`, `getCategories()`, `findItemWithCategories()`).
- **`date-utils.ts`** — Shared date/time formatting utilities (`formatTime`, `formatDate`, `formatDateWithYear`, `formatDateLocal`, `formatMonthYear`, `formatWeekLabel`, `getISOWeekNumber`). `formatWeekLabel` returns week numbers (e.g. "W9") instead of dates. `getISOWeekNumber` computes the ISO week number (1–53) from a Date.
- **`github.ts`** — GitHub Gist API integration for backup sync.
- **`theme.ts`** — Theme preference management (light/dark/system). Dark mode applied via `.dark` class on `<html>`.
- **`schemas.ts`** — Zod validation schemas for data import/sync. Types in `types.ts` are derived via `z.infer`.
- **`animation.ts`** — `useAnimatedValue` hook (RAF-based value interpolation, easeOutCubic) and shared easing functions with documented cubic-bezier equivalents. Performance rule: only animate `transform` and `opacity` in DOM keyframes. Always respect `prefers-reduced-motion` (use Motion's `useReducedMotion` hook).

### Tests

- `lib/__tests__/types.test.ts`, `date-utils.test.ts`, `theme.test.ts`

## Hooks (`hooks/`)

- **`useIsMobile.ts`** — Browser-only hook for responsive breakpoint detection (not store-related).

## UI Components (`ui/`)

Must NOT import from `store/` or `features/`. Pure and generic.

### Design Principle: Declarative Props Over Raw ReactNode

Shared UI components should own their own visual output. Instead of accepting `ReactNode` for structural parts (headers, action buttons, footers), accept **primitive props** (strings, callbacks, booleans) and render the UI internally. This keeps styling consistent across all usages and prevents callers from accidentally diverging.

Good — component controls the rendering:

```tsx
<BottomSheet title="Edit Item" actionLabel="Save" onAction={handleSave} actionDisabled={!isValid}>
```

Bad — caller can pass anything, styling drifts between usages:

```tsx
<BottomSheet headerAction={<button className="...">Save</button>}>
```

Reserve `children` for the body/content area where each usage genuinely needs different markup.

### Components

- **`BottomSheet.tsx`** — Slide-up sheet (~85vh max) with backdrop, handle bar, escape-to-close. Locks body scroll when open. Accepts `title`, `actionLabel`, `onAction`, and `actionDisabled` — the component renders the pill-shaped action button itself.
- **`SegmentedControl.tsx`** — Generic pill/segment toggle. Supports `'pill'` (default, gap-separated) and `'segment'` (iOS-style connected, inset background) variants. Also supports `size` prop (`'default'`, `'sm'`, `'xs'`).
- **`MultiSelectFilter.tsx`** — Searchable multi-select dropdown (used on Log page).
- **`NativePickerInput.tsx`** — iOS-safe date/time picker. Renders a styled `<div>` for display with a transparent native `<input>` overlay on top that captures taps, reliably opening the OS picker. Supports optional `onClear` prop for clearable time fields.
- **`NavIcon.tsx`** — Navigation icon component (Lucide icons for bottom nav).
- **`StarIcon.tsx`** — Reusable star icon (Lucide Star, filled/unfilled) for favorites.
- **`IconActionButton.tsx`** — Reusable circular icon action button with semantic tones (`add`, `edit`, `delete`) and app color tokens.
- **`Toast.tsx`** — Toast notification system. `showToast()` is a module-level function (no provider). Toasts auto-dismiss after 3.5s, optionally include an action button.
- **`ConfirmDialog.tsx`** — Wraps `BottomSheet` for destructive action confirmations. Accepts `open`, `onClose`, `onConfirm`, `title`, `message` (optional), and `confirmLabel` (defaults to `'Delete'`). Confirm button is always danger-styled. Use this instead of native `confirm()`.
- **`SentimentPills.tsx`** — Compact positive/limit count pills (green `N+`, red `N−`). Takes `{ positive, limit }` number props. Used by `DaySentimentSummary` and `DailyBalanceScore`.
- **`EntityMetaBadges.tsx`** — Shared entity metadata helpers: `SentimentDot` (accent dot), `EntryTypePill` (activity/food pill), and `CategorySentimentPills` (small sentiment-colored default-category pills used in Stats add modal and Library rows).
- **`TypePillTitle.tsx`** — Shared stacked metadata block that renders the `EntryTypePill` on a row above the entity title (left-aligned). Supports optional leading content (e.g., `SentimentDot`) and optional pill visibility for all-types vs filtered views.
- **`SyncToast.tsx`** — Sync status floating pill. Subscribes to `useSyncStatus()`: "Syncing…" (spinner) → "Synced" (checkmark, 1.5s) → "Sync failed" (2.5s). Only visible when Gist sync is configured.
- **`ErrorBoundary.tsx`** — Class component (React requirement). Accepts optional `label` prop. Shows fallback with "Reload page" and "Try again" buttons.
- **`ReloadPrompt.tsx`** — PWA update prompt (vite-plugin-pwa).

### Known Quirks

- **iOS date/time inputs**: iOS Safari enforces native control sizing on `<input type="date|time">` that CSS cannot override. The `NativePickerInput` component works around this. Previous approach using `showPicker()` was unreliable on iOS Safari.
- **HTML5 date/time input width**: Browsers set intrinsic minimum widths that can cause overflow. Handled in `app.css` with `min-width: 0` and `max-width: 100%` overrides.
