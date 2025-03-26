import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id } = params;
	const { supabase } = locals;

	// Check if the user is authenticated
	const {
		data: { session }
	} = await supabase.auth.getSession();

	// If not authenticated, redirect to login
	if (!session) {
		redirect(303, '/login');
	}

	// Fetch the specific search history item
	const { data: searchHistory, error: searchError } = await supabase
		.from('search_history')
		.select('*')
		.eq('id', id)
		.eq('user_id', session.user.id)
		.single();

	if (searchError) {
		console.error('Error fetching search history:', searchError);
		error(404, 'Search history not found');
	}

	// Fetch all search results for this search
	const { data: searchResults, error: resultsError } = await supabase
		.from('search_results')
		.select('*')
		.eq('search_id', id)
		.order('score', { ascending: false });

	if (resultsError) {
		console.error('Error fetching search results:', resultsError);
		// Don't throw an error here, just return empty results
	}

	const actualResultsCount = searchResults?.length || 0;

	// If the stored count doesn't match the actual count, update it in the database
	if (searchHistory.results_count !== actualResultsCount) {
		console.log(
			`Correcting results count from ${searchHistory.results_count} to ${actualResultsCount}`
		);

		// Update the search history with the corrected count
		const { error: updateError } = await supabase
			.from('search_history')
			.update({
				results_count: actualResultsCount,
				updated_at: new Date().toISOString()
			})
			.eq('id', id)
			.eq('user_id', session.user.id);

		if (updateError) {
			console.error('Error updating search history count:', updateError);
		} else {
			// Update the local searchHistory object
			searchHistory.results_count = actualResultsCount;
		}
	}

	// Return both the search history and its results
	return {
		searchHistory,
		searchResults: searchResults || []
	};
};
