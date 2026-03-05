import { useState, useCallback } from 'react';

interface MergeEntity {
	id: string;
	name: string;
}

export function useMergeFlow() {
	const [mergeSource, setMergeSource] = useState<MergeEntity | null>(null);
	const [mergeTarget, setMergeTarget] = useState<MergeEntity | null>(null);

	const startMerge = useCallback((source: MergeEntity) => {
		setMergeSource(source);
		setMergeTarget(null);
	}, []);

	const selectTarget = useCallback((target: MergeEntity) => {
		setMergeTarget(target);
	}, []);

	const cancelMerge = useCallback(() => {
		setMergeSource(null);
		setMergeTarget(null);
	}, []);

	const completeMerge = useCallback(() => {
		setMergeSource(null);
		setMergeTarget(null);
	}, []);

	return {
		mergeSource,
		mergeTarget,
		isSelectingTarget: mergeSource !== null && mergeTarget === null,
		isConfirming: mergeSource !== null && mergeTarget !== null,
		startMerge,
		selectTarget,
		cancelMerge,
		completeMerge,
	};
}
