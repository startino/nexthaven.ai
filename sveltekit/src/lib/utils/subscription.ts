import { redirect } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequestEvent } from '@sveltejs/kit';
import { isAnonymousUser } from '$lib/supabase/auth';

// Define subscription status interface
export interface SubscriptionStatus {
	isActive: boolean;
	planId?: string;
	planName?: string;
	currentPeriodEnd?: string;
	isInTrial?: boolean;
	trialEnd?: string;
	isAnonymous?: boolean;
}

/**
 * Activates a free trial for a user
 * This creates a record that keeps track of when the trial started and when it will end
 * Will not create a trial for anonymous users
 */
export async function activateFreeTrial(
	supabase: SupabaseClient,
	userId: string,
	trialDays: number = 14,
	skipAnonymousCheck: boolean = false
): Promise<boolean> {
	// Log every trial activation attempt for debugging
	console.log(`Trial activation attempt for user: ${userId}, skipCheck: ${skipAnonymousCheck}`);

	try {
		// Skip anonymous check if requested (for convertAnonymousUser which already checks)
		if (!skipAnonymousCheck) {
			// First try to check with admin API
			try {
				const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

				if (!userError && userData?.user) {
					const metadata = userData.user.user_metadata || {};
					console.log('User metadata for trial check (admin API):', JSON.stringify(metadata));

					// Check for anonymous indicators in metadata
					if (metadata.is_anonymous === true || metadata.provider === 'anonymous') {
						console.log('Skipping trial activation for anonymous user (admin check):', userId);
						return false;
					}
				}
			} catch (adminError) {
				console.log('Admin API not available for trial check, using fallback');

				// Fallback: Check the current session
				const {
					data: { session }
				} = await supabase.auth.getSession();
				if (session?.user && session.user.id === userId) {
					const metadata = session.user.user_metadata || {};
					console.log('User metadata for trial check (session):', JSON.stringify(metadata));

					if (metadata.is_anonymous === true || metadata.provider === 'anonymous') {
						console.log('Skipping trial activation for anonymous user (session check):', userId);
						return false;
					}
				}
			}
		}

		// Calculate trial end date (14 days from now by default)
		const now = new Date();
		const trialEndDate = new Date(now);
		trialEndDate.setDate(now.getDate() + trialDays);

		// Check if user already has a trial record
		const { data: existingTrial, error: queryError } = await supabase
			.from('user_trials')
			.select('*')
			.eq('user_id', userId)
			.single();

		if (!queryError && existingTrial) {
			console.log('User already has a trial record:', existingTrial);
			return true; // Trial already exists
		}

		// Create a trial record
		const { error: insertError } = await supabase.from('user_trials').insert({
			user_id: userId,
			trial_start: now.toISOString(),
			trial_end: trialEndDate.toISOString(),
			is_active: true
		});

		if (insertError) {
			console.error('Error activating free trial:', insertError);
			return false;
		}

		console.log('Successfully activated trial for user:', userId);
		return true;
	} catch (error) {
		console.error('Error in activateFreeTrial:', error);
		return false;
	}
}

// These are just type definitions for the server functions
// The actual implementations live in $lib/server/subscription
export type CheckSubscriptionStatus = (
	supabase: SupabaseClient,
	userId: string
) => Promise<SubscriptionStatus>;

export type IsEligibleForTrial = (supabase: SupabaseClient, userId: string) => Promise<boolean>;

// These are stubs that will be populated with the real implementations when imported in server code
export let checkSubscriptionStatus: CheckSubscriptionStatus;
export let isEligibleForTrial: IsEligibleForTrial;
