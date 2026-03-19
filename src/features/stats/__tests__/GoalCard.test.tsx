import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GoalCard from '../components/GoalCard';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, options?: { count?: number; avg?: string; day?: number; change?: string }) => {
			if (key === 'goalCard.thisWeek') return `This week: ${options?.count ?? 0}`;
			if (key === 'goalCard.baselineAvg') return `Average: ${options?.avg ?? '0'}`;
			if (key === 'goalCard.event') return `${options?.count ?? 0} events`;
			if (key === 'goalCard.currentlyLabel') return `Currently ${options?.change ?? ''}`;
			if (key === 'goalCard.noMeaningfulChange') return 'Stable';
			if (key === 'goalCard.removeFromDashboard') return 'Remove from dashboard';
			if (key === 'goalCard.projected') return 'Projected';
			if (key === 'goalCard.partialWeek') return `Day ${options?.day ?? 0}`;
			return key;
		},
	}),
}));

vi.mock('recharts', () => ({
	LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	Line: () => <div>Line</div>,
	XAxis: () => <div>XAxis</div>,
	YAxis: () => <div>YAxis</div>,
	ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	ReferenceLine: () => <div>ReferenceLine</div>,
	Dot: () => <div>Dot</div>,
}));

describe('GoalCard', () => {
	it('uses the filled non-bordered member pill style for combined cards', () => {
		render(
			<GoalCard
				categoryName="Healthy staples"
				sentiment="neutral"
				members={[
					{ id: 'apple', name: 'Apple', accentColor: 'green', sentiment: 'positive' },
					{ id: 'beans', name: 'Beans', accentColor: 'var(--color-neutral)', sentiment: 'neutral' },
				]}
				sparklineData={[
					{ week: '2026-W01', label: 'W1', count: 1 },
					{ week: '2026-W02', label: 'W2', count: 2 },
				]}
				currentCount={2}
				baselineAvg={1}
				deltaPercent={1}
				daysElapsed={7}
				onRemove={() => {}}
			/>,
		);

		const applePill = screen.getByText('Apple');
		expect(applePill.getAttribute('style') ?? '').not.toContain('border');
		expect(applePill.getAttribute('style') ?? '').toContain('color');
	});
});
