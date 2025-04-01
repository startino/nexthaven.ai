<script lang="ts">
	import { page } from '$app/stores';
	import { stripeService, PRICING_TIER } from '$lib/services/stripe';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { CheckCircle, AlertCircle, Crown, ArrowRight, CreditCard, UserPlus } from 'lucide-svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { goto } from '$app/navigation';
	import { TrialBadge } from '$lib/components/trial-badge';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
		DialogClose
	} from '$lib/components/ui/dialog';

	// Get data from server
	let { data } = $props();
	
	// Subscription status
	let isSubscribed = $state(data.subscriptionStatus?.isActive || false);
	let isAnonymous = $state($page.data.isAnonymous || false);
	let planName = $state(data.subscriptionStatus?.planName || '');
	let currentPeriodEnd = $state(data.subscriptionStatus?.currentPeriodEnd
		? new Date(data.subscriptionStatus.currentPeriodEnd).toLocaleDateString()
		: '');
	let isInTrial = $state(data.subscriptionStatus?.isInTrial || false);
	let trialEnd = $state(data.subscriptionStatus?.trialEnd
		? new Date(data.subscriptionStatus.trialEnd).toLocaleDateString()
		: '');
	let isTrialEligible = $state(data.isTrialEligible || false);
	let isLoading = $state(false);
	let billingPeriod = $state('monthly'); // Default to monthly
	let isSuccess = $page.url.searchParams.get('success') === 'true';
	let isCanceled = $page.url.searchParams.get('canceled') === 'true';
	
	// Dialog state
	let isDialogOpen = $state(false);
	
	// Get redirect destination (if any)
	let redirectTo = $state($page.url.searchParams.get('redirectTo') || '/search');

	// Get current option based on billing period
	let currentOption = $derived(PRICING_TIER.options.find(option => option.name.toLowerCase() === billingPeriod) || PRICING_TIER.options[0]);

	// Calculate monthly equivalent price for yearly plan
	let calcMonthlyEquivalent = () => {
		const yearlyOption = PRICING_TIER.options.find(option => option.name.toLowerCase() === 'yearly');
		
		if (yearlyOption) {
			// Calculate approximate monthly price from yearly price (assuming format $XX)
			const yearlyPrice = parseFloat(yearlyOption.price.replace(/[^\d.]/g, ''));
			const monthlyEquivalent = (yearlyPrice / 12).toFixed(2);
			return `$${monthlyEquivalent}/mo`;
		}
		return '';
	};
	
	let monthlyEquivalent = $derived(calcMonthlyEquivalent());

	// Calculate percentage saved with yearly plan
	let calcSavingsPercentage = () => {
		const monthlyOption = PRICING_TIER.options.find(option => option.name.toLowerCase() === 'monthly');
		const yearlyOption = PRICING_TIER.options.find(option => option.name.toLowerCase() === 'yearly');
		
		if (monthlyOption && yearlyOption) {
			const monthlyPrice = parseFloat(monthlyOption.price.replace(/[^\d.]/g, ''));
			const yearlyPrice = parseFloat(yearlyOption.price.replace(/[^\d.]/g, ''));
			const monthlyEquiv = yearlyPrice / 12;
			const savingsPercent = Math.round(((monthlyPrice - monthlyEquiv) / monthlyPrice) * 100);
			return savingsPercent > 0 ? savingsPercent : 0;
		}
		return 0;
	};
	
	let savingsPercentage = $derived(calcSavingsPercentage());

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
	
	// Handle navigation to create a permanent account
	function handleCreateAccount() {
		// Navigate to signup page with convert=true to indicate conversion from anonymous
		goto(`/signup?convert=true&redirectTo=${encodeURIComponent(redirectTo || '/subscription')}`);
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
	
	// Function to open the dialog
	function openBillingDialog() {
		isDialogOpen = true;
	}
</script>

<svelte:head>
	<title>Premium Subscription</title>
</svelte:head>

<div class="container mx-auto py-8 px-4">
	<div class="max-w-4xl mx-auto">
		
		{#if isSuccess}
			<div class="bg-green-100 p-4 rounded-md flex items-center space-x-2 mb-8 text-green-800">
				<CheckCircle class="h-5 w-5" />
				<span>Thank you for subscribing! Your subscription is now active.</span>
			</div>
		{:else if isCanceled}
			<div class="bg-primary/10 p-4 rounded-md flex items-center space-x-2 mb-8 text-primary/80">
				<AlertCircle class="h-5 w-5" />
				<span>Your checkout session was canceled. Feel free to try again when you're ready.</span>
			</div>
		{/if}

		{#if isLoading}
			<div class="text-center py-8">
				<div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
				<p class="mt-2">Processing your request...</p>
			</div>
		
		<!-- Anonymous User Section -->
		{:else if isAnonymous}
			<div class="text-center">
				<h1 class="text-2xl font-bold mb-4">Create a Permanent Account</h1>
				<div class="mb-6 p-4 bg-amber-900/20 border border-amber-600/30 rounded-lg max-w-xl mx-auto">
					<p class="text-amber-200">
						You're currently using a temporary anonymous account. To subscribe to a premium plan, 
						you'll need to create a permanent account first.
					</p>
				</div>
				
				<div class="bg-card border border-border rounded-lg p-8 max-w-xl mx-auto">
					<div class="flex flex-col items-center gap-6">
						<div class="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
							<UserPlus size={32} class="text-primary" />
						</div>
						
						<div class="text-center max-w-md">
							<h2 class="text-xl font-semibold mb-2">Benefits of a Permanent Account</h2>
							<ul class="text-left space-y-2 mb-6">
								<li class="flex items-start gap-2">
									<span class="text-primary mt-1">✓</span>
									<span>Access to premium features and subscription options</span>
								</li>
								<li class="flex items-start gap-2">
									<span class="text-primary mt-1">✓</span>
									<span>Save your favorite properties and searches</span>
								</li>
								<li class="flex items-start gap-2">
									<span class="text-primary mt-1">✓</span>
									<span>Retain your current data when you upgrade</span>
								</li>
								<li class="flex items-start gap-2">
									<span class="text-primary mt-1">✓</span>
									<span>Secure access from any device</span>
								</li>
							</ul>
							
							<Button 
								class="w-full button-gradient" 
								onclick={handleCreateAccount}
							>
								Create a Permanent Account
							</Button>
							
							<p class="mt-4 text-sm text-muted-foreground">
								Your temporary data will be transferred to your new account.
							</p>
						</div>
					</div>
				</div>
				
				<div class="mt-8">
					<Button variant="outline" onclick={handleContinue}>
						Continue with Temporary Account
					</Button>
				</div>
			</div>
		<!-- Subscribed User Section -->	
		{:else if isSubscribed}
			<div class="text-center mb-8">
				<div class="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
					<CheckCircle class="h-6 w-6 text-green-600" />
				</div>
				<h1 class="text-2xl font-bold">You're Subscribed!</h1>
				<p class="text-muted-foreground mt-2">Thank you for being a premium subscriber.</p>
				
				<div class="mt-8 inline-block px-6 py-3 bg-card border border-border rounded-md">
					<div class="flex flex-col items-start gap-1">
						<div class="flex items-center justify-between w-full">
							<span class="text-sm text-muted-foreground">Current Plan:</span>
							<span class="font-semibold">{planName || 'Premium'}</span>
						</div>
						{#if currentPeriodEnd}
							<div class="flex items-center justify-between w-full">
								<span class="text-sm text-muted-foreground">Renewal Date:</span>
								<span>{currentPeriodEnd}</span>
							</div>
						{/if}
					</div>
				</div>
				
				<div class="flex flex-col sm:flex-row gap-4 justify-center mt-8">
					<button 
						type="button"
						class="px-6 py-3 bg-gradient-to-r from-primaryp to-purple-600 text-white rounded-lg hover:from-secondary hover:to-secondary transition-all shadow-md"
						onclick={handleManageSubscription}
						disabled={isLoading}
					>
						{isLoading ? 'Loading...' : 'Manage Subscription'}
					</button>
					
					<button 
						type="button"
						class="px-6 py-3 bg-card border border-border rounded-lg hover:bg-card/80 transition-all"
						onclick={handleContinue}
					>
						Continue to App
					</button>
				</div>
			</div>
			
		<!-- Trial User Section -->
		{:else if isInTrial}
			<div class="text-center">
				<h1 class="text-2xl font-bold mb-4">Premium Trial</h1>
				<p class="mb-8">You're currently enjoying your premium trial period.</p>
				
				<div class="flex flex-col items-center gap-4 mb-8">
					<TrialBadge trialEndDate={data.subscriptionStatus?.trialEnd || ''} />
					
					{#if !isAnonymous}
						<div class="mt-6 mb-6 w-full max-w-lg">
							<div class="my-2 flex flex-col items-start gap-6">
								<TrialBadge trialEndDate={data.subscriptionStatus?.trialEnd || ''} variant="large" />
								<Button onclick={openBillingDialog} class="flex items-center gap-2">
									<CreditCard class="h-4 w-4" />
									Choose Plan
								</Button>
							</div>
							
							<!-- Dialog for billing plan selection and continue -->
							<Dialog bind:open={isDialogOpen}>
								<DialogContent class="sm:max-w-[425px]">
									<DialogHeader>
										<DialogTitle>Choose Your Plan</DialogTitle>
										<DialogDescription>
											Select your preferred billing period to continue after your trial ends.
										</DialogDescription>
									</DialogHeader>
									
									<!-- Billing period selector -->
									<div class="mt-4">
										<div class="flex rounded-md overflow-hidden border border-primary/30">
											<button 
												class="flex-1 py-2 px-4 text-sm font-medium transition-all focus:outline-none {billingPeriod === 'monthly' ? 'bg-primary/30 text-primary font-semibold' : 'bg-black/20 hover:bg-black/30 text-muted-foreground'}"
												onclick={() => billingPeriod = 'monthly'}
											>
												Monthly
											</button>
											<button 
												class="flex-1 py-2 px-4 text-sm font-medium transition-all focus:outline-none flex items-center justify-center gap-2 {billingPeriod === 'yearly' ? 'bg-primary/30 text-primary font-semibold' : 'bg-black/20 hover:bg-black/30 text-muted-foreground'}"
												onclick={() => billingPeriod = 'yearly'}
											>
												Yearly
												{#if savingsPercentage > 0}
													<span class="ml-1 text-xs {billingPeriod === 'yearly' ? 'gradient-primary text-black' : 'gradient-primary text-black'} px-2 py-0.5 rounded-full">
														{monthlyEquivalent}
													</span>
												{/if}
											</button>
										</div>
										<div class="mt-4 text-left text-muted-foreground text-sm flex flex-row items-center gap-4">
										<!-- Display price and billing period -->
											<h2 class="text-xl font-semibold">
												{currentOption.price}/{billingPeriod === 'monthly' ? 'month' : 'year'}
											</h2>
											{#if billingPeriod === 'yearly' && savingsPercentage > 0}
												<h3 class=" text-xs text-green-400 my-auto">
													({savingsPercentage}% off monthly)
												</h3>
											{/if}
										</div>
									</div>
									
									<DialogFooter class="flex flex-col sm:flex-row sm:justify-between gap-3 mt-4">

										
										<Button 
											onclick={handleSubscribe}
											class="button-gradient order-1 sm:order-2" 
											disabled={isLoading}
										>
											{isLoading ? 'Processing...' : `Subscribe Now`}
										</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
						</div>
					{/if}
					
					{#if isSuccess}
						<div class="mt-4 p-3 bg-green-900/30 border border-green-500/30 rounded-lg text-green-300">
							<p>🎉 Your subscription has been activated successfully!</p>
						</div>
					{/if}
				</div>
				
				<div class="flex flex-col sm:flex-row gap-4 justify-center">
					{#if !isInTrial}
					<button 
						type="button"
						class="px-6 py-3 bg-gradient-to-r from-primaryp to-purple-600 text-white rounded-lg hover:from-secondary hover:to-secondary transition-all shadow-md"
						onclick={handleManageSubscription}
						disabled={isLoading}
					>
						{isLoading ? 'Loading...' : 'Manage Subscription'}
					</button>
					{/if}
				</div>
			</div>
		{:else}
			<!-- Custom Billing Period Selector -->
			<div class="mb-8 flex items-center justify-center">
				<div class="w-full max-w-md">
					<div class="flex rounded-md overflow-hidden border border-border">
						<button 
							class="flex-1 py-2.5 px-4 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background {billingPeriod === 'monthly' ? 'button-gradient text-white font-semibold shadow-sm' : 'bg-black/20 hover:bg-black/30 text-muted-foreground'}"
							onclick={() => billingPeriod = 'monthly'}
						>
							Monthly
						</button>
						<button 
							class="flex-1 py-2.5 px-4 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background flex items-center justify-center gap-2 {billingPeriod === 'yearly' ? 'button-gradient text-white font-semibold shadow-sm' : 'bg-black/20 hover:bg-black/30 text-muted-foreground'}"
							onclick={() => billingPeriod = 'yearly'}
						>
							Yearly
							{#if savingsPercentage > 0}
								<span class="ml-1 text-xs {billingPeriod === 'yearly' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'} px-2 py-0.5 rounded-full">
									{monthlyEquivalent}
								</span>
							{/if}
						</button>
					</div>
				</div>
			</div>

			<div class="max-w-xl mx-auto">
				<div class="bg-primary/5 border border-primary/20 p-6 rounded-lg relative overflow-hidden">
					<div class="absolute top-0 right-0 bg-primary/20 text-xs font-medium py-1 px-3 rounded-bl-lg">
						PREMIUM
					</div>
					
					<div class="flex items-center gap-3 mb-4">
						<div class="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
							<Crown size={24} class="text-primary" />
						</div>
						<div>
							<h2 class="text-xl font-semibold">{PRICING_TIER.name}</h2>
							<p class="text-muted-foreground text-sm">{PRICING_TIER.description}</p>
						</div>
					</div>
					
					<ul class="space-y-3 my-6">
						{#each currentOption.features as feature}
							<li class="flex items-center gap-2 text-sm">
								<span class="text-primary">✓</span>
								<span>{feature}</span>
							</li>
						{/each}
					</ul>
					
					<p class="text-xl font-bold mb-6">
						{currentOption.price}
						<span class="text-sm text-muted-foreground font-normal">/{currentOption.priceDescription}</span>
						{#if billingPeriod === 'yearly' && savingsPercentage > 0}
							<span class="ml-1 text-xs text-green-400">
								({savingsPercentage}% off monthly)
							</span>
						{/if}
					</p>
					
					<Button 
						class="w-full button-gradient" 
						disabled={isLoading}
						onclick={handleSubscribe}
					>
						{#if isLoading}
							Processing...
						{:else if isInTrial}
							Subscribe Now
						{:else}
							Subscribe Now
						{/if}
					</Button>
					
					<div class="mt-4 py-2 px-3 {isInTrial ? 'bg-primary/10 border-primary/20' : 'bg-primary/10 border-primary/20'} border rounded-lg text-sm text-center">
						{#if isInTrial}
							<span class="font-semibold text-primary">Your free trial ends on {trialEnd}</span><br>
							{currentOption.price}/{currentOption.priceDescription} after trial
						{:else if billingPeriod === 'yearly'}
							{currentOption.price}/{currentOption.priceDescription} (just {monthlyEquivalent})
						{:else}
							{currentOption.price}/{currentOption.priceDescription}
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<div class="mt-8 text-center text-sm text-muted-foreground">
			Questions about our plans? <a href="/contact" class="text-primary underline">Contact us</a>
		</div>
	</div>
</div> 