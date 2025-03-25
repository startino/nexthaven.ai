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

	// Return empty object if authenticated
	return {
		session
	};
};
