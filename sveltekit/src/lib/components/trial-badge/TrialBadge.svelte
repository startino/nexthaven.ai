<script lang="ts">
	import { Crown } from "lucide-svelte";

	let { trialEndDate, variant = 'small' as 'small' | 'large' } = $props();
	
	// Calculate days remaining in trial using a more reliable method
	let daysRemaining = $state(0);
	
	$effect(() => {
		if (!trialEndDate) return;
		
		const now = new Date();
		const endDate = new Date(trialEndDate);
		
		// Set both dates to midnight to get full days
		const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const endDateMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
		
		// Get difference in milliseconds and convert to days
		const diffTime = endDateMidnight.getTime() - nowDate.getTime();
		const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
		
		// Ensure we don't show negative days
		daysRemaining = Math.max(0, diffDays);
	});
</script>

{#if variant === 'small'}
	<a 
		href="/subscription" 
		class="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-medium hover:bg-primary/30 transition-colors"
	>
		<Crown size={14} class="text-primary mr-2" /> {daysRemaining} day{daysRemaining === 1 ? '' : 's'} left in trial
	</a>
{:else}
	<a 
		href="/subscription"
		class="flex flex-col items-start text-left justify-center rounded-lg hover:opacity-90 transition-opacity"
	>
		<p class="text-lg font-bold"> {daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining</p>
		<p class="text-sm ">Subscribe to continue access after trial ends</p>
	</a>
{/if} 