interface Option<T extends string> {
	value: T;
	label: string;
	activeClass?: string;
	disabled?: boolean;
	title?: string;
}

interface Props<T extends string> {
	options: Option<T>[];
	value: T;
	onChange: (value: T) => void;
	variant?: 'pill' | 'segment';
	size?: 'default' | 'sm' | 'xs';
}

const sizeClasses = {
	default: 'py-2 px-4 font-medium',
	sm: 'py-1.5 px-3 text-sm font-medium',
	xs: 'py-1 px-2 text-xs font-medium',
};

function getButtonClass<T extends string>(
	option: Option<T>,
	isActive: boolean,
	variant: 'pill' | 'segment',
	size: 'default' | 'sm' | 'xs',
): string {
	const baseClass = `flex-1 rounded-md transition-colors ${sizeClasses[size]}`;

	if (option.disabled) {
		return `${baseClass} bg-[var(--bg-inset)] text-subtle cursor-not-allowed`;
	}

	if (variant === 'pill') {
		if (isActive) {
			return `${baseClass} ${option.activeClass || 'bg-[var(--text-secondary)] text-white'}`;
		}
		return `${baseClass} bg-[var(--bg-inset)] text-body`;
	}

	if (isActive) {
		return `${baseClass} bg-[var(--bg-card)] text-heading shadow-sm`;
	}
	return `${baseClass} text-label hover:text-heading`;
}

export default function SegmentedControl<T extends string>({
	options,
	value,
	onChange,
	variant = 'pill',
	size = 'default',
}: Props<T>) {
	if (variant === 'segment') {
		return (
			<div className="flex gap-1 bg-[var(--bg-inset)] rounded-lg p-1">
				{options.map((option) => (
					<button
						key={option.value}
						type="button"
						onClick={() => onChange(option.value)}
						disabled={option.disabled}
						title={option.title}
						className={getButtonClass(option, value === option.value, variant, size)}
					>
						{option.label}
					</button>
				))}
			</div>
		);
	}

	return (
		<div className="flex gap-2">
			{options.map((option) => (
				<button
					key={option.value}
					type="button"
					onClick={() => onChange(option.value)}
					disabled={option.disabled}
					title={option.title}
					className={getButtonClass(option, value === option.value, variant, size)}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}
