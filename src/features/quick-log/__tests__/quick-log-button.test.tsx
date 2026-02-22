import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import QuickLogButton from '../components/QuickLogButton';

afterEach(cleanup);

describe('QuickLogButton', () => {
	it('renders with the correct aria-label', () => {
		render(<QuickLogButton onClick={vi.fn()} ariaLabel="Quick log Apple" />);
		expect(screen.getByRole('button', { name: 'Quick log Apple' })).toBeTruthy();
	});

	it('calls onClick on click', () => {
		const onClick = vi.fn();
		render(<QuickLogButton onClick={onClick} ariaLabel="Quick log" />);

		fireEvent.click(screen.getByRole('button'));
		expect(onClick).toHaveBeenCalledOnce();
	});

	it('prevents double-click during animation', () => {
		const onClick = vi.fn();
		render(<QuickLogButton onClick={onClick} ariaLabel="Quick log" />);

		const btn = screen.getByRole('button');
		fireEvent.click(btn);
		fireEvent.click(btn);
		fireEvent.click(btn);

		expect(onClick).toHaveBeenCalledOnce();
	});

	it('applies pressed class on pointer down', () => {
		render(<QuickLogButton onClick={vi.fn()} ariaLabel="Quick log" />);
		const btn = screen.getByRole('button');

		fireEvent.pointerDown(btn);
		expect(btn.className).toContain('ql-btn--pressed');

		fireEvent.pointerUp(btn);
		expect(btn.className).not.toContain('ql-btn--pressed');
	});

	it('applies firing class on click', () => {
		render(<QuickLogButton onClick={vi.fn()} ariaLabel="Quick log" />);
		const btn = screen.getByRole('button');

		fireEvent.click(btn);
		expect(btn.className).toContain('ql-btn--firing');
	});

	it('renders spark elements for the particle effect', () => {
		const { container } = render(<QuickLogButton onClick={vi.fn()} ariaLabel="Quick log" />);
		const sparks = container.querySelectorAll('.ql-spark');
		expect(sparks).toHaveLength(6);
	});
});
