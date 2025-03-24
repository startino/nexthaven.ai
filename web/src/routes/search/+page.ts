import { browser } from '$app/environment';

// This loads initial data needed for the search page
export async function load() {
	// We can fetch initial data here, like popular destinations, etc.
	// For now, we'll just return some sample data

	// Only run on client-side to avoid server-side execution issues
	if (!browser) {
		return {
			popularDestinations: []
		};
	}

	// Sample data for now
	const popularDestinations = [
		{ name: 'Paris, France', id: 'paris' },
		{ name: 'Tokyo, Japan', id: 'tokyo' },
		{ name: 'New York, USA', id: 'new-york' },
		{ name: 'Barcelona, Spain', id: 'barcelona' },
		{ name: 'Sydney, Australia', id: 'sydney' }
	];

	return {
		popularDestinations
	};
}
