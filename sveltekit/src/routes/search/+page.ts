import { popularDestinations } from './searchData';
import { browser } from '$app/environment';
import type { PageLoad } from './$types';

// This loads initial data needed for the search page
export const load: PageLoad = async ({ parent, url }) => {
	const { subscriptionStatus, session, supabase } = await parent();

	// Get search ID from URL if present
	const searchId = url.searchParams.get('searchId');

	// Only run on client-side to avoid server-side execution issues
	if (!browser) {
		return {
			popularDestinations,
			subscriptionStatus,
			session,
			supabase,
			searchId
		};
	}

	// Sample data for now
	const sampleData = [
		{ name: 'Paris, France', id: 'paris' },
		{ name: 'Tokyo, Japan', id: 'tokyo' },
		{ name: 'New York, USA', id: 'new-york' },
		{ name: 'Barcelona, Spain', id: 'barcelona' },
		{ name: 'Sydney, Australia', id: 'sydney' }
	];

	return {
		popularDestinations,
		subscriptionStatus,
		session,
		supabase,
		searchId
	};
};
