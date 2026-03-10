# E2E Test Suite Inventory

This file is the current map of what the Playwright suite covers. It is an inventory of tested user flows and scenarios, not a roadmap of desired coverage.

## Harness Coverage

- Default fixture: seeded tracker dataset, mocked GitHub Gist sync, and a ready-to-use Home page.
- Empty-state fixture: used for reliability coverage against an empty dataset.
- Sync-failure fixture: used for localized Settings sync failure coverage.
- High-value route failures attach screenshots for `/`, `/log`, `/library`, `/stats`, and `/settings`.
- Tags:
- `@smoke` covers one fast route-level render scenario for Home, Log, Library, Stats, and Settings.
- `@full-regression` covers the full suite below.

## Scenario Inventory

### `quick-log.spec.ts`

- `@smoke` Home renders correctly from seeded mocked state.
- Favorites and Recent tabs switch correctly with seeded quick-log data.
- Quick log from Favorites creates a new entry visible on the Log page.
- Quick-log toast Undo removes the just-created entry.
- Quick log from Recent creates a new entry and moves that item to the front of the Recent ordering.
- Search with no exact match shows the inline create action.
- Selecting an existing search result closes the search results and opens the log sheet.
- Searching an existing item can log through the bottom sheet with a custom note and time.
- Existing-item log sheet persists note, custom time, and category overrides.
- Home refresh shows syncing state and returns to idle with mocked sync.
- Home shows the setup-required warning when sync config is intentionally missing.

### `log.spec.ts`

- `@smoke` Log renders seeded entries grouped by date.
- Type segmented control filters between All, Activities, and Food.
- Category filters narrow entries; filter chips remove filters; Clear all resets the result set.
- Editing an entry updates date, time, notes, and category overrides.
- Deleting an entry removes it after confirmation.
- Quick add duplicates an existing entry for today.
- Tapping an entry row navigates to the correct item detail route.

### `library.spec.ts`

- `@smoke` Library Items tab renders seeded activity and food items.
- Library Categories tab renders seeded activity and food categories.
- Adding an item in Library makes it searchable and loggable from Home.
- Editing an item updates its name and assigned categories.
- Deleting an item removes its row.
- Favorite toggles in Library stay in sync with Home favorites.
- Adding, editing, and deleting a category preserves and updates its sentiment.
- Library search filters visible items and visible categories.
- Merging an item consolidates its entries into the target item and appends the merge note.
- Merging a category consolidates item references into the target category.

### `stats.spec.ts`

- `@smoke` Stats renders seeded dashboard cards without showing the empty state.
- Frequency ranking toggles across items/categories, 7-day/30-day/all windows, and activity/food type filters.
- Goal dashboard cards navigate to the correct category and item detail routes.
- Category detail renders days-since, weekly summary, most-logged items, and month/year period navigation.
- Item detail renders weekly summary and linked default categories, and linked categories navigate to category detail.
- Adding category and item dashboard cards persists across reloads.

### `settings.spec.ts`

- `@smoke` Settings renders seeded sync config and backup/export sections when a token exists.
- Theme picker changes theme and persists across reload.
- Sync status pill shows syncing and synced during Save & Load.
- Browsing gists shows mocked results and selecting a primary gist updates stored config.
- Selecting a backup gist updates stored config.
- Importing invalid JSON shows the error state.
- Export triggers a download containing tracker data.
- Sync-load failure shows the localized failure toast and error pill state.

### `reliability.spec.ts`

- Log renders the empty-state copy for an empty dataset.
- Stats renders empty food and dashboard states for an empty dataset.

## Coverage Totals

- 43 end-to-end scenarios are currently defined.
- 5 scenarios are tagged `@smoke`.
- Empty-state coverage exists for `/log` and `/stats`.
- Explicit sync failure coverage exists for `/settings`.
