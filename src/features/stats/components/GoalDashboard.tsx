import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGoalDashboardViewModels } from '../hooks/use-stats-view-models';
import GoalCard from './GoalCard';
import { removeDashboardCard } from '@/shared/store/store';
import AddCategoryModal from './AddCategoryModal';

export default function GoalDashboard() {
	const { t } = useTranslation('stats');
	const navigate = useNavigate();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const dashboardData = useGoalDashboardViewModels();

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-bold text-heading">{t('goalDashboard.title')}</h2>
				<button
					onClick={() => setIsModalOpen(true)}
					className="text-sm font-medium transition-colors hover:opacity-80"
					style={{ color: 'var(--color-accent)' }}
				>
					{t('goalDashboard.addToDashboard')}
				</button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{dashboardData.map((card) => (
					<GoalCard
						key={card.cardId}
						categoryName={card.name}
						sentiment={card.sentiment}
						accentColor={card.accentColor}
						sparklineData={card.sparklineData}
						currentCount={card.currentCount}
						baselineAvg={card.baselineAvg}
						deltaPercent={card.deltaPercent}
						daysElapsed={card.daysElapsed}
						onRemove={() => removeDashboardCard(card.cardId)}
						onCardClick={() => navigate(card.navigateTo)}
					/>
				))}

				{dashboardData.length === 0 && (
					<div className="col-span-full py-8 text-center card bg-inset border-dashed">
						<p className="text-label text-sm">{t('goalDashboard.noDashboardCards')}</p>
						<button
							onClick={() => setIsModalOpen(true)}
							className="mt-2 text-sm font-semibold"
							style={{ color: 'var(--color-accent)' }}
						>
							{t('goalDashboard.addFirstCategory')}
						</button>
					</div>
				)}
			</div>

			{isModalOpen && <AddCategoryModal onClose={() => setIsModalOpen(false)} />}
		</div>
	);
}
