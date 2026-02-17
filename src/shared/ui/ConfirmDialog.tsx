import BottomSheet from './BottomSheet';

interface Props {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message?: string;
	confirmLabel?: string;
}

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete' }: Props) {
	function handleConfirm() {
		onConfirm();
		onClose();
	}

	return (
		<BottomSheet open={open} onClose={onClose} title={title}>
			<div className="space-y-4">
				{message && <p className="text-body text-sm">{message}</p>}
				<div className="flex gap-3">
					<button type="button" onClick={onClose} className="btn btn-secondary flex-1">
						Cancel
					</button>
					<button type="button" onClick={handleConfirm} className="btn btn-danger flex-1">
						{confirmLabel}
					</button>
				</div>
			</div>
		</BottomSheet>
	);
}
