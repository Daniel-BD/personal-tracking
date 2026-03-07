import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Plus } from 'lucide-react';
import IconActionButton from '../IconActionButton';

describe('IconActionButton', () => {
	it('renders and calls onClick', () => {
		const onClick = vi.fn();
		render(<IconActionButton icon={Plus} tone="add" onClick={onClick} ariaLabel="Quick add" />);
		fireEvent.click(screen.getByRole('button', { name: 'Quick add' }));
		expect(onClick).toHaveBeenCalledOnce();
	});

	it('applies tone classes', () => {
		render(<IconActionButton icon={Plus} tone="delete" onClick={() => {}} ariaLabel="Delete" />);
		const button = screen.getByRole('button', { name: 'Delete' });
		expect(button.className).toContain('color-danger');
		expect(button.className).toContain('rounded-full');
	});
});
