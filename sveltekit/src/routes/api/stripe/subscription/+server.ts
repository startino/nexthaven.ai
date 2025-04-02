import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripeService } from '$lib/services/stripe';

export const GET: RequestHandler = async ({ locals }) => {
	// Ensure user is authenticated
	const userSession = await locals.getSession();
	if (!userSession?.user) {
		error(401, 'Unauthorized');
	}

	try {
		// Use the consolidated stripe service for checking subscription status
		// Pass locals.stripe as the Stripe instance
		const subscriptionStatus = await stripeService.getSubscriptionStatusServer(
			locals.stripe,
			locals.supabase,
			userSession.user.id
		);

		// Also check for trial status from the subscription module
		const { checkSubscriptionStatus } = await import('$lib/server/subscription');
		const fullStatus = await checkSubscriptionStatus(
			locals.supabase,
			userSession.user.id,
			locals.stripe
		);

		// Combine subscription data with trial data
		return json({
			...subscriptionStatus,
			isInTrial: fullStatus.isInTrial || false,
			trialEnd: fullStatus.trialEnd
		});
	} catch (err) {
		console.error('Error fetching subscription status:', err);
		error(500, 'Failed to fetch subscription status');
	}
};
