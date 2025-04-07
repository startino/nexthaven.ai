import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	SubscriptionStatus,
	CheckSubscriptionStatus,
	IsEligibleForTrial
} from '$lib/utils/subscription';
import type { Database } from '$lib/types/database.types';
import type Stripe from 'stripe';
import { redirect, type RequestEvent } from '@sveltejs/kit';

/**
 * Checks if a user has an active subscription or is in a trial period
 * This is the server-side implementation
 * @param stripe - The Stripe instance from event.locals
 * @param supabase - The Supabase instance
 * @param userId - The user ID to check
 */
export const checkSubscriptionStatus = async (
	supabase: SupabaseClient<Database>,
	userId: string,
	stripe: Stripe | null
): Promise<SubscriptionStatus> => {
	try {
		// First check if user has a Stripe customer ID
		const { data: customer, error: customerError } = await supabase
			.from('customers')
			.select('stripe_customer_id')
			.eq('user_id', userId)
			.single();

		if (customer?.stripe_customer_id) {
			// User has a Stripe customer ID, check for active subscriptions in Stripe
			try {
				console.log('customer', customer);
				const subscriptions = await stripe.subscriptions.list({
					customer: customer.stripe_customer_id,
					status: 'active',
					expand: ['data.plan.product']
				});

				console.log('subscriptions', subscriptions);

				if (subscriptions.data.length > 0) {
					// User has an active paid subscription
					const subscription = subscriptions.data[0];
					const plan = subscription.items.data[0].plan;
					const product = plan.product as Stripe.Product;

					return {
						isActive: true,
						planId: plan.id,
						planName: product.name,
						currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
						isInTrial: false
					};
				}
			} catch (stripeError) {
				console.error('Error checking Stripe subscription:', stripeError);
				// Continue to check for trials even if Stripe API fails
			}
		}

		// If no active subscription, check if they have an active trial
		const { data: trial, error: trialError } = await supabase
			.from('user_trials')
			.select('*')
			.eq('user_id', userId)
			.eq('is_active', true)
			.single();

		if (trial) {
			// Check if the trial has expired
			const trialEnd = new Date(trial.trial_end);
			const now = new Date();
			const isTrialActive = trialEnd > now;

			if (isTrialActive) {
				// User has an active trial
				return {
					isActive: true,
					isInTrial: true,
					trialEnd: trial.trial_end
				};
			} else {
				// Trial has expired but is marked as active - update it
				await supabase.from('user_trials').update({ is_active: false }).eq('id', trial.id);

				// Return inactive status
				return {
					isActive: false,
					isInTrial: false,
					trialEnd: trial.trial_end
				};
			}
		}

		// No active subscription or trial
		return { isActive: false };
	} catch (error) {
		console.error('Error checking subscription status:', error);
		return { isActive: false };
	}
};

/**
 * Checks if a user is eligible for a free trial
 * Users are eligible if they haven't used a trial before AND they are not anonymous
 */
export const isEligibleForTrial: IsEligibleForTrial = async (
	supabase: SupabaseClient,
	userId: string
): Promise<boolean> => {
	try {
		// First check if this is an anonymous user - anonymous users are never eligible for trials
		try {
			// Try to get user data to check if they're anonymous
			const { data: userData } = await supabase.auth.admin.getUserById(userId);

			if (userData?.user?.user_metadata) {
				const metadata = userData.user.user_metadata;
				// If user is marked as anonymous, they're not eligible for trial
				if (metadata.is_anonymous === true || metadata.provider === 'anonymous') {
					console.log('User is anonymous, not eligible for trial:', userId);
					return false;
				}
			}
		} catch (adminError) {
			// If admin API fails, try fallback with session
			console.log('Admin API not available for trial check, using fallback');
			try {
				const {
					data: { session }
				} = await supabase.auth.getSession();

				if (session?.user?.id === userId && session?.user?.user_metadata) {
					const metadata = session.user.user_metadata;
					if (metadata.is_anonymous === true || metadata.provider === 'anonymous') {
						console.log('User is anonymous (session check), not eligible for trial:', userId);
						return false;
					}
				}
			} catch (sessionError) {
				console.error('Error checking user anonymity via session:', sessionError);
			}
		}

		// Check if user has used a trial before
		const { data, error } = await supabase.from('user_trials').select('*').eq('user_id', userId);

		if (error) {
			console.error('Error checking trial eligibility:', error);
			return false;
		}

		// User is eligible if they have no trial records
		return data.length === 0;
	} catch (error) {
		console.error('Error in isEligibleForTrial:', error);
		return false;
	}
};

/**
 * Middleware function to protect routes that require an active subscription
 * Redirects to subscription page if no active subscription
 * Note: This should only be used in server-side code (+page.server.ts, etc.)
 */
export async function requireSubscription(
	event: RequestEvent,
	redirectRoute = '/subscription'
): Promise<SubscriptionStatus> {
	const { locals, url } = event;
	const session = await locals.getSession();

	// If not logged in, redirect to login first
	if (!session) {
		const loginRedirect = `/login?redirectTo=${url.pathname}${url.search}`;
		redirect(303, loginRedirect);
	}

	// Check subscription status using our updated function
	// which also checks for active trials
	const subscriptionStatus = await checkSubscriptionStatus(
		locals.supabase,
		session.user.id,
		locals.stripe
	);

	// If not subscribed, redirect to subscription page
	if (!subscriptionStatus.isActive) {
		// Include the current URL as a redirectTo parameter
		const subscriptionRedirect = `${redirectRoute}?redirectTo=${url.pathname}${url.search}`;
		redirect(303, subscriptionRedirect);
	}

	// If subscribed, continue
	return subscriptionStatus;
}

/**
 * Check if the user is authenticated without requiring a subscription
 * Returns the user's session and subscription status if available
 * This allows free trial users to access protected functionality
 * Note: This should only be used in server-side code (+page.server.ts, etc.)
 */
export async function checkUserAuthentication(
	event: RequestEvent
): Promise<{ session: any; subscriptionStatus: SubscriptionStatus | null }> {
	const { locals, url } = event;
	const session = await locals.getSession();

	// If not logged in, redirect to login first
	if (!session) {
		const loginRedirect = `/login?redirectTo=${url.pathname}${url.search}`;
		redirect(303, loginRedirect);
	}

	// We need to dynamically import the server module here to avoid client-side imports
	const { checkSubscriptionStatus } = await import('$lib/server/subscription');

	// Check subscription status but don't redirect if inactive
	const subscriptionStatus = await checkSubscriptionStatus(
		locals.supabase,
		session.user.id,
		locals.stripe
	);

	// Return both the session and subscription status
	return { session, subscriptionStatus };
}
