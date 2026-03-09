import { useEffect, useState } from 'react';
import { type ToastMessage, setToastHandler } from './toast-store';

export default function ToastContainer() {
	const [toasts, setToasts] = useState<ToastMessage[]>([]);

	useEffect(() => {
		let toastIdCounter = 0;
		const timers = new Map<number, ReturnType<typeof setTimeout>>();

		setToastHandler((msg) => {
			const id = ++toastIdCounter;
			setToasts((prev) => [...prev, { ...msg, id }]);
			const timer = setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
				timers.delete(id);
			}, 3500);
			timers.set(id, timer);
		});

		return () => {
			setToastHandler(null);
			timers.forEach((timer) => clearTimeout(timer));
			timers.clear();
		};
	}, []);

	if (toasts.length === 0) return null;

	return (
		<div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
			{toasts.map((toast) => (
				<div
					key={toast.id}
					className="pointer-events-auto bg-[var(--bg-toast)] text-[var(--text-toast)] text-sm font-medium px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in"
				>
					<span>{toast.text}</span>
					{toast.action && (
						<button
							onClick={toast.action.onClick}
							className="text-[var(--color-toast-action)] font-semibold hover:underline whitespace-nowrap"
						>
							{toast.action.label}
						</button>
					)}
				</div>
			))}
		</div>
	);
}
