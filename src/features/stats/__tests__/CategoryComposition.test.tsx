import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CategoryComposition from '../components/CategoryComposition';
import type { WeeklyData } from '../utils/stats-engine';

vi.mock('@/shared/hooks/useIsMobile', () => ({
	useIsMobile: () => false,
}));

vi.mock('recharts', () => ({
	ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	XAxis: () => <div />,
	YAxis: () => <div />,
	Tooltip: () => <div />,
	Bar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	Cell: ({ fill }: { fill?: string }) => <div data-testid="chart-cell" data-fill={fill ?? ''} />,
}));

describe('CategoryComposition', () => {
	it('passes per-segment fill colors to chart cells', () => {
		const weeklyData: WeeklyData[] = [
			{
				weekKey: '2025-W01',
				start: new Date('2025-01-06T00:00:00'),
				end: new Date('2025-01-12T23:59:59'),
				entries: [],
				totalCount: 10,
				hasLowData: false,
				sentimentCounts: { positive: 0, neutral: 10, limit: 0 },
				categories: [
					{ categoryId: 'a', categoryName: 'A', sentiment: 'neutral', count: 6 },
					{ categoryId: 'b', categoryName: 'B', sentiment: 'neutral', count: 4 },
				],
			},
		];

		render(<CategoryComposition weeklyData={weeklyData} />);

		expect(screen.getAllByTestId('chart-cell').some((cell) => cell.getAttribute('data-fill'))).toBe(true);
	});
});
