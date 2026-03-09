export interface ToastMessage {
	id: number;
	text: string;
	action?: { label: string; onClick: () => void };
}

type PendingToastMessage = Omit<ToastMessage, 'id'>;

let addToastFn: ((msg: PendingToastMessage) => void) | null = null;

export function setToastHandler(handler: ((msg: PendingToastMessage) => void) | null) {
	addToastFn = handler;
}

export function showToast(text: string, action?: ToastMessage['action']) {
	addToastFn?.({ text, action });
}
