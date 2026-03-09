import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CategoryLine from '../components/CategoryLine';

describe('CategoryLine', () => {
	it('renders sentiment category pills instead of indicator text', () => {
		render(
			<CategoryLine
				categoryIds={['c1', 'c2']}
				categories={[
					{ id: 'c1', name: 'Fruit', sentiment: 'positive' },
					{ id: 'c2', name: 'Sweets', sentiment: 'limit' },
				]}
			/>,
		);

		expect(screen.getByText('Fruit')).toBeTruthy();
		expect(screen.getByText('Sweets')).toBeTruthy();
		expect(screen.queryByText('+')).toBeNull();
		expect(screen.queryByText('\u2212')).toBeNull();
	});

	it('renders empty text when category ids do not resolve', () => {
		render(<CategoryLine categoryIds={['missing']} categories={[]} emptyText="No categories" />);
		expect(screen.getByText('No categories')).toBeTruthy();
	});
});
