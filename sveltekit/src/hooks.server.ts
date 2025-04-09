import { createSupabaseServerClient } from '$lib/supabase/server';
import { redirect, type Handle } from '@sveltejs/kit';
import { checkSubscriptionStatus, isEligibleForTrial } from '$lib/server/subscription';
import { isAnonymousUser } from '$lib/supabase/auth';
import { signInAnonymously } from '$lib/supabase/auth';
import { checkAnonymousSearchLimit } from '$lib/utils/anonymousSearch';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SECRET_STRIPE_KEY } from '$env/static/private';
import Stripe from 'stripe';
import { PRIVATE_SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_GOOGLE_MAPS_API_KEY } from '$env/static/public';

// Initialize Stripe with the secret key once for the entire server
const stripe = SECRET_STRIPE_KEY
	? new Stripe(SECRET_STRIPE_KEY, {
			apiVersion: '2025-02-24.acacia'
		})
	: null;

// Define public routes that don't require authentication
const publicRoutes = [
	'/login',
	'/signup',
	'/forgot-password',
	'/reset-password',
	'/auth/callback',
	'/auth/confirm'
];

// Define routes that are exempt from subscription checks
const subscriptionExemptRoutes = [
	'/subscription',
	'/account',
	'/logout',
	'/legal',
	'/privacy',
	'/terms'
];

// Define premium routes that require a valid subscription or active trial
const premiumRoutes = ['/premium-features', '/export', '/advanced-settings'];

/**
 * Checks if a user was converted from anonymous to permanent account
 * This is more reliable than just checking metadata because it reads from the database
 */
async function checkIfUserWasConverted(supabase: SupabaseClient, userId: string): Promise<boolean> {
	try {
		// Attempt to get user with admin API (may not be available in all environments)
		try {
			const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

			if (!userError && userData?.user) {
				// Check if conversion metadata exists in user_metadata
				const metadata = userData.user.user_metadata || {};
				console.log('User metadata for conversion check (admin API):', JSON.stringify(metadata));

				// Check for explicit conversion indicators
				if (metadata.is_anonymous === false && metadata.converted_at) {
					console.log('Authentication data confirms user was converted:', userId);
					return true;
				}
			}
		} catch (adminApiError) {
			console.log('Admin API not available, falling back to session data:', adminApiError);
		}

		// Fallback: Check the current session metadata
		const {
			data: { session }
		} = await supabase.auth.getSession();
		if (session?.user && session.user.id === userId) {
			const metadata = session.user.user_metadata || {};
			console.log('User metadata for conversion check (session):', JSON.stringify(metadata));

			if (metadata.is_anonymous === false && metadata.converted_at) {
				console.log('Session data confirms user was converted:', userId);
				return true;
			}
		}

		return false;
	} catch (error) {
		console.error('Unexpected error in checkIfUserWasConverted:', error);
		return false;
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	// Create supabase server client
	event.locals.supabase = await createSupabaseServerClient({
		cookies: event.cookies,
		fetch: event.fetch,
		serviceRoleKey: PRIVATE_SUPABASE_SERVICE_ROLE_KEY
	});

	// Add Stripe instance to locals
	event.locals.stripe = stripe;

	// Add getSession method for backward compatibility
	event.locals.getSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		return session;
	};

	// Get session from supabase
	const {
		data: { session }
	} = await event.locals.supabase.auth.getSession();

	// Handle auth state
	if (!session) {
		event.locals.session = null;
		event.locals.subscriptionStatus = { isActive: false };
		event.locals.isTrialEligible = true;
		event.locals.isAnonymous = false;

		// For non-public routes, sign in anonymously instead of redirecting to login
		const isPublicRoute = publicRoutes.some((route) => event.url.pathname.startsWith(route));

		if (!isPublicRoute) {
			// Don't redirect to login, we'll handle this in the client
			// The client-side will sign in anonymously on protected routes
			console.log('Anonymous access to protected route:', event.url.pathname);
		}
	} else {
		event.locals.session = session;

		// Check if the user is anonymous - with multiple verification steps
		const userMetadata = session.user.user_metadata || {};
		console.log('User metadata in hooks.server.ts:', JSON.stringify(userMetadata));

		// First: Check database for conversion history
		const wasConverted = await checkIfUserWasConverted(event.locals.supabase, session.user.id);

		if (wasConverted) {
			// If database confirms conversion, user is definitely not anonymous
			console.log('User verified as converted in database:', session.user.id);
			event.locals.isAnonymous = false;
		} else {
			// Second: Check metadata for explicit conversion
			const explicitlyConverted = userMetadata.is_anonymous === false && userMetadata.converted_at;
			if (explicitlyConverted) {
				console.log('User explicitly marked as converted in session metadata:', session.user.id);
				event.locals.isAnonymous = false;
			} else {
				// Last resort: Use regular anonymous detection
				// However, if the metadata explicitly says is_anonymous: false, respect that
				if (userMetadata.is_anonymous === false) {
					console.log('User metadata explicitly marks user as non-anonymous');
					event.locals.isAnonymous = false;
				} else {
					const isAnonymous = isAnonymousUser(session.user);
					console.log(
						`User ${session.user.id} anonymous status from isAnonymousUser:`,
						isAnonymous
					);
					event.locals.isAnonymous = isAnonymous;
				}
			}
		}

		// Handle anonymous users differently - they don't have trials, just limited searches
		if (event.locals.isAnonymous) {
			console.log('HOOKS: User is anonymous, checking search limits', session.user.id);

			// Check if anonymous user has reached their search limit
			const anonymousSearchInfo = await checkAnonymousSearchLimit(
				event.locals.supabase,
				session.user
			);

			console.log('HOOKS: Anonymous search info:', JSON.stringify(anonymousSearchInfo));

			// Set subscription status based on search limit
			// Anonymous users with remaining searches can access the app
			event.locals.subscriptionStatus = {
				isActive: true, // Set to true to allow basic access
				isAnonymous: true // Add flag to indicate anonymous status
			};

			// Store anonymous search info for use in route handlers
			event.locals.anonymousSearchInfo = anonymousSearchInfo;

			// Not eligible for trial - they would need to convert to permanent account
			event.locals.isTrialEligible = false;
			event.locals.hasExpiredTrial = false;

			console.log('HOOKS: Anonymous user can access search page');
		} else {
			// For regular authenticated users, check subscription
			const isSubscriptionExemptRoute = subscriptionExemptRoutes.some((route) =>
				event.url.pathname.startsWith(route)
			);

			// Clear any anonymousSearchInfo that might be lingering from a previous anonymous session
			// This ensures that converted users don't have any search limitations
			event.locals.anonymousSearchInfo = {
				isAnonymous: false,
				hasReachedLimit: false,
				remainingSearches: Infinity,
				searchCount: 0
			};

			// Check if this user was recently converted from anonymous (has converted_at in metadata)
			// If so, reset their search count in the database to ensure they don't hit limits
			const userMetadata = session.user.user_metadata || {};
			if (userMetadata.converted_at) {
				try {
					// Only do this once by checking if this is a recent conversion (within the last day)
					const convertedDate = new Date(userMetadata.converted_at);
					const oneDayAgo = new Date();
					oneDayAgo.setDate(oneDayAgo.getDate() - 1);

					if (convertedDate > oneDayAgo) {
						// This is a recently converted user, make sure their search count is reset
						import('$lib/utils/anonymousSearch').then(({ resetAnonymousSearchCount }) => {
							resetAnonymousSearchCount(event.locals.supabase, session.user.id).catch((err) =>
								console.error('Error resetting search count for converted user:', err)
							);
						});
					}
				} catch (error) {
					console.error('Error checking conversion date:', error);
				}
			}

			// Skip subscription check for exempt routes
			if (!isSubscriptionExemptRoute) {
				event.locals.subscriptionStatus = await checkSubscriptionStatus(
					event.locals.supabase,
					session.user.id,
					event.locals.stripe
				);

				// If subscription is not active, check if this is a premium route
				if (!event.locals.subscriptionStatus.isActive) {
					const isPremiumRoute = premiumRoutes.some((route) =>
						event.url.pathname.startsWith(route)
					);

					if (isPremiumRoute) {
						// Redirect premium routes to subscription page
						redirect(303, `/subscription?redirectTo=${encodeURIComponent(event.url.pathname)}`);
					}
				}

				// Set trial expiration flag for UI elements
				event.locals.hasExpiredTrial =
					event.locals.subscriptionStatus.isInTrial === false &&
					!event.locals.subscriptionStatus.isActive;
			} else {
				// For exempt routes, set default subscription status
				event.locals.subscriptionStatus = { isActive: true };
				event.locals.hasExpiredTrial = false;
			}

			// Check trial eligibility for authenticated users
			event.locals.isTrialEligible = await isEligibleForTrial(
				event.locals.supabase,
				session.user.id
			);
		}
	}

	// Get the response from downstream
	const response = await resolve(event);

	// Only process HTML responses
	const contentType = response.headers.get('content-type');
	if (contentType?.includes('text/html')) {
		// Get the response text
		const text = await response.text();

		// Replace the Google Maps API key placeholder
		const modifiedHtml = text.replace(
			'GOOGLE_MAPS_API_KEY_PLACEHOLDER',
			PUBLIC_GOOGLE_MAPS_API_KEY || ''
		);

		// Return new response with modified HTML
		return new Response(modifiedHtml, {
			status: response.status,
			headers: response.headers
		});
	}

	return response;
};
