import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PRICING_TIER, stripeService } from '$lib/services/stripe';
import { isAnonymousUser } from '$lib/supabase/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Ensure user is authenticated
	const userSession = await locals.getSession();
	if (!userSession?.user) {
		error(401, 'Unauthorized');
	}

	try {
		const body = await request.json();
		const { priceId, returnUrl, toltReferral, bypassAnonymousCheck } = body;

		// Check if user is anonymous, but allow bypass for specific scenarios
		if (!bypassAnonymousCheck) {
			// Check for conversion metadata first
			const isConverted =
				userSession.user.user_metadata?.converted_at ||
				userSession.user.user_metadata?.is_anonymous === false;

			// Only check if not explicitly converted
			if (!isConverted && isAnonymousUser(userSession.user)) {
				// Log detailed info for debugging
				console.warn('Blocking anonymous subscription attempt:', {
					userId: userSession.user.id,
					email: userSession.user.email,
					metadata: JSON.stringify(userSession.user.user_metadata)
				});

				error(
					403,
					'Anonymous users cannot subscribe to premium plans. Please create a permanent account first.'
				);
			}
		} else {
			console.log('Anonymous check bypassed for user:', userSession.user.id);
		}

		// Validate price ID against the options in PRICING_TIER
		const validPriceIds = PRICING_TIER.options.map((option) => option.id);
		if (!priceId || !validPriceIds.includes(priceId)) {
			error(400, 'Invalid price ID');
		}

		// Use the consolidated stripe service to create the checkout session
		// Pass locals.stripe as the Stripe instance
		const session = await stripeService.createCheckoutSessionServer(
			locals.stripe,
			locals.supabase,
			userSession.user.id,
			priceId,
			returnUrl,
			toltReferral
		);

		// When user initiates checkout, deactivate any active trials immediately
		// This prevents issues in case the webhook fails or is delayed
		try {
			const { error: deactivateError } = await locals.supabase
				.from('user_trials')
				.update({ is_active: false })
				.eq('user_id', userSession.user.id);

			if (deactivateError) {
				console.warn(
					'Warning: Could not deactivate existing trials during checkout:',
					deactivateError
				);
			} else {
				console.log(
					'Successfully deactivated trials for user initiating checkout:',
					userSession.user.id
				);
			}
		} catch (trialError) {
			console.error('Error deactivating trials during checkout:', trialError);
			// Continue anyway - don't fail checkout just because trial deactivation failed
		}

		return json({ url: session.url });
	} catch (err) {
		console.error('Error creating checkout session:', err);
		error(500, 'Failed to create checkout session');
	}
};
