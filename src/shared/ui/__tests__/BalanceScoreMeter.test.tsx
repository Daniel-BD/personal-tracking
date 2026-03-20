import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BalanceScoreMeter from '../BalanceScoreMeter';

vi.mock('@/shared/lib/animation', () => ({
	useAnimatedValue: (value: number) => value,
}));

describe('BalanceScoreMeter', () => {
	it('renders the shared balance score layout with matching score, pills, and copy', () => {
		const { container } = render(
			<BalanceScoreMeter
				title="Balance Score"
				description="This week · Positive ÷ (Positive + Limit)"
				score={72}
				positive={8}
				limit={3}
			/>,
		);

		expect(screen.getByText('Balance Score')).toBeTruthy();
		expect(screen.getByText('72%')).toBeTruthy();
		expect(screen.getByText('8+')).toBeTruthy();
		expect(screen.getByText('3−')).toBeTruthy();
		expect(screen.getByText('This week · Positive ÷ (Positive + Limit)')).toBeTruthy();
		expect(container.querySelector('.h-2\\.5')).toBeTruthy();
		expect(container.querySelector('[style*="width: 72%"]')).toBeTruthy();
	});
});
