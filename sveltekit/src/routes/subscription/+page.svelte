<script lang="ts">
	import { page } from '$app/stores';
	import { stripeService, PRICING_TIER } from '$lib/services/stripe';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { CheckCircle, AlertCircle, Crown } from 'lucide-svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';

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

	// Get current option based on billing period
	let currentOption = $derived(PRICING_TIER.options.find(option => option.period === billingPeriod) || PRICING_TIER.options[0]);

	// Calculate savings for yearly plan
	let yearlySavings = $derived(billingPeriod === 'yearly' ? PRICING_TIER.options.find(option => option.period === 'yearly')?.savingsAmount || 0 : 0);

	// Handle subscription checkout
	async function handleSubscribe() {
		isLoading = true;
		try {
			await stripeService.createCheckoutSession(currentOption.id);
		} catch (error) {
			console.error('Error creating checkout session:', error);
			isLoading = false;
		}
	}

	// Handle managing existing subscription
	async function handleManageSubscription() {
		isLoading = true;
		try {
			await stripeService.createPortalSession();
		} catch (error) {
			console.error('Error creating portal session:', error);
		}
		isLoading = false;
	}
</script>

<svelte:head>
	<title>Premium Subscription</title>
</svelte:head>

<div class="container mx-auto py-12 px-4">
	<div class="max-w-4xl mx-auto">
		<h1 class="text-3xl font-bold text-gradient mb-8">Premium Subscription</h1>
		
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
			<div class="bg-black/20 border border-border p-6 rounded-lg">
				<h2 class="text-2xl font-semibold mb-4">Your Subscription</h2>
				<div class="space-y-4">
					<div class="flex justify-between">
						<span class="text-muted-foreground">Plan</span>
						<span class="font-medium">{planName}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Status</span>
						<span class="font-medium text-green-600">Active</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Current period ends</span>
						<span class="font-medium">{currentPeriodEnd}</span>
					</div>
					<Separator />
					<Button variant="default" class="w-full button-gradient" onclick={handleManageSubscription}>
						Manage Subscription
					</Button>
				</div>
			</div>
		{:else}
			<!-- Billing Period Selector -->
			<div class="mb-8 flex items-center justify-center">
				<Tabs value={billingPeriod} class="w-full max-w-md">
					<TabsList class="w-full">
						<TabsTrigger value="monthly" onclick={() => billingPeriod = 'monthly'} class="flex-1">
							Monthly
						</TabsTrigger>
						<TabsTrigger value="yearly" onclick={() => billingPeriod = 'yearly'} class="flex-1">
							Yearly
							{#if PRICING_TIER.options.length > 1 && PRICING_TIER.options[1]?.savingsAmount && PRICING_TIER.options[1].savingsAmount > 0}
								<span class="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
									Save ${PRICING_TIER.options[1].savingsAmount}
								</span>
							{/if}
						</TabsTrigger>
					</TabsList>
				</Tabs>
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