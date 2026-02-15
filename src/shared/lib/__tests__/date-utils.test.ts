import { describe, it, expect, vi } from 'vitest';
import {
	formatDateLocal,
	formatTime,
	formatDate,
	formatDateWithYear,
	formatMonthYear,
	formatWeekLabel,
	getDateNDaysAgo,
} from '@/shared/lib/date-utils';

describe('formatTime', () => {
	it('returns empty string for null', () => {
		expect(formatTime(null)).toBe('');
	});

	it('formats midnight as 12:00 AM', () => {
		expect(formatTime('00:00')).toBe('12:00 AM');
	});

	it('formats noon as 12:00 PM', () => {
		expect(formatTime('12:00')).toBe('12:00 PM');
	});

	it('formats 14:30 as 2:30 PM', () => {
		expect(formatTime('14:30')).toBe('2:30 PM');
	});

	it('formats 23:59 as 11:59 PM', () => {
		expect(formatTime('23:59')).toBe('11:59 PM');
	});

	it('formats single-digit hour correctly', () => {
		expect(formatTime('09:05')).toBe('9:05 AM');
	});

	it('formats 1 PM correctly', () => {
		expect(formatTime('13:00')).toBe('1:00 PM');
	});
});

describe('formatDateLocal', () => {
	it('returns YYYY-MM-DD for a known date', () => {
		// Month is 0-indexed: 0 = January
		const date = new Date(2025, 0, 15);
		expect(formatDateLocal(date)).toBe('2025-01-15');
	});

	it('zero-pads single-digit month and day', () => {
		const date = new Date(2025, 2, 5); // March 5
		expect(formatDateLocal(date)).toBe('2025-03-05');
	});

	it('handles December 31', () => {
		const date = new Date(2025, 11, 31);
		expect(formatDateLocal(date)).toBe('2025-12-31');
	});
});

describe('formatDate', () => {
	it('returns a formatted date string with weekday, month, and day', () => {
		// 2025-01-15 is a Wednesday
		const result = formatDate('2025-01-15');
		expect(result).toContain('Wed');
		expect(result).toContain('Jan');
		expect(result).toContain('15');
	});
});

describe('formatDateWithYear', () => {
	it('returns empty string for empty input', () => {
		expect(formatDateWithYear('')).toBe('');
	});

	it('returns a string containing the year for a valid date', () => {
		const result = formatDateWithYear('2025-06-20');
		expect(result).toContain('2025');
		expect(result).toContain('20');
	});
});

describe('formatMonthYear', () => {
	it('returns month and year for a given date', () => {
		const date = new Date(2025, 0, 1); // January 2025
		const result = formatMonthYear(date);
		expect(result).toBe('January 2025');
	});

	it('handles December correctly', () => {
		const date = new Date(2025, 11, 15);
		expect(formatMonthYear(date)).toBe('December 2025');
	});

	it('defaults to current date when no argument is passed', () => {
		const result = formatMonthYear();
		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
	});
});

describe('formatWeekLabel', () => {
	it('works with a YYYY-MM-DD string', () => {
		const result = formatWeekLabel('2025-01-15');
		expect(result).toContain('Jan');
		expect(result).toContain('15');
	});

	it('works with a Date object', () => {
		const date = new Date(2025, 0, 15);
		const result = formatWeekLabel(date);
		expect(result).toContain('Jan');
		expect(result).toContain('15');
	});

	it('returns consistent results for string and Date of the same day', () => {
		const fromString = formatWeekLabel('2025-03-10');
		const fromDate = formatWeekLabel(new Date(2025, 2, 10));
		expect(fromString).toBe(fromDate);
	});
});

describe('getDateNDaysAgo', () => {
	it('returns today for 0 days ago', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 15)); // June 15, 2025
		expect(getDateNDaysAgo(0)).toBe('2025-06-15');
		vi.useRealTimers();
	});

	it('returns correct date for N days ago', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 5, 15));
		expect(getDateNDaysAgo(6)).toBe('2025-06-09');
		expect(getDateNDaysAgo(29)).toBe('2025-05-17');
		vi.useRealTimers();
	});

	it('handles month boundaries', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 2, 3)); // March 3, 2025
		expect(getDateNDaysAgo(5)).toBe('2025-02-26');
		vi.useRealTimers();
	});
});
