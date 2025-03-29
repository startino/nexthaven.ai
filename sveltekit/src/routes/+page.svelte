<script lang="ts">
	import { getContext } from 'svelte';
	import HomeScreen from '$lib/components/HomeScreen.svelte';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';
	// Import other screens as we create them 
	import { propertyService } from '$lib/services/api';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import { navigating, page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowRight, Search } from 'lucide-svelte';


	onMount(() => {
		// If the route is directly accessed, redirect to /home
		if (window.location.pathname === '/') {
			goto('/home');
		}
	});
</script>

<div class="flex flex-col items-center justify-center min-h-screen py-12 px-4">
	
	<div class="mt-8 text-center mb-16">
		<h2 class="text-5xl font-serif leading-tight mb-4">
			Find your <span class="">next</span>
		</h2>
		<div class="text-5xl font-serif leading-tight">
			<span class="text-[hsl(var(--hotel))]">hotel</span>
			<span class="mx-2">/</span>
			<span class="text-[hsl(var(--apartment))]">condo</span>
			<span class="mx-2">/</span>
			<span class="text-[hsl(var(--hostel))]">hostel</span><span>.</span>
		</div>
		<p class="text-muted-foreground font-light mt-4 text-lg">
			Hours of accommodation searching, condensed into seconds.
		</p>
	</div>
	
	<!-- Search Button -->
	 
	<div class="w-full max-w-md">
		{#if $page.data.session}
			<Button 
				variant="default" 
				class="w-full h-14 button-gradient text-white text-lg font-semibold flex items-center justify-between group rounded-2xl shadow-lg p-4"
				href="/search"
			>
				<div class="flex items-center">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
					Start New Search
				</div>
				<ArrowRight class="transition-transform group-hover:translate-x-1" />
			</Button>
		{:else}
			<a href="/login" class="block w-full">
				<div class="group bg-gradient-to-r from-purple-800/90 to-pink-600/90 rounded-xl overflow-hidden">
					<div class="flex items-center justify-between px-6 py-5 rounded-xl">
						<div class="flex items-center gap-4">
							<div class="text-white">
								<Search size={24} />
							</div>
							<div class="text-left">
								<!-- This text was "sign in to search" but that's not appealing to users-->
								 <!-- The if statement around this is a little redundant now-->
								<div class="text-xl font-bold">Start New Search</div>
							</div>
						</div>
						<div class="text-white">
							<ArrowRight size={24} />
						</div>
					</div>
				</div>
			</a>
		{/if}
	</div>
	
	<div class="mt-20 text-center text-sm">
		<p class="text-muted-foreground text-xs sm:text-sm">
			Interested in partnering with us?
		</p>
		<p class="mt-1 text-xs sm:text-sm">
			Contact:
			<a href="mailto:jorge.lewis@starti.no" class="text-purple-400 hover:text-purple-200 hover:underline">jorge.lewis@starti.no</a>
		</p>
	</div>
	
	<!-- Footer -->
	<div class="mt-16 text-center text-gray-400">
		<p class="text-xs sm:text-sm">Made by the <a href="https://startino.no" target="_blank" rel="noopener noreferrer" class="text-purple-400 hover:text-purple-300 hover:underline">Startino Team</a></p>
	</div>
</div>

