import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import IconActionButton from '@/shared/ui/IconActionButton';
import BottomSheet from '@/shared/ui/BottomSheet';
import { cn } from '@/shared/lib/cn';
import { useActivityCategories, useActivityItems, useFoodCategories, useFoodItems } from '@/shared/store/hooks';
import { removeDashboardCard, updateDashboardCard } from '@/shared/store/store';
import { SENTIMENT_COLORS, getDeltaSummaryParts, getItemAccentColor } from '../utils/stats-engine';
import { getDetailPillColors } from '../utils/detail-pill-colors';
import { useDashboardCardDetailViewModel } from '../hooks/use-stats-view-models';
import CategoryTrendChart from './CategoryTrendChart';
import MonthCalendarView from './MonthCalendarView';
import YearlyActivityGrid from './YearlyActivityGrid';

export default function DashboardCardDetailPage() {
	const { cardId } = useParams<{ cardId: string }>();
	const navigate = useNavigate();
	const { t } = useTranslation('stats');
	const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const viewModel = useDashboardCardDetailViewModel(cardId);
	const foodCategories = useFoodCategories();
	const activityCategories = useActivityCategories();
	const foodItems = useFoodItems();
	const activityItems = useActivityItems();
	const [draftName, setDraftName] = useState('');
	const [draftIds, setDraftIds] = useState<string[]>([]);

	const candidates = useMemo(() => {
		if (!viewModel) return [];
		if (viewModel.entityType === 'category') {
			return [
				...foodCategories.map((category) => ({
					id: category.id,
					name: category.name,
					accentColor: SENTIMENT_COLORS[category.sentiment],
				})),
				...activityCategories.map((category) => ({
					id: category.id,
					name: category.name,
					accentColor: SENTIMENT_COLORS[category.sentiment],
				})),
			].sort((a, b) => a.name.localeCompare(b.name));
		}

		return [
			...foodItems.map((item) => ({
				id: item.id,
				name: item.name,
				accentColor: getItemAccentColor(item.categories, foodCategories),
			})),
			...activityItems.map((item) => ({
				id: item.id,
				name: item.name,
				accentColor: getItemAccentColor(item.categories, activityCategories),
			})),
		].sort((a, b) => a.name.localeCompare(b.name));
	}, [activityCategories, activityItems, foodCategories, foodItems, viewModel]);

	if (!viewModel) {
		return (
			<div className="flex flex-col items-center justify-center py-24 gap-4">
				<p className="text-label">{t('dashboardCardDetail.notFound')}</p>
				<button onClick={() => navigate('/stats')} className="btn btn-secondary btn-sm">
					{t('dashboardCardDetail.goBack')}
				</button>
			</div>
		);
	}

	const summary = getDeltaSummaryParts(viewModel.deltaPercent, viewModel.delta);
	const deltaUnit = t('dashboardCardDetail.event', { count: Math.round(Math.abs(viewModel.delta)) });
	const deltaEventsText = summary.isStable ? null : `(${summary.sign}${summary.deltaValueText} ${deltaUnit})`;

	const openEdit = () => {
		setDraftName(viewModel.name);
		setDraftIds(viewModel.members.map((member) => member.id));
		setIsEditing(true);
	};

	const saveDisabled = draftName.trim().length === 0 || draftIds.length === 0;
	const sentiment = viewModel.entityType === 'category' ? viewModel.sentiment : 'neutral';
	const accentColor = viewModel.accentColor;
	const getMemberDetailHref = (memberId: string) =>
		viewModel.entityType === 'category' ? `/stats/category/${memberId}` : `/stats/item/${memberId}`;

	return (
		<div className="space-y-6 pb-4">
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-3 min-w-0">
					<div className="flex items-center gap-2">
						<div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
						<h1 className="text-xl font-bold text-heading truncate">{viewModel.name}</h1>
					</div>
					<div className="flex flex-wrap gap-2">
						{viewModel.members.map((member) => {
							const pillColors = getDetailPillColors(member.sentiment, member.accentColor);

							return (
								<button
									key={member.id}
									type="button"
									onClick={() => navigate(getMemberDetailHref(member.id))}
									className="rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
									style={{ backgroundColor: pillColors.bg, color: pillColors.text }}
								>
									{member.name}
								</button>
							);
						})}
					</div>
				</div>
				<IconActionButton icon={Pencil} tone="edit" onClick={openEdit} ariaLabel={t('dashboardCardDetail.editCard')} />
			</div>

			{sentiment === 'limit' && viewModel.daysSinceLastLogged !== null && (
				<p className="card inline-flex self-start rounded-full px-3 py-1 text-xs font-semibold text-heading">
					{t('dashboardCardDetail.daysSinceLastLogged', { count: viewModel.daysSinceLastLogged })}
				</p>
			)}

			<div className="card p-4 space-y-1">
				<div className="text-sm font-semibold text-heading">
					{t('dashboardCardDetail.thisWeek', { count: viewModel.currentCount })}
					{viewModel.daysElapsed < 7 && (
						<span className="text-xs font-normal text-label">
							{' '}
							({t('dashboardCardDetail.partialWeek', { day: viewModel.daysElapsed })})
						</span>
					)}
				</div>
				{!summary.isStable && (
					<div className="flex items-baseline gap-1.5 pt-1">
						<span className="text-lg font-bold" style={{ color: accentColor }}>
							{summary.changeText}
						</span>
						{deltaEventsText && <span className="text-xs text-label">{deltaEventsText}</span>}
						<span className="text-xs text-label">• {t('dashboardCardDetail.comparedToAverage')}</span>
					</div>
				)}
			</div>

			<CategoryTrendChart
				weeks={viewModel.weeklyStats}
				baselineAvg={viewModel.baselineAvg}
				sentiment={sentiment}
				accentColor={accentColor}
				selectedWeekIndex={selectedWeekIndex}
				onSelectWeek={setSelectedWeekIndex}
			/>
			<MonthCalendarView entries={viewModel.entries} sentiment={sentiment} accentColor={accentColor} />
			<YearlyActivityGrid entries={viewModel.entries} sentiment={sentiment} accentColor={accentColor} />

			<BottomSheet
				open={isEditing}
				onClose={() => setIsEditing(false)}
				title={t('dashboardCardDetail.editTitle')}
				actionLabel={t('dashboardCardDetail.save')}
				onAction={() => {
					updateDashboardCard(viewModel.cardId, {
						name: draftName,
						entityType: viewModel.entityType,
						entityIds: draftIds,
					});
					setIsEditing(false);
				}}
				actionDisabled={saveDisabled}
			>
				<div className="space-y-4">
					<div>
						<label className="form-label" htmlFor="dashboard-card-edit-name">
							{t('dashboardCardDetail.nameLabel')}
						</label>
						<input
							id="dashboard-card-edit-name"
							type="text"
							className="form-input"
							value={draftName}
							onChange={(event) => setDraftName(event.target.value)}
						/>
					</div>
					<div>
						<div className="text-xs font-semibold uppercase tracking-wide text-label mb-2">
							{viewModel.entityType === 'category'
								? t('dashboardCardDetail.categories')
								: t('dashboardCardDetail.items')}
						</div>
						<div className="space-y-2 max-h-72 overflow-y-auto">
							{candidates.map((candidate) => {
								const checked = draftIds.includes(candidate.id);
								return (
									<label
										key={candidate.id}
										className={cn(
											'flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors',
											checked
												? 'border-[var(--color-accent-border)] bg-[var(--color-accent-bg)]'
												: 'border-[var(--border-default)] bg-[var(--bg-card)]',
										)}
									>
										<input
											type="checkbox"
											checked={checked}
											onChange={() =>
												setDraftIds((current) =>
													current.includes(candidate.id)
														? current.filter((value) => value !== candidate.id)
														: [...current, candidate.id],
												)
											}
											className="h-4 w-4"
										/>
										<span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: candidate.accentColor }} />
										<span className="text-sm font-medium text-heading">{candidate.name}</span>
									</label>
								);
							})}
						</div>
					</div>
					<button
						type="button"
						className="btn btn-danger w-full"
						onClick={() => {
							removeDashboardCard(viewModel.cardId);
							setIsEditing(false);
							navigate('/stats');
						}}
					>
						{t('dashboardCardDetail.removeCard')}
					</button>
				</div>
			</BottomSheet>
		</div>
	);
}
