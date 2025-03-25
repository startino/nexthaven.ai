import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { SECRET_STRIPE_KEY } from '$env/static/private';
import { PUBLIC_SITE_URL } from '$env/static/public';

// Initialize Stripe with secret key
const stripe = new Stripe(SECRET_STRIPE_KEY, {
	apiVersion: '2025-02-24.acacia'
});

export const POST: RequestHandler = async ({ locals }) => {
	// Ensure user is authenticated
	const userSession = await locals.getSession();
	if (!userSession?.user) {
		error(401, 'Unauthorized');
	}

	try {
		// Get the customer ID
		const { data: customerData, error: customerError } = await locals.supabase
			.from('customers')
			.select('stripe_customer_id')
			.eq('user_id', userSession.user.id)
			.single();

		if (customerError || !customerData?.stripe_customer_id) {
			error(400, 'Customer not found');
		}

		let stripeCustomerId = customerData.stripe_customer_id;

		// Verify the customer exists in Stripe
		try {
			await stripe.customers.retrieve(stripeCustomerId);
		} catch (stripeErr) {
			// If the customer doesn't exist in Stripe, we'll create a new one
			if (
				stripeErr instanceof Stripe.errors.StripeError &&
				stripeErr.type === 'StripeInvalidRequestError' &&
				(stripeErr.raw as any)?.code === 'resource_missing'
			) {
				console.log('Customer exists in DB but not in Stripe, creating a new one');

				// Create a new customer in Stripe with data from the session
				const customer = await stripe.customers.create({
					email: userSession.user.email,
					name: userSession.user.user_metadata?.full_name,
					metadata: {
						user_id: userSession.user.id
					}
				});

				// Update the customer ID in the database
				const { error: updateError } = await locals.supabase
					.from('customers')
					.update({ stripe_customer_id: customer.id })
					.eq('user_id', userSession.user.id);

				if (updateError) {
					console.error('Error updating customer ID:', updateError);
					error(500, 'Failed to update customer');
				}

				stripeCustomerId = customer.id;
			} else {
				// If it's another type of error, just rethrow it
				throw stripeErr;
			}
		}

		// Base URL for return
		const baseUrl = PUBLIC_SITE_URL || 'http://localhost:5173';

		// Create portal session directly with the customer ID
		const portalSession = await stripe.billingPortal.sessions.create({
			customer: stripeCustomerId,
			return_url: `${baseUrl}/subscription`
		});

		return json({ url: portalSession.url });
	} catch (err) {
		console.error('Error creating customer portal session:', err);
		error(500, 'Failed to create customer portal session');
	}
};
