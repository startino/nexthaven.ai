import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isAnonymousUser } from '$lib/supabase/auth';
import { checkSubscriptionStatus, isEligibleForTrial } from '$lib/server/subscription';
/**
 * Helper function to verify user status directly from the auth API
 */
async function verifyUserStatus(supabase: SupabaseClient, userId: string) {
	console.log('Verifying user status for:', userId);

	try {
		let metadata = null;
		let isAnonymous = false;

		// Try admin API first (may not be available in all environments)
		try {
			const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

			if (!userError && userData?.user) {
				// Get metadata directly from the user object
				metadata = userData.user.user_metadata || {};
				console.log('User metadata from Admin API:', JSON.stringify(metadata));

				// Check for conversion indicators
				const wasConverted = metadata.is_anonymous === false && metadata.converted_at;
				isAnonymous =
					!wasConverted && (metadata.is_anonymous === true || metadata.provider === 'anonymous');

				return {
					verified: true,
					isAnonymous,
					metadata
				};
			}
		} catch (adminApiError) {
			console.log('Admin API not available, falling back to session data:', adminApiError);
		}

		// Fallback: Check the current session metadata
		const {
			data: { session }
		} = await supabase.auth.getSession();
		if (session?.user && session.user.id === userId) {
			metadata = session.user.user_metadata || {};
			console.log('User metadata from Session:', JSON.stringify(metadata));

			// Check for conversion indicators
			const wasConverted = metadata.is_anonymous === false && metadata.converted_at;
			isAnonymous =
				!wasConverted && (metadata.is_anonymous === true || metadata.provider === 'anonymous');

			return {
				verified: true,
				isAnonymous,
				metadata
			};
		}

		// Could not verify status
		return { verified: false, isAnonymous: true };
	} catch (error) {
		console.error('Unexpected error in verifyUserStatus:', error);
		return { verified: false, isAnonymous: true };
	}
}

export const load = async ({ locals, url }) => {
	const session = await locals.getSession();

	// Redirect to login if not authenticated
	if (!session?.user) {
		redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	// Get existing anonymous flag from hooks
	let isAnonymous = locals.isAnonymous || false;

	console.log('Initial isAnonymous value from locals:', isAnonymous);

	// Double-check anonymous status directly from the database
	const verifiedStatus = await verifyUserStatus(locals.supabase, session.user.id);
	if (verifiedStatus.verified) {
		// Override isAnonymous with verified value from database
		if (isAnonymous !== verifiedStatus.isAnonymous) {
			console.log(
				'Correcting isAnonymous status based on database check:',
				`was ${isAnonymous}, now ${verifiedStatus.isAnonymous}`
			);
			isAnonymous = verifiedStatus.isAnonymous;
		}
	}

	// Anonymous users are never eligible for trials
	let isTrialEligible = false;

	try {
		// Check trial eligibility only for non-anonymous users
		if (!isAnonymous) {
			isTrialEligible = await isEligibleForTrial(locals.supabase, session.user.id);
		} else {
			console.log('Skipping trial eligibility check for anonymous user:', session.user.id);
		}

		// Get subscription status including both Stripe subscriptions and our trial system
		const subscriptionStatus = await checkSubscriptionStatus(
			locals.supabase,
			session.user.id,
			locals.stripe
		);

		// Set the isAnonymous flag in the subscription status
		subscriptionStatus.isAnonymous = isAnonymous;

		return {
			subscriptionStatus,
			isTrialEligible,
			isAnonymous
		};
	} catch (error) {
		console.error('Error fetching subscription status:', error);
		return {
			subscriptionStatus: { isActive: false, isAnonymous },
			isTrialEligible,
			isAnonymous
		};
	}
};
