import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	try {
		// Tell SvelteKit this data depends on subscription status
		depends('subscription:status');
		depends('supabase:auth');

		// Get data from locals (already processed in hooks.server.ts)
		const {
			session,
			subscriptionStatus,
			isTrialEligible,
			isAnonymous,
			hasExpiredTrial,
			anonymousSearchInfo
		} = locals;

		// Log what we're sending to the client
		console.log('layout.server.ts anonymousSearchInfo:', anonymousSearchInfo);

		return {
			session,
			subscriptionStatus,
			isTrialEligible,
			isAnonymous,
			hasExpiredTrial,
			anonymousSearchInfo
			// Don't return the supabase client as it's not serializable
		};
	} catch (error) {
		console.error('Error in layout.server.ts:', error);
		return {
			session: null,
			subscriptionStatus: { isActive: false },
			isTrialEligible: false,
			isAnonymous: false,
			hasExpiredTrial: false,
			anonymousSearchInfo: null
			// Don't return the supabase client as it's not serializable
		};
	}
};
