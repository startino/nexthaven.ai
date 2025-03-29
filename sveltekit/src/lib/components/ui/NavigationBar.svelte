<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { LogOut, User, CreditCard, Crown, Search, History, Home, Folder } from 'lucide-svelte';
	import { TrialBadge } from '$lib/components/trial-badge';

	console.log("page.data", page.data);
</script>

<header class="w-full bg-white/5 backdrop-blur-md py-3 px-6 border-b border-white/10 fixed top-0 z-50">
	<div class="container mx-auto flex justify-between items-center">
		<div class="flex items-center">
			<a href="/" class="text-xl flex flex-row place-items-center">
				<img src="/favicon.png" alt="nexthaven.ai" class="w-12 h-12" />
				<span class="font-serif">
					nexthaven.ai
				</span>
			</a>
		</div>
		
		<div class="flex items-center gap-4">
			<!-- Navigation buttons - always shown when logged in -->
			{#if page.data.session}
				<Button 
					variant="ghost" 
					size="sm"
					class="flex items-center gap-1 text-sm"
					href="/search"
				>
					<Search size={16} />
					<span class="hidden sm:inline">Search</span>
				</Button>
				
				<Button 
					variant="ghost" 
					size="sm"
					class="flex items-center gap-1 text-sm"
					href="/history"
				>
					<History size={16} />
					<span class="hidden sm:inline">History</span>
				</Button>
				
				<Button 
					variant="ghost" 
					size="sm"
					class="flex items-center gap-1 text-sm"
					href="/collections"
				>
					<Folder size={16} />
					<span class="hidden sm:inline">Collections</span>
				</Button>
				
				<!-- Subscription badge - shows status if subscription data exists and is active -->
				{#if page.data.subscriptionStatus?.isActive}
					<!-- Show active subscription status -->
					<div class="flex items-center gap-1.5 px-3 py-1 {page.data.subscriptionStatus.isInTrial ? 'bg-amber-900/40' : 'bg-purple-900/40'} rounded-full text-xs">
						<Crown size={14} class="{page.data.subscriptionStatus.isInTrial ? 'text-amber-300' : 'text-purple-300'}" />
						<span class="{page.data.subscriptionStatus.isInTrial ? 'text-amber-200' : 'text-purple-200'}">
							{page.data.subscriptionStatus.isInTrial ? 'Trial' : 'Premium'}
						</span>
						{#if page.data.subscriptionStatus.isInTrial && page.data.subscriptionStatus.trialEnd}
							<TrialBadge trialEndDate={page.data.subscriptionStatus.trialEnd} />
						{/if}
					</div>
				{:else}
					<!-- Show upgrade prompt when no active subscription -->
					<a 
						href="/subscription" 
						class="flex items-center gap-1.5 px-3 py-1 bg-gray-800/40 hover:bg-gray-700/40 cursor-pointer rounded-full text-xs transition-colors"
					>
						<Crown size={14} class="text-gray-400" />
						<span class="text-gray-300">Upgrade</span>
					</a>
				{/if}
				
				<!-- Subscription button - color based on status -->
				<Button
					variant="ghost"
					size="icon"
					class={page.data.subscriptionStatus?.isActive 
						? (page.data.subscriptionStatus.isInTrial 
							? "bg-amber-900/60 hover:bg-amber-900/80 text-amber-200" 
							: "bg-purple-900/60 hover:bg-purple-900/80 text-purple-200")
						: "bg-gray-800/60 hover:bg-gray-800/80 text-gray-200"}
					href="/subscription"
					title={page.data.subscriptionStatus?.isActive 
						? (page.data.subscriptionStatus.isInTrial ? 'Upgrade from Trial' : 'Manage Subscription') 
						: 'Get Premium'}
				>
					<CreditCard size={18} />
				</Button>
				
				<!-- Account button -->
				<Button
					variant="ghost"
					size="icon"
					class="bg-purple-900/60 hover:bg-purple-900/80 text-purple-200"
					href="/account"
					title="My Account"
				>
					<User size={18} />
				</Button>
				
				<!-- Sign out button -->
				<form action="/logout" method="POST">
					<Button
						variant="ghost"
						size="icon"
						title="Sign Out"
						type="submit"
					>
						<LogOut size={18} />
					</Button>
				</form>
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

<!-- Add spacing to account for fixed header -->
<div class="h-14"></div> 