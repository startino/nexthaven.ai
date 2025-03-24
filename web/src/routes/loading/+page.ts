import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { propertyService } from '$lib/services/api';
import { propertyStore } from '$lib/stores/properties';
import { get } from 'svelte/store';
import { setProperties } from '$lib/stores/properties';
import type { UnifiedProperty } from '$lib/types/unified-property';

// This function simulates data loading and then redirects to the comparison page
export async function load() {
	// Only run on the client side
	if (browser) {
		// Get the search query from the store
		const { searchQuery } = get(propertyStore);

		if (!searchQuery) {
			// If no search query, redirect to the search page
			goto('/search');
			return {};
		}

		// Simulate API call with a delay
		setTimeout(async () => {
			try {
				// Parse the search query
				const parsedQuery = JSON.parse(searchQuery);

				// Fetch properties from the API
				// This would be a real API call in a production app
				const mockProperties: UnifiedProperty[] = [
					{
						id: '1',
						source: 'Booking.com' as const,
						url: 'https://booking.com/property1',
						name: 'Luxury Downtown Suite',
						description:
							'Modern luxury suite in the heart of the city with stunning views and amenities.',
						location: parsedQuery.query,
						pricing: { total: 450 },
						capacity: { bedrooms: 2, beds: 3 },
						features: { size: 120, amenities: ['Pool', 'Gym', 'WiFi', 'Kitchen'] },
						media: {
							main_image: 'https://example.com/image1.jpg',
							gallery: ['https://example.com/image2.jpg', 'https://example.com/image3.jpg']
						},
						score: 9.2,
						reasoning: 'High-end amenities, prime location, and excellent value for money.'
					},
					{
						id: '2',
						source: 'Airbnb' as const,
						url: 'https://airbnb.com/property2',
						name: 'Cozy Beachfront Villa',
						description:
							'Relax in this beautiful beachfront villa with private access to the beach.',
						location: parsedQuery.query,
						pricing: { total: 380 },
						capacity: { bedrooms: 3, beds: 4 },
						features: { size: 150, amenities: ['Beach Access', 'WiFi', 'Kitchen', 'Parking'] },
						media: {
							main_image: 'https://example.com/image4.jpg',
							gallery: ['https://example.com/image5.jpg', 'https://example.com/image6.jpg']
						},
						score: 8.7,
						reasoning: 'Beautiful beach location, spacious rooms, great amenities.'
					},
					{
						id: '3',
						source: 'Booking.com' as const,
						url: 'https://booking.com/property3',
						name: 'Modern City Apartment',
						description:
							'Sleek and modern apartment in a trendy neighborhood close to attractions.',
						location: parsedQuery.query,
						pricing: { total: 320 },
						capacity: { bedrooms: 1, beds: 2 },
						features: { size: 80, amenities: ['WiFi', 'Kitchen', 'Washer', 'Dryer'] },
						media: {
							main_image: 'https://example.com/image7.jpg',
							gallery: ['https://example.com/image8.jpg', 'https://example.com/image9.jpg']
						},
						score: 8.5,
						reasoning: 'Great value, excellent location, modern amenities.'
					}
				];

				// Store the properties
				setProperties(mockProperties);

				// Redirect to compare page
				goto('/compare');
			} catch (error) {
				console.error('Error fetching properties:', error);
				// Redirect back to search on error
				goto('/search');
			}
		}, 3000);
	}

	return {};
}
