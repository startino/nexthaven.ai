import type { LayoutServerLoad } from './$types';
import { checkSubscriptionStatus } from '$lib/server/subscription';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	try {
		// Tell SvelteKit this data depends on subscription status
		depends('subscription:status');

		const session = await locals.getSession();

		// Check subscription status if user is logged in
		let subscriptionStatus = null;
		if (session?.user) {
			subscriptionStatus = await checkSubscriptionStatus(locals.supabase, session.user.id);
			console.log('subscriptionStatus', subscriptionStatus);
		}

		return {
			session,
			subscriptionStatus
		};
	} catch (error) {
		console.error('Error in layout.server.ts:', error);
		return {
			session: null,
			subscriptionStatus: null
		};
	}
};
