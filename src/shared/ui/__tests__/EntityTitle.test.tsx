import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EntityTitle from '../EntityTitle';

describe('EntityTitle', () => {
	it('renders text with two-line clamp classes', () => {
		render(<EntityTitle text="A very long title" />);
		const title = screen.getByText('A very long title');
		expect(title.className).toContain('text-sm');
		expect(title.className).toContain('[-webkit-line-clamp:2]');
	});
});
