# App Layer

Root layout, entry point, and global CSS.

## Files

- **`App.tsx`** — Root layout: React Router routes (each wrapped in `ErrorBoundary`) + 5-tab bottom nav bar + toast container + store initialization. Store init is called here on mount.
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
- **Activity (blue)**: `--color-activity`, `--color-activity-hover`, `--color-activity-bg`, `--color-activity-bg-strong`, `--color-activity-text`, `--color-activity-border`
- **Food (green)**: `--color-food`, `--color-food-hover`, `--color-food-bg`, `--color-food-bg-strong`, `--color-food-text`, `--color-food-border`
- **Status**: `--color-success*`, `--color-danger*`, `--color-warning*`, `--color-neutral`
- **Other**: `--color-favorite` (star yellow), `--chart-color-1` through `--chart-color-9`, `--bg-toast`, `--shadow-card`, `--shadow-elevated`

Dark mode is applied via `.dark` class on `<html>`, managed by `theme.ts`.

### Reusable CSS Classes (defined in `app.css`)

- **Forms**: `.form-label`, `.form-input`, `.form-input-sm`
- **Buttons**: `.btn`, `.btn-primary`, `.btn-success`, `.btn-secondary`, `.btn-danger`, `.btn-sm`, `.btn-lg`
- **Layout**: `.card`, `.bg-surface`, `.bg-inset`
- **Text**: `.text-heading`, `.text-body`, `.text-label`, `.text-subtle`
- **Type accents**: `.type-activity`, `.type-food`, `.type-activity-muted`, `.type-food-muted`
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

- Activity = blue (`--color-activity`), Food = green (`--color-food`)
- Positive sentiment = success green, Limit sentiment = danger red, Neutral = gray
- Cards use the `.card` utility class
- Category pills: `bg-[var(--bg-inset)] text-label px-2 py-0.5 rounded`
