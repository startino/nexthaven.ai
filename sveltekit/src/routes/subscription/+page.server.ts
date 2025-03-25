import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import Stripe from 'stripe';
import { SECRET_STRIPE_KEY } from '$env/static/private';

// Initialize Stripe with secret key
const stripe = new Stripe(SECRET_STRIPE_KEY, {
	apiVersion: '2025-02-24.acacia'
});

// Define subscription status interface
interface SubscriptionStatus {
	isActive: boolean;
	planId?: string;
	planName?: string;
	currentPeriodEnd?: string;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = await locals.getSession();

	// Redirect to login if not authenticated
	if (!session?.user) {
		redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	let subscriptionStatus: SubscriptionStatus = { isActive: false };
	try {
		// First, get the customer ID
		const { data: customerData, error: customerError } = await locals.supabase
			.from('customers')
			.select('stripe_customer_id')
			.eq('user_id', session.user.id)
			.single();

		if (!customerError && customerData?.stripe_customer_id) {
			try {
				// Verify the customer exists in Stripe
				await stripe.customers.retrieve(customerData.stripe_customer_id);

				// Fetch active subscriptions from Stripe
				const subscriptions = await stripe.subscriptions.list({
					customer: customerData.stripe_customer_id,
					status: 'active',
					expand: ['data.plan.product']
				});

				if (subscriptions.data.length > 0) {
					const subscription = subscriptions.data[0];
					const plan = subscription.items.data[0].plan;

					// Get the product details
					const product = plan.product as Stripe.Product;

					subscriptionStatus = {
						isActive: true,
						planId: plan.id,
						planName: product.name,
						currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
					};
				}
			} catch (stripeErr) {
				if (
					stripeErr instanceof Stripe.errors.StripeError &&
					stripeErr.type === 'StripeInvalidRequestError' &&
					(stripeErr.raw as any)?.code === 'resource_missing'
				) {
					console.log('Customer exists in DB but not in Stripe, showing as inactive');
					// We keep the default inactive status
				} else {
					// For other errors, rethrow
					throw stripeErr;
				}
			}
		}
	} catch (error) {
		console.error('Error fetching subscription status:', error);
	}

	return {
		subscriptionStatus
	};
};
