import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import TypeSegmentedPicker from '../TypeSegmentedPicker';

afterEach(cleanup);

describe('TypeSegmentedPicker', () => {
	it('renders translated type labels', () => {
		render(<TypeSegmentedPicker value="activity" onChange={() => undefined} />);
		expect(screen.getByRole('button', { name: 'type.activity' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'type.food' })).toBeTruthy();
	});

	it('calls onChange with the clicked type', () => {
		const onChange = vi.fn();
		render(<TypeSegmentedPicker value="activity" onChange={onChange} />);
		fireEvent.click(screen.getByRole('button', { name: 'type.food' }));
		expect(onChange).toHaveBeenCalledWith('food');
	});
});
