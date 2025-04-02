import { redirect } from '@sveltejs/kit';
import { createSupabaseBrowserClient } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { activateFreeTrial } from '$lib/utils/subscription';
import { resetAnonymousSearchCount } from '$lib/utils/anonymousSearch';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';

/**
 * Signs in anonymously without creating a trial period
 */
export async function signInAnonymously() {
	const supabase = createSupabaseBrowserClient();

	try {
		// Use Supabase's signInAnonymously method
		const { data, error } = await supabase.auth.signInAnonymously();

		if (error) {
			console.error('Error signing in anonymously:', error);
			return { user: null, session: null, error };
		}

		// Return the session immediately so UI can show loading
		const result = {
			user: data.user,
			session: data.session,
			error: null,
			isAnonymous: true
		};

		// Update the user metadata in the background
		if (data.user) {
			// Don't await this - we want to return immediately
			supabase.auth
				.updateUser({
					data: {
						is_anonymous: true,
						provider: 'anonymous',
						created_at: new Date().toISOString()
					}
				})
				.then(() => {
					console.log('Updated anonymous user metadata');
				})
				.catch((err) => {
					console.error('Error updating anonymous user metadata:', err);
				});

			// Initialize anonymous_search_limits record for this user
			// Use the Supabase client directly in a separate async function
			try {
				// Check if a record already exists
				const { data: existingRecord, error: checkError } = await supabase
					.from('anonymous_search_limits')
					.select('user_id')
					.eq('user_id', data.user.id)
					.maybeSingle();

				// Only create a new record if one doesn't exist
				if (!existingRecord) {
					console.log('No anonymous_search_limits record found, creating one');

					const { error: insertError } = await supabase.from('anonymous_search_limits').insert({
						user_id: data.user.id,
						search_count: 0,
						last_search_at: new Date().toISOString()
					});

					if (insertError) {
						console.error('Error creating anonymous search limits record:', insertError);
					} else {
						console.log('Created anonymous search limits record for new user:', data.user.id);
					}
				} else {
					console.log('Existing anonymous_search_limits record found, no need to create');
				}
			} catch (insertErr) {
				console.error('Exception creating anonymous search limits record:', insertErr);
			}
		}

		return result;
	} catch (error) {
		console.error('Unexpected error during anonymous sign in:', error);
		return {
			user: null,
			session: null,
			error: error instanceof Error ? error : new Error('Unknown error'),
			isAnonymous: false
		};
	}
}

/**
 * Checks if a user is anonymous
 * Uses multiple indicators: metadata, email patterns, provider info, etc.
 */
export function isAnonymousUser(
	user: { email?: string | null; user_metadata?: any; app_metadata?: any } | null | undefined
): boolean {
	if (!user) return false;

	// Enhanced debugging - log all details
	console.log('DETAILED isAnonymousUser check:', {
		email: user.email,
		userMetadata: JSON.stringify(user.user_metadata),
		appMetadata: JSON.stringify(user.app_metadata)
	});

	// First check explicit non-anonymous indicators (converted accounts) - these take priority
	if (user.user_metadata) {
		// If user has explicitly been converted, they are NOT anonymous
		if (user.user_metadata.converted_at) {
			console.log('User identified as NON-anonymous due to conversion timestamp');
			return false;
		}

		// Check for explicit non-anonymous flag
		if (user.user_metadata.is_anonymous === false) {
			console.log('User explicitly marked as NON-anonymous in user_metadata');
			return false;
		}
	}

	// 1. Check user metadata for anonymous indicators
	if (user.user_metadata) {
		if (user.user_metadata.is_anonymous === true) {
			console.log('User identified as anonymous via user_metadata.is_anonymous');
			return true;
		}
		if (user.user_metadata.provider === 'anonymous') {
			console.log('User identified as anonymous via user_metadata.provider');
			return true;
		}
		if (user.user_metadata.anonymous === true) {
			console.log('User identified as anonymous via user_metadata.anonymous');
			return true;
		}
	}

	// 2. Check app_metadata as fallback
	if (user.app_metadata) {
		// Check for explicit non-anonymous flag first
		if (user.app_metadata.is_anonymous === false) {
			console.log('User explicitly marked as NON-anonymous in app_metadata');
			return false;
		}

		if (user.app_metadata.is_anonymous === true) {
			console.log('User identified as anonymous via app_metadata.is_anonymous');
			return true;
		}
		if (user.app_metadata.provider === 'anonymous') {
			console.log('User identified as anonymous via app_metadata.provider');
			return true;
		}
		if (user.app_metadata.anonymous === true) {
			console.log('User identified as anonymous via app_metadata.anonymous');
			return true;
		}
	}

	// 3. Fallback check for email pattern if needed
	if (user.email) {
		// Various patterns for anonymous emails - be more specific
		if (user.email.endsWith('@anonymous.user')) {
			console.log('User identified as anonymous via email ending with @anonymous.user');
			return true;
		}
		// Only check for explicit anonymous patterns
		if (user.email.startsWith('anon-')) {
			console.log('User identified as anonymous via email starting with anon-');
			return true;
		}
		if (user.email.startsWith('anonymous-')) {
			console.log('User identified as anonymous via email starting with anonymous-');
			return true;
		}
		if (user.email.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}@/)) {
			console.log('User identified as anonymous via UUID email pattern');
			return true;
		}
		// Remove overly broad checks that might catch regular emails
		// - Removed: email.includes('anonymous')
		// - Removed: email.startsWith('anon')
		// - Removed: email.startsWith('temp-')

		// If we have an email and we got here, this is likely not anonymous
		console.log('User has email and did not match anonymous patterns:', user.email);
	} else {
		// No email could indicate anonymous user
		console.log('User identified as anonymous due to missing email');
		return true;
	}

	// 4. Check for specific claims or properties that might indicate anonymous
	const hasNoProviders = !(user.app_metadata?.providers?.length > 0);
	const hasTemporaryFeatures = user.app_metadata?.is_trial_user === true;

	if (hasNoProviders && hasTemporaryFeatures) {
		console.log('User identified as anonymous due to no providers + temporary features');
		return true;
	}

	console.log('User determined to be NON-anonymous');
	return false;
}

/**
 * Converts an anonymous account to a permanent account
 * Uses updateUser to link an email/password to the anonymous account
 * Also activates a free trial for the newly converted user
 */
export async function convertAnonymousUser(
	supabase: SupabaseClient,
	email: string,
	password: string,
	name: string
) {
	try {
		// Get current session
		const {
			data: { session }
		} = await supabase.auth.getSession();

		if (!session || !session.user) {
			return {
				success: false,
				error: new Error('No authenticated user found')
			};
		}

		// Check if current user is anonymous
		if (!isAnonymousUser(session.user)) {
			return {
				success: false,
				error: new Error('User is not anonymous, cannot convert')
			};
		}

		// Update user email, password, and metadata
		const { error: updateError, data } = await supabase.auth.updateUser({
			email,
			password,
			data: {
				name,
				is_anonymous: false,
				converted_at: new Date().toISOString()
			}
		});

		if (updateError) {
			return { success: false, error: updateError };
		}

		// Verify metadata update was successful
		if (!data.user.user_metadata?.is_anonymous === false) {
			console.warn(
				'Warning: is_anonymous flag may not have been properly set to false. Trying again.',
				data.user.user_metadata
			);

			// Make a separate metadata-only update to ensure the flag is set
			const { error: metadataError } = await supabase.auth.updateUser({
				data: {
					is_anonymous: false,
					converted_at: new Date().toISOString(),
					name: name || data.user.user_metadata?.name
				}
			});

			if (metadataError) {
				console.error('Error updating user metadata:', metadataError);
				// Continue anyway - user conversion is more important than metadata updates
			}
		}

		// Reset anonymous search count (remove limits)
		try {
			await resetAnonymousSearchCount(supabase, session.user.id);
		} catch (resetError) {
			console.error('Error resetting anonymous search count:', resetError);
			// Continue anyway - conversion is more important than resetting counts
		}

		// Deactivate any existing trials first
		try {
			const { error: deactivateError } = await supabase
				.from('user_trials')
				.update({ is_active: false })
				.eq('user_id', session.user.id);

			if (deactivateError) {
				console.warn('Warning: Could not deactivate existing trials:', deactivateError);
			} else {
				console.log('Successfully deactivated existing trials for user:', session.user.id);
			}
		} catch (deactivateError) {
			console.error('Error deactivating existing trials:', deactivateError);
			// Continue anyway - don't fail conversion just because trial deactivation failed
		}

		// Activate a free trial for the converted user
		try {
			const trialActivated = await activateFreeTrial(supabase, session.user.id, 14, true);
			if (!trialActivated) {
				console.error('Warning: Failed to activate trial for converted user');
				// Continue anyway - user conversion is more important than trial activation
			}
		} catch (trialError) {
			console.error('Error activating trial after conversion:', trialError);
			// Continue - don't fail conversion just because trial activation failed
		}

		// Note: The user will receive an email verification link
		// They'll need to verify their email to complete the account setup

		return {
			success: true,
			error: null,
			message: 'Please check your email to verify your account'
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error : new Error('Unknown error')
		};
	}
}
