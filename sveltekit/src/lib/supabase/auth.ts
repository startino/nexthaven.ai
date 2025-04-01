import { redirect } from '@sveltejs/kit';
import { createSupabaseBrowserClient } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { activateFreeTrial } from '$lib/utils/subscription';

/**
 * Signs in anonymously and creates a trial period
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

		// Update the user metadata to explicitly mark as anonymous
		if (data.user) {
			// Set user metadata to mark as anonymous
			await supabase.auth.updateUser({
				data: {
					is_anonymous: true,
					provider: 'anonymous',
					created_at: new Date().toISOString()
				}
			});

			// Activate trial for anonymous user
			const trialActivated = await activateFreeTrial(supabase, data.user.id);

			if (!trialActivated) {
				console.error('Failed to activate trial for anonymous user');
			}
		}

		return {
			user: data.user,
			session: data.session,
			error: null,
			isAnonymous: true
		};
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

	// Debug info
	console.log('isAnonymousUser check:', {
		email: user.email,
		userMetadata: user.user_metadata,
		appMetadata: user.app_metadata
	});

	// 1. Check user metadata first (most reliable)
	if (user.user_metadata) {
		if (user.user_metadata.is_anonymous === true) return true;
		if (user.user_metadata.provider === 'anonymous') return true;
		if (user.user_metadata.anonymous === true) return true;
	}

	// 2. Check app_metadata as fallback
	if (user.app_metadata) {
		if (user.app_metadata.is_anonymous === true) return true;
		if (user.app_metadata.provider === 'anonymous') return true;
		if (user.app_metadata.anonymous === true) return true;
	}

	// 3. Fallback check for email pattern if needed
	if (user.email) {
		// Various patterns for anonymous emails
		if (user.email.endsWith('@anonymous.user')) return true;
		if (user.email.includes('anon-')) return true;
		if (user.email.includes('anonymous')) return true;
		if (user.email.startsWith('anon')) return true;
		if (user.email.startsWith('temp-')) return true;
		if (user.email.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}@/))
			return true;
	} else {
		// No email could indicate anonymous user
		return true;
	}

	// 4. Check for specific claims or properties that might indicate anonymous
	const hasNoProviders = !(user.app_metadata?.providers?.length > 0);
	const hasTemporaryFeatures = user.app_metadata?.is_trial_user === true;

	if (hasNoProviders && hasTemporaryFeatures) {
		return true;
	}

	return false;
}

/**
 * Converts an anonymous account to a permanent account
 * Uses updateUser to link an email/password to the anonymous account
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

		// Update user email and metadata
		const { error: updateError } = await supabase.auth.updateUser({
			email,
			data: {
				name,
				is_anonymous: false,
				converted_at: new Date().toISOString()
			}
		});

		if (updateError) {
			return { success: false, error: updateError };
		}

		// Once email is verified, update password
		// Note: The user will receive an email verification link
		// They'll need to verify before the password can be set

		return {
			success: true,
			error: null,
			message: 'Please check your email to verify your account, then you can set your password'
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error : new Error('Unknown error')
		};
	}
}
