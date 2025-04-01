import { createSupabaseServerClient } from '$lib/supabase/server';
import { redirect, type Handle } from '@sveltejs/kit';
import { checkSubscriptionStatus, isEligibleForTrial } from '$lib/server/subscription';
import { isAnonymousUser } from '$lib/supabase/auth';
import { signInAnonymously } from '$lib/supabase/auth';

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

export const handle: Handle = async ({ event, resolve }) => {
	// Create supabase server client
	event.locals.supabase = await createSupabaseServerClient({
		cookies: event.cookies,
		fetch: event.fetch
	});

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

		// Check if the user is anonymous
		const isAnonymous = isAnonymousUser(session.user);
		event.locals.isAnonymous = isAnonymous;

		// Check subscription status for authenticated users
		const isSubscriptionExemptRoute = subscriptionExemptRoutes.some((route) =>
			event.url.pathname.startsWith(route)
		);

		// Skip subscription check for exempt routes
		if (!isSubscriptionExemptRoute) {
			event.locals.subscriptionStatus = await checkSubscriptionStatus(
				event.locals.supabase,
				session.user.id
			);

			// Check if the user is an anonymous user with an expired trial
			const isTrialExpired =
				isAnonymous &&
				event.locals.subscriptionStatus.isInTrial === false &&
				!event.locals.subscriptionStatus.isActive;

			// For anonymous users with expired trials, only restrict premium routes
			// but let them continue to use basic features
			if (isTrialExpired) {
				const isPremiumRoute = premiumRoutes.some((route) => event.url.pathname.startsWith(route));

				if (isPremiumRoute) {
					// Redirect premium routes to upgrade page
					redirect(
						303,
						`/signup?convert=true&redirectTo=${encodeURIComponent(event.url.pathname)}`
					);
				}

				// Set a flag that this user has an expired trial (will be used for UI prompts)
				event.locals.hasExpiredTrial = true;
			} else {
				event.locals.hasExpiredTrial = false;
			}
		} else {
			// For exempt routes, set default subscription status
			event.locals.subscriptionStatus = { isActive: true };
			event.locals.hasExpiredTrial = false;
		}

		// Check trial eligibility for authenticated users
		event.locals.isTrialEligible = await isEligibleForTrial(event.locals.supabase, session.user.id);
	}

	// Resolve the request
	const response = await resolve(event, {
		// filter() function to control serialization of privateData
		filterSerializedResponseHeaders(name) {
			return name === 'content-range';
		}
	});

	return response;
};
