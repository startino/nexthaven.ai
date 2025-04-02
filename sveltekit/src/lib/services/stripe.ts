import { loadStripe } from '@stripe/stripe-js';
import {
	PUBLIC_STRIPE_KEY,
	PUBLIC_STRIPE_PRICE_MONTHLY,
	PUBLIC_STRIPE_PRICE_YEARLY
} from '$env/static/public';
import { createSupabaseBrowserClient } from '$lib/supabase';
import { getCurrentToltReferralId } from '$lib/stores/tolt';

// Initialize Stripe
let stripePromise: Promise<any> | null = null;

export interface SubscriptionStatus {
	isActive: boolean;
	planId?: string;
	planName?: string;
	currentPeriodEnd?: string;
	isInTrial?: boolean;
	trialEnd?: string;
}

// Pricing tiers - now using environment variables
export const PRICING_TIER = {
	name: 'Membership',
	description: 'Choose a subscription plan',
	options: [
		{
			id: PUBLIC_STRIPE_PRICE_MONTHLY,
			name: 'Monthly',
			description: 'Subscribe monthly',
			features: ['Full access to all features', 'Cancel anytime'],
			price: '$7',
			priceDescription: 'per month',
			highlight: false
		},
		{
			id: PUBLIC_STRIPE_PRICE_YEARLY,
			name: 'Yearly',
			description: 'Subscribe yearly (16% discount)',
			features: ['Full access to all features', 'Save 16% vs monthly'],
			price: '$30',
			priceDescription: 'per year',
			highlight: true
		}
	]
};

export type CheckoutSession = {
	url: string | null;
	error?: string;
};

export type PortalSession = {
	url: string | null;
	error?: string;
};

interface CreateCheckoutSessionOptions {
	priceId: string;
	returnUrl?: string;
}

interface CreatePortalSessionOptions {
	returnUrl?: string;
}

/**
 * Client-side Stripe service for SvelteKit
 */
export const stripeService = {
	/**
	 * Get the Stripe instance
	 */
	getStripe() {
		if (!stripePromise && PUBLIC_STRIPE_KEY) {
			stripePromise = loadStripe(PUBLIC_STRIPE_KEY);
		}
		return stripePromise;
	},

	/**
	 * Create a checkout session for a subscription
	 */
	async createCheckoutSession(options: CreateCheckoutSessionOptions): Promise<CheckoutSession> {
		try {
			// Get the Tolt referral ID if available
			const toltReferral = getCurrentToltReferralId();
			
			const response = await fetch('/api/stripe/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					priceId: options.priceId,
					returnUrl: options.returnUrl,
					toltReferral  // Include the Tolt referral ID
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error('Failed to create checkout session:', errorText);
				return { url: null, error: `Error: ${response.status} - ${errorText}` };
			}

			const data = await response.json();
			return { url: data.url };
		} catch (error) {
			console.error('Error creating checkout session:', error);
			return { url: null, error: error instanceof Error ? error.message : String(error) };
		}
	},

	/**
	 * Create a customer portal session for managing subscriptions
	 */
	async createPortalSession(options?: CreatePortalSessionOptions): Promise<PortalSession> {
		try {
			const response = await fetch('/api/stripe/portal', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					returnUrl: options?.returnUrl
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error('Failed to create portal session:', errorText);
				return { url: null, error: `Error: ${response.status} - ${errorText}` };
			}

			const data = await response.json();
			return { url: data.url };
		} catch (error) {
			console.error('Error creating portal session:', error);
			return { url: null, error: error instanceof Error ? error.message : String(error) };
		}
	},

	/**
	 * Get the user's subscription status
	 */
	async getSubscriptionStatus() {
		const response = await fetch('/api/stripe/subscription', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message || 'Failed to get subscription status');
		}

		return response.json();
	}
};
