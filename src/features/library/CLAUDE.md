# Library Feature

Library page for item & category CRUD management. Visually aligned with the Log page — compact card list with swipe-left actions (edit/delete), tap-to-edit via BottomSheet, and a `+` icon button in the header for adding.

## Components

- **`LibraryPage.tsx`** — Layout shell with header, segment controls (Items/Categories tabs), and search bar.
- **`ItemsTab.tsx`** — Item list with swipe gestures + add/edit BottomSheets. Uses `CategoryPicker` for category assignment. Star icon for toggling favorites.
- **`CategoriesTab.tsx`** — Category list with swipe gestures + add/edit BottomSheets. Non-neutral sentiments display as colored badges (green for positive, red for limit) next to the category name.
- **`SentimentPicker.tsx`** — Positive/neutral/limit radio group for setting category sentiment when creating or editing categories.

## Design Notes

- Uses `useSwipeGesture` from `@/features/tracking` for swipe-left actions (matching Log page behavior).
- Items can be favorited/unfavorited via a star icon (uses `toggleFavorite()` from store).
- Adding a new item/category uses a `+` icon button in the page header.
