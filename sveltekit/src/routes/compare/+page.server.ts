import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const { supabase } = locals;

	// Get the searchId from URL parameters
	const searchId = url.searchParams.get('searchId');

	// Pass the searchId to the client
	return {
		searchId
	};
};
