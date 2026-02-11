import { useEffect, useState } from 'react';

export interface ToastMessage {
	id: number;
	text: string;
	action?: { label: string; onClick: () => void };
}

let toastIdCounter = 0;
let addToastFn: ((msg: Omit<ToastMessage, 'id'>) => void) | null = null;

export function showToast(text: string, action?: ToastMessage['action']) {
	addToastFn?.({ text, action });
}

export default function ToastContainer() {
	const [toasts, setToasts] = useState<ToastMessage[]>([]);

	useEffect(() => {
		addToastFn = (msg) => {
			const id = ++toastIdCounter;
			setToasts((prev) => [...prev, { ...msg, id }]);
			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
			}, 3500);
		};
		return () => { addToastFn = null; };
	}, []);

	if (toasts.length === 0) return null;

	return (
		<div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
			{toasts.map((toast) => (
				<div
					key={toast.id}
					className="pointer-events-auto bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in"
				>
					<span>{toast.text}</span>
					{toast.action && (
						<button
							onClick={toast.action.onClick}
							className="text-blue-300 dark:text-blue-600 font-semibold hover:underline whitespace-nowrap"
						>
							{toast.action.label}
						</button>
					)}
				</div>
			))}
		</div>
	);
}
