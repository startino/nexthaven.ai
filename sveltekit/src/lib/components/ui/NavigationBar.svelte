<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { LogOut, User, CreditCard, Crown, Search, History, Home, Folder, Menu, X, ArrowUp, AlertTriangle, Bug } from 'lucide-svelte';
	import { TrialBadge } from '$lib/components/trial-badge';
	import * as Sheet from '$lib/components/ui/sheet';

	let isMenuOpen = $state(false);

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}
	import { isAnonymousUser } from '$lib/supabase/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Check if user is anonymous
	let isAnonymous = $state(false);
	
	// Run this on component initialization
	onMount(() => {
		checkAnonymousStatus();
		
		// Debug log
		console.log('[NavBar] Initial mount, checking anonymous status');
	});
	
	// Also run this when page data changes
	$effect(() => {
		if (page.data) {
			checkAnonymousStatus();
		}
	});
	
	// Function to check if user is anonymous
	function checkAnonymousStatus() {
		// Check if the session and user exist
		if (page.data?.session?.user) {
			// Use isAnonymousUser function
			isAnonymous = isAnonymousUser(page.data.session.user);
		} else {
			isAnonymous = false;
		}
	}
</script>

<header class="w-full bg-white/5 backdrop-blur-md py-3 px-6 border-b border-border fixed top-0 z-50">
	<div class="container mx-auto flex justify-between items-center">
		<div class="flex items-center">
			<a href="/" class="text-xl flex flex-row place-items-center">
				<img src="/favicon.png" alt="nexthaven" class="w-10 h-10 sm:w-12 sm:h-12" />
				<span class="font-serif ml-1 sm:ml-2 text-lg sm:text-xl">
					nexthaven
				</span>
			</a>
		</div>
		
		<!-- Mobile menu button -->
		<button 
			onclick={toggleMenu}
			class="md:hidden flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
			aria-label="Main menu"
		>
			{#if isMenuOpen}
				<X size={24} />
			{:else}
				<Menu size={24} />
			{/if}
		</button>
		
		<!-- Desktop Navigation -->
		<div class="hidden md:flex items-center gap-4">
			<!-- Subscription badge - shows status if subscription data exists and is active -->
			{#if page.data.subscriptionStatus?.isActive}
				<!-- Show active subscription status -->
				{#if page.data.subscriptionStatus.isInTrial && page.data.subscriptionStatus.trialEnd}
					<TrialBadge trialEndDate={page.data.subscriptionStatus.trialEnd} />
				{/if}
			{:else}
				<!-- Show upgrade prompt when no active subscription -->
				<a 
					href="/subscription" 
					class="flex items-center gap-1.5 px-3 py-1 bg-card hover:bg-primary/80 text-primary cursor-pointer rounded-full text-xs transition-colors"
				>
					<Crown size={14} class="text-gray-400" />
					<span class="text-gray-300">Upgrade</span>
				</a>
			{/if}
			
			<!-- Navigation buttons - always shown when logged in -->
			{#if page.data.session}
				<Button 
					variant="ghost" 
					size="sm"
					class="flex items-center gap-2 text-sm"
					href="/search"
				>
					<Search size={16} />
					<span class="hidden sm:inline">Search</span>
				</Button>
				
				<Button 
					variant="ghost" 
					size="sm"
					class="flex items-center gap-2 text-sm"
					href="/history"
				>
					<History size={16} />
					<span class="hidden sm:inline">History</span>
				</Button>
				
				<Button 
					variant="ghost" 
					size="sm"
					class="flex items-center gap-2 text-sm"
					href="/collections"
				>
					<Folder size={16} />
					<span class="hidden sm:inline">Collections</span>
				</Button>
				
				<!-- Subscription button - color based on status -->
				<Button
					variant="ghost"
					size="icon"
					class={page.data.subscriptionStatus?.isActive 
						? "bg-card"
						: "bg-gray-800/60 hover:bg-gray-800/80 text-gray-200"}
					href="/subscription"
					title={page.data.subscriptionStatus?.isActive 
						? (page.data.subscriptionStatus.isInTrial ? 'Plans & Pricing' : 'Manage Subscription') 
						: 'Get Premium'}
				>
					<CreditCard size={18} />
				</Button>
				
				<!-- Account button -->
				<Button
					variant="ghost"
					size="icon"
					class="bg-card"
					href="/account"
					title="My Account"
				>
					<User size={18} />
				</Button>
				
				<!-- Sign out button - only shown for non-anonymous users -->
				{#if !isAnonymous}
					<form action="/logout" method="POST">
						<Button
							variant="ghost"
							class="bg-card"
							size="icon"
							title="Sign Out"
							type="submit"
						>
							<LogOut size={18} />
						</Button>
					</form>
					{:else}
						<Button
							variant="ghost"
							class="bg-card"
							href="/login"
						>
							Sign In
						</Button>
					{/if}
			{:else}
				<!-- Login/Signup buttons -->
				<Button
					variant="ghost"
					class=""
					href="/login"
				>
					Sign In
				</Button>
				
				<Button	
					class=""
					href="/signup"
				>
					Sign Up
				</Button>
			{/if}
		</div>
	</div>
</header>

<!-- Mobile Navigation Menu -->
<Sheet.Root open={isMenuOpen} onOpenChange={toggleMenu}>
	<Sheet.Content side="top" class="pt-14 pb-6 px-4 w-full bg-card backdrop-blur-md">
		<div class="flex flex-col space-y-4">
			<!-- Mobile subscription badge -->
			{#if page.data.subscriptionStatus?.isActive && page.data.subscriptionStatus.isInTrial && page.data.subscriptionStatus.trialEnd}
				<a href="/subscription" class="w-full flex justify-center py-2">
					<TrialBadge trialEndDate={page.data.subscriptionStatus.trialEnd} />
				</a>
			{:else if !page.data.subscriptionStatus?.isActive}
				<a 
					href="/subscription" 
					class="flex items-center justify-center gap-1.5 px-4 py-2 bg-card hover:bg-primary/80 text-primary cursor-pointer rounded-md text-sm transition-colors"
				>
					<Crown size={16} class="text-gray-400" />
					<span class="text-gray-300">Upgrade to Premium</span>
				</a>
			{/if}
			
			{#if page.data.session}
				<div class="grid grid-cols-2 gap-2 justify-items-start">
					<Button 
						variant="ghost" 
						class="flex items-center gap-2 w-full justify-start"
						href="/search"
					>
						<Search size={18} />
						<span>Search</span>
					</Button>
					
					<Button 
						variant="ghost" 
						class="flex items-center gap-2 w-full justify-start"
						href="/history"
					>
						<History size={18} />
						<span>History</span>
					</Button>
					
					<Button 
						variant="ghost" 
						class="flex items-center gap-2 w-full justify-start"
						href="/collections"
					>
						<Folder size={18} />
						<span>Collections</span>
					</Button>
					
					<Button
						variant="ghost"
						class="flex items-center gap-2 w-full justify-start"
						href="/subscription"
					>
						<CreditCard size={18} />
						<span>Subscription</span>
					</Button>
					
					<Button
						variant="ghost"
						class="flex items-center gap-2 w-full justify-start"
						href="/account"
					>
						<User size={18} />
						<span>Account</span>
					</Button>
					
					{#if !isAnonymous}
						<form action="/logout" method="POST" class="w-full">
							<Button
								variant="ghost"
								class="flex items-center gap-2 w-full justify-start"
								type="submit"
							>
								<LogOut size={18} />
								<span>Sign Out</span>
							</Button>
						</form>
					{/if}
				</div>
			{:else}
				<div class="flex flex-col gap-2">
					<Button
						variant="ghost"
						class="w-full"
						href="/login"
					>
						Sign In
					</Button>
					
					<Button	
						class="w-full"
						href="/signup"
					>
						Sign Up
					</Button>
				</div>
			{/if}
		</div>
	</Sheet.Content>
</Sheet.Root>
