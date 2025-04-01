import type { SupabaseClient } from '@supabase/supabase-js';
import { isAnonymousUser } from '$lib/supabase/auth';

// Maximum number of searches allowed for anonymous users
export const ANONYMOUS_SEARCH_LIMIT = 1;

/**
 * Check if an anonymous user has reached their search limit
 * @param supabase Supabase client
 * @param user User object from session
 * @returns { hasReachedLimit, remainingSearches, searchCount }
 */
export async function checkAnonymousSearchLimit(
	supabase: SupabaseClient,
	user: any
): Promise<{ hasReachedLimit: boolean; remainingSearches: number; searchCount: number }> {
	// If user is not anonymous, they have no limit
	if (!user || !isAnonymousUser(user)) {
		return { hasReachedLimit: false, remainingSearches: Infinity, searchCount: 0 };
	}

	try {
		// Get current search count for the user
		const { data, error } = await supabase
			.from('anonymous_search_limits')
			.select('search_count')
			.eq('user_id', user.id)
			.single();

		// If no record found or error, assume they haven't searched yet
		if (error || !data) {
			return { hasReachedLimit: false, remainingSearches: ANONYMOUS_SEARCH_LIMIT, searchCount: 0 };
		}

		const searchCount = data.search_count || 0;
		const remainingSearches = Math.max(0, ANONYMOUS_SEARCH_LIMIT - searchCount);
		const hasReachedLimit = searchCount >= ANONYMOUS_SEARCH_LIMIT;

		return { hasReachedLimit, remainingSearches, searchCount };
	} catch (error) {
		console.error('Error checking anonymous search limit:', error);
		// Default to not limiting in case of error
		return { hasReachedLimit: false, remainingSearches: ANONYMOUS_SEARCH_LIMIT, searchCount: 0 };
	}
}

/**
 * Increment search count for anonymous user
 * @param supabase Supabase client
 * @param userId User ID
 * @returns Success status
 */
export async function incrementAnonymousSearchCount(
	supabase: SupabaseClient,
	userId: string
): Promise<boolean> {
	try {
		// Check if record exists
		const { data: existingRecord, error: checkError } = await supabase
			.from('anonymous_search_limits')
			.select('user_id')
			.eq('user_id', userId)
			.single();

		const now = new Date().toISOString();

		if (!existingRecord) {
			// Create new record if none exists
			const { error: insertError } = await supabase.from('anonymous_search_limits').insert({
				user_id: userId,
				search_count: 1,
				last_search_at: now
			});

			if (insertError) {
				console.error('Error creating anonymous search limit record:', insertError);
				return false;
			}
		} else {
			// Increment existing record
			const { error: updateError } = await supabase
				.from('anonymous_search_limits')
				.update({
					search_count: supabase.rpc('increment', { increment_by: 1, row_id: userId }),
					last_search_at: now
				})
				.eq('user_id', userId);

			if (updateError) {
				console.error('Error updating anonymous search count:', updateError);
				return false;
			}
		}

		return true;
	} catch (error) {
		console.error('Error incrementing anonymous search count:', error);
		return false;
	}
}

/**
 * Reset search count for user (used after conversion to permanent account)
 * @param supabase Supabase client
 * @param userId User ID
 * @returns Success status
 */
export async function resetAnonymousSearchCount(
	supabase: SupabaseClient,
	userId: string
): Promise<boolean> {
	try {
		// Delete the record to reset
		const { error } = await supabase.from('anonymous_search_limits').delete().eq('user_id', userId);

		if (error) {
			console.error('Error resetting anonymous search count:', error);
			return false;
		}

		return true;
	} catch (error) {
		console.error('Error resetting anonymous search count:', error);
		return false;
	}
}
