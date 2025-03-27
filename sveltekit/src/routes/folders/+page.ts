import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	// Redirect to the collections route
	redirect(301, '/collections');
};
