/**
 * Utility functions for working with anonymous search state
 */
import type { AnonymousSearchInfo } from './types';
import { ANONYMOUS_SEARCH_LIMIT } from '$lib/utils/anonymousSearch';

/**
 * Get a default anonymousSearchInfo object for a user
 * @param isAnonymous Whether the user is anonymous
 * @returns A default anonymousSearchInfo object
 */
export function getDefaultAnonymousSearchInfo(isAnonymous: boolean = false): AnonymousSearchInfo {
	return {
		isAnonymous,
		hasReachedLimit: false,
		remainingSearches: isAnonymous ? ANONYMOUS_SEARCH_LIMIT : Infinity,
		searchCount: 0
	};
}

/**
 * Ensures the anonymousSearchInfo object has all required properties
 * @param info The possibly incomplete anonymousSearchInfo object
 * @param isAnonymous Whether the user is anonymous (used as fallback)
 * @returns A complete anonymousSearchInfo object
 */
export function ensureCompleteAnonymousSearchInfo(
	info: Partial<AnonymousSearchInfo> | null | undefined,
	isAnonymous: boolean = false
): AnonymousSearchInfo {
	if (!info) {
		return getDefaultAnonymousSearchInfo(isAnonymous);
	}

	// Create a complete object with defaults for any missing properties
	return {
		isAnonymous: info.isAnonymous ?? isAnonymous,
		hasReachedLimit: info.hasReachedLimit ?? false,
		remainingSearches: info.remainingSearches ?? (isAnonymous ? ANONYMOUS_SEARCH_LIMIT : Infinity),
		searchCount: info.searchCount ?? 0
	};
}

/**
 * Updates the search info with new values
 * @param current The current search info object
 * @param updates Partial updates to apply
 * @returns A new anonymousSearchInfo object with the updates applied
 */
export function updateAnonymousSearchInfo(
	current: AnonymousSearchInfo,
	updates: Partial<AnonymousSearchInfo>
): AnonymousSearchInfo {
	return {
		...current,
		...updates,
		// Always recalculate hasReachedLimit based on searchCount and ANONYMOUS_SEARCH_LIMIT
		hasReachedLimit:
			updates.hasReachedLimit !== undefined
				? updates.hasReachedLimit
				: updates.searchCount !== undefined
					? updates.searchCount >= ANONYMOUS_SEARCH_LIMIT
					: current.searchCount >= ANONYMOUS_SEARCH_LIMIT
	};
}

/**
 * Refreshes the page to ensure we get fresh anonymousSearchInfo from the server
 * Especially useful after creating a new anonymous user
 */
export function refreshAnonymousSearchInfo(): void {
	if (typeof window !== 'undefined') {
		console.log('Refreshing page to get updated anonymousSearchInfo from server');
		// Add a query parameter to indicate this is a refresh for anonymous search info
		const url = new URL(window.location.href);
		url.searchParams.set('refresh_anon_info', Date.now().toString());
		window.location.href = url.toString();
	}
}
