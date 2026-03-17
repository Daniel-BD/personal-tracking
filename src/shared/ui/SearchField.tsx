import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

type SearchFieldProps = Omit<ComponentPropsWithoutRef<'input'>, 'size' | 'value' | 'onChange'> & {
	value: string;
	onValueChange: (value: string) => void;
	onClear?: () => void;
	clearAriaLabel?: string;
};

const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
	{ value, onValueChange, onClear, clearAriaLabel, className, ...props },
	ref,
) {
	return (
		<div className="relative">
			<input
				{...props}
				ref={ref}
				type="text"
				value={value}
				onChange={(event) => onValueChange(event.target.value)}
				className={cn('form-input-sm pr-8', className)}
			/>
			{onClear && value && (
				<button
					type="button"
					onClick={onClear}
					className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-body"
					aria-label={clearAriaLabel}
				>
					<X className="w-4 h-4" strokeWidth={2} />
				</button>
			)}
		</div>
	);
});

export default SearchField;
