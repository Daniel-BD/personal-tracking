import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { EntityHeaderMeta, CategorySentimentPills } from '../EntityMetaBadges';

afterEach(cleanup);

describe('EntityMetaBadges', () => {
	it('renders type pill in header meta', () => {
		render(<EntityHeaderMeta dotColor="red" type="activity" />);
		expect(screen.getByText('activity')).toBeTruthy();
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
