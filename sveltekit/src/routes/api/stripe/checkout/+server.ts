import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PRICING_TIER } from '$lib/services/stripe';
import Stripe from 'stripe';
import { SECRET_STRIPE_KEY } from '$env/static/private';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { isAnonymousUser } from '$lib/supabase/auth';

// Initialize direct Stripe connection
const stripe = new Stripe(SECRET_STRIPE_KEY, {
	apiVersion: '2025-02-24.acacia'
});

export const POST: RequestHandler = async ({ request, locals }) => {
	// Ensure user is authenticated
	const userSession = await locals.getSession();
	if (!userSession?.user) {
		error(401, 'Unauthorized');
	}

	try {
		const body = await request.json();
		const { priceId, returnUrl, toltReferral, bypassAnonymousCheck } = body;

		// Check if user is anonymous, but allow bypass for specific scenarios
		if (!bypassAnonymousCheck) {
			// Check for conversion metadata first
			const isConverted =
				userSession.user.user_metadata?.converted_at ||
				userSession.user.user_metadata?.is_anonymous === false;

			// Only check if not explicitly converted
			if (!isConverted && isAnonymousUser(userSession.user)) {
				// Log detailed info for debugging
				console.warn('Blocking anonymous subscription attempt:', {
					userId: userSession.user.id,
					email: userSession.user.email,
					metadata: JSON.stringify(userSession.user.user_metadata)
				});

				error(
					403,
					'Anonymous users cannot subscribe to premium plans. Please create a permanent account first.'
				);
			}
		} else {
			console.log('Anonymous check bypassed for user:', userSession.user.id);
		}

		// Validate price ID against the options in PRICING_TIER
		const validPriceIds = PRICING_TIER.options.map((option) => option.id);
		if (!priceId || !validPriceIds.includes(priceId)) {
			error(400, 'Invalid price ID');
		}

		// Get the customer ID
		const { data: customerData, error: customerError } = await locals.supabase
			.from('customers')
			.select('stripe_customer_id')
			.eq('user_id', userSession.user.id)
			.single();

		// If no customer, create one
		let stripeCustomerId: string | null = customerData?.stripe_customer_id ?? null;
		let needsNewCustomer = customerError || !stripeCustomerId;

		// If we have a customer ID, try to verify it exists in Stripe
		if (!needsNewCustomer) {
			try {
				// Verify the customer exists in Stripe
				await stripe.customers.retrieve(stripeCustomerId!);
			} catch (stripeErr) {
				// If the customer doesn't exist in Stripe, we'll create a new one
				if (
					stripeErr instanceof Stripe.errors.StripeError &&
					stripeErr.type === 'StripeInvalidRequestError' &&
					(stripeErr.raw as any)?.code === 'resource_missing'
				) {
					console.log('Customer exists in DB but not in Stripe, creating a new one');
					needsNewCustomer = true;
				} else {
					// If it's another type of error, just rethrow it
					throw stripeErr;
				}
			}
		}

		// Create a new customer if needed
		if (needsNewCustomer) {
			// Create a new customer in Stripe with data from the session
			const customer = await stripe.customers.create({
				email: userSession.user.email,
				name: userSession.user.user_metadata?.full_name,
				metadata: {
					user_id: userSession.user.id
				}
			});

			// Update existing record or insert a new one
			const { error: upsertError } = await locals.supabase.from('customers').upsert({
				user_id: userSession.user.id,
				stripe_customer_id: customer.id
			});

			if (upsertError) {
				console.error('Error storing customer ID:', upsertError);
				error(500, 'Failed to create customer');
			}

			stripeCustomerId = customer.id;
		}

		// Base URL for success and cancel
		const baseUrl = PUBLIC_SITE_URL || 'http://localhost:5173';

		// Use provided returnUrl or default to subscription page
		const successUrl = returnUrl || `${baseUrl}/subscription?success=true`;
		const cancelUrl = `${baseUrl}/subscription?canceled=true`;

		// Prepare metadata
		const metadata: Record<string, string> = {
			user_id: userSession.user.id
		};

		// Add Tolt referral ID if provided from the client
		if (toltReferral) {
			metadata.tolt_referral = toltReferral;
		}

		// Create checkout session directly with the customer ID
		const checkoutSession = await stripe.checkout.sessions.create({
			customer: stripeCustomerId!,
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
			metadata // Include metadata with Tolt referral if available
		});

		// When user initiates checkout, deactivate any active trials immediately
		// This prevents issues in case the webhook fails or is delayed
		try {
			const { error: deactivateError } = await locals.supabase
				.from('user_trials')
				.update({ is_active: false })
				.eq('user_id', userSession.user.id);

			if (deactivateError) {
				console.warn(
					'Warning: Could not deactivate existing trials during checkout:',
					deactivateError
				);
			} else {
				console.log(
					'Successfully deactivated trials for user initiating checkout:',
					userSession.user.id
				);
			}
		} catch (trialError) {
			console.error('Error deactivating trials during checkout:', trialError);
			// Continue anyway - don't fail checkout just because trial deactivation failed
		}

		return json({ url: checkoutSession.url });
	} catch (err) {
		console.error('Error creating checkout session:', err);
		error(500, 'Failed to create checkout session');
	}
};
