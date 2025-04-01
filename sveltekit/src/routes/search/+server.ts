import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAnonymousUser } from '$lib/supabase/auth';
import {
	checkAnonymousSearchLimit,
	incrementAnonymousSearchCount
} from '$lib/utils/anonymousSearch';

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.getSession();
	if (!session) {
		return json({ success: false, message: 'Authentication required' }, { status: 401 });
	}

	try {
		const { supabase } = locals;
		const body = await request.json();
		const searchQuery = body.searchQuery;

		// Parse the search data from the searchQuery string
		const searchData = JSON.parse(searchQuery);

		// Check if user is anonymous and has reached their search limit
		if (isAnonymousUser(session.user)) {
			const { hasReachedLimit, remainingSearches } = await checkAnonymousSearchLimit(
				supabase,
				session.user
			);

			if (hasReachedLimit) {
				return json(
					{
						success: false,
						limitReached: true,
						message:
							'Anonymous users are limited to 1 search. Please create an account to continue.'
					},
					{ status: 403 }
				);
			}
		}

		// Check for a recent identical search to avoid duplicates
		const { data: existingSearches, error: searchError } = await supabase
			.from('search_history')
			.select('id, created_at')
			.eq('user_id', session.user.id)
			.eq('destination', searchData.query)
			.eq('date_range', searchData.date)
			.order('created_at', { ascending: false })
			.limit(1);

		if (searchError) {
			console.error('Error checking existing searches:', searchError);
		}

		// If recent identical search exists, just update it
		if (existingSearches && existingSearches.length > 0) {
			const existingId = existingSearches[0].id;

			// Update the existing search with new search time
			const { data: updatedSearch, error: updateError } = await supabase
				.from('search_history')
				.update({
					created_at: new Date().toISOString(), // Update timestamp to current
					search_query: searchQuery // Update the query in case of small changes
				})
				.eq('id', existingId)
				.select('id')
				.single();

			if (updateError) {
				console.error('Error updating existing search:', updateError);
			} else {
				// If user is anonymous, increment their search count
				if (isAnonymousUser(session.user)) {
					await incrementAnonymousSearchCount(supabase, session.user.id);
				}

				return json({
					success: true,
					searchId: updatedSearch.id,
					message: 'Updated existing search'
				});
			}
		}

		// Insert new search history if no existing search was found or update failed
		const { data, error: insertError } = await supabase
			.from('search_history')
			.insert({
				user_id: session.user.id,
				destination: searchData.query,
				date_range: searchData.date,
				budget: searchData.budget,
				rooms: searchData.number_of_rooms,
				preferences: searchData.preferences,
				search_query: searchQuery,
				created_at: new Date().toISOString()
			})
			.select('id')
			.single();

		if (insertError) {
			console.error('Error saving search history:', insertError);
			return json({ success: false, message: 'Failed to save search history' }, { status: 500 });
		}

		// If user is anonymous, increment their search count
		if (isAnonymousUser(session.user)) {
			await incrementAnonymousSearchCount(supabase, session.user.id);
		}

		return json({
			success: true,
			searchId: data.id,
			message: 'Created new search history entry'
		});
	} catch (err) {
		console.error('Error saving search:', err);
		return json(
			{ success: false, message: 'An error occurred while saving your search' },
			{ status: 500 }
		);
	}
};
