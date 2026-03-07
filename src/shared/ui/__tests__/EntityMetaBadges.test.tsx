import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { SentimentDot, EntryTypePill, CategorySentimentPills } from '../EntityMetaBadges';

afterEach(cleanup);

describe('EntityMetaBadges', () => {
	it('renders type pill', () => {
		render(<EntryTypePill type="activity" />);
		expect(screen.getByText('activity')).toBeTruthy();
	});

	it('renders sentiment dot', () => {
		const { container } = render(<SentimentDot color="red" />);
		expect(container.querySelector('div')).toBeTruthy();
	});

	it('renders category sentiment pills', () => {
		render(
			<CategorySentimentPills
				categories={[
					{ id: '1', name: 'Protein', sentiment: 'positive' },
					{ id: '2', name: 'Sweets', sentiment: 'limit' },
				]}
			/>,
		);
		expect(screen.getByText('Protein')).toBeTruthy();
		expect(screen.getByText('Sweets')).toBeTruthy();
	});

	it('renders fallback empty text', () => {
		render(<CategorySentimentPills categories={[]} emptyText="No categories" />);
		expect(screen.getByText('No categories')).toBeTruthy();
	});
});
