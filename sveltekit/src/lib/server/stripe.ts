import { SECRET_STRIPE_KEY } from '$env/static/private';
import Stripe from 'stripe';
import { error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database.types';
import { PRICING_TIER } from '$lib/services/stripe';

// Initialize Stripe with secret key
const stripe = new Stripe(SECRET_STRIPE_KEY, {
	apiVersion: '2025-02-24.acacia'
});

export const stripeServer = {
	/**
	 * Ensure user has a Stripe customer ID
	 */
	async ensureCustomer(supabase: SupabaseClient<Database>, userId: string): Promise<string> {
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

			if (userError || !userData?.user) {
				throw error(400, 'User not found');
			}

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
				stripe_customer_id: customer.id,
				email: userData.user.email
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
	 * Get a user's subscription status
	 */
	async getSubscriptionStatus(supabase: SupabaseClient<Database>, userId: string) {
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
	 * Create a checkout session for a subscription
	 */
	async createCheckoutSession(supabase: SupabaseClient<Database>, userId: string, priceId: string) {
		try {
			// Ensure customer exists
			const customerId = await this.ensureCustomer(supabase, userId);

			// Create checkout session
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
				success_url: `${process.env.PUBLIC_SUPABASE_URL}/subscription?success=true`,
				cancel_url: `${process.env.PUBLIC_SUPABASE_URL}/subscription?canceled=true`
			});

			return { url: session.url };
		} catch (err) {
			console.error('Error creating checkout session:', err);
			throw error(500, 'Failed to create checkout session');
		}
	},

	/**
	 * Create a customer portal session
	 */
	async createCustomerPortalSession(supabase: SupabaseClient<Database>, userId: string) {
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
			const session = await stripe.billingPortal.sessions.create({
				customer: customerData.stripe_customer_id,
				return_url: `${process.env.PUBLIC_SUPABASE_URL}/subscription`
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
	async handleWebhookEvent(supabase: SupabaseClient<Database>, event: Stripe.Event) {
		const { type, data } = event;

		console.log(`Processing webhook event: ${type}`);

		switch (type) {
			case 'customer.subscription.created':
			case 'customer.subscription.updated':
				const subscription = data.object as Stripe.Subscription;
				await this.updateSubscriptionStatus(supabase, subscription);
				break;

			case 'customer.subscription.deleted':
				const deletedSubscription = data.object as Stripe.Subscription;
				await this.deleteSubscription(supabase, deletedSubscription);
				break;
		}

		return { received: true };
	},

	/**
	 * Update subscription status in the database
	 */
	async updateSubscriptionStatus(
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
		const { error: upsertError } = await supabase.from('subscriptions').upsert({
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
	},

	/**
	 * Delete a subscription from the database
	 */
	async deleteSubscription(supabase: SupabaseClient<Database>, subscription: Stripe.Subscription) {
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
		const { error: updateError } = await supabase
			.from('subscriptions')
			.update({
				status: 'canceled',
				updated_at: new Date().toISOString()
			})
			.eq('stripe_subscription_id', subscription.id);

		if (updateError) {
			console.error('Error marking subscription as canceled:', updateError);
		}
	}
};
