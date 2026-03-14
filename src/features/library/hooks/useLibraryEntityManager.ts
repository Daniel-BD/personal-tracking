import { useState } from 'react';
import type { EntryType } from '@/shared/lib/types';
import { useLibraryForm } from './useLibraryForm';
import { useMergeFlow } from './useMergeFlow';

interface EntityWithType {
	id: string;
	name: string;
	type: EntryType;
}

interface UseLibraryEntityManagerOptions<
	TEntity extends EntityWithType,
	TFields extends Record<string, unknown>,
	TDeleting extends EntityWithType,
> {
	showAddSheet: boolean;
	defaults: TFields;
	canSubmit: (fields: TFields) => boolean;
	getEditFields: (entity: TEntity) => TFields;
	getDeleteState: (entity: TEntity) => TDeleting;
	onAdd: (fields: TFields) => void;
	onSave: (editing: TEntity, fields: TFields) => void;
	onDelete: (deleting: TDeleting) => void;
}

export function useLibraryEntityManager<
	TEntity extends EntityWithType,
	TFields extends Record<string, unknown>,
	TDeleting extends EntityWithType,
>({
	showAddSheet,
	defaults,
	canSubmit,
	getEditFields,
	getDeleteState,
	onAdd,
	onSave,
	onDelete,
}: UseLibraryEntityManagerOptions<TEntity, TFields, TDeleting>) {
	const { editing, fields, deleting, setDeleting, setField, resetForm, startEdit, startDelete } = useLibraryForm<
		TEntity,
		TFields,
		TDeleting
	>({
		showAddSheet,
		defaults,
	});
	const [mergeType, setMergeType] = useState<EntryType | null>(null);
	const {
		mergeSource,
		mergeTarget,
		isSelectingTarget,
		isConfirming,
		startMerge,
		selectTarget,
		cancelMerge,
		completeMerge,
	} = useMergeFlow();

	function handleAdd(onCloseAddSheet: () => void) {
		if (!canSubmit(fields)) return;
		onAdd(fields);
		resetForm();
		onCloseAddSheet();
	}

	function handleStartEdit(entity: TEntity) {
		startEdit(entity, getEditFields(entity));
	}

	function handleSaveEdit() {
		if (!editing || !canSubmit(fields)) return;
		onSave(editing, fields);
		resetForm();
	}

	function handleDelete(entity: TEntity) {
		startDelete(getDeleteState(entity));
	}

	function handleConfirmDelete() {
		if (!deleting) return;
		onDelete(deleting);
		resetForm();
	}

	function handleStartMerge() {
		if (!editing) return;
		setMergeType(editing.type);
		startMerge({ id: editing.id, name: editing.name });
		resetForm();
	}

	function handleCancelMerge() {
		setMergeType(null);
		cancelMerge();
	}

	function handleCompleteMerge() {
		setMergeType(null);
		completeMerge();
	}

	return {
		editing,
		fields,
		deleting,
		setDeleting,
		setField,
		resetForm,
		handleAdd,
		handleStartEdit,
		handleSaveEdit,
		handleDelete,
		handleConfirmDelete,
		mergeType,
		mergeSource,
		mergeTarget,
		isSelectingTarget,
		isConfirming,
		selectTarget,
		handleStartMerge,
		handleCancelMerge,
		handleCompleteMerge,
	};
}
