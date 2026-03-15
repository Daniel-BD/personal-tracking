import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GoalDashboard from '../components/GoalDashboard';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) =>
			({
				'goalDashboard.title': 'Custom dashboard',
				'goalDashboard.addToDashboard': 'Add to dashboard',
				'goalDashboard.noDashboardCards': 'No dashboard cards yet',
			})[key] ?? key,
	}),
}));

vi.mock('react-router-dom', () => ({
	useNavigate: () => vi.fn(),
}));

vi.mock('../hooks/use-stats-view-models', () => ({
	useGoalDashboardViewModels: () => [],
}));

vi.mock('@/shared/store/store', () => ({
	removeDashboardCard: vi.fn(),
}));

vi.mock('../components/AddCategoryModal', () => ({
	default: () => <div>AddCategoryModal</div>,
}));

vi.mock('../components/GoalCard', () => ({
	default: () => <div>GoalCard</div>,
}));

describe('GoalDashboard', () => {
	it('keeps only header actions when the dashboard is empty', () => {
		render(<GoalDashboard />);

		expect(screen.getByText('Custom dashboard')).not.toBeNull();
		expect(screen.getByRole('button', { name: 'Add to dashboard' })).not.toBeNull();
		expect(screen.queryByText('No dashboard cards yet')).toBeNull();
		expect(screen.queryByText('GoalCard')).toBeNull();
	});
});
