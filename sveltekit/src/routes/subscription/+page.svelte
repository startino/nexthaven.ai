<script lang="ts">
	import { page } from '$app/stores';
	import { stripeService, PRICING_TIER } from '$lib/services/stripe';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { CheckCircle, AlertCircle, Crown, ArrowRight } from 'lucide-svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { goto } from '$app/navigation';

	// Get data from server
	let { data } = $props();
	
	// Subscription status
	let isSubscribed = $state(data.subscriptionStatus?.isActive || false);
	let planName = $state(data.subscriptionStatus?.planName || '');
	let currentPeriodEnd = $state(data.subscriptionStatus?.currentPeriodEnd
		? new Date(data.subscriptionStatus.currentPeriodEnd).toLocaleDateString()
		: '');
	let isLoading = $state(false);
	let billingPeriod = $state('monthly'); // Default to monthly
	let isSuccess = $page.url.searchParams.get('success') === 'true';
	let isCanceled = $page.url.searchParams.get('canceled') === 'true';
	
	// Get redirect destination (if any)
	let redirectTo = $state($page.url.searchParams.get('redirectTo') || '/search');

	// Get current option based on billing period
	let currentOption = $derived(PRICING_TIER.options.find(option => option.period === billingPeriod) || PRICING_TIER.options[0]);

	// Calculate savings for yearly plan
	let yearlySavings = $derived(billingPeriod === 'yearly' ? PRICING_TIER.options.find(option => option.period === 'yearly')?.savingsAmount || 0 : 0);

	// Handle subscription checkout
	async function handleSubscribe() {
		isLoading = true;
		try {
			const result = await stripeService.createCheckoutSession({
				priceId: currentOption.id,
				returnUrl: window.location.origin + '/subscription?success=true' + (redirectTo ? `&redirectTo=${encodeURIComponent(redirectTo)}` : '')
			});
			
			if (result.url) {
				window.location.href = result.url;
			} else if (result.error) {
				console.error('Error creating checkout session:', result.error);
				isLoading = false;
			}
		} catch (error) {
			console.error('Error creating checkout session:', error);
			isLoading = false;
		}
	}

	// Handle managing existing subscription
	async function handleManageSubscription() {
		isLoading = true;
		try {
			const result = await stripeService.createPortalSession({
				returnUrl: window.location.origin + '/subscription' + (redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : '')
			});
			
			if (result.url) {
				window.location.href = result.url;
			} else if (result.error) {
				console.error('Error creating portal session:', result.error);
				isLoading = false;
			}
		} catch (error) {
			console.error('Error creating portal session:', error);
			isLoading = false;
		}
	}
	
	// Handle returning to the original page if subscription is active
	function handleContinue() {
		goto(redirectTo);
	}
	
	// Effect to check for redirectTo in URL params when the page loads or changes
	$effect(() => {
		const urlRedirectTo = $page.url.searchParams.get('redirectTo');
		if (urlRedirectTo) {
			redirectTo = urlRedirectTo;
		}
	});

	// Check if we should automatically redirect after subscription
	$effect(() => {
		// If success parameter is present and user is subscribed, redirect to the stored destination
		if (isSuccess && isSubscribed && redirectTo) {
			// Short timeout to allow user to see success message
			setTimeout(() => {
				goto(redirectTo);
			}, 2000);
		}
	});
</script>

<svelte:head>
	<title>Premium Subscription</title>
</svelte:head>

<div class="container mx-auto py-12 px-4">
	<div class="max-w-4xl mx-auto">
		<h1 class="text-3xl font-bold mb-8">Premium Subscription</h1>
		
		{#if isSuccess}
			<div class="bg-green-100 p-4 rounded-md flex items-center space-x-2 mb-8 text-green-800">
				<CheckCircle class="h-5 w-5" />
				<span>Thank you for subscribing! Your subscription is now active.</span>
			</div>
		{:else if isCanceled}
			<div class="bg-amber-100 p-4 rounded-md flex items-center space-x-2 mb-8 text-amber-800">
				<AlertCircle class="h-5 w-5" />
				<span>Your checkout session was canceled. Feel free to try again when you're ready.</span>
			</div>
		{/if}

		{#if isLoading}
			<div class="text-center py-8">
				<div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
				<p class="mt-2">Processing your request...</p>
			</div>
		{:else if isSubscribed}
			<!-- Content for subscribed users -->
			<div class="mx-auto max-w-3xl p-6 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-xl shadow-xl border border-indigo-500/20">
				<div class="text-center mb-6">
					<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 mb-4">
						<Crown class="h-8 w-8 text-white" />
					</div>
					<h2 class="text-2xl font-bold mb-2">Premium Subscription Active</h2>
					<p class="text-indigo-200 mb-2">You have access to all premium features!</p>
					{#if planName}
						<p class="text-sm text-indigo-300">Plan: {planName}</p>
					{/if}
					{#if currentPeriodEnd}
						<p class="text-sm text-indigo-300 mb-4">Current period ends: {currentPeriodEnd}</p>
					{/if}
					{#if isSuccess}
						<div class="mt-4 p-3 bg-green-900/30 border border-green-500/30 rounded-lg text-green-300">
							<p>🎉 Your subscription has been activated successfully!</p>
						</div>
					{/if}
				</div>
				
				<div class="flex flex-col sm:flex-row gap-4 justify-center">
					<button 
						type="button"
						class="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md"
						on:click={handleManageSubscription}
						disabled={isLoading}
					>
						{isLoading ? 'Loading...' : 'Manage Subscription'}
					</button>
					
					<button 
						type="button"
						class="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-500 hover:to-teal-500 transition-all shadow-md flex items-center justify-center gap-2"
						on:click={handleContinue}
					>
						Continue 
						<ArrowRight size={20} />
					</button>
				</div>
			</div>
		{:else}
			<!-- Custom Billing Period Selector -->
			<div class="mb-8 flex items-center justify-center">
				<div class="w-full max-w-md">
					<div class="flex rounded-md overflow-hidden border border-border">
						<button 
							class="flex-1 py-2.5 px-4 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background {billingPeriod === 'monthly' ? 'button-gradient text-white font-semibold shadow-sm' : 'bg-black/20 hover:bg-black/30 text-muted-foreground'}"
							on:click={() => billingPeriod = 'monthly'}
						>
							Monthly
						</button>
						<button 
							class="flex-1 py-2.5 px-4 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background flex items-center justify-center gap-2 {billingPeriod === 'yearly' ? 'button-gradient text-white font-semibold shadow-sm' : 'bg-black/20 hover:bg-black/30 text-muted-foreground'}"
							on:click={() => billingPeriod = 'yearly'}
						>
							Yearly
							{#if PRICING_TIER.options.length > 1 && PRICING_TIER.options[1]?.savingsAmount && PRICING_TIER.options[1].savingsAmount > 0}
								<span class="ml-1 text-xs {billingPeriod === 'yearly' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'} px-2 py-0.5 rounded-full">
									Save ${PRICING_TIER.options[1].savingsAmount}
								</span>
							{/if}
						</button>
					</div>
				</div>
			</div>

			<div class="grid gap-8 md:grid-cols-2">
				<div class="bg-black/20 border border-border p-6 rounded-lg">
					<div class="flex items-center gap-3 mb-4">
						<div class="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
							<Crown size={24} class="text-muted-foreground" />
						</div>
						<div>
							<h2 class="text-xl font-semibold">Free Plan</h2>
							<p class="text-muted-foreground text-sm">Current plan</p>
						</div>
					</div>
					
					<ul class="space-y-3 my-6">
						<li class="flex items-center gap-2 text-sm">
							<span class="text-muted-foreground">✓</span>
							<span>Basic search functionality</span>
						</li>
						<li class="flex items-center gap-2 text-sm">
							<span class="text-muted-foreground">✓</span>
							<span>Limited results per search</span>
						</li>
						<li class="flex items-center gap-2 text-sm">
							<span class="text-muted-foreground">✓</span>
							<span>Standard search filters</span>
						</li>
					</ul>
					
					<p class="text-xl font-bold mb-6">$0<span class="text-sm text-muted-foreground font-normal">/month</span></p>
					
					<Button disabled variant="outline" class="w-full">Current Plan</Button>
				</div>

				<div class="bg-primary/5 border border-primary/20 p-6 rounded-lg relative overflow-hidden">
					<div class="absolute top-0 right-0 bg-primary/20 text-xs font-medium py-1 px-3 rounded-bl-lg">
						RECOMMENDED
					</div>
					
					<div class="flex items-center gap-3 mb-4">
						<div class="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
							<Crown size={24} class="text-gradient" />
						</div>
						<div>
							<h2 class="text-xl font-semibold">{PRICING_TIER.name}</h2>
							<p class="text-muted-foreground text-sm">{PRICING_TIER.description}</p>
						</div>
					</div>
					
					<ul class="space-y-3 my-6">
						{#each PRICING_TIER.features as feature}
							<li class="flex items-center gap-2 text-sm">
								<span class="text-primary">✓</span>
								<span>{feature}</span>
							</li>
						{/each}
					</ul>
					
					<p class="text-xl font-bold mb-6">
						${currentOption.price}
						<span class="text-sm text-muted-foreground font-normal">/{billingPeriod === 'monthly' ? 'month' : 'year'}</span>
						{#if billingPeriod === 'yearly' && yearlySavings > 0}
							<span class="ml-1 text-xs text-green-400">
								(Save ${yearlySavings})
							</span>
						{/if}
					</p>
					
					<Button 
						class="w-full button-gradient" 
						disabled={isLoading}
						on:click={handleSubscribe}
					>
						{isLoading ? 'Processing...' : `Upgrade to ${billingPeriod === 'monthly' ? 'Monthly' : 'Yearly'} Plan`}
					</Button>
				</div>
			</div>
		{/if}

		<div class="mt-8 text-center text-sm text-muted-foreground">
			Questions about our plans? <a href="/contact" class="text-primary underline">Contact us</a>
		</div>
	</div>
</div> 