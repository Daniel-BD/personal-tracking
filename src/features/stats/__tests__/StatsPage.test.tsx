import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StatsPage from '../components/StatsPage';

const statsState = vi.hoisted(() => ({
	hasData: false,
	entries: [] as unknown[],
	dashboardCards: [] as unknown[],
	weeklyData: [] as unknown[],
}));

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) =>
			({
				title: 'Eating patterns',
				subtitle: 'What your eating events are made of',
				'empty.noFoodEntries': 'No food entries logged yet',
				'empty.startLogging': 'Start logging food items to see your eating patterns',
			})[key] ?? key,
	}),
}));

vi.mock('@/shared/store/hooks', () => ({
	useEntries: () => statsState.entries,
	useDashboardCards: () => statsState.dashboardCards,
}));

vi.mock('../hooks/use-stats-view-models', () => ({
	useWeeklyFoodStats: () => ({ weeklyData: statsState.weeklyData, hasData: statsState.hasData }),
}));

vi.mock('../components/BalanceOverview', () => ({ default: () => <div>BalanceOverview</div> }));
vi.mock('../components/ActionableCategories', () => ({ default: () => <div>ActionableCategories</div> }));
vi.mock('../components/CategoryComposition', () => ({ default: () => <div>CategoryComposition</div> }));
vi.mock('../components/GoalDashboard', () => ({ default: () => <div>GoalDashboard</div> }));
vi.mock('../components/FrequencyRanking', () => ({ default: () => <div>FrequencyRanking</div> }));

describe('StatsPage', () => {
	it('does not render weekly/monthly segmented control', () => {
		statsState.hasData = false;
		statsState.entries = [];
		render(<StatsPage />);

		expect(screen.queryByRole('tab', { name: 'Weekly' })).toBeNull();
		expect(screen.queryByRole('tab', { name: 'Monthly' })).toBeNull();
		expect(screen.queryByText('No food entries logged yet')).not.toBeNull();
	});

	it('renders balance overview before goal dashboard when data exists', () => {
		statsState.hasData = true;
		render(<StatsPage />);

		const content = screen.getByText('BalanceOverview').parentElement?.textContent ?? '';
		expect(content.indexOf('BalanceOverview')).toBeLessThan(content.indexOf('GoalDashboard'));
	});
});
