import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Merge } from 'lucide-react';
import BottomSheet from '@/shared/ui/BottomSheet';

interface Props {
	open: boolean;
	onClose: () => void;
	onConfirm: (noteToAppend?: string) => void;
	sourceName: string;
	targetName: string;
	affectedEntryCount: number;
	affectedItemCount?: number;
	showNoteInput: boolean;
	entityType: 'item' | 'category';
}

export default function MergeConfirmSheet({
	open,
	onClose,
	onConfirm,
	sourceName,
	targetName,
	affectedEntryCount,
	affectedItemCount,
	showNoteInput,
	entityType,
}: Props) {
	const { t } = useTranslation('library');
	const [note, setNote] = useState('');
	const ns = entityType === 'item' ? 'items' : 'categories';

	function handleClose() {
		setNote('');
		onClose();
	}

	function handleConfirm() {
		onConfirm(showNoteInput ? note : undefined);
		setNote('');
	}

	return (
		<BottomSheet open={open} onClose={handleClose} title={t(`${ns}.merge.confirmTitle`)}>
			<div className="space-y-4">
				<p className="text-body">{t(`${ns}.merge.confirmMessage`, { source: sourceName, target: targetName })}</p>

				<div className="text-sm text-label space-y-1">
					{entityType === 'category' && affectedItemCount !== undefined && (
						<p>{t(`${ns}.merge.affectedItems`, { count: affectedItemCount })}</p>
					)}
					<p>{t(`${ns}.merge.affectedEntries`, { count: affectedEntryCount })}</p>
				</div>

				{showNoteInput && (
					<div>
						<label htmlFor="mergeNote" className="form-label">
							{t(`${ns}.merge.noteLabel`)}
						</label>
						<textarea
							id="mergeNote"
							value={note}
							onChange={(e) => setNote(e.target.value)}
							placeholder={t(`${ns}.merge.notePlaceholder`, { source: sourceName })}
							className="form-input min-h-[80px] resize-y"
							rows={2}
						/>
					</div>
				)}

				<div className="flex gap-3 pt-2">
					<button type="button" onClick={handleClose} className="btn btn-secondary flex-1">
						{t(`${ns}.merge.cancelButton`)}
					</button>
					<button
						type="button"
						onClick={handleConfirm}
						className="btn btn-primary flex-1 flex items-center justify-center"
					>
						<Merge className="w-4 h-4 mr-2" strokeWidth={2} />
						{t(`${ns}.merge.confirmButton`)}
					</button>
				</div>
			</div>
		</BottomSheet>
	);
}
