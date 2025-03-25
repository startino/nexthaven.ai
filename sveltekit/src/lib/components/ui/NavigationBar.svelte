<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { LogOut, User, CreditCard, Crown, Search, History, Home } from 'lucide-svelte';
	import { getContext } from 'svelte';
</script>

<header class="w-full bg-black/60 backdrop-blur-md py-3 px-6 border-b border-gray-800 fixed top-0 z-50">
	<div class="container mx-auto flex justify-between items-center">
		<div class="flex items-center">
			<a href="/" class="text-2xl font-bold tracking-tight">
				<span class="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary font-serif">
					nexthaven.ai
				</span>
			</a>
		</div>
		
		<div class="flex items-center gap-4">
			<!-- Navigation buttons -->
			{#if $page.url.pathname !== '/search'}
				<Button 
					variant="ghost" 
					size="sm"
					class="flex items-center gap-1 text-sm"
					href="/search"
				>
					<Search size={16} />
					<span class="hidden sm:inline">Search</span>
				</Button>
			{/if}
			
			<Button 
				variant="ghost" 
				size="sm"
				class="flex items-center gap-1 text-sm"
				href="/history"
			>
				<History size={16} />
				<span class="hidden sm:inline">History</span>
			</Button>
			
			<!-- Auth buttons - only shown when logged in -->
			{#if $page.data.session}
				<!-- Subscription status badge -->
				{#if false /* Replace with actual subscription check */}
					<div class="flex items-center gap-1.5 px-3 py-1 bg-purple-900/40 rounded-full text-xs">
						<Crown size={14} class="text-purple-300" />
						<span class="text-purple-200">Premium</span>
					</div>
				{/if}
				
				<!-- Subscription button - color based on status -->
				<Button
					variant="ghost"
					size="icon"
					class="bg-purple-900/60 hover:bg-purple-900/80 text-purple-200"
					href="/subscription"
					title="Get Premium"
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
						class="bg-gray-800/80 hover:bg-gray-800 text-gray-200"
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
					size="sm"
					class="text-sm"
					href="/login"
				>
					Sign In
				</Button>
				
				<Button
					variant="outline"
					size="sm"
					class="text-sm button-gradient"
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