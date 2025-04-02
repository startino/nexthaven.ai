<script lang="ts">
	import { onMount } from 'svelte';
	import { getToltReferralId } from '$lib/utils/tolt';
	import { updateToltReferralId } from '$lib/stores/tolt';
	
	// Update the store whenever the component mounts (client-side only)
	onMount(() => {
		// Set a timeout to ensure Tolt script has fully loaded
		const checkToltInterval = setInterval(() => {
			const referralId = getToltReferralId();
			if (referralId) {
				updateToltReferralId(referralId);
				clearInterval(checkToltInterval);
				console.log('Tolt referral ID captured:', referralId);
			}
		}, 1000);
		
		// Clear the interval after 10 seconds if no referral ID is found
		setTimeout(() => {
			clearInterval(checkToltInterval);
		}, 10000);
	
		return () => {
			clearInterval(checkToltInterval);
		};
	});
</script>

<!-- This is an invisible component that only manages the Tolt integration --> 