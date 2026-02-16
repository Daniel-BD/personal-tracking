# Settings Feature

Settings page split into section components. Exports its public API via `index.ts` barrel.

## Files

- **`types.ts`** — Shared types (`GistInfo` interface).
- **`SettingsPage.tsx`** — Layout shell: section composition + shared gist list.
- **`ThemeSection.tsx`** — Theme picker (light/dark/system). Uses `theme.ts` from `@/shared/lib`.
- **`GistConfigSection.tsx`** — GitHub token + Gist ID configuration for sync.
- **`ExportImportSection.tsx`** — JSON export/import. Uses `triggerExportDownload()` and `validateAndParseImport()` from store.
- **`BackupSection.tsx`** — Backup Gist management.
