import { formatTime, formatDateWithYear } from '@/shared/lib/date-utils';
import { cn } from '@/shared/lib/cn';

interface NativePickerInputProps {
	type: 'date' | 'time';
	value: string;
	onChange: (value: string) => void;
	onClear?: () => void;
	id?: string;
}

export default function NativePickerInput({ type, value, onChange, onClear, id }: NativePickerInputProps) {
	const displayValue = type === 'date' ? formatDateWithYear(value) : formatTime(value);
	const placeholder = type === 'date' ? 'Select date' : 'Select time';
	const showClear = onClear && value;

	return (
		<div className="relative">
			{/* Visible styled display */}
			<div id={id} className={cn('form-input w-full text-left flex items-center', showClear && 'pr-8')}>
				<span className={cn(!value && 'text-[var(--text-muted)]')}>{displayValue || placeholder}</span>
			</div>

			{/* Native input — transparent overlay that captures taps directly.
			    On iOS Safari, showPicker() is unreliable, so instead we let the
			    user tap the native input itself (rendered over the styled display)
			    which reliably opens the OS picker. */}
			<input
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
				aria-label={`${type === 'date' ? 'Date' : 'Time'} picker`}
			/>

			{/* Clear button — z-10 so it sits above the transparent input */}
			{showClear && (
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						onClear();
					}}
					className="absolute right-2 top-1/2 -translate-y-1/2 text-subtle hover:text-body text-lg z-10"
					aria-label={`Clear ${type}`}
				>
					&times;
				</button>
			)}
		</div>
	);
}
