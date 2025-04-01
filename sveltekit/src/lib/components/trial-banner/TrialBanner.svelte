<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { isAnonymousUser } from "$lib/supabase/auth";
	import { goto } from "$app/navigation";
	
	interface SubscriptionStatus {
		isActive: boolean;
		planId?: string;
		planName?: string;
		currentPeriodEnd?: string;
		isInTrial?: boolean;
		trialEnd?: string;
	}
	
	let { subscriptionStatus, userEmail, hasExpiredTrial = false } = $props<{
		subscriptionStatus: SubscriptionStatus | null; 
		userEmail: string | null;
		hasExpiredTrial?: boolean;
	}>();
	
	let daysRemaining = $state(0);
	let showBanner = $state(false);
	
	$effect(() => {
		// Always show the banner if they have an expired trial
		if (hasExpiredTrial) {
			showBanner = true;
			return;
		}
		
		if (!subscriptionStatus?.isInTrial || !subscriptionStatus?.trialEnd) {
			showBanner = false;
			return;
		}
		
		// For anonymous users, we still need at least their email to identify them
		if (!userEmail) {
			showBanner = false;
			return;
		}
		
		// Calculate days remaining
		const now = new Date();
		const endDate = new Date(subscriptionStatus.trialEnd);
		const diffTime = endDate.getTime() - now.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		
		daysRemaining = Math.max(0, diffDays);
		
		// Only show banner if there are 7 or fewer days remaining
		showBanner = daysRemaining <= 7;
	});
	
	function handleSignUp() {
		goto('/signup?convert=true');
	}
</script>

{#if showBanner}
	<div class="w-full {hasExpiredTrial ? 'bg-red-500/10 border-red-500/30' : 'bg-primary/20 border-primary/30'} border-y py-2 px-4">
		<div class="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				{#if hasExpiredTrial}
					<span class="text-red-400 font-semibold">
						Your trial has expired
					</span>
					<span class="text-sm hidden sm:inline">- You still have access to basic features, but sign up to unlock premium features</span>
				{:else if daysRemaining <= 2}
					<span class="text-red-500 font-semibold">
						{daysRemaining === 0 ? 'Your trial ends today!' : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left in your trial!`}
					</span>
					<span class="text-sm hidden sm:inline">- Sign up now to keep your data and settings</span>
				{:else}
					<span class="text-primary font-semibold">
						{daysRemaining} days left in your trial
					</span>
					<span class="text-sm hidden sm:inline">- Sign up now to keep your data and settings</span>
				{/if}
			</div>
			<Button onclick={handleSignUp} size="sm" variant={hasExpiredTrial ? "destructive" : "default"}>
				{hasExpiredTrial ? 'Upgrade Now' : 'Sign Up Now'}
			</Button>
		</div>
	</div>
{/if} 