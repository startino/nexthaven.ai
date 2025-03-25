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
		// First, get the customer ID
		const { data: customerData, error: customerError } = await locals.supabase
			.from('customers')
			.select('stripe_customer_id')
			.eq('user_id', userSession.user.id)
			.single();

		if (customerError || !customerData?.stripe_customer_id) {
			// No customer ID means no subscription
			return json({ isActive: false });
		}

		// Verify the customer exists in Stripe before checking subscriptions
		try {
			await stripe.customers.retrieve(customerData.stripe_customer_id);
		} catch (stripeErr) {
			if (
				stripeErr instanceof Stripe.errors.StripeError &&
				stripeErr.type === 'StripeInvalidRequestError' &&
				(stripeErr.raw as any)?.code === 'resource_missing'
			) {
				console.log('Customer exists in DB but not in Stripe, returning inactive status');
				return json({ isActive: false });
			}
			// For other errors, rethrow
			throw stripeErr;
		}

		// Fetch active subscriptions from Stripe
		const subscriptions = await stripe.subscriptions.list({
			customer: customerData.stripe_customer_id,
			status: 'active',
			expand: ['data.plan.product']
		});

		if (!subscriptions.data.length) {
			return json({ isActive: false });
		}

		const subscription = subscriptions.data[0];
		const plan = subscription.items.data[0].plan;

		// Get the product details
		const product = plan.product as Stripe.Product;

		return json({
			isActive: true,
			planId: plan.id,
			planName: product.name,
			currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
		});
	} catch (err) {
		console.error('Error fetching subscription status:', err);
		error(500, 'Failed to fetch subscription status');
	}
};
