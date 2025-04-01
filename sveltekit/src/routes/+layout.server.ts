import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	try {
		// Tell SvelteKit this data depends on subscription status
		depends('subscription:status');
		depends('supabase:auth');

		// Get data from locals (already processed in hooks.server.ts)
		const { session, subscriptionStatus, isTrialEligible, isAnonymous, hasExpiredTrial } = locals;

		return {
			session,
			subscriptionStatus,
			isTrialEligible,
			isAnonymous,
			hasExpiredTrial
			// Don't return the supabase client as it's not serializable
		};
	} catch (error) {
		console.error('Error in layout.server.ts:', error);
		return {
			session: null,
			subscriptionStatus: { isActive: false },
			isTrialEligible: false,
			isAnonymous: false,
			hasExpiredTrial: false
			// Don't return the supabase client as it's not serializable
		};
	}
};
