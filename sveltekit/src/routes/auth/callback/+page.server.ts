import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { PRIVATE_SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { activateFreeTrial } from '$lib/utils/subscription';

export const load: PageServerLoad = async ({ url, cookies, fetch, locals }) => {
	// Get the auth code from the URL
	const code = url.searchParams.get('code');

	// Get the redirectTo URL from the query parameters or fallback to home
	const redirectTo = url.searchParams.get('redirectTo') || '/';

	// Get the provider from the URL (added by Supabase OAuth)
	const provider = url.searchParams.get('provider');

	if (code) {
		// Use the Supabase instance from locals that was already initialized in hooks.server.ts
		const { supabase } = locals;

		// Exchange the code for a session
		const { data, error } = await supabase.auth.exchangeCodeForSession(code);

		if (error) {
			console.error('Error exchanging code for session:', error);
			redirect(303, `/login?error=${encodeURIComponent(error.message)}`);
		}

		// If we successfully got a session and the provider is Google
		if (data?.session && provider === 'google') {
			const userId = data.session.user.id;

			// Check if this is a new user (first sign in) by looking for trial records and auth metadata
			const { data: existingUserData, error: userError } = await supabase
				.from('user_trials')
				.select('user_id')
				.eq('user_id', userId);

			// If no trial records exist, this is likely a new user
			if (!userError && (!existingUserData || existingUserData.length === 0)) {
				console.log('New Google sign-in detected, activating 14-day trial for user:', userId);

				// Activate 14-day free trial (true for skipAnonymousCheck because we know it's a Google login)
				const trialActivated = await activateFreeTrial(supabase, userId, 14, true);

				if (trialActivated) {
					console.log('Successfully activated 14-day trial for new Google user:', userId);
				} else {
					console.error('Failed to activate trial for Google user:', userId);
				}
			} else {
				console.log('Existing user detected, not activating trial', userId);
			}
		}
	}

	// Redirect the user to the intended destination
	redirect(303, redirectTo);
};
