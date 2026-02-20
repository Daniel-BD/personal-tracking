import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

afterEach(cleanup);

// Component that throws during render
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
	if (shouldThrow) throw new Error('Test error');
	return <p>Rendered successfully</p>;
}

describe('ErrorBoundary', () => {
	// Suppress console.error for expected throws
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders children when no error', () => {
		render(
			<ErrorBoundary>
				<p>Normal content</p>
			</ErrorBoundary>,
		);
		expect(screen.getByText('Normal content')).toBeTruthy();
	});

	it('renders fallback when child throws', () => {
		render(
			<ErrorBoundary>
				<ThrowingComponent shouldThrow={true} />
			</ErrorBoundary>,
		);
		expect(screen.getByText('Something went wrong')).toBeTruthy();
	});

	it('shows label in fallback when provided', () => {
		render(
			<ErrorBoundary label="Stats">
				<ThrowingComponent shouldThrow={true} />
			</ErrorBoundary>,
		);
		expect(screen.getByText('Stats failed to load.')).toBeTruthy();
	});

	it('does not show label text when label is omitted', () => {
		render(
			<ErrorBoundary>
				<ThrowingComponent shouldThrow={true} />
			</ErrorBoundary>,
		);
		expect(screen.queryByText(/failed to load/)).toBeNull();
	});

	it('shows Reload page and Try again buttons in fallback', () => {
		render(
			<ErrorBoundary>
				<ThrowingComponent shouldThrow={true} />
			</ErrorBoundary>,
		);
		expect(screen.getByText('Reload page')).toBeTruthy();
		expect(screen.getByText('Try again')).toBeTruthy();
	});

	it('resets error state when Try again is clicked', () => {
		const { rerender } = render(
			<ErrorBoundary>
				<ThrowingComponent shouldThrow={true} />
			</ErrorBoundary>,
		);

		expect(screen.getByText('Something went wrong')).toBeTruthy();

		// Click Try again — boundary resets, but the child still throws
		fireEvent.click(screen.getByText('Try again'));

		// After reset + re-render with same throwing child, fallback shows again
		rerender(
			<ErrorBoundary>
				<ThrowingComponent shouldThrow={true} />
			</ErrorBoundary>,
		);
		expect(screen.getByText('Something went wrong')).toBeTruthy();
	});

	it('logs error to console when a child throws', () => {
		render(
			<ErrorBoundary>
				<ThrowingComponent shouldThrow={true} />
			</ErrorBoundary>,
		);
		expect(console.error).toHaveBeenCalled();
	});
});
