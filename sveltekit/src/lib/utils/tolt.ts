/**
 * Tolt affiliate tracking utilities
 */

/**
 * Get the Tolt referral ID from the window object
 * This should be called client-side only
 */
export function getToltReferralId(): string | undefined {
	// Check if we're in a browser environment
	if (typeof window === 'undefined') {
		return undefined;
	}

	// Access the window.tolt_referral property
	return (window as any).tolt_referral;
}

/**
 * Prepares metadata for Stripe checkout including Tolt referral ID if available
 * @param additionalMetadata - Any additional metadata to include
 * @returns An object with all metadata including Tolt referral if present
 */
export function prepareToltMetadata(additionalMetadata: Record<string, string> = {}): Record<string, string> {
	const metadata = { ...additionalMetadata };
	
	// Add Tolt referral ID if available
	const referralId = getToltReferralId();
	if (referralId) {
		metadata.tolt_referral = referralId;
	}
	
	return metadata;
} 