import { useState, useEffect } from 'react';

interface UseLibraryFormOptions<TFields> {
	/** Whether the add sheet is currently open */
	showAddSheet: boolean;
	/** Default values to reset the form to */
	defaults: TFields;
}

/**
 * Shared hook for item/category add/edit/delete sheet lifecycle.
 * Encapsulates the open→reset→edit→save→close cycle that ItemsTab and CategoriesTab both use.
 */
export function useLibraryForm<
	TEditing extends { id: string },
	TFields extends Record<string, unknown>,
	TDeleting extends { id: string; name: string } = { id: string; name: string },
>({ showAddSheet, defaults }: UseLibraryFormOptions<TFields>) {
	const [editing, setEditing] = useState<TEditing | null>(null);
	const [fields, setFields] = useState<TFields>(defaults);
	const [deleting, setDeleting] = useState<TDeleting | null>(null);

	// Reset form when add sheet opens
	useEffect(() => {
		if (showAddSheet) {
			setFields(defaults);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- Only reset when the sheet opens, not when defaults ref changes
	}, [showAddSheet]);

	function setField<K extends keyof TFields>(key: K, value: TFields[K]) {
		setFields((prev) => ({ ...prev, [key]: value }));
	}

	function resetForm() {
		setEditing(null);
		setFields(defaults);
	}

	function startEdit(entity: TEditing, formValues: TFields) {
		setEditing({ ...entity });
		setFields(formValues);
	}

	return {
		editing,
		fields,
		deleting,
		setDeleting,
		setField,
		resetForm,
		startEdit,
	};
}
