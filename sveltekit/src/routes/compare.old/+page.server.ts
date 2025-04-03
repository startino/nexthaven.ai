import { redirect } from '@sveltejs/kit';
import { requireSubscription } from '$lib/server/subscription';

export const load = async (event) => {
	// Check subscription status and redirect if not subscribed
	const subscriptionStatus = await requireSubscription(event);

	const { url, locals } = event;

	// Get the searchId from URL parameters
	const searchId = url.searchParams.get('searchId');

	// Pass the searchId and subscription status to the client
	return {
		searchId,
		subscriptionStatus
	};
};
