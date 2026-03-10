import type { ComponentProps } from 'react';
import { XAxis, YAxis } from 'recharts';

const WEEKLY_AXIS_TICK_FILL = 'var(--text-tertiary)';

type WeeklyXAxisProps = Partial<ComponentProps<typeof XAxis>>;
type WeeklyYAxisProps = Partial<ComponentProps<typeof YAxis>>;

export const weeklyLineValueAxisProps: WeeklyYAxisProps = {
	hide: true,
	tick: { fill: WEEKLY_AXIS_TICK_FILL },
};

export function getWeeklyLineXAxisProps(fontSize: number = 11): WeeklyXAxisProps {
	return {
		interval: 0,
		minTickGap: 0,
		height: 30,
		tickMargin: 8,
		tickLine: false,
		axisLine: false,
		tick: { fontSize, fill: WEEKLY_AXIS_TICK_FILL },
	};
}

export const weeklyVerticalBarValueAxisProps: WeeklyXAxisProps = {
	type: 'number',
	domain: [0, 100],
	hide: true,
	tick: { fill: WEEKLY_AXIS_TICK_FILL },
};

export function getWeeklyVerticalBarCategoryAxisProps(isMobile: boolean): WeeklyYAxisProps {
	return {
		type: 'category',
		interval: 0,
		minTickGap: 0,
		tickLine: false,
		axisLine: false,
		tickMargin: 6,
		width: isMobile ? 64 : 82,
		tick: { fontSize: 12, fill: WEEKLY_AXIS_TICK_FILL },
	};
}
