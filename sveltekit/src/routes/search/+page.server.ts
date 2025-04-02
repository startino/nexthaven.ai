import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { checkUserAuthentication } from '$lib/utils/subscription';

export const load: PageServerLoad = async (event) => {
	const { locals, url } = event;

	// Check authentication and get subscription status
	const { session, subscriptionStatus } = await checkUserAuthentication(event);

	// If subscription status is null or not active, redirect to subscription page
	if (!subscriptionStatus || !subscriptionStatus.isActive) {
		// Include the current URL as a redirectTo parameter
		const subscriptionRedirect = `/subscription?redirectTo=${url.pathname}${url.search}`;
		redirect(303, subscriptionRedirect);
	}

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
