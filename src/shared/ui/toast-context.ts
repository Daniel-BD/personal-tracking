import { createContext } from 'react';

export interface ToastAction {
	label: string;
	onClick: () => void;
}

export interface ToastContextValue {
	showToast: (text: string, action?: ToastAction) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
