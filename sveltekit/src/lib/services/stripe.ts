import { loadStripe } from '@stripe/stripe-js';
import {
	PUBLIC_STRIPE_KEY,
	PUBLIC_STRIPE_PRICE_MONTHLY,
	PUBLIC_STRIPE_PRICE_YEARLY
} from '$env/static/public';

// Initialize Stripe
let stripePromise: Promise<any> | null = null;

export interface SubscriptionStatus {
	isActive: boolean;
	planId?: string;
	planName?: string;
	currentPeriodEnd?: string;
}

// Pricing tiers - now using environment variables
export const PRICING_TIER = {
	name: 'Premium',
	description: 'Everything you need to find your perfect accommodation',
	features: [
		'Unlimited searches',
		'Advanced property comparison',
		'Priority support',
		'Booking assistance',
		'Save favorite properties',
		'Personalized recommendations'
	],
	options: [
		{
			id: PUBLIC_STRIPE_PRICE_MONTHLY,
			period: 'monthly',
			price: 9.99,
			description: 'Monthly subscription'
		},
		{
			id: PUBLIC_STRIPE_PRICE_YEARLY,
			period: 'yearly',
			price: 99.99,
			description: 'Annual subscription',
			savingsAmount: 19.89 // (9.99*12) - 99.99 = 19.89
		}
	]
};

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
	async createCheckoutSession(priceId: string) {
		const response = await fetch('/api/stripe/checkout', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ priceId })
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message || 'Failed to create checkout session');
		}

		const { url } = await response.json();
		window.location.href = url;
	},

	/**
	 * Create a customer portal session for managing subscriptions
	 */
	async createPortalSession() {
		const response = await fetch('/api/stripe/portal', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message || 'Failed to create portal session');
		}

		const { url } = await response.json();
		window.location.href = url;
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
