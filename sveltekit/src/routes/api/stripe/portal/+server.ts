import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripeService } from '$lib/services/stripe';
import { isAnonymousUser } from '$lib/supabase/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Ensure user is authenticated
	const userSession = await locals.getSession();
	if (!userSession?.user) {
		error(401, 'Unauthorized');
	}

	// Check if user is anonymous
	if (isAnonymousUser(userSession.user)) {
		error(
			403,
			'Anonymous users cannot manage subscription plans. Please create a permanent account first.'
		);
	}

	try {
		const body = await request.json();
		const { returnUrl } = body;

		// Check if user is in a trial by querying our user_trials table
		const { data: trialData, error: trialError } = await locals.supabase
			.from('user_trials')
			.select('*')
			.eq('user_id', userSession.user.id)
			.eq('is_active', true)
			.single();

		// If user is in a trial, don't use the portal - redirect to checkout directly
		if (!trialError && trialData) {
			// For users in a trial, direct them to the subscription page instead of the portal
			const baseUrl = process.env.PUBLIC_SITE_URL || 'http://localhost:5173';
			return json({ url: `${baseUrl}/subscription` });
		}

		// Deactivate any active trials when user accesses the portal
		// Users might upgrade directly from the portal, bypassing our checkout
		try {
			const { error: deactivateError } = await locals.supabase
				.from('user_trials')
				.update({ is_active: false })
				.eq('user_id', userSession.user.id);

			if (deactivateError) {
				console.warn(
					'Warning: Could not deactivate existing trials when accessing portal:',
					deactivateError
				);
			} else {
				console.log(
					'Successfully deactivated trials for user accessing portal:',
					userSession.user.id
				);
			}
		} catch (trialError) {
			console.error('Error deactivating trials when accessing portal:', trialError);
			// Continue anyway - don't fail portal access just because trial deactivation failed
		}

		// Use the consolidated stripe service to create the portal session
		// Pass locals.stripe as the Stripe instance
		const session = await stripeService.createCustomerPortalSessionServer(
			locals.stripe,
			locals.supabase,
			userSession.user.id,
			returnUrl
		);

		return json({ url: session.url });
	} catch (err) {
		console.error('Error creating portal session:', err);
		error(500, 'Failed to create portal session');
	}
};
