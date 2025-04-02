import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	// Get parent data which includes the session
	const { session } = await parent();

	// If not logged in, redirect to login
	if (!session) {
		redirect(303, '/auth/login');
	}

	return {
		session
	};
};
