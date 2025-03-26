import { redirect } from '@sveltejs/kit';
import Stripe from 'stripe';
import { SECRET_STRIPE_KEY } from '$env/static/private';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequestEvent } from '@sveltejs/kit';

// Initialize Stripe with secret key
const stripe = new Stripe(SECRET_STRIPE_KEY, {
	apiVersion: '2025-02-24.acacia'
});

// Define subscription status interface
export interface SubscriptionStatus {
	isActive: boolean;
	planId?: string;
	planName?: string;
	currentPeriodEnd?: string;
}

/**
 * Checks if a user has an active subscription
 * Returns subscription status details
 */
export async function checkSubscriptionStatus(
	supabase: SupabaseClient,
	userId: string
): Promise<SubscriptionStatus> {
	try {
		// Default status
		let subscriptionStatus: SubscriptionStatus = { isActive: false };

		// Get the customer ID from the database
		const { data: customerData, error: customerError } = await supabase
			.from('customers')
			.select('stripe_customer_id')
			.eq('user_id', userId)
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

				// If user has active subscriptions, mark as active
				if (subscriptions.data.length > 0) {
					const subscription = subscriptions.data[0];
					const plan = subscription.items.data[0].plan;
					const product = plan.product as Stripe.Product;

					subscriptionStatus = {
						isActive: true,
						planId: plan.id,
						planName: product.name,
						currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
					};
				}
			} catch (stripeErr) {
				// Handle case where customer exists in our DB but not in Stripe
				if (
					stripeErr instanceof Stripe.errors.StripeError &&
					stripeErr.type === 'StripeInvalidRequestError' &&
					(stripeErr.raw as any)?.code === 'resource_missing'
				) {
					console.log('Customer exists in DB but not in Stripe, showing as inactive');
				} else {
					// For other errors, log but don't throw
					console.error('Stripe error while checking subscription:', stripeErr);
				}
			}
		}

		return subscriptionStatus;
	} catch (error) {
		console.error('Error checking subscription status:', error);
		// Default to inactive on error to avoid blocking functionality
		return { isActive: false };
	}
}

/**
 * Middleware function to protect routes that require an active subscription
 * Redirects to subscription page if no active subscription
 */
export async function requireSubscription(
	event: RequestEvent,
	redirectRoute = '/subscription'
): Promise<SubscriptionStatus> {
	const { locals, url } = event;
	const session = await locals.getSession();

	// If not logged in, redirect to login first
	if (!session) {
		const loginRedirect = `/auth/login?redirectTo=${url.pathname}${url.search}`;
		redirect(303, loginRedirect);
	}

	// Check subscription status
	const subscriptionStatus = await checkSubscriptionStatus(locals.supabase, session.user.id);

	// If not subscribed, redirect to subscription page
	if (!subscriptionStatus.isActive) {
		// Include the current URL as a redirectTo parameter
		const subscriptionRedirect = `${redirectRoute}?redirectTo=${url.pathname}${url.search}`;
		redirect(303, subscriptionRedirect);
	}

	// If subscribed, continue
	return subscriptionStatus;
}
