import { useEffect, useRef, useId, type ReactNode } from 'react';

interface Props {
	open: boolean;
	onclose: () => void;
	children: ReactNode;
	title?: string;
	headerAction?: ReactNode;
}

export default function BottomSheet({ open, onclose, children, title, headerAction }: Props) {
	const sheetRef = useRef<HTMLDivElement>(null);
	const oncloseRef = useRef(onclose);
	oncloseRef.current = onclose;
	const titleId = useId();

	// Save and restore original body overflow
	useEffect(() => {
		if (open) {
			const originalOverflow = document.body.style.overflow;
			document.body.style.overflow = 'hidden';
			return () => { document.body.style.overflow = originalOverflow; };
		}
	}, [open]);

	// Keyboard handling — uses ref so effect doesn't re-run on onclose identity changes
	useEffect(() => {
		if (!open) return;

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') oncloseRef.current();
		}

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [open]);

	// Focus management — only when opening, with preventScroll to avoid page jumps
	useEffect(() => {
		if (!open) return;

		const firstFocusable = sheetRef.current?.querySelector<HTMLElement>(
			'input:not([type="date"]):not([type="time"]), button, [tabindex]:not([tabindex="-1"])'
		);
		firstFocusable?.focus({ preventScroll: true });
	}, [open]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-40 flex items-end justify-center overflow-hidden">
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
				className="relative w-full max-w-lg bg-[var(--bg-card)] rounded-t-2xl shadow-[var(--shadow-elevated)] animate-slide-up max-h-[85dvh] flex flex-col"
			>
				{/* Handle */}
				<div className="flex justify-center pt-3 pb-1 flex-shrink-0">
					<div className="w-10 h-1 rounded-full bg-[var(--text-muted)] opacity-40" />
				</div>

				{(title || headerAction) && (
					<div className="px-5 pb-3 flex-shrink-0 flex items-center justify-between gap-3">
						{title && <h3 id={titleId} className="text-lg font-semibold text-heading">{title}</h3>}
						{headerAction}
					</div>
				)}

				<div className="flex-1 overflow-y-auto px-5 pb-5" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}>
					{children}
				</div>
			</div>
		</div>
	);
}
