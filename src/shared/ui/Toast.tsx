import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastAction } from './toast-context';

interface ToastMessage extends ToastInput {
	id: number;
}

interface ToastInput {
	text: string;
	action?: ToastAction;
}

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<ToastMessage[]>([]);
	const nextToastId = useRef(0);
	const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

	const dismissToast = useCallback((id: number) => {
		const timer = timersRef.current.get(id);
		if (timer) {
			clearTimeout(timer);
			timersRef.current.delete(id);
		}
		setToasts((prev) => prev.filter((toast) => toast.id !== id));
	}, []);

	const showToast = useCallback(
		(text: string, action?: ToastAction) => {
			const id = ++nextToastId.current;
			setToasts((prev) => [...prev, { id, text, action }]);
			const timer = setTimeout(() => dismissToast(id), 3500);
			timersRef.current.set(id, timer);
		},
		[dismissToast],
	);

	useEffect(() => {
		const timers = timersRef.current;
		return () => {
			timers.forEach((timer) => clearTimeout(timer));
			timers.clear();
		};
	}, []);

	const value = useMemo(() => ({ showToast }), [showToast]);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<ToastViewport toasts={toasts} />
		</ToastContext.Provider>
	);
}

function ToastViewport({ toasts }: { toasts: ToastMessage[] }) {
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
