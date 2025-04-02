<script lang="ts">
	import { TrialNotification } from '$lib/components/trial-badge';
	
	let { trialEndDate, isInTrial = false } = $props();
</script>

{#if isInTrial && trialEndDate}
	<TrialNotification trialEndDate={trialEndDate} variant="banner" />
{/if} 