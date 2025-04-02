import { loadStripe } from '@stripe/stripe-js';
import {
	PUBLIC_STRIPE_KEY,
	PUBLIC_STRIPE_PRICE_MONTHLY,
	PUBLIC_STRIPE_PRICE_YEARLY,
	PUBLIC_SITE_URL
} from '$env/static/public';
import Stripe from 'stripe';
import { error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database.types';
import { getCurrentToltReferralId } from '$lib/stores/tolt';

// Client-side Stripe instance
let stripePromise: Promise<any> | null = null;

// Remove the server-side Stripe instance since we're using the one from locals

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
	bypassAnonymousCheck?: boolean;
}

interface CreatePortalSessionOptions {
	returnUrl?: string;
}

/**
 * Combined Stripe service for both client and server operations
 */
export const stripeService = {
	/***************************************
	 * CLIENT-SIDE METHODS
	 ***************************************/

	/**
	 * Get the client-side Stripe instance
	 */
	getStripe() {
		if (!stripePromise && PUBLIC_STRIPE_KEY) {
			stripePromise = loadStripe(PUBLIC_STRIPE_KEY);
		}
		return stripePromise;
	},

	/**
	 * Create a checkout session for a subscription (client-side)
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
					toltReferral,
					bypassAnonymousCheck: options.bypassAnonymousCheck
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
	 * Create a customer portal session for managing subscriptions (client-side)
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
	 * Get the user's subscription status (client-side)
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
	},

	/***************************************
	 * SERVER-SIDE METHODS
	 ***************************************/

	/**
	 * Ensure user has a Stripe customer ID
	 */
	async ensureCustomer(
		stripe: Stripe | null,
		supabase: SupabaseClient<Database>,
		userId: string
	): Promise<string> {
		if (!stripe) throw error(500, 'Stripe is not initialized');

		try {
			// First check if the user already has a customer ID
			const { data: customerData, error: customerError } = await supabase
				.from('customers')
				.select('stripe_customer_id')
				.eq('user_id', userId)
				.single();

			if (customerData?.stripe_customer_id) {
				return customerData.stripe_customer_id;
			}

			// If no customer ID exists, get user email to create a new customer
			const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
			console.log('target', userError);
			if (userError || !userData?.user) {
				throw error(400, 'User not found');
			}

			console.log('before stripe');
			// Create customer in Stripe
			const customer = await stripe.customers.create({
				email: userData.user.email,
				metadata: {
					userId
				}
			});
			// Save the customer ID to database
			const { error: insertError } = await supabase.from('customers').insert({
				user_id: userId,
				stripe_customer_id: customer.id
			});

			if (insertError) {
				console.error('Error saving customer ID:', insertError);
				throw error(500, 'Error saving customer data');
			}

			return customer.id;
		} catch (err) {
			console.error('Error ensuring customer:', err);
			throw error(500, 'Failed to create customer');
		}
	},

	/**
	 * Get a user's subscription status (server-side)
	 */
	async getSubscriptionStatusServer(
		stripe: Stripe | null,
		supabase: SupabaseClient<Database>,
		userId: string
	) {
		if (!stripe) throw error(500, 'Stripe is not initialized');

		try {
			// First, get the customer ID
			const { data: customerData, error: customerError } = await supabase
				.from('customers')
				.select('stripe_customer_id')
				.eq('user_id', userId)
				.single();

			if (customerError || !customerData?.stripe_customer_id) {
				// No customer ID means no subscription
				return { isActive: false };
			}

			// Fetch active subscriptions from Stripe
			const subscriptions = await stripe.subscriptions.list({
				customer: customerData.stripe_customer_id,
				status: 'active',
				expand: ['data.plan.product']
			});

			if (!subscriptions.data.length) {
				return { isActive: false };
			}

			const subscription = subscriptions.data[0];
			const plan = subscription.items.data[0].plan;

			// Get the product details
			const product = plan.product as Stripe.Product;

			return {
				isActive: true,
				planId: plan.id,
				planName: product.name,
				currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
			};
		} catch (err) {
			console.error('Error getting subscription status:', err);
			throw error(500, 'Failed to check subscription status');
		}
	},

	/**
	 * Create a checkout session for a subscription (server-side)
	 */
	async createCheckoutSessionServer(
		stripe: Stripe | null,
		supabase: SupabaseClient<Database>,
		userId: string,
		priceId: string,
		returnUrl?: string,
		toltReferral?: string
	) {
		if (!stripe) throw error(500, 'Stripe is not initialized');

		try {
			// Ensure customer exists
			const customerId = await this.ensureCustomer(stripe, supabase, userId);

			// Create checkout session
			const successUrl = returnUrl || `${PUBLIC_SITE_URL}/subscription?success=true`;
			const cancelUrl = `${PUBLIC_SITE_URL}/subscription?canceled=true`;

			// Create metadata with tolt referral if provided
			const metadata: Record<string, string> = {};
			if (toltReferral) {
				metadata.toltReferral = toltReferral;
			}

			const session = await stripe.checkout.sessions.create({
				customer: customerId,
				payment_method_types: ['card'],
				line_items: [
					{
						price: priceId,
						quantity: 1
					}
				],
				mode: 'subscription',
				success_url: successUrl,
				cancel_url: cancelUrl,
				metadata
			});

			return { url: session.url };
		} catch (err) {
			console.error('Error creating checkout session:', err);
			throw error(500, 'Failed to create checkout session');
		}
	},

	/**
	 * Create a customer portal session (server-side)
	 */
	async createCustomerPortalSessionServer(
		stripe: Stripe | null,
		supabase: SupabaseClient<Database>,
		userId: string,
		returnUrl?: string
	) {
		if (!stripe) throw error(500, 'Stripe is not initialized');

		try {
			// First, get the customer ID
			const { data: customerData, error: customerError } = await supabase
				.from('customers')
				.select('stripe_customer_id')
				.eq('user_id', userId)
				.single();

			if (customerError || !customerData?.stripe_customer_id) {
				throw error(400, 'Customer not found');
			}

			// Create portal session
			const portalReturnUrl = returnUrl || `${PUBLIC_SITE_URL}/subscription`;

			const session = await stripe.billingPortal.sessions.create({
				customer: customerData.stripe_customer_id,
				return_url: portalReturnUrl
			});

			return { url: session.url };
		} catch (err) {
			console.error('Error creating portal session:', err);
			throw error(500, 'Failed to create customer portal session');
		}
	},

	/**
	 * Process a webhook event from Stripe
	 */
	async handleWebhookEvent(
		stripe: Stripe | null,
		supabase: SupabaseClient<Database>,
		event: Stripe.Event
	) {
		if (!stripe) throw error(500, 'Stripe is not initialized');

		const { type, data } = event;

		console.log(`Processing webhook event: ${type}`);

		switch (type) {
			case 'customer.subscription.created':
			case 'customer.subscription.updated':
				const subscription = data.object as Stripe.Subscription;
				await this.updateSubscriptionStatus(stripe, supabase, subscription);
				break;

			case 'customer.subscription.deleted':
				const deletedSubscription = data.object as Stripe.Subscription;
				await this.deleteSubscription(stripe, supabase, deletedSubscription);
				break;
		}

		return { received: true };
	},

	/**
	 * Update subscription status in the database
	 */
	async updateSubscriptionStatus(
		stripe: Stripe | null,
		supabase: SupabaseClient<Database>,
		subscription: Stripe.Subscription
	) {
		// Get the customer ID from the subscription
		const { customer: stripeCustomerId } = subscription;

		// Find the user ID from the customer ID
		const { data: customerData, error: customerError } = await supabase
			.from('customers')
			.select('user_id')
			.eq('stripe_customer_id', stripeCustomerId as string)
			.single();

		if (customerError || !customerData?.user_id) {
			console.error('Customer not found for subscription update:', stripeCustomerId);
			return;
		}

		// Update or insert the subscription
		try {
			// Using a type assertion to bypass the TypeScript check
			const supabaseAny = supabase as any;
			const { error: upsertError } = await supabaseAny.from('subscriptions').upsert({
				user_id: customerData.user_id,
				stripe_subscription_id: subscription.id,
				stripe_customer_id: stripeCustomerId as string,
				status: subscription.status,
				price_id: subscription.items.data[0].price.id,
				quantity: subscription.items.data[0].quantity || 1,
				cancel_at_period_end: subscription.cancel_at_period_end,
				current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
				current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
				created_at: new Date(subscription.created * 1000).toISOString(),
				updated_at: new Date().toISOString()
			});

			if (upsertError) {
				console.error('Error updating subscription:', upsertError);
			}
		} catch (err) {
			console.error('Error updating subscription in database:', err);
		}
	},

	/**
	 * Delete a subscription from the database
	 */
	async deleteSubscription(
		stripe: Stripe | null,
		supabase: SupabaseClient<Database>,
		subscription: Stripe.Subscription
	) {
		// Get the customer ID from the subscription
		const { customer: stripeCustomerId } = subscription;

		// Find the user ID from the customer ID
		const { data: customerData, error: customerError } = await supabase
			.from('customers')
			.select('user_id')
			.eq('stripe_customer_id', stripeCustomerId as string)
			.single();

		if (customerError || !customerData?.user_id) {
			console.error('Customer not found for subscription deletion:', stripeCustomerId);
			return;
		}

		// Update the subscription status to canceled
		try {
			// Using a type assertion to bypass the TypeScript check
			const supabaseAny = supabase as any;
			const { error: updateError } = await supabaseAny
				.from('subscriptions')
				.update({
					status: 'canceled',
					updated_at: new Date().toISOString()
				})
				.eq('stripe_subscription_id', subscription.id);

			if (updateError) {
				console.error('Error marking subscription as canceled:', updateError);
			}
		} catch (err) {
			console.error('Error updating subscription status in database:', err);
		}
	}
};
