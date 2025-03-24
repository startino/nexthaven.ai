import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { propertyStore, setSearchQuery } from '$lib/stores/properties.svelte';
import { get } from 'svelte/store';
import { getSearchQuery } from '$lib/stores/properties.svelte';

// This function handles both server-side and client-side loading
export async function load({ url }) {
	// Only run on the client side
	if (browser) {
		try {
			// First check if there's already a search query in the store
			let searchQueryData = getSearchQuery();

			// If not, check URL parameters
			if (!searchQueryData) {
				// Redirect back to search, we don't have the data we need
				console.log('No search query found in store or URL, redirecting to search');
				goto('/search');
				return {};
			}

			console.log('Search query found:', searchQueryData);

			// Process will be handled by the +page.svelte component
			return {
				success: true,
				message: 'Search query found'
			};
		} catch (error) {
			console.error('Error in loading page loader:', error);
			// Redirect back to search on error
			goto('/search');
			return {};
		}
	}

	return {
		success: true
	};
}
