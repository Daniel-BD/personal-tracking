import { expect, testWithEmptyState } from './support/fixtures';

testWithEmptyState.describe('Reliability harness e2e @full-regression', () => {
	testWithEmptyState('log route renders the empty-state copy for an empty dataset', async ({ seededPage }) => {
		await seededPage.goto('/log');

		await expect(seededPage.getByRole('heading', { name: 'Log' })).toBeVisible();
		await expect(seededPage.getByText('No entries match your filters')).toBeVisible();
		await expect(seededPage.getByText('Log entries from the Home page')).toBeVisible();
		await expect(seededPage.locator('[data-testid^="entries-date-group-"]')).toHaveCount(0);
	});

	testWithEmptyState(
		'stats route renders empty food and dashboard states for an empty dataset',
		async ({ seededPage }) => {
			await seededPage.goto('/stats');

			await expect(seededPage.getByRole('heading', { level: 1, name: 'Eating patterns' })).toBeVisible();
			await expect(seededPage.getByText('No food entries logged yet')).toBeVisible();
			await expect(seededPage.getByText('Start logging food items to see your eating patterns')).toBeVisible();
			await expect(seededPage.getByRole('heading', { name: 'Goals & Trends' })).toHaveCount(0);
		},
	);
});
