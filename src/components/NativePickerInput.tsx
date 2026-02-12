import { useRef } from 'react';
import { formatDate } from '../lib/analysis';

interface NativePickerInputProps {
	type: 'date' | 'time';
	value: string;
	onChange: (value: string) => void;
	onClear?: () => void;
	id?: string;
}

function formatDateDisplay(value: string): string {
	if (!value) return '';
	return formatDate(value);
}

function formatTimeDisplay(value: string): string {
	if (!value) return '';
	const [hours, minutes] = value.split(':').map(Number);
	const period = hours >= 12 ? 'PM' : 'AM';
	const displayHours = hours % 12 || 12;
	return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export default function NativePickerInput({ type, value, onChange, onClear, id }: NativePickerInputProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	const displayValue = type === 'date' ? formatDateDisplay(value) : formatTimeDisplay(value);
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
