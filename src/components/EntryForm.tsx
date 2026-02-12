import type { EntryType, Category } from '../lib/types';
import { getTypeColor } from '../lib/types';
import SegmentedControl from './SegmentedControl';
import CategoryPicker from './CategoryPicker';
import NativePickerInput from './NativePickerInput';

interface EntryFormProps {
	mode: 'create' | 'log';
	itemName: string;
	setItemName: (val: string) => void;
	itemType: EntryType;
	setItemType: (val: EntryType) => void;
	logDate: string;
	setLogDate: (val: string) => void;
	logTime: string | null;
	setLogTime: (val: string | null) => void;
	logNote: string;
	setLogNote: (val: string) => void;
	logCategories: string[];
	setLogCategories: (val: string[]) => void;
	categoriesForType: Category[];
	onSubmit: () => void;
}

export default function EntryForm({
	mode,
	itemName,
	setItemName,
	itemType,
	setItemType,
	logDate,
	setLogDate,
	logTime,
	setLogTime,
	logNote,
	setLogNote,
	logCategories,
	setLogCategories,
	categoriesForType,
	onSubmit
}: EntryFormProps) {
	return (
		<div className="space-y-5">
			{/* Item name — only for create mode */}
			{mode === 'create' && (
				<div>
					<label htmlFor="sheet-name" className="form-label">Name</label>
					<input
						id="sheet-name"
						type="text"
						value={itemName}
						onChange={(e) => setItemName(e.target.value)}
						placeholder="Item name"
						className="form-input"
						autoFocus
					/>
				</div>
			)}

			{/* Type selector — only for create mode */}
			{mode === 'create' && (
				<div>
					<label className="form-label">Type</label>
					<SegmentedControl
						options={[
							{ value: 'activity' as EntryType, label: 'Activity', activeClass: 'type-activity' },
							{ value: 'food' as EntryType, label: 'Food', activeClass: 'type-food' }
						]}
						value={itemType}
						onchange={setItemType}
						variant="segment"
						size="sm"
					/>
				</div>
			)}

			{/* Date */}
			<div>
				<label htmlFor="sheet-date" className="form-label">Date</label>
				<NativePickerInput
					id="sheet-date"
					type="date"
					value={logDate}
					onChange={setLogDate}
				/>
			</div>

			{/* Time */}
			<div>
				<label htmlFor="sheet-time" className="form-label">Time</label>
				<NativePickerInput
					id="sheet-time"
					type="time"
					value={logTime ?? ''}
					onChange={(val) => setLogTime(val || null)}
					onClear={() => setLogTime(null)}
				/>
			</div>

			{/* Categories */}
			<div>
				<label className="form-label">Categories</label>
				<CategoryPicker
					selected={logCategories}
					categories={categoriesForType}
					onchange={setLogCategories}
					type={itemType}
				/>
			</div>

			{/* Note */}
			<div>
				<label htmlFor="sheet-note" className="form-label">Note</label>
				<input
					id="sheet-note"
					type="text"
					value={logNote}
					onChange={(e) => setLogNote(e.target.value)}
					placeholder="Add a note..."
					className="form-input"
				/>
			</div>

			{/* Log button — sticky at bottom */}
			<button
				type="button"
				onClick={onSubmit}
				disabled={mode === 'create' && !itemName.trim()}
				className={`w-full btn-lg rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getTypeColor(itemType)}`}
			>
				Log
			</button>
		</div>
	);
}
