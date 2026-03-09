---
name: mock-data-preview
description: Generate seeded mock tracker datasets and Playwright storage state files for UI/UX preview and screenshot automation. Use when an agent needs non-empty realistic data without DevTools, especially before Playwright visual checks.
---

# Mock Data Preview Skill

Script location: `.agents/skills/mock-data-preview/scripts/generate-storage-state.mjs`

Run this command from repo root:

```bash
npm run mock-data:generate -- --origin http://127.0.0.1:4173
```

Optional tuning:

```bash
npm run mock-data:generate -- --origin http://127.0.0.1:4173 --days 120 --average 5 --seed 42
```

Outputs:

- `.artifacts/mock-tracker-data.json`
- `.artifacts/mock-storage-state.json`

## Screenshot workflow (important)

### A) Local Playwright tests inside this repo
Use storage state directly:

```ts
import { test } from '@playwright/test';

test.use({ storageState: '.artifacts/mock-storage-state.json' });

test('stats screenshot', async ({ page }) => {
	await page.goto('http://127.0.0.1:4173/stats');
	await page.screenshot({ path: 'artifacts/stats.png', fullPage: true });
});
```

### B) Codex `browser_tools` Playwright scripts
`browser_tools` runs in a separate container and usually **cannot read** repo-local `.artifacts/mock-storage-state.json` by file path.
Use runtime localStorage injection instead:

1. Open `/settings` once (ensures app localStorage keys/schema are initialized).
2. Inject config + tracker data with `page.evaluate(...)`.
3. Navigate to target routes and capture screenshots.

Example pattern:

```py
await page.goto('http://127.0.0.1:4173/settings', wait_until='networkidle')
await page.evaluate("""(data) => {
  localStorage.setItem('github_token', 'demo-token')
  localStorage.setItem('gist_id', 'demo-gist')
  localStorage.setItem('tracker_data', JSON.stringify(data))
}""", mock_data)
await page.goto('http://127.0.0.1:4173/', wait_until='networkidle')
await page.screenshot(path='artifacts/home.png', full_page=True)
```

After screenshots, regenerate with a new seed only if you need a different scenario. Keep the same seed for stable regression screenshots.
