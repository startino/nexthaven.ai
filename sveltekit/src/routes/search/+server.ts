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
		console.log('POST /search: No session found, returning 401');
		return json({ success: false, message: 'Authentication required' }, { status: 401 });
	}

	try {
		const { supabase } = locals;
		const body = await request.json();
		const searchQuery = body.searchQuery;

		console.log(`POST /search: Processing search request for user ${session.user.id}`);

		// Parse the search data from the searchQuery string
		const searchData = JSON.parse(searchQuery);

		// Check if user is anonymous and has reached their search limit
		if (isAnonymousUser(session.user)) {
			console.log(`POST /search: User ${session.user.id} is anonymous, checking search limit`);

			const { hasReachedLimit, remainingSearches, searchCount } = await checkAnonymousSearchLimit(
				supabase,
				session.user
			);

			console.log(
				`POST /search: Anonymous user has searchCount=${searchCount}, remainingSearches=${remainingSearches}, hasReachedLimit=${hasReachedLimit}`
			);

			if (hasReachedLimit) {
				console.log(
					`POST /search: Anonymous user ${session.user.id} has reached search limit, returning 403`
				);
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
			console.error('POST /search: Error checking existing searches:', searchError);
		}

		// If recent identical search exists, just update it
		if (existingSearches && existingSearches.length > 0) {
			const existingId = existingSearches[0].id;
			console.log(`POST /search: Found existing search ${existingId}, updating timestamp`);

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
				console.error('POST /search: Error updating existing search:', updateError);
			} else {
				// If user is anonymous, increment their search count
				if (isAnonymousUser(session.user)) {
					console.log(
						`POST /search: Incrementing search count for anonymous user ${session.user.id}`
					);
					const incrementResult = await incrementAnonymousSearchCount(supabase, session.user.id);
					console.log(`POST /search: Increment result: ${incrementResult}`);
				}

				return json({
					success: true,
					searchId: updatedSearch.id,
					message: 'Updated existing search'
				});
			}
		}

		console.log(`POST /search: Creating new search history entry for user ${session.user.id}`);
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
			console.error('POST /search: Error saving search history:', insertError);
			return json({ success: false, message: 'Failed to save search history' }, { status: 500 });
		}

		// If user is anonymous, increment their search count
		if (isAnonymousUser(session.user)) {
			console.log(
				`POST /search: Incrementing search count for anonymous user ${session.user.id} after new search created`
			);
			const incrementResult = await incrementAnonymousSearchCount(supabase, session.user.id);
			console.log(`POST /search: Increment result: ${incrementResult}`);
		}

		return json({
			success: true,
			searchId: data.id,
			message: 'Created new search history entry'
		});
	} catch (err) {
		console.error('POST /search: Error saving search:', err);
		return json(
			{ success: false, message: 'An error occurred while saving your search' },
			{ status: 500 }
		);
	}
};
