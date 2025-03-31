import { writable } from 'svelte/store';

// Create a store for the Tolt referral ID
export const toltReferralId = writable<string | undefined>(undefined);

// Function to update the Tolt referral ID
export function updateToltReferralId(id: string | undefined) {
	toltReferralId.set(id);
}

// Function to get the current Tolt referral ID synchronously 
// (useful for API calls where you can't use $store syntax)
let currentReferralId: string | undefined = undefined;
toltReferralId.subscribe(value => {
	currentReferralId = value;
});

export function getCurrentToltReferralId(): string | undefined {
	return currentReferralId;
} 