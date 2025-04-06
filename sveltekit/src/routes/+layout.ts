import { createSupabaseBrowserClient } from '$lib/supabase';
import { signInAnonymously } from '$lib/supabase/auth';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import type { LayoutLoad } from './$types';
import { ANONYMOUS_SEARCH_LIMIT } from '$lib/utils/anonymousSearch';
import posthog from 'posthog-js'

// Importing anonymousSearch utilities - will be created if they don't exist
import {
	ensureCompleteAnonymousSearchInfo,
	getDefaultAnonymousSearchInfo
} from './search/anonymousSearch';

export const load: LayoutLoad = async ({ data, depends, url }) => {
	depends('supabase:auth');
	depends('subscription:status');

	if (browser) {
		posthog.init(
			'phc_i8XkSi2R4IeHgpZoLAzk65Rf4KtJd7FvLT9FgWEN8EE',
			{ api_host: 'https://us.i.posthog.com' }
		)
	}

	// Check if this is a page refresh specifically for anonymous search info
	const isRefreshForAnonInfo = url.searchParams.has('refresh_anon_info');
	if (isRefreshForAnonInfo && browser) {
		// Remove the parameter to keep the URL clean
		const cleanUrl = new URL(window.location.href);
		cleanUrl.searchParams.delete('refresh_anon_info');
		window.history.replaceState({}, '', cleanUrl.toString());
		console.log('Detected page refresh for anonymous search info');
	}

	const supabase = createSupabaseBrowserClient();

	const {
		data: { session }
	} = await supabase.auth.getSession();

	// Add a loading state that can be passed to the layout
	let isSigningInAnonymously = false;

	// Handle missing session in browser by auto-signing in anonymously
	if (browser && !session) {
		// Skip auto-sign-in for auth routes (login, signup, etc.)
		const isAuthRoute =
			url.pathname.startsWith('/login') ||
			url.pathname.startsWith('/signup') ||
			url.pathname.startsWith('/auth/') ||
			url.pathname.startsWith('/forgot-password') ||
			url.pathname.startsWith('/reset-password');

		if (!isAuthRoute) {
			console.log('No session found, signing in anonymously...');

			// Set loading state immediately
			isSigningInAnonymously = true;

			try {
				const { user, session: anonSession, error } = await signInAnonymously();

				if (error) {
					console.error('Error signing in anonymously:', error);
					// Keep isSigningInAnonymously true so UI can show appropriate message
				} else if (anonSession) {
					console.log('Successfully signed in anonymously');

					// Return data for the time before the refresh happens
					return {
						supabase,
						session: anonSession,
						subscriptionStatus: data.subscriptionStatus,
						isAnonymous: true,
						isSigningInAnonymously: true,
						hasExpiredTrial: data.hasExpiredTrial,
						isTrialEligible: data.isTrialEligible,
						// Pass a default anonymousSearchInfo for new anonymous users
						anonymousSearchInfo: getDefaultAnonymousSearchInfo(true)
					};
				}
			} catch (err) {
				console.error('Failed to sign in anonymously:', err);
				// Don't reset isSigningInAnonymously here - let layout handle timing
			}
		}
	}

	// Pass the anonymous flag from server to client
	const isAnonymous = data.isAnonymous || false;

	// Ensure anonymousSearchInfo is always defined using our utility
	const anonymousSearchInfo = ensureCompleteAnonymousSearchInfo(
		data.anonymousSearchInfo,
		isAnonymous
	);

	// Log what we're passing to components
	console.log('layout.ts anonymousSearchInfo:', anonymousSearchInfo);

	return {
		supabase,
		session: session || data.session,
		subscriptionStatus: data.subscriptionStatus,
		isTrialEligible: data.isTrialEligible,
		hasExpiredTrial: data.hasExpiredTrial,
		isAnonymous,
		isSigningInAnonymously,
		anonymousSearchInfo
	};
};
