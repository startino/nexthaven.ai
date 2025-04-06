import { popularDestinations } from './searchData';
import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import type { AnonymousSearchInfo } from './types';
import { ANONYMOUS_SEARCH_LIMIT } from '$lib/utils/anonymousSearch';
import { ensureCompleteAnonymousSearchInfo } from './anonymousSearch';
import posthog from 'posthog-js';

// This loads initial data needed for the search page
export const load: PageLoad = async ({ parent, url }) => {
	const parentData = await parent();
	const { subscriptionStatus, session, supabase, anonymousSearchInfo, isAnonymous } = parentData;

	// Log what we received from the parent load
	console.log('search/+page.ts received parent data:', {
		hasAnonymousSearchInfo: !!anonymousSearchInfo,
		isAnonymous: isAnonymous,
		session: !!session
	});



	// Get search ID from URL if present
	const searchId = url.searchParams.get('searchId');

	// Log what we're receiving and passing to the component
	console.log('search/+page.ts received anonymousSearchInfo:', anonymousSearchInfo);

	// Use our utility to ensure we have a complete anonymousSearchInfo object
	const searchInfo = ensureCompleteAnonymousSearchInfo(anonymousSearchInfo, isAnonymous);

	// Log what we're returning to the component
	console.log('search/+page.ts returning searchInfo:', searchInfo);

	// Only run on client-side to avoid server-side execution issues
	if (!browser) {
		return {
			popularDestinations,
			subscriptionStatus,
			session,
			supabase,
			searchId,
			anonymousSearchInfo: searchInfo
		};
	}

	return {
		popularDestinations,
		subscriptionStatus,
		session,
		supabase,
		searchId,
		anonymousSearchInfo: searchInfo
	};
};
