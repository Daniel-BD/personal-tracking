import { describe, it, expect } from 'vitest';
import { easeOutCubic } from '../animation';

describe('easeOutCubic', () => {
	it('returns 0 at t=0', () => {
		expect(easeOutCubic(0)).toBe(0);
	});

	it('returns 1 at t=1', () => {
		expect(easeOutCubic(1)).toBe(1);
	});

	it('decelerates — first half covers more distance than second half', () => {
		const firstHalf = easeOutCubic(0.5);
		const secondHalf = 1 - firstHalf;
		expect(firstHalf).toBeGreaterThan(secondHalf);
	});

	it('is monotonically increasing', () => {
		let prev = 0;
		for (let t = 0.1; t <= 1; t += 0.1) {
			const val = easeOutCubic(t);
			expect(val).toBeGreaterThan(prev);
			prev = val;
		}
	});
});
