import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { SECRET_STRIPE_KEY } from '$env/static/private';
import { PUBLIC_SITE_URL } from '$env/static/public';

// Initialize Stripe
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
		const { returnUrl } = body;

		// Get customer ID from our database
		const { data: customerData, error: customerError } = await locals.supabase
			.from('customers')
			.select('stripe_customer_id')
			.eq('user_id', userSession.user.id)
			.single();

		// Handle customer not found
		if (customerError || !customerData?.stripe_customer_id) {
			// If customer doesn't exist, create a new customer
			const customer = await stripe.customers.create({
				email: userSession.user.email,
				name: userSession.user.user_metadata?.full_name,
				metadata: {
					user_id: userSession.user.id
				}
			});

			// Insert customer record
			const { error: upsertError } = await locals.supabase.from('customers').upsert({
				user_id: userSession.user.id,
				stripe_customer_id: customer.id
			});

			if (upsertError) {
				console.error('Error storing customer ID:', upsertError);
				error(500, 'Failed to create customer');
			}

			// Since this is a new customer with no subscription, just redirect to the subscription page
			return json({ url: `${PUBLIC_SITE_URL || 'http://localhost:5173'}/subscription` });
		}

		// Base URL for return
		const baseUrl = PUBLIC_SITE_URL || 'http://localhost:5173';

		// Use provided returnUrl or default to subscription page
		const portalReturnUrl = returnUrl || `${baseUrl}/subscription`;

		// Create portal session
		const session = await stripe.billingPortal.sessions.create({
			customer: customerData.stripe_customer_id,
			return_url: portalReturnUrl
		});

		return json({ url: session.url });
	} catch (err) {
		console.error('Error creating portal session:', err);
		error(500, 'Failed to create portal session');
	}
};
