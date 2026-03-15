import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeeklyData } from '../utils/stats-engine';
import BalanceScoreTrendChart from '../components/BalanceScoreTrendChart';
import CategoryTrendChart from '../components/CategoryTrendChart';

vi.mock('recharts', () => ({
	ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="responsive">{children}</div>,
	LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	Line: () => null,
	XAxis: () => null,
	YAxis: () => null,
	ReferenceLine: () => null,
	Dot: () => null,
}));

vi.mock('../utils/weekly-chart-axis', () => ({
	getWeeklyLineXAxisProps: () => ({}),
	weeklyLineValueAxisProps: {},
}));

vi.mock('../utils/stats-engine', async () => {
	const actual = await vi.importActual<typeof import('../utils/stats-engine')>('../utils/stats-engine');
	return {
		...actual,
		formatWeekLabel: () => 'Wk',
		calculateBalanceScore: () => 55,
		getWeekNumber: () => 1,
		getDailyBreakdown: () => [],
	};
});

describe('scrollable weekly line charts', () => {
	beforeEach(() => {
		Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
			configurable: true,
			get: () => 640,
		});
	});

	afterEach(() => {
		delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
	});

	it('expands category trend chart width and starts scrolled to the newest week', () => {
		const weeks = Array.from({ length: 10 }, (_, index) => ({
			label: `W${index}`,
			count: index + 1,
			weekKey: `2024-W${index + 1}`,
			start: new Date('2024-01-01'),
			end: new Date('2024-01-07'),
			entries: [],
		}));

		const { container } = render(
			<CategoryTrendChart
				weeks={weeks}
				baselineAvg={2}
				sentiment="positive"
				selectedWeekIndex={null}
				onSelectWeek={() => {}}
			/>,
		);

		const widthWrapper = container.querySelector('[style*="min-width"]');
		expect(widthWrapper).not.toBeNull();
		expect(widthWrapper?.getAttribute('style')).toContain('min-width: 560px');

		const scrollContainer = container.querySelector('.overflow-x-auto') as HTMLDivElement | null;
		expect(scrollContainer).not.toBeNull();
		expect(scrollContainer?.scrollLeft).toBe(640);
	});

	it('keeps a minimum width for short history and still starts at the right edge', () => {
		const weeklyData: WeeklyData[] = Array.from({ length: 2 }, () => ({
			start: new Date('2024-01-01'),
			end: new Date('2024-01-07'),
			weekKey: '2024-W1',
			entries: [],
			totalCount: 3,
			categories: [],
			sentimentCounts: { positive: 1, neutral: 1, limit: 1 },
			hasLowData: false,
		}));

		const { container } = render(<BalanceScoreTrendChart weeklyData={weeklyData} />);

		const widthWrapper = container.querySelector('[style*="min-width"]');
		expect(widthWrapper).not.toBeNull();
		expect(widthWrapper?.getAttribute('style')).toContain('min-width: 320px');

		const scrollContainer = container.querySelector('.overflow-x-auto') as HTMLDivElement | null;
		expect(scrollContainer).not.toBeNull();
		expect(scrollContainer?.scrollLeft).toBe(640);
	});
});
