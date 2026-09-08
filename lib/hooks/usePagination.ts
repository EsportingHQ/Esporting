'use client';

import { useState, useCallback } from 'react';

export interface PaginationState {
	pageSize: number;
	hasMore: boolean;
	isLoading: boolean;
	error: Error | null;
}

export interface UsePaginationOptions {
	initialPageSize?: number;
	minPageSize?: number;
	maxPageSize?: number;
}

/**
 * Hook for managing paginated data with cursor-based or offset-based loading
 *
 * @example
 * const { pageSize, hasMore, loadMore, reset } = usePagination({
 *   initialPageSize: 25,
 * });
 *
 * // In your component:
 * // 1. Pass pageSize to your query
 * // 2. Call loadMore() when user clicks "Load More"
 * // 3. Set hasMore based on results (if received < pageSize, no more data)
 * // 4. Show button only if hasMore === true
 */
export function usePagination(options: UsePaginationOptions = {}) {
	const {
		initialPageSize = 25,
		minPageSize = 10,
		maxPageSize = 100,
	} = options;

	const [pageSize, setPageSize] = useState(initialPageSize);
	const [hasMore, setHasMore] = useState(true);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const loadMore = useCallback(() => {
		setIsLoading(true);
		setError(null);
	}, []);

	const finishLoading = useCallback((receivedCount: number) => {
		setIsLoading(false);
		// If we received fewer items than requested, we've reached the end
		setHasMore(receivedCount >= pageSize);
	}, [pageSize]);

	const setLoadError = useCallback((err: Error) => {
		setError(err);
		setIsLoading(false);
	}, []);

	const increasePageSize = useCallback(() => {
		setPageSize((prev) => Math.min(prev * 2, maxPageSize));
	}, [maxPageSize]);

	const resetPagination = useCallback(() => {
		setPageSize(initialPageSize);
		setHasMore(true);
		setIsLoading(false);
		setError(null);
	}, [initialPageSize]);

	return {
		pageSize,
		hasMore,
		isLoading,
		error,
		loadMore,
		finishLoading,
		setLoadError,
		increasePageSize,
		resetPagination,
	};
}

/**
 * Helper to detect if we've loaded all available data
 * @param receivedCount - Number of items received in this batch
 * @param requestedCount - Number of items requested (pageSize)
 * @returns true if there's likely more data, false if we've reached the end
 */
export function hasMoreData(receivedCount: number, requestedCount: number): boolean {
	return receivedCount >= requestedCount;
}
