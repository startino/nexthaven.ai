import { requireSubscription } from '$lib/server/subscription';

export const load = async (event) => {
	const { locals } = event;
	const { supabase } = locals;

	// Get the user session
	const session = await locals.getSession();

	// Check subscription status and redirect if not active
	const subscriptionStatus = await requireSubscription(event);

	// Fetch search history for the current user
	const { data: searchHistory, error } = await supabase
		.from('search_history')
		.select('*')
		.eq('user_id', session?.user.id || '')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error fetching search history:', error);
	}

	// Return the search history and subscription status
	return {
		searchHistory: searchHistory || [],
		subscriptionStatus
	};
};
