import Stripe from 'stripe';
import { SECRET_STRIPE_KEY } from '$env/static/private';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	SubscriptionStatus,
	CheckSubscriptionStatus,
	IsEligibleForTrial
} from '$lib/utils/subscription';
import type { Database } from '$lib/types/database.types';

// Initialize Stripe with secret key
const stripe = new Stripe(SECRET_STRIPE_KEY, {
	apiVersion: '2025-02-24.acacia'
});

/**
 * Checks if a user has an active subscription or is in a trial period
 * This is the server-side implementation
 */
export const checkSubscriptionStatus: CheckSubscriptionStatus = async (
	supabase: SupabaseClient<Database>,
	userId: string
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
			const subscriptions = await stripe.subscriptions.list({
				customer: customer.stripe_customer_id,
				status: 'active',
				expand: ['data.plan.product']
			});

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
