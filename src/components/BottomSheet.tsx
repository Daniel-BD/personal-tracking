import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
	open: boolean;
	onclose: () => void;
	children: ReactNode;
	title?: string;
}

export default function BottomSheet({ open, onclose, children, title }: Props) {
	const sheetRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (open) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => { document.body.style.overflow = ''; };
	}, [open]);

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') onclose();
		}
		if (open) {
			document.addEventListener('keydown', handleKeyDown);
			return () => document.removeEventListener('keydown', handleKeyDown);
		}
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
				className="relative w-full max-w-lg bg-[var(--bg-card)] rounded-t-2xl shadow-[var(--shadow-elevated)] animate-slide-up max-h-[85vh] flex flex-col"
				style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
			>
				{/* Handle */}
				<div className="flex justify-center pt-3 pb-1 flex-shrink-0">
					<div className="w-10 h-1 rounded-full bg-[var(--text-muted)] opacity-40" />
				</div>

				{title && (
					<div className="px-5 pb-3 flex-shrink-0">
						<h3 className="text-lg font-semibold text-heading">{title}</h3>
					</div>
				)}

				<div className="flex-1 overflow-y-auto px-5 pb-5">
					{children}
				</div>
			</div>
		</div>
	);
}
