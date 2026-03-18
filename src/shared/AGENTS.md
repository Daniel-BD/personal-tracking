# Shared Layer

Cross-feature, reusable code. Must NOT import from `features/`. Data flows one way: features depend on shared, not the reverse.

## Store (`store/`)

- **`store.ts`** — Public facade only. Exposes the compatibility surface (`dataStore`, `syncStatusStore`, initialization, sync trigger wiring, CRUD/merge/import/export/backup commands) by composing smaller internal modules. Keep callers importing from here, but do not move implementation detail back into it.
- **`store-runtime.ts`** — Owns the singleton external-store state (`currentData`, `currentSyncStatus`), subscriptions, snapshots, and persistence on `setData()`. `store.ts` re-exports the store handles from here.
- **`local-persistence.ts`** — Owns tracker LocalStorage loading/saving and the `tracker_data` key. Load path still migrates data, initializes default dashboard cards, and filters pending deletions before hydrating the runtime.
- **`sync-state.ts`** — Owns local-only pending deletion/restoration sets, their persistence keys, and the debounced/serialized sync controller used by the facade.
- **`store-events.ts`** — Typed semantic event surface for app presenters. Emits store-level events such as `sync-completed`, `sync-push-failed`, and `sync-load-failed` with codes/IDs instead of user-facing copy.
- **`merge.ts`** — Pure tombstone and merge helpers: tombstone CRUD, pending-deletion filtering, and `mergeTrackerData(...)`. These helpers take explicit pending-sync state instead of reaching into UI or storage.
- **`commands/`** — Mutation modules split by concern: `entries.ts`, `items-favorites.ts`, `categories-dashboard-cards.ts`, and `import-export-backup.ts`. Bind them in `store.ts`; keep cross-module behavior unchanged.
- **`sync.ts`** — Thin compatibility shim over `sync-state.ts` + `merge.ts` plus Gist network operations (`pushToGist`, `loadFromGistFn`, backup/restore). Emits typed store events on sync completion/failure; does not import UI or translations.
- **`migration.ts`** — Data migration (`migrateData()` for sentiment field) and dashboard initialization (`initializeDefaultDashboardCards()`).
- **`import-export.ts`** — Import validation (`validateAndParseImport()`) and export download (`triggerExportDownload()`). Field-level validation of entries, items, and categories. Called by the import/export command module.
- **`hooks.ts`** — React hooks wrapping the external store. Provides `useTrackerData()` for full data access, `useSyncStatus()`, and fine-grained selector hooks (`useEntries()`, `useActivityItems()`, `useFoodItems()`, `useActivityCategories()`, `useFoodCategories()`, `useDashboardCards()`, `useFavoriteItems()`) that prevent re-renders when unrelated data changes. App presenters subscribe to store events via `subscribeToStoreEvents()` from `store.ts`, not via shared UI. Feature-level derived index hooks belong outside shared; for example, Stats now consumes tracking-owned lookup hooks built on top of these shared slices.

### External Store Pattern Details

Instead of React Context, the store uses a module-level singleton with `useSyncExternalStore` for reactivity. Store commands can be called from anywhere without prop drilling. Since mutations still use object spread, unchanged sub-arrays keep the same reference, so `useSyncExternalStore` skips re-renders for unaffected slices. Prefer the most specific hook available; use `useTrackerData()` only when the full object is needed (e.g., passing to utility functions that take `TrackerData`). When a feature needs richer derived lookups, compose them in that feature from these slice hooks rather than expanding the shared-store API surface.

### Dashboard Cards

`TrackerData.dashboardCards` stores user-configured goal cards. Legacy single-entity cards still use `categoryId` or `itemId`. Combined cards instead store a generated `id`, custom `name`, `entityType` (`'category' | 'item'`), and `entityIds`. Mixing categories and items inside one card is forbidden. Category cards derive accent color from sentiment; item cards use sentiment-based accent color via `getItemAccentColor()` (positive if mostly positive categories, limit if mostly limit, neutral otherwise). Cards compare this week's count against a rolling 4-week baseline average. Use `getCardId()`, `getDashboardCardEntityType()`, and `getDashboardCardEntityIds()` from `types.ts` instead of reading only `categoryId` / `itemId`. CRUD: `addDashboardCard(...)`, `updateDashboardCard(cardId, ...)`, and `removeDashboardCard(cardId)` in `store.ts`. Delete/merge flows must prune combined cards when members disappear.

### Favorites

`TrackerData.favoriteItems` stores an array of item IDs. `toggleFavorite()` and `isFavorite()` in `store.ts`. Favorites are cleaned up when items are deleted.

### Tombstones (Cross-Device Deletion Sync)

Deletions are tracked via **tombstones** — `{ id, entityType, deletedAt }` records stored in `TrackerData.tombstones` and synced to the Gist. This ensures deletions propagate across devices: when Device A deletes an item, the tombstone travels to Device B via the Gist, preventing the union merge from resurrecting the item. Tombstones are pruned after 30 days during merge. The `addTombstone()` and `removeTombstone()` helpers in `sync.ts` manage tombstone CRUD. `removeTombstone()` is used when re-favoriting an item (to undo the unfavorite tombstone). All delete operations in `store.ts` create tombstones alongside `pendingDeletions`. Dashboard cards also keep a small `pendingRestorations.dashboardCards` set: only cards re-added while a matching local pending deletion or tombstone exists are marked restored, and those markers can suppress stale remote dashboard-card tombstones until the remote tombstone is cleared. Safety rules: `pendingDeletions.dashboardCards` always wins over restorations, and any code path that tombstones/removes a dashboard card (including category merge) clears the restoration marker for that ID.

### Known Quirks

- **Gist sync**: Fire-and-forget with merge logic. LocalStorage is always the source of truth. The store tracks `pendingDeletions` (by entity type, local-only) in `sync-state.ts` as a buffer for unsynced deletions, plus **tombstones** (synced in the Gist) for cross-device deletion propagation. The pure merge function (`merge.ts`) uses the union of both `pendingDeletions` and tombstones to exclude deleted items. All gist operations (`pushToGist` and `loadFromGistFn`) are serialized through the debounced sync controller from `sync-state.ts`, which `store.ts` owns. Pushes queue behind loads; loads wait for in-flight pushes. Defense-in-depth: `mergeById` and `mergeTrackerData` filter deletions from **both** local and remote data, and `filterPendingDeletions()` is applied at local load time to catch edge cases where deleted items were written back before the sync completed.
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
- `sync-state.test.ts` — Pending deletion/restoration persistence and debounced sync controller behavior
- `merge-module.test.ts` — Focused coverage for the pure merge helper module
- `store-events.test.ts` — Typed store-event subscription surface

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
- **`SearchField.tsx`** — Shared compact text-search input with the app’s `.form-input-sm` styling and optional trailing clear button. Used by Library and Home quick-log so search affordances stay visually consistent.
- **`Toast.tsx`** — Generic toast provider and viewport. `ToastProvider` owns queued toast state and rendering; no store imports.
- **`useToast.ts`** — React-facing hook for enqueueing toasts from components and hooks. Depends on `ToastProvider`, not on the store.
- **`ConfirmDialog.tsx`** — Wraps `BottomSheet` for destructive action confirmations. Accepts `open`, `onClose`, `onConfirm`, `title`, `message` (optional), and `confirmLabel` (defaults to `'Delete'`). Confirm button is always danger-styled. Use this instead of native `confirm()`.
- **`SentimentPills.tsx`** — Compact positive/limit count pills (green `N+`, red `N−`). Takes `{ positive, limit }` number props. Used by `DaySentimentSummary` and `DailyBalanceScore`.
- **`EntityMetaBadges.tsx`** — Shared entity metadata helpers: `SentimentDot` (accent dot) and `CategorySentimentPills` (small sentiment-colored default-category pills used in Stats add modal and Library rows).
- **`EntityTitle.tsx`** — Shared title text component for entity rows. Uses smaller typography and a two-line ellipsis clamp to protect action-button space in dense lists.
- **`ErrorBoundary.tsx`** — Class component (React requirement). Accepts optional `label` prop. Shows fallback with "Reload page" and "Try again" buttons.
- **`ReloadPrompt.tsx`** — PWA update prompt (vite-plugin-pwa).

### Known Quirks

- **iOS date/time inputs**: iOS Safari enforces native control sizing on `<input type="date|time">` that CSS cannot override. The `NativePickerInput` component works around this. Previous approach using `showPicker()` was unreliable on iOS Safari.
- **HTML5 date/time input width**: Browsers set intrinsic minimum widths that can cause overflow. Handled in `app.css` with `min-width: 0` and `max-width: 100%` overrides.
