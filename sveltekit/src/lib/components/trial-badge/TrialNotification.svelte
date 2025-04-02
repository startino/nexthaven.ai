<script lang="ts">
	import { Calendar, Clock, Check } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';
	
	let { 
		trialEndDate, 
		variant = 'banner' as 'banner' | 'card',
		showManageButton = true
	} = $props();
	
	// Calculate days remaining in trial - not using $derived due to type comparison issues
	let daysRemaining = 0;
	
	$effect(() => {
		if (!trialEndDate) return;
		
		// Set both dates to midnight for more accurate day calculation
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		
		const endDate = new Date(trialEndDate);
		const trialEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
		
		// Calculate difference in days
		const diffTime = trialEnd.getTime() - today.getTime();
		const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
		
		// Ensure the value is not negative
		daysRemaining = Math.max(0, diffDays);
	});
	
	// Handle click on manage subscription button
	function handleManageSubscription() {
		goto('/subscription');
	}
</script>

{#if variant === 'banner'}
	<div class="w-full bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
		<div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<div class="shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
					<Clock class="h-5 w-5 text-amber-400" />
				</div>
				<div>
					<h3 class="font-semibold text-amber-400">Trial Period Active</h3>
					<p class="text-sm">
						{daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining in your free trial
					</p>
					<p class="text-xs text-amber-400/80 mt-1">You have full access to all premium features during your trial</p>
				</div>
			</div>
			
			{#if showManageButton}
				<Button variant="outline" class="border-amber-500/30 text-amber-400 hover:bg-amber-500/10" 
						on:click={handleManageSubscription}>
					Manage Subscription
				</Button>
			{/if}
		</div>
	</div>
{:else if variant === 'card'}
	<div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-5">
		<div class="flex flex-col items-center text-center gap-2 mb-3">
			<Calendar class="h-8 w-8 text-amber-400 mb-1" />
			<h3 class="font-semibold text-amber-400 text-lg">Trial Period Active</h3>
			<p>Your free trial will end in <span class="font-bold">{daysRemaining} day{daysRemaining === 1 ? '' : 's'}</span></p>
		</div>
		
		<div class="space-y-3 mb-4">
			<div class="flex items-start gap-2">
				<Check class="h-4 w-4 text-amber-400 mt-0.5" />
				<p class="text-sm">Full access to search and all premium features</p>
			</div>
			<div class="flex items-start gap-2">
				<Check class="h-4 w-4 text-amber-400 mt-0.5" />
				<p class="text-sm">Subscribe before the trial ends to maintain access</p>
			</div>
			<div class="flex items-start gap-2">
				<Check class="h-4 w-4 text-amber-400 mt-0.5" />
				<p class="text-sm">Cancel anytime during your trial</p>
			</div>
		</div>
		
		{#if showManageButton}
			<Button variant="outline" class="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
					on:click={handleManageSubscription}>
				Manage Subscription
			</Button>
		{/if}
	</div>
{/if} 