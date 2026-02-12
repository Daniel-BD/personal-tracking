import { useRef } from 'react';
import { formatTime } from '../lib/analysis';

interface NativePickerInputProps {
	type: 'date' | 'time';
	value: string;
	onChange: (value: string) => void;
	onClear?: () => void;
	id?: string;
}

function formatDateDisplay(value: string): string {
	if (!value) return '';
	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(year, month - 1, day);
	return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function NativePickerInput({ type, value, onChange, onClear, id }: NativePickerInputProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	const displayValue = type === 'date' ? formatDateDisplay(value) : formatTime(value);
	const placeholder = type === 'date' ? 'Select date' : 'Select time';
	const showClear = onClear && value;

	function handleOpen() {
		const input = inputRef.current;
		if (!input) return;
		try {
			input.showPicker();
		} catch {
			input.focus();
		}
	}

	return (
		<div className="relative">
			{/* Hidden native input — triggers OS picker via showPicker() */}
			<input
				ref={inputRef}
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="absolute inset-0 opacity-0 pointer-events-none"
				tabIndex={-1}
				aria-hidden="true"
			/>

			{/* Visible styled trigger — matches form-input sizing exactly */}
			<button
				id={id}
				type="button"
				onClick={handleOpen}
				className={`form-input w-full text-left flex items-center cursor-pointer ${showClear ? 'pr-8' : ''}`}
			>
				<span className={value ? '' : 'text-[var(--text-muted)]'}>
					{displayValue || placeholder}
				</span>
			</button>

			{/* Clear button */}
			{showClear && (
				<button
					type="button"
					onClick={onClear}
					className="absolute right-2 top-1/2 -translate-y-1/2 text-subtle hover:text-body text-lg"
					aria-label={`Clear ${type}`}
				>
					&times;
				</button>
			)}
		</div>
	);
}
