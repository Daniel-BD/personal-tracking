import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ConfirmDialog from '../ConfirmDialog';

afterEach(cleanup);

describe('ConfirmDialog', () => {
	it('renders nothing when closed', () => {
		const { container } = render(
			<ConfirmDialog open={false} onClose={() => {}} onConfirm={() => {}} title="Delete Item" />,
		);
		expect(container.innerHTML).toBe('');
	});

	it('renders title and Cancel/Delete buttons when open', () => {
		render(<ConfirmDialog open={true} onClose={() => {}} onConfirm={() => {}} title="Delete Item" />);
		expect(screen.getByText('Delete Item')).toBeTruthy();
		expect(screen.getByText('Cancel')).toBeTruthy();
		expect(screen.getByText('Delete')).toBeTruthy();
	});

	it('renders optional message when provided', () => {
		render(
			<ConfirmDialog
				open={true}
				onClose={() => {}}
				onConfirm={() => {}}
				title="Delete Item"
				message="This cannot be undone."
			/>,
		);
		expect(screen.getByText('This cannot be undone.')).toBeTruthy();
	});

	it('renders custom confirmLabel', () => {
		render(
			<ConfirmDialog
				open={true}
				onClose={() => {}}
				onConfirm={() => {}}
				title="Restore from Backup"
				confirmLabel="Restore"
			/>,
		);
		expect(screen.getByText('Restore')).toBeTruthy();
	});

	it('calls onClose when Cancel is clicked', () => {
		const onClose = vi.fn();
		render(<ConfirmDialog open={true} onClose={onClose} onConfirm={() => {}} title="Delete Item" />);
		fireEvent.click(screen.getByText('Cancel'));
		expect(onClose).toHaveBeenCalledOnce();
	});

	it('calls onConfirm and onClose when confirm button is clicked', () => {
		const onClose = vi.fn();
		const onConfirm = vi.fn();
		render(<ConfirmDialog open={true} onClose={onClose} onConfirm={onConfirm} title="Delete Item" />);
		fireEvent.click(screen.getByText('Delete'));
		expect(onConfirm).toHaveBeenCalledOnce();
		expect(onClose).toHaveBeenCalledOnce();
	});

	it('confirm button has danger styling', () => {
		render(<ConfirmDialog open={true} onClose={() => {}} onConfirm={() => {}} title="Delete Item" />);
		const confirmBtn = screen.getByText('Delete');
		expect(confirmBtn.className).toContain('btn-danger');
	});
});
