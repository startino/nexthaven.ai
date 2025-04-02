import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { checkUserAuthentication } from '$lib/utils/subscription';
import { isAnonymousUser } from '$lib/supabase/auth';
import { checkAnonymousSearchLimit, ANONYMOUS_SEARCH_LIMIT } from '$lib/utils/anonymousSearch';
import type { SubscriptionStatus } from '$lib/utils/subscription';

// Define an interface for the anonymous search info
interface AnonymousSearchInfo {
	isAnonymous: boolean;
	hasReachedLimit: boolean;
	remainingSearches: number;
	searchCount: number;
}

// Define an interface for the return type from this loader
interface SearchPageData {
	popularDestinations: Array<{ name: string; id?: string; image?: string }>;
	subscriptionStatus: SubscriptionStatus;
	anonymousSearchInfo: AnonymousSearchInfo;
	searchId: string | null;
}

export const load: PageServerLoad = async (event): Promise<SearchPageData> => {
	const { locals, url } = event;

	// Check authentication and get subscription status
	const { session, subscriptionStatus } = await checkUserAuthentication(event);

	// Get anonymous status directly from locals (set in the hooks)
	const isAnonymous = locals.isAnonymous || false;

	// Use anonymousSearchInfo from locals if available (set in hooks.server.ts)
	let anonymousSearchInfo: AnonymousSearchInfo = locals.anonymousSearchInfo
		? { isAnonymous, ...locals.anonymousSearchInfo }
		: {
				isAnonymous,
				hasReachedLimit: false,
				remainingSearches: ANONYMOUS_SEARCH_LIMIT,
				searchCount: 0
			};
	console.log('anonymousSearchInfo in +page.server.ts:', anonymousSearchInfo);

	// For anonymous users, make sure we always have correct subscription status
	if (isAnonymous) {
		// Anonymous users always have an active subscription status (with limitations)
		if (!subscriptionStatus || !subscriptionStatus.isActive) {
			// Override the subscription status for anonymous users
			console.log('Overriding subscription status for anonymous user');
			event.locals.subscriptionStatus = {
				isActive: true,
				isAnonymous: true
			};
		}

		// If anonymous user has reached their search limit, redirect to signup page
		if (anonymousSearchInfo.hasReachedLimit) {
			console.log('Anonymous user has reached search limit, redirecting to signup');
			// Save the current URL to redirect back after signup
			redirect(303, `/signup?redirect=${encodeURIComponent(url.pathname + url.search)}`);
		}
	} else {
		// For non-anonymous users, check subscription status normally
		if (!subscriptionStatus || !subscriptionStatus.isActive) {
			// Include the current URL as a redirectTo parameter
			console.log('User has no active subscription, redirecting to subscription page');
			const subscriptionRedirect = `/subscription?redirectTo=${encodeURIComponent(url.pathname + url.search)}`;
			redirect(303, subscriptionRedirect);
		}
	}

	// Get popular destinations (could be from a database or hardcoded)
	const popularDestinations = [
		{ name: 'Kuala Lumpur', image: '/images/destinations/kuala-lumpur.jpg' },
		{ name: 'Bali', image: '/images/destinations/bali.jpg' },
		{ name: 'Da Nang', image: '/images/destinations/da-nang.jpg' },
		{ name: 'Chiang Mai', image: '/images/destinations/chiang-mai.jpg' }
	];

	// Pass search ID from URL if present (e.g., when returning from a failed search)
	const searchId = url.searchParams.get('searchId');

	return {
		popularDestinations,
		subscriptionStatus: event.locals.subscriptionStatus,
		anonymousSearchInfo,
		searchId
	};
};
