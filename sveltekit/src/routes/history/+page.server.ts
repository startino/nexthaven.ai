import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	// Check if the user is authenticated
	const {
		data: { session }
	} = await supabase.auth.getSession();

	// If not authenticated, redirect to login
	if (!session) {
		redirect(303, '/login');
	}

	// Fetch search history for the current user
	const { data: searchHistory, error } = await supabase
		.from('search_history')
		.select('*')
		.eq('user_id', session.user.id)
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error fetching search history:', error);
	}

	// Return the search history
	return {
		searchHistory: searchHistory || []
	};
};
