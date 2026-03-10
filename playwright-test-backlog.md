# Playwright Test Backlog

This file tracks the browser-integration test backlog for the Playwright suite in `e2e/`.

## Current Coverage

- [x] Home renders from seeded mocked state
- [x] Quick log from favorites creates a new entry
- [x] Search existing item and log through the bottom sheet

## Progress Tracking

- [x] Workstream A: Home and quick-log coverage expanded
- [x] Workstream B: Log-page coverage expanded
- [x] Workstream C: Library CRUD coverage expanded
- [x] Workstream D: Stats coverage expanded
- [x] Workstream E: Settings and sync coverage expanded
- [x] Workstream F: Reliability and regression harness expanded

## Workstream A: Home And Quick Log

- [x] Favorites and Recent tabs switch correctly with seeded data
- [x] Quick-log toast undo removes the just-created entry
- [x] Quick-log from Recent creates a new entry and updates ordering as expected
- [x] Search with no exact match shows the create action
- [x] Search results close after selecting an existing item
- [x] Existing-item log sheet persists note, custom time, and category overrides
- [x] Home refresh button shows syncing state and returns to idle with mocked sync
- [x] Home setup-required warning appears when seeded sync config is intentionally omitted

## Workstream B: Log Page

- [x] Log route shows seeded entries grouped by date
- [x] Type segmented control filters between all, activities, and food
- [x] Filter sheet can narrow entries by category
- [x] Active filter chips remove individual filters
- [x] Clear-all filters resets the full result set
- [x] Entry edit sheet updates date, time, notes, and category overrides
- [x] Entry delete flow removes an entry after confirmation
- [x] Entry quick-add button duplicates an existing entry for today
- [x] Tapping an entry row opens the item detail route correctly

## Workstream C: Library CRUD

- [x] Library items tab renders seeded items across both types
- [x] Library categories tab renders seeded categories across both types
- [x] Add-item flow creates a new item and makes it searchable from Home
- [x] Edit-item flow updates name and categories
- [x] Delete-item flow removes the item and its row
- [x] Favorite toggle in Library stays in sync with Home favorites
- [x] Add-category flow creates a new category with sentiment
- [x] Edit-category flow updates name and sentiment
- [x] Delete-category flow removes the category and its row
- [x] Item merge flow consolidates entries into the target item
- [x] Category merge flow consolidates category references into the target category
- [x] Library search filters visible items and categories correctly

## Workstream D: Stats

- [x] Stats route renders from seeded data without empty state
- [x] Goal dashboard renders seeded dashboard cards
- [x] Frequency ranking toggles between items and categories
- [x] Frequency ranking toggles between all time, 7 days, and 30 days
- [x] Frequency ranking type filter toggles between all, activities, and food
- [x] Goal card click navigates to the correct item or category detail route
- [x] Category detail route renders weekly trend, days-since-last-logged, and most-logged list
- [x] Category detail period controls update the visible month and year sections
- [x] Item detail route renders weekly trend and linked categories
- [x] Add-goal-card modal adds a category card and persists it on reload
- [x] Add-goal-card modal adds an item card and persists it on reload

## Workstream E: Settings And Sync

- [x] Settings route renders seeded token and gist configuration
- [x] Theme picker changes theme and persists across reload
- [x] Sync status pill shows syncing then synced during mocked refresh
- [x] Sync failure path shows the localized failure toast when the mock returns an error
- [x] Backup section renders when token exists in seeded storage
- [x] Browse-gists flow displays mocked gist list results
- [x] Selecting a primary gist updates stored config
- [x] Selecting a backup gist updates stored config
- [x] Import invalid JSON shows the error state
- [x] Export action triggers a download with tracker data

## Workstream F: Reliability And Regression Harness

- [x] Move seeded-data helpers to support multiple deterministic datasets
- [x] Add a fixture variant for empty-state coverage
- [x] Add a fixture variant for sync-failure coverage
- [x] Add helper assertions for toasts, date groups, and sync-pill transitions
- [x] Add targeted screenshot attachments on failure for high-value routes
- [x] Add CI-friendly reporter configuration
- [x] Add a smoke suite tag for a fast browser pass
- [x] Add a full-regression suite tag for broader nightly coverage

## Suggested Parallel Assignment Map

- [ ] Agent A: Workstream A
- [ ] Agent B: Workstream B
- [ ] Agent C: Workstream C
- [ ] Agent D: Workstream D
- [ ] Agent E: Workstream E
- [ ] Agent F: Workstream F

## Notes

- The current suite uses deterministic seeded localStorage plus mocked GitHub API responses.
- Home-route coverage depends on seeding `github_token`, `gist_id`, and `tracker_data` before first render.
- Prefer accessible selectors first; add test IDs only when the UI does not expose a stable accessible target.
