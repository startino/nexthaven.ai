import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireSubscription } from '$lib/utils/subscription';

export const POST: RequestHandler = async (event) => {
	// Check subscription status and redirect if not subscribed
	await requireSubscription(event);

	const { request, locals } = event;
	const { supabase } = locals;

	try {
		const requestData = await request.json();
		const { searchId, resultsCount, properties } = requestData;

		if (!searchId) {
			return json({ success: false, message: 'Search ID is required' }, { status: 400 });
		}

		// Check if the user is authenticated
		const {
			data: { session }
		} = await supabase.auth.getSession();

		if (!session) {
			return json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		// First delete any existing search results for this search
		const { error: deleteError } = await supabase
			.from('search_results')
			.delete()
			.eq('search_id', searchId);

		if (deleteError) {
			console.error('Error deleting existing search results:', deleteError);
			// Continue anyway to insert new results
		}

		// If properties are provided, save them
		if (properties && properties.length > 0) {
			// Prepare property data for insertion

			// Insert into search_results table
			const { data: resultsData, error: resultsError } = await supabase
				.from('search_results')
				.insert({ search_id: searchId, data: properties })
				.select('id');

			if (resultsError) {
				console.error('Error saving search results:', resultsError);
				return json({ success: false, message: 'Failed to save search results' }, { status: 500 });
			}

			// Update the search_history with the count of results
			const { error: updateError } = await supabase
				.from('search_history')
				.update({
					results_count: resultsCount || properties.length,
					updated_at: new Date().toISOString()
				})
				.eq('id', searchId);

			if (updateError) {
				console.error('Error updating search history with results count:', updateError);
				// Still report success if only the update failed
			}

			return json({
				success: true,
				resultIds: resultsData.map((r) => r.id),
				message: 'Search results saved successfully'
			});
		} else {
			// Just update the results count
			const { error: updateError } = await supabase
				.from('search_history')
				.update({
					results_count: resultsCount || 0,
					updated_at: new Date().toISOString()
				})
				.eq('id', searchId);

			if (updateError) {
				console.error('Error updating search history with results count:', updateError);
				return json(
					{ success: false, message: 'Failed to update search history' },
					{ status: 500 }
				);
			}

			return json({
				success: true,
				message: 'Search history updated with results count'
			});
		}
	} catch (err) {
		console.error('Error processing search results:', err);
		return json(
			{ success: false, message: 'An error occurred while processing results' },
			{ status: 500 }
		);
	}
};
