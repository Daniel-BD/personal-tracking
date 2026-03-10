import { describe, expect, it } from 'vitest';
import {
	getWeeklyLineXAxisProps,
	getWeeklyVerticalBarCategoryAxisProps,
	weeklyVerticalBarValueAxisProps,
} from '../utils/weekly-chart-axis';

describe('weekly chart axis helpers', () => {
	it('pins line chart weekly labels so responsive reflow cannot drop ticks', () => {
		const props = getWeeklyLineXAxisProps();

		expect(props.interval).toBe(0);
		expect(props.minTickGap).toBe(0);
		expect(props.height).toBe(30);
		expect(props.tickLine).toBe(false);
		expect(props.axisLine).toBe(false);
	});

	it('reserves enough width for vertical week labels on mobile and desktop', () => {
		const mobileProps = getWeeklyVerticalBarCategoryAxisProps(true);
		const desktopProps = getWeeklyVerticalBarCategoryAxisProps(false);

		expect(mobileProps.width).toBe(64);
		expect(desktopProps.width).toBe(82);
		expect(mobileProps.interval).toBe(0);
		expect(mobileProps.minTickGap).toBe(0);
		expect(mobileProps.tickLine).toBe(false);
		expect(mobileProps.axisLine).toBe(false);
	});

	it('keeps weekly stacked bars value axis hidden and normalized', () => {
		expect(weeklyVerticalBarValueAxisProps.type).toBe('number');
		expect(weeklyVerticalBarValueAxisProps.domain).toEqual([0, 100]);
		expect(weeklyVerticalBarValueAxisProps.hide).toBe(true);
	});
});
