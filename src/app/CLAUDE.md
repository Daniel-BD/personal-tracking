# App Layer

Root layout, entry point, and global CSS.

## Files

- **`App.tsx`** — Root layout: React Router routes + 5-tab bottom nav bar + toast container + store initialization. Store init is called here on mount.
- **`main.tsx`** — Entry point: `BrowserRouter` + `StrictMode`. Strips trailing slashes from `import.meta.env.BASE_URL` for basename.
- **`app.css`** — Global CSS: color system (CSS custom properties on `:root` and `.dark`), reusable utility classes, dark mode variant, date/time input overrides.

## Known Quirks

- **SPA routing**: The `BASE_PATH` env var can configure the base path for deployment. `main.tsx` strips trailing slashes from `import.meta.env.BASE_URL` for the BrowserRouter basename.
- **Dark mode variant**: Tailwind v4 custom variant `@custom-variant dark (&:where(.dark, .dark *))` enables `dark:` utilities.
- **Date/time input overrides**: `app.css` sets `min-width: 0` and `max-width: 100%` on date/time inputs to prevent browser intrinsic widths from causing overflow.
