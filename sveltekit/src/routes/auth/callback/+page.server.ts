import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { PRIVATE_SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { activateFreeTrial } from '$lib/utils/subscription';
import { isAnonymousUser } from '$lib/supabase/auth';

export const load: PageServerLoad = async ({ url, cookies, fetch, locals }) => {
	// Get the auth code from the URL
	const code = url.searchParams.get('code');

	// Get the redirectTo URL from the query parameters or fallback to home
	const redirectTo = url.searchParams.get('redirectTo') || '/';

	// Get the provider from the URL (added by Supabase OAuth)
	const provider = url.searchParams.get('provider');

	// Check if this is an upgrade from anonymous account
	const isUpgrade = url.searchParams.get('upgrade') === 'true';
	const anonymousId = url.searchParams.get('anonymousId');

	if (code) {
		// Use the Supabase instance from locals that was already initialized in hooks.server.ts
		const { supabase } = locals;

		// Exchange the code for a session
		const { data, error } = await supabase.auth.exchangeCodeForSession(code);

		if (error) {
			console.error('Error exchanging code for session:', error);
			redirect(303, `/login?error=${encodeURIComponent(error.message)}`);
		}

		// If we successfully got a session
		if (data?.session) {
			const userId = data.session.user.id;

			// Handle anonymous account upgrade via Google OAuth
			if (isUpgrade && anonymousId && provider === 'google') {
				console.log(
					`Processing anonymous account upgrade: anonymousId=${anonymousId}, newUserId=${userId}`
				);

				// IMPORTANT: Need to handle data migration from anonymous user to the new authenticated user
				// This involves:
				// 1. Check if the anonymous ID is actually anonymous
				// 2. Update records in various tables to point to the new user ID
				// 3. Mark the anonymous account as converted
				// 4. Activate the free trial for the new account

				try {
					// First verify the anonymous ID corresponds to an actual anonymous user
					const { data: anonUserData, error: anonUserError } =
						await supabase.auth.admin.getUserById(anonymousId);

					if (anonUserError) {
						console.error('Error fetching anonymous user:', anonUserError);
					} else if (anonUserData?.user && isAnonymousUser(anonUserData.user)) {
						console.log('Confirmed anonymous user, proceeding with upgrade');

						// Migrate user data - this will vary based on your data model
						// The following tables might need migration:

						// 1. Update search_history records
						try {
							const { error: searchError } = await supabase
								.from('search_history')
								.update({ user_id: userId })
								.eq('user_id', anonymousId);

							if (searchError) {
								console.error('Error migrating search history:', searchError);
							} else {
								console.log('Successfully migrated search history to new user');
							}
						} catch (err) {
							console.error('Exception during search history migration:', err);
						}

						// 2. Update property_collections records
						try {
							const { error: collectionsError } = await supabase
								.from('property_collections')
								.update({ user_id: userId })
								.eq('user_id', anonymousId);

							if (collectionsError) {
								console.error('Error migrating property collections:', collectionsError);
							} else {
								console.log('Successfully migrated property collections to new user');
							}
						} catch (err) {
							console.error('Exception during property collections migration:', err);
						}

						// Note: search_results doesn't have a direct user_id field, it's linked to search_history
						// The search_history migration above will effectively link search_results to the new user

						// 3. Clean up anonymous_search_limits
						try {
							const { error: limitsError } = await supabase
								.from('anonymous_search_limits')
								.delete()
								.eq('user_id', anonymousId);

							if (limitsError) {
								console.error('Error removing anonymous search limits:', limitsError);
							} else {
								console.log('Successfully removed anonymous search limits');
							}
						} catch (err) {
							console.error('Exception during anonymous search limits removal:', err);
						}

						// Mark the anonymous account as converted by updating its metadata
						try {
							const { error: updateError } = await supabase.auth.admin.updateUserById(anonymousId, {
								user_metadata: {
									is_anonymous: false,
									converted_at: new Date().toISOString(),
									converted_to: userId
								}
							});

							if (updateError) {
								console.error('Error updating anonymous user metadata:', updateError);
							} else {
								console.log('Successfully marked anonymous account as converted');
							}
						} catch (err) {
							console.error('Exception during anonymous account metadata update:', err);
						}

						// Now activate the free trial for the upgraded user
						console.log('Activating 14-day free trial for upgraded Google user');
						const trialActivated = await activateFreeTrial(supabase, userId, 14, true);

						if (trialActivated) {
							console.log('Successfully activated 14-day trial for upgraded Google user');
						} else {
							console.error('Failed to activate trial for upgraded Google user');
						}
					} else {
						console.warn(
							'Anonymous ID provided is not an anonymous user, skipping upgrade process'
						);
					}
				} catch (err) {
					console.error('Exception during account upgrade process:', err);
				}
			}
			// Handle regular new Google sign-up (not an upgrade)
			else if (provider === 'google' && !isUpgrade) {
				// Check if this is a new user by looking for trial records
				const { data: existingUserData, error: userError } = await supabase
					.from('user_trials')
					.select('user_id')
					.eq('user_id', userId);

				// If no trial records exist, this is likely a new user
				if (!userError && (!existingUserData || existingUserData.length === 0)) {
					console.log('New Google sign-in detected, activating 14-day trial for user:', userId);

					// Activate 14-day free trial
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
	}

	// Redirect the user to the intended destination
	redirect(303, redirectTo);
};
