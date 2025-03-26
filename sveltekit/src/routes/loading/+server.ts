import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { supabase } = locals;

	// Check if the user is authenticated
	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}

	try {
		const { searchId, resultsCount, properties } = await request.json();
		if (!searchId) {
			return json({ error: 'Search ID is required' }, { status: 400 });
		}

		// First verify that the search history record belongs to the user
		const { data: searchHistory, error: searchError } = await supabase
			.from('search_history')
			.select('id')
			.eq('id', searchId)
			.eq('user_id', session.user.id)
			.single();

		if (searchError || !searchHistory) {
			console.error('Error verifying search ownership:', searchError);
			return json(
				{ error: 'Search history record not found or not owned by user' },
				{ status: 403 }
			);
		}

		// Update the search history with the result count
		const { data: updatedHistory, error: updateError } = await supabase
			.from('search_history')
			.update({
				results_count: resultsCount,
				updated_at: new Date().toISOString()
			})
			.eq('id', searchId)
			.eq('user_id', session.user.id)
			.select()
			.single();

		if (updateError) {
			console.error('Error updating search history:', updateError);
			return json({ error: 'Failed to update search history' }, { status: 500 });
		}

		// If properties are provided, save them to the search_results table
		if (properties && Array.isArray(properties) && properties.length > 0) {
			// Delete any existing results for this search first to avoid duplicates
			await supabase.from('search_results').delete().eq('search_id', searchId);

			// Filter out any invalid properties
			const validProperties = properties.filter(
				(property) => property && typeof property === 'object'
			);

			// Update the results count to match the actual number of valid properties
			if (validProperties.length !== properties.length) {
				console.warn(`Found ${properties.length - validProperties.length} invalid properties`);

				// Update the results_count in the database to reflect the actual valid count
				const { error: reUpdateError } = await supabase
					.from('search_history')
					.update({
						results_count: validProperties.length,
						updated_at: new Date().toISOString()
					})
					.eq('id', searchId)
					.eq('user_id', session.user.id);

				if (reUpdateError) {
					console.error('Error updating search results count:', reUpdateError);
				}

				// Update the local object
				if (updatedHistory) {
					updatedHistory.results_count = validProperties.length;
				}
			}

			const { error: insertError } = await supabase.from('search_results').insert({
				search_id: searchId,
				data: validProperties
			});

			if (insertError) {
				console.error(`Error inserting search:`, insertError);
				// Continue with other batches even if one fails
			}

			return json({
				success: true,
				data: updatedHistory,
				savedProperties: validProperties.length
			});
		}

		return json({ success: true, data: updatedHistory });
	} catch (err) {
		console.error('Error processing update:', err);
		return json({ error: 'Server error' }, { status: 500 });
	}
};
