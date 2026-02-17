import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import SentimentPills from '../SentimentPills';

afterEach(cleanup);

describe('SentimentPills', () => {
	it('renders nothing when both counts are zero', () => {
		const { container } = render(<SentimentPills positive={0} limit={0} />);
		expect(container.innerHTML).toBe('');
	});

	it('renders only positive pill when limit is zero', () => {
		render(<SentimentPills positive={3} limit={0} />);
		expect(screen.getByText('3+')).toBeTruthy();
		expect(screen.queryByText(/\u2212/)).toBeNull();
	});

	it('renders only limit pill when positive is zero', () => {
		render(<SentimentPills positive={0} limit={2} />);
		expect(screen.getByText(/2\u2212/)).toBeTruthy();
		expect(screen.queryByText(/\+/)).toBeNull();
	});

	it('renders both pills when both counts are positive', () => {
		render(<SentimentPills positive={5} limit={3} />);
		expect(screen.getByText('5+')).toBeTruthy();
		expect(screen.getByText(/3\u2212/)).toBeTruthy();
	});

	it('includes an accessible label', () => {
		render(<SentimentPills positive={4} limit={1} />);
		expect(screen.getByLabelText('4 positive, 1 limit')).toBeTruthy();
	});
});
