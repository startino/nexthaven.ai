import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireSubscription } from '$lib/utils/subscription';

export const load: PageServerLoad = async (event) => {
	const { locals } = event;

	// Check subscription status and redirect if not subscribed
	// This will handle both authentication and subscription checks
	const subscriptionStatus = await requireSubscription(event);

	// Get popular destinations (could be from a database or hardcoded)
	const popularDestinations = [
		{ name: 'Kuala Lumpur', image: '/images/destinations/kuala-lumpur.jpg' },
		{ name: 'Bali', image: '/images/destinations/bali.jpg' },
		{ name: 'Da Nang', image: '/images/destinations/da-nang.jpg' },
		{ name: 'Chiang Mai', image: '/images/destinations/chiang-mai.jpg' }
	];

	// Return data to the page
	return {
		popularDestinations,
		subscriptionStatus
	};
};
