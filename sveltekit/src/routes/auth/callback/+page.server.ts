import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { PRIVATE_SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

export const load: PageServerLoad = async ({ url, cookies, fetch, locals }) => {
	// Get the auth code from the URL
	const code = url.searchParams.get('code');

	// Get the redirectTo URL from the query parameters or fallback to home
	const redirectTo = url.searchParams.get('redirectTo') || '/';

	if (code) {
		// Use the Supabase instance from locals that was already initialized in hooks.server.ts
		const { supabase } = locals;

		// Exchange the code for a session
		const { error } = await supabase.auth.exchangeCodeForSession(code);

		if (error) {
			console.error('Error exchanging code for session:', error);
			redirect(303, `/login?error=${encodeURIComponent(error.message)}`);
		}
	}

	// Redirect the user to the intended destination
	redirect(303, redirectTo);
};
