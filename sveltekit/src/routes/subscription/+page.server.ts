import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
	const session = await locals.getSession();

	// Redirect to login if not authenticated
	if (!session?.user) {
		redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	let isTrialEligible = false;

	try {
		// Dynamically import the server module
		const { checkSubscriptionStatus, isEligibleForTrial } = await import(
			'$lib/server/subscription'
		);

		// Check if user is eligible for a trial
		isTrialEligible = await isEligibleForTrial(locals.supabase, session.user.id);

		// Get subscription status including both Stripe subscriptions and our trial system
		const subscriptionStatus = await checkSubscriptionStatus(locals.supabase, session.user.id);

		return {
			subscriptionStatus,
			isTrialEligible
		};
	} catch (error) {
		console.error('Error fetching subscription status:', error);
		return {
			subscriptionStatus: { isActive: false },
			isTrialEligible
		};
	}
}) satisfies PageServerLoad;
