import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import { SECRET_STRIPE_KEY } from '$env/static/private';
import Stripe from 'stripe';

// Initialize Stripe with secret key
const stripe = new Stripe(SECRET_STRIPE_KEY, {
	apiVersion: '2025-02-24.acacia'
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		error(400, 'Missing stripe-signature header');
	}

	try {
		// Get the raw body as text
		const body = await request.text();

		// Verify the event using the webhook secret and signature
		const event = Stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);

		// Process the event
		const { type, data } = event;
		console.log(`Processing webhook event: ${type}`);

		// Since we're using Stripe directly for subscription data, we just log the events
		// and don't need to update our database for subscription changes
		switch (type) {
			case 'customer.subscription.created':
				console.log('New subscription created:', (data.object as Stripe.Subscription).id);
				break;
			case 'customer.subscription.updated':
				console.log('Subscription updated:', (data.object as Stripe.Subscription).id);
				break;
			case 'customer.subscription.deleted':
				console.log('Subscription deleted:', (data.object as Stripe.Subscription).id);
				break;
			// Add other events as needed
			case 'customer.created':
				console.log('Customer created:', (data.object as Stripe.Customer).id);
				break;
			case 'customer.updated':
				console.log('Customer updated:', (data.object as Stripe.Customer).id);
				break;
		}

		return json({ received: true });
	} catch (err) {
		console.error('Error processing webhook:', err);
		error(400, `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};
