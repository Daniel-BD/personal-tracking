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
	const period = hours >= 12 ? 'PM' : 'AM';
	const displayHours = hours % 12 || 12;
	return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
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
	const [year, month, day] = dateString.split('-').map(Number);
	const date = new Date(year, month - 1, day);
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
 * Format a week start date for display. Accepts either a YYYY-MM-DD string or a Date object.
 */
export function formatWeekLabel(dateOrString: string | Date): string {
	const date = typeof dateOrString === 'string' ? new Date(dateOrString + 'T00:00:00') : dateOrString;
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
	});
}
