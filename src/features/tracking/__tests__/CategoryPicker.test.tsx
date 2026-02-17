import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeCategory } from '@/shared/store/__tests__/fixtures';
import CategoryPicker from '../components/CategoryPicker';

vi.mock('@/shared/store/store', () => ({
	addCategory: vi.fn(() => ({ id: 'new-cat', name: 'New', sentiment: 'neutral' })),
}));

const categories = [
	makeCategory({ id: 'c1', name: 'Breakfast' }),
	makeCategory({ id: 'c2', name: 'Lunch' }),
	makeCategory({ id: 'c3', name: 'Dinner' }),
];

describe('CategoryPicker', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('scrolls input row into view on focus', () => {
		const scrollIntoView = vi.fn();
		render(<CategoryPicker selected={[]} categories={categories} onChange={vi.fn()} type="food" />);

		const input = screen.getByPlaceholderText('Search or add category...');
		// Mock scrollIntoView on the input's parent div (the ref target)
		input.parentElement!.scrollIntoView = scrollIntoView;

		fireEvent.focus(input);

		// Advance past the 100ms delay
		act(() => {
			vi.advanceTimersByTime(150);
		});

		expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
	});

	it('renders bottom padding for keyboard clearance', () => {
		const { container } = render(
			<CategoryPicker selected={[]} categories={categories} onChange={vi.fn()} type="food" />,
		);

		const outerDiv = container.firstElementChild as HTMLElement;
		expect(outerDiv.className).toContain('pb-8');
	});
});
