import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { SECRET_STRIPE_KEY } from '$env/static/private';

// Initialize Stripe with secret key
const stripe = new Stripe(SECRET_STRIPE_KEY, {
	apiVersion: '2025-02-24.acacia'
});

export const GET: RequestHandler = async ({ locals }) => {
	// Ensure user is authenticated
	const userSession = await locals.getSession();
	if (!userSession?.user) {
		error(401, 'Unauthorized');
	}

	try {
		// Dynamically import the server module
		const { checkSubscriptionStatus } = await import('$lib/server/subscription');

		// Use the checkSubscriptionStatus function which also checks for free trials
		const subscriptionStatus = await checkSubscriptionStatus(locals.supabase, userSession.user.id);
		return json(subscriptionStatus);
	} catch (err) {
		console.error('Error fetching subscription status:', err);
		error(500, 'Failed to fetch subscription status');
	}
};
