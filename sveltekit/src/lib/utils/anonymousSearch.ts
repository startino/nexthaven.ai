import type { SupabaseClient } from '@supabase/supabase-js';
import { isAnonymousUser } from '$lib/supabase/auth';

// Maximum number of searches allowed for anonymous users
export const ANONYMOUS_SEARCH_LIMIT = 1;

/**
 * Check if an anonymous user has reached their search limit
 * @param supabase Supabase client
 * @param user User object from session
 * @returns { isAnonymous, hasReachedLimit, remainingSearches, searchCount }
 */
export async function checkAnonymousSearchLimit(
	supabase: SupabaseClient,
	user: any
): Promise<{
	isAnonymous: boolean;
	hasReachedLimit: boolean;
	remainingSearches: number;
	searchCount: number;
}> {
	// If user is not anonymous, they have no limit
	if (!user || !isAnonymousUser(user)) {
		console.log('checkAnonymousSearchLimit: User is not anonymous, no limit applied');
		return {
			isAnonymous: false,
			hasReachedLimit: false,
			remainingSearches: Infinity,
			searchCount: 0
		};
	}

	console.log('checkAnonymousSearchLimit: User is anonymous, checking limits for:', user.id);
	try {
		// Get current search count for the user
		const { data, error } = await supabase
			.from('anonymous_search_limits')
			.select('search_count')
			.eq('user_id', user.id)
			.single();

		// If no record found, create one to ensure proper tracking
		if (error || !data) {
			console.log(
				'checkAnonymousSearchLimit: No search limit record found for anonymous user, creating one:',
				user.id
			);

			// Create a new record with zero searches
			try {
				const { error: insertError } = await supabase.from('anonymous_search_limits').insert({
					user_id: user.id,
					search_count: 0,
					last_search_at: new Date().toISOString()
				});

				if (insertError) {
					console.error(
						'checkAnonymousSearchLimit: Error creating anonymous search limit record:',
						insertError
					);
				} else {
					console.log(
						'checkAnonymousSearchLimit: Created anonymous search limits record for user:',
						user.id
					);
				}
			} catch (insertErr) {
				console.error(
					'checkAnonymousSearchLimit: Exception creating anonymous search limits record:',
					insertErr
				);
			}

			console.log(
				'checkAnonymousSearchLimit: Returning default anonymous limit info (not reached)'
			);
			return {
				isAnonymous: true,
				hasReachedLimit: false,
				remainingSearches: ANONYMOUS_SEARCH_LIMIT,
				searchCount: 0
			};
		}

		const searchCount = data.search_count || 0;
		const remainingSearches = Math.max(0, ANONYMOUS_SEARCH_LIMIT - searchCount);
		const hasReachedLimit = searchCount >= ANONYMOUS_SEARCH_LIMIT;

		console.log(
			`checkAnonymousSearchLimit: User ${user.id} has search count: ${searchCount}, remaining: ${remainingSearches}, reached limit: ${hasReachedLimit}`
		);

		return { isAnonymous: true, hasReachedLimit, remainingSearches, searchCount };
	} catch (error) {
		console.error('checkAnonymousSearchLimit: Error checking anonymous search limit:', error);
		// Default to not limiting in case of error
		return {
			isAnonymous: true,
			hasReachedLimit: false,
			remainingSearches: ANONYMOUS_SEARCH_LIMIT,
			searchCount: 0
		};
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
	console.log(`incrementAnonymousSearchCount: Incrementing search count for user ${userId}`);

	try {
		// Check if record exists
		const { data: existingRecord, error: checkError } = await supabase
			.from('anonymous_search_limits')
			.select('user_id, search_count')
			.eq('user_id', userId)
			.single();

		const now = new Date().toISOString();

		if (!existingRecord) {
			console.log(
				`incrementAnonymousSearchCount: No record found for user ${userId}, creating new record with count=1`
			);

			// Create new record if none exists
			const { error: insertError } = await supabase.from('anonymous_search_limits').insert({
				user_id: userId,
				search_count: 1,
				last_search_at: now
			});

			if (insertError) {
				console.error('incrementAnonymousSearchCount: Error creating record:', insertError);
				return false;
			}

			console.log(
				`incrementAnonymousSearchCount: Successfully created record for user ${userId} with count=1`
			);
			return true;
		} else {
			// Get current search count and increment it directly
			const currentCount = existingRecord.search_count || 0;
			const newCount = currentCount + 1;

			console.log(
				`incrementAnonymousSearchCount: Updating count for user ${userId} from ${currentCount} to ${newCount}`
			);

			// Update record with new count
			const { error: updateError } = await supabase
				.from('anonymous_search_limits')
				.update({
					search_count: newCount,
					last_search_at: now
				})
				.eq('user_id', userId);

			if (updateError) {
				console.error('incrementAnonymousSearchCount: Error updating count:', updateError);
				return false;
			}

			console.log(
				`incrementAnonymousSearchCount: Successfully updated count for user ${userId} to ${newCount}`
			);
		}

		return true;
	} catch (error) {
		console.error('incrementAnonymousSearchCount: Error incrementing count:', error);
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
