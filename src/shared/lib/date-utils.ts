/**
 * Format a Date object to YYYY-MM-DD string in local timezone (not UTC)
 */
export function formatDateLocal(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function formatTime(time: string | null): string {
	if (!time) return '';
	const [hours, minutes] = time.split(':').map(Number);
	return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function formatDate(dateString: string): string {
	const date = new Date(dateString + 'T00:00:00');
	return date.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
	});
}

export function formatDateWithYear(dateString: string): string {
	if (!dateString) return '';
	const date = new Date(dateString + 'T00:00:00');
	return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatMonthYear(date: Date = new Date()): string {
	return date.toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric',
	});
}

/**
 * Get the YYYY-MM-DD string for N days before today in local timezone.
 */
export function getDateNDaysAgo(n: number): string {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return formatDateLocal(d);
}

/**
 * Get the ISO week number (1–53) and ISO week-numbering year for a date.
 * The year may differ from the calendar year at year boundaries
 * (e.g. Dec 31, 2025 → week 1 of 2026).
 */
export function getISOWeekAndYear(date: Date): { year: number; week: number } {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + 4 - (d.getDay() || 7));
	const year = d.getFullYear();
	const yearStart = new Date(year, 0, 1);
	const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	return { year, week };
}

/**
 * Get the ISO week number for a given date (1–53).
 */
export function getISOWeekNumber(date: Date): number {
	return getISOWeekAndYear(date).week;
}

/**
 * Format a week start date for display as "W{number}".
 * Accepts either a YYYY-MM-DD string or a Date object.
 */
export function formatWeekLabel(dateOrString: string | Date): string {
	const date = typeof dateOrString === 'string' ? new Date(dateOrString + 'T00:00:00') : dateOrString;
	return `W${getISOWeekNumber(date)}`;
}
