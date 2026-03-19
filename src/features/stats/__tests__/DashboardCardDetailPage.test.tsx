import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardCardDetailPage from '../components/DashboardCardDetailPage';

const navigateMock = vi.fn();
const useParamsMock = vi.fn(() => ({ cardId: 'combo-1' }));
const useDashboardCardDetailViewModelMock = vi.fn();

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, options?: { count?: number; day?: number }) => {
			if (key === 'dashboardCardDetail.thisWeek') return `This week: ${options?.count ?? 0}`;
			if (key === 'dashboardCardDetail.partialWeek') return `Day ${options?.day ?? 0}`;
			if (key === 'dashboardCardDetail.event') return `${options?.count ?? 0} events`;
			return key;
		},
	}),
}));

vi.mock('react-router-dom', () => ({
	useNavigate: () => navigateMock,
	useParams: () => useParamsMock(),
}));

vi.mock('../hooks/use-stats-view-models', () => ({
	useDashboardCardDetailViewModel: (...args: unknown[]) => useDashboardCardDetailViewModelMock(...args),
}));

vi.mock('@/shared/store/hooks', () => ({
	useActivityCategories: () => [],
	useActivityItems: () => [],
	useFoodCategories: () => [],
	useFoodItems: () => [],
}));

vi.mock('@/shared/store/store', () => ({
	removeDashboardCard: vi.fn(),
	updateDashboardCard: vi.fn(),
}));

vi.mock('@/shared/ui/IconActionButton', () => ({
	default: ({ ariaLabel, onClick }: { ariaLabel: string; onClick: () => void }) => (
		<button type="button" aria-label={ariaLabel} onClick={onClick}>
			edit
		</button>
	),
}));

vi.mock('@/shared/ui/BottomSheet', () => ({
	default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/CategoryTrendChart', () => ({
	default: () => <div>CategoryTrendChart</div>,
}));

vi.mock('../components/MonthCalendarView', () => ({
	default: () => <div>MonthCalendarView</div>,
}));

vi.mock('../components/YearlyActivityGrid', () => ({
	default: () => <div>YearlyActivityGrid</div>,
}));

describe('DashboardCardDetailPage', () => {
	beforeEach(() => {
		navigateMock.mockClear();
		useDashboardCardDetailViewModelMock.mockReset();
	});

	it('navigates member pills to category detail pages for combined category cards', () => {
		useDashboardCardDetailViewModelMock.mockReturnValue({
			card: { id: 'combo-1', entityType: 'category', entityIds: ['fruit', 'veg'], name: 'Healthy' },
			cardId: 'combo-1',
			name: 'Healthy',
			entityType: 'category',
			members: [
				{ id: 'fruit', name: 'Fruit', accentColor: 'green', sentiment: 'positive' },
				{ id: 'veg', name: 'Vegetables', accentColor: 'blue', sentiment: 'neutral' },
			],
			entries: [],
			weeklyStats: [],
			currentCount: 2,
			baselineAvg: 1,
			delta: 1,
			deltaPercent: 1,
			daysElapsed: 7,
			daysSinceLastLogged: null,
			accentColor: 'green',
			sentiment: 'positive',
		});

		render(<DashboardCardDetailPage />);

		const fruitButton = screen.getByRole('button', { name: 'Fruit' });
		expect(fruitButton.getAttribute('style') ?? '').not.toContain('border');

		fireEvent.click(fruitButton);
		fireEvent.click(screen.getByRole('button', { name: 'Vegetables' }));

		expect(navigateMock).toHaveBeenNthCalledWith(1, '/stats/category/fruit');
		expect(navigateMock).toHaveBeenNthCalledWith(2, '/stats/category/veg');
	});

	it('navigates member pills to item detail pages for combined item cards', () => {
		useDashboardCardDetailViewModelMock.mockReturnValue({
			card: { id: 'combo-2', entityType: 'item', entityIds: ['apple'], name: 'Favorites' },
			cardId: 'combo-2',
			name: 'Favorites',
			entityType: 'item',
			members: [{ id: 'apple', name: 'Apple', accentColor: 'green', sentiment: 'positive' }],
			entries: [],
			weeklyStats: [],
			currentCount: 1,
			baselineAvg: 1,
			delta: 0,
			deltaPercent: 0,
			daysElapsed: 7,
			daysSinceLastLogged: null,
			accentColor: 'green',
			sentiment: 'neutral',
		});

		render(<DashboardCardDetailPage />);

		fireEvent.click(screen.getByRole('button', { name: 'Apple' }));

		expect(navigateMock).toHaveBeenCalledWith('/stats/item/apple');
	});
});
