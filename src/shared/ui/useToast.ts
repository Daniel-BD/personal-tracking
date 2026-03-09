import { useContext } from 'react';
import { ToastContext, type ToastAction, type ToastContextValue } from './toast-context';

export type { ToastAction };

export function useToast(): ToastContextValue {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error('useToast must be used within a ToastProvider');
	}
	return context;
}
