import { useEffect, useRef, useId, type ReactNode } from 'react';

interface Props {
	open: boolean;
	onclose: () => void;
	children: ReactNode;
	title?: string;
}

export default function BottomSheet({ open, onclose, children, title }: Props) {
	const sheetRef = useRef<HTMLDivElement>(null);
	const titleId = useId();

	// Save and restore original body overflow
	useEffect(() => {
		if (open) {
			const originalOverflow = document.body.style.overflow;
			document.body.style.overflow = 'hidden';
			return () => { document.body.style.overflow = originalOverflow; };
		}
	}, [open]);

	// Keyboard handling + focus management
	useEffect(() => {
		if (!open) return;

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') onclose();
		}

		document.addEventListener('keydown', handleKeyDown);

		// Move focus into the sheet when it opens
		const firstFocusable = sheetRef.current?.querySelector<HTMLElement>(
			'input, button, [tabindex]:not([tabindex="-1"])'
		);
		firstFocusable?.focus();

		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [open, onclose]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-40 flex items-end justify-center">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/40 animate-fade-in"
				onClick={onclose}
			/>

			{/* Sheet */}
			<div
				ref={sheetRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={title ? titleId : undefined}
				className="relative w-full max-w-lg bg-[var(--bg-card)] rounded-t-2xl shadow-[var(--shadow-elevated)] animate-slide-up max-h-[85vh] flex flex-col"
				style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
			>
				{/* Handle */}
				<div className="flex justify-center pt-3 pb-1 flex-shrink-0">
					<div className="w-10 h-1 rounded-full bg-[var(--text-muted)] opacity-40" />
				</div>

				{title && (
					<div className="px-5 pb-3 flex-shrink-0">
						<h3 id={titleId} className="text-lg font-semibold text-heading">{title}</h3>
					</div>
				)}

				<div className="flex-1 overflow-y-auto px-5 pb-5">
					{children}
				</div>
			</div>
		</div>
	);
}
