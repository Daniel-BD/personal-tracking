# Refactor Plan: Store Boundaries, Stats Selectors, and Library Entity Managers

## Summary
- [ ] Execute this as a staged-shim refactor. Preserve current behavior, routes, data schema, LocalStorage keys, and the existing `@/shared/store/store` import surface while splitting internals behind it.
- [ ] Sequence the work in four phases: store/sync decomposition, notification and sync UI boundary cleanup, stats selector/index refactor, and library entity-manager refactor.
- [ ] Current baseline is green: `npm run test -- --run` and `npm run type-check` pass. Every phase must keep that baseline green and finish with lint, build, and format.

## Implementation Changes
### Phase 1: Store and Sync Decomposition
- [ ] Keep `src/shared/store/store.ts` as the public facade only: subscriptions, initialization, sync trigger wiring, and re-exports of commands.
- [ ] Extract local persistence into a dedicated module that owns loading, saving, and the tracker LocalStorage key.
- [ ] Extract sync state into a dedicated module for pending deletions, pending restorations, persistence of those sets, and sync queue/flush state.
- [ ] Extract merge logic into a pure module for tombstone helpers, pending-deletion filtering, and `mergeTrackerData`.
- [ ] Extract entity mutations into command modules by concern: entries, items and favorites, categories and dashboard cards, and import/export/backup.
- [ ] Preserve the current `TrackerData` wire format, tombstone format, and merge behavior. This phase is structural only.

### Phase 2: Notification and Sync UI Boundaries
- [ ] Remove store-to-UI coupling from shared internals: sync code must stop importing toast utilities and translated strings.
- [ ] Introduce a typed store event surface for semantic events such as sync push failed, sync load failed, and sync completed. Event payloads should be codes and IDs, not translated copy.
- [ ] Move sync presentation into the app layer: relocate the sync status pill out of shared UI and add an app-owned bridge that translates store events into localized toasts.
- [ ] Replace `toast-store.ts` handler injection with a React-facing toast API used from components and hooks. Migrate existing feature callers to that API; non-React store code must emit events instead of triggering UI directly.
- [ ] Update shared-layer docs so `shared/ui` is again store-free and generic.

### Phase 3: Stats Selectors and Indexes
- [ ] Add reusable tracking indexes as pure utilities plus hooks, exported through `@/features/tracking`: `entriesByItem`, `entriesByCategory`, `entriesByWeek`, `itemById`, `categoryById`, and per-item category lookups.
- [ ] Keep `useTrackerData()` available, but refactor the stats screens to stop depending on the full `TrackerData` object when only slices are needed.
- [ ] Refactor `StatsPage` to use slice hooks plus precomputed weekly food stats instead of whole-store memo chains.
- [ ] Refactor `GoalDashboard` to build card view models from slice hooks, dashboard cards, and precomputed indexes; remove repeated per-card filtering.
- [ ] Refactor `CategoryDetailPage` and `ItemDetailPage` into thin view components backed by dedicated view-model hooks that compute weekly data once from indexes.
- [ ] Keep stats behavior unchanged: 8-week windows, 4-week rolling baselines, partial-week prorating, and current routes all stay the same.

### Phase 4: Library Entity Manager Refactor
- [ ] Add a library-scoped scaffold for the repeated add/edit/delete/merge flow so both tabs stop duplicating the same orchestration.
- [ ] Add a library index hook for precomputed lookup maps: categories by ID, categories by type, favorite item ID set, and item counts by category ID.
- [ ] Refactor `ItemsTab` to use the scaffold plus lookup maps so row rendering no longer performs repeated category lookups or repeated favorite checks through the store facade.
- [ ] Refactor `CategoriesTab` to use the scaffold plus precomputed item counts so row rendering and delete/merge previews stop scanning the full item list per row.
- [ ] Keep current routes, bottom sheets, merge behavior, and translations unchanged. The goal is lower duplication and cheaper row rendering, not a UX redesign.

## Public APIs / Interfaces
- [ ] `@/shared/store/store` remains the compatibility entrypoint for existing callers throughout this refactor.
- [ ] `@/shared/store/hooks` keeps the current slice hooks; new hooks are additive.
- [ ] Add a typed store-event subscription interface in `shared/store` for app presenters.
- [ ] Add tracking index exports in `@/features/tracking` so stats and library share the same derived lookup layer.

## Test Plan
- [ ] Keep the current store sync, merge, and tombstone suites passing while extracting modules.
- [ ] Add focused tests for the new merge and pending-deletion modules and for the new store-event surface.
- [ ] Add focused tests for tracking index builders and stats view-model hooks, covering category and item lookup, week bucketing, and unchanged baseline calculations.
- [ ] Add focused tests for library lookup helpers and one regression test per tab for add, edit, merge, and delete flow wiring.
- [ ] Each implementation slice ends with `npm run test -- --run`, `npm run lint`, `npm run build`, and `npm run format`.

## Assumptions and Defaults
- [ ] Rollout style is staged with compatibility shims, not a big-bang rewrite.
- [ ] This is a no-user-visible-behavior refactor unless an existing bug is uncovered while extracting logic.
- [ ] `useTrackerData()` may remain for untouched consumers outside the reviewed hot spots.
- [ ] `refactor_plan.md` should mirror this exact phase structure with checkboxes, and implementation should start with Phase 1 only.
