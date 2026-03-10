import { describe, expect, it } from 'vitest';
import { getBalanceTrendPointLabelY } from '../components/BalanceScoreTrendChart';

describe('getBalanceTrendPointLabelY', () => {
	it('keeps secondary counts below the point when there is enough vertical room', () => {
		expect(getBalanceTrendPointLabelY(100)).toEqual({
			scoreY: 86,
			countsY: 118,
		});
	});

	it('moves labels above low points to avoid overlapping week-axis ticks', () => {
		expect(getBalanceTrendPointLabelY(145)).toEqual({
			scoreY: 121,
			countsY: 135,
		});
	});
});
