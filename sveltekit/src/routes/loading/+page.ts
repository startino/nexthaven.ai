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
			// Check if there's already a search query in the store
			let searchQueryData = getSearchQuery();

			// If not found, redirect back to search
			if (!searchQueryData) {
				// Redirect back to search, we don't have the data we need
				console.log('No search query found in store, redirecting to search');
				goto('/search');
				return {};
			}

			console.log('Search query found:', searchQueryData);

			// Get searchId from URL if present
			const searchId = url.searchParams.get('searchId');

			// Process will be handled by the +page.svelte component
			return {
				success: true,
				message: 'Search query found',
				searchQuery: searchQueryData,
				searchId
			};
		} catch (error) {
			console.error('Error in loading page loader:', error);
			// Redirect back to search on error
			goto('/search');
			return {};
		}
	}

	// Pass any URL parameters to the server component
	const searchId = url.searchParams.get('searchId');

	return {
		success: true,
		searchId
	};
}
