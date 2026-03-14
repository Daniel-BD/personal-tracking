# App Layer

Root layout, entry point, and global CSS.

## Files

- **`App.tsx`** — Root layout: React Router routes (each wrapped in `ErrorBoundary`) + 5-tab bottom nav bar + `ToastProvider` + store initialization. Store init is called here on mount.
- **`components/StoreEventToastBridge.tsx`** — App-owned presenter that subscribes to typed store events and translates failure events into localized toasts.
- **`components/SyncStatusPill.tsx`** — App-owned sync status floating pill. Uses `useSyncStatus()` for the active syncing phase and store events for the transient synced/error phases.
- **`main.tsx`** — Entry point: `BrowserRouter` + `StrictMode`. Strips trailing slashes from `import.meta.env.BASE_URL` for basename.
- **`app.css`** — Global CSS: color system (CSS custom properties on `:root` and `.dark`), reusable utility classes, dark mode variant, date/time input overrides.

## ErrorBoundary

`ErrorBoundary` from `@/shared/ui/ErrorBoundary` is a class component (React requirement). Wraps each route in `App.tsx` to catch render errors and show a user-friendly fallback with "Reload page" and "Try again" buttons. Accepts an optional `label` prop (e.g., `"Stats"`) shown in the fallback message.

## Known Quirks

- **SPA routing**: The `BASE_PATH` env var can configure the base path for deployment. `main.tsx` strips trailing slashes from `import.meta.env.BASE_URL` for the BrowserRouter basename.
- **Dark mode variant**: Tailwind v4 custom variant `@custom-variant dark (&:where(.dark, .dark *))` enables `dark:` utilities.
- **Date/time input overrides**: `app.css` sets `min-width: 0` and `max-width: 100%` on date/time inputs to prevent browser intrinsic widths from causing overflow.

## Styling

### Color System (CSS Custom Properties in `app.css`)

All colors are defined as CSS custom properties on `:root` (light) and `.dark` (dark mode). Use `var(--property-name)` rather than hardcoded Tailwind color classes. Key groups:

- **Backgrounds**: `--bg-page`, `--bg-card`, `--bg-card-hover`, `--bg-elevated`, `--bg-inset`, `--bg-input`
- **Text**: `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-muted`
- **Borders**: `--border-default`, `--border-input`, `--border-subtle`
- **Accent (blue)**: `--color-accent`, `--color-accent-hover`, `--color-accent-bg`, `--color-accent-bg-strong`, `--color-accent-text`, `--color-accent-border`
- **Status/Sentiment**: `--color-success*`, `--color-danger*`, `--color-warning*`, `--color-neutral` (neutral is blue)
  - Includes `--color-warning-bg-strong` and `--color-danger-bg-strong` for stronger hover/pressed backgrounds on warning/danger icon actions.
- **Other**: `--color-favorite` (star yellow), `--chart-color-1` through `--chart-color-9`, `--bg-toast`, `--shadow-card`, `--shadow-elevated`

Dark mode is applied via `.dark` class on `<html>`, managed by `theme.ts`.

### Reusable CSS Classes (defined in `app.css`)

- **Forms**: `.form-label`, `.form-input`, `.form-input-sm`
- **Buttons**: `.btn`, `.btn-primary`, `.btn-success`, `.btn-secondary`, `.btn-danger`, `.btn-sm`, `.btn-lg`
- **Layout**: `.card`, `.bg-surface`, `.bg-inset`
- **Text**: `.text-heading`, `.text-body`, `.text-label`, `.text-subtle`
- **Type accents**: `.type-accent`, `.type-accent-muted` (legacy type classes are aliases)
- **Animation**: `.animate-fade-in`, `.animate-slide-up`
- **Quick Log button**: `.ql-btn` + child classes `.ql-ripple`, `.ql-settle`, `.ql-icon`, `.ql-sweep` (static positioning only — animation driven by Motion in QuickLogButton.tsx)

### Conditional ClassNames

Use the `cn()` utility from `@/shared/lib/cn` for conditional class composition instead of template literals with ternaries:

```tsx
// Preferred
className={cn('base-classes', condition && 'conditional-classes', isActive ? 'active' : 'inactive')}
// Avoid
className={`base-classes ${condition ? 'conditional-classes' : ''}`}
```

### Color Conventions

- UI accent = blue (`--color-accent`)
- Sentiment colors: Positive = success green, Limit = danger red, Neutral = blue (`--color-neutral`)
- Cards use the `.card` utility class
- Category pills: `bg-[var(--bg-inset)] text-label px-2 py-0.5 rounded`
