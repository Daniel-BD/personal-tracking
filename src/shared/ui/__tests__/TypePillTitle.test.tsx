import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import TypePillTitle from '../TypePillTitle';

afterEach(cleanup);

describe('TypePillTitle', () => {
	it('renders type pill above title', () => {
		render(<TypePillTitle type="food" title="Apple" />);

		const container = screen.getByText('Apple').closest('div')?.parentElement;
		expect(container?.className).toContain('flex-col');
		expect(screen.getByText('food')).toBeTruthy();
	});
});
