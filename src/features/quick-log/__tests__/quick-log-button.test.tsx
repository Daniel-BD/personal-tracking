import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';

// Mock motion/react — useAnimate returns a no-op animate and a ref
vi.mock('motion/react', () => ({
	useAnimate: () => {
		const scope = { current: null };
		const animate = () => Promise.resolve();
		return [scope, animate];
	},
	useReducedMotion: () => false,
}));

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

	it('renders all effect layers', () => {
		const { container } = render(<QuickLogButton onClick={vi.fn()} ariaLabel="Quick log" />);
		expect(container.querySelector('.ql-ripple')).toBeTruthy();
		expect(container.querySelector('.ql-settle')).toBeTruthy();
		expect(container.querySelector('.ql-icon')).toBeTruthy();
		expect(container.querySelector('.ql-sweep')).toBeTruthy();
	});
});
