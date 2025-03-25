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

		switch (type) {
			case 'customer.subscription.created':
			case 'customer.subscription.updated': {
				const subscription = data.object as Stripe.Subscription;

				// Get the customer ID from the subscription
				const { customer: stripeCustomerId } = subscription;

				// Find the user ID from the customer ID
				const { data: customerData, error: customerError } = await locals.supabase
					.from('customers')
					.select('user_id')
					.eq('stripe_customer_id', stripeCustomerId as string)
					.single();

				if (customerError || !customerData?.user_id) {
					console.error('Customer not found for subscription update:', stripeCustomerId);
					return json({ received: true });
				}

				// Update or insert the subscription
				const { error: upsertError } = await locals.supabase.from('subscriptions').upsert({
					user_id: customerData.user_id,
					stripe_subscription_id: subscription.id,
					stripe_customer_id: stripeCustomerId as string,
					status: subscription.status,
					price_id: subscription.items.data[0].price.id,
					quantity: subscription.items.data[0].quantity || 1,
					cancel_at_period_end: subscription.cancel_at_period_end,
					current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
					current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
					created_at: new Date(subscription.created * 1000).toISOString(),
					updated_at: new Date().toISOString()
				});

				if (upsertError) {
					console.error('Error updating subscription:', upsertError);
				}
				break;
			}

			case 'customer.subscription.deleted': {
				const subscription = data.object as Stripe.Subscription;

				// Delete the subscription from the database
				const { error: deleteError } = await locals.supabase
					.from('subscriptions')
					.delete()
					.eq('stripe_subscription_id', subscription.id);

				if (deleteError) {
					console.error('Error deleting subscription:', deleteError);
				}
				break;
			}
		}

		return json({ received: true });
	} catch (err) {
		console.error('Error processing webhook:', err);
		error(400, `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};
