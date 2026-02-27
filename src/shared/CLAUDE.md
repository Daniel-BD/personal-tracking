# Shared Layer

Cross-feature, reusable code. Must NOT import from `features/`. Data flows one way: features depend on shared, not the reverse.

## Store (`store/`)

- **`store.ts`** — Singleton external store with `useSyncExternalStore`-compatible API (`dataStore`, `syncStatusStore`). All CRUD operations (items, categories, entries, dashboard cards) and thin export/import wrappers. Every data mutation goes through this file. Store initialization is guarded by a module-level flag and invoked from `App.tsx`. Kept under 400 lines.
- **`sync.ts`** — Gist sync/merge logic. Contains `pushToGist`, `loadFromGistFn`, `mergeTrackerData`, `pendingDeletions` tracking, and backup operations. Called by store.ts through wrapper functions.
- **`migration.ts`** — Data migration (`migrateData()` for sentiment field) and dashboard initialization (`initializeDefaultDashboardCards()`).
- **`import-export.ts`** — Import validation (`validateAndParseImport()`) and export download (`triggerExportDownload()`). Field-level validation of entries, items, and categories. Called by store.ts wrappers.
- **`hooks.ts`** — React hooks wrapping the external store. Provides `useTrackerData()` for full data access, `useSyncStatus()`, and fine-grained selector hooks (`useEntries()`, `useActivityItems()`, `useFoodItems()`, `useActivityCategories()`, `useFoodCategories()`, `useDashboardCards()`, `useFavoriteItems()`) that prevent re-renders when unrelated data changes.

### External Store Pattern Details

Instead of React Context, the store uses a module-level singleton with `useSyncExternalStore` for reactivity. Store functions (CRUD operations) can be called from anywhere without prop drilling. Since `updateData()` uses object spread, unchanged sub-arrays keep the same reference, so `useSyncExternalStore` skips re-renders for unaffected slices. Prefer the most specific hook available; use `useTrackerData()` only when the full object is needed (e.g., passing to utility functions that take `TrackerData`).

### Dashboard Cards

`TrackerData.dashboardCards` stores user-configured goal cards (each tied to a `categoryId`). Cards compare this week's count against a rolling 4-week baseline average. CRUD: `addDashboardCard()`, `removeDashboardCard()` in `store.ts`.

### Favorites

`TrackerData.favoriteItems` stores an array of item IDs. `toggleFavorite()` and `isFavorite()` in `store.ts`. Favorites are cleaned up when items are deleted.

### Known Quirks

- **Gist sync**: Fire-and-forget with merge logic. LocalStorage is always the source of truth. The store tracks `pendingDeletions` (by entity type) in `sync.ts` to prevent deleted items from being restored during merge. All gist operations (`pushToGist` and `loadFromGistFn`) are serialized via a shared `activeSync` lock in `store.ts` to prevent concurrent operations from racing on `pendingDeletions`. Pushes queue behind loads; loads wait for in-flight pushes via a `while (activeSync)` loop.
- **Dashboard initialization**: On first load, `initializeDefaultDashboardCards()` (in `migration.ts`) auto-creates dashboard cards for categories named "Fruit", "Vegetables", or "Sugary drinks" if they exist. Runs once (guarded by `dashboardInitialized` flag).

### Tests

Test files in `store/__tests__/`:

- `fixtures.ts` — Shared test helpers (`makeEntry`, `makeItem`, `makeCategory`, `makeValidData`, `flushPromises`)
- `store-crud.test.ts` — CRUD operations (categories, items, entries, dashboard cards)
- `migration.test.ts` — Data migration + dashboard initialization
- `import-export.test.ts` — Import validation + export
- `gist-sync.test.ts` — Gist sync
- `favorites.test.ts` — Favorites

## Lib (`lib/`)

- **`types.ts`** — Data interfaces (`Entry`, `ActivityItem`, `FoodItem`, `Category`, `TrackerData`, `DashboardCard`, `CategorySentiment`) and utility functions (`generateId()`, `getTodayDate()`, `getCurrentTime()`, collection accessor helpers like `getItems()`, `getCategories()`).
- **`date-utils.ts`** — Shared date/time formatting utilities (`formatTime`, `formatDate`, `formatDateWithYear`, `formatDateLocal`, `formatMonthYear`, `formatWeekLabel`).
- **`github.ts`** — GitHub Gist API integration for backup sync.
- **`theme.ts`** — Theme preference management (light/dark/system). Dark mode applied via `.dark` class on `<html>`.

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
- **`Toast.tsx`** — Toast notification system. `showToast()` is a module-level function (no provider). Toasts auto-dismiss after 3.5s, optionally include an action button.

### Known Quirks

- **iOS date/time inputs**: iOS Safari enforces native control sizing on `<input type="date|time">` that CSS cannot override. The `NativePickerInput` component works around this. Previous approach using `showPicker()` was unreliable on iOS Safari.
- **HTML5 date/time input width**: Browsers set intrinsic minimum widths that can cause overflow. Handled in `app.css` with `min-width: 0` and `max-width: 100%` overrides.
