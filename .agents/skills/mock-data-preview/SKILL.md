---
name: mock-data-preview
description: Generate seeded mock tracker datasets and Playwright storage state files for UI/UX preview and screenshot automation. Use when an agent needs non-empty realistic data without DevTools, especially before Playwright visual checks.
---

# Mock Data Preview Skill

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

Use in Playwright:

```ts
import { test } from '@playwright/test';

test.use({ storageState: '.artifacts/mock-storage-state.json' });

test('stats screenshot', async ({ page }) => {
	await page.goto('http://127.0.0.1:4173/stats');
	await page.screenshot({ path: 'artifacts/stats.png', fullPage: true });
});
```

After screenshots, regenerate with a new seed only if you need a different scenario. Keep the same seed for stable regression screenshots.
