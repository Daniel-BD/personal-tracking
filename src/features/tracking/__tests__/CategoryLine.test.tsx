import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CategoryLine from '../components/CategoryLine';

describe('CategoryLine', () => {
	it('renders sentiment category pills instead of indicator text', () => {
		const { container } = render(
			<CategoryLine
				categoryIds={['c1', 'c2', 'c3']}
				categories={[
					{ id: 'c1', name: 'Bread', sentiment: 'neutral' },
					{ id: 'c2', name: 'Sweets', sentiment: 'limit' },
					{ id: 'c3', name: 'Fruit', sentiment: 'positive' },
				]}
			/>,
		);

		expect(screen.getByText('Fruit')).toBeTruthy();
		expect(screen.getByText('Sweets')).toBeTruthy();
		expect(screen.getByText('Bread')).toBeTruthy();
		expect(screen.queryByText('+')).toBeNull();
		expect(screen.queryByText('\u2212')).toBeNull();

		const pills = Array.from(container.querySelectorAll('span')).map((pill) => pill.textContent);
		expect(pills).toEqual(['Fruit', 'Sweets', 'Bread']);
	});

	it('renders empty text when category ids do not resolve', () => {
		render(<CategoryLine categoryIds={['missing']} categories={[]} emptyText="No categories" />);
		expect(screen.getByText('No categories')).toBeTruthy();
	});
});
