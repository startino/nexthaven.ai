import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import { SECRET_STRIPE_KEY } from '$env/static/private';
import Stripe from 'stripe';
import { stripeService } from '$lib/services/stripe';

// Initialize Stripe for webhook verification
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

		// Use the consolidated stripe service to handle the webhook
		// Pass locals.stripe as the Stripe instance
		await stripeService.handleWebhookEvent(locals.stripe, locals.supabase, event);

		// Add additional custom handling as needed
		if (event.type === 'customer.subscription.created') {
			// When a subscription is created, deactivate any trials for this customer
			try {
				const subscription = event.data.object as Stripe.Subscription;

				// Get the customer ID from the subscription
				const customerId = subscription.customer as string;

				// Find the user ID associated with this customer
				const { data: customerData, error: customerError } = await locals.supabase
					.from('customers')
					.select('user_id')
					.eq('stripe_customer_id', customerId)
					.single();

				if (customerError) {
					console.error('Error finding user for customer:', customerError);
				} else if (customerData?.user_id) {
					// Deactivate any trials for this user
					const { error: deactivateError } = await locals.supabase
						.from('user_trials')
						.update({ is_active: false })
						.eq('user_id', customerData.user_id);

					if (deactivateError) {
						console.error(
							'Error deactivating trials for user with new subscription:',
							deactivateError
						);
					} else {
						console.log(
							'Successfully deactivated trials for user with new subscription:',
							customerData.user_id
						);
					}
				}
			} catch (err) {
				console.error('Error processing subscription created webhook:', err);
			}
		}

		return json({ received: true });
	} catch (err) {
		console.error('Error processing webhook:', err);
		error(400, `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};
