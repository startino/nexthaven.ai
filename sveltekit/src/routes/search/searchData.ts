import { goto } from '$app/navigation';
import { setSearchQuery } from '$lib/stores/properties.svelte';

// Predefined data
export const popularDestinations = ['Kuala Lumpur', 'Bali', 'Da Nang'];
export const roomOptions = [1, 2, 3, 4];
export const propertyTypes = [
	'House',
	'Apartment',
	'Villa',
	'Boutique Hotel',
	'Cabin',
	'Treehouse',
	'Boat',
	'Farm Stay'
];
export const amenities = [
	'Pool',
	'Hot Tub',
	'Gym',
	'Parking',
	'Wifi',
	'Kitchen',
	'Air Conditioning',
	'Washer'
];

// Interface for search query
export interface SearchQueryData {
	query: string;
	date: string;
	budget: {
		min: number;
		max: number;
	};
	adults: number;
	children: number;
	number_of_rooms: number;
	preferences: string;
	property_type: string | null;
	amenities: string[];
	property_preferences: Record<string, 'weak' | 'mid' | 'strong'>;
}

// Prepare search query from form data
export function prepareSearchQuery({
	destination,
	dateRange,
	budget,
	selectedRooms,
	preferences,
	selectedPropertyType,
	selectedAmenities,
	preferenceStrength
}: {
	destination: string;
	dateRange: string;
	budget: string;
	selectedRooms: number;
	preferences: string;
	selectedPropertyType: string | null;
	selectedAmenities: string[];
	preferenceStrength: Record<string, 'weak' | 'mid' | 'strong'>;
}): string {
	const searchQuery: SearchQueryData = {
		query: destination,
		date: dateRange,
		budget: {
			min: parseInt(budget) || 200,
			max: parseInt(budget) * 1.5 || 600
		},
		adults: 2,
		children: 0,
		number_of_rooms: selectedRooms,
		preferences: preferences,
		property_type: selectedPropertyType,
		amenities: selectedAmenities,
		property_preferences: preferenceStrength
	};

	return JSON.stringify(searchQuery);
}

// Save search to Supabase and navigate to results
export async function saveSearchToSupabaseAndNavigate(
	searchQueryJson: string
): Promise<{ success: boolean; limitReached?: boolean; message?: string }> {
	try {
		// Use the API endpoint instead of form action
		const response = await fetch('/search', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				searchQuery: searchQueryJson
			})
		});

		const result = await response.json();
		console.log('saveSearch result:', result);

		if (!response.ok) {
			console.error('Error saving search to Supabase:', result.message);

			// Check if this is due to anonymous search limit
			if (response.status === 403 && result.limitReached) {
				return {
					success: false,
					limitReached: true,
					message:
						result.message ||
						'Anonymous users are limited to 1 search. Please create an account to continue.'
				};
			}

			return { success: false, message: result.message };
		} else if (result.searchId) {
			// Store the search ID for updating with results later
			console.log('Search saved with ID:', result.searchId);

			// After saving to Supabase, navigate using goto which preserves state better

			return { success: true };
		}

		return { success: false, message: 'No search ID returned' };
	} catch (error) {
		console.error('Error calling search API:', error);
		// Still attempt to navigate even if the save fails, but without searchId
		goto('/loading');
		return { success: true };
	}
}

// Handle search submission
export async function handleSearch({
	destination,
	dateRange,
	budget,
	selectedRooms,
	preferences,
	selectedPropertyType,
	selectedAmenities,
	preferenceStrength,
	savePreference
}: {
	destination: string;
	dateRange: string;
	budget: string;
	selectedRooms: number;
	preferences: string;
	selectedPropertyType: string | null;
	selectedAmenities: string[];
	preferenceStrength: Record<string, 'weak' | 'mid' | 'strong'>;
	savePreference: () => void;
}): Promise<void> {
	console.log('Discover Properties button clicked');

	// Save current preference
	savePreference();

	// Build search query
	const searchQueryJson = prepareSearchQuery({
		destination,
		dateRange,
		budget,
		selectedRooms,
		preferences,
		selectedPropertyType,
		selectedAmenities,
		preferenceStrength
	});

	try {
		console.log('Storing search query and navigating to loading page');

		// Store the search query using the reactive store
		setSearchQuery(searchQueryJson);

		// Save to Supabase and navigate
		await saveSearchToSupabaseAndNavigate(searchQueryJson);
	} catch (error) {
		console.error('Error starting search:', error);
	}
}
