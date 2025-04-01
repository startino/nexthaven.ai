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
 * Checks if a user has an active subscription or is in a trial period
 * This is the server-side implementation
 */
export const checkSubscriptionStatus: CheckSubscriptionStatus = async (
	supabase: SupabaseClient,
	userId: string
): Promise<SubscriptionStatus> => {
	try {
		// First check if user has an active subscription from a payment provider
		const { data: subscription, error: subscriptionError } = await supabase
			.from('subscriptions')
			.select('*')
			.eq('user_id', userId)
			.eq('status', 'active')
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		if (subscription) {
			// User has an active paid subscription
			return {
				isActive: true,
				planId: subscription.price_id,
				planName: subscription.plan_name,
				currentPeriodEnd: subscription.current_period_end,
				isInTrial: false
			};
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
 * Users are eligible if they haven't used a trial before
 */
export const isEligibleForTrial: IsEligibleForTrial = async (
	supabase: SupabaseClient,
	userId: string
): Promise<boolean> => {
	try {
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
