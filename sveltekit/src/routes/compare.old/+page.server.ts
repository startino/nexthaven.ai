import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireSubscription } from '$lib/utils/subscription';

export const load: PageServerLoad = async (event) => {
	// Check subscription status and redirect if not subscribed
	const subscriptionStatus = await requireSubscription(event);

	const { url, locals } = event;
	const { supabase } = locals;

	// Get the searchId from URL parameters
	const searchId = url.searchParams.get('searchId');

	// Pass the searchId and subscription status to the client
	return {
		searchId,
		subscriptionStatus
	};
};
