<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatCurrency } from '$lib/utils';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { ArrowLeft, ExternalLink } from 'lucide-svelte';
	import { getSelectedProperty } from '$lib/stores/properties.svelte';
	import { onMount } from 'svelte';
	
	// Get server data
	let { data } = $props();
	let searchId = $derived(data.searchId);
	
	// Local state - get property using Svelte 5 runes
	let property = $derived(getSelectedProperty());
	
	// Redirect if no property is selected
	$effect(() => {
		if (!property) {
			// If no property selected, redirect to compare with searchId if available
			const searchIdParam = searchId ? `?searchId=${searchId}` : '';
			goto('/compare' + searchIdParam);
		}
	});
	
	// Function to handle back button click with search ID preservation
	function goBack() {
		const searchIdParam = searchId ? `?searchId=${searchId}` : '';
		goto('/compare' + searchIdParam);
	}
</script>

<div class="min-h-screen h-screen bg-black text-white">
	<ScrollArea class="h-screen">
		{#if property}
			<div class="max-w-7xl mx-auto px-4 py-6 space-y-8">
				<!-- Back button -->
				<Button
					variant="outline" 
					class="flex items-center gap-2"
					on:click={goBack}>
					<ArrowLeft class="h-4 w-4" />
					<span>Back to compare</span>
				</Button>
			
				<h1 class="text-xl md:text-3xl font-serif italic text-white">Complete Your Booking</h1>
				
				<div class="relative rounded-xl overflow-hidden shadow-2xl">
					<img
						src={property.media.main_image || 'https://via.placeholder.com/1200x400?text=No+Image'}
						alt={property.name}
						class="w-full h-64 md:h-96 object-cover"
					/>
					<div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
						<h2 class="text-2xl md:text-4xl font-bold text-white">{property.name}</h2>
						<p class="text-xl text-white/80">{property.location}</p>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
					<!-- Property Details -->
					<div class="space-y-6">
						<Card class="bg-white/5 border-white/10 rounded-xl overflow-hidden shadow-lg">
							<CardContent class="p-6 space-y-6">
								<h3 class="text-xl font-bold text-white">Property Details</h3>
								
								<div class="grid grid-cols-1 gap-4">
									<div class="bg-purple-500/20 p-4 rounded-lg border border-purple-500/30">
										<p class="text-sm text-purple-300 font-medium">Total price</p>
										<p class="text-3xl font-bold text-white">${Math.round(property.pricing.total)}</p>
									</div>
								</div>
								
								<div class="flex gap-6 text-white">
									{#if property.capacity.bedrooms}
										<div>
											<span class="font-bold">{property.capacity.bedrooms}</span> {property.capacity.bedrooms === 1 ? 'bedroom' : 'bedrooms'}
										</div>
									{/if}
									{#if property.capacity.beds}
										<div>
											<span class="font-bold">{property.capacity.beds}</span> {property.capacity.beds === 1 ? 'bed' : 'beds'}
										</div>
									{/if}
								</div>
								
								{#if property.description}
									<div>
										<h4 class="text-white font-semibold mb-2">Description</h4>
										<p class="text-gray-300">{property.description}</p>
									</div>
								{/if}
							</CardContent>
						</Card>
						
						<Card class="bg-white/5 border-white/10 rounded-xl overflow-hidden shadow-lg">
							<CardContent class="p-6">
								<h3 class="text-xl font-bold text-white mb-4">Amenities</h3>
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
									{#each property.features.amenities as amenity}
										<div class="flex items-center gap-2 text-gray-300">
											<span class="w-2 h-2 bg-purple-500 rounded-full"></span>
											{amenity}
										</div>
									{/each}
								</div>
							</CardContent>
						</Card>
					</div>
					
					<!-- AI Recommendation & Booking -->
					<div class="space-y-6">
						<Card class="bg-white/5 border-white/10 rounded-xl overflow-hidden shadow-lg">
							<CardContent class="p-6">
								<h3 class="text-xl font-bold text-white mb-4">AI Recommendation</h3>
								<div class="flex items-center gap-4 mb-4">
									<div class="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl">
										{property.score}
									</div>
									<div>
										<p class="text-white font-semibold">Match Score</p>
										<p class="text-sm text-gray-400">Based on your preferences</p>
									</div>
								</div>
								
								<div class="space-y-3 text-gray-300">
									<div class="flex gap-2">
										<span class="text-green-500 flex-shrink-0">✓</span>
										<span><strong>Price:</strong> The property is priced at ${property.pricing.total.toFixed(2)}, which is slightly below the user's total budget range of $4200 to $6000, offering potential savings, though it's a bit under what was expected.</span>
									</div>
									
									<div class="flex gap-2">
										<span class="text-yellow-500 flex-shrink-0">🔍</span>
										<span><strong>Location:</strong> It is located in Paris (16th arr.), which meets the user's location requirement perfectly.</span>
									</div>
									
									<div class="flex gap-2">
										<span class="text-yellow-500 flex-shrink-0">👌</span>
										<span><strong>Rooms:</strong> The property is described as having 2 bedrooms, aligning with the need for a 2-room setup.</span>
									</div>
									
									<div class="flex gap-2">
										<span class="text-yellow-500 flex-shrink-0">👍</span>
										<span><strong>Amenities:</strong> It offers in-unit laundry (washing machine and tumble dryer), a balcony, and high-speed internet (free WiFi).</span>
									</div>
								</div>
							</CardContent>
						</Card>
						
						<Card class="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl overflow-hidden shadow-lg">
							<CardContent class="p-6 space-y-4">
								<h3 class="text-xl font-bold text-white">Ready to book?</h3>
								<p class="text-white/80">Complete your reservation on {property.source}</p>
								
								<a 
									href={property.url || '#'}
									target="_blank"
									rel="noopener noreferrer"
									class="block w-full bg-white text-purple-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors text-center flex items-center justify-center gap-2 shadow-md"
								>
									<ExternalLink size={18} />
									Complete Booking
								</a>
								
								<p class="text-xs text-white/60 text-center">
									You'll be redirected to {property.source} to complete your reservation
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		{:else}
			<div class="flex justify-center items-center h-[60vh]">
				<div class="text-center">
					<div class="text-2xl font-bold mb-2">Loading property details...</div>
					<div class="text-white/60">Please wait while we prepare your booking</div>
				</div>
			</div>
		{/if}
	</ScrollArea>
</div> 