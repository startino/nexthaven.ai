import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	// Get parent data which includes the session
	const { session } = await parent();

	// If user is already logged in, redirect to home
	if (session) {
		return {
			redirect: '/'
		};
	}

	return {};
};
