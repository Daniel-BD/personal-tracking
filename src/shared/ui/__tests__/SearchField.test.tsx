import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SearchField from '../SearchField';

afterEach(cleanup);

describe('SearchField', () => {
	it('renders the input value and placeholder', () => {
		render(<SearchField value="Run" onValueChange={vi.fn()} placeholder="Log item" />);

		const input = screen.getByPlaceholderText('Log item') as HTMLInputElement;
		expect(input.value).toBe('Run');
	});

	it('calls onValueChange when typing', () => {
		const onValueChange = vi.fn();
		render(<SearchField value="" onValueChange={onValueChange} placeholder="Search" />);

		fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'Eggs' } });
		expect(onValueChange).toHaveBeenCalledWith('Eggs');
	});

	it('shows a clear button only when configured and non-empty', () => {
		const onClear = vi.fn();
		const { rerender } = render(
			<SearchField value="" onValueChange={vi.fn()} onClear={onClear} clearAriaLabel="Clear search" />,
		);

		expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();

		rerender(<SearchField value="Eggs" onValueChange={vi.fn()} onClear={onClear} clearAriaLabel="Clear search" />);

		fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
		expect(onClear).toHaveBeenCalledOnce();
	});
});
