<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { propertyStore } from '$lib/stores/properties';
	import { get } from 'svelte/store';
	
	// Check for search query and redirect to results or search page
	onMount(() => {
		const { searchQuery } = get(propertyStore);
		
		if (!searchQuery) {
			// Redirect to search page if no query exists
			goto('/search');
			return;
		}
		
		// Simulate loading - in a real app this would be handled by the API loader
		setTimeout(() => {
			goto('/compare');
		}, 5000);
	});
</script>

<div class="flex flex-col items-center justify-center min-h-screen py-12 px-4">
	<div class="text-center space-y-4 mb-12">
		<h1 class="text-3xl font-bold mb-2">Finding Your Perfect Stays</h1>
		<p class="text-muted-foreground max-w-xl mx-auto">
			Our AI is searching multiple platforms and optimizing for your preferences. This may take a few moments...
		</p>
	</div>
	
	<div class="w-full max-w-3xl mb-8">
		<!-- Loading Animation -->
		<div class="flex justify-center mb-16">
			<div class="relative flex items-center justify-center w-20 h-20">
				<div class="absolute w-full h-full border-4 rounded-full gradient-primary animate-spin opacity-75"></div>
				<div class="absolute w-16 h-16 border-4 rounded-full border-accent animate-ping"></div>
			</div>
		</div>
		
		<!-- Property Skeleton Cards -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each Array(2) as _, i}
				<Card class="overflow-hidden bg-black/40 border-border">
					<div class="h-44 overflow-hidden">
						<Skeleton class="w-full h-full" />
					</div>
					<CardContent class="p-4 space-y-4">
						<div class="flex justify-between">
							<Skeleton class="h-6 w-[150px]" />
							<Skeleton class="h-6 w-[50px] rounded-full" />
						</div>
						<Skeleton class="h-4 w-full" />
						<Skeleton class="h-4 w-[70%]" />
						<div class="flex gap-2 pt-2">
							<Skeleton class="h-8 w-16 rounded-full" />
							<Skeleton class="h-8 w-20 rounded-full" />
							<Skeleton class="h-8 w-16 rounded-full" />
						</div>
						<div class="flex justify-between pt-2">
							<Skeleton class="h-8 w-24" />
							<Skeleton class="h-8 w-[100px]" />
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	</div>
	
	<div class="text-center mt-10">
		<p class="text-muted-foreground animate-pulse">Analyzing pricing options...</p>
	</div>
</div> 