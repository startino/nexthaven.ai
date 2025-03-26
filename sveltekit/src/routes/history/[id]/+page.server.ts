import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { UnifiedProperty } from '$lib/types/unified-property';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { supabase } = locals;
	const { id } = params;

	// Check if the user is authenticated
	const {
		data: { session }
	} = await supabase.auth.getSession();

	// If not authenticated, redirect to login
	if (!session) {
		redirect(303, '/login');
	}

	try {
		// Fetch the specific search history item
		const { data: searchHistory, error: historyError } = await supabase
			.from('search_history')
			.select('*')
			.eq('id', id)
			.eq('user_id', session.user.id)
			.single();

		if (historyError) {
			console.error('Error fetching search history:', historyError);
			error(404, 'Search history not found');
		}

		// Fetch all search results for this search history
		const { data: searchResults, error: resultsError } = await supabase
			.from('search_results')
			.select('*')
			.eq('search_id', id)
			.single();

		if (resultsError) {
			console.error('Error fetching search results:', resultsError);
			// Don't throw an error here, just return empty results
			return {
				searchHistory,
				properties: []
			};
		}

		// Format the search results to match the UnifiedProperty structure used in compare page
		const formattedResults = (searchResults.data as any as UnifiedProperty[]).map(
			(property: UnifiedProperty) => {
				// Return a UnifiedProperty structure that matches what's used in the compare page
				return {
					id: property.id,
					name: property.name || 'Unnamed Property',
					url: property.url || '',
					source: 'Saved Search',
					location: property.location || '',
					description: '',
					pricing: {
						total: property.pricing.total || 0,
						currency: 'USD'
					},
					capacity: {
						bedrooms: property.capacity.bedrooms || 0,
						beds: property.capacity.beds || 0
					},
					features: {
						amenities: Array.isArray(property.features.amenities)
							? property.features.amenities
							: property.features.amenities
								? [property.features.amenities]
								: []
					},
					media: {
						main_image: property.media.main_image || '',
						gallery: Array.isArray(property.media.gallery)
							? property.media.gallery
							: property.media.gallery
								? [property.media.gallery]
								: []
					},
					score: property.score || 0,
					reasoning: property.reasoning || '',
					// Include original data for reference
					original: property
				};
			}
		);

		// Return both the search history and its formatted results
		return {
			searchHistory,
			properties: formattedResults
		};
	} catch (err) {
		console.error('Error loading search history:', err);
		error(500, 'Error loading search history');
	}
};
