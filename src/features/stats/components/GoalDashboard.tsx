import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTrackerData } from '@/shared/store/hooks';
import { getLastNWeeks, getDaysElapsedInCurrentWeek, formatWeekLabel, getItemAccentColor } from '../utils/stats-engine';
import { filterEntriesByCategory, filterEntriesByItem, filterEntriesByDateRange } from '@/features/tracking';
import { formatDateLocal } from '@/shared/lib/date-utils';
import { getCardId, findItemWithCategories } from '@/shared/lib/types';
import GoalCard from './GoalCard';
import { removeDashboardCard } from '@/shared/store/store';
import AddCategoryModal from './AddCategoryModal';

/** Compute baseline average, current count, and delta % from sparkline data. */
function calcCardStats(sparklineData: { count: number }[], daysElapsed: number) {
	const currentCount = sparklineData[sparklineData.length - 1].count;
	const baselineWeeks = sparklineData.slice(-5, -1);
	const baselineSum = baselineWeeks.reduce((sum, w) => sum + w.count, 0);
	const baselineAvg = baselineWeeks.length > 0 ? baselineSum / baselineWeeks.length : 0;
	const proratedBaseline = baselineAvg * (daysElapsed / 7);
	const delta = currentCount - proratedBaseline;
	const deltaPercent = proratedBaseline === 0 ? (currentCount > 0 ? 1 : 0) : delta / proratedBaseline;
	return { currentCount, baselineAvg, deltaPercent };
}

export default function GoalDashboard() {
	const { t } = useTranslation('stats');
	const navigate = useNavigate();
	const data = useTrackerData();
	const [isModalOpen, setIsModalOpen] = useState(false);

	// eslint-disable-next-line react-hooks/exhaustive-deps -- recalculate weeks when entries change
	const weeks = useMemo(() => getLastNWeeks(8), [data.entries]);

	// How many days have elapsed in the current (partial) week
	const currentWeek = weeks[weeks.length - 1];
	const daysElapsed = currentWeek ? getDaysElapsedInCurrentWeek(currentWeek.start) : 7;

	const dashboardData = useMemo(() => {
		if (!data.dashboardCards) return [];

		return data.dashboardCards
			.map((card) => {
				const cardId = getCardId(card);
				const isItemCard = !!card.itemId;

				if (isItemCard) {
					const found = findItemWithCategories(data, card.itemId!);
					if (!found) return null;
					const { item, categories } = found;

					const sparklineData = weeks.map((week) => {
						const range = { start: formatDateLocal(week.start), end: formatDateLocal(week.end) };
						const weekEntries = filterEntriesByItem(filterEntriesByDateRange(data.entries, range), card.itemId!);
						return { week: week.key, count: weekEntries.length, label: formatWeekLabel(week.start) };
					});

					const stats = calcCardStats(sparklineData, daysElapsed);
					return {
						cardId,
						name: item.name,
						sentiment: 'neutral' as const,
						accentColor: getItemAccentColor(item.categories, categories),
						sparklineData,
						...stats,
						daysElapsed,
						navigateTo: `/stats/item/${card.itemId}`,
					};
				}

				const categoryId = card.categoryId!;
				const category =
					data.foodCategories.find((c) => c.id === categoryId) ||
					data.activityCategories.find((c) => c.id === categoryId);
				if (!category) return null;

				const sparklineData = weeks.map((week) => {
					const range = { start: formatDateLocal(week.start), end: formatDateLocal(week.end) };
					const weekEntries = filterEntriesByCategory(filterEntriesByDateRange(data.entries, range), categoryId, data);
					return { week: week.key, count: weekEntries.length, label: formatWeekLabel(week.start) };
				});

				const stats = calcCardStats(sparklineData, daysElapsed);
				return {
					cardId,
					name: category.name,
					sentiment: category.sentiment,
					accentColor: undefined as string | undefined,
					sparklineData,
					...stats,
					daysElapsed,
					navigateTo: `/stats/category/${categoryId}`,
				};
			})
			.filter((item): item is NonNullable<typeof item> => item !== null);
	}, [data, weeks, daysElapsed]);

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
