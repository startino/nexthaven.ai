import Stripe from 'stripe';
import { SECRET_STRIPE_KEY } from '$env/static/private';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	SubscriptionStatus,
	CheckSubscriptionStatus,
	IsEligibleForTrial
} from '$lib/utils/subscription';

// Initialize Stripe with secret key
const stripe = new Stripe(SECRET_STRIPE_KEY, {
	apiVersion: '2025-02-24.acacia'
});

/**
 * Modified checkSubscriptionStatus to also check for active trials
 * Returns subscription status details including trial status
 */
export const checkSubscriptionStatus: CheckSubscriptionStatus = async (
	supabase: SupabaseClient,
	userId: string
): Promise<SubscriptionStatus> => {
	try {
		// Default status
		let subscriptionStatus: SubscriptionStatus = { isActive: false };
		let hasPaidSubscription = false;

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
					hasPaidSubscription = true;
					const subscription = subscriptions.data[0];
					const plan = subscription.items.data[0].plan;
					const product = plan.product as Stripe.Product;

					subscriptionStatus = {
						isActive: true,
						planId: plan.id,
						planName: product.name,
						currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
						isInTrial: subscription.status === 'trialing',
						trialEnd: subscription.trial_end
							? new Date(subscription.trial_end * 1000).toISOString()
							: undefined
					};

					// If user has an active subscription, deactivate any free trial
					await supabase
						.from('user_trials')
						.update({ is_active: false })
						.eq('user_id', userId)
						.eq('is_active', true);
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

		// Only check for free trial if no active paid subscription was found
		if (!hasPaidSubscription) {
			// Check if user has an active trial
			const { data: trialData, error: trialError } = await supabase
				.from('user_trials')
				.select('*')
				.eq('user_id', userId)
				.eq('is_active', true)
				.single();

			// If there's an active trial, user has access
			if (!trialError && trialData) {
				const trialEnd = new Date(trialData.trial_end);
				const now = new Date();

				// If trial hasn't expired
				if (trialEnd > now) {
					subscriptionStatus = {
						isActive: true,
						planName: 'Free Trial',
						currentPeriodEnd: trialData.trial_end,
						isInTrial: true,
						trialEnd: trialData.trial_end
					};
				} else {
					// Trial has expired, update it as inactive
					await supabase.from('user_trials').update({ is_active: false }).eq('user_id', userId);
				}
			}
		}

		return subscriptionStatus;
	} catch (error) {
		console.error('Error checking subscription status:', error);
		// Default to inactive on error to avoid blocking functionality
		return { isActive: false };
	}
};

/**
 * Check if a user is eligible for a free trial
 * Users are eligible if they've never had a subscription before
 */
export const isEligibleForTrial: IsEligibleForTrial = async (
	supabase: SupabaseClient,
	userId: string
): Promise<boolean> => {
	// Check if the user has any subscription records in Stripe
	const { data: customerData, error: customerError } = await supabase
		.from('customers')
		.select('stripe_customer_id')
		.eq('user_id', userId)
		.single();

	// If no customer record exists, they're eligible
	if (customerError || !customerData?.stripe_customer_id) {
		return true;
	}

	// If they have a customer ID, check if they've ever had a subscription
	try {
		// Check for any subscriptions (active, canceled, or past_due)
		const subscriptions = await stripe.subscriptions.list({
			customer: customerData.stripe_customer_id,
			status: 'all',
			limit: 1
		});

		// If they have no subscription history, they're eligible
		return subscriptions.data.length === 0;
	} catch (error) {
		// If there's an error (like customer not found in Stripe), they're eligible
		console.error('Error checking trial eligibility:', error);
		return true;
	}
};
