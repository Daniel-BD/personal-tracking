import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import BottomSheet from '../BottomSheet';

afterEach(cleanup);

describe('BottomSheet', () => {
	it('renders nothing when closed', () => {
		const { container } = render(
			<BottomSheet open={false} onclose={() => {}}>
				<p>body</p>
			</BottomSheet>,
		);
		expect(container.innerHTML).toBe('');
	});

	it('renders title and children when open', () => {
		render(
			<BottomSheet open={true} onclose={() => {}} title="My Title">
				<p>body content</p>
			</BottomSheet>,
		);
		expect(screen.getByText('My Title')).toBeTruthy();
		expect(screen.getByText('body content')).toBeTruthy();
	});

	it('renders pill-shaped action button when actionLabel is provided', () => {
		const onAction = vi.fn();
		render(
			<BottomSheet open={true} onclose={() => {}} title="Title" actionLabel="Save" onAction={onAction}>
				<p>body</p>
			</BottomSheet>,
		);

		const button = screen.getByText('Save');
		expect(button.tagName).toBe('BUTTON');
		expect(button.className).toContain('rounded-full');
		expect(button.className).toContain('btn-primary');

		fireEvent.click(button);
		expect(onAction).toHaveBeenCalledOnce();
	});

	it('disables action button when actionDisabled is true', () => {
		render(
			<BottomSheet
				open={true}
				onclose={() => {}}
				title="Title"
				actionLabel="Save"
				onAction={() => {}}
				actionDisabled={true}
			>
				<p>body</p>
			</BottomSheet>,
		);

		const button = screen.getByText('Save') as HTMLButtonElement;
		expect(button.disabled).toBe(true);
	});

	it('does not render action button when actionLabel is omitted', () => {
		render(
			<BottomSheet open={true} onclose={() => {}} title="Title">
				<p>body</p>
			</BottomSheet>,
		);

		// Only element in header is the title, no buttons
		const buttons = document.querySelectorAll('.btn-primary');
		expect(buttons.length).toBe(0);
	});

	it('calls onclose when backdrop is clicked', () => {
		const onclose = vi.fn();
		render(
			<BottomSheet open={true} onclose={onclose} title="Title">
				<p>body</p>
			</BottomSheet>,
		);

		const backdrop = document.querySelector('.animate-fade-in')!;
		fireEvent.click(backdrop);
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('calls onclose when Escape is pressed', () => {
		const onclose = vi.fn();
		render(
			<BottomSheet open={true} onclose={onclose} title="Title">
				<p>body</p>
			</BottomSheet>,
		);

		fireEvent.keyDown(document, { key: 'Escape' });
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('has dialog role and aria-modal', () => {
		render(
			<BottomSheet open={true} onclose={() => {}} title="Title">
				<p>body</p>
			</BottomSheet>,
		);

		const dialog = screen.getByRole('dialog');
		expect(dialog.getAttribute('aria-modal')).toBe('true');
	});
});
